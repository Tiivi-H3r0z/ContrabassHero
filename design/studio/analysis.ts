import type { Ramp, Section, SectionType, TrackDoc } from './model';

// Offline analysis of a decoded track: 3-band waveform, onset envelopes, tempo / phase / downbeat,
// kick map and a first section / loop proposal. Same method as the offline scripts used for stage 1.

export interface Analysis {
  duration: number;
  bucketSec: number;
  peak: Float32Array; // max |x| per bucket
  low: Float32Array; // rms per bucket, < 200 Hz
  mid: Float32Array; // 200 Hz - 2.5 kHz
  high: Float32Array; // > 2.5 kHz
  lowFlux: Float32Array; // kick onsets (2-pole low-pass at 110 Hz, positive energy flux)
  lowHop: number;
  hiFlux: Float32Array; // hats / snares onsets
  snareOn: Float32Array; // 200 Hz - 2.5 kHz onsets (hiHop), used for light punches in breaks
  hiHop: number;
  maxPeak: number;
  bandRef: [number, number, number]; // 99th percentile of each band, for display scaling
}

export const analyze = (buf: AudioBuffer): Analysis => {
  const sr = buf.sampleRate;
  const L = buf.getChannelData(0);
  const R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
  const n = L.length;
  const bucket = 256;
  const nb = Math.ceil(n / bucket);
  const peak = new Float32Array(nb), low = new Float32Array(nb), mid = new Float32Array(nb), high = new Float32Array(nb);
  const lowHopS = Math.round(sr * 0.0025), hiHopS = Math.round(sr * 0.005);
  const lowE = new Float32Array(Math.ceil(n / lowHopS) + 1), hiE = new Float32Array(Math.ceil(n / hiHopS) + 1);
  const a200 = 1 - Math.exp((-2 * Math.PI * 200) / sr);
  const a2500 = 1 - Math.exp((-2 * Math.PI * 2500) / sr);
  const a110 = 1 - Math.exp((-2 * Math.PI * 110) / sr);
  const midE = new Float32Array(hiE.length);
  let l1 = 0, l2 = 0, k1 = 0, k2 = 0, px = 0;
  let pk = 0, sl = 0, sm = 0, sh = 0, eK = 0, eH = 0, eM = 0;
  let maxPeak = 0;
  for (let i = 0; i < n; i++) {
    const x = (L[i] + R[i]) * 0.5;
    l1 += a200 * (x - l1);
    l2 += a2500 * (x - l2);
    const lo = l1, md = l2 - l1, hi = x - l2;
    k1 += a110 * (x - k1);
    k2 += a110 * (k1 - k2);
    eK += k2 * k2;
    const h = x - px; px = x;
    eH += h * h;
    const ax = x < 0 ? -x : x;
    if (ax > pk) pk = ax;
    sl += lo * lo; sm += md * md; sh += hi * hi; eM += md * md;
    if ((i + 1) % bucket === 0 || i === n - 1) {
      const b = Math.floor(i / bucket);
      const c = (i % bucket) + 1;
      peak[b] = pk; low[b] = Math.sqrt(sl / c); mid[b] = Math.sqrt(sm / c); high[b] = Math.sqrt(sh / c);
      if (pk > maxPeak) maxPeak = pk;
      pk = 0; sl = 0; sm = 0; sh = 0;
    }
    if ((i + 1) % lowHopS === 0) { lowE[Math.floor(i / lowHopS)] = eK; eK = 0; }
    if ((i + 1) % hiHopS === 0) { const j = Math.floor(i / hiHopS); hiE[j] = eH; midE[j] = eM; eH = 0; eM = 0; }
  }
  const flux = (e: Float32Array) => {
    const f = new Float32Array(e.length);
    for (let i = 1; i < e.length; i++) f[i] = Math.max(0, e[i] - e[i - 1]);
    return f;
  };
  // attack sharpness: log rise over the previous 10 ms, weighted by the level (sustained sub-bass gives no rise)
  const sharp = (e: Float32Array, back: number) => {
    const o = new Float32Array(e.length);
    for (let i = back; i < e.length; i++) {
      let prev = 0;
      for (let j = i - back; j < i; j++) prev += e[j];
      prev /= back;
      const r = Math.log((e[i] + 1e-12) / (prev + 1e-12));
      o[i] = r > 0 ? r * Math.sqrt(e[i]) : 0;
    }
    return o;
  };
  const p99 = (x: Float32Array) => { const s = Array.from(x.filter((_, i) => i % 7 === 0)).sort((p, q) => p - q); return s[Math.floor(s.length * 0.99)] || 1; };
  return { duration: n / sr, bucketSec: bucket / sr, peak, low, mid, high, lowFlux: flux(lowE), lowHop: lowHopS / sr, hiFlux: flux(hiE), hiHop: hiHopS / sr, snareOn: sharp(midE, 2), maxPeak: maxPeak || 1, bandRef: [p99(low), p99(mid), p99(high)] };
};

