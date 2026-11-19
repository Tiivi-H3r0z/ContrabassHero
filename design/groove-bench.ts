// Bible: playable Groove bench. Uses the real rhythm engine (game/systems/groove.ts) on the real music.
import { Groove, COMBOS, SPECIALS, TIERS, TIER_POWER, GROOVE_MAX, patternOf, Sym, Family, ComboDef, GrooveEvent } from '../game/systems/groove';
import { music } from '../game/audio/music';
import { audio } from '../game/audio/audio';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const INK = '#01060a', BONE = '#e8fbff', POWER = '#00ffd5', UI = '#4da3ff', COMBO = '#ff3d8b', REWARD = '#ffc21a', FOG = '#86aebf';
const FAM_COL: Record<Family, string> = { base: POWER, eclair: UI, colosse: COMBO, virtuose: REWARD };
const FAM_NAME: Record<Family, string> = { base: 'Base', eclair: 'Éclair', colosse: 'Colosse', virtuose: 'Virtuose' };
const SYM_COL: Record<Sym, string> = { f: POWER, F: COMBO, D: UI };
const TIER_COL = [FOG, POWER, UI, COMBO, REWARD, REWARD];

const SOURCES = [
  { id: 'n1', label: 'Niveau 1 · 175', kind: 'stage' as const, stage: 1 },
  { id: 'b1', label: 'Boss 1 · 150', kind: 'boss' as const, stage: 1 },
  { id: 'm100', label: 'Métronome 100', bpm: 100 },
  { id: 'm130', label: 'Métronome 130', bpm: 130 },
];
const TOLS = [{ label: 'Facile', v: 1.3 }, { label: 'Normal', v: 1 }, { label: 'Carnage', v: 0.75 }];

let src = SOURCES[0];
let tol = TOLS[0];
let groove = new Groove(tol.v);
let playing = false;
let ghost: ComboDef | null = null;
let ghostStart: number | null = null;
interface Hit { sym: Sym; t: number; step: number | null; grade: string | null; born: number }
const hits: Hit[] = [];
let shake = 0;
let flash = 0;
let flashCol = POWER;
let lastBeat = -1;
let beatPulse = 0;

// ---------- metronome (own clock) ----------
let mctx: AudioContext | null = null;
let mStart = 0;
let mTimer = 0;
let mNext = 0;
const offsetSec = () => { try { return (parseFloat(localStorage.getItem('ch-fx-offset-ms') ?? '0') || 0) / 1000; } catch { return 0; } };
const startMetronome = (bpm: number) => {
  mctx = mctx ?? new AudioContext();
  if (mctx.state === 'suspended') mctx.resume();
  mStart = mctx.currentTime + 0.1;
  mNext = 0;
  clearInterval(mTimer);
  mTimer = window.setInterval(() => {
    const c = mctx!;
    while (mStart + 0.5 + mNext * (60 / bpm) < c.currentTime + 0.12) {
      const at = mStart + 0.5 + mNext * (60 / bpm);
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'square'; o.frequency.value = mNext % 4 === 0 ? 1760 : 1175;
      g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(mNext % 4 === 0 ? 0.3 : 0.18, at + 0.001); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
      o.connect(g).connect(c.destination); o.start(at); o.stop(at + 0.06);
      mNext++;
    }
  }, 25);
};
const stopMetronome = () => { clearInterval(mTimer); mctx?.suspend(); };

const clock = (): { t: number; bpm: number; phase: number } | null => {
  if (!playing) return null;
  if ('bpm' in src) {
    if (!mctx) return null;
    const lat = (mctx as AudioContext & { outputLatency?: number }).outputLatency || mctx.baseLatency || 0;
    return { t: mctx.currentTime - mStart - lat - offsetSec(), bpm: src.bpm, phase: 0.5 };
  }
  return music.clock();
};

const start = () => {
  audio.init();
  music.init();
  music.setIntensity(4);
  groove = new Groove(tol.v);
  hits.length = 0;
  ghostStart = null;
  playing = true;
  if ('bpm' in src) { music.stop(0.2); startMetronome(src.bpm); }
  else { stopMetronome(); music.play(src.kind, src.stage); }
  $('#gbHelp').style.display = 'none';
  $('#gbPlay').innerHTML = '<span>■ STOP</span>';
};
const stop = () => {
  playing = false;
  music.stop(0.3);
  stopMetronome();
  $('#gbPlay').innerHTML = '<span>▶ JOUER</span>';
};

