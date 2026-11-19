import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Analysis, analyze, detectGrid, kickMap, proposeStructure } from './analysis';
import { Engine } from './engine';
import { compose, learnRule, SRC } from './compose';
import { bossBeat, MIN_STAGE_SECONDS } from '../../game/audio/trackMath';
import { Timeline, Overview, Snap, View, refit, removeAnchor, snapBeats } from './Timeline';
import {
  StudioData, TrackDoc, Section, SectionType, STAGES, HEROES, beatLen, stepLen, beatTime, barTime, anchorError,
  sectionAt, snapOf, fmtTime, fmtBBS, slotLabel, slotsOf, adjustmentReport, round,
} from './model';

// ---------- small controls ----------

const NumField: React.FC<{
  value: number; onChange: (v: number) => void; onBegin?: () => void; step: number; fine?: number; decimals: number;
  min?: number; max?: number; suffix?: string; accent?: boolean; title?: string;
}> = ({ value, onChange, onBegin, step, fine, decimals, min = -Infinity, max = Infinity, suffix, accent, title }) => {
  const [edit, setEdit] = useState<string | null>(null);
  const d = useRef<{ y: number; v: number; moved: boolean } | null>(null);
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  if (edit !== null) {
    return (
      <div className={'num' + (accent ? ' accent' : '')}>
        <input autoFocus value={edit} onChange={(e) => setEdit(e.target.value)}
          onBlur={() => { const v = parseFloat(edit.replace(',', '.')); if (isFinite(v)) { onBegin?.(); onChange(clamp(v)); } setEdit(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEdit(null); e.stopPropagation(); }} />
      </div>
    );
  }
  return (
    <div className={'num' + (accent ? ' accent' : '')} title={title ?? 'Glisser verticalement (Maj = fin) · double-clic pour saisir'}
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); d.current = { y: e.clientY, v: value, moved: false }; }}
      onPointerMove={(e) => {
        const s = d.current;
        if (!s) return;
        const dy = s.y - e.clientY;
        if (!s.moved && Math.abs(dy) < 3) return;
        if (!s.moved) { s.moved = true; onBegin?.(); }
        onChange(clamp(round(s.v + Math.round(dy / 3) * (e.shiftKey ? fine ?? step / 10 : step), 10 ** (decimals + 1))));
      }}
      onPointerUp={() => { d.current = null; }}
      onDoubleClick={() => setEdit(value.toFixed(decimals))}>
      {value.toFixed(decimals)}{suffix && <span className="suf">{suffix}</span>}
    </div>
  );
};

const Icon = {
  play: <svg viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z" /></svg>,
  pause: <svg viewBox="0 0 16 16"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z" /></svg>,
  stop: <svg viewBox="0 0 16 16"><path d="M3.5 3.5h9v9h-9z" /></svg>,
  start: <svg viewBox="0 0 16 16"><path d="M3 2.5h2v11H3zM14 2.5v11L6 8z" /></svg>,
  loop: <svg viewBox="0 0 16 16"><path d="M4 5h7V3l3 3-3 3V7H4a1 1 0 0 0-1 1v1H1V8a3 3 0 0 1 3-3zm8 6H5v2l-3-3 3-3v2h7a1 1 0 0 0 1-1V7h2v1a3 3 0 0 1-3 3z" /></svg>,
  undo: <svg viewBox="0 0 16 16"><path d="M6 3 1.5 7 6 11V8.3c3.6 0 5.7 1 7.5 4.2C13 8.6 11 6.2 6 5.8z" /></svg>,
  redo: <svg viewBox="0 0 16 16"><path d="M10 3l4.5 4L10 11V8.3c-3.6 0-5.7 1-7.5 4.2C3 8.6 5 6.2 10 5.8z" /></svg>,
};

const SEC_LABEL: Record<SectionType, string> = { normal: 'Normal', drop: 'Drop', break: 'Break' };

// ---------- app ----------

interface Loaded { buffer: AudioBuffer; analysis: Analysis }

const newDoc = (a: Analysis): TrackDoc => {
  const g = detectGrid(a);
  const s = proposeStructure(a, g.bpm, g.phase);
  const doc: TrackDoc = { bpm: g.bpm, phase: g.phase, ...s, kickMin: 3, kickEdits: {}, anchors: [], ruleOn: true, breakPunch: true };
  return { ...doc, auto: snapOf(doc) };
};

const mergeKicks = (auto: string, edits: Record<string, number>) => {
  const out = new Uint8Array(auto.length);
  for (let i = 0; i < auto.length; i++) out[i] = auto.charCodeAt(i) - 48;
  for (const [k, v] of Object.entries(edits)) { const i = +k; if (i >= 0 && i < out.length) out[i] = v; }
  return out;
};

const EMPTY = new Uint8Array(0);

