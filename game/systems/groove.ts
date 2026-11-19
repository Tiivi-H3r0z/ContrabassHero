// Groove: rhythm recognition for player inputs (light hit "f", heavy hit "F", dash "D").
// Every input is judged against the music grid (16th notes). In-rhythm inputs feed a chain; the chain is
// scanned for repeated motifs (any rhythm, any subdivision, up to 2 bars). Repeated motifs raise the Groove
// gauge, more for complex / syncopated / varied motifs; named motifs (COMBOS) add a special effect and
// steer the hero's transformation family. No punishment off rhythm: the input just does not count.

export type Sym = 'f' | 'F' | 'D';
export type Family = 'base' | 'eclair' | 'colosse' | 'virtuose';
export type Grade = 'parfait' | 'bien' | 'juste';

export interface GrooveNote { sym: Sym; step: number; t: number; err: number; grade: Grade }

export interface ComboDef {
  id: string;
  name: string;
  family: Family;
  // one char per 16th, '.' = rest; the string length is the cycle length. Matched in any rotation.
  pattern: string;
  effect: string;
  look: string;
  // all notes must sit off the quarter beats (syncopation)
  offbeat?: boolean;
  // effect implemented in the game (shown in the in-game move list)
  ingame?: boolean;
}

export const COMBOS: ComboDef[] = [
  { id: 'pulsation', name: 'Pulsation', family: 'base', pattern: 'f...', effect: '+5 % de dégâts par cycle (jusqu\'à +15 %).', look: 'Aura qui bat sur le temps.', ingame: true },
  { id: 'marche', name: 'Marche funèbre', family: 'eclair', pattern: 'D...', effect: 'Les dashs traversent les profs et les entaillent.', look: 'Images rémanentes bleues.', ingame: true },
  { id: 'marteau', name: 'Marteau', family: 'colosse', pattern: 'F...', effect: 'Chaque coup fort frappe en zone (3 m).', look: 'Le sol se fissure sous chaque coup.', ingame: true },
  { id: 'mitraille', name: 'Mitraille', family: 'eclair', pattern: 'f', effect: 'Vitesse de frappe ×2, petits coups en chaîne.', look: 'Cheveux dressés, poings flous.' },
  { id: 'pingpong', name: 'Ping-pong', family: 'virtuose', pattern: 'f.F.', effect: 'Les coups rebondissent entre deux profs.', look: 'Trait de lumière entre les cibles.' },
  { id: 'boutoir', name: 'Coup de boutoir', family: 'colosse', pattern: 'f...f...f...F...', effect: 'Le coup fort part en onde de choc (6 m), profs renversés.', look: 'Le héros gonfle à chaque mesure.', ingame: true },
  { id: 'galop', name: 'Galop', family: 'colosse', pattern: 'D...D...D...F...', effect: 'Le coup fort devient une charge de 8 m.', look: 'Traînée d\'encre, sabots de feu.', ingame: true },
  { id: 'hemiole', name: 'Hémiole', family: 'virtuose', pattern: 'D...f...F...', effect: '3 lames d\'encre en orbite pendant 4 temps.', look: 'Le motif de 3 glisse sur la mesure de 4.' },
  { id: 'cavalcade', name: 'Cavalcade', family: 'eclair', pattern: 'D.D.F...', effect: 'Les dashs laissent des empreintes qui explosent.', look: 'Éclairs au sol.' },
  { id: 'uppercut', name: 'Éclair-pique', family: 'eclair', pattern: 'DfF.', effect: 'Dash + double coup en un battement, projette en l\'air.', look: 'Silhouette étirée, foudre.' },
  { id: 'toccata', name: 'Toccata', family: 'virtuose', pattern: 'DD..f...F...', effect: 'Tuyaux d\'orgue qui jaillissent du sol sur le coup fort.', look: 'Colonnes de lumière.' },
  { id: 'tresillo', name: 'Tresillo', family: 'virtuose', pattern: 'f..f..f.', effect: 'Notes dorées en orbite, tirées sur les profs à chaque cycle.', look: 'Aura dorée.' },
  { id: 'roulement', name: 'Roulement de tambour', family: 'eclair', pattern: 'DDDDDDDDF.......', effect: 'Tornade qui aspire les profs, le coup fort la fait exploser.', look: 'Tourbillon bleu.' },
  { id: 'syncope', name: 'Syncope', family: 'virtuose', pattern: '..f.', offbeat: true, effect: 'Chaque coup à contretemps est critique.', look: 'Les fantômes tapent dans leurs mains sur 2 et 4.' },
];

