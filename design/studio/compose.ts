import type { Analysis } from './analysis';
import { kickMap } from './analysis';
import type { KickRule, Ramp, SectionType, TrackDoc } from './model';

// Final punch map = detected kicks (low band) -> learnt style -> light snare punches in breaks
// -> build-up templates and drop explosions -> manual edits. One digit 0-9 per 16th from beat 0.

export const SRC = { none: 0, auto: 1, rule: 2, brk: 3, ramp: 4, drop: 5, edit: 6 } as const;

export interface Composed { digits: Uint8Array; src: Uint8Array; base: Uint8Array; kickBar: boolean[] }

export const toDigits = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0) - 48);

// Bars that carry a kick groove (the learnt style only applies there, never in breaks).
export const kickBars = (base: Uint8Array, kickMin: number) => {
  const nb = Math.ceil(base.length / 16);
  const sums: number[] = [];
  for (let b = 0; b < nb; b++) {
    let s = 0;
    for (let i = b * 16; i < Math.min(base.length, b * 16 + 16); i++) if (base[i] >= kickMin) s += base[i];
    sums.push(s);
  }
  const nz = sums.filter((x) => x > 0).sort((p, q) => p - q);
  const med = nz[Math.floor(nz.length / 2)] ?? 0;
  return sums.map((x) => med > 0 && x >= med * 0.3);
};

const sectionsByBar = (d: TrackDoc, nb: number): SectionType[] => {
  const out: SectionType[] = new Array(nb).fill('normal');
  const sorted = [...d.sections].sort((a, b) => a.bar - b.bar);
  for (let k = 0; k < sorted.length; k++) {
    const end = k + 1 < sorted.length ? sorted[k + 1].bar : nb;
    for (let b = Math.max(0, sorted[k].bar); b < Math.min(nb, end); b++) out[b] = sorted[k].type;
  }
  return out;
};

// Light punches on the snares / claps (8th grid) for breaks: 1..3.
export const snareMap = (a: Analysis, bpm: number, phase: number, n: number) => {
  const st = 15 / bpm;
  const raw = new Float32Array(n);
  for (let s = 0; s < n; s += 2) {
    const t = phase + s * st;
    if (t < 0) continue;
    let m = 0;
    for (let i = Math.max(0, Math.floor((t - 0.015) / a.hiHop)); i <= Math.min(a.snareOn.length - 1, Math.floor((t + 0.03) / a.hiHop)); i++) if (a.snareOn[i] > m) m = a.snareOn[i];
    raw[s] = m;
  }
  const so = Array.from(raw.filter((_, i) => i % 2 === 0)).sort((p, q) => p - q);
  const ref = so[Math.floor(so.length * 0.95)] || 1, floor = so[Math.floor(so.length * 0.55)] ?? 0;
  return Uint8Array.from(raw, (v) => {
    const k = (v - floor) / Math.max(1e-12, ref - floor);
    return k < 0.3 ? 0 : Math.min(3, 1 + Math.round(k * 2));
  });
};

// Build-up template: half notes -> beats -> 8ths -> 16ths, strength 2 -> 9.
export const rampValue = (i: number, N: number) => {
  const p = i / N;
  const every = p < 0.25 ? 8 : p < 0.5 ? 4 : p < 0.75 ? 2 : 1;
  return i % every === 0 ? Math.round(2 + 7 * Math.pow(p, 1.4)) : 0;
};