const Studio: React.FC = () => {
  const engine = useMemo(() => new Engine(), []);
  const [files, setFiles] = useState<string[]>([]);
  const [data, setData] = useState<StudioData | null>(null);
  const [saved, setSaved] = useState('');
  const [savedAt, setSavedAt] = useState<string>('');
  const [sel, setSel] = useState<string | null>(null);
  const loaded = useRef(new Map<string, Loaded>());
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [, bump] = useState(0);
  const [view, setView] = useState<View>({ t0: 0, pps: 40 });
  const [selSection, setSelSection] = useState<number | null>(null);
  const [follow, setFollow] = useState(true);
  const [loopOn, setLoopOn] = useState(false);
  const [metro, setMetro] = useState(false);
  const [kickClick, setKickClick] = useState(false);
  const [rate, setRate] = useState(1);
  const [snap, setSnap] = useState<Snap>('beat');
  const [hero, setHero] = useState<string>('armand');
  const [playing, setPlaying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hint, setHint] = useState('');
  const [tapInfo, setTapInfo] = useState('');
  const hist = useRef<{ past: StudioData[]; future: StudioData[] }>({ past: [], future: [] });
  const dataRef = useRef(data);
  dataRef.current = data;
  const frame = useRef<HTMLIFrameElement>(null);
  const tlHost = useRef<HTMLDivElement>(null);
  const posEl = useRef<HTMLDivElement>(null);
  const timeEl = useRef<HTMLDivElement>(null);
  const ledEl = useRef<HTMLSpanElement>(null);
  const secEl = useRef<HTMLSpanElement>(null);

  const flash = (s: string) => { setToast(s); window.clearTimeout((flash as unknown as { t?: number }).t); (flash as unknown as { t?: number }).t = window.setTimeout(() => setToast(null), 2200); };

  // ---------- load state ----------
  useEffect(() => {
    fetch('/__music/state').then((r) => r.json()).then((s: { files: string[]; data: StudioData }) => {
      const d: StudioData = { version: 1, slots: s.data.slots ?? {}, tracks: {} };
      for (const [f, t] of Object.entries(s.data.tracks ?? {})) d.tracks[f] = { kickMin: 3, kickEdits: {}, anchors: [], sections: [], ramps: [], ...t };
      setFiles(s.files);
      setData(d);
      setSaved(JSON.stringify(d));
      if (s.files.length) setSel(s.files[0]);
    }).catch(() => flash('Serveur Vite introuvable : lance « npm run dev » et ouvre la page via localhost:5555'));
    return () => engine.dispose();
  }, []);

  const doc = sel && data ? data.tracks[sel] ?? null : null;
  const ld = sel ? loaded.current.get(sel) ?? null : null;

  // ---------- decode + analyse the selected track ----------
  useEffect(() => {
    if (!sel || !data) return;
    engine.pause();
    setPlaying(false);
    setSelSection(null);
    const have = loaded.current.get(sel);
    if (have) { engine.setBuffer(have.buffer); fitView(have.analysis.duration); return; }
    setLoadingFile(sel);
    engine.setBuffer(null);
    const file = sel;
    fetch('/assets/music/' + encodeURIComponent(file)).then((r) => r.arrayBuffer()).then((b) => engine.decode(b)).then((buffer) => {
      const analysis = analyze(buffer);
      loaded.current.set(file, { buffer, analysis });
      if (!dataRef.current?.tracks[file]) {
        const nd = newDoc(analysis);
        setData((d) => (d ? { ...d, tracks: { ...d.tracks, [file]: nd } } : d));
        flash(`Proposition auto : ${nd.bpm} BPM. Ajuste, puis Enregistrer.`);
      }
      if (file === selRef.current) { engine.setBuffer(buffer); fitView(analysis.duration); }
      setLoadingFile((f) => (f === file ? null : f));
      bump((x) => x + 1);
    }).catch((e) => { setLoadingFile(null); flash('Lecture impossible : ' + e); });
  }, [sel, !!data]);
  const selRef = useRef(sel);
  selRef.current = sel;

  const fitView = (dur: number) => {
    const W = tlHost.current?.clientWidth ?? 1000;
    setView({ t0: 0, pps: Math.max(2, W / Math.min(dur, 48)) });
  };

  // ---------- editing ----------
  const begin = useCallback(() => {
    const d = dataRef.current;
    if (!d) return;
    hist.current.past.push(d);
    if (hist.current.past.length > 200) hist.current.past.shift();
    hist.current.future = [];
  }, []);
  const update = useCallback((fn: (d: TrackDoc) => TrackDoc) => {
    setData((d) => {
      const f = selRef.current;
      if (!d || !f || !d.tracks[f]) return d;
      const next = { ...d, tracks: { ...d.tracks, [f]: fn(d.tracks[f]) } };
      dataRef.current = next;
      return next;
    });
  }, []);
  const edit = (fn: (d: TrackDoc) => TrackDoc) => { begin(); update(fn); };
  const setSlots = (fn: (s: Record<string, string>) => Record<string, string>) => { begin(); setData((d) => (d ? { ...d, slots: fn({ ...d.slots }) } : d)); };
  const undo = () => { const p = hist.current.past.pop(); if (p && data) { hist.current.future.push(data); setData(p); } };
  const redo = () => { const f = hist.current.future.pop(); if (f && data) { hist.current.past.push(data); setData(f); } };

  // ---------- derived ----------
  const autoKicks = useMemo(() => (ld && doc ? kickMap(ld.analysis, doc.bpm, doc.phase) : ''), [ld, doc?.bpm, doc?.phase]);
  const composed = useMemo(() => (ld && doc ? compose(ld.analysis, doc, autoKicks) : null), [ld, doc, autoKicks]);
  const digits = composed?.digits ?? EMPTY;
  const srcs = composed?.src ?? EMPTY;
  const base = composed?.base ?? EMPTY;
  const [selection, setSelection] = useState<{ a: number; b: number } | null>(null);
  const [selRamp, setSelRamp] = useState<number | null>(null);
  const hoverT = useRef<number | null>(null);
  const [fxOffset, setFxOffsetState] = useState(() => { try { return parseFloat(localStorage.getItem('ch-fx-offset-ms') ?? '0') || 0; } catch { return 0; } });
  const setFxOffset = (ms: number) => { setFxOffsetState(ms); try { localStorage.setItem('ch-fx-offset-ms', String(ms)); } catch { /* private mode */ } };
  useEffect(() => { engine.fxOffset = fxOffset / 1000; }, [fxOffset]);
  const [calib, setCalib] = useState<null | { clicks: number[]; taps: number[] }>(null);
  const [latOpen, setLatOpen] = useState(false);
  const live = useRef({ doc, digits });
  live.current = { doc, digits };

  useEffect(() => {
    engine.source = {
      clicks: (f0, f1, emit) => {
        const { doc: d, digits: dg } = live.current;
        if (!d) return;
        const B = beatLen(d), S = stepLen(d);
        for (let k = Math.ceil((f0 - d.phase) / B); d.phase + k * B < f1; k++) emit(d.phase + k * B, k % 4 === 0 ? 'bar' : 'beat', 1);
        for (let s = Math.max(0, Math.ceil((f0 - d.phase) / S)); d.phase + s * S < f1; s++) { const v = dg[s] ?? 0; if (v >= 1) emit(d.phase + s * S, 'kick', 0.25 + 0.75 * v / 9); }
      },
    };
  }, []);
  useEffect(() => { engine.metronome = metro; engine.kickClick = kickClick; }, [metro, kickClick]);
  useEffect(() => {
    if (!doc) return;
    engine.setLoop(loopOn, beatTime(doc, doc.loopStart), beatTime(doc, doc.loopEnd));
  }, [loopOn, doc?.loopStart, doc?.loopEnd, doc?.bpm, doc?.phase]);
  useEffect(() => { engine.setRate(rate); }, [rate]);

  // ---------- realtime: lcd, preview iframe events ----------
  useEffect(() => {
    let raf = 0;
    let last = -1;
    let lastJump = -1;
    let lastRamp = -1;
    let lastSec = '';
    let led = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const { doc: d, digits: dg } = live.current;
      if (!d) return;
      const pos = engine.position();
      if (posEl.current) posEl.current.textContent = fmtBBS(d, pos);
      if (timeEl.current) timeEl.current.textContent = fmtTime(pos);
      const win = frame.current?.contentWindow;
      const post = (m: object) => { try { win?.postMessage(m, '*'); } catch { /* preview reloading */ } };
      if (engine.playing) {
        const S = stepLen(d), B = beatLen(d);
        const spans: [number, number][] = [];
        if (engine.jumpId !== lastJump) { lastJump = engine.jumpId; last = -1; }
        if (last >= 0 && pos >= last && pos - last < 2) spans.push([last, pos]);
        else if (last >= 0 && engine.loopOn && pos < last) { spans.push([last, beatTime(d, d.loopEnd)]); spans.push([beatTime(d, d.loopStart), pos]); }
        for (const [a, b] of spans) {
          for (let s = Math.floor((a - d.phase) / S) + 1; d.phase + s * S <= b; s++) {
            if (s < 0) continue;
            const v = dg[s] ?? 0;
            if (v >= 1) { post({ type: 'mh-kick', k: v / 9 }); led = Math.max(led, v / 9); }
            if ((d.ramps ?? []).some((r) => r.to * 16 === s)) post({ type: 'mh-drop' });
            if (s % 4 === 0) post({ type: 'mh-beat', n: s / 4, bpm: d.bpm });
          }
          void B;
        }
        let rp = -1;
        for (const r of d.ramps ?? []) { const a0 = barTime(d, r.from), a1 = barTime(d, r.to); if (pos >= a0 && pos < a1) rp = (pos - a0) / (a1 - a0); }
        if (Math.abs(rp - lastRamp) > 0.01 || (rp < 0) !== (lastRamp < 0)) { lastRamp = rp; post({ type: 'mh-ramp', p: rp }); }
        const sec = sectionAt(d, pos);
        if (sec !== lastSec) { lastSec = sec; post({ type: 'mh-section', s: sec }); if (secEl.current) { secEl.current.textContent = SEC_LABEL[sec].toUpperCase(); secEl.current.className = 'sec-' + sec; } }
        last = pos;
      } else { last = -1; if (lastRamp !== -1) { lastRamp = -1; post({ type: 'mh-ramp', p: -1 }); } }
      led *= 0.86;
      if (ledEl.current) { ledEl.current.style.background = led > 0.05 ? `rgba(0,255,213,${0.25 + led})` : '#133'; ledEl.current.style.boxShadow = led > 0.3 ? `0 0 ${12 * led}px #00ffd5` : 'none'; }
      if (engine.playing !== playingRef.current) { playingRef.current = engine.playing; setPlaying(engine.playing); }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const playingRef = useRef(false);

  // ---------- tap tempo ----------
  const taps = useRef<{ pos: number[]; wall: number; began: boolean }>({ pos: [], wall: 0, began: false });
  const tap = () => {
    const d = live.current.doc;
    if (!d) return;
    if (!engine.playing) { engine.play(); setTapInfo('Tape sur chaque temps'); return; }
    const now = performance.now() / 1000;
    const T = taps.current;
    const p = engine.position();
    if (now - T.wall > 2.2 || (T.pos.length && p < T.pos[T.pos.length - 1])) { T.pos = []; T.began = false; }
    T.wall = now;
    T.pos.push(p);
    const n = T.pos.length;
    if (n < 4) { setTapInfo(`TAP ${n}…`); return; }
    const mi = (n - 1) / 2, mp = T.pos.reduce((s, x) => s + x, 0) / n;
    let cov = 0, vi = 0;
    T.pos.forEach((x, i) => { cov += (i - mi) * (x - mp); vi += (i - mi) ** 2; });
    let per = cov / vi;
    let bpm = 60 / per;
    while (bpm < 95) bpm *= 2;
    while (bpm >= 200) bpm /= 2;
    per = 60 / bpm;
    const icpt = mp - mi * (cov / vi);
    // keep beat 0 where it is (downbeat), only re-centre the grid on the taps
    let dphi = ((icpt - d.phase) % per + per) % per;
    if (dphi > per / 2) dphi -= per;
    if (!T.began) { begin(); T.began = true; }
    update((x) => ({ ...x, bpm: round(bpm, 100), phase: round(x.phase + dphi), anchors: [] }));
    setTapInfo(`TAP ${n} → ${bpm.toFixed(2)} BPM`);
  };

  // ---------- save ----------
  const save = async () => {
    if (!data) return;
    const out: StudioData = { version: 1, slots: data.slots, tracks: {} };
    for (const [f, t] of Object.entries(data.tracks) as [string, TrackDoc][]) {
      const l = loaded.current.get(f);
      let kicks = t.kicks;
      let kicksFinal = t.kicksFinal;
      if (l) {
        kicks = Array.from(compose(l.analysis, t).digits, (v) => String(v)).join('');
        kicksFinal = true;
      }
      out.tracks[f] = { ...t, kicks, kicksFinal, bpm: round(t.bpm, 1000), phase: round(t.phase), updated: t.updated };
    }
    const prev = JSON.parse(saved || '{}') as StudioData;
    for (const [f, t] of Object.entries(out.tracks)) {
      const p = prev.tracks?.[f];
      const strip = (x?: TrackDoc) => x && JSON.stringify({ ...x, kicks: undefined, updated: undefined });
      if (!p || strip(p) !== strip(t)) t.updated = new Date().toISOString();
    }
    try {
      const r = await fetch('/__music/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(out) });
      if (!r.ok) throw new Error(await r.text());
      setData(out);
      setSaved(JSON.stringify(out));
      setSavedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      flash('Enregistré dans game/audio/tracks.json : le jeu utilise ces réglages.');
    } catch (e) { flash('Échec de l’enregistrement : ' + e); }
  };
  const dirty = !!data && JSON.stringify(data) !== saved;

  const copyReport = async () => {
    if (!data) return;
    const txt = adjustmentReport(data);
    try { await navigator.clipboard.writeText(txt); flash('Rapport d’ajustements copié : colle-le à Claude.'); }
    catch { console.log(txt); flash('Copie refusée : rapport affiché dans la console.'); }
  };

  // ---------- keyboard ----------
  const K = useRef<(e: KeyboardEvent) => void>(() => {});
  K.current = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement | null)?.tagName ?? "";
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    const d = live.current.doc;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (calibRef.current && (e.code === 'Space' || e.code === 'KeyT')) { e.preventDefault(); calibTap(); return; }
    if (!d) return;
    const pos = engine.position();
    const sb = (snapKind: Snap = snap) => snapBeats(d, pos, snapKind);
    switch (e.code) {
      case 'Space': e.preventDefault(); engine.toggle(); break;
      case 'Enter': engine.seek(beatTime(d, d.start)); break;
      case 'Home': engine.seek(0); break;
      case 'KeyL': setLoopOn((v) => !v); break;
      case 'KeyM': setMetro((v) => !v); break;
      case 'KeyK': setKickClick((v) => !v); break;
      case 'KeyF': setFollow((v) => !v); break;
      case 'KeyT': tap(); break;
      case 'KeyD': edit((x) => ({ ...x, start: Math.max(0, sb()) })); break;
      case 'KeyI': edit((x) => ({ ...x, loopStart: Math.min(x.loopEnd - 4, Math.max(0, sb())) })); break;
      case 'KeyO': edit((x) => ({ ...x, loopEnd: Math.max(x.loopStart + 4, sb()) })); break;
      case 'KeyA': { const beat = Math.round((pos - d.phase) / beatLen(d)); edit((x) => refit({ ...x, anchors: [...x.anchors.filter((a) => a.beat !== beat), { beat, time: pos }] })); break; }
      case 'Comma': case 'Period': {
        const ms = (e.code === 'Comma' ? -1 : 1) * (e.shiftKey ? 10 : 1);
        edit((x) => ({ ...x, phase: round(x.phase + ms / 1000) }));
        break;
      }
      case 'ArrowLeft': case 'ArrowRight': {
        e.preventDefault();
        const unit = e.shiftKey ? 4 : 1;
        const b = Math.round((pos - d.phase) / beatLen(d) / unit) * unit + (e.code === 'ArrowLeft' ? -unit : unit);
        engine.seek(beatTime(d, b));
        break;
      }
      case 'Digit1': case 'Digit2': case 'Digit3':
        if (selSection !== null) { const type: SectionType = e.code === 'Digit1' ? 'normal' : e.code === 'Digit2' ? 'drop' : 'break'; edit((x) => ({ ...x, sections: x.sections.map((s, i) => (i === selSection ? { ...s, type } : s)) })); }
        break;
      case 'Delete': case 'Backspace':
        if (selSection !== null) { edit((x) => ({ ...x, sections: x.sections.filter((_, i) => i !== selSection) })); setSelSection(null); }
        break;
      case 'Equal': case 'NumpadAdd': zoom(1.5); break;
      case 'KeyZ': if (selection) { const W = tlHost.current?.clientWidth ?? 1000; const a0 = beatTime(d, selection.a), a1 = beatTime(d, selection.b); const pps = Math.min(3000, (W * 0.92) / Math.max(0.05, a1 - a0)); setView({ pps, t0: Math.max(0, a0 - (W * 0.04) / pps) }); } break;
      case 'Escape': setSelection(null); setSelRamp(null); break;
      case 'KeyR': if (selection) addRamp(); break;
      case 'Minus': case 'NumpadSubtract': zoom(1 / 1.5); break;
      case 'Digit0': case 'Numpad0': if (ld) fitView(ld.analysis.duration); break;
    }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => K.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const zoom = (f: number) => {
    const W = tlHost.current?.clientWidth ?? 1000;
    const pos = engine.position();
    setView((v) => {
      const center = hoverT.current ?? (pos >= v.t0 && pos <= v.t0 + W / v.pps ? pos : v.t0 + W / v.pps / 2);
      const pps = Math.max(2, Math.min(3000, v.pps * f));
      return { pps, t0: Math.max(0, center - (center - v.t0) * (v.pps / pps)) };
    });
  };

  // ---------- selection actions ----------
  const selBars = selection ? { from: Math.floor(selection.a / 4), to: Math.max(Math.floor(selection.a / 4) + 1, Math.ceil(selection.b / 4)) } : null;
  const addRamp = () => {
    if (!selBars) return;
    edit((x) => ({ ...x, ramps: [...(x.ramps ?? []).filter((r) => !(r.from < selBars.to && selBars.from < r.to)), { ...selBars }] }));
    flash(`Montée mes. ${selBars.from + 1} → drop mes. ${selBars.to + 1}`);
  };
  const learn = () => {
    if (!selBars || !doc || !composed) return;
    const rule = learnRule(doc, composed.base, selBars.from, selBars.to);
    if (!rule) { flash('Retouche d’abord quelques kicks dans la sélection : le style s’apprend de tes retouches.'); return; }
    edit((x) => ({ ...x, kickRule: rule, ruleOn: true }));
    flash(`Style appris sur mes. ${selBars.from + 1}–${selBars.to} (${Math.round(rule.accuracy * 100)} % de tes choix reproduits), appliqué à tout le morceau.`);
  };
  const clearSelEdits = () => {
    if (!selection) return;
    const a = selection.a * 4, b = selection.b * 4;
    edit((x) => ({ ...x, kickEdits: Object.fromEntries(Object.entries(x.kickEdits).filter(([k]) => +k < a || +k >= b)) }));
  };

  // ---------- latency calibration: tap on the clicks you hear ----------
  const calibRef = useRef(calib);
  calibRef.current = calib;
  const startCalib = () => {
    engine.pause();
    const c = engine.ctx;
    if (c.state === 'suspended') c.resume();
    const t0 = c.currentTime + 0.6;
    const clicks: number[] = [];
    for (let i = 0; i < 16; i++) {
      const at = t0 + i * 0.5;
      clicks.push(at);
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = i % 4 === 0 ? 1760 : 1175; o.type = 'square';
      g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.35, at + 0.001); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
      o.connect(g).connect(c.destination); o.start(at); o.stop(at + 0.06);
    }
    setCalib({ clicks, taps: [] });
  };
  const calibTap = () => {
    const cb = calibRef.current;
    if (!cb) return;
    const taps = [...cb.taps, engine.ctx.currentTime];
    setCalib({ ...cb, taps });
  };
  const calibResult = (() => {
    if (!calib || calib.taps.length < 6) return null;
    const errs = calib.taps.map((t) => { let best = Infinity; for (const c of calib.clicks) if (Math.abs(t - c) < Math.abs(best)) best = t - c; return best; }).filter((e) => Math.abs(e) < 0.25).sort((a, b) => a - b);
    if (errs.length < 5) return null;
    const med = errs[Math.floor(errs.length / 2)];
    return Math.round((med - engine.latency()) * 1000);
  })();

  // ---------- render ----------
  if (!data) return <div className="empty">Chargement…</div>;
  const slotsFor = (f: string) => slotsOf(data, f);
  const stageOfSel = (() => { const s = sel ? slotsFor(sel)[0] : undefined; return s ? +s.split('-')[1] : 1; })();
  const pos = engine.position();
  const B = doc ? beatLen(doc) : 0.5;
  const kicksPerMin = doc ? (() => { let c = 0; const a = Math.max(0, Math.floor(doc.loopStart * 4)), b = Math.min(digits.length, Math.floor(doc.loopEnd * 4)); for (let i = a; i < b; i++) if (digits[i] >= 1) c++; const dur = (doc.loopEnd - doc.loopStart) * B; return dur > 0 ? Math.round((c / dur) * 60) : 0; })() : 0;

  return (
    <div className="studio">
      {/* ---------- transport ---------- */}
      <div className="bar">
        <div className="brand"><b>STUDIO MUSIQUE</b><span>Contrabass Hero</span></div>
        <button className="btn icon" title="Aller au début en jeu (Entrée)" onClick={() => doc && engine.seek(beatTime(doc, doc.start))}>{Icon.start}</button>
        <button className={'btn play' + (playing ? ' on' : '')} title="Lecture / pause (Espace)" onClick={() => engine.toggle()}>{playing ? Icon.pause : Icon.play}</button>
        <button className="btn icon" title="Stop (retour au début en jeu)" onClick={() => { engine.pause(); if (doc) engine.seek(beatTime(doc, doc.start)); }}>{Icon.stop}</button>
        <button className={'btn icon' + (loopOn ? ' on gold' : '')} title="Écouter la boucle comme en jeu (L)" onClick={() => setLoopOn(!loopOn)}>{Icon.loop}</button>
        <div className="lcd" title="Position : mesure.temps.double-croche"><div className="big" ref={posEl}>1.1.1</div><div className="small" ref={timeEl}>0:00.00</div></div>
        <div className="lcd bpm"><div className="big">{doc ? doc.bpm.toFixed(2) : '—'}</div><div className="small">BPM · {doc ? (doc.phase * 1000).toFixed(1) : '—'} ms</div></div>
        <button className="btn" title="Tap tempo : tape T sur chaque temps pendant la lecture" onClick={tap}>TAP{tapInfo && <span style={{ color: 'var(--power)', fontFamily: 'var(--mono)' }}>{tapInfo.replace('TAP ', '')}</span>}</button>
        <div style={{ position: 'relative' }}>
          <button className={'btn' + (fxOffset ? ' on' : '')} title="Décalage entre le son et les effets (calibrage)" onClick={() => setLatOpen(!latOpen)}>Sync {fxOffset ? (fxOffset > 0 ? '+' : '') + fxOffset + ' ms' : ''}</button>
          {latOpen && (
            <div className="pop">
              <div className="row"><label>Décalage</label>
                <NumField value={fxOffset} decimals={0} step={5} fine={1} min={-300} max={500} suffix="ms" onChange={setFxOffset} title="Positif : les effets arrivent plus tard. Partagé avec le jeu." />
              </div>
              <button className="btn" style={{ width: '100%' }} onClick={startCalib}>Calibrer : taper sur les clics</button>
              <div className="hint" style={{ marginTop: 8 }}>16 clics : tape <kbd>Espace</kbd> pile sur chacun. Le résultat corrige la latence de ta sortie audio (Bluetooth, carte son) dans le studio et dans le jeu.</div>
              {calib && <div className="hint" style={{ marginTop: 6 }}>{calib.taps.length} frappes{calibResult !== null ? <> · mesuré <b style={{ color: 'var(--power)' }}>{calibResult > 0 ? '+' : ''}{calibResult} ms</b> <button className="btn" style={{ height: 22, marginLeft: 6 }} onClick={() => { setFxOffset(calibResult); setCalib(null); flash(`Sync réglée à ${calibResult} ms (studio + jeu)`); }}>Appliquer</button></> : ''}</div>}
            </div>
          )}
        </div>
        <div className="sep" />
        <button className={'btn' + (metro ? ' on' : '')} title="Métronome sur la grille (M)" onClick={() => setMetro(!metro)}>Métronome</button>
        <button className={'btn' + (kickClick ? ' on kick' : '')} title="Rejouer la carte des kicks (K)" onClick={() => setKickClick(!kickClick)}>Kicks</button>
        <span className="tag" style={{ marginLeft: 6 }}>Écoute</span>
        <div className="seg">{[0.5, 0.75, 1].map((r) => <button key={r} className={rate === r ? 'on' : ''} onClick={() => setRate(r)}>×{r}</button>)}</div>
        <span className="tag" style={{ marginLeft: 6 }}>Aimant</span>
        <div className="seg">{(['bar', 'beat', 'step'] as Snap[]).map((s) => <button key={s} className={snap === s ? 'on' : ''} onClick={() => setSnap(s)}>{s === 'bar' ? 'Mesure' : s === 'beat' ? 'Temps' : '1/16'}</button>)}</div>
        <button className={'btn' + (follow ? ' on' : '')} title="Suivre la tête de lecture (F)" onClick={() => setFollow(!follow)}>Suivre</button>
        <div className="grow" />
        <button className="btn icon" title="Annuler (Ctrl+Z)" onClick={undo} disabled={!hist.current.past.length}>{Icon.undo}</button>
        <button className="btn icon" title="Rétablir (Ctrl+Maj+Z)" onClick={redo} disabled={!hist.current.future.length}>{Icon.redo}</button>
        <button className="btn" title="Copie le diff proposition auto → tes réglages, à coller à Claude" onClick={copyReport}>Rapport</button>
        <button className={'btn primary' + (dirty ? '' : ' clean')} title="Enregistrer dans game/audio/tracks.json (Ctrl+S)" onClick={save}>{dirty ? 'Enregistrer' : 'Enregistré'}</button>
      </div>

      <div className="body">
        {/* ---------- tracks ---------- */}
        <div className="panel left">
          <div className="ph">Morceaux <span style={{ fontWeight: 400, letterSpacing: 0 }}>assets/music</span></div>
          <ul className="tracks">
            {files.map((f) => {
              const t = data.tracks[f];
              const sl = slotsFor(f);
              const edited = t?.auto && (Math.abs(t.auto.bpm - t.bpm) > 0.004 || Math.abs(t.auto.phase - t.phase) > 0.0005 || t.auto.start !== t.start || t.auto.loopEnd !== t.loopEnd || Object.keys(t.kickEdits).length > 0 || JSON.stringify(t.auto.sections) !== JSON.stringify(t.sections));
              const l = loaded.current.get(f);
              return (
                <li key={f} className={'track' + (f === sel ? ' sel' : '')} onClick={() => setSel(f)}>
                  <div className="name" title={f}>{f.replace(/\.[^.]+$/, '')}</div>
                  <div className="meta">
                    {t ? <span>{t.bpm.toFixed(2)} BPM</span> : <span className="badge new">NOUVEAU</span>}
                    {l && <span>{fmtTime(l.analysis.duration)}</span>}
                    {t && <span className="badge auto">{edited ? 'ajusté' : 'auto'}</span>}
                    {sl.map((s) => <span key={s} className={'badge ' + (s.startsWith('boss') ? 'boss' : 'stage')}>{slotLabel(s)}</span>)}
                  </div>
                </li>
              );
            })}
            {!files.length && <li className="hint" style={{ padding: 10 }}>Dépose des MP3 dans assets/music puis recharge la page.</li>}
          </ul>
          <div className="ph">Affectations</div>
          <div className="slots">
            {STAGES.flatMap((n) => ['stage', 'boss'].map((k) => {
              const slot = `${k}-${n}`;
              return (
                <div className="slotrow" key={slot}>
                  <label>{k === 'boss' ? `Boss ${n}` : `Niveau ${n}`}</label>
                  <select className="sm" value={data.slots[slot] ?? ''} onChange={(e) => { const v = e.target.value; setSlots((s) => { if (v) s[slot] = v; else delete s[slot]; return s; }); }}>
                    <option value="">Bach procédural</option>
                    {files.map((f) => <option key={f} value={f}>{f.replace(/\.[^.]+$/, '')}</option>)}
                  </select>
                </div>
              );
            }))}
          </div>
        </div>

        {/* ---------- center ---------- */}
        <div className="center">
          <div className="preview">
            <iframe ref={frame} key={`${hero}-${stageOfSel}`} src={`/?v=3&char=${hero}&stage=${stageOfSel}&preview=1`} title="Aperçu du niveau" />
            <div className="pv-hud">
              <span className="chip">Aperçu <b>{slotsFor(sel ?? '').map(slotLabel).join(' · ') || `Niveau ${stageOfSel}`}</b></span>
              <span className="chip">Héros <select value={hero} onChange={(e) => setHero(e.target.value)}>{HEROES.map((h) => <option key={h} value={h}>{h}</option>)}</select></span>
              <span className="chip"><span className="led" ref={ledEl} /> kick</span>
              <span className="chip"><span ref={secEl}>NORMAL</span></span>
              <div className="grow" />
              <button className="chip" style={{ cursor: 'pointer' }} title="Recharger l'aperçu (après un enregistrement)" onClick={() => { if (frame.current) frame.current.src = frame.current.src; }}>Recharger</button>
            </div>
          </div>
          {doc && ld ? (
            <Overview doc={doc} analysis={ld.analysis} engine={engine} view={view} setView={setView} width={() => tlHost.current?.clientWidth ?? 1000} />
          ) : <div className="overview" />}
          <div style={{ position: 'relative', minHeight: 0 }} ref={tlHost}>
            {doc && ld && (
              <Timeline doc={doc} analysis={ld.analysis} digits={digits} src={srcs} base={base} selection={selection} setSelection={setSelection} selRamp={selRamp} setSelRamp={setSelRamp} hoverT={hoverT} engine={engine} view={view} setView={setView} follow={follow} snap={snap} loopOn={loopOn}
                selSection={selSection} setSelSection={setSelSection} begin={begin} update={update} onHint={setHint} />
            )}
            {loadingFile && <div className="loading"><div><div className="spin" />Analyse de « {loadingFile} »…</div></div>}
            {!sel && <div className="empty">Choisis un morceau</div>}
          </div>
        </div>

        {/* ---------- inspector ---------- */}
        <div className="panel right">
          {doc ? (
            <>
              <div className="ph">{sel?.replace(/\.[^.]+$/, '')}</div>
              <div className="sec">
                <h3>Tempo et grille</h3>
                <div className="row"><label>BPM</label>
                  <NumField value={doc.bpm} decimals={2} step={0.01} fine={0.001} min={40} max={260} accent onBegin={begin} onChange={(v) => update((x) => ({ ...x, bpm: v }))} />
                  <button className="btn" title="Diviser par 2" onClick={() => edit((x) => ({ ...x, bpm: round(x.bpm / 2, 1000) }))}>÷2</button>
                  <button className="btn" title="Multiplier par 2" onClick={() => edit((x) => ({ ...x, bpm: round(x.bpm * 2, 1000) }))}>×2</button>
                </div>
                <div className="row"><label>Phase</label>
                  <NumField value={doc.phase * 1000} decimals={1} step={1} fine={0.1} suffix="ms" onBegin={begin} onChange={(v) => update((x) => ({ ...x, phase: round(v / 1000) }))}
                    title="Position du temps 1 de la grille. Glisser, ou Maj+glisser dans la forme d'onde, ou touches , et ." />
                  <button className="btn" title="−1 ms (,)" onClick={() => edit((x) => ({ ...x, phase: round(x.phase - 0.001) }))}>‹</button>
                  <button className="btn" title="+1 ms (.)" onClick={() => edit((x) => ({ ...x, phase: round(x.phase + 0.001) }))}>›</button>
                </div>
                <div className="row"><label>Temps 1</label>
                  <button className="btn" style={{ flex: 1 }} title="Décale toute la grille pour que le temps le plus proche tombe sur la tête de lecture"
                    onClick={() => { const b = Math.round((pos - doc.phase) / B); edit((x) => ({ ...x, phase: round(pos - b * B) })); }}>Caler un temps sur la tête</button>
                  <button className="btn" title="Décaler le temps fort d'un temps (la mesure commence un temps plus tard)" onClick={() => edit((x) => ({ ...x, phase: round(x.phase + B) }))}>+1 t</button>
                </div>
                <div className="hint" style={{ margin: '2px 0 8px' }}>
                  Ancres : double-clic sur une attaque de la forme d'onde (ou <kbd>A</kbd> à la tête de lecture). 2 ancres ou plus recalculent BPM et phase ; l'écart de chaque ancre s'affiche.
                </div>
                {doc.anchors.length > 0 && (
                  <div className="list" style={{ marginBottom: 8 }}>
                    {doc.anchors.map((a, i) => {
                      const err = anchorError(doc, a) * 1000;
                      const cls = Math.abs(err) < 4 ? 'err-ok' : Math.abs(err) < 12 ? 'err-mid' : 'err-bad';
                      return (
                        <div className="li" key={i} onClick={() => engine.seek(a.time - 0.5)}>
                          <span>{Math.floor(a.beat / 4) + 1}.{(((a.beat % 4) + 4) % 4) + 1}</span>
                          <span>{fmtTime(a.time)}</span>
                          <span className={cls}>{err >= 0 ? '+' : ''}{err.toFixed(1)} ms</span>
                          <button className="x" title="Supprimer" onClick={(e) => { e.stopPropagation(); edit((x) => removeAnchor(x, i)); }}>×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="row">
                  {doc.anchors.length > 0 && <button className="btn" onClick={() => edit((x) => ({ ...x, anchors: [] }))}>Effacer les ancres</button>}
                  <div className="grow" />
                  <button className="btn" title="Relancer la détection automatique (tempo, phase, sections, boucle)" onClick={() => { if (ld && confirm('Remplacer les réglages de ce morceau par une nouvelle proposition automatique ?')) edit(() => newDoc(ld.analysis)); }}>Re-proposer</button>
                  {doc.auto && <button className="btn" title="Revenir à la proposition automatique enregistrée" onClick={() => edit((x) => ({ ...x, ...x.auto!, sections: x.auto!.sections.map((s) => ({ ...s })), ramps: (x.auto!.ramps ?? []).map((r) => ({ ...r })), anchors: [], kickEdits: {} }))}>Revenir à l'auto</button>}
                </div>
              </div>

              <div className="sec">
                <h3>Sélection <span className="tag">{selBars ? `mes. ${selBars.from + 1} → ${selBars.to + 1}` : 'glisser dans la forme d’onde'}</span></h3>
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <button className="btn" disabled={!selBars} title="Déduit ton style (quels kicks tu gardes, leur force) de tes retouches dans la sélection et l'applique à tout le morceau" onClick={learn}>Apprendre mon style ici</button>
                  <button className="btn" disabled={!selBars} title="Montée sur la sélection, drop à la fin (R)" onClick={addRamp}>Montée (R)</button>
                  <button className="btn" disabled={!selBars} title="Zoom sur la sélection (Z)" onClick={() => K.current(new KeyboardEvent('keydown', { code: 'KeyZ' }))}>Zoom (Z)</button>
                  <button className="btn" disabled={!selection} title="Efface tes retouches de kicks dans la sélection" onClick={clearSelEdits}>Effacer retouches</button>
                </div>
                <div className="hint">Méthode : retouche les punchs d’un passage typique (8–16 mesures), sélectionne-le, puis « Apprendre mon style ici ». Le reste du morceau suit ta règle ; tes retouches restent prioritaires.</div>
              </div>

              <div className="sec">
                <h3>Style de punch {doc.kickRule && <span className="tag">{Math.round(doc.kickRule.accuracy * 100)} % sur mes. {doc.kickRule.from + 1}–{doc.kickRule.to}</span>}</h3>
                {doc.kickRule ? (
                  <>
                    <div className="pattern" title="Par double-croche de la mesure : plus la case est pleine, plus le punch y est gardé facilement">
                      {doc.kickRule.thr.map((t, i) => (
                        <div key={i} className={'pc' + (i % 4 === 0 ? ' beat' : '')} style={{ ['--k' as string]: String(t >= 10 ? 0 : 1 - t / 10) }}>
                          <span>{doc.kickRule!.level[i] ?? ''}</span>
                        </div>
                      ))}
                    </div>
                    <div className="row" style={{ marginTop: 8 }}>
                      <button className={'btn' + (doc.ruleOn !== false ? ' on kick' : '')} onClick={() => edit((x) => ({ ...x, ruleOn: x.ruleOn === false }))}>{doc.ruleOn !== false ? 'Appliqué' : 'Désactivé'}</button>
                      <div className="grow" />
                      <button className="btn" onClick={() => edit((x) => ({ ...x, kickRule: undefined }))}>Oublier</button>
                    </div>
                  </>
                ) : <div className="hint">Pas encore de style appris : le morceau utilise la détection brute (au-dessus du seuil).</div>}
              </div>

              <div className="sec">
                <h3>Montées <span className="tag">densité + force ↗ puis drop</span></h3>
                <div className="list" style={{ marginBottom: 8 }}>
                  {(doc.ramps ?? []).map((r, i) => ({ r, i })).sort((p, q) => p.r.from - q.r.from).map(({ r, i }) => (
                    <div className={'li' + (selRamp === i ? ' sel' : '')} key={i} onClick={() => { setSelRamp(i); engine.play(barTime(doc, r.from) - 2 * B); }} style={{ gridTemplateColumns: '1fr auto auto' }}>
                      <span>mes. {r.from + 1} → drop {r.to + 1}</span>
                      <span style={{ color: 'var(--tx2)' }}>{r.to - r.from} mes.</span>
                      <button className="x" title="Supprimer" onClick={(e) => { e.stopPropagation(); edit((x) => ({ ...x, ramps: x.ramps.filter((_, k) => k !== i) })); setSelRamp(null); }}>×</button>
                    </div>
                  ))}
                  {!(doc.ramps ?? []).length && <div className="hint">Aucune montée.</div>}
                </div>
                <div className="row">
                  <label style={{ width: 'auto', flex: 1 }}>Punchs légers dans les breaks</label>
                  <button className={'btn' + (doc.breakPunch !== false ? ' on kick' : '')} onClick={() => edit((x) => ({ ...x, breakPunch: x.breakPunch === false }))}>{doc.breakPunch !== false ? 'Oui' : 'Non'}</button>
                </div>
                <div className="hint">Une montée remplace les punchs : blanches → noires → croches → double-croches, de plus en plus fort, caméra qui se resserre, puis explosion au drop. Double-clic dans la partie basse de la piste Sections, ou sélection + <kbd>R</kbd>.</div>
              </div>

              <div className="sec">
                <h3>Lecture en jeu <span className="tag" style={{ color: 'var(--reward)' }}>{Math.round((doc.loopEnd - doc.loopStart) / 4)} mesures · {fmtTime((doc.loopEnd - doc.loopStart) * B)}</span></h3>
                {([['start', 'Début', 'D'], ['loopStart', 'Boucle de', 'I'], ['loopEnd', 'Boucle à', 'O']] as const).map(([k, label, key]) => (
                  <div className="row" key={k}><label>{label}</label>
                    <NumField value={doc[k] / 4 + 1} decimals={2} step={0.25} fine={0.0625} min={1} suffix="mes." onBegin={begin}
                      onChange={(v) => update((x) => ({ ...x, [k]: Math.max(0, round((v - 1) * 4, 4)) }))} title={`${fmtTime(beatTime(doc, doc[k]))} · glisser ou double-clic`} />
                    <button className="btn" title={`Placer à la tête de lecture (${key})`} onClick={() => edit((x) => ({ ...x, [k]: Math.max(0, snapBeats(x, pos, snap)) }))}>⇤ tête</button>
                    <button className="btn" title="Écouter depuis ce point" onClick={() => engine.play(beatTime(doc, doc[k]) - (k === 'loopEnd' ? 4 * B : 0))}>▶</button>
                  </div>
                ))}
                <div className="row"><label>Boss à</label>
                  <NumField value={bossBeat(doc) / 4 + 1} decimals={2} step={1} fine={0.25} min={1} suffix="mes." accent={typeof doc.boss !== 'number'} onBegin={begin}
                    onChange={(v) => update((x) => ({ ...x, boss: Math.max(0, round((v - 1) * 4, 4)) }))} title={`${fmtTime(beatTime(doc, bossBeat(doc)))} · ${fmtTime((bossBeat(doc) - doc.start) * B)} de jeu`} />
                  <button className="btn" title="Placer le boss à la tête de lecture" onClick={() => edit((x) => ({ ...x, boss: Math.max(0, snapBeats(x, pos, 'bar')) }))}>⇤ tête</button>
                  <button className={'btn' + (typeof doc.boss !== 'number' ? ' on kick' : '')} title={`Automatique : 2e drop, au moins ${MIN_STAGE_SECONDS} s de jeu`} onClick={() => edit((x) => ({ ...x, boss: null }))}>Auto</button>
                </div>
                <div className="hint">Le jeu démarre au <b>Début</b>, boucle de <b>Boucle de</b> à <b>Boucle à</b>, et le <b>boss</b> débarque sur son marqueur ({fmtTime((bossBeat(doc) - doc.start) * B)} de jeu). Active <kbd>L</kbd> pour entendre la jointure de la boucle.</div>
              </div>

              <div className="sec">
                <h3>Kicks <span className="tag">{kicksPerMin} / min dans la boucle</span></h3>
                <div className="row"><label>Seuil détection</label>
                  <input type="range" min={1} max={9} step={1} value={doc.kickMin} onPointerDown={begin} onChange={(e) => update((x) => ({ ...x, kickMin: +e.target.value }))} />
                  <span style={{ fontFamily: 'var(--mono)', width: 14, textAlign: 'right' }}>{doc.kickMin}</span>
                </div>
                <div className="row"><label>Retouches</label>
                  <span style={{ fontFamily: 'var(--mono)', flex: 1 }}>{Object.keys(doc.kickEdits).length}</span>
                  {Object.keys(doc.kickEdits).length > 0 && <button className="btn" onClick={() => edit((x) => ({ ...x, kickEdits: {} }))}>Tout effacer</button>}
                </div>
                <div className="hint">Clic : ajouter / retirer un kick (la hauteur règle la force). Glisser : peindre. <kbd>Alt</kbd> ou clic droit : effacer. <kbd>Ctrl</kbd> : revenir à la détection. Gris : détection brute ; turquoise : punchs gardés ; violet : breaks ; or : montées ; rose : drops.</div>
              </div>

              <div className="sec">
                <h3>Sections <span className="tag">effets : drop ×1.3 · break ×0.8</span></h3>
                <div className="list" style={{ marginBottom: 8 }}>
                  {doc.sections.map((s, i) => ({ s, i })).sort((p, q) => p.s.bar - q.s.bar).map(({ s, i }) => (
                    <div className={'li' + (selSection === i ? ' sel' : '')} key={i} onClick={() => { setSelSection(i); engine.seek(barTime(doc, s.bar)); }} style={{ gridTemplateColumns: '52px 1fr auto auto' }}>
                      <span>mes. {s.bar + 1}</span>
                      <span>{fmtTime(barTime(doc, s.bar))}</span>
                      <select value={s.type} onClick={(e) => e.stopPropagation()} onChange={(e) => edit((x) => ({ ...x, sections: x.sections.map((y, k) => (k === i ? { ...y, type: e.target.value as SectionType } : y)) }))}>
                        {(['normal', 'drop', 'break'] as SectionType[]).map((t) => <option key={t} value={t}>{SEC_LABEL[t]}</option>)}
                      </select>
                      <button className="x" title="Supprimer" onClick={(e) => { e.stopPropagation(); edit((x) => ({ ...x, sections: x.sections.filter((_, k) => k !== i) })); setSelSection(null); }}>×</button>
                    </div>
                  ))}
                  {!doc.sections.length && <div className="hint">Aucune section : effets normaux partout.</div>}
                </div>
                <div className="row">
                  <button className="btn" onClick={() => { const bar = Math.max(0, Math.round((pos - doc.phase) / B / 4)); if (!doc.sections.some((s) => s.bar === bar)) { edit((x) => ({ ...x, sections: [...x.sections, { bar, type: 'drop' } as Section] })); setSelSection(doc.sections.length); } }}>+ à la tête de lecture</button>
                </div>
                <div className="hint">Double-clic dans la piste Sections pour ajouter, glisser pour déplacer, <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> normal / drop / break, <kbd>Suppr</kbd>.</div>
              </div>

              <div className="sec">
                <h3>Utilisé pour</h3>
                <div className="slotgrid">
                  <span />
                  {STAGES.map((n) => <span key={n} className="h">{n}</span>)}
                  {(['stage', 'boss'] as const).map((k) => (
                    <React.Fragment key={k}>
                      <span className="rl">{k === 'boss' ? 'Boss' : 'Niveau'}</span>
                      {STAGES.map((n) => {
                        const slot = `${k}-${n}`;
                        const on = data.slots[slot] === sel;
                        const taken = !!data.slots[slot] && !on;
                        return <button key={slot} className={'sbtn' + (on ? ' on' + (k === 'boss' ? ' b' : '') : taken ? ' taken' : '')} title={taken ? `Actuellement : ${data.slots[slot]}` : slotLabel(slot)}
                          onClick={() => setSlots((s) => { if (on) delete s[slot]; else s[slot] = sel!; return s; })}>{n}</button>;
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="sec">
                <h3>Raccourcis</h3>
                <div className="hint" style={{ lineHeight: 1.9 }}>
                  <kbd>Espace</kbd> lecture · <kbd>Entrée</kbd> début en jeu · <kbd>←</kbd><kbd>→</kbd> temps (<kbd>Maj</kbd> mesure)<br />
                  <kbd>T</kbd> tap tempo · <kbd>A</kbd> ancre · <kbd>,</kbd><kbd>.</kbd> phase ±1 ms (<kbd>Maj</kbd> 10)<br />
                  <kbd>D</kbd> début · <kbd>I</kbd><kbd>O</kbd> boucle · <kbd>L</kbd> boucle · <kbd>M</kbd> métronome · <kbd>K</kbd> kicks<br />
                  <kbd>Ctrl</kbd>+molette zoom · molette défiler · <kbd>0</kbd> vue globale · <kbd>F</kbd> suivre<br />
                  <kbd>Maj</kbd>+glisser dans l'onde : déplacer la grille · <kbd>Ctrl+Z</kbd> annuler · <kbd>Ctrl+S</kbd> enregistrer
                </div>
              </div>
            </>
          ) : <div className="empty">—</div>}
        </div>
      </div>

      <div className="status">
        <span>{hint || 'Survole la timeline'}</span>
        <span>{doc ? `Grille ${doc.bpm.toFixed(2)} BPM · temps 1 à ${(doc.phase * 1000).toFixed(1)} ms` : ''}</span>
        <div className="r">
          <span>zoom {view.pps.toFixed(0)} px/s</span>
          <span style={{ color: dirty ? 'var(--reward)' : undefined }}>{dirty ? '● modifications non enregistrées' : savedAt ? `enregistré à ${savedAt}` : 'à jour'}</span>
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<Studio />);