// Special events that are not loops.
export const SPECIALS = {
  chute: { name: 'Chute', family: 'colosse' as Family, effect: 'Coup renforcé et onde de choc, bonus de groove selon le motif cassé.', how: 'Casser un motif en cours avec une autre touche sur le premier temps d\'une mesure (D D D D… puis F sur le 1).', ingame: true },
  drop: { name: 'DROP', family: 'colosse' as Family, effect: 'Explosion géante : tous les profs autour volent, gros bonus de groove.', how: 'Pendant une montée de la musique, frappe en rythme, puis un coup fort pile sur le drop.', ingame: true },
  pointOrgue: { name: "Point d'orgue", family: 'colosse' as Family, effect: 'Le temps se fige, puis coup énorme : tous les profs à l\'écran sont sonnés.', how: 'En plein groove, un temps de silence, puis un coup fort sur le premier temps d\'une mesure.' },
  contrepoint: { name: 'Contrepoint', family: 'virtuose' as Family, effect: 'Éclair de transformation : palier suivant immédiatement.', how: 'Un motif, puis le même joué à l\'envers (D f F puis F f D).' },
  variation: { name: 'Variation', family: 'virtuose' as Family, effect: 'Bonus de groove quand tu enchaînes un motif nouveau.', how: 'Changer de motif sans casser le rythme.' },
};

export const TIERS = [
  { name: 'Échauffement', at: 0 },
  { name: 'Rythmé', at: 8 },
  { name: 'En transe', at: 22 },
  { name: 'Virtuose', at: 42 },
  { name: 'Maestro', at: 70 },
  { name: 'LÉGENDE', at: 105 },
];
export const GROOVE_MAX = 140;
// gameplay power per tier (damage and move speed multipliers)
export const TIER_POWER = [1, 1.1, 1.2, 1.35, 1.5, 1.75];

export interface Motif {
  syms: Sym[];
  gaps: number[]; // gap (in 16ths) after each note, cyclic
  length: number; // cycle length in 16ths
  reps: number;
  combo: ComboDef | null;
  complexity: number;
  key: string;
}

export type GrooveEvent =
  | { kind: 'cycle'; motif: Motif; gain: number; fresh: boolean }
  | { kind: 'variation'; motif: Motif; gain: number }
  | { kind: 'special'; id: 'pointOrgue' | 'contrepoint' | 'chute' | 'drop'; gain: number; sym?: Sym }
  | { kind: 'tier'; tier: number; up: boolean };

export interface InputResult { inRhythm: boolean; note: GrooveNote | null; err: number; events: GrooveEvent[] }

const rotations = (syms: Sym[], gaps: number[]) => syms.map((_, r) => ({ syms: [...syms.slice(r), ...syms.slice(0, r)], gaps: [...gaps.slice(r), ...gaps.slice(0, r)] }));

// pattern string -> syms + gaps
const parse = (p: string) => {
  const syms: Sym[] = [], pos: number[] = [];
  for (let i = 0; i < p.length; i++) if (p[i] !== '.') { syms.push(p[i] as Sym); pos.push(i); }
  const gaps = pos.map((x, i) => (i + 1 < pos.length ? pos[i + 1] - x : p.length - x + pos[0]));
  return { syms, gaps };
};
// offbeat variants first: they share their rhythm key with the on-beat ones
const PARSED = COMBOS.map((c) => ({ c, ...parse(c.pattern) })).sort((a, b) => Number(!!b.c.offbeat) - Number(!!a.c.offbeat));