export const compose = (a: Analysis, d: TrackDoc, autoKicks?: string): Composed => {
  const base = toDigits(autoKicks ?? kickMap(a, d.bpm, d.phase));
  const n = base.length;
  const nb = Math.ceil(n / 16);
  const digits = new Uint8Array(n), src = new Uint8Array(n);
  const kb = kickBars(base, d.kickMin);
  const secs = sectionsByBar(d, nb);
  const inRamp = new Uint8Array(nb);
  for (const r of d.ramps ?? []) for (let b = Math.max(0, r.from); b < Math.min(nb, r.to); b++) inRamp[b] = 1;
  const snares = d.breakPunch !== false && secs.includes('break') ? snareMap(a, d.bpm, d.phase, n) : null;
  const rule = d.ruleOn !== false ? d.kickRule : undefined;
  for (let s = 0; s < n; s++) {
    const bar = s >> 4, p = s & 15, b = base[s];
    if (secs[bar] === 'break' && snares && !inRamp[bar]) {
      digits[s] = snares[s]; src[s] = snares[s] ? SRC.brk : SRC.none;
    } else if (rule && kb[bar]) {
      const keep = b >= rule.thr[p];
      digits[s] = keep ? Math.max(1, rule.level[p] ?? b) : 0;
      src[s] = keep ? SRC.rule : SRC.none;
    } else {
      digits[s] = b >= d.kickMin ? b : 0;
      src[s] = digits[s] ? SRC.auto : SRC.none;
    }
  }
  for (const r of d.ramps ?? []) {
    const s0 = r.from * 16, N = (r.to - r.from) * 16;
    for (let i = 0; i < N; i++) {
      const s = s0 + i;
      if (s < 0 || s >= n) continue;
      digits[s] = rampValue(i, N);
      src[s] = digits[s] ? SRC.ramp : SRC.none;
    }
    const drop = r.to * 16;
    if (drop >= 0 && drop < n) { digits[drop] = 9; src[drop] = SRC.drop; }
  }
  for (const [k, v] of Object.entries(d.kickEdits)) {
    const s = +k;
    if (s >= 0 && s < n) { digits[s] = v; src[s] = SRC.edit; }
  }
  return { digits, src, base, kickBar: kb };
};

// Learn the punch style from a passage the user edited by hand ([fromBar, toBar)).
export const learnRule = (d: TrackDoc, base: Uint8Array, fromBar: number, toBar: number): KickRule | null => {
  const thr: number[] = [], level: (number | null)[] = [];
  let tp = 0, fp = 0, fn = 0, edited = 0;
  const inRamp = (bar: number) => (d.ramps ?? []).some((r) => bar >= r.from && bar < r.to);
  for (let p = 0; p < 16; p++) {
    const samples: { b: number; f: number; e: boolean }[] = [];
    for (let bar = fromBar; bar < toBar; bar++) {
      if (inRamp(bar)) continue;
      const s = bar * 16 + p;
      if (s >= base.length) continue;
      const e = d.kickEdits[s] !== undefined;
      if (e) edited++;
      samples.push({ b: base[s], f: e ? d.kickEdits[s] : base[s] >= d.kickMin ? base[s] : 0, e });
    }
    let best = d.kickMin, bestErr = Infinity;
    for (let t = 0; t <= 10; t++) {
      // a punch you wanted and the rule misses costs more than an extra one
      const e = samples.reduce((acc, x) => acc + (x.b >= t && !(x.f > 0) ? 1 : !(x.b >= t) && x.f > 0 ? 2 : 0), 0);
      if (e < bestErr || (e === bestErr && Math.abs(t - d.kickMin) < Math.abs(best - d.kickMin))) { bestErr = e; best = t; }
    }
    thr.push(best);
    for (const x of samples) { const pr = x.b >= best, tr = x.f > 0; if (pr && tr) tp++; else if (pr) fp++; else if (tr) fn++; }
    const kept = samples.filter((x) => x.e && x.f > 0);
    level.push(kept.length ? Math.round(kept.reduce((acc, x) => acc + x.f, 0) / kept.length) : null);
  }
  if (!edited || tp + fn === 0) return null;
  // F1 on the punches only (empty steps would inflate a plain accuracy)
  return { thr, level, from: fromBar, to: toBar, accuracy: (2 * tp) / (2 * tp + fp + fn) };
};

export const rampsOverlap = (ramps: Ramp[], r: Ramp) => ramps.some((x) => x.from < r.to && r.from < x.to);