// ---------- controls ----------
const seg = (host: HTMLElement, items: { label: string }[], cur: () => { label: string }, pick: (i: number) => void) => {
  const render = () => { host.innerHTML = ''; items.forEach((it, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = it.label; if (it === cur()) b.className = 'on'; b.onclick = () => { pick(i); render(); }; host.appendChild(b); }); };
  render();
};
seg($('#gbSrc'), SOURCES, () => src, (i) => { src = SOURCES[i]; if (playing) start(); });
seg($('#gbTol'), TOLS, () => tol, (i) => { tol = TOLS[i]; groove.tolerance = tol.v; });
$('#gbPlay').addEventListener('click', () => (playing ? stop() : start()));

// ---------- pops ----------
const pops = $('#gbPops');
const pop = (text: string, color: string, sub = '', goth = false) => {
  const el = document.createElement('div');
  el.className = 'gb-pop' + (goth ? ' goth' : '');
  el.style.color = color;
  el.innerHTML = text + (sub ? `<small>${sub}</small>` : '');
  pops.appendChild(el);
  setTimeout(() => el.remove(), 1150);
};

const handle = (events: GrooveEvent[]) => {
  for (const e of events) {
    if (e.kind === 'cycle') {
      const c = e.motif.combo;
      if (e.fresh) {
        if (c) pop(c.name.toUpperCase(), FAM_COL[c.family], `+${e.gain.toFixed(1)} groove`);
        else if (e.motif.complexity >= 2) pop('MOTIF LIBRE', BONE, `complexité ${e.motif.complexity.toFixed(1)}`);
        flash = Math.max(flash, 0.35); flashCol = c ? FAM_COL[c.family] : BONE;
      } else flash = Math.max(flash, 0.12);
    } else if (e.kind === 'variation') {
      pop('VARIATION !', REWARD, `+${e.gain.toFixed(1)}`);
    } else if (e.kind === 'special') {
      const s = SPECIALS[e.id];
      pop(s.name, FAM_COL[s.family], s.effect.split(':')[0], true);
      shake = Math.max(shake, 16); flash = 0.8; flashCol = FAM_COL[s.family];
    } else if (e.kind === 'tier') {
      if (e.up) { pop(TIERS[e.tier].name, TIER_COL[e.tier], `puissance ×${TIER_POWER[e.tier]}`, true); shake = Math.max(shake, 10 + e.tier * 3); flash = 0.6; flashCol = TIER_COL[e.tier]; }
    }
  }
};

// ---------- calibration: tap on the clicks, the median error becomes the sync offset (bench + game + studio) ----------
const CAL_TAPS = 10;
let cal: { taps: number[]; box: HTMLElement } | null = null;
const setOffsetMs = (ms: number) => { try { localStorage.setItem('ch-fx-offset-ms', String(Math.round(ms))); } catch { /* private mode */ } music.refreshSync(); showCal(); };
const showCal = () => { const v = Math.round(offsetSec() * 1000); $('#gbCalV').textContent = v ? `${v > 0 ? '+' : ''}${v} ms` : 'non calé'; };
showCal();
const calBox = () => {
  const box = document.createElement('div');
  box.className = 'gb-calbox';
  $('#gbStage').appendChild(box);
  return box;
};
const renderCal = () => {
  if (!cal) return;
  cal.box.innerHTML = `<div><b>Calage</b>Tape <span class="kbd">ESPACE</span> pile sur chaque clic que tu entends.<div class="dots">${Array.from({ length: CAL_TAPS }, (_, i) => `<i class="${i < cal!.taps.length ? 'on' : ''}"></i>`).join('')}</div></div>`;
};
const startCal = () => {
  stop();
  src = SOURCES[3];
  seg($('#gbSrc'), SOURCES, () => src, (i) => { src = SOURCES[i]; if (playing) start(); });
  start();
  cal = { taps: [], box: calBox() };
  renderCal();
};
const calTap = () => {
  const c = clock();
  if (!c || !cal) return;
  const B = 60 / c.bpm;
  const k = Math.round((c.t - c.phase) / B);
  if (k < 1) return;
  cal.taps.push(c.t - (c.phase + k * B));
  renderCal();
  if (cal.taps.length < CAL_TAPS) return;
  const errs = cal.taps.slice(2).sort((a, b) => a - b);
  const med = errs[Math.floor(errs.length / 2)];
  const spread = errs[errs.length - 2] - errs[1];
  const before = offsetSec() * 1000;
  setOffsetMs(before + med * 1000);
  cal.box.innerHTML = `<div><b>${med >= 0 ? '+' : ''}${Math.round(med * 1000)} ms</b>Tes frappes arrivaient ${Math.abs(med) < 0.015 ? 'pile sur le temps' : med > 0 ? 'après le temps' : 'avant le temps'}. Calage réglé à ${Math.round(before + med * 1000)} ms (banc, jeu et studio).${spread > 0.09 ? '<br>Frappes assez irrégulières : refais le calage pour confirmer.' : ''}</div>`;
  const box = cal.box;
  cal = null;
  setTimeout(() => { box.remove(); groove.reset(); hits.length = 0; }, 2600);
};
$('#gbCal').addEventListener('click', startCal);