export const motifKey = (syms: Sym[], gaps: number[]) => {
  // rotation-invariant key: the lexicographically smallest rotation
  return rotations(syms, gaps).map((r) => r.syms.map((s, i) => s + r.gaps[i]).join(' ')).sort()[0];
};

export const patternOf = (m: Pick<Motif, 'syms' | 'gaps'>) => {
  let s = '';
  m.syms.forEach((x, i) => { s += x + '.'.repeat(m.gaps[i] - 1); });
  return s;
};

export class Groove {
  value = 0;
  tier = 0;
  family: Record<Family, number> = { base: 0, eclair: 0, colosse: 0, virtuose: 0 };
  chain: GrooveNote[] = [];
  motif: Motif | null = null;
  recent: string[] = []; // keys of the last motifs (variety)
  lastIn = -1e9;
  // set by the game: 0.5 when the player has not moved (dash / step) for 2 bars
  gainMul = 1;
  // timing tolerance multiplier (difficulty)
  tolerance: number;
  constructor(tolerance = 1.2) { this.tolerance = tolerance; }

  private window(step: number, stepLen: number) {
    const w = step % 4 === 0 ? 0.09 : step % 2 === 0 ? 0.06 : Math.min(0.04, stepLen * 0.42);
    return w * this.tolerance;
  }

  input(sym: Sym, t: number, bpm: number, phase: number): InputResult {
    const S = 15 / bpm;
    const step = Math.round((t - phase) / S);
    const err = t - (phase + step * S);
    const events: GrooveEvent[] = [];
    if (Math.abs(err) > this.window(step, S)) return { inRhythm: false, note: null, err, events };
    const a = Math.abs(err);
    const grade: Grade = a < 0.025 ? 'parfait' : a < 0.05 ? 'bien' : 'juste';
    const note: GrooveNote = { sym, step, t, err, grade };
    const prev = this.chain[this.chain.length - 1];
    // one note per 16th: a second press in the same step replaces the first
    if (prev && prev.step === step) this.chain.pop();
    const before = this.chain[this.chain.length - 1];
    const gap = before ? step - before.step : 0;
    // point d'orgue: groove going, one beat or more of silence, heavy hit on a downbeat
    if (before && sym === 'F' && gap >= 8 && gap <= 20 && step % 16 === 0 && this.value >= TIERS[1].at) {
      const g = 10 + this.tier * 3;
      events.push({ kind: 'special', id: 'pointOrgue', gain: g });
      this.add(g, events);
      this.family.colosse += 4;
    }
    // chute: an established motif is broken by another key on the first beat of a bar
    const m = this.motif;
    if (before && m && m.reps >= 2 && step % 16 === 0 && sym !== before.sym && gap <= 8) {
      const P = m.syms.length;
      const expected = m.syms[0], expGap = m.gaps[P - 1];
      if (sym !== expected || gap !== expGap) {
        const g = 2 + 1.5 * m.complexity + Math.min(4, m.reps * 0.5);
        events.push({ kind: 'special', id: 'chute', gain: g, sym });
        this.add(g, events);
        this.family[sym === 'D' ? 'eclair' : sym === 'F' ? 'colosse' : 'virtuose'] += 2;
      }
    }
    if (before && gap > 32) this.chain = [];
    this.chain.push(note);
    if (this.chain.length > 48) this.chain.shift();
    this.lastIn = t;
    const per = grade === 'parfait' ? 1 : grade === 'bien' ? 0.75 : 0.45;
    // mashing fast pays per note, but less than a varied rhythm
    this.add((0.12 + 0.1 * Math.min(4, gap || 4)) * per * this.capMul(), events);
    this.family[sym === 'D' ? 'eclair' : sym === 'F' ? 'colosse' : 'base'] += 0.15;
    this.detect(events);
    return { inRhythm: true, note, err, events };
  }

