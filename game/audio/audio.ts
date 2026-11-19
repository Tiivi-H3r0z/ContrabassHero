export type Sfx =
  | 'swing' | 'swingHeavy' | 'hit' | 'hitHeavy' | 'crit' | 'kill' | 'out' | 'dash' | 'jump' | 'land' | 'smash'
  | 'hurt' | 'stringSnap' | 'heal' | 'pickup' | 'charge' | 'specialReady' | 'block' | 'shieldHit'
  | 'special_armand' | 'special_adrien' | 'special_eliot' | 'special_swan' | 'special_pierre' | 'special_audrey'
  | 'nukeAlarm' | 'explosion' | 'fart' | 'meow' | 'roar' | 'cluck' | 'egg'
  | 'chalkThrow' | 'whistle' | 'teacherDie' | 'spawn' | 'portal'
  | 'tap' | 'bossRoar' | 'bossGrunt' | 'bossCharge' | 'bossLand' | 'bossDie' | 'telegraph' | 'lightning' | 'dig' | 'shellRoll' | 'hiss' | 'screech' | 'helicopter'
  | 'eventSiren' | 'blackout' | 'uiMove' | 'uiSelect' | 'uiBack' | 'typewriter' | 'comboUp' | 'stageClear' | 'gameOver' | 'victory';

export type MusicTrack = 'menu' | 'stage' | 'boss' | 'victory' | 'gameover';

// ---------- core state ----------

const EPS = 0.0001;
const MAX_VOICES = 24;
const SAME_SFX_MAX = 3;
const SAME_SFX_WINDOW = 0.06;
const LOOKAHEAD = 0.1;
const TICK_MS = 25;
const XFADE = 0.6;

let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;
let masterGain: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicIn: GainNode | null = null;
let duckGain: GainNode | null = null;
let pauseGain: GainNode | null = null;
let pauseFilter: BiquadFilterNode | null = null;

const vols = { master: 0.7, music: 0.5, sfx: 0.8 };
let P = 1;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const mx = Math.max;
const fq = (f: number) => clamp(f * P, 10, 20000);
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function getAC(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext || (window as any).webkitAudioContext;
}

