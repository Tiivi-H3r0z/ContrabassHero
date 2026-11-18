import type { CharacterType } from '../../types';
import type { KillStyle } from './Enemies';

export type FlowAnim = 'sweepR' | 'sweepL' | 'overhead' | 'spin' | 'uppercut' | 'kick' | 'flurry' | 'slam' | 'juggle';

export interface FlowMove {
  id: string;
  anim: FlowAnim;
  dur: number;        // total move time (s), scaled by hero attack speed
  at: number;         // impact time (s)
  hits: number[];     // impact moments as fractions of `at` (multi-hit moves)
  dmg: number;        // per hit
  kb: number;
  launch: number;
  aoe: number;        // splash radius around the impact (0 = focused on the target)
  reach: number;      // beyond this distance the hero lunges first
  guard?: boolean;    // breaks CPE shields
  heavy?: boolean;
  finisher?: boolean;
  style?: KillStyle;
  hop?: number;       // hero jump velocity at start
  word?: string;      // shout popped on impact
}

const M = (m: FlowMove) => m;

export const MOVES = {
  jab: M({ id: 'jab', anim: 'sweepR', dur: 0.24, at: 0.07, hits: [1], dmg: 20, kb: 7, launch: 0, aoe: 0, reach: 3.2 }),
  revers: M({ id: 'revers', anim: 'sweepL', dur: 0.24, at: 0.07, hits: [1], dmg: 20, kb: 7, launch: 0, aoe: 0, reach: 3.2 }),
  rafale: M({ id: 'rafale', anim: 'flurry', dur: 0.34, at: 0.2, hits: [0.35, 0.68, 1], dmg: 10, kb: 3, launch: 0, aoe: 0, reach: 3, word: 'RAFALE !' }),
  uppercut: M({ id: 'uppercut', anim: 'uppercut', dur: 0.3, at: 0.09, hits: [1], dmg: 22, kb: 3, launch: 13, aoe: 0, reach: 3, word: 'UPPERCUT !' }),
  jongle: M({ id: 'jongle', anim: 'juggle', dur: 0.28, at: 0.1, hits: [1], dmg: 22, kb: 2, launch: 9, aoe: 1.2, reach: 3.4, hop: 12 }),
  smash: M({ id: 'smash', anim: 'overhead', dur: 0.36, at: 0.12, hits: [1], dmg: 36, kb: 4, launch: 0, aoe: 1.6, reach: 3.4, heavy: true, finisher: true, style: 'flat', word: 'CRÊPE !' }),
  briseGarde: M({ id: 'briseGarde', anim: 'overhead', dur: 0.34, at: 0.11, hits: [1], dmg: 30, kb: 12, launch: 6, aoe: 0, reach: 3.4, guard: true, heavy: true, word: 'GARDE BRISÉE !' }),
  toupie: M({ id: 'toupie', anim: 'spin', dur: 0.42, at: 0.14, hits: [1], dmg: 26, kb: 14, launch: 4, aoe: 5, reach: 2.6, guard: true, heavy: true, word: 'TOUPIE !' }),
  volee: M({ id: 'volee', anim: 'kick', dur: 0.32, at: 0.06, hits: [1], dmg: 28, kb: 18, launch: 3, aoe: 1.6, reach: 2.6, word: 'VOLÉE !' }),
  ecrase: M({ id: 'ecrase', anim: 'slam', dur: 0.46, at: 0.2, hits: [1], dmg: 30, kb: 9, launch: 8, aoe: 3.4, reach: 3.2, guard: true, heavy: true, style: 'flat', hop: 9, word: 'ÉCRASE !' }),
  lanceur: M({ id: 'lanceur', anim: 'uppercut', dur: 0.34, at: 0.1, hits: [1], dmg: 30, kb: 4, launch: 16, aoe: 1.8, reach: 3.4, guard: true, heavy: true, word: 'EN L\'AIR !' }),
  contre: M({ id: 'contre', anim: 'sweepL', dur: 0.32, at: 0.06, hits: [1], dmg: 45, kb: 18, launch: 9, aoe: 1.8, reach: 3.4, guard: true, heavy: true, word: 'CONTRE !' }),
};

// Hero-specific shout for the finisher (style of each instrument).
export const FINISH_WORDS: Record<CharacterType, string> = {
  armand: 'CODA !', adrien: 'BADABOUM !', eliot: 'POWER CHORD !', swan: 'FORTISSIMO !', pierre: 'TOCCATA !', audrey: 'CONTRE-UT !',
};

export interface MoveContext {
  airborne: boolean;
  shielded: boolean;
  lethalSmash: boolean;
  crowd: number;
  lungeDist: number;
  chain: number;
  last: string;
  launcher: boolean;
  hasTarget: boolean;
}

// Contextual move choice: never the same move twice in a row, situation first, then variety.
export const chooseMove = (c: MoveContext): FlowMove => {
  const pick = (m: FlowMove, alt: FlowMove) => (m.id === c.last ? alt : m);
  if (c.launcher) return c.airborne ? MOVES.jongle : MOVES.lanceur;
  if (!c.hasTarget) return pick(MOVES.jab, MOVES.revers);
  if (c.airborne) return pick(MOVES.jongle, MOVES.uppercut);
  if (c.shielded) return MOVES.briseGarde;
  if (c.lethalSmash && c.last !== 'smash') return MOVES.smash;
  if (c.crowd >= 4 && c.last !== 'toupie') return MOVES.toupie;
  if (c.lungeDist > 5 && c.last !== 'volee') return MOVES.volee;
  if (c.chain > 0 && c.chain % 6 === 5) return pick(MOVES.ecrase, MOVES.toupie);
  const cycle = [MOVES.jab, MOVES.revers, MOVES.uppercut, MOVES.jab, MOVES.rafale, MOVES.revers];
  return pick(cycle[c.chain % cycle.length], MOVES.revers.id === c.last ? MOVES.jab : MOVES.revers);
};
