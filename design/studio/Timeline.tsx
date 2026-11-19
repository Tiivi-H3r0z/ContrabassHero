import React, { useEffect, useRef } from 'react';
import type { Analysis } from './analysis';
import { snapToOnset } from './analysis';
import type { Engine } from './engine';
import { bossBeat } from '../../game/audio/trackMath';
import { TrackDoc, beatLen, stepLen, beatTime, timeBeat, barTime, fitAnchors, anchorError, fmtBBS, fmtTime, SectionType } from './model';

export type Snap = 'bar' | 'beat' | 'step';
export interface View { t0: number; pps: number }

export interface TimelineProps {
  doc: TrackDoc;
  analysis: Analysis;
  digits: Uint8Array;
  src: Uint8Array;
  base: Uint8Array;
  engine: Engine;
  selection: { a: number; b: number } | null; // beats
  setSelection: (s: { a: number; b: number } | null) => void;
  selRamp: number | null;
  setSelRamp: (i: number | null) => void;
  hoverT: React.MutableRefObject<number | null>;
  view: View;
  setView: (v: View) => void;
  follow: boolean;
  snap: Snap;
  loopOn: boolean;
  selSection: number | null;
  setSelSection: (i: number | null) => void;
  begin: () => void;
  update: (fn: (d: TrackDoc) => TrackDoc) => void;
  onHint: (s: string) => void;
}

const RULER = 30, SECT = 36, KICK = 80;
const SECT_SPLIT = 16; // sections on top, build-ups (ramps) below
const KICK_COL: Record<number, string> = { 1: '0,255,213', 2: '0,255,213', 3: '127,140,255', 4: '255,194,26', 5: '255,61,139', 6: '0,255,213' };
const COL = {
  bg: '#0d0f12', lane: '#111419', laneAlt: '#13171c', line: '#2a2f38', bar: 'rgba(230,235,242,0.22)', beat: 'rgba(230,235,242,0.09)', step: 'rgba(230,235,242,0.04)',
  low: [43, 123, 255], mid: [0, 255, 213], high: [232, 251, 255], power: '#00ffd5', ui: '#4da3ff', combo: '#ff3d8b', reward: '#ffc21a', brk: '#7f8cff', tx: '#aab3c0', tx2: '#6f7a89',
};
const SEC_COL: Record<SectionType, string> = { drop: COL.combo, break: COL.brk, normal: '#5d6878' };
const SEC_NAME: Record<SectionType, string> = { drop: 'DROP', break: 'BREAK', normal: 'NORMAL' };

type Drag =
  | { kind: 'seek' }
  | { kind: 'start' | 'loopStart' | 'loopEnd' | 'boss' }
  | { kind: 'loopMove'; grab: number; len: number; from: number }
  | { kind: 'section'; index: number }
  | { kind: 'anchor'; index: number }
  | { kind: 'phase'; x0: number; phase0: number }
  | { kind: 'kick'; erase: boolean; reset: boolean; last: number }
  | { kind: 'pan'; x0: number; t00: number }
  | { kind: 'zoom'; x0: number; y0: number; tA: number; pps0: number; moved: boolean }
  | { kind: 'select'; x0: number; a: number; moved: boolean }
  | { kind: 'rampEdge'; index: number; end: 'from' | 'to' }
  | { kind: 'rampMove'; index: number; grab: number; from: number; to: number };

export const snapBeats = (d: TrackDoc, t: number, snap: Snap) => {
  const unit = snap === 'bar' ? 4 : snap === 'beat' ? 1 : 0.25;
  return Math.round(timeBeat(d, t) / unit) * unit;
};