const press = (sym: Sym) => {
  if (!playing) return;
  if (cal) { calTap(); return; }
  const c = clock();
  if (!c) return;
  const r = groove.input(sym, c.t, c.bpm, c.phase);
  hits.push({ sym, t: c.t, step: r.note ? r.note.step : null, grade: r.note ? r.note.grade : null, born: performance.now() });
  if (hits.length > 200) hits.shift();
  audio.play(sym === 'F' ? 'hitHeavy' : sym === 'D' ? 'dash' : 'hit', { volume: r.inRhythm ? 0.55 : 0.3, pitch: r.inRhythm ? 1 : 0.85 });
  handle(r.events);
};

const KEYS: Record<string, Sym> = { Space: 'f', KeyF: 'F', ShiftLeft: 'D', ShiftRight: 'D' };
window.addEventListener('keydown', (e) => {
  const s = KEYS[e.code];
  if (!s || !playing || e.repeat) return;
  const tag = (e.target as HTMLElement | null)?.tagName ?? '';
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  e.preventDefault();
  press(s);
});
document.querySelectorAll<HTMLButtonElement>('.gb-pads button').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!playing) start(); press(b.dataset.sym as Sym); }));

// ---------- side panel ----------
const gauge = $('#gbGauge');
TIERS.slice(1).forEach((t) => { const b = document.createElement('b'); b.style.left = (t.at / GROOVE_MAX) * 100 + '%'; gauge.appendChild(b); });
const famHost = $('#gbFam');
const famBars = (['eclair', 'colosse', 'virtuose'] as Family[]).map((f) => {
  const row = document.createElement('div');
  row.innerHTML = `<b style="color:${FAM_COL[f]}">${FAM_NAME[f]}</b><span><i style="background:${FAM_COL[f]}"></i></span>`;
  famHost.appendChild(row);
  return { f, row, bar: row.querySelector('i') as HTMLElement };
});

const renderPat = (host: HTMLElement, pattern: string, cells = 16) => {
  host.innerHTML = '';
  const n = Math.max(cells, pattern.length);
  host.style.gridTemplateColumns = `repeat(${n}, minmax(0, 1fr))`;
  for (let i = 0; i < n; i++) {
    const ch = pattern[i % pattern.length];
    const el = document.createElement('i');
    el.className = (ch !== '.' ? ch : '') + (i % 4 === 0 ? ' b' : '') + (i > 0 && i % pattern.length === 0 ? ' loop' : '');
    el.textContent = ch === '.' ? '' : ch === 'D' ? '»' : ch;
    host.appendChild(el);
  }
};