// Loudness (rms of the three bands) averaged over [t0, t1).
const loudness = (a: Analysis, t0: number, t1: number, band?: 'low') => {
  const b0 = Math.max(0, Math.floor(t0 / a.bucketSec)), b1 = Math.min(a.peak.length, Math.ceil(t1 / a.bucketSec));
  let s = 0;
  for (let b = b0; b < b1; b++) s += band === 'low' ? a.low[b] : a.low[b] + a.mid[b] + a.high[b];
  return b1 > b0 ? s / (b1 - b0) : 0;
};

const median = (xs: number[]) => {
  const s = [...xs].sort((p, q) => p - q);
  return s[Math.floor(s.length / 2)] ?? 0;
};

// Tempo by comb contrast on the kick (beat) and hat (half-beat) envelopes, phase on the kick, downbeat by novelty.
export const detectGrid = (a: Analysis): { bpm: number; phase: number } => {
  const lo5 = new Float32Array(Math.floor(a.lowFlux.length / 2));
  for (let i = 0; i < lo5.length; i++) lo5[i] = Math.max(a.lowFlux[2 * i], a.lowFlux[2 * i + 1]);
  const hi5 = a.hiFlux;
  const hop = a.hiHop;
  const mean = (e: Float32Array, t0: number, t1: number) => { let s = 0; for (let i = t0; i < t1; i++) s += e[i]; return s / Math.max(1, t1 - t0); };
  // analysed range: skip the quiet intro
  const sec = 1;
  const loud: number[] = [];
  for (let t = 0; t < a.duration; t += sec) loud.push(loudness(a, t, t + sec));
  const med = median(loud);
  const first = Math.max(0, loud.findIndex((v) => v > med * 0.6));
  const t0 = Math.floor((first * sec) / hop), t1 = Math.min(lo5.length, hi5.length) - 1;
  const mLo = mean(lo5, t0, t1) || 1, mHi = mean(hi5, t0, t1) || 1;
  const contrast = (e: Float32Array, m: number, period: number) => {
    let best = 0, bestO = 0;
    for (let o = 0; o < period; o++) {
      let s = 0, c = 0;
      for (let t = t0 + o; t < t1; t += period) { s += e[Math.round(t)]; c++; }
      const v = s / Math.max(1, c);
      if (v > best) { best = v; bestO = o; }
    }
    return { c: best / m, o: bestO };
  };
  const score = (bpm: number) => {
    const p = 60 / bpm / hop;
    return contrast(lo5, mLo, p).c + 0.8 * contrast(hi5, mHi, p / 2).c;
  };
  let bestBpm = 120, bestS = -1;
  for (let bpm = 95; bpm < 200; bpm += 0.25) {
    const s = score(bpm);
    if (s > bestS) { bestS = s; bestBpm = bpm; }
  }
  for (let bpm = bestBpm - 0.3; bpm <= bestBpm + 0.3; bpm += 0.01) {
    const s = score(bpm);
    if (s > bestS) { bestS = s; bestBpm = bpm; }
  }
  // round to 0.05 when it is within the measuring noise (Suno exports sit on round tempos)
  const r = Math.round(bestBpm * 20) / 20;
  const bpm = Math.abs(score(r) - bestS) / bestS < 0.01 ? r : Math.round(bestBpm * 100) / 100;
  // 16th grid from the hats (precise, every 16th is played), then the beat = the 16th offset where the kicks hit
  const T = 60 / bpm;
  const st = T / 4;
  const pf = st / hop;
  let gO = 0, gV = -1;
  for (let o = 0; o < pf; o += 0.25) {
    let s = 0;
    for (let t = t0 + o; t < t1; t += pf) s += hi5[Math.round(t)] / mHi + 0.5 * lo5[Math.round(t)] / mLo;
    if (s > gV) { gV = s; gO = o; }
  }
  const grid = ((t0 + gO) * hop) % st;
  const kickAt = (t: number) => {
    const i = Math.round(t / a.lowHop);
    let m = 0;
    for (let j = i - 4; j <= i + 4; j++) m = Math.max(m, a.lowFlux[j] ?? 0);
    return m;
  };
  const kickSum = [0, 0, 0, 0];
  for (let q = 0; q < 4; q++) for (let t = grid + q * st + first * sec; t < a.duration; t += T) kickSum[q] += kickAt(t);
  let phase = grid + kickSum.indexOf(Math.max(...kickSum)) * st;
  // downbeat: the most consistent kick of the bar is on "1" (holds for 4/4, two-step DnB and halftime tearout)
  const bars = [0, 0, 0, 0];
  for (let k = 0; phase + k * T < a.duration; k++) if (phase + k * T > first * sec) bars[k % 4] += kickAt(phase + k * T);
  phase += bars.indexOf(Math.max(...bars)) * T;
  phase = ((phase % (4 * T)) + 4 * T) % (4 * T);
  return { bpm, phase: Math.round(phase * 10000) / 10000 };
};

