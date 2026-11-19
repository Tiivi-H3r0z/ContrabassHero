import { bach, BachTrackId } from './bach';
import tracksData from './tracks.json';
import { bossBeat } from './trackMath';

// Carnage music facade: Bach thrash tracks (procedural) or recorded tracks per stage / boss,
// adaptive intensity, stingers, and a beat clock used by the on-beat bonus and the HUD metronome.
const STAGE_TRACKS: BachTrackId[] = ['toccata', 'prelude', 'bourree', 'prelude', 'toccata', 'bourree', 'toccata'];

// Recorded tracks live in assets/music and are configured in tracks.json by the music studio
// (design/music-studio.html): tempo, beat phase (time of beat 0, aligned on the kick), start and
// loop points in beats, kick map (one 0-9 digit per 16th from beat 0) and drop / break sections in bars.
export type SectionType = 'normal' | 'drop' | 'break';
export interface TrackConfig { bpm: number; phase: number; start: number; loopStart: number; loopEnd: number; kickMin?: number; kicks?: string; kicksFinal?: boolean; sections?: { bar: number; type: SectionType }[]; ramps?: { from: number; to: number }[]; boss?: number | null }
interface FileTrack { url: string; bpm: number; phase: number; start: number; loopStart: number; loopEnd: number; kicks?: string; kickMin: number; sections: { t: number; type: SectionType }[]; ramps: { t0: number; t1: number }[]; bossT: number }
const MP3 = import.meta.glob('../../assets/music/*.mp3', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const urlOf = (file: string) => MP3['../../assets/music/' + file];
const DATA = tracksData as unknown as { slots: Record<string, string>; tracks: Record<string, TrackConfig> };

export const toFileTrack = (url: string, c: TrackConfig): FileTrack => {
  const sec = 60 / c.bpm;
  return {
    url, bpm: c.bpm, phase: c.phase,
    start: c.phase + c.start * sec, loopStart: c.phase + c.loopStart * sec, loopEnd: c.phase + c.loopEnd * sec,
    kicks: c.kicks, kickMin: c.kicksFinal ? 1 : c.kickMin ?? 3,
    ramps: (c.ramps ?? []).map((r) => ({ t0: c.phase + r.from * 4 * sec, t1: c.phase + r.to * 4 * sec })),
    bossT: c.phase + bossBeat(c) * sec,
    sections: (c.sections ?? []).map((x) => ({ t: c.phase + x.bar * 4 * sec, type: x.type })).sort((p, q) => p.t - q.t),
  };
};
const slotTrack = (slot: string): FileTrack | undefined => {
  const file = DATA.slots[slot];
  const cfg = file ? DATA.tracks[file] : undefined;
  const url = file ? urlOf(file) : undefined;
  return cfg && url ? toFileTrack(url, cfg) : undefined;
};
const fileTracks = new Map<string, FileTrack | undefined>();
const trackFor = (slot: string) => {
  if (!fileTracks.has(slot)) fileTracks.set(slot, slotTrack(slot));
  return fileTracks.get(slot);
};

// Preview mode (music studio iframe): no audio here, beats / kicks / sections come from the parent page.
const EXTERNAL = new URLSearchParams(location.search).has('preview');
let extSection: SectionType = 'normal';

let volume = 0.5;
let duckLevel = 1;
let duckTimer = 0;
let paused = false;
let lastBeatAt = 0;
let beatInterval = 0.4;
let beatCount = 0;
const beatListeners = new Set<(n: number) => void>();
const kickListeners = new Set<(strength: number) => void>();
let bachIntensity = 0;
let lastKickStep = -1;
const dropListeners = new Set<() => void>();
let extRamp = -1;
let lastRampPos = -1;
// Audio -> visual sync offset in ms (positive = effects later), calibrated in the music studio (same origin).
let fxOffset = 0;
const readOffset = () => { try { fxOffset = (parseFloat(localStorage.getItem('ch-fx-offset-ms') ?? '0') || 0) / 1000; } catch { fxOffset = 0; } };
readOffset();
window.addEventListener('storage', (e) => { if (e.key === 'ch-fx-offset-ms') readOffset(); });

// ---------- recorded track player ----------
let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let filter: BiquadFilterNode | null = null;
let src: AudioBufferSourceNode | null = null;
let current: FileTrack | null = null;
let wanted: FileTrack | null = null;
let startedAt = 0;
let fileBeatTimer = 0;
let lastFileBeat = -1;
const buffers = new Map<string, Promise<AudioBuffer>>();

const ensureCtx = () => {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 22000;
  filter.Q.value = 0.5;
  gain = ctx.createGain();
  gain.gain.value = 0;
  filter.connect(gain).connect(ctx.destination);
  return ctx;
};

const loadBuffer = (url: string) => {
  const c = ensureCtx();
  if (!c) return Promise.reject(new Error('no audio'));
  let p = buffers.get(url);
  if (!p) {
    p = fetch(url).then((r) => r.arrayBuffer()).then((b) => c.decodeAudioData(b));
    buffers.set(url, p);
  }
  return p;
};

// Position inside the file, accounting for the loop.
const filePos = () => {
  if (!ctx || !current || !src) return -1;
  const latency = (ctx as AudioContext & { outputLatency?: number }).outputLatency || ctx.baseLatency || 0;
  const t = current.start + (ctx.currentTime - startedAt - latency - fxOffset);
  if (t < current.loopEnd) return t;
  const len = current.loopEnd - current.loopStart;
  return current.loopStart + ((t - current.loopEnd) % len);
};

const fileGainTarget = () => volume * duckLevel * (paused ? 0.4 : 1);

const stopFile = (fade = 0.6) => {
  wanted = null;
  if (!ctx || !src || !gain) { current = null; return; }
  const s = src;
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0, now + fade);
  s.stop(now + fade + 0.05);
  src = null;
  current = null;
  clearInterval(fileBeatTimer);
};