function makeCurve(k: number) {
  const n = 1024;
  const cv = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    cv[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return cv;
}
const curves = new Map<number, ReturnType<typeof makeCurve>>();
function shaper(c: AudioContext, k: number): WaveShaperNode {
  let cv = curves.get(k);
  if (!cv) {
    cv = makeCurve(k);
    curves.set(k, cv);
  }
  const s = c.createWaveShaper();
  s.curve = cv;
  return s;
}

function makePanner(c: AudioContext): StereoPannerNode | null {
  return typeof c.createStereoPanner === 'function' ? c.createStereoPanner() : null;
}

// ---------- synthesis primitives ----------

interface Env { at?: number; a?: number; hold?: number; dur: number; vol: number }
interface Filt { type: BiquadFilterType; f: number; f2?: number; q?: number; glide?: number }
interface Mod { rate: number; depth: number; type?: OscillatorType }
interface Chain { filter?: Filt; shape?: number; am?: Mod }
interface ToneOpt extends Env, Chain {
  type?: OscillatorType;
  f?: number;
  f2?: number;
  glide?: number;
  fpts?: [number, number][];
  detune?: number;
  vib?: Mod;
}
type NoiseOpt = Env & Chain;

const lp = (f: number, f2?: number, q?: number, glide?: number): Filt => ({ type: 'lowpass', f, f2, q, glide });
const hp = (f: number, f2?: number, q?: number, glide?: number): Filt => ({ type: 'highpass', f, f2, q, glide });
const bp = (f: number, f2?: number, q?: number, glide?: number): Filt => ({ type: 'bandpass', f, f2, q, glide });

function envelope(g: AudioParam, t: number, e: Env): number {
  const a = e.a ?? 0.003;
  const h = e.hold ?? 0;
  const v = mx(e.vol, EPS * 2);
  g.setValueAtTime(EPS, t);
  g.linearRampToValueAtTime(v, t + a);
  if (h > 0) g.setValueAtTime(v, t + a + h);
  const end = t + a + h + e.dur;
  g.exponentialRampToValueAtTime(EPS, end);
  return end;
}

function lfo(c: AudioContext, param: AudioParam, t: number, stop: number, m: Mod) {
  const o = c.createOscillator();
  o.type = m.type ?? 'sine';
  o.frequency.value = m.rate;
  const g = c.createGain();
  g.gain.value = m.depth;
  o.connect(g).connect(param);
  o.start(t);
  o.stop(stop);
}

function applyChain(c: AudioContext, src: AudioNode, g: GainNode, dest: AudioNode, t: number, end: number, o: Chain) {
  let n = src;
  if (o.filter) {
    const fl = o.filter;
    const bf = c.createBiquadFilter();
    bf.type = fl.type;
    bf.Q.value = fl.q ?? 0.8;
    bf.frequency.setValueAtTime(fq(fl.f), t);
    if (fl.f2 !== undefined) bf.frequency.exponentialRampToValueAtTime(fq(fl.f2), t + (fl.glide ?? end - t));
    n = n.connect(bf);
  }
  if (o.shape) n = n.connect(shaper(c, o.shape));
  n.connect(g);
  let out: AudioNode = g;
  if (o.am) {
    const ag = c.createGain();
    ag.gain.value = 1 - o.am.depth / 2;
    lfo(c, ag.gain, t, end + 0.03, { rate: o.am.rate, depth: o.am.depth / 2, type: o.am.type });
    out = g.connect(ag);
  }
  out.connect(dest);
}

function tone(c: AudioContext, dest: AudioNode, t0: number, o: ToneOpt): number {
  const t = t0 + (o.at ?? 0);
  const osc = c.createOscillator();
  osc.type = o.type ?? 'sine';
  const g = c.createGain();
  const end = envelope(g.gain, t, o);
  const fr = osc.frequency;
  if (o.fpts && o.fpts.length) {
    fr.setValueAtTime(fq(o.fpts[0][1]), t + o.fpts[0][0]);
    for (let i = 1; i < o.fpts.length; i++) fr.exponentialRampToValueAtTime(fq(o.fpts[i][1]), t + o.fpts[i][0]);
  } else {
    fr.setValueAtTime(fq(o.f ?? 440), t);
    if (o.f2 !== undefined) fr.exponentialRampToValueAtTime(fq(o.f2), t + (o.glide ?? end - t));
  }
  if (o.detune) osc.detune.value = o.detune;
  const stop = end + 0.03;
  if (o.vib) lfo(c, osc.detune, t, stop, o.vib);
  applyChain(c, osc, g, dest, t, end, o);
  osc.start(t);
  osc.stop(stop);
  return end;
}

function noise(c: AudioContext, dest: AudioNode, t0: number, o: NoiseOpt): number {
  const t = t0 + (o.at ?? 0);
  if (!noiseBuf) return t;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const g = c.createGain();
  const end = envelope(g.gain, t, o);
  applyChain(c, src, g, dest, t, end, o);
  src.start(t, Math.random() * 1.5);
  src.stop(end + 0.03);
  return end;
}

function piano(c: AudioContext, d: AudioNode, t: number, f: number, vol: number, dur: number): number {
  return mx(
    tone(c, d, t, { type: 'triangle', f, a: 0.002, dur, vol }),
    tone(c, d, t, { f: f * 2, a: 0.002, dur: dur * 0.6, vol: vol * 0.35 }),
    tone(c, d, t, { f: f * 3.01, a: 0.001, dur: dur * 0.25, vol: vol * 0.15 }),
    noise(c, d, t, { dur: 0.02, vol: vol * 0.3, filter: bp(f * 4, undefined, 2) }),
  );
}

function harpsi(c: AudioContext, d: AudioNode, t: number, f: number, vol: number): number {
  return mx(
    tone(c, d, t, { type: 'sawtooth', f, a: 0.001, dur: 0.28, vol, filter: lp(f * 8, f * 2, 1) }),
    tone(c, d, t, { type: 'square', f: f * 2, a: 0.001, dur: 0.12, vol: vol * 0.35, filter: hp(f * 2) }),
  );
}

// ---------- SFX ----------

type Builder = (c: AudioContext, o: AudioNode, t: number) => number;

const SFX: Record<Sfx, Builder> = {
  swing: (c, o, t) => mx(
    noise(c, o, t, { a: 0.02, dur: 0.12, vol: 0.35, filter: bp(600, 2600, 1.4) }),
    tone(c, o, t, { type: 'triangle', f: 240, f2: 110, dur: 0.1, vol: 0.12 }),
  ),
  swingHeavy: (c, o, t) => mx(
    noise(c, o, t, { a: 0.03, dur: 0.22, vol: 0.5, filter: bp(300, 1600, 1.2) }),
    tone(c, o, t, { type: 'sawtooth', f: 110, f2: 50, a: 0.02, dur: 0.22, vol: 0.22, filter: lp(700) }),
  ),
  hit: (c, o, t) => mx(
    tone(c, o, t, { f: 170, f2: 48, glide: 0.09, dur: 0.14, vol: 0.9 }),
    tone(c, o, t, { type: 'square', f: 95, f2: 60, dur: 0.07, vol: 0.25, shape: 40, filter: lp(1800) }),
    noise(c, o, t, { dur: 0.05, vol: 0.45, filter: hp(2200) }),
    noise(c, o, t, { dur: 0.09, vol: 0.3, filter: bp(900, undefined, 1.2) }),
  ),
  hitHeavy: (c, o, t) => mx(
    tone(c, o, t, { f: 130, f2: 36, glide: 0.14, dur: 0.26, vol: 1 }),
    tone(c, o, t, { type: 'sawtooth', f: 75, f2: 42, dur: 0.18, vol: 0.35, shape: 80, filter: lp(1400, 300) }),
    noise(c, o, t, { dur: 0.06, vol: 0.55, filter: hp(1800) }),
    noise(c, o, t, { dur: 0.16, vol: 0.45, filter: bp(1100, 400, 0.9) }),
  ),
  crit: (c, o, t) => mx(
    SFX.hitHeavy(c, o, t),
    tone(c, o, t, { type: 'square', f: 1760, dur: 0.22, vol: 0.1, filter: bp(2500, undefined, 2) }),
    tone(c, o, t, { type: 'square', f: 2640, at: 0.02, dur: 0.3, vol: 0.07 }),
    noise(c, o, t, { dur: 0.03, vol: 0.6, filter: hp(4000) }),
  ),
  kill: (c, o, t) => mx(
    SFX.hit(c, o, t),
    tone(c, o, t, { type: 'sawtooth', f: 420, f2: 70, dur: 0.2, vol: 0.22, shape: 20, filter: lp(1500, 200) }),
    noise(c, o, t, { at: 0.02, dur: 0.15, vol: 0.3, filter: lp(1200) }),
  ),
  out: (c, o, t) => mx(
    tone(c, o, t, { f: 2200, f2: 260, glide: 0.8, a: 0.01, hold: 0.5, dur: 0.28, vol: 0.28, vib: { rate: 9, depth: 70 } }),
    noise(c, o, t, { dur: 0.04, vol: 0.2, filter: hp(3000) }),
  ),
  dash: (c, o, t) => mx(
    noise(c, o, t, { a: 0.03, dur: 0.15, vol: 0.4, filter: bp(700, 4200, 2) }),
    tone(c, o, t, { f: 280, f2: 840, dur: 0.12, vol: 0.08 }),
  ),
  jump: (c, o, t) => mx(
    tone(c, o, t, { type: 'square', f: 180, f2: 560, glide: 0.1, dur: 0.12, vol: 0.12, filter: lp(2000) }),
    tone(c, o, t, { f: 360, f2: 1100, dur: 0.1, vol: 0.08 }),
  ),
  land: (c, o, t) => mx(
    tone(c, o, t, { f: 130, f2: 48, dur: 0.12, vol: 0.6 }),
    noise(c, o, t, { dur: 0.08, vol: 0.3, filter: lp(900) }),
  ),
  smash: (c, o, t) => mx(
    tone(c, o, t, { f: 95, f2: 28, glide: 0.25, dur: 0.45, vol: 1 }),
    noise(c, o, t, { dur: 0.5, vol: 0.8, shape: 30, filter: lp(2500, 150) }),
    noise(c, o, t, { dur: 0.05, vol: 0.6, filter: hp(2500) }),
    tone(c, o, t, { type: 'sawtooth', f: 60, f2: 30, dur: 0.3, vol: 0.3, shape: 60, filter: lp(600) }),
  ),
  hurt: (c, o, t) => mx(
    tone(c, o, t, { type: 'square', f: 320, f2: 110, glide: 0.15, dur: 0.18, vol: 0.3, shape: 30, filter: lp(2200) }),
    noise(c, o, t, { dur: 0.1, vol: 0.3, filter: bp(1200, undefined, 1) }),
    tone(c, o, t, { f: 200, f2: 80, dur: 0.12, vol: 0.4 }),
  ),
  stringSnap: (c, o, t) => mx(
    noise(c, o, t, { a: 0.001, dur: 0.03, vol: 0.8, filter: hp(3500) }),
    tone(c, o, t, { type: 'square', f: 880, f2: 220, glide: 0.08, dur: 0.1, vol: 0.1 }),
    tone(c, o, t, { type: 'sawtooth', fpts: [[0, 110], [0.05, 104], [0.75, 36]], a: 0.002, hold: 0.05, dur: 0.8, vol: 0.45, vib: { rate: 7, depth: 40 }, filter: lp(3500, 250, 6, 0.5) }),
    tone(c, o, t, { type: 'sawtooth', fpts: [[0, 110], [0.05, 104], [0.75, 36]], detune: 25, a: 0.002, hold: 0.05, dur: 0.8, vol: 0.3, filter: lp(3000, 220, 4, 0.5) }),
    tone(c, o, t, { f: 55, f2: 30, dur: 0.5, vol: 0.5 }),
  ),
  heal: (c, o, t) => {
    let end = t;
    [1046.5, 1318.5, 1568, 2093].forEach((f, i) => {
      end = mx(end, tone(c, o, t, { type: 'triangle', f, at: i * 0.055, dur: 0.22, vol: 0.14, vib: { rate: 10, depth: 15 } }));
    });
    return end;
  },
  pickup: (c, o, t) => mx(
    tone(c, o, t, { type: 'square', f: 988, dur: 0.05, vol: 0.12, filter: lp(4000) }),
    tone(c, o, t, { type: 'square', f: 1480, at: 0.06, dur: 0.1, vol: 0.12, filter: lp(4000) }),
  ),
  charge: (c, o, t) => mx(
    tone(c, o, t, { type: 'sawtooth', f: 110, f2: 880, glide: 0.6, a: 0.02, hold: 0.45, dur: 0.15, vol: 0.14, filter: lp(400, 4000, 5, 0.6) }),
    tone(c, o, t, { type: 'square', f: 220, f2: 1760, glide: 0.6, a: 0.02, hold: 0.45, dur: 0.15, vol: 0.05 }),
    noise(c, o, t, { a: 0.3, hold: 0.2, dur: 0.15, vol: 0.1, filter: bp(500, 3000, 2) }),
  ),
  specialReady: (c, o, t) => mx(
    tone(c, o, t, { type: 'square', f: 784, dur: 0.1, vol: 0.12, filter: lp(5000) }),
    tone(c, o, t, { type: 'square', f: 1175, at: 0.08, dur: 0.12, vol: 0.12, filter: lp(5000) }),
    tone(c, o, t, { type: 'triangle', f: 1568, at: 0.16, hold: 0.1, dur: 0.3, vol: 0.14, vib: { rate: 12, depth: 20 } }),
    noise(c, o, t, { at: 0.16, dur: 0.25, vol: 0.06, filter: hp(6000) }),
  ),
  block: (c, o, t) => mx(
    tone(c, o, t, { type: 'square', f: 620, dur: 0.08, vol: 0.15, filter: bp(1400, undefined, 3) }),
    tone(c, o, t, { type: 'square', f: 1460, dur: 0.12, vol: 0.08 }),
    noise(c, o, t, { dur: 0.05, vol: 0.35, filter: bp(3200, undefined, 2) }),
    tone(c, o, t, { f: 180, f2: 90, dur: 0.06, vol: 0.3 }),
  ),
  shieldHit: (c, o, t) => mx(
    tone(c, o, t, { f: 523, dur: 0.4, vol: 0.12 }),
    tone(c, o, t, { f: 1247, dur: 0.3, vol: 0.08 }),
    tone(c, o, t, { f: 1873, dur: 0.25, vol: 0.06 }),
    tone(c, o, t, { f: 2690, dur: 0.2, vol: 0.04 }),
    noise(c, o, t, { dur: 0.04, vol: 0.4, filter: hp(3000) }),
    tone(c, o, t, { f: 140, f2: 70, dur: 0.1, vol: 0.4 }),
  ),

  // hero specials
  special_armand: (c, o, t) => {
    const end = t + 1.15;
    const bus = c.createGain();
    const sp = makePanner(c);
    if (sp) {
      lfo(c, sp.pan, t, end, { rate: 3.2, depth: 0.85 });
      bus.connect(sp).connect(o);
    } else bus.connect(o);
    const filt = c.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = fq(650);
    filt.Q.value = 2.5;
    lfo(c, filt.frequency, t, end, { rate: 6.4, depth: fq(420) });
    filt.connect(bus);
    tone(c, filt, t, { type: 'sawtooth', f: 55, f2: 70, a: 0.15, hold: 0.65, dur: 0.3, vol: 0.6, vib: { rate: 5, depth: 12 } });
    tone(c, filt, t, { type: 'sawtooth', f: 82.4, f2: 104, a: 0.15, hold: 0.65, dur: 0.3, vol: 0.45, detune: 7 });
    noise(c, filt, t, { a: 0.1, hold: 0.6, dur: 0.35, vol: 0.4 });
    tone(c, bus, t, { f: 55, f2: 45, a: 0.1, hold: 0.6, dur: 0.3, vol: 0.35 });
    return end;
  },
  special_adrien: (c, o, t) => {
    let end = t;
    for (let i = 0; i < 8; i++) {
      const at = i * 0.055;
      const f = 270 - i * 22;
      end = mx(end, tone(c, o, t, { at, f, f2: f * 0.55, glide: 0.1, dur: 0.14, vol: 0.55 }));
      if (i % 2 === 0) noise(c, o, t, { at, dur: 0.06, vol: 0.25, filter: hp(1600) });
    }
    noise(c, o, t, { at: 0.45, dur: 0.9, vol: 0.22, filter: hp(4500) });
    tone(c, o, t, { at: 0.45, f: 150, f2: 42, glide: 0.12, dur: 0.35, vol: 0.9 });
    return mx(end, SFX.roar(c, o, t + 0.45));
  },
  special_eliot: (c, o, t) => {
    const inp = c.createGain();
    inp.gain.value = 3;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = fq(3200);
    const g = c.createGain();
    g.gain.value = 0.3;
    inp.connect(shaper(c, 120)).connect(f).connect(g).connect(o);
    let end = t;
    for (const fr of [82.4, 123.5, 164.8]) {
      for (const dt of [-10, 10]) {
        end = mx(end, tone(c, inp, t, { type: 'sawtooth', f: fr, detune: dt, a: 0.004, hold: 0.55, dur: 0.6, vol: 0.25, vib: { rate: 5.5, depth: 10 } }));
      }
    }
    noise(c, o, t, { dur: 0.03, vol: 0.3, filter: hp(2500) });
    return mx(end, SFX.fart(c, o, t + 0.55));
  },
  special_swan: (c, o, t) => {
    let end = t;
    [48, 49, 52, 54, 55, 58, 60, 61].forEach((m, i) => {
      end = mx(end, piano(c, o, t + i * 0.008, mtof(m), 0.12, 1.0));
    });
    [72, 73, 75, 78].forEach((m, i) => {
      end = mx(end, piano(c, o, t + 0.18 + i * 0.01, mtof(m), 0.1, 0.7));
    });
    return mx(end, SFX.meow(c, o, t + 0.38));
  },
  special_pierre: (c, o, t) => {
    const sc = [0, 2, 3, 5, 7, 8, 11];
    let end = t;
    for (let i = 0; i < 14; i++) {
      const m = 62 + sc[i % 7] + 12 * Math.floor(i / 7);
      end = mx(end, harpsi(c, o, t + i * 0.035, mtof(m), 0.12));
    }
    [62, 65, 69, 74, 77].forEach((m, i) => {
      end = mx(end, harpsi(c, o, t + 0.56 + i * 0.012, mtof(m), 0.11));
    });
    return end;
  },
  special_audrey: (c, o, t) => mx(
    tone(c, o, t, { fpts: [[0, 990], [0.12, 1046.5]], a: 0.08, hold: 0.75, dur: 0.35, vol: 0.22, vib: { rate: 6, depth: 35 } }),
    tone(c, o, t, { type: 'triangle', fpts: [[0, 990], [0.12, 1046.5]], a: 0.08, hold: 0.75, dur: 0.35, vol: 0.1, vib: { rate: 6, depth: 35 } }),
    noise(c, o, t, { a: 0.08, hold: 0.7, dur: 0.3, vol: 0.03, filter: bp(3000, undefined, 3) }),
    SFX.cluck(c, o, t + 1.0),
  ),

  // gags & creatures
  nukeAlarm: (c, o, t) => {
    let end = t;
    for (let i = 0; i < 3; i++) {
      const at = i * 0.5;
      end = mx(end, tone(c, o, t, { type: 'sawtooth', at, f: 420, f2: 980, glide: 0.45, a: 0.02, hold: 0.3, dur: 0.15, vol: 0.16, filter: lp(2500) }));
      tone(c, o, t, { type: 'square', at, f: 420, f2: 980, glide: 0.45, a: 0.02, hold: 0.3, dur: 0.15, vol: 0.06, detune: 12 });
    }
    return end;
  },
  explosion: (c, o, t) => mx(
    tone(c, o, t, { f: 70, f2: 22, glide: 0.9, dur: 1.3, vol: 1 }),
    noise(c, o, t, { a: 0.005, dur: 1.4, vol: 0.9, shape: 25, filter: lp(3500, 120, 0.8, 1.2) }),
    noise(c, o, t, { dur: 0.08, vol: 0.7, filter: hp(1500) }),
    tone(c, o, t, { type: 'sawtooth', f: 50, f2: 25, dur: 0.8, vol: 0.3, shape: 80, filter: lp(400) }),
  ),
  fart: (c, o, t) => {
    const rate = 22 + Math.random() * 12;
    return mx(
      tone(c, o, t, { type: 'sawtooth', f: 95, f2: 48, glide: 0.45, a: 0.02, hold: 0.15, dur: 0.3, vol: 0.45, filter: lp(650, undefined, 4), am: { rate, depth: 0.9, type: 'square' }, vib: { rate: 13, depth: 120 } }),
      noise(c, o, t, { a: 0.02, hold: 0.12, dur: 0.25, vol: 0.2, filter: lp(400), am: { rate, depth: 0.8 } }),
    );
  },
  meow: (c, o, t) => {
    const fpts: [number, number][] = [[0, 450], [0.15, 820], [0.45, 400]];
    return mx(
      tone(c, o, t, { type: 'sawtooth', fpts, a: 0.03, hold: 0.25, dur: 0.2, vol: 0.3, filter: bp(1400, undefined, 2), vib: { rate: 7, depth: 30 } }),
      tone(c, o, t, { type: 'triangle', fpts, a: 0.03, hold: 0.25, dur: 0.2, vol: 0.12 }),
    );
  },
  roar: (c, o, t) => mx(
    noise(c, o, t, { a: 0.08, hold: 0.4, dur: 0.5, vol: 0.7, filter: lp(500, 900, 1.5), am: { rate: 32, depth: 0.7 } }),
    tone(c, o, t, { type: 'sawtooth', f: 85, f2: 60, a: 0.05, hold: 0.4, dur: 0.5, vol: 0.4, shape: 60, filter: lp(900), am: { rate: 32, depth: 0.6 } }),
    tone(c, o, t, { type: 'square', f: 120, f2: 70, a: 0.05, hold: 0.4, dur: 0.5, vol: 0.15, filter: lp(1200) }),
  ),
  cluck: (c, o, t) => mx(
    tone(c, o, t, { type: 'square', fpts: [[0, 380], [0.03, 950], [0.07, 320]], dur: 0.07, vol: 0.2, filter: bp(1500, undefined, 2) }),
    tone(c, o, t, { type: 'square', at: 0.12, fpts: [[0, 380], [0.03, 950], [0.07, 320]], dur: 0.07, vol: 0.2, filter: bp(1500, undefined, 2) }),
    tone(c, o, t, { type: 'square', at: 0.26, fpts: [[0, 400], [0.06, 1100], [0.2, 500]], hold: 0.1, dur: 0.1, vol: 0.28, filter: bp(1600, undefined, 2) }),
  ),
  egg: (c, o, t) => mx(
    tone(c, o, t, { f: 300, f2: 1400, dur: 0.06, vol: 0.3 }),
    noise(c, o, t, { at: 0.02, dur: 0.05, vol: 0.15, filter: bp(2000) }),
  ),

  // teachers
  chalkThrow: (c, o, t) => mx(
    noise(c, o, t, { a: 0.03, dur: 0.12, vol: 0.25, filter: hp(2000, 5000) }),
    tone(c, o, t, { at: 0.02, f: 2600, f2: 3300, dur: 0.06, vol: 0.06 }),
  ),
  whistle: (c, o, t) => mx(
    tone(c, o, t, { f: 2900, a: 0.02, hold: 0.3, dur: 0.1, vol: 0.2, vib: { rate: 32, depth: 95 } }),
    noise(c, o, t, { a: 0.02, hold: 0.3, dur: 0.1, vol: 0.08, filter: bp(2900, undefined, 4) }),
  ),
  teacherDie: (c, o, t) => {
    const fpts: [number, number][] = [[0, 330], [0.1, 360], [0.55, 110]];
    return mx(
      tone(c, o, t, { type: 'sawtooth', fpts, a: 0.02, hold: 0.3, dur: 0.25, vol: 0.25, filter: bp(900, undefined, 3), vib: { rate: 8, depth: 100 } }),
      tone(c, o, t, { type: 'square', fpts: fpts.map(([d, f]): [number, number] => [d, f / 2]), a: 0.02, hold: 0.3, dur: 0.25, vol: 0.08, filter: lp(1200) }),
      noise(c, o, t, { at: 0.3, dur: 0.3, vol: 0.25, filter: lp(1500) }),
    );
  },
  spawn: (c, o, t) => mx(
    tone(c, o, t, { f: 330, f2: 666, glide: 0.3, a: 0.15, dur: 0.3, vol: 0.12 }),
    tone(c, o, t, { f: 466, f2: 940, glide: 0.3, a: 0.15, dur: 0.3, vol: 0.08 }),
    noise(c, o, t, { a: 0.1, dur: 0.3, vol: 0.1, filter: bp(1200, 300, 2) }),
  ),
  portal: (c, o, t) => mx(
    tone(c, o, t, { type: 'sawtooth', f: 120, f2: 960, glide: 0.9, a: 0.1, hold: 0.5, dur: 0.4, vol: 0.12, filter: lp(300, 5000, 8) }),
    tone(c, o, t, { f: 1320, a: 0.2, hold: 0.4, dur: 0.4, vol: 0.05, vib: { rate: 9, depth: 40 } }),
    tone(c, o, t, { f: 1760, a: 0.3, hold: 0.3, dur: 0.4, vol: 0.04, vib: { rate: 7, depth: 40 } }),
    noise(c, o, t, { a: 0.2, hold: 0.4, dur: 0.4, vol: 0.08, filter: bp(400, 3000, 3) }),
  ),

  // bosses
  bossRoar: (c, o, t) => mx(
    tone(c, o, t, { type: 'sawtooth', f: 85, f2: 24, glide: 2.2, a: 0.08, hold: 0.6, dur: 1.6, vol: 0.45, shape: 90, am: { rate: 24, depth: 0.5 } }),
    tone(c, o, t, { type: 'square', f: 112, f2: 30, glide: 2.2, a: 0.08, hold: 0.6, dur: 1.6, vol: 0.25, shape: 90 }),
    noise(c, o, t, { a: 0.05, hold: 0.5, dur: 1.5, vol: 0.5, filter: lp(700, 150), am: { rate: 24, depth: 0.5 } }),
    tone(c, o, t, { f: 50, f2: 30, a: 0.05, hold: 0.4, dur: 1.4, vol: 0.6 }),
  ),
  // the note you just played: a dry transient that fires on the press, before the hit lands
  tap: (c, o, t) => mx(
    noise(c, o, t, { a: 0.001, dur: 0.025, vol: 0.55, filter: hp(2600) }),
    tone(c, o, t, { f: 210, f2: 70, glide: 0.05, a: 0.001, dur: 0.07, vol: 0.75 }),
    tone(c, o, t, { type: 'square', f: 420, f2: 160, a: 0.001, dur: 0.03, vol: 0.12, filter: lp(2400) }),
  ),
  bossGrunt: (c, o, t) => {
    const syl = (at: number, f: number, vol: number) => mx(
      tone(c, o, t, { at, type: 'sawtooth', fpts: [[0, f], [0.03, f * 1.12], [0.1, f * 0.82]], a: 0.008, hold: 0.04, dur: 0.06, vol, filter: bp(620, 520, 3) }),
      tone(c, o, t, { at, type: 'sawtooth', fpts: [[0, f], [0.03, f * 1.12], [0.1, f * 0.82]], a: 0.008, hold: 0.04, dur: 0.06, vol: vol * 0.5, filter: bp(1150, 1000, 4) }),
      tone(c, o, t, { at, type: 'square', fpts: [[0, f / 2], [0.1, f * 0.4]], a: 0.008, hold: 0.04, dur: 0.06, vol: vol * 0.35, filter: lp(500) }),
    );
    return mx(syl(0, 150, 0.32), syl(0.13, 138, 0.26), syl(0.26, 124, 0.22));
  },
  bossCharge: (c, o, t) => mx(
    tone(c, o, t, { type: 'sawtooth', f: 70, f2: 420, glide: 0.9, a: 0.05, hold: 0.7, dur: 0.2, vol: 0.2, shape: 20, filter: lp(300, 3000, 6, 0.9) }),
    noise(c, o, t, { a: 0.05, hold: 0.7, dur: 0.2, vol: 0.3, filter: lp(200, 1200, 1, 0.9) }),
    tone(c, o, t, { f: 40, a: 0.05, hold: 0.7, dur: 0.2, vol: 0.4, am: { rate: 18, depth: 0.6 } }),
  ),
  bossLand: (c, o, t) => mx(
    tone(c, o, t, { f: 80, f2: 24, glide: 0.35, dur: 0.7, vol: 1 }),
    noise(c, o, t, { dur: 0.6, vol: 0.8, shape: 30, filter: lp(1400, 100) }),
    noise(c, o, t, { dur: 0.05, vol: 0.5, filter: hp(1500) }),
    tone(c, o, t, { type: 'sawtooth', f: 45, dur: 0.4, vol: 0.3, shape: 80, filter: lp(300) }),
  ),
  bossDie: (c, o, t) => mx(
    tone(c, o, t, { type: 'sawtooth', f: 420, f2: 30, glide: 2.4, a: 0.02, hold: 0.4, dur: 2.2, vol: 0.3, shape: 50, vib: { rate: 11, depth: 120 }, filter: lp(3000, 200) }),
    SFX.explosion(c, o, t),
    SFX.explosion(c, o, t + 0.45),
    SFX.explosion(c, o, t + 1.0),
  ),
  telegraph: (c, o, t) => mx(
    tone(c, o, t, { type: 'square', f: 1250, dur: 0.07, vol: 0.13, filter: lp(3500) }),
    tone(c, o, t, { type: 'square', at: 0.13, f: 1250, dur: 0.07, vol: 0.13, filter: lp(3500) }),
  ),
  lightning: (c, o, t) => mx(
    noise(c, o, t, { a: 0.001, dur: 0.06, vol: 0.9, filter: hp(1800) }),
    noise(c, o, t, { dur: 0.25, vol: 0.4, filter: bp(3000), am: { rate: 60, depth: 0.9, type: 'square' } }),
    noise(c, o, t, { at: 0.05, a: 0.05, hold: 0.2, dur: 1.2, vol: 0.6, filter: lp(900, 80) }),
    tone(c, o, t, { at: 0.05, f: 55, f2: 30, dur: 0.8, vol: 0.4 }),
  ),
  dig: (c, o, t) => {
    let end = t;
    for (let i = 0; i < 3; i++) {
      end = mx(end, noise(c, o, t, { at: i * 0.09, dur: 0.07, vol: 0.45, shape: 10, filter: lp(1100) }));
      tone(c, o, t, { at: i * 0.09, f: 150, f2: 70, dur: 0.07, vol: 0.35 });
    }
    return end;
  },
  shellRoll: (c, o, t) => mx(
    noise(c, o, t, { a: 0.05, hold: 0.5, dur: 0.2, vol: 0.4, filter: bp(500, undefined, 1.5), am: { rate: 16, depth: 0.8 } }),
    tone(c, o, t, { f: 70, a: 0.05, hold: 0.5, dur: 0.2, vol: 0.3, am: { rate: 16, depth: 0.8 } }),
    tone(c, o, t, { type: 'triangle', f: 180, f2: 240, a: 0.05, hold: 0.5, dur: 0.2, vol: 0.05 }),
  ),
  hiss: (c, o, t) => mx(
    noise(c, o, t, { a: 0.05, hold: 0.35, dur: 0.3, vol: 0.3, filter: hp(3200) }),
    noise(c, o, t, { a: 0.05, hold: 0.35, dur: 0.3, vol: 0.15, filter: bp(6000, undefined, 2), am: { rate: 11, depth: 0.3 } }),
  ),
  screech: (c, o, t) => {
    const fpts: [number, number][] = [[0, 1700], [0.15, 2600], [0.6, 1400]];
    return mx(
      tone(c, o, t, { type: 'sawtooth', fpts, a: 0.02, hold: 0.3, dur: 0.3, vol: 0.16, shape: 30, filter: bp(2200, undefined, 2), vib: { rate: 22, depth: 80 } }),
      noise(c, o, t, { a: 0.02, hold: 0.3, dur: 0.3, vol: 0.12, filter: hp(4000) }),
    );
  },
  helicopter: (c, o, t) => mx(
    noise(c, o, t, { a: 0.05, hold: 0.8, dur: 0.25, vol: 0.55, filter: lp(450), am: { rate: 13, depth: 1, type: 'square' } }),
    tone(c, o, t, { f: 55, a: 0.05, hold: 0.8, dur: 0.25, vol: 0.35, am: { rate: 13, depth: 1, type: 'square' } }),
    tone(c, o, t, { type: 'sawtooth', f: 110, a: 0.05, hold: 0.8, dur: 0.25, vol: 0.08, filter: lp(300) }),
  ),

  // events
  eventSiren: (c, o, t) => {
    let end = t;
    for (let i = 0; i < 4; i++) {
      const f = i % 2 ? 880 : 660;
      end = mx(end, tone(c, o, t, { type: 'square', at: i * 0.34, f, a: 0.01, hold: 0.26, dur: 0.05, vol: 0.12, filter: lp(2500) }));
      tone(c, o, t, { type: 'sawtooth', at: i * 0.34, f, a: 0.01, hold: 0.26, dur: 0.05, vol: 0.05, detune: 8 });
    }
    return end;
  },
  blackout: (c, o, t) => mx(
    noise(c, o, t, { a: 0.001, dur: 0.03, vol: 0.5, filter: hp(2000) }),
    tone(c, o, t, { type: 'sawtooth', f: 120, f2: 25, glide: 0.9, hold: 0.1, dur: 0.9, vol: 0.25, filter: lp(1500, 60) }),
    tone(c, o, t, { f: 60, f2: 30, dur: 0.7, vol: 0.3 }),
  ),

  // UI
  uiMove: (c, o, t) => tone(c, o, t, { type: 'square', f: 700, a: 0.002, dur: 0.035, vol: 0.08, filter: lp(3000) }),
  uiSelect: (c, o, t) => mx(
    tone(c, o, t, { type: 'square', f: 880, a: 0.002, dur: 0.04, vol: 0.1, filter: lp(4000) }),
    tone(c, o, t, { type: 'square', at: 0.05, f: 1320, a: 0.002, dur: 0.07, vol: 0.1, filter: lp(4000) }),
  ),
  uiBack: (c, o, t) => mx(
    tone(c, o, t, { type: 'square', f: 660, a: 0.002, dur: 0.04, vol: 0.1, filter: lp(3000) }),
    tone(c, o, t, { type: 'square', at: 0.05, f: 440, a: 0.002, dur: 0.06, vol: 0.1, filter: lp(3000) }),
  ),
  typewriter: (c, o, t) => mx(
    tone(c, o, t, { type: 'square', f: 1100, a: 0.001, dur: 0.018, vol: 0.06, filter: lp(4000) }),
    noise(c, o, t, { a: 0.001, dur: 0.012, vol: 0.06, filter: bp(3500, undefined, 2) }),
  ),
  comboUp: (c, o, t) => {
    let end = t;
    [660, 880, 1320].forEach((f, i) => {
      end = mx(end, tone(c, o, t, { type: 'square', at: i * 0.04, f, dur: 0.06, vol: 0.1, filter: lp(4000) }));
    });
    noise(c, o, t, { at: 0.08, dur: 0.08, vol: 0.06, filter: hp(5000) });
    return end;
  },
  stageClear: (c, o, t) => {
    let end = t;
    [67, 72, 76].forEach((m, i) => {
      tone(c, o, t, { type: 'square', at: i * 0.1, f: mtof(m), dur: 0.1, vol: 0.1, filter: lp(4000) });
      end = mx(end, tone(c, o, t, { type: 'sawtooth', at: i * 0.1, f: mtof(m), dur: 0.1, vol: 0.06, filter: lp(3000) }));
    });
    for (const m of [72, 76, 79, 84]) {
      end = mx(end, tone(c, o, t, { type: 'sawtooth', at: 0.32, f: mtof(m), a: 0.01, hold: 0.5, dur: 0.4, vol: 0.07, filter: lp(3000), vib: { rate: 6, depth: 15 } }));
    }
    noise(c, o, t, { at: 0.32, dur: 1.0, vol: 0.15, filter: hp(4500) });
    return end;
  },
  gameOver: (c, o, t) => {
    let end = t;
    [55, 54, 53].forEach((m, i) => {
      end = mx(end, tone(c, o, t, { type: 'sawtooth', at: i * 0.4, f: mtof(m), a: 0.04, hold: 0.22, dur: 0.1, vol: 0.25, filter: lp(500, 1100, 3, 0.25) }));
    });
    return mx(end, tone(c, o, t, { type: 'sawtooth', at: 1.2, f: mtof(52), a: 0.04, hold: 0.9, dur: 0.3, vol: 0.25, filter: lp(500, 1100, 3, 0.3), vib: { rate: 6, depth: 40 } }));
  },
  victory: (c, o, t) => {
    let end = t;
    [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => {
      end = mx(end, tone(c, o, t, { type: 'square', at: i * 0.06, f: mtof(m), dur: 0.12, vol: 0.1, filter: lp(5000) }));
    });
    for (const m of [60, 67, 72, 76, 84]) {
      end = mx(end, tone(c, o, t, { type: 'sawtooth', at: 0.5, f: mtof(m), a: 0.01, hold: 0.9, dur: 0.5, vol: 0.07, filter: lp(3500), vib: { rate: 6, depth: 15 } }));
    }
    tone(c, o, t, { at: 0.5, f: 150, f2: 42, glide: 0.12, dur: 0.35, vol: 0.8 });
    noise(c, o, t, { at: 0.5, dur: 1.3, vol: 0.2, filter: hp(4500) });
    return end;
  },
};

const PRIORITY = new Set<Sfx>([
  'stringSnap', 'hurt', 'bossDie', 'bossRoar', 'gameOver', 'victory', 'stageClear', 'nukeAlarm', 'explosion',
  'specialReady', 'special_armand', 'special_adrien', 'special_eliot', 'special_swan', 'special_pierre', 'special_audrey',
  'eventSiren', 'blackout', 'uiSelect', 'uiBack',
]);
const NO_VARY = new Set<Sfx>(['stageClear', 'gameOver', 'victory', 'specialReady', 'comboUp', 'uiMove', 'uiSelect', 'uiBack', 'heal']);

const recent = new Map<Sfx, number[]>();
let voices: number[] = [];

// ---------- music: song definitions ----------

const AEOLIAN = [0, 2, 3, 5, 7, 8, 10];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const HARMONIC = [0, 2, 3, 5, 7, 8, 11];
const PHRYG_DOM = [0, 1, 4, 5, 7, 8, 10];
const IONIAN = [0, 2, 4, 5, 7, 9, 11];

const sd = (sc: number[], d: number) => sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
const chordTone = (sc: number[], d: number, i: number) => sd(sc, d + 2 * (i % 3) + 7 * Math.floor(i / 3));

interface LeadEv { s: number; n: number; len: number }
interface Song {
  bpm: number;
  root: number;
  scale: number[];
  prog: number[];
  kick: string;
  snare: string;
  hat: string;
  hatDense: string;
  bass: string;
  arp: number[];
  lead: LeadEv[][];
  bassType: OscillatorType;
  bassCut: number;
  arpType: OscillatorType;
  arpCut: number;
  leadType: OscillatorType;
  drive: number;
  fffDrive: number;
  heavy: boolean;
  fixed?: number;
}

interface StageFlavor {
  root: number; scale: number[]; bpm: number; prog: number[]; kick: string; snare: string; bass: string;
  arp: number[]; lead: string; leadType: OscillatorType; bassType: OscillatorType; bossProg: number[]; bossScale: number[];
}

const STAGES: StageFlavor[] = [
  { root: 40, scale: AEOLIAN, bpm: 150, prog: [0, 5, 2, 6], kick: 'x...x...x...x...', snare: '....x.......x...', bass: 'r.rr.rr.r.rro.r.',
    arp: [0, 1, 2, 3, 2, 1, 0, 1, 0, 1, 2, 3, 4, 3, 2, 1], lead: 'x.x-x...x-x.x---', leadType: 'sawtooth', bassType: 'sawtooth', bossProg: [0, 1, 0, 6], bossScale: PHRYG_DOM },
  { root: 45, scale: PHRYGIAN, bpm: 145, prog: [0, 1, 0, 6], kick: 'x.....x.x.....x.', snare: '....x.......x...', bass: 'rr.rr.rr.rr.r.o.',
    arp: [0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 4, 3], lead: 'x---x.x.x---..x.', leadType: 'square', bassType: 'square', bossProg: [0, 0, 5, 1], bossScale: PHRYGIAN },
  { root: 42, scale: HARMONIC, bpm: 155, prog: [0, 3, 5, 4], kick: 'x...x...x...x.x.', snare: '....x.......x...', bass: 'r.r.r.r.o.r.f.r.',
    arp: [0, -1, 1, 2, 0, -1, 1, 3, 0, -1, 1, 2, 4, -1, 3, 2], lead: 'x.xxx.x.x---x...', leadType: 'sawtooth', bassType: 'sawtooth', bossProg: [0, 6, 5, 1], bossScale: HARMONIC },
  { root: 38, scale: AEOLIAN, bpm: 140, prog: [0, 6, 5, 6], kick: 'x.....x...x.....', snare: '....x.......x..x', bass: 'r--.r.r.r--.o.r.',
    arp: [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 3, 2, 1, 0], lead: 'x-----x.x-x-x---', leadType: 'triangle', bassType: 'sawtooth', bossProg: [0, 3, 1, 0], bossScale: PHRYG_DOM },
  { root: 43, scale: DORIAN, bpm: 152, prog: [0, 3, 0, 6], kick: 'x..x..x...x..x..', snare: '....x.......x...', bass: 'r.ro.rr.r.ro.rf.',
    arp: [3, 2, 1, 0, 3, 2, 1, 0, 4, 3, 2, 1, 4, 3, 2, 1], lead: 'x.x.x-x.x.x.x---', leadType: 'square', bassType: 'square', bossProg: [0, 5, 1, 4], bossScale: HARMONIC },
  { root: 41, scale: HARMONIC, bpm: 158, prog: [0, 5, 3, 4], kick: 'x...x..xx...x...', snare: '....x.......x...', bass: 'rrr.rrr.rro.rrf.',
    arp: [0, 0, 2, 0, 1, 0, 3, 0, 0, 0, 2, 0, 4, 0, 3, 0], lead: 'x-x-x-x-xxx.x---', leadType: 'sawtooth', bassType: 'sawtooth', bossProg: [0, 1, 3, 1], bossScale: PHRYG_DOM },
  { root: 44, scale: PHRYGIAN, bpm: 160, prog: [0, 1, 5, 4], kick: 'x.x.x...x.x.x...', snare: '....x..x....x...', bass: 'r.rrr.rrr.rro.ro',
    arp: [0, 1, 3, 1, 2, 3, 4, 3, 0, 1, 3, 1, 2, 3, 5, 4], lead: 'xxx.x-x-xxx.x-x-', leadType: 'sawtooth', bassType: 'square', bossProg: [0, 6, 1, 4], bossScale: PHRYG_DOM },
];

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genLead(rng: () => number, scale: number[], prog: number[], rhythm: string): LeadEv[][] {
  let deg = 9;
  return prog.map((d) => {
    const ev: LeadEv[] = [];
    for (let s = 0; s < 16; s++) {
      if (rhythm[s] !== 'x') continue;
      let len = 1;
      while (s + len < 16 && rhythm[s + len] === '-') len++;
      if (s % 4 === 0) {
        const cands = [0, 1, 2, 3, 4, 5].map((i) => d + 2 * (i % 3) + 7 * Math.floor(i / 3) + 7);
        cands.sort((x, y) => Math.abs(x - deg) - Math.abs(y - deg));
        deg = cands[rng() < 0.7 ? 0 : 1];
      } else {
        deg += [-2, -1, -1, 1, 1, 2][Math.floor(rng() * 6)];
      }
      deg = clamp(deg, 7, 16);
      ev.push({ s, n: sd(scale, deg), len });
    }
    return ev;
  });
}

const HAT = '..x...x...x...x.';
const HAT_DENSE = 'x.xxx.xxx.xxx.xx';
const TRACK_IDX: Record<MusicTrack, number> = { menu: 0, stage: 1, boss: 2, victory: 3, gameover: 4 };

function buildSong(track: MusicTrack, stage: number): Song {
  const st = STAGES[stage - 1];
  const rng = mulberry(stage * 977 + TRACK_IDX[track] * 131 + 7);
  switch (track) {
    case 'menu':
      return {
        bpm: 110, root: 45, scale: AEOLIAN, prog: [0, 5, 3, 4],
        kick: 'x.......x.x.....', snare: '........x.......', hat: HAT, hatDense: 'x.x.x.x.x.x.x.x.',
        bass: 'r-----r.r-----o.', arp: [0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5, 4, 3],
        lead: genLead(rng, AEOLIAN, [0, 5, 3, 4], 'x-------x---x---'),
        bassType: 'sawtooth', bassCut: 300, arpType: 'square', arpCut: 1600, leadType: 'triangle',
        drive: 0, fffDrive: 0, heavy: false, fixed: 3,
      };
    case 'victory':
      return {
        bpm: 150, root: 43, scale: IONIAN, prog: [0, 4, 5, 3],
        kick: 'x...x...x...x...', snare: '....x.......x...', hat: HAT, hatDense: HAT_DENSE,
        bass: 'r.r.r.r.o.r.o.r.', arp: [0, 1, 2, 3, 4, 5, 4, 3, 0, 1, 2, 3, 4, 5, 4, 3],
        lead: genLead(rng, IONIAN, [0, 4, 5, 3], 'x-x-x---x.x.x---'),
        bassType: 'square', bassCut: 500, arpType: 'square', arpCut: 3500, leadType: 'square',
        drive: 0, fffDrive: 0.1, heavy: false, fixed: 5,
      };
    case 'gameover':
      return {
        bpm: 84, root: 38, scale: AEOLIAN, prog: [0, 5],
        kick: 'x.......x.......', snare: '........x.......', hat: HAT, hatDense: HAT,
        bass: 'r---....r---....', arp: [0, -1, -1, -1, 1, -1, -1, -1, 2, -1, -1, -1, 1, -1, -1, -1],
        lead: [
          [{ s: 0, n: 19, len: 4 }, { s: 4, n: 18, len: 4 }, { s: 8, n: 17, len: 4 }, { s: 12, n: 16, len: 4 }],
          [{ s: 0, n: 15, len: 14 }],
        ],
        bassType: 'sawtooth', bassCut: 250, arpType: 'triangle', arpCut: 1500, leadType: 'sawtooth',
        drive: 0, fffDrive: 0, heavy: false, fixed: 3,
      };
    case 'boss':
      return {
        bpm: 170 + (stage % 3) * 2, root: st.root, scale: st.bossScale, prog: st.bossProg,
        kick: stage % 2 ? 'x.x...x.x.x...x.' : 'xx..x.xxx...x.x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', hatDense: 'xxxxxxxxxxxxxxxx',
        bass: stage % 2 ? 'rr.rrr.rrr.rr.ro' : 'r.rrr.rrr.rrrofr', arp: st.arp,
        lead: genLead(rng, st.bossScale, st.bossProg, stage % 2 ? 'x.x.x---x.x.x.x-' : 'x-x-x.x.x---x.xx'),
        bassType: 'sawtooth', bassCut: 520, arpType: 'sawtooth', arpCut: 2800, leadType: 'square',
        drive: 0.3, fffDrive: 0.4, heavy: true,
      };
    case 'stage':
    default:
      return {
        bpm: st.bpm, root: st.root, scale: st.scale, prog: st.prog,
        kick: st.kick, snare: st.snare, hat: HAT, hatDense: HAT_DENSE,
        bass: st.bass, arp: st.arp,
        lead: genLead(rng, st.scale, st.prog, st.lead),
        bassType: st.bassType, bassCut: 380, arpType: 'square', arpCut: 2600, leadType: st.leadType,
        drive: 0, fffDrive: 0.45, heavy: false,
      };
  }
}

// ---------- music: instruments ----------

function mKick(c: AudioContext, d: AudioNode, t: number, heavy: boolean) {
  tone(c, d, t, { f: 160, f2: 42, glide: 0.11, a: 0.002, dur: 0.32, vol: 0.9, shape: heavy ? 8 : undefined });
  noise(c, d, t, { a: 0.001, dur: 0.015, vol: 0.25, filter: hp(3000) });
  if (heavy) tone(c, d, t, { type: 'square', f: 60, f2: 40, dur: 0.1, vol: 0.12, shape: 50, filter: lp(800) });
}
function mSnare(c: AudioContext, d: AudioNode, t: number, heavy: boolean) {
  noise(c, d, t, { a: 0.001, dur: heavy ? 0.18 : 0.14, vol: 0.45, filter: hp(1500) });
  tone(c, d, t, { type: 'triangle', f: 220, f2: 160, dur: 0.07, vol: 0.3 });
}
function mHat(c: AudioContext, d: AudioNode, t: number, acc: number) {
  noise(c, d, t, { a: 0.001, dur: 0.035, vol: 0.13 * acc, filter: hp(7500) });
}
function mCrash(c: AudioContext, d: AudioNode, t: number) {
  noise(c, d, t, { a: 0.002, dur: 1.3, vol: 0.2, filter: hp(4500) });
  noise(c, d, t, { a: 0.002, dur: 0.6, vol: 0.08, filter: bp(7000, undefined, 0.5) });
}
function mBass(c: AudioContext, d: AudioNode, t: number, f: number, len: number, sg: Song, oct: boolean) {
  tone(c, d, t, { type: sg.bassType, f, a: 0.004, hold: len * 0.5, dur: mx(0.06, len * 0.5), vol: 0.3, filter: lp(sg.bassCut * 2.5, sg.bassCut, 6, len) });
  if (sg.heavy) tone(c, d, t, { f: f / 2, a: 0.004, hold: len * 0.5, dur: mx(0.06, len * 0.5), vol: 0.25 });
  if (oct) tone(c, d, t, { type: 'square', f: f * 2, a: 0.004, hold: len * 0.4, dur: mx(0.05, len * 0.4), vol: 0.07, filter: lp(1500) });
}
function mArp(c: AudioContext, d: AudioNode, t: number, f: number, sg: Song) {
  tone(c, d, t, { type: sg.arpType, f, a: 0.003, dur: 0.14, vol: 0.08, filter: lp(sg.arpCut) });
}
function mLead(c: AudioContext, d: AudioNode, t: number, f: number, len: number, sg: Song) {
  for (const det of [-9, 9]) {
    tone(c, d, t, { type: sg.leadType, f, detune: det, a: 0.01, hold: len * 0.75, dur: 0.12, vol: 0.065, filter: lp(3200, undefined, 1), vib: { rate: 5.5, depth: 18 } });
  }
}

// ---------- music: scheduler ----------

interface Track {
  key: string;
  song: Song;
  pre: GainNode;
  dry: GainNode;
  wet: GainNode;
  out: GainNode;
  panL: AudioNode;
  panR: AudioNode;
  next: number;
  step: number;
  bar: number;
  level: number;
  stopAt: number;
  dead: boolean;
}

let tracks: Track[] = [];
let currentKey: string | null = null;
let pending: { track: MusicTrack; stage: number } | null = null;
let intensity = 0;
let slowmo = 1;
let timer: ReturnType<typeof setInterval> | null = null;

const stepDur = (sg: Song) => 60 / sg.bpm / 4 / slowmo;

function makeTrack(c: AudioContext, key: string, song: Song): Track {
  const now = c.currentTime;
  const out = c.createGain();
  out.gain.setValueAtTime(EPS, now);
  out.gain.linearRampToValueAtTime(1, now + XFADE);
  out.connect(musicIn as GainNode);
  const pre = c.createGain();
  pre.gain.value = 0.8;
  const dry = c.createGain();
  const wet = c.createGain();
  wet.gain.value = 0;
  const drv = c.createGain();
  drv.gain.value = 4;
  pre.connect(dry).connect(out);
  pre.connect(drv).connect(shaper(c, 60)).connect(wet).connect(out);
  const mkSide = (v: number): AudioNode => {
    const p = makePanner(c);
    if (!p) return pre;
    p.pan.value = v;
    p.connect(pre);
    return p;
  };
  return {
    key, song, pre, dry, wet, out, panL: mkSide(-0.45), panR: mkSide(0.45),
    next: now + 0.05, step: 0, bar: 0, level: 0, stopAt: Infinity, dead: false,
  };
}

function setDrive(tr: Track, t: number) {
  const sg = tr.song;
  const w = sg.drive + (tr.level >= 5 ? sg.fffDrive : 0);
  tr.wet.gain.setTargetAtTime(w, t, 0.02);
  tr.dry.gain.setTargetAtTime(1 - w * 0.4, t, 0.02);
}

function scheduleStep(c: AudioContext, tr: Track, t: number) {
  const sg = tr.song;
  const s = tr.step;
  const bi = tr.bar % sg.prog.length;
  const d = sg.prog[bi];
  const dest = tr.pre;
  const sdur = stepDur(sg);
  if (s === 0) {
    tr.level = sg.fixed ?? intensity;
    setDrive(tr, t);
    if (tr.level >= 5 || tr.bar === 0) mCrash(c, dest, t);
  }
  const L = tr.level;
  if (sg.kick[s] === 'x') mKick(c, dest, t, sg.heavy);
  if (L >= 2 && sg.snare[s] === 'x') mSnare(c, dest, t, sg.heavy);
  if (L >= 1) {
    const hp2 = L >= 4 ? sg.hatDense : sg.hat;
    if (hp2[s] === 'x') mHat(c, dest, t, s % 4 === 2 ? 1 : 0.6);
  }
  const bc = sg.bass[s];
  if (bc !== '.' && bc !== '-') {
    let len = 1;
    while (s + len < 16 && sg.bass[s + len] === '-') len++;
    let r = sd(sg.scale, d) % 12;
    if (r > 7) r -= 12;
    const semi = r + (bc === 'o' ? 12 : bc === 'f' ? 7 : 0);
    mBass(c, dest, t, mtof(sg.root + semi), len * sdur * 0.9, sg, L >= 4);
  }
  if (L >= 2) {
    const ai = sg.arp[s];
    if (ai >= 0) mArp(c, s % 2 ? tr.panR : tr.panL, t, mtof(sg.root + 24 + chordTone(sg.scale, d, ai)), sg);
  }
  if (L >= 3) {
    for (const ev of sg.lead[bi]) {
      if (ev.s === s) mLead(c, dest, t, mtof(sg.root + 12 + ev.n), ev.len * sdur, sg);
    }
  }
}

function tick() {
  const c = ctx;
  if (!c) return;
  const now = c.currentTime;
  P = slowmo;
  try {
    for (const tr of tracks) {
      if (now > tr.stopAt) {
        tr.dead = true;
        const out = tr.out;
        setTimeout(() => out.disconnect(), 500);
        continue;
      }
      if (tr.next < now - 0.25) tr.next = now + 0.02;
      let guard = 0;
      while (tr.next < now + LOOKAHEAD && guard++ < 64) {
        scheduleStep(c, tr, tr.next);
        tr.next += stepDur(tr.song);
        if (++tr.step >= 16) {
          tr.step = 0;
          tr.bar++;
        }
      }
    }
  } catch {
    // keep scheduler alive
  }
  P = 1;
  tracks = tracks.filter((t) => !t.dead);
  if (!tracks.length && timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function fadeOutTrack(tr: Track, now: number, sec: number) {
  if (tr.stopAt !== Infinity) return;
  const g = tr.out.gain;
  g.cancelScheduledValues(now);
  g.setValueAtTime(mx(g.value, EPS), now);
  g.linearRampToValueAtTime(EPS, now + mx(sec, 0.01));
  tr.stopAt = now + sec + 0.05;
}

function startTrack(track: MusicTrack, stage: number) {
  const c = ctx;
  if (!c || !musicIn) return;
  const st = clamp(Math.round(stage), 1, 7);
  const key = track === 'stage' || track === 'boss' ? `${track}:${st}` : track;
  if (key === currentKey && tracks.some((t) => t.key === key && t.stopAt === Infinity)) return;
  const now = c.currentTime;
  for (const tr of tracks) fadeOutTrack(tr, now, XFADE);
  tracks.push(makeTrack(c, key, buildSong(track, st)));
  currentKey = key;
  if (timer === null) timer = setInterval(tick, TICK_MS);
  tick();
}

// ---------- graph ----------

function buildGraph(c: AudioContext) {
  const len = Math.floor(c.sampleRate * 2);
  noiseBuf = c.createBuffer(1, len, c.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

  const limiter = c.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.1;
  limiter.connect(c.destination);

  masterGain = c.createGain();
  masterGain.gain.value = vols.master;
  masterGain.connect(limiter);

  const sfxComp = c.createDynamicsCompressor();
  sfxComp.threshold.value = -18;
  sfxComp.knee.value = 6;
  sfxComp.ratio.value = 6;
  sfxComp.attack.value = 0.003;
  sfxComp.release.value = 0.15;
  sfxBus = c.createGain();
  sfxBus.gain.value = vols.sfx;
  sfxBus.connect(sfxComp).connect(masterGain);

  const glue = c.createDynamicsCompressor();
  glue.threshold.value = -14;
  glue.knee.value = 8;
  glue.ratio.value = 4;
  glue.attack.value = 0.005;
  glue.release.value = 0.2;
  musicIn = c.createGain();
  duckGain = c.createGain();
  pauseFilter = c.createBiquadFilter();
  pauseFilter.type = 'lowpass';
  pauseFilter.frequency.value = 20000;
  pauseGain = c.createGain();
  musicBus = c.createGain();
  musicBus.gain.value = vols.music;
  musicIn.connect(glue).connect(duckGain).connect(pauseFilter).connect(pauseGain).connect(musicBus).connect(masterGain);
}

// ---------- public API ----------

export const audio = {
  init(): void {
    try {
      if (!ctx) {
        const AC = getAC();
        if (!AC) return;
        ctx = new AC();
        buildGraph(ctx);
        if (pending) {
          const p = pending;
          pending = null;
          startTrack(p.track, p.stage);
        }
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
    } catch {
      // Web Audio unavailable
    }
  },

  setVolumes(v: { master: number; music: number; sfx: number }): void {
    vols.master = clamp(v.master, 0, 1);
    vols.music = clamp(v.music, 0, 1);
    vols.sfx = clamp(v.sfx, 0, 1);
    if (!ctx || !masterGain || !musicBus || !sfxBus) return;
    try {
      const now = ctx.currentTime;
      masterGain.gain.setTargetAtTime(vols.master, now, 0.02);
      musicBus.gain.setTargetAtTime(vols.music, now, 0.02);
      sfxBus.gain.setTargetAtTime(vols.sfx, now, 0.02);
    } catch {
      // ignore
    }
  },

  play(name: Sfx, opts?: { pitch?: number; volume?: number; pan?: number }): void {
    const c = ctx;
    if (!c || !sfxBus) return;
    const build = SFX[name];
    if (!build) return;
    try {
      const now = c.currentTime;
      const hist = (recent.get(name) ?? []).filter((x) => x > now - SAME_SFX_WINDOW);
      if (hist.length >= SAME_SFX_MAX) {
        recent.set(name, hist);
        return;
      }
      voices = voices.filter((e) => e > now);
      if (voices.length >= MAX_VOICES && !PRIORITY.has(name)) return;

      const vary = NO_VARY.has(name) ? 1 : 1 + (Math.random() * 2 - 1) * 0.06;
      P = clamp(opts?.pitch ?? 1, 0.1, 4) * vary;
      const vg = c.createGain();
      vg.gain.value = clamp(opts?.volume ?? 1, 0, 2);
      let tail: AudioNode = vg;
      const pan = opts?.pan;
      if (pan) {
        const sp = makePanner(c);
        if (sp) {
          sp.pan.value = clamp(pan, -1, 1);
          tail = vg.connect(sp);
        }
      }
      tail.connect(sfxBus);
      const end = build(c, vg, now + 0.005);
      P = 1;
      hist.push(now);
      recent.set(name, hist);
      voices.push(end);
      setTimeout(() => {
        vg.disconnect();
        tail.disconnect();
      }, (end - now) * 1000 + 300);
    } catch {
      P = 1;
    }
  },

  music: {
    play(track: MusicTrack, stage = 1): void {
      if (!ctx) {
        pending = { track, stage };
        return;
      }
      try {
        startTrack(track, stage);
      } catch {
        // ignore
      }
    },

    stop(fadeSec = XFADE): void {
      pending = null;
      currentKey = null;
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        for (const tr of tracks) fadeOutTrack(tr, now, fadeSec);
      } catch {
        // ignore
      }
    },

    setIntensity(level: number): void {
      intensity = clamp(Math.round(level), 0, 5);
    },

    duck(amount: number, seconds: number): void {
      if (!ctx || !duckGain) return;
      try {
        const now = ctx.currentTime;
        const g = duckGain.gain;
        g.cancelScheduledValues(now);
        g.setTargetAtTime(clamp(1 - amount, 0, 1), now, 0.05);
        g.setTargetAtTime(1, now + mx(0, seconds), 0.3);
      } catch {
        // ignore
      }
    },

    setPaused(paused: boolean): void {
      if (!ctx || !pauseGain || !pauseFilter) return;
      try {
        const now = ctx.currentTime;
        pauseFilter.frequency.setTargetAtTime(paused ? 700 : 20000, now, 0.08);
        pauseGain.gain.setTargetAtTime(paused ? 0.45 : 1, now, 0.08);
      } catch {
        // ignore
      }
    },

    setSlowmo(factor: number): void {
      slowmo = clamp(factor, 0.2, 2);
    },
  },
};