  // Scan the chain for a repeated motif (largest window first, reduced to its fundamental period).
  private detect(events: GrooveEvent[]) {
    const c = this.chain;
    for (let L = Math.min(12, Math.floor((c.length - 1) / 2)); L >= 1; L--) {
      const n = c.length;
      let ok = true;
      for (let i = 0; i < L && ok; i++) {
        const a = n - 1 - i, b = n - 1 - L - i;
        if (c[a].sym !== c[b].sym || c[a].step - c[a - 1].step !== c[b].step - c[b - 1].step) ok = false;
      }
      if (!ok) continue;
      // cycle = the last L notes; gaps after each note (the last one wraps to the next cycle)
      const syms = c.slice(n - L).map((x) => x.sym);
      // the gap after the last note repeats the one that led into this cycle
      const gaps = c.slice(n - L).map((x, i) => (i + 1 < L ? c[n - L + i + 1].step - x.step : c[n - L].step - c[n - L - 1].step));
      const length = gaps.reduce((s, g) => s + g, 0);
      if (length < 1 || length > 32 || gaps.some((g) => g <= 0)) continue;
      // reduce to the fundamental period
      let fs = syms, fg = gaps;
      for (let p = 1; p < L; p++) {
        if (L % p) continue;
        let per = true;
        for (let i = p; i < L && per; i++) if (syms[i] !== syms[i - p] || gaps[i] !== gaps[i - p]) per = false;
        if (per) { fs = syms.slice(0, p); fg = gaps.slice(0, p); break; }
      }
      // repetitions: how many whole cycles back the chain keeps matching
      const P = fs.length;
      let reps = 1;
      for (let k = 1; n - 1 - k * P - P >= 0; k++) {
        let same = true;
        for (let i = 0; i < P && same; i++) {
          const a = n - 1 - i, b = n - 1 - k * P - i;
          if (b < 1 || c[a].sym !== c[b].sym || c[a].step - c[a - 1].step !== c[b].step - c[b - 1].step) same = false;
        }
        if (!same) break;
        reps = k + 1;
      }
      this.onMotif(fs, fg, reps, events);
      return;
    }
  }

  private onMotif(syms: Sym[], gaps: number[], reps: number, events: GrooveEvent[]) {
    // a one-note motif needs 3 hits to count (two equal hits are just a coincidence)
    if (reps < 2 || (syms.length === 1 && reps < 3)) return;
    const key = motifKey(syms, gaps);
    const length = gaps.reduce((s, g) => s + g, 0);
    const steps = this.chain.slice(-syms.length).map((x) => x.step);
    let combo: ComboDef | null = null;
    for (const p of PARSED) {
      if (motifKey(p.syms, p.gaps) !== key) continue;
      if (p.c.offbeat && steps.some((s) => s % 4 === 0)) continue;
      combo = p.c; break;
    }
    const complexity = this.complexity(syms, gaps, steps);
    const sameAsCurrent = this.motif?.key === key;
    // a cycle completes when the newest note closes a whole period
    const newCycle = !sameAsCurrent || reps > (this.motif?.reps ?? 0);
    const prevMotif = this.motif;
    this.motif = { syms, gaps, length, reps, combo, complexity, key };
    if (!newCycle) return;
    if (!sameAsCurrent) {
      // contrepoint: the new motif is the previous one played backwards
      if (prevMotif && syms.length >= 3 && motifKey([...syms].reverse(), this.reverseGaps(gaps)) === prevMotif.key && key !== prevMotif.key) {
        const g = Math.max(15, (TIERS[Math.min(5, this.tier + 1)].at - this.value) + 1);
        events.push({ kind: 'special', id: 'contrepoint', gain: g });
        this.add(g, events);
        this.family.virtuose += 5;
      } else if (prevMotif && !this.recent.includes(key)) {
        const g = 2.5 * complexity;
        events.push({ kind: 'variation', motif: this.motif, gain: g });
        this.add(g, events);
        this.family.virtuose += complexity * 0.6;
      }
      this.recent.push(key);
      if (this.recent.length > 4) this.recent.shift();
    }
    // repeating the same motif forever pays less and less: variety is king
    const novelty = 1 / (1 + 0.35 * Math.max(0, reps - 2));
    // gain per cycle scales with the cycle length, so a 1-note loop does not farm the gauge
    const g = 1.6 * complexity * (combo ? 1.35 : 1) * novelty * Math.min(1.5, length / 8) * this.capMul();
    events.push({ kind: 'cycle', motif: this.motif, gain: g, fresh: !sameAsCurrent });
    this.add(g, events);
    if (combo && combo.family !== 'base') this.family[combo.family] += 1.2;
    if (complexity >= 2.5) this.family.virtuose += 0.5;
  }