const playFile = (t: FileTrack) => {
  if (current === t && src) return;
  wanted = t;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  loadBuffer(t.url).then((buf) => {
    if (wanted !== t || !ctx || !gain || !filter) return;
    if (src) { try { src.stop(); } catch { /* already stopped */ } }
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.loopStart = t.loopStart;
    s.loopEnd = Math.min(t.loopEnd, buf.duration);
    s.connect(filter);
    startedAt = ctx.currentTime + 0.02;
    s.start(startedAt, t.start);
    src = s;
    current = t;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(fileGainTarget(), now + 0.08);
    beatInterval = 60 / t.bpm;
    lastFileBeat = -1;
    clearInterval(fileBeatTimer);
    fileBeatTimer = window.setInterval(() => {
      const p = filePos();
      if (p < 0 || !current) return;
      if (current.kicks) {
        const step = Math.floor((p - current.phase) / (beatInterval / 4) + 0.5);
        if (step !== lastKickStep) {
          lastKickStep = step;
          const d = current.kicks.charCodeAt(step) - 48;
          if (d >= current.kickMin && d <= 9) kickListeners.forEach((l) => l(d / 9));
        }
      }
      if (lastRampPos >= 0 && p > lastRampPos && p - lastRampPos < 0.5) {
        for (const r of current.ramps) if (lastRampPos < r.t1 && p >= r.t1) dropListeners.forEach((l) => l());
      }
      lastRampPos = p;
      const k = Math.floor((p - current.phase) / beatInterval);
      if (k !== lastFileBeat) {
        lastFileBeat = k;
        beatCount = k;
        lastBeatAt = performance.now() / 1000;
        beatListeners.forEach((l) => l(k));
      }
    }, 10);
  }).catch(() => { /* missing file: stays silent */ });
};

const apply = () => {
  bach.setVolume(volume * duckLevel * (paused ? 0.4 : 1));
  if (ctx && gain && src) gain.gain.setTargetAtTime(fileGainTarget(), ctx.currentTime, 0.05);
};

if (EXTERNAL) {
  window.addEventListener('message', (ev) => {
    const m = ev.data as { type?: string; k?: number; n?: number; s?: SectionType; bpm?: number; p?: number };
    if (!m || typeof m.type !== 'string') return;
    if (m.type === 'mh-kick' && typeof m.k === 'number') kickListeners.forEach((l) => l(m.k!));
    else if (m.type === 'mh-beat' && typeof m.n === 'number') {
      if (m.bpm) beatInterval = 60 / m.bpm;
      beatCount = m.n;
      lastBeatAt = performance.now() / 1000;
      beatListeners.forEach((l) => l(m.n!));
    } else if (m.type === 'mh-section' && m.s) extSection = m.s;
    else if (m.type === 'mh-ramp' && typeof m.p === 'number') extRamp = m.p;
    else if (m.type === 'mh-drop') dropListeners.forEach((l) => l());
  });
}

bach.onBeat((beat) => {
  if (current || EXTERNAL) return;
  const now = performance.now() / 1000;
  if (lastBeatAt > 0) {
    const dt = now - lastBeatAt;
    if (dt > 0.15 && dt < 1.2) beatInterval = beatInterval * 0.7 + dt * 0.3;
  }
  lastBeatAt = now;
  beatCount = beat;
  beatListeners.forEach((l) => l(beat));
  // procedural tracks have a four-on-the-floor kick from intensity 2
  if (bachIntensity >= 2) kickListeners.forEach((l) => l(beat % 4 === 0 ? 1 : 0.65));
});