let lastMotifKey = '';
const updateSide = () => {
  (gauge.firstElementChild as HTMLElement).style.width = (groove.value / GROOVE_MAX) * 100 + '%';
  const tn = $('#gbTier');
  tn.textContent = TIERS[groove.tier].name;
  tn.style.color = TIER_COL[groove.tier];
  $('#gbPower').innerHTML = `Puissance <b>×${groove.power().toFixed(2)}</b> · groove ${groove.value.toFixed(0)}`;
  const dom = groove.dominantFamily();
  const max = Math.max(6, ...famBars.map((x) => groove.family[x.f]));
  famBars.forEach((x) => { x.bar.style.width = Math.min(100, (groove.family[x.f] / max) * 100) + '%'; x.row.className = x.f === dom ? 'dom' : ''; });
  const m = groove.motif;
  const key = m ? m.key + m.reps : '';
  if (key !== lastMotifKey) {
    lastMotifKey = key;
    $('#gbMotif').textContent = m ? (m.combo ? m.combo.name : 'Motif libre') : '—';
    $('#gbMotif').style.color = m?.combo ? FAM_COL[m.combo.family] : BONE;
    $('#gbMeta').textContent = m ? `${m.syms.length} notes · ${m.length} doubles-croches · complexité ${m.complexity.toFixed(1)} · ×${m.reps}` : 'Aucun motif répété.';
    if (m) renderPat($('#gbPat'), patternOf(m)); else $('#gbPat').innerHTML = '';
  }
};

// ---------- catalogue ----------
const cat = $('#gbCombos');
const trainBtns: HTMLButtonElement[] = [];
for (const c of COMBOS) {
  const card = document.createElement('div');
  card.className = 'panel cmb-card';
  card.style.borderTop = `6px solid ${FAM_COL[c.family]}`;
  const cycle = c.pattern.length;
  const cycleTxt = cycle % 16 === 0 ? `${cycle / 16} mesure${cycle > 16 ? 's' : ''}` : cycle % 4 === 0 ? `${cycle / 4} temps` : `${cycle} double${cycle > 1 ? 's' : ''}-croche${cycle > 1 ? 's' : ''}`;
  card.innerHTML = `<span class="fam" style="background:${FAM_COL[c.family]}">${FAM_NAME[c.family]}</span><h3>${c.name}</h3><div class="pat"></div><p style="font-family:var(--f-ui);font-size:12px">cycle : ${cycleTxt}${c.offbeat ? ' · à contretemps' : ''}${16 % cycle !== 0 && cycle < 32 ? ' · glisse sur la mesure' : ''}</p><p><b>Effet :</b> ${c.effect}</p><p><b>Visuel :</b> ${c.look}</p>`;
  renderPat(card.querySelector('.pat') as HTMLElement, c.pattern);
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'train'; b.textContent = "S'entraîner";
  b.onclick = () => {
    ghost = ghost === c ? null : c; ghostStart = null;
    trainBtns.forEach((x) => x.classList.toggle('on', x === b && ghost === c));
    if (ghost) { $('#gb').scrollIntoView({ behavior: 'smooth', block: 'center' }); if (!playing) start(); }
  };
  trainBtns.push(b);
  card.appendChild(b);
  cat.appendChild(card);
}
for (const s of Object.values(SPECIALS)) {
  const card = document.createElement('div');
  card.className = 'panel cmb-card';
  card.style.borderTop = `6px solid ${FAM_COL[s.family]}`;
  card.innerHTML = `<span class="fam" style="background:${FAM_COL[s.family]}">Spécial</span><h3>${s.name}</h3><p><b>Comment :</b> ${s.how}</p><p><b>Effet :</b> ${s.effect}</p>`;
  cat.appendChild(card);
}

// ---------- canvas ----------
const cv = $<HTMLCanvasElement>('#gbCanvas');
const stage = $('#gbStage');
const g = cv.getContext('2d')!;
const ROWS: Sym[] = ['F', 'f', 'D'];
const ROW_NAME: Record<Sym, string> = { F: 'FORT', f: 'FAIBLE', D: 'DASH' };

const COMPOSERS = [
  { name: 'Bach', tier: 1, hair: 'wig' },
  { name: 'Vivaldi', tier: 2, hair: 'red' },
  { name: 'Mozart', tier: 2, hair: 'tail' },
  { name: 'Beethoven', tier: 3, hair: 'wild' },
  { name: 'Chopin', tier: 4, hair: 'side' },
  { name: 'Wagner', tier: 5, hair: 'beret' },
];

