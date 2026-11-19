// Shared by the game (music.ts) and the music studio: where the boss arrives in a recorded track.
// Default: on the end of the 2nd build-up (the 2nd drop), at least 90 s after the in-game start,
// always before the loop end. Positions in beats from beat 0.
export interface BossTrackInfo { bpm: number; start: number; loopEnd: number; ramps?: { from: number; to: number }[]; boss?: number | null }

export const MIN_STAGE_SECONDS = 90;

export const bossBeat = (c: BossTrackInfo) => {
  const B = 60 / c.bpm;
  if (typeof c.boss === 'number') return Math.min(c.boss, c.loopEnd - 1);
  const minBeat = c.start + Math.ceil(MIN_STAGE_SECONDS / B);
  const drops = (c.ramps ?? []).map((r) => r.to * 4).sort((a, b) => a - b);
  let b = (drops.length >= 2 && drops[1] >= minBeat ? drops[1] : drops.find((d) => d >= minBeat)) ?? minBeat + Math.round(10 / B);
  b = Math.min(b, c.loopEnd - 4);
  return b;
};
