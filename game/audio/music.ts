import { bach, BachTrackId } from './bach';

// Carnage music facade: Bach thrash tracks per stage / boss, adaptive intensity, stingers, beat clock.
const STAGE_TRACKS: BachTrackId[] = ['toccata', 'prelude', 'bourree', 'prelude', 'toccata', 'bourree', 'toccata'];

let volume = 0.5;
let duckLevel = 1;
let duckTimer = 0;
let paused = false;
let lastBeatAt = 0;
let beatInterval = 0.4;
let beatCount = 0;
const beatListeners = new Set<(n: number) => void>();

const apply = () => bach.setVolume(volume * duckLevel * (paused ? 0.4 : 1));

bach.onBeat((beat) => {
  const now = performance.now() / 1000;
  if (lastBeatAt > 0) {
    const dt = now - lastBeatAt;
    if (dt > 0.15 && dt < 1.2) beatInterval = beatInterval * 0.7 + dt * 0.3;
  }
  lastBeatAt = now;
  beatCount = beat;
  beatListeners.forEach((l) => l(beat));
});

export const music = {
  init() { bach.init(); apply(); },
  setVolume(v: number) { volume = v; apply(); },
  play(kind: 'menu' | 'stage' | 'boss', stage = 1) {
    const id: BachTrackId = kind === 'menu' ? 'menu' : kind === 'boss' ? (stage >= 7 ? 'toccata' : 'badinerie') : STAGE_TRACKS[(stage - 1) % 7];
    if (bach.current() === id && bach.isPlaying()) return;
    bach.play(id, kind === 'boss' ? 4 : kind === 'menu' ? 2 : 1);
  },
  stop(fade = 0.8) { bach.stop(fade); },
  setIntensity(level: number) { bach.setIntensity(Math.max(0, Math.min(6, level))); },
  sting(kind: 'finale' | 'boss' | 'death' | 'carnage') { bach.sting(kind); },
  duck(amount: number, seconds: number) {
    duckLevel = 1 - amount;
    apply();
    clearTimeout(duckTimer);
    duckTimer = window.setTimeout(() => { duckLevel = 1; apply(); }, seconds * 1000);
  },
  setPaused(p: boolean) { paused = p; apply(); },
  // Distance in seconds from the nearest beat (0 = exactly on it). Infinity when no music clock.
  beatError(): number {
    if (!bach.isPlaying() || lastBeatAt === 0) return Infinity;
    const now = performance.now() / 1000;
    const since = (now - lastBeatAt) % beatInterval;
    return Math.min(since, beatInterval - since);
  },
  beatInterval: () => beatInterval,
  beat: () => beatCount,
  onBeat(cb: (n: number) => void) { beatListeners.add(cb); return () => { beatListeners.delete(cb); }; },
};