// One 0-9 digit per 16th from beat 0: kick strength from the low-band flux around each grid step.
export const kickMap = (a: Analysis, bpm: number, phase: number): string => {
  const step = 15 / bpm;
  const n = Math.max(0, Math.floor((a.duration - phase) / step));
  const raw = new Float32Array(n);
  for (let s = 0; s < n; s++) {
    const t = phase + s * step;
    if (t < 0) continue;
    const i0 = Math.max(0, Math.floor((t - 0.02) / a.lowHop)), i1 = Math.min(a.lowFlux.length - 1, Math.floor((t + 0.035) / a.lowHop));
    let mx = 0;
    for (let i = i0; i <= i1; i++) if (a.lowFlux[i] > mx) mx = a.lowFlux[i];
    raw[s] = mx;
  }
  const sorted = Array.from(raw).sort((p, q) => p - q);
  const ref = sorted[Math.floor(sorted.length * 0.97)] || 1;
  const noise = sorted[Math.floor(sorted.length * 0.6)] ?? 0;
  let out = '';
  for (let s = 0; s < n; s++) {
    const k = (raw[s] - noise) / Math.max(1e-12, ref - noise);
    out += String(Math.max(0, Math.min(9, Math.round(k * 9))));
  }
  return out;
};

// Section / start / loop proposal from bar loudness, decided per 4-bar phrase.
export const proposeStructure = (a: Analysis, bpm: number, phase: number, kicks?: string): Pick<TrackDoc, 'start' | 'loopStart' | 'loopEnd' | 'sections' | 'ramps'> => {
  const bar = (4 * 60) / bpm;
  const nBars = Math.max(1, Math.floor((a.duration - phase) / bar));
  const k = kicks ?? kickMap(a, bpm, phase);
  const loud: number[] = [], dens: number[] = [], lowE: number[] = [];
  for (let b = 0; b < nBars; b++) {
    const t = phase + b * bar;
    loud.push(loudness(a, t, t + bar));
    lowE.push(loudness(a, t, t + bar, 'low'));
    let d = 0;
    for (let i = b * 16; i < Math.min(k.length, b * 16 + 16); i++) { const v = k.charCodeAt(i) - 48; if (v >= 5) d += v; }
    dens.push(d);
  }
  const mL = median(loud) || 1, mD = median(dens.filter((x) => x > 0)) || 1, mK = median(lowE) || 1;
  // per 4-bar phrase: break = the bass / kick drops out, drop = the strongest kick passages
  const cls: SectionType[] = [];
  const full: boolean[] = [];
  for (let p = 0; p < nBars; p += 4) {
    let l = 0, d = 0, k = 0, c = 0;
    for (let b = p; b < Math.min(nBars, p + 4); b++) { l += loud[b] / mL; d += dens[b] / mD; k += lowE[b] / mK; c++; }
    l /= c; d /= c; k /= c;
    const type: SectionType = k < 0.5 || l < 0.65 ? 'break' : d > 0.9 && l > 1 ? 'drop' : 'normal';
    for (let b = p; b < Math.min(nBars, p + 4); b++) { cls.push(type); full.push(l >= 0.78 && k >= 0.45); }
  }
  const sections: Section[] = [];
  let prev: SectionType | null = null;
  for (let b = 0; b < nBars; b += 4) {
    if (cls[b] !== prev) { sections.push({ bar: b, type: cls[b] }); prev = cls[b]; }
  }
  if (sections.length && sections[0].type === 'normal' && sections[0].bar === 0) sections.shift();
  // build-ups: the end of every break that leads back into the kick
  const ramps: Ramp[] = [];
  for (let b = 0; b < nBars;) {
    if (cls[b] !== 'break') { b++; continue; }
    let e = b;
    while (e < nBars && cls[e] === 'break') e++;
    const len = e - b;
    if (e < nBars) ramps.push({ from: e - (len >= 16 ? 8 : len >= 8 ? 4 : len), to: e });
    b = e;
  }
  // start on the first full-energy phrase (skips any build-up), loop until the last one before the outro
  let startBar = full.findIndex((x) => x);
  if (startBar < 0) startBar = 0;
  let endBar = nBars;
  while (endBar > startBar + 8 && cls[endBar - 1] === 'break') endBar--;
  endBar = startBar + Math.max(8, Math.floor((endBar - startBar) / 4) * 4);
  endBar = Math.min(endBar, nBars);
  return { start: startBar * 4, loopStart: startBar * 4, loopEnd: endBar * 4, sections, ramps };
};

// Snap a time to the strongest kick onset within +-40 ms (anchor magnet).
export const snapToOnset = (a: Analysis, t: number, win = 0.04) => {
  const i0 = Math.max(0, Math.floor((t - win) / a.lowHop)), i1 = Math.min(a.lowFlux.length - 1, Math.ceil((t + win) / a.lowHop));
  let best = -1, bi = -1;
  for (let i = i0; i <= i1; i++) if (a.lowFlux[i] > best) { best = a.lowFlux[i]; bi = i; }
  // flux frame i covers the hop ending at (i + 1) * hop: the onset sits at its start
  return bi >= 0 && best > 0 ? bi * a.lowHop : t;
};