export const music = {
  init() {
    if (EXTERNAL) return;
    bach.init();
    const c = ensureCtx();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
    apply();
  },
  setVolume(v: number) { volume = v; apply(); },
  play(kind: 'menu' | 'stage' | 'boss', stage = 1) {
    if (EXTERNAL) return;
    const file = kind === 'menu' ? undefined : trackFor(kind + '-' + stage);
    if (file) {
      if (bach.isPlaying()) bach.stop(0.4);
      playFile(file);
      return;
    }
    if (current || wanted) stopFile(0.5);
    const id: BachTrackId = kind === 'menu' ? 'menu' : kind === 'boss' ? (stage >= 7 ? 'toccata' : 'badinerie') : STAGE_TRACKS[(stage - 1) % 7];
    if (bach.current() === id && bach.isPlaying()) return;
    bach.play(id, kind === 'boss' ? 4 : kind === 'menu' ? 2 : 1);
  },
  stop(fade = 0.8) { bach.stop(fade); stopFile(fade); },
  setIntensity(level: number) {
    const l = Math.max(0, Math.min(6, level));
    bachIntensity = l;
    bach.setIntensity(l);
    // Recorded tracks: slightly muffled at low combo, fully open from mezzo-forte.
    if (ctx && filter) filter.frequency.setTargetAtTime(l <= 0 ? 4500 : l === 1 ? 9000 : 22000, ctx.currentTime, 0.25);
  },
  sting(kind: 'finale' | 'boss' | 'death' | 'carnage') { if (!EXTERNAL) bach.sting(kind); },
  duck(amount: number, seconds: number) {
    duckLevel = 1 - amount;
    apply();
    clearTimeout(duckTimer);
    duckTimer = window.setTimeout(() => { duckLevel = 1; apply(); }, seconds * 1000);
  },
  setPaused(p: boolean) { paused = p; apply(); },
  // Distance in seconds from the nearest beat (0 = exactly on it). Infinity when no music clock.
  beatError(): number {
    if (current) {
      const p = filePos();
      if (p < 0) return Infinity;
      const since = (((p - current.phase) % beatInterval) + beatInterval) % beatInterval;
      return Math.min(since, beatInterval - since);
    }
    if (!bach.isPlaying() || lastBeatAt === 0) return Infinity;
    const now = performance.now() / 1000;
    const since = (now - lastBeatAt) % beatInterval;
    return Math.min(since, beatInterval - since);
  },
  beatInterval: () => beatInterval,
  // re-read the audio -> visual / input sync offset (after a calibration in the same page)
  refreshSync() { readOffset(); },
  // Music clock of the recorded track (what is heard now, latency compensated) and its grid. Null without a file track.
  clock(): { t: number; bpm: number; phase: number } | null {
    if (!current) {
      // procedural Bach: extrapolate from the last beat (less precise than a file track)
      if (EXTERNAL || !bach.isPlaying() || lastBeatAt === 0) return null;
      const t = beatCount * beatInterval + (performance.now() / 1000 - lastBeatAt) - fxOffset;
      return { t, bpm: 60 / beatInterval, phase: 0 };
    }
    const p = filePos();
    return p < 0 ? null : { t: p, bpm: current.bpm, phase: current.phase };
  },
  // Current drop / break section of the recorded track (drives the strength of the kick FX).
  // Music time when the boss arrives (stage tracks), and when play started; null without a file track.
  bossTime(): { at: number; from: number } | null { return current ? { at: current.bossT, from: current.start } : null; },
  // Progress 0..1 inside a build-up (ramp), -1 outside.
  rampProgress(): number {
    if (EXTERNAL) return extRamp;
    if (!current || !current.ramps.length) return -1;
    const p = filePos();
    for (const r of current.ramps) if (p >= r.t0 && p < r.t1) return (p - r.t0) / (r.t1 - r.t0);
    return -1;
  },
  // Is a drop (end of a build-up) within `win` seconds of music time t? Returns the distance (s) or null.
  dropNear(t: number, win: number): number | null {
    if (!current) return null;
    for (const r of current.ramps) if (Math.abs(t - r.t1) <= win) return t - r.t1;
    return null;
  },
  onDrop(cb: () => void) { dropListeners.add(cb); return () => { dropListeners.delete(cb); }; },
  section(): SectionType {
    if (EXTERNAL) return extSection;
    if (!current || !current.sections.length) return 'normal';
    const p = filePos();
    let t: SectionType = 'normal';
    for (const x of current.sections) { if (x.t <= p) t = x.type; else break; }
    return t;
  },
  beat: () => beatCount,
  onBeat(cb: (n: number) => void) { beatListeners.add(cb); return () => { beatListeners.delete(cb); }; },
  onKick(cb: (strength: number) => void) { kickListeners.add(cb); return () => { kickListeners.delete(cb); }; },
};