  private reverseGaps(gaps: number[]) {
    // playing notes in reverse order: gap after note i becomes the gap before it
    const n = gaps.length;
    return gaps.map((_, i) => gaps[(n - 2 - i + n) % n]);
  }

  // 1 (four on the floor) .. ~5 (varied, syncopated, dense)
  complexity(syms: Sym[], gaps: number[], steps: number[]) {
    const ds = new Set(syms).size, dg = new Set(gaps).size;
    const sync = steps.reduce((s, x) => s + (x % 2 === 1 ? 1 : x % 4 === 2 ? 0.5 : 0), 0) / Math.max(1, steps.length);
    const length = gaps.reduce((s, g) => s + g, 0);
    const density = (syms.length / Math.max(1, length)) * 4; // notes per beat
    const odd = length % 4 !== 0 ? 0.5 : 0; // cycles that slide over the bar (hemiola)
    return 1 + 0.6 * (ds - 1) + 0.5 * (dg - 1) + 0.12 * (syms.length - 1) + 1.2 * sync + (density > 2 ? 0.3 : 0) + odd;
  }

  // A repeated motif can only lift the gauge up to a ceiling set by its complexity:
  // four on the floor stays at "Rythmé", only varied / complex play climbs higher.
  capMul() {
    const cap = this.motif ? 21 + 16 * (this.motif.complexity - 1) : 16;
    return this.value >= cap ? 0.08 : 1;
  }

  // external bonus (build-ups, drops)
  bonus(g: number): GrooveEvent[] { const ev: GrooveEvent[] = []; this.add(g, ev); return ev; }

  private add(g: number, events: GrooveEvent[]) {
    if (g > 0) g *= this.gainMul;
    this.value = Math.min(GROOVE_MAX, this.value + g);
    this.retier(events);
  }

  private retier(events: GrooveEvent[]) {
    let t = 0;
    for (let i = 0; i < TIERS.length; i++) if (this.value >= TIERS[i].at) t = i;
    // a little hysteresis on the way down
    if (t < this.tier && this.value > TIERS[this.tier].at - 4) t = this.tier;
    if (t !== this.tier) { events.push({ kind: 'tier', tier: t, up: t > this.tier }); this.tier = t; }
  }

  // Decay when the rhythm stops. `t` is the music clock.
  update(dt: number, t: number, beatLen: number): GrooveEvent[] {
    const events: GrooveEvent[] = [];
    const idle = t - this.lastIn;
    // the higher the tier, the faster it drains: you have to keep feeding it with new motifs
    const drain = idle > beatLen * 2 ? 2.5 + this.value * 0.06 : this.value * (0.012 + 0.01 * this.tier);
    this.value = Math.max(0, this.value - drain * dt);
    if (idle > beatLen * 8) { this.chain = []; this.motif = null; }
    for (const k of Object.keys(this.family) as Family[]) this.family[k] *= Math.pow(0.97, dt);
    this.retier(events);
    return events;
  }

  dominantFamily(): Family {
    let best: Family = 'base', v = 2;
    for (const k of ['eclair', 'colosse', 'virtuose'] as Family[]) if (this.family[k] > v) { v = this.family[k]; best = k; }
    return best;
  }

  power() { return TIER_POWER[this.tier]; }

  reset() { this.value = 0; this.tier = 0; this.chain = []; this.motif = null; this.recent = []; for (const k of Object.keys(this.family) as Family[]) this.family[k] = 0; }
}