const glyph = (sym: Sym, x: number, y: number, r: number, fill: string | null, stroke: string, lw = 3) => {
  g.beginPath();
  if (sym === 'F') { g.moveTo(x, y - r * 1.25); g.lineTo(x + r * 1.25, y); g.lineTo(x, y + r * 1.25); g.lineTo(x - r * 1.25, y); g.closePath(); }
  else if (sym === 'D') { g.moveTo(x - r, y - r); g.lineTo(x + r * 1.1, y); g.lineTo(x - r, y + r); g.lineTo(x - r * 0.35, y); g.closePath(); }
  else g.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  g.lineWidth = lw; g.strokeStyle = stroke; g.stroke();
};

const ghostComposer = (x: number, y: number, s: number, hair: string, beatK: number, tier: number, i: number) => {
  const bob = Math.sin(beatK * Math.PI) * (3 + tier * 2.5) * s;
  const head = tier >= 3 ? Math.sin(beatK * Math.PI * 2 + i) * 0.25 : 0;
  y -= bob;
  g.save();
  g.translate(x, y);
  g.globalAlpha = 0.85;
  // body (ghost tail)
  const grd = g.createLinearGradient(0, -40 * s, 0, 40 * s);
  grd.addColorStop(0, 'rgba(160,240,255,0.55)'); grd.addColorStop(1, 'rgba(160,240,255,0)');
  g.fillStyle = grd;
  g.beginPath(); g.moveTo(-20 * s, -10 * s); g.quadraticCurveTo(-26 * s, 30 * s, -10 * s, 42 * s); g.lineTo(10 * s, 42 * s); g.quadraticCurveTo(26 * s, 30 * s, 20 * s, -10 * s); g.closePath(); g.fill();
  // arms up from Virtuose
  if (tier >= 3) {
    g.strokeStyle = 'rgba(200,250,255,0.75)'; g.lineWidth = 5 * s; g.lineCap = 'round';
    const wave = Math.sin(beatK * Math.PI * 2) * 6 * s;
    g.beginPath(); g.moveTo(-16 * s, 0); g.lineTo(-28 * s, -34 * s + wave); g.moveTo(16 * s, 0); g.lineTo(28 * s, -34 * s - wave); g.stroke();
  }
  g.rotate(head);
  g.fillStyle = 'rgba(225,252,255,0.95)';
  g.beginPath(); g.arc(0, -22 * s, 15 * s, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(232,251,255,0.9)';
  if (hair === 'wig') { for (const d of [-1, 1]) for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(d * 15 * s, (-26 + k * 8) * s, 6 * s, 0, Math.PI * 2); g.fill(); } }
  else if (hair === 'red') { g.fillStyle = 'rgba(255,120,90,0.85)'; g.beginPath(); g.ellipse(0, -32 * s, 17 * s, 8 * s, 0, 0, Math.PI * 2); g.fill(); }
  else if (hair === 'tail') { g.beginPath(); g.ellipse(0, -33 * s, 15 * s, 6 * s, 0, 0, Math.PI * 2); g.fill(); g.fillRect(12 * s, -24 * s, 6 * s, 14 * s); }
  else if (hair === 'wild') { for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(k * 5 * s, -32 * s); g.lineTo(k * 9 * s, -48 * s); g.lineTo((k + 1) * 5 * s, -32 * s); g.fill(); } }
  else if (hair === 'side') { g.beginPath(); g.ellipse(-5 * s, -33 * s, 16 * s, 7 * s, -0.3, 0, Math.PI * 2); g.fill(); }
  else if (hair === 'beret') { g.fillStyle = 'rgba(40,50,70,0.95)'; g.beginPath(); g.ellipse(0, -35 * s, 18 * s, 7 * s, 0.1, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = INK;
  g.beginPath(); g.arc(-5 * s, -22 * s, 2.4 * s, 0, Math.PI * 2); g.arc(5 * s, -22 * s, 2.4 * s, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(0, -14 * s, 4 * s, tier >= 2 ? 4 * s : 1.5 * s, 0, 0, Math.PI * 2); g.fill();
  g.restore();
};

let last = performance.now();
const frame = (now: number) => {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const dpr = window.devicePixelRatio || 1;
  const W = stage.clientWidth, H = stage.clientHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const c = clock();
  if (c) handle(groove.update(dt, c.t, 60 / c.bpm));
  shake *= Math.pow(0.002, dt);
  flash *= Math.pow(0.02, dt);
  beatPulse *= Math.pow(0.004, dt);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  g.save();
  if (shake > 0.3) g.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

  // tier glow
  const tc = TIER_COL[groove.tier];
  const glow = g.createRadialGradient(W / 2, H, 10, W / 2, H, H * 1.1);
  glow.addColorStop(0, tc + (groove.tier ? '55' : '18')); glow.addColorStop(1, 'transparent');
  g.fillStyle = glow; g.fillRect(-20, -20, W + 40, H + 40);

  const bpm = c?.bpm ?? ('bpm' in src ? src.bpm : 120);
  const phase = c?.phase ?? 0;
  const S = 15 / bpm, B = 4 * S, BAR = 16 * S;
  const t = c?.t ?? 0;
  const px = W * 0.72;
  const pps = px / (2 * BAR);
  const X = (tt: number) => px + (tt - t) * pps;
  const top = 40, laneH = (H - top - 120) / 3;
  const rowY = (s: Sym) => top + ROWS.indexOf(s) * laneH + laneH / 2;

  // beat flash
  const beatNow = Math.floor((t - phase) / B);
  if (c && beatNow !== lastBeat) { lastBeat = beatNow; beatPulse = beatNow % 4 === 0 ? 1 : 0.6; }

  // lanes
  ROWS.forEach((s, i) => {
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.12)';
    g.fillRect(0, top + i * laneH, W, laneH);
    g.font = '700 11px "Chakra Petch", sans-serif'; g.fillStyle = SYM_COL[s]; g.globalAlpha = 0.7;
    g.fillText(ROW_NAME[s], 10, top + i * laneH + 16); g.globalAlpha = 1;
  });
  // grid
  const s0 = Math.floor((t - px / pps - phase) / S), s1 = Math.ceil((t + (W - px) / pps - phase) / S);
  for (let st = s0; st <= s1; st++) {
    const x = Math.round(X(phase + st * S)) + 0.5;
    const bar = st % 16 === 0, beat = st % 4 === 0;
    g.fillStyle = bar ? 'rgba(232,251,255,0.35)' : beat ? 'rgba(232,251,255,0.14)' : 'rgba(232,251,255,0.05)';
    g.fillRect(x - 0.5, top, bar ? 2 : 1, laneH * 3);
    if (bar) { g.font = '700 12px "Chakra Petch", sans-serif'; g.fillStyle = FOG; g.fillText(String(Math.floor(st / 16) + 1), x + 4, top - 8); }
  }

  // ghost target (training)
  if (ghost && c) {
    if (ghostStart === null) ghostStart = (Math.floor((t - phase) / BAR) + 1) * 16;
    const L = ghost.pattern.length;
    for (let st = Math.max(s0, ghostStart); st <= s1; st++) {
      const ch = ghost.pattern[(st - ghostStart) % L];
      if (ch === '.') continue;
      const x = X(phase + st * S);
      g.globalAlpha = x > px ? 0.8 : 0.25;
      glyph(ch as Sym, x, rowY(ch as Sym), 11, null, SYM_COL[ch as Sym], 2);
      g.globalAlpha = 1;
    }
    g.font = '700 12px "Chakra Petch", sans-serif'; g.fillStyle = FAM_COL[ghost.family];
    g.fillText(`ENTRAÎNEMENT · ${ghost.name.toUpperCase()}`, 10, H - 112);
  }

  // current motif bracket
  const m = groove.motif;
  if (m && groove.chain.length >= m.syms.length) {
    const first = groove.chain[groove.chain.length - m.syms.length];
    const xa = X(phase + first.step * S) - 14, xb = X(phase + (first.step + m.length) * S) - 6;
    const col = m.combo ? FAM_COL[m.combo.family] : BONE;
    g.strokeStyle = col; g.lineWidth = 2; g.globalAlpha = 0.85;
    g.strokeRect(xa, top + 4, xb - xa, laneH * 3 - 8);
    g.globalAlpha = 0.1; g.fillStyle = col; g.fillRect(xa, top + 4, xb - xa, laneH * 3 - 8); g.globalAlpha = 1;
    g.font = '400 20px "Luckiest Guy", sans-serif'; g.fillStyle = col;
    g.fillText((m.combo ? m.combo.name : 'Motif libre') + `  ×${m.reps}`, xa + 2, top - 10 > 14 ? top - 10 : 16);
  }

  // hits
  for (const h of hits) {
    const age = (now - h.born) / 1000;
    if (h.step === null) {
      const x = X(h.t), y = rowY(h.sym);
      if (x < -20) continue;
      g.strokeStyle = 'rgba(134,174,191,0.5)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x - 6, y - 6); g.lineTo(x + 6, y + 6); g.moveTo(x + 6, y - 6); g.lineTo(x - 6, y + 6); g.stroke();
      continue;
    }
    const x = X(phase + h.step * S), y = rowY(h.sym);
    if (x < -20) continue;
    const k = Math.max(0, 1 - age * 4);
    const r = 11 + k * 8;
    glyph(h.sym, x, y, r, SYM_COL[h.sym], INK, 3);
    if (h.grade === 'parfait') { g.strokeStyle = 'rgba(255,255,255,' + (0.35 + k * 0.6) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r + 6 + k * 10, 0, Math.PI * 2); g.stroke(); }
    // timing tick: where the press really was
    const tx = X(h.t);
    g.fillStyle = 'rgba(232,251,255,0.5)'; g.fillRect(tx - 0.5, y + 17, 1, 6);
    if (k > 0 && h.grade) { g.font = '700 11px "Chakra Petch", sans-serif'; g.fillStyle = h.grade === 'parfait' ? REWARD : h.grade === 'bien' ? POWER : FOG; g.globalAlpha = k; g.fillText(h.grade.toUpperCase(), x - 18, y - 22 - (1 - k) * 10); g.globalAlpha = 1; }
  }

  // playhead
  g.fillStyle = 'rgba(255,255,255,' + (0.55 + beatPulse * 0.45) + ')';
  g.fillRect(px - 1, top - 4, 3, laneH * 3 + 8);
  g.shadowColor = tc; g.shadowBlur = 18 * beatPulse;
  g.fillRect(px - 1, top - 4, 3, laneH * 3 + 8);
  g.shadowBlur = 0;

  // the stands: composer ghosts join tier by tier, bouncing on the beat
  const beatK = c ? (((t - phase) / B) % 1 + 1) % 1 : 0;
  const seen = COMPOSERS.filter((x) => groove.tier >= x.tier);
  const sc = Math.min(1.2, H / 380);
  seen.forEach((cp, i) => {
    const x = W * (0.1 + (0.8 * (i + 0.5)) / COMPOSERS.length);
    ghostComposer(x, H - 46 * sc, sc, cp.hair, 1 - beatK, groove.tier, i);
    g.font = '700 10px "Chakra Petch", sans-serif'; g.fillStyle = 'rgba(160,240,255,0.7)'; g.textAlign = 'center';
    g.fillText(cp.name.toUpperCase(), x, H - 4); g.textAlign = 'left';
  });
  if (!seen.length && c) { g.font = '700 12px "Chakra Petch", sans-serif'; g.fillStyle = 'rgba(134,174,191,0.5)'; g.textAlign = 'center'; g.fillText('TRIBUNES VIDES · monte au palier Rythmé', W / 2, H - 30); g.textAlign = 'left'; }

  g.restore();
  if (flash > 0.02) { g.fillStyle = flashCol; g.globalAlpha = flash * 0.35; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  updateSide();
};
requestAnimationFrame(frame);

// ?shot=groove&gbdemo=1 plays a scripted groove (headless screenshots)
if (new URLSearchParams(location.search).has('gbdemo')) {
  for (let i = 0; i < 40; i++) groove.input('D fF'.replace(' ', '')[i % 3] as Sym, 0.5 + i * 0.4, 150, 0.5);
}
(window as unknown as { __gb?: unknown }).__gb = { press, clock, get groove() { return groove; }, start };