export const Timeline: React.FC<TimelineProps> = (props) => {
  const host = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const P = useRef(props);
  P.current = props;
  const drag = useRef<Drag | null>(null);
  const hover = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const c = cv.current, h = host.current;
      if (!c || !h) return;
      const dpr = window.devicePixelRatio || 1;
      const W = h.clientWidth, H = h.clientHeight;
      if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      const g = c.getContext('2d')!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      render(g, W, H);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const lanes = (H: number) => {
    const wave = Math.max(60, H - RULER - SECT - KICK);
    return { ruler: [0, RULER], sect: [RULER, RULER + SECT], wave: [RULER + SECT, RULER + SECT + wave], kick: [RULER + SECT + wave, RULER + SECT + wave + KICK] } as Record<string, [number, number]>;
  };

  const render = (g: CanvasRenderingContext2D, W: number, H: number) => {
    const { doc, analysis: a, digits, engine, view, follow, loopOn, selSection } = P.current;
    const L = lanes(H);
    const { t0, pps } = view;
    const t1 = t0 + W / pps;
    const X = (t: number) => (t - t0) * pps;
    const playing = engine.playing;
    const pos = engine.position();
    if (follow && playing && (pos > t1 - (t1 - t0) * 0.08 || pos < t0)) P.current.setView({ t0: Math.max(0, pos - (t1 - t0) * 0.1), pps });

    g.fillStyle = COL.bg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#15181d'; g.fillRect(0, L.ruler[0], W, RULER);
    g.fillStyle = COL.lane; g.fillRect(0, L.sect[0], W, SECT);
    g.fillStyle = '#0f1216'; g.fillRect(0, L.kick[0], W, KICK);

    // ---------- in-game region (start -> loop end) highlight ----------
    const ts = beatTime(doc, doc.start), tls = beatTime(doc, doc.loopStart), tle = beatTime(doc, doc.loopEnd);
    g.fillStyle = 'rgba(0,0,0,0.38)';
    if (X(ts) > 0) g.fillRect(0, L.sect[0], Math.min(W, X(ts)), H - L.sect[0]);
    if (X(tle) < W) g.fillRect(Math.max(0, X(tle)), L.sect[0], W, H - L.sect[0]);

    // ---------- sections lane ----------
    const secs = doc.sections.map((s, i) => ({ ...s, i })).sort((p, q) => p.bar - q.bar);
    for (let k = 0; k < secs.length; k++) {
      const s = secs[k];
      const xa = X(barTime(doc, s.bar)), xb = k + 1 < secs.length ? X(barTime(doc, secs[k + 1].bar)) : X(a.duration);
      if (xb < 0 || xa > W) continue;
      const col = SEC_COL[s.type];
      g.globalAlpha = s.type === 'normal' ? 0.18 : 0.32;
      g.fillStyle = col; g.fillRect(xa, L.sect[0] + 2, xb - xa, SECT_SPLIT - 3);
      // tint of the waveform lane under drops / breaks
      if (s.type !== 'normal') { g.globalAlpha = 0.06; g.fillRect(xa, L.wave[0], xb - xa, L.wave[1] - L.wave[0]); }
      g.globalAlpha = 1;
    }
    for (const s of secs) {
      const x = X(barTime(doc, s.bar));
      if (x < -60 || x > W + 4) continue;
      const sel = selSection === s.i;
      g.fillStyle = SEC_COL[s.type];
      g.fillRect(x, L.sect[0] + 1, sel ? 3 : 2, SECT_SPLIT - 1);
      g.beginPath(); g.moveTo(x, L.sect[0] + 1); g.lineTo(x + 9, L.sect[0] + 1); g.lineTo(x, L.sect[0] + 10); g.fill();
      g.font = '700 10px system-ui, sans-serif';
      g.fillStyle = sel ? '#fff' : SEC_COL[s.type];
      g.fillText(SEC_NAME[s.type], x + 11, L.sect[0] + 12);
      if (sel) { g.strokeStyle = '#fff'; g.lineWidth = 1; g.strokeRect(x - 2.5, L.sect[0] + 0.5, 64, SECT_SPLIT); }
    }
    // build-ups: a rising wedge, the drop at its end
    const ry0 = L.sect[0] + SECT_SPLIT + 2, rH = SECT - SECT_SPLIT - 4;
    (doc.ramps ?? []).forEach((r, i) => {
      const xa = X(barTime(doc, r.from)), xb = X(barTime(doc, r.to));
      if (xb < -40 || xa > W + 40) return;
      const grd = g.createLinearGradient(xa, 0, xb, 0);
      grd.addColorStop(0, 'rgba(255,194,26,0.12)'); grd.addColorStop(1, 'rgba(255,61,139,0.95)');
      g.fillStyle = grd;
      g.beginPath(); g.moveTo(xa, ry0 + rH); g.lineTo(xb, ry0); g.lineTo(xb, ry0 + rH); g.closePath(); g.fill();
      const wg = g.createLinearGradient(xa, 0, xb, 0);
      wg.addColorStop(0, 'rgba(255,61,139,0)'); wg.addColorStop(1, 'rgba(255,61,139,0.14)');
      g.fillStyle = wg; g.fillRect(xa, L.wave[0], xb - xa, L.wave[1] - L.wave[0]);
      if (P.current.selRamp === i) { g.strokeStyle = '#fff'; g.lineWidth = 1; g.strokeRect(xa + 0.5, ry0 - 1.5, xb - xa - 1, rH + 3); }
      g.fillStyle = COL.reward; g.font = '700 9.5px system-ui, sans-serif';
      g.fillText('MONTÉE', xa + 4, ry0 + rH - 3);
      g.fillStyle = COL.combo; g.fillRect(xb - 1, ry0 - 2, 3, rH + 4);
      g.fillText('✶ DROP', xb + 5, ry0 + rH - 3);
    });

    // ---------- waveform ----------
    const wy0 = L.wave[0], wy1 = L.wave[1], wh = wy1 - wy0, mid = wy0 + wh / 2;
    // 3-band waveform: peak envelope, then lows (blue), mids (turquoise) and highs (white) stacked from the centre
    const amp = (wh / 2 - 4) / Math.max(0.05, a.maxPeak);
    const half = wh / 2 - 4;
    const [rl, rm, rh] = a.bandRef;
    const bps = 1 / a.bucketSec;
    for (let x = 0; x < W; x++) {
      const ta = t0 + x / pps, tb = ta + 1 / pps;
      let b0 = Math.floor(ta * bps), b1 = Math.max(b0 + 1, Math.floor(tb * bps));
      if (b0 >= a.peak.length || b1 <= 0) continue;
      b0 = Math.max(0, b0); b1 = Math.min(a.peak.length, b1);
      let pk = 0, lo = 0, md = 0, hi = 0;
      for (let bb = b0; bb < b1; bb++) { if (a.peak[bb] > pk) pk = a.peak[bb]; lo += a.low[bb]; md += a.mid[bb]; hi += a.high[bb]; }
      const nb = b1 - b0; lo /= nb; md /= nb; hi /= nb;
      const hp = pk * amp;
      g.fillStyle = 'rgba(77,110,150,0.35)';
      g.fillRect(x, mid - hp, 1, hp * 2);
      const hl = Math.min(1, lo / rl) * half * 0.95;
      g.fillStyle = '#2b6fff';
      g.fillRect(x, mid - hl, 1, hl * 2);
      const hm = Math.min(1, md / rm) * half * 0.72;
      g.fillStyle = '#19e0c4';
      g.fillRect(x, mid - hm, 1, hm * 2);
      const hh = Math.min(1, hi / rh) * half * 0.26;
      g.fillStyle = 'rgba(232,251,255,0.8)';
      g.fillRect(x, mid - hh, 1, hh * 2);
    }
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, mid, W, 1);

    // ---------- grid ----------
    const B = beatLen(doc), S = stepLen(doc);
    const pxBeat = B * pps, pxStep = S * pps, pxBar = 4 * pxBeat;
    const s0 = Math.floor((t0 - doc.phase) / S) - 1, s1 = Math.ceil((t1 - doc.phase) / S) + 1;
    const barEvery = pxBar < 14 ? 16 : pxBar < 40 ? 4 : 1;
    for (let st = s0; st <= s1; st++) {
      const x = Math.round(X(doc.phase + st * S)) + 0.5;
      const isBar = st % 16 === 0, isBeat = st % 4 === 0;
      let col: string | null = null;
      if (isBar && (st / 16) % barEvery === 0) col = COL.bar;
      else if (isBeat && pxBeat >= 9) col = COL.beat;
      else if (!isBeat && pxStep >= 7) col = COL.step;
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x - 0.5, L.sect[0], 1, H - L.sect[0]);
    }

    // ---------- ruler ----------
    g.fillStyle = COL.line; g.fillRect(0, RULER - 1, W, 1);
    g.font = '600 10.5px ' + getComputedStyle(document.body).getPropertyValue('--mono');
    for (let bar = Math.floor((t0 - doc.phase) / (4 * B)) - 1; bar <= Math.ceil((t1 - doc.phase) / (4 * B)); bar++) {
      if (bar % barEvery !== 0) continue;
      const x = Math.round(X(barTime(doc, bar))) + 0.5;
      g.fillStyle = 'rgba(230,235,242,0.35)'; g.fillRect(x - 0.5, 4, 1, RULER - 5);
      g.fillStyle = bar >= 0 ? COL.tx : COL.tx2;
      g.fillText(String(bar + 1), x + 4, 13);
      if (pxBeat >= 14) for (let k = 1; k < 4; k++) { const xb = Math.round(X(barTime(doc, bar) + k * B)) + 0.5; g.fillStyle = 'rgba(230,235,242,0.18)'; g.fillRect(xb - 0.5, RULER - 8, 1, 7); }
    }
    // loop brace
    const xl0 = X(tls), xl1 = X(tle);
    g.fillStyle = loopOn ? 'rgba(255,194,26,0.28)' : 'rgba(255,194,26,0.1)';
    g.fillRect(xl0, 18, xl1 - xl0, 10);
    g.fillStyle = loopOn ? COL.reward : 'rgba(255,194,26,0.5)';
    g.fillRect(xl0, 18, 3, 10); g.fillRect(xl1 - 3, 18, 3, 10);
    g.fillRect(xl0, 18, xl1 - xl0, 2);
    // start flag
    const xs = X(ts);
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(xs, 2); g.lineTo(xs + 10, 8); g.lineTo(xs, 14); g.fill();
    g.fillRect(xs, 2, 1.5, H - 2);
    g.font = '700 9.5px system-ui, sans-serif';
    g.fillText('DÉBUT', xs + 13, 12);
    // boss marker: a skull handle on the ruler (drag it), a line through the lanes
    const xbo = X(beatTime(doc, bossBeat(doc)));
    g.fillStyle = '#ff5a1a';
    g.fillRect(xbo - 1, 20, 2, H - 20);
    const bl = typeof doc.boss === 'number' ? 'BOSS' : 'BOSS · AUTO';
    g.font = '700 9.5px system-ui, sans-serif';
    const bw2 = g.measureText(bl).width + 10;
    g.fillStyle = '#15181d'; g.fillRect(xbo + 12, 3, bw2, 14);
    g.fillStyle = '#ff5a1a'; g.fillText(bl, xbo + 17, 13.5);
    g.save(); g.translate(xbo, 10); g.scale(1.35, 1.35); skull(g, 0, 0, 1); g.restore();

    // ---------- kick lane ----------
    const ky0 = L.kick[0], kh = KICK - 8;
    // low-band onset curve as guide
    const fps = 1 / a.lowHop;
    let fmax = 1e-12;
    for (let i = 0; i < a.lowFlux.length; i += 7) if (a.lowFlux[i] > fmax) fmax = a.lowFlux[i];
    g.strokeStyle = 'rgba(43,123,255,0.35)'; g.lineWidth = 1; g.beginPath();
    for (let x = 0; x < W; x += 1) {
      const ta = t0 + x / pps, tb = ta + 1 / pps;
      let m = 0;
      for (let i = Math.max(0, Math.floor(ta * fps)); i < Math.min(a.lowFlux.length, Math.ceil(tb * fps)); i++) if (a.lowFlux[i] > m) m = a.lowFlux[i];
      const y = ky0 + KICK - 4 - Math.min(1, Math.sqrt(m / fmax) * 1.3) * kh;
      if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    const kmin = doc.kickMin;
    const bw = Math.max(1, Math.min(pxStep * 0.62, 14));
    const { src, base } = P.current;
    for (let st = Math.max(0, s0); st <= Math.min(digits.length - 1, s1); st++) {
      const d = digits[st];
      const edited = doc.kickEdits[st] !== undefined;
      const x = X(doc.phase + st * S);
      const bd = base[st] ?? 0;
      if (bd > 0) { g.fillStyle = 'rgba(111,122,137,0.32)'; g.fillRect(x - bw / 2, ky0 + KICK - 4 - (bd / 9) * kh, bw, (bd / 9) * kh); }
      if (d === 0 && !edited) continue;
      const hh = (d / 9) * kh;
      const sc = src[st];
      g.fillStyle = sc === 5 ? COL.combo : `rgba(${KICK_COL[sc] ?? '0,255,213'},${0.45 + 0.55 * d / 9})`;
      g.fillRect(x - bw / 2, ky0 + KICK - 4 - hh, bw, hh);
      if (edited) {
        g.fillStyle = '#fff';
        g.fillRect(x - bw / 2, ky0 + KICK - 4 - hh - 2, bw, 2);
        if (d === 0) { g.strokeStyle = 'rgba(255,255,255,0.5)'; g.strokeRect(x - bw / 2 + 0.5, ky0 + KICK - 10.5, bw - 1, 6); }
      }
    }
    const ty = ky0 + KICK - 4 - (kmin / 9) * kh;
    g.setLineDash([4, 4]); g.strokeStyle = 'rgba(255,194,26,0.6)'; g.beginPath(); g.moveTo(0, ty + 0.5); g.lineTo(W, ty + 0.5); g.stroke(); g.setLineDash([]);
    g.fillStyle = COL.line; g.fillRect(0, ky0, W, 1);
    g.font = '700 9.5px system-ui, sans-serif'; g.fillStyle = COL.tx2; g.fillText('KICKS', 6, ky0 + 12);
    g.fillStyle = COL.line; g.fillRect(0, L.wave[0], W, 1); g.fillRect(0, L.sect[0], W, 1);
    g.fillStyle = COL.line; g.fillRect(0, L.sect[0] + SECT_SPLIT, W, 1);

    // ---------- hover: where the punch / the marker will land ----------
    const hv = hover.current;
    if (hv && !drag.current) {
      const lane = laneAt(hv.y, H);
      const th = t0 + hv.x / pps;
      if (lane === 'kick') {
        const st = Math.round((th - doc.phase) / S);
        const xs = X(doc.phase + st * S);
        g.fillStyle = 'rgba(255,255,255,0.08)';
        g.fillRect(xs - Math.max(3, pxStep / 2), ky0 + 1, Math.max(6, pxStep), KICK - 1);
        const cur = digits[st] ?? 0;
        const v = kickValueAt(hv.y, H);
        const erase = cur > 0 && Math.abs(v - cur) <= 1;
        const hh = (Math.max(1, v) / 9) * kh;
        g.setLineDash([3, 2]); g.strokeStyle = erase ? COL.combo : '#ffffff'; g.lineWidth = 1.5;
        g.strokeRect(xs - Math.max(3, bw / 2), ky0 + KICK - 4 - hh, Math.max(6, bw), hh); g.setLineDash([]);
        g.font = '600 10px ' + getComputedStyle(document.body).getPropertyValue('--mono');
        g.fillStyle = erase ? COL.combo : '#fff';
        g.fillText(`${fmtBBS(doc, doc.phase + st * S)}  ${erase ? 'retirer' : 'force ' + Math.max(1, v)}`, xs + 9, ky0 + 24);
      } else if (lane === 'wave' || lane === 'sect') {
        const unit = lane === 'sect' ? 4 : P.current.snap === 'bar' ? 4 : P.current.snap === 'beat' ? 1 : 0.25;
        const cb = Math.floor(timeBeat(doc, th) / unit) * unit;
        const xa = X(beatTime(doc, cb)), xb = X(beatTime(doc, cb + unit));
        const [ya, yb] = L[lane];
        g.fillStyle = 'rgba(77,163,255,0.1)'; g.fillRect(xa, ya, xb - xa, yb - ya);
        g.fillStyle = 'rgba(77,163,255,0.6)'; g.fillRect(Math.round(X(beatTime(doc, Math.round(timeBeat(doc, th) / unit) * unit))) - 0.5, ya, 1, yb - ya);
      }
    }
    const selR = P.current.selection;
    if (selR) {
      const xa = X(beatTime(doc, selR.a)), xb = X(beatTime(doc, selR.b));
      g.fillStyle = 'rgba(77,163,255,0.14)'; g.fillRect(xa, L.sect[0], xb - xa, H - L.sect[0]);
      g.fillStyle = COL.ui; g.fillRect(xa, L.sect[0], 1, H - L.sect[0]); g.fillRect(xb - 1, L.sect[0], 1, H - L.sect[0]);
      g.font = '700 10px system-ui, sans-serif';
      g.fillText(`SÉLECTION  mes. ${(selR.a / 4 + 1).toFixed(selR.a % 4 ? 2 : 0)} → ${(selR.b / 4 + 1).toFixed(selR.b % 4 ? 2 : 0)}`, xa + 5, L.wave[0] + 13);
    }

    // ---------- anchors ----------
    doc.anchors.forEach((an) => {
      const x = X(an.time);
      if (x < -40 || x > W + 40) return;
      const err = anchorError(doc, an) * 1000;
      const ae = Math.abs(err);
      const col = ae < 4 ? COL.power : ae < 12 ? COL.reward : COL.combo;
      g.fillStyle = col;
      g.fillRect(x - 0.75, wy0, 1.5, wh);
      g.beginPath(); g.moveTo(x, wy0 + 2); g.lineTo(x + 6, wy0 + 9); g.lineTo(x, wy0 + 16); g.lineTo(x - 6, wy0 + 9); g.fill();
      g.font = '600 10px ' + getComputedStyle(document.body).getPropertyValue('--mono');
      const bar = Math.floor(an.beat / 4), bt = ((an.beat % 4) + 4) % 4;
      g.fillText(`${bar + 1}.${bt + 1}  ${err >= 0 ? '+' : ''}${err.toFixed(1)} ms`, x + 9, wy0 + 13);
    });

    // ---------- hover + playhead ----------
    if (hover.current && !drag.current) {
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.fillRect(Math.round(hover.current.x), RULER, 1, H - RULER);
    }
    const xp = X(pos);
    if (xp >= -2 && xp <= W + 2) {
      g.fillStyle = playing ? '#ffffff' : 'rgba(255,255,255,0.75)';
      g.fillRect(Math.round(xp) - 0.5, 0, 1.5, H);
      g.beginPath(); g.moveTo(xp - 6, 0); g.lineTo(xp + 6, 0); g.lineTo(xp, 8); g.fill();
      if (playing) {
        // kick flash in the kick lane at the playhead
        const st = Math.round((pos - doc.phase) / S);
        const d = digits[st] ?? 0;
        if (d >= kmin && Math.abs(doc.phase + st * S - pos) < 0.05) { g.fillStyle = 'rgba(0,255,213,0.25)'; g.fillRect(0, ky0, W, KICK); }
      }
    }
  };

  // ---------- interaction ----------
  const local = (e: React.PointerEvent | React.MouseEvent | WheelEvent) => {
    const r = cv.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, W: r.width, H: r.height };
  };
  const tAt = (x: number) => P.current.view.t0 + x / P.current.view.pps;
  const laneAt = (y: number, H: number) => {
    const L = lanes(H);
    for (const k of ['ruler', 'sect', 'wave', 'kick']) if (y >= L[k][0] && y < L[k][1]) return k;
    return 'kick';
  };

  const hit = (x: number, y: number, H: number) => {
    const { doc } = P.current;
    const X = (t: number) => (t - P.current.view.t0) * P.current.view.pps;
    const lane = laneAt(y, H);
    if (lane === 'ruler' && Math.abs(x - X(beatTime(doc, bossBeat(doc)))) < 10) return { kind: 'boss' as const };
    if (lane === 'ruler') {
      if (Math.abs(x - X(beatTime(doc, doc.start))) < 7 && y < 16) return { kind: 'start' as const };
      if (y >= 16) {
        if (Math.abs(x - X(beatTime(doc, doc.loopStart))) < 6) return { kind: 'loopStart' as const };
        if (Math.abs(x - X(beatTime(doc, doc.loopEnd))) < 6) return { kind: 'loopEnd' as const };
        if (x > X(beatTime(doc, doc.loopStart)) && x < X(beatTime(doc, doc.loopEnd))) return { kind: 'loopMove' as const };
      }
      if (Math.abs(x - X(beatTime(doc, doc.start))) < 5) return { kind: 'start' as const };
      return y < 16 ? { kind: 'zoom' as const } : { kind: 'seek' as const };
    }
    if (lane === 'sect' && y >= lanes(H).sect[0] + SECT_SPLIT) {
      const rs = doc.ramps ?? [];
      for (let i = 0; i < rs.length; i++) {
        const xa = X(barTime(doc, rs[i].from)), xb = X(barTime(doc, rs[i].to));
        if (Math.abs(x - xb) < 6) return { kind: 'rampEdge' as const, index: i, end: 'to' as const };
        if (Math.abs(x - xa) < 6) return { kind: 'rampEdge' as const, index: i, end: 'from' as const };
        if (x > xa && x < xb) return { kind: 'rampBody' as const, index: i };
      }
      return { kind: 'rampEmpty' as const };
    }
    if (lane === 'sect') {
      let best = -1, bd = 8;
      doc.sections.forEach((s, i) => { const d = Math.abs(x - X(barTime(doc, s.bar))); if (d < bd) { bd = d; best = i; } });
      if (best < 0) doc.sections.forEach((s, i) => { const xs = X(barTime(doc, s.bar)); if (x >= xs && x <= xs + 60) best = i; });
      return best >= 0 ? { kind: 'section' as const, index: best } : { kind: 'sectEmpty' as const };
    }
    if (lane === 'wave') {
      let best = -1, bd = 7;
      doc.anchors.forEach((an, i) => { const d = Math.abs(x - X(an.time)); if (d < bd) { bd = d; best = i; } });
      if (best >= 0) return { kind: 'anchor' as const, index: best };
      return { kind: 'wave' as const };
    }
    return { kind: 'kickLane' as const };
  };

  const kickValueAt = (y: number, H: number) => {
    const L = lanes(H);
    const v = (L.kick[1] - 4 - y) / (KICK - 8);
    return Math.max(1, Math.min(9, Math.round(v * 9)));
  };

  const setKick = (st: number, value: number | null) => {
    P.current.update((d) => {
      const kickEdits = { ...d.kickEdits };
      if (value === null) delete kickEdits[st]; else kickEdits[st] = value;
      return { ...d, kickEdits };
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const { x, y, H } = local(e);
    const p = P.current;
    const { doc } = p;
    const t = tAt(x);
    try { cv.current!.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    if (e.button === 1) { drag.current = { kind: 'pan', x0: x, t00: p.view.t0 }; return; }
    const h = hit(x, y, H);
    if (e.button === 2) {
      if (h.kind === 'section') { p.begin(); p.update((d) => ({ ...d, sections: d.sections.filter((_, i) => i !== h.index) })); p.setSelSection(null); }
      else if (h.kind === 'anchor') { p.begin(); p.update((d) => removeAnchor(d, h.index)); }
      else if (h.kind === 'rampBody' || h.kind === 'rampEdge') { p.begin(); p.update((d) => ({ ...d, ramps: d.ramps.filter((_, i) => i !== h.index) })); p.setSelRamp(null); }
      else if (h.kind === 'kickLane') { p.begin(); drag.current = { kind: 'kick', erase: true, reset: false, last: -1 }; paintKick(x, y, H); }
      return;
    }
    switch (h.kind) {
      case 'seek': drag.current = { kind: 'seek' }; p.engine.seek(Math.max(0, t)); break;
      case 'zoom': drag.current = { kind: 'zoom', x0: x, y0: y, tA: t, pps0: p.view.pps, moved: false }; break;
      case 'rampEdge': p.setSelRamp(h.index); p.begin(); drag.current = { kind: 'rampEdge', index: h.index, end: h.end }; break;
      case 'rampBody': { const r = doc.ramps[h.index]; p.setSelRamp(h.index); p.begin(); drag.current = { kind: 'rampMove', index: h.index, grab: Math.round(timeBeat(doc, t) / 4), from: r.from, to: r.to }; break; }
      case 'rampEmpty': p.setSelRamp(null); break;
      case 'start': case 'loopStart': case 'loopEnd': case 'boss': p.begin(); drag.current = { kind: h.kind }; break;
      case 'loopMove': p.begin(); drag.current = { kind: 'loopMove', grab: timeBeat(doc, t), len: doc.loopEnd - doc.loopStart, from: doc.loopStart }; break;
      case 'section': p.setSelSection(h.index); p.begin(); drag.current = { kind: 'section', index: h.index }; break;
      case 'sectEmpty': p.setSelSection(null); break;
      case 'anchor': p.begin(); drag.current = { kind: 'anchor', index: h.index }; break;
      case 'wave':
        if (e.shiftKey) { p.begin(); drag.current = { kind: 'phase', x0: x, phase0: doc.phase }; }
        else drag.current = { kind: 'select', x0: x, a: snapBeats(doc, t, p.snap), moved: false };
        break;
      case 'kickLane':
        p.begin();
        drag.current = { kind: 'kick', erase: e.altKey, reset: e.ctrlKey || e.metaKey, last: -1 };
        paintKick(x, y, H, true);
        break;
    }
  };

  const paintKick = (x: number, y: number, H: number, first = false) => {
    const dr = drag.current;
    if (!dr || dr.kind !== 'kick') return;
    const { doc, digits } = P.current;
    const st = Math.round((tAt(x) - doc.phase) / stepLen(doc));
    if (st < 0 || st >= digits.length || st === dr.last) return;
    dr.last = st;
    if (dr.reset) setKick(st, null);
    else if (dr.erase) setKick(st, 0);
    else if (first && digits[st] >= doc.kickMin && Math.abs(kickValueAt(y, H) - digits[st]) <= 1) { dr.erase = true; setKick(st, 0); }
    else setKick(st, Math.max(doc.kickMin, kickValueAt(y, H)));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const { x, y, H } = local(e);
    hover.current = { x, y };
    const p = P.current;
    const { doc } = p;
    const t = tAt(x);
    const dr = drag.current;
    p.hoverT.current = t;
    const lane = laneAt(y, H);
    const onBoss = lane === 'ruler' && Math.abs(x - (beatTime(doc, bossBeat(doc)) - p.view.t0) * p.view.pps) < 10;
    const laneHint = onBoss ? 'boss : glisser pour déplacer (aimant sur la mesure, Alt : au temps)' : lane === 'ruler' ? (y < 16 ? 'glisser ↕ zoom, ↔ défiler · clic : lecture' : 'boucle : glisser les bords ou le milieu')
      : lane === 'sect' ? (y < lanes(H).sect[0] + SECT_SPLIT ? 'sections : double-clic ajouter, glisser déplacer' : 'montées : double-clic en créer une (4 mesures avant), glisser bords / milieu, clic droit supprimer')
      : lane === 'wave' ? 'glisser : sélection · double-clic : ancre · Maj+glisser : décaler la grille' : 'clic : poser / retirer · glisser : peindre · Alt : effacer · Ctrl : revenir à la détection';
    p.onHint(`${fmtBBS(doc, t)}  ·  ${fmtTime(t)}   —   ${laneHint}`);
    if (!dr) {
      const h = hit(x, y, H);
      const cur = h.kind === 'boss' || h.kind === 'start' || h.kind === 'loopStart' || h.kind === 'loopEnd' || h.kind === 'section' || h.kind === 'anchor' ? 'ew-resize'
        : h.kind === 'rampEdge' ? 'ew-resize' : h.kind === 'loopMove' || h.kind === 'rampBody' ? 'grab' : h.kind === 'zoom' ? 'zoom-in' : h.kind === 'kickLane' ? 'none' : h.kind === 'wave' ? (e.shiftKey ? 'col-resize' : 'text') : 'default';
      cv.current!.style.cursor = cur;
      return;
    }
    const snapB = (tt: number) => snapBeats(doc, tt, e.altKey ? 'step' : p.snap);
    switch (dr.kind) {
      case 'seek': p.engine.seek(Math.max(0, t)); break;
      case 'zoom': {
        if (Math.abs(x - dr.x0) + Math.abs(y - dr.y0) > 3) dr.moved = true;
        if (!dr.moved) break;
        const pps = Math.max(2, Math.min(3000, dr.pps0 * Math.exp((y - dr.y0) * 0.012)));
        p.setView({ pps, t0: Math.max(0, dr.tA - x / pps) });
        break;
      }
      case 'select': {
        if (Math.abs(x - dr.x0) > 4) dr.moved = true;
        if (!dr.moved) break;
        const b = snapBeats(doc, t, p.snap);
        if (b !== dr.a) p.setSelection({ a: Math.max(0, Math.min(dr.a, b)), b: Math.max(dr.a, b) });
        break;
      }
      case 'rampEdge': {
        const bar = Math.max(0, Math.round(timeBeat(doc, t) / 4));
        p.update((d) => ({ ...d, ramps: d.ramps.map((r, i) => (i !== dr.index ? r : dr.end === 'from' ? { ...r, from: Math.min(bar, r.to - 1) } : { ...r, to: Math.max(bar, r.from + 1) })) }));
        break;
      }
      case 'rampMove': {
        const delta = Math.round(timeBeat(doc, t) / 4) - dr.grab;
        const from = Math.max(0, dr.from + delta);
        p.update((d) => ({ ...d, ramps: d.ramps.map((r, i) => (i === dr.index ? { from, to: from + (dr.to - dr.from) } : r)) }));
        break;
      }
      case 'pan': p.setView({ ...p.view, t0: Math.max(0, dr.t00 - (x - dr.x0) / p.view.pps) }); break;
      case 'start': p.update((d) => ({ ...d, start: Math.max(0, snapB(t)) })); break;
      case 'boss': p.update((d) => ({ ...d, boss: Math.max(d.start + 4, snapBeats(doc, t, e.altKey ? 'beat' : 'bar')) })); break;
      case 'loopStart': p.update((d) => ({ ...d, loopStart: Math.min(d.loopEnd - 4, Math.max(0, snapB(t))) })); break;
      case 'loopEnd': p.update((d) => ({ ...d, loopEnd: Math.max(d.loopStart + 4, snapB(t)) })); break;
      case 'loopMove': {
        const unit = p.snap === 'bar' ? 4 : 1;
        const delta = Math.round((timeBeat(doc, t) - dr.grab) / unit) * unit;
        p.update((d) => ({ ...d, loopStart: Math.max(0, dr.from + delta), loopEnd: Math.max(0, dr.from + delta) + dr.len }));
        break;
      }
      case 'section': {
        const bar = Math.max(0, Math.round(timeBeat(doc, t) / 4));
        p.update((d) => ({ ...d, sections: d.sections.map((s, i) => (i === dr.index ? { ...s, bar } : s)) }));
        break;
      }
      case 'anchor': {
        const a = P.current.analysis;
        const tt = e.altKey ? t : snapToOnset(a, t, 0.015);
        p.update((d) => refit({ ...d, anchors: d.anchors.map((an, i) => (i === dr.index ? { ...an, time: tt } : an)) }));
        break;
      }
      case 'phase': p.update((d) => ({ ...d, phase: Math.round((dr.phase0 + (x - dr.x0) / p.view.pps) * 10000) / 10000 })); break;
      case 'kick': paintKick(x, y, H); break;
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const dr = drag.current;
    if (dr && (dr.kind === 'zoom' || dr.kind === 'select') && !dr.moved) {
      const { x } = local(e);
      P.current.engine.seek(Math.max(0, tAt(x)));
      if (dr.kind === 'select') P.current.setSelection(null);
    }
    drag.current = null;
    try { cv.current!.releasePointerCapture(e.pointerId); } catch { /* released */ }
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const { x, y, H } = local(e);
    const p = P.current;
    const { doc } = p;
    const t = tAt(x);
    const lane = laneAt(y, H);
    if (lane === 'sect' && y >= lanes(H).sect[0] + SECT_SPLIT) {
      const to = Math.max(1, Math.round(timeBeat(doc, t) / 4));
      const r = { from: Math.max(0, to - 4), to };
      if ((doc.ramps ?? []).some((x) => x.from < r.to && r.from < x.to)) return;
      p.begin();
      p.update((d) => ({ ...d, ramps: [...(d.ramps ?? []), r] }));
      p.setSelRamp(doc.ramps.length);
    } else if (lane === 'sect') {
      const bar = Math.max(0, Math.round(timeBeat(doc, t) / 4));
      if (doc.sections.some((s) => s.bar === bar)) return;
      p.begin();
      p.update((d) => ({ ...d, sections: [...d.sections, { bar, type: 'drop' }] }));
      p.setSelSection(doc.sections.length);
    } else if (lane === 'wave') {
      // anchor: "this transient is a beat"
      const tt = e.altKey ? t : snapToOnset(p.analysis, t);
      const beat = Math.round(timeBeat(doc, tt));
      p.begin();
      p.update((d) => refit({ ...d, anchors: [...d.anchors.filter((an) => an.beat !== beat), { beat, time: tt }] }));
    } else if (lane === 'ruler') {
      p.engine.seek(beatTime(doc, snapBeats(doc, t, 'bar')));
    }
  };

  useEffect(() => {
    const c = cv.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = P.current;
      const r = c.getBoundingClientRect();
      const x = e.clientX - r.left;
      if (e.ctrlKey || e.metaKey) {
        const t = p.view.t0 + x / p.view.pps;
        const pps = Math.max(2, Math.min(3000, p.view.pps * Math.exp(-e.deltaY * 0.0022)));
        p.setView({ pps, t0: Math.max(0, t - x / pps) });
      } else {
        const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        p.setView({ ...p.view, t0: Math.max(0, p.view.t0 + d / p.view.pps) });
      }
    };
    c.addEventListener('wheel', onWheel, { passive: false });
    return () => c.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div className="timeline" ref={host}>
      <canvas ref={cv}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onPointerLeave={() => { hover.current = null; P.current.hoverT.current = null; }}
        onDoubleClick={onDoubleClick} onContextMenu={(e) => e.preventDefault()} />
    </div>
  );
};

// Little skull: bone head, dark eyes, jaw teeth, orange outline.
const skull = (g: CanvasRenderingContext2D, x: number, y: number, a: number) => {
  g.save();
  g.globalAlpha = a;
  g.lineWidth = 2; g.strokeStyle = '#ff5a1a'; g.fillStyle = '#e8fbff';
  g.beginPath(); g.arc(x, y - 1, 7, Math.PI * 0.85, Math.PI * 2.15); g.lineTo(x + 4.5, y + 7.5); g.lineTo(x - 4.5, y + 7.5); g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = '#01060a';
  g.beginPath(); g.ellipse(x - 2.8, y - 0.5, 2, 2.4, 0, 0, Math.PI * 2); g.ellipse(x + 2.8, y - 0.5, 2, 2.4, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(x, y + 2); g.lineTo(x - 1.2, y + 4); g.lineTo(x + 1.2, y + 4); g.closePath(); g.fill();
  g.fillRect(x - 2.6, y + 5.6, 1, 1.9); g.fillRect(x - 0.5, y + 5.6, 1, 1.9); g.fillRect(x + 1.6, y + 5.6, 1, 1.9);
  g.restore();
};

export const refit = (d: TrackDoc): TrackDoc => {
  const f = fitAnchors(d.anchors, d.bpm);
  if (!f) return d;
  return { ...d, bpm: Math.round(f.bpm * 1000) / 1000, phase: Math.round(f.phase * 10000) / 10000 };
};

export const removeAnchor = (d: TrackDoc, i: number) => refit({ ...d, anchors: d.anchors.filter((_, k) => k !== i) });

// ---------- overview (whole song) ----------
export const Overview: React.FC<{ doc: TrackDoc; analysis: Analysis; engine: Engine; view: View; setView: (v: View) => void; width: () => number }> = (props) => {
  const host = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const P = useRef(props);
  P.current = props;
  const cache = useRef<{ key: string; img: HTMLCanvasElement | null }>({ key: '', img: null });

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const c = cv.current, h = host.current;
      if (!c || !h) return;
      const dpr = window.devicePixelRatio || 1;
      const W = h.clientWidth, H = h.clientHeight;
      if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      const g = c.getContext('2d')!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const { doc, analysis: a, engine, view } = P.current;
      const pps = W / a.duration;
      const X = (t: number) => t * pps;
      const key = `${W}x${H}:${a.duration}`;
      if (cache.current.key !== key) {
        const img = document.createElement('canvas');
        img.width = Math.round(W * dpr); img.height = Math.round(H * dpr);
        const gi = img.getContext('2d')!;
        gi.setTransform(dpr, 0, 0, dpr, 0, 0);
        const mid = (H - 6) / 2, amp = (mid - 3) / a.maxPeak;
        for (let x = 0; x < W; x++) {
          const b0 = Math.floor((x / pps) / a.bucketSec), b1 = Math.max(b0 + 1, Math.floor(((x + 1) / pps) / a.bucketSec));
          let pk = 0, lo = 0, hi = 0;
          for (let b = b0; b < Math.min(b1, a.peak.length); b++) { pk = Math.max(pk, a.peak[b]); lo += a.low[b]; hi += a.high[b] + a.mid[b]; }
          const k = lo / (lo + hi + 1e-9);
          gi.fillStyle = `rgb(${(43 * k + 120 * (1 - k)) | 0},${(123 * k + 200 * (1 - k)) | 0},${(255 * k + 210 * (1 - k)) | 0})`;
          gi.fillRect(x, mid - pk * amp, 1, pk * amp * 2);
        }
        cache.current = { key, img };
      }
      g.fillStyle = '#15181d'; g.fillRect(0, 0, W, H);
      g.globalAlpha = 0.75; g.drawImage(cache.current.img!, 0, 0, W, H); g.globalAlpha = 1;
      // sections strip
      const secs = [...doc.sections].sort((p, q) => p.bar - q.bar);
      secs.forEach((s, k) => {
        const xa = X(barTime(doc, s.bar)), xb = k + 1 < secs.length ? X(barTime(doc, secs[k + 1].bar)) : W;
        g.fillStyle = SEC_COL[s.type]; g.globalAlpha = s.type === 'normal' ? 0.35 : 0.9;
        g.fillRect(xa, H - 5, xb - xa, 4);
      });
      g.globalAlpha = 1;
      const xl0 = X(beatTime(doc, doc.loopStart)), xl1 = X(beatTime(doc, doc.loopEnd));
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.fillRect(0, 0, Math.max(0, X(beatTime(doc, doc.start))), H - 6);
      g.fillRect(xl1, 0, Math.max(0, W - xl1), H - 6);
      g.fillStyle = COL.reward; g.fillRect(xl0, 0, xl1 - xl0, 2);
      // viewport
      const vw = P.current.width() / view.pps;
      g.strokeStyle = 'rgba(77,163,255,0.95)'; g.lineWidth = 1.5;
      g.fillStyle = 'rgba(77,163,255,0.12)';
      g.fillRect(X(view.t0), 1, vw * pps, H - 2);
      g.strokeRect(X(view.t0) + 0.75, 1, Math.max(2, vw * pps - 1.5), H - 2);
      g.fillStyle = '#fff'; g.fillRect(Math.round(X(engine.position())), 0, 1.5, H);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const jump = (e: React.PointerEvent) => {
    const r = cv.current!.getBoundingClientRect();
    const { analysis: a, view } = P.current;
    const t = ((e.clientX - r.left) / r.width) * a.duration;
    const vw = P.current.width() / view.pps;
    P.current.setView({ ...view, t0: Math.max(0, t - vw / 2) });
  };

  return (
    <div className="overview" ref={host}>
      <canvas ref={cv} onPointerDown={(e) => { cv.current!.setPointerCapture(e.pointerId); jump(e); }} onPointerMove={(e) => { if (e.buttons & 1) jump(e); }} />
    </div>
  );
};
