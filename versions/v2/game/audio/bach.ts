// Baroque-metal procedural music engine: Bach through a metal amp. Everything is synthesized (Web Audio API).

export type BachTrackId = 'toccata' | 'prelude' | 'bourree' | 'badinerie' | 'menu';
type StingKind = 'finale' | 'boss' | 'death' | 'carnage';

export const BACH_TRACKS: { id: BachTrackId; title: string; subtitle: string; bwv: string; bpm: number }[] = [
  { id: 'toccata', title: 'Toccata pour tronçonneuse', subtitle: "L'orgue de la cathédrale démarre au quart de tour, les blast beats suivent.", bwv: 'BWV 565', bpm: 180 },
  { id: 'prelude', title: 'Prélude en Do à 240 BPM', subtitle: 'Le prélude le plus sage du monde, joué par un clavecin sous amphétamines.', bwv: 'BWV 846', bpm: 240 },
  { id: 'bourree', title: "Bourrée de l'enfer", subtitle: 'Une danse de cour en mi mineur, chaussée de doubles pédales.', bwv: 'BWV 996', bpm: 160 },
  { id: 'badinerie', title: 'Badinerie au marteau-piqueur', subtitle: 'La flûte la plus rapide du baroque contre un mur de blast beats.', bwv: 'BWV 1067', bpm: 200 },
  { id: 'menu', title: 'Air sur la corde grave', subtitle: "L'Air de Bach au ralenti, sur un bourdon saturé qui gronde sous les dalles.", bwv: 'BWV 1068', bpm: 60 },
];

// ---------- utils ----------

const LOOKAHEAD = 0.12;
const TICK_MS = 25;
const XFADE = 0.4;
const CAP = 220;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const rnd = (a: number) => (Math.random() * 2 - 1) * a;
const fold = (m: number, lo: number) => {
  let x = m;
  while (x >= lo + 12) x -= 12;
  while (x < lo) x += 12;
  return x;
};

// ---------- music notation ----------

type Note = [number, number, number]; // [midi, startStep (16ths, may be fractional), lengthSteps]

const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const accOf = (a?: string) => (a === '#' ? 1 : a === 'b' ? -1 : 0);

function nm(s: string): number {
  const m = /^([A-G])([#b]?)(\d)$/.exec(s);
  if (!m) return 60;
  return 12 * (Number(m[3]) + 1) + LETTER[m[1]] + accOf(m[2]);
}

/** "A5@0:1 G5@1:1" -> notes */
function N(spec: string): Note[] {
  return spec.trim().split(/\s+/).map((tok) => {
    const [n, rest] = tok.split('@');
    const [st, ln] = rest.split(':');
    return [nm(n), Number(st), Number(ln)] as Note;
  });
}

/** evenly spaced notes: "A5 G5 F5" every `each` steps from `start` */
function seq(names: string, start = 0, each = 1): Note[] {
  return names.trim().split(/\s+/).map((n, i) => [nm(n), start + i * each, each] as Note);
}

const oct = (ns: Note[], d: number): Note[] => ns.map(([m, s, l]) => [m + d, s, l] as Note);
const dbl = (ns: Note[], d = -12): Note[] => ns.concat(oct(ns, d));

interface Chord { k: string; r: number; iv: number[]; b: number; p5: number }

const QUAL: Record<string, number[]> = {
  '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11], o: [0, 3, 6], o7: [0, 3, 6, 9], '5': [0, 7],
};

function chord(s: string): Chord {
  const m = /^([A-G])([#b]?)(m7|M7|m|7|o7|o|5)?(?:\/([A-G])([#b]?))?$/.exec(s);
  if (!m) return { k: 'Dm', r: 2, iv: QUAL.m, b: 2, p5: 7 };
  const r = (LETTER[m[1]] + accOf(m[2]) + 12) % 12;
  const iv = QUAL[m[3] ?? ''];
  const b = m[4] ? (LETTER[m[4]] + accOf(m[5]) + 12) % 12 : r;
  return { k: s, r, iv, b, p5: iv.includes(7) ? 7 : 6 };
}

const voicing = (c: Chord, lo: number) => c.iv.map((i) => fold(c.r + i, lo)).sort((a, b) => a - b);

// ---------- song model ----------

type Hit = 'k' | 's' | 'c' | 'x' | 't' | 'm' | 'l';

interface BarSpec {
  len?: number;
  bpm?: number;
  ch: string[]; // chords spread evenly over the bar
  hi: Note[]; // harpsichord (lead) line
  lo?: Note[]; // explicit harpsichord left hand
  bass?: Note[]; // explicit bass guitar
  riff?: Note[]; // guitars (and bass, one octave down) play this single-note riff instead of chords
  org?: Note[]; // explicit organ
  choir?: Note[]; // explicit choir
  hits?: [number, Hit][]; // explicit drum hits
  gtr?: string; // guitar rhythm override
  derive?: string; // derived layers: g=guitars b=bass d=drums o=organ c=choir l=left hand
  fill?: boolean;
  crash?: boolean;
}

interface Bar {
  len: number;
  bpm?: number;
  ch: Chord[];
  hi: Note[][];
  lo: Note[][] | null;
  bass: Note[][] | null;
  riff: Note[][] | null;
  org: Note[][] | null;
  choir: Note[][] | null;
  hits: Hit[][] | null;
  gtr?: string;
  d: { g: boolean; b: boolean; d: boolean; o: boolean; c: boolean; l: boolean };
  fill: boolean;
  crash: boolean;
}

interface Lv { bass: number; drums: number; gtr: number; org: number; choir: number; drone: number; flute: number }

interface Song {
  id: BachTrackId;
  bpm: number;
  res: 1 | 2; // drum grid: 1 = 16ths, 2 = 8ths
  half: boolean; // half-time drum feel
  phrase: number;
  bassPat: string; // r=root o=octave f=fifth t=third
  gtr: string[]; // guitar rhythm for levels 3,4,5,6 — X=open chord, p=palm mute, -=hold
  lh: 'oct' | 'walk' | 'none';
  org: 'stab' | 'pad';
  flute: boolean;
  drone: number;
  harpVel: number;
  lv: Lv;
  intro: Bar[];
  loop: Bar[];
}

function bucket<T>(items: T[] | undefined, len: number, at: (x: T) => number): T[][] | null {
  if (!items) return null;
  const out: T[][] = Array.from({ length: len }, () => []);
  for (const it of items) {
    const i = Math.floor(at(it));
    if (i >= 0 && i < len) out[i].push(it);
  }
  return out;
}

function mk(s: BarSpec, def = 'gbdocl'): Bar {
  const len = s.len ?? 16;
  const dv = s.derive ?? def;
  const nb = (ns?: Note[]) => bucket(ns, len, (n) => n[1]);
  const hits = s.hits ? bucket(s.hits, len, (h) => h[0]) : null;
  return {
    len,
    bpm: s.bpm,
    ch: s.ch.map(chord),
    hi: nb(s.hi) ?? [],
    lo: nb(s.lo),
    bass: nb(s.bass),
    riff: nb(s.riff),
    org: nb(s.org),
    choir: nb(s.choir),
    hits: hits ? hits.map((a) => a.map((h) => h[1])) : null,
    gtr: s.gtr,
    d: { g: dv.includes('g'), b: dv.includes('b'), d: dv.includes('d'), o: dv.includes('o'), c: dv.includes('c'), l: dv.includes('l') },
    fill: !!s.fill,
    crash: !!s.crash,
  };
}

const LV: Lv = { bass: 1, drums: 2, gtr: 3, org: 4, choir: 5, drone: 9, flute: 2 };

// ---------- 1. Toccata BWV 565 ----------

// Opening statement: A (mordent A-G-A), pause, G F E D (32nds), C# held, D held (fermata feel).
const TOC_STMT = N('A5@0:0.25 G5@0.25:0.25 A5@0.5:3.5 G5@6:0.5 F5@6.5:0.5 E5@7:0.5 D5@7.5:0.5 C#5@8:4 D5@12:8');
// Same motif squeezed into one 16th-note bar for the thrash section.
const TOC_MOTIF = N('A5@0:1 G5@1:1 A5@2:4 G5@6:1 F5@7:1 E5@8:1 D5@9:1 C#5@10:2 D5@12:4');
const STMT_HITS: [number, Hit][] = [[0, 'l'], [8, 'k'], [8, 'c'], [12, 'k'], [12, 'x'], [12, 'c']];
const STMT_CHOIR = N('A4@8:4 C#5@8:4 E5@8:4 D4@12:8 F4@12:8 A4@12:8');

/** pedal-tone figuration under a top note T with chord tones a > b > c */
const ped = (T: string, a: string, b: string, c: string) => seq(`${T} ${a} ${T} ${b} ${T} ${c} ${T} ${b} ${T} ${a} ${b} ${c} ${b} ${a} ${T} ${a}`);
/** sweep arpeggio over 8 ascending chord tones: up, down, turn */
const sweep = (tones: string) => {
  const t = tones.trim().split(/\s+/);
  return seq([...t, t[6], t[5], t[4], t[3], t[2], t[1], t[0], t[1]].join(' '));
};

const TOCCATA: Song = {
  id: 'toccata', bpm: 180, res: 1, half: false, phrase: 4,
  bassPat: 'r.r.r.r.r.r.r.o.',
  gtr: ['X-p-p-p-X-p-p-p-', 'X-ppX-ppX-ppX-pp', 'XpppXpppXpppXppp', 'Xppppppppppppppp'],
  lh: 'oct', org: 'stab', flute: false, drone: 0, harpVel: 0.2, lv: LV,
  intro: [
    mk({ len: 20, bpm: 76, ch: ['A7', 'Dm'], hi: dbl(TOC_STMT), riff: oct(TOC_STMT, -36), bass: N('A1@0:6 A1@8:4 D2@12:8'),
      org: dbl(TOC_STMT).concat(N('A2@0:6 D2@12:8')), choir: STMT_CHOIR, hits: STMT_HITS }, ''),
    mk({ len: 20, bpm: 76, ch: ['A7', 'Dm'], hi: dbl(oct(TOC_STMT, -12)), riff: oct(TOC_STMT, -36), bass: N('A1@0:6 A1@8:4 D2@12:8'),
      org: dbl(oct(TOC_STMT, -12)).concat(N('A2@0:6 D2@12:8')), choir: STMT_CHOIR, hits: STMT_HITS }, ''),
    mk({ len: 20, bpm: 76, ch: ['A7', 'Dm'], hi: dbl(oct(TOC_STMT, -24)), riff: oct(TOC_STMT, -36), bass: N('A1@0:6 A1@8:4 D1@12:8'),
      org: dbl(oct(TOC_STMT, -24)).concat(N('D2@12:8')), choir: STMT_CHOIR, hits: STMT_HITS.concat([[12, 's']]) }, ''),
    // rolled diminished seventh over the low D pedal, resolving to D major
    mk({ len: 16, bpm: 76, ch: ['C#o7', 'C#o7', 'C#o7', 'D'], gtr: 'X-----------X---',
      hi: N('D2@0:16 C#3@1:11 E3@2:10 G3@3:9 Bb3@4:8 C#4@5:7 E4@6:6 G4@7:5 Bb4@8:4 C#5@9:3 ' +
        'D3@12:4 F#3@12.1:3.9 A3@12.2:3.8 D4@12.3:3.7 F#4@12.4:3.6 A4@12.5:3.5 D5@12.6:3.4'),
      bass: N('D1@0:12 D1@12:4'),
      org: N('D2@0:16 C#4@8:4 E4@8:4 G4@8:4 Bb4@8:4 D4@12:4 F#4@12:4 A4@12:4 D5@12:4'),
      choir: N('C#4@4:8 E4@4:8 G4@4:8 Bb4@4:8 D4@12:4 F#4@12:4 A4@12:4'),
      hits: [[0, 'l'], [2, 'l'], [4, 'm'], [6, 'm'], [8, 't'], [9, 't'], [10, 't'], [11, 't'], [12, 'k'], [12, 'c'], [12, 'x']] }, 'g'),
    // cascade down the dominant into the thrash section
    mk({ ch: ['A7'], hi: seq('A5 G5 F5 E5 D5 C#5 Bb4 A4 G4 F4 E4 D4 C#4 E4 A4 C#5'), gtr: 'X-------pppppppp', fill: true, crash: true }, 'gbdl'),
  ],
  loop: [
    // descending-fifths sequence with pedal-tone figuration (i iv VII III VI ii° V i)
    mk({ ch: ['Dm'], hi: ped('D6', 'A5', 'F5', 'D5') }),
    mk({ ch: ['Gm'], hi: ped('D6', 'Bb5', 'G5', 'D5') }),
    mk({ ch: ['C'], hi: ped('C6', 'G5', 'E5', 'C5') }),
    mk({ ch: ['F'], hi: ped('C6', 'A5', 'F5', 'C5') }),
    mk({ ch: ['Bb'], hi: ped('Bb5', 'F5', 'D5', 'Bb4') }),
    mk({ ch: ['Eo'], hi: ped('Bb5', 'G5', 'E5', 'Bb4') }),
    mk({ ch: ['A7'], hi: ped('A5', 'G5', 'E5', 'C#5') }),
    mk({ ch: ['Dm'], hi: ped('A5', 'F5', 'D5', 'A4') }),
    // the motif as a unison riff
    mk({ ch: ['Dm'], hi: dbl(TOC_MOTIF), riff: oct(TOC_MOTIF, -36) }),
    mk({ ch: ['Dm'], hi: dbl(oct(TOC_MOTIF, -12)), riff: oct(TOC_MOTIF, -36) }),
    mk({ ch: ['Gm', 'A7'], hi: seq('G5 D5 Bb4 D5 G5 D5 Bb4 D5 A5 E5 C#5 E5 A5 E5 C#5 E5') }),
    mk({ ch: ['C#o7'], hi: seq('C#4 E4 G4 Bb4 C#5 E5 G5 Bb5 C#6 Bb5 G5 E5 C#5 Bb4 G4 E4') }),
    // sweep-picked harpsichord: i VI iv V
    mk({ ch: ['Dm'], hi: sweep('D4 F4 A4 D5 F5 A5 D6 F6') }),
    mk({ ch: ['Bb'], hi: sweep('D4 F4 Bb4 D5 F5 Bb5 D6 F6') }),
    mk({ ch: ['Gm'], hi: sweep('D4 G4 Bb4 D5 G5 Bb5 D6 G6') }),
    mk({ ch: ['A7'], hi: sweep('C#4 E4 G4 A4 C#5 E5 G5 A5') }),
  ],
};

// ---------- 2. Prelude in C BWV 846 ----------

// Five-voice chord per bar [a b c d e]; each half-bar: a(held) b(held) c d e c d e.
const PRE_BARS: [string, string][] = [
  ['C4 E4 G4 C5 E5', 'C'],
  ['C4 D4 A4 D5 F5', 'Dm7/C'],
  ['B3 D4 G4 D5 F5', 'G7/B'],
  ['C4 E4 G4 C5 E5', 'C'],
  ['C4 E4 A4 E5 A5', 'Am/C'],
  ['C4 D4 F#4 A4 D5', 'D7/C'],
  ['B3 D4 G4 D5 G5', 'G/B'],
  ['B3 C4 E4 G4 C5', 'CM7/B'],
  ['A3 C4 E4 G4 C5', 'Am7'],
  ['D3 A3 D4 F#4 C5', 'D7'],
  ['G3 B3 D4 G4 B4', 'G'],
  ['G3 Bb3 E4 G4 C#5', 'C#o7/G'],
  ['F3 A3 D4 A4 D5', 'Dm/F'],
  ['F3 Ab3 D4 F4 B4', 'Bo7/F'],
  ['E3 G3 C4 G4 C5', 'C/E'],
  ['E3 F3 A3 C4 F4', 'FM7/E'],
  ['D3 F3 A3 C4 F4', 'Dm7'],
  ['G2 D3 G3 B3 F4', 'G7'],
  ['C3 E3 G3 C4 E4', 'C'],
  ['C3 G3 Bb3 C4 E4', 'C7'],
  ['F2 F3 A3 C4 E4', 'FM7'],
  ['F#2 C3 A3 C4 Eb4', 'F#o7'],
  ['Ab2 F3 B3 C4 D4', 'Bo7/Ab'],
  ['G2 F3 G3 B3 D4', 'G7'],
];

function preludeBar([v, c]: [string, string]): Bar {
  const [a, b, x, y, z] = v.split(' ').map(nm);
  const half = (o: number): Note[] => [[a, o, 8], [b, o + 1, 7], [x, o + 2, 1], [y, o + 3, 1], [z, o + 4, 1], [x, o + 5, 1], [y, o + 6, 1], [z, o + 7, 1]];
  return mk({ ch: [c], hi: half(0).concat(half(8)) });
}

const PRELUDE: Song = {
  id: 'prelude', bpm: 240, res: 2, half: false, phrase: 4,
  bassPat: 'r-------r-------',
  gtr: ['X-------X-------', 'X-p-p-p-X-p-p-p-', 'X-p-p-p-X-p-X-p-', 'XpppXpppXpppXppp'],
  lh: 'none', org: 'stab', flute: false, drone: 0, harpVel: 0.17, lv: LV,
  intro: [],
  loop: PRE_BARS.map(preludeBar),
};

// ---------- 3. Bourrée BWV 996 ----------

// Bars 1-4 (+ pickup) follow Bach's upper voice; 5-8 are the same phrase sequenced into G major,
// 13-16 a cadential variation. Rhythm unit: quarter = 4 steps.
const BOU_1 = N('G5@0:4 F#5@4:2 E5@6:2 D#5@8:4 E5@12:2 F#5@14:2');
const BOU_2 = N('B4@0:4 C#5@4:2 D#5@6:2 E5@8:4 D5@12:2 C5@14:2');
const BOU_3 = N('B4@0:4 A4@4:2 G4@6:2 F#4@8:4 G4@12:2 A4@14:2');

const BOURREE: Song = {
  id: 'bourree', bpm: 160, res: 1, half: false, phrase: 4,
  bassPat: 'r---f---r---f---',
  gtr: ['X--pp-p-X--pp-p-', 'X-ppX-ppX-ppX-pp', 'XpppX-p-XpppX-p-', 'Xppppppppppppppp'],
  lh: 'walk', org: 'stab', flute: false, drone: 0, harpVel: 0.21, lv: LV,
  intro: [mk({ len: 4, ch: ['Em'], hi: N('E5@0:2 F#5@2:2'), hits: [[0, 't'], [1, 't'], [2, 'm'], [3, 'l']] }, '')],
  loop: [
    mk({ ch: ['Em', 'B7'], hi: BOU_1 }),
    mk({ ch: ['B', 'C'], hi: BOU_2 }),
    mk({ ch: ['G', 'B7'], hi: BOU_3 }),
    mk({ ch: ['B7', 'Em'], hi: N('B4@0:2 A4@2:2 G4@4:2 F#4@6:2 E4@8:4 G4@12:2 A4@14:2') }),
    mk({ ch: ['G', 'D7'], hi: N('B4@0:4 A4@4:2 G4@6:2 F#4@8:4 G4@12:2 A4@14:2') }),
    mk({ ch: ['D', 'Em'], hi: N('D5@0:4 E5@4:2 F#5@6:2 G5@8:4 F#5@12:2 E5@14:2') }),
    mk({ ch: ['G', 'D7'], hi: N('D5@0:4 C5@4:2 B4@6:2 A4@8:4 B4@12:2 C5@14:2') }),
    mk({ ch: ['D7', 'G'], hi: N('D5@0:2 C5@2:2 B4@4:2 A4@6:2 G4@8:4 E5@12:2 F#5@14:2') }),
    mk({ ch: ['Em', 'B7'], hi: BOU_1 }),
    mk({ ch: ['B', 'C'], hi: BOU_2 }),
    mk({ ch: ['G', 'B7'], hi: BOU_3 }),
    mk({ ch: ['B7', 'Em'], hi: N('B4@0:2 A4@2:2 G4@4:2 F#4@6:2 E4@8:4 C5@12:2 D5@14:2') }),
    mk({ ch: ['C', 'D7'], hi: N('E5@0:4 F#5@4:2 G5@6:2 A5@8:4 G5@12:2 F#5@14:2') }),
    mk({ ch: ['Em', 'B7'], hi: BOU_1 }),
    mk({ ch: ['Am', 'B7'], hi: seq('A5 E5 C5 E5 A5 C6 B5 A5 D#5 F#5 A5 B5 A5 F#5 D#5 B4') }),
    mk({ ch: ['Em'], hi: N('E5@0:4 B4@4:2 G4@6:2 E4@8:4 E5@12:2 F#5@14:2') }),
  ],
};

// ---------- 4. Badinerie BWV 1067 ----------

// Two 2/4 bars per engine bar. Bars 1-2 (+ pickup) are Bach's opening; the rest develops the
// same arpeggio motif (third-root-fifth) through the harmony, with 16th-note runs.
const BAD_MOTIF_BM = 'D6@0:1 B5@1:1 F#5@2:2 B5@4:1 F#5@5:1 D5@6:2';

const BADINERIE: Song = {
  id: 'badinerie', bpm: 200, res: 1, half: false, phrase: 4,
  bassPat: 'r-o-r-o-r-o-r-o-',
  gtr: ['X-p-p-p-X-p-p-p-', 'X-ppX-ppX-ppX-pp', 'XpppXpppXpppXppp', 'Xppppppppppppppp'],
  lh: 'oct', org: 'stab', flute: true, drone: 0, harpVel: 0.19, lv: LV,
  intro: [mk({ len: 4, ch: ['F#7'], hi: N('B5@2:2'), hits: [[0, 's'], [1, 's'], [2, 's'], [3, 's']] }, '')],
  loop: [
    mk({ ch: ['Bm'], hi: N(`${BAD_MOTIF_BM} F#5@8:1 D5@9:1 B4@10:2 F#4@12:4`) }),
    mk({ ch: ['Bm', 'F#7'], hi: seq('B4 C#5 D5 E5 F#5 G5 F#5 E5').concat(N('F#5@8:1 C#5@9:1 A#4@10:1 C#5@11:1 F#5@12:2 B5@14:2')) }),
    mk({ ch: ['Bm', 'Em'], hi: N(`${BAD_MOTIF_BM} G5@8:1 E5@9:1 B4@10:2 E5@12:1 B4@13:1 G4@14:2`) }),
    mk({ ch: ['F#7', 'Bm'], hi: seq('C#5 A#4 C#5 E5 C#5 E5 F#5 E5').concat(N('D5@8:1 C#5@9:1 B4@10:2 F#4@12:2 D6@14:2')) }),
    mk({ ch: ['D', 'A'], hi: N('F#6@0:1 D6@1:1 A5@2:2 D6@4:1 A5@5:1 F#5@6:2 C#6@8:1 A5@9:1 E5@10:2 A5@12:1 E5@13:1 C#5@14:2') }),
    mk({ ch: ['D', 'G', 'Em', 'F#7'], hi: seq('D6 C#6 B5 A5 G5 F#5 E5 D5 E5 G5 B5 G5 F#5 A#5 C#6 A#5') }),
    mk({ ch: ['Bm', 'G'], hi: N(`${BAD_MOTIF_BM} B5@8:1 G5@9:1 D5@10:2 G5@12:1 D5@13:1 B4@14:2`) }),
    mk({ ch: ['Em', 'F#7', 'Bm', 'Bm'], hi: seq('G5 F#5 E5 G5 F#5 E5 D5 C#5').concat(N('D5@8:1 C#5@9:1 B4@10:2 F#4@12:2 B5@14:2')) }),
  ],
};

// ---------- 5. Menu: Air BWV 1068 harmony, slowed, over a distorted drone ----------

function menuBar(chs: string[]): Bar {
  const hi: Note[] = [];
  chs.forEach((c, k) => {
    const v = voicing(chord(c), 62);
    const top = v.slice(-3);
    [top[0], top[1], top[2], top[1]].forEach((m, i) => hi.push([m, k * 4 + i, 1]));
  });
  return mk({ ch: chs, hi });
}

const MENU: Song = {
  id: 'menu', bpm: 60, res: 1, half: true, phrase: 4,
  bassPat: 'r---r---r---r---',
  gtr: ['X---X---X---X---', 'X-p-X-p-X-p-X-p-', 'XpppXpppXpppXppp', 'pppppppppppppppp'],
  lh: 'oct', org: 'pad', flute: false, drone: 38, harpVel: 0.14,
  lv: { bass: 2, drums: 4, gtr: 3, org: 1, choir: 5, drone: 1, flute: 9 },
  intro: [],
  loop: [
    menuBar(['D', 'A/C#', 'Bm', 'Bm/A']),
    menuBar(['G', 'D/F#', 'Em', 'A7']),
    menuBar(['D', 'A/C#', 'Bm', 'Bm/A']),
    menuBar(['G', 'Em', 'A7', 'A7/C#']),
    // minor turn: chromatic lament bass D C# C B
    menuBar(['Dm', 'A/C#', 'Dm/C', 'G/B']),
    menuBar(['Gm/Bb', 'Dm/A', 'Gm', 'A7']),
    menuBar(['Dm', 'A/C#', 'Dm/C', 'G/B']),
    menuBar(['Gm', 'A7/C#', 'Dm', 'A7']),
  ],
};

const SONGS: Record<BachTrackId, Song> = { toccata: TOCCATA, prelude: PRELUDE, bourree: BOURREE, badinerie: BADINERIE, menu: MENU };

// drum grids [kick, snare, hat, china]
const DR: Record<string, string[]> = {
  l2: ['x.......x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', ''],
  l3a: ['x..x....x.x.....', '....x.......x...', 'x.x.x.x.x.x.x.x.', ''],
  l3b: ['x.....x.x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', ''],
  l4a: ['xxxxxxxxxxxxxxxx', '....x.......x...', 'x...x...x...x...', ''],
  l4b: ['x.x.x.x.x.x.x.x.', '....x.......x...', 'x...x...x...x...', ''],
  l5a: ['xxxxxxxxxxxxxxxx', '....x.......x...', 'x.x.x.x.x.x.x.x.', '........x.......'],
  l5b: ['x.x.x.x.x.x.x.x.', '....x.......x...', 'x.x.x.x.x.x.x.x.', '........x.......'],
  h2: ['x...............', '........x.......', 'x...x...x...x...', ''],
  h3: ['x.....x.x.......', '........x.......', 'x.x.x.x.x.x.x.x.', ''],
  h4: ['x.x.x.x.x.x.x.x.', '........x.......', 'x...x...x...x...', ''],
  h5: ['xxxxxxxxxxxxxxxx', '........x.......', 'x.x.x.x.x.x.x.x.', '....x.......x...'],
};

function drumGrid(sg: Song, L: number): string[] {
  const l = clamp(L, 2, 5);
  if (sg.half) return DR['h' + l];
  if (l === 2) return DR.l2;
  return DR['l' + l + (sg.res === 1 ? 'a' : 'b')];
}

// ---------- audio graph ----------

let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;
let waves: { harp: PeriodicWave; organ: PeriodicWave; flute: PeriodicWave } | null = null;
let musicIn: GainNode | null = null;
let duckG: GainNode | null = null;
let stingIn: GainNode | null = null;
let revIn: GainNode | null = null;
let volG: GainNode | null = null;
let anl: AnalyserNode | null = null;
let stingRig: Rig | null = null;
let volume = 0.8;

function getAC(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

const curves = new Map<string, Float32Array<ArrayBuffer>>();
function curveDrive(k: number) {
  const key = 'd' + k;
  let cv = curves.get(key);
  if (!cv) {
    const n = 2048;
    cv = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / (n - 1) - 1;
      const y = ((1 + k) * x) / (1 + k * Math.abs(x));
      cv[i] = y + 0.04 * y * y; // slight asymmetry = even harmonics
    }
    curves.set(key, cv);
  }
  return cv;
}
function curveClip() {
  let cv = curves.get('clip');
  if (!cv) {
    const n = 4096;
    cv = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / (n - 1) - 1;
      const a = Math.abs(x);
      const y = a < 0.75 ? a : 0.75 + 0.23 * Math.tanh((a - 0.75) / 0.23);
      cv[i] = Math.sign(x) * y;
    }
    curves.set('clip', cv);
  }
  return cv;
}

function makeWave(c: AudioContext, amp: (n: number) => number, count: number): PeriodicWave {
  const real = new Float32Array(count + 1);
  const imag = new Float32Array(count + 1);
  for (let n = 1; n <= count; n++) imag[n] = amp(n);
  return c.createPeriodicWave(real, imag);
}

function buildWaves(c: AudioContext) {
  const harp = makeWave(c, (n) => {
    // plucked string near the end (comb notches) + 4' register on the even partials
    let a = Math.abs(Math.sin(n * Math.PI * 0.13)) / Math.pow(n, 0.75);
    if (n % 2 === 0) a += (0.45 * Math.abs(Math.sin((n / 2) * Math.PI * 0.21))) / Math.pow(n / 2, 0.9);
    return a;
  }, 40);
  // full organ relative to a 16' fundamental: 16' 8' 5⅓' 4' 2⅔' 2' 1⅗' 1⅓' 1'
  const draw: Record<number, number> = { 1: 0.75, 2: 1, 3: 0.65, 4: 0.75, 6: 0.5, 8: 0.55, 10: 0.22, 12: 0.3, 16: 0.35 };
  const organ = makeWave(c, (n) => draw[n] ?? 0, 16);
  const fl = [0, 1, 0.3, 0.12, 0.05, 0.02];
  const flute = makeWave(c, (n) => fl[n] ?? 0, 5);
  waves = { harp, organ, flute };
}

function makeIR(c: AudioContext, sec: number): AudioBuffer {
  const sr = c.sampleRate;
  const len = Math.floor(sr * sec);
  const buf = c.createBuffer(2, len, sr);
  const pre = Math.floor(sr * 0.024);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let s = 0;
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / sr;
      const env = Math.exp((-t * 6.9) / 2.9) * Math.min(1, t / 0.012);
      const a = 0.9 - 0.8 * Math.min(1, t / sec); // the tail gets darker
      s += a * (Math.random() * 2 - 1 - s);
      d[i] = s * env;
    }
    for (let k = 0; k < 12; k++) {
      const idx = pre + Math.floor(sr * (0.006 + Math.random() * 0.08));
      if (idx < len) d[idx] += (Math.random() < 0.5 ? -1 : 1) * (0.6 - k * 0.04);
    }
  }
  return buf;
}

function comp(c: AudioContext, th: number, knee: number, ratio: number, atk: number, rel: number) {
  const k = c.createDynamicsCompressor();
  k.threshold.value = th;
  k.knee.value = knee;
  k.ratio.value = ratio;
  k.attack.value = atk;
  k.release.value = rel;
  return k;
}

function buildGraph(c: AudioContext) {
  const len = Math.floor(c.sampleRate * 2);
  noiseBuf = c.createBuffer(1, len, c.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;
  buildWaves(c);

  anl = c.createAnalyser();
  anl.fftSize = 2048;
  anl.smoothingTimeConstant = 0.7;
  volG = c.createGain();
  volG.gain.value = volume;
  volG.connect(anl);
  anl.connect(c.destination);

  const clip = c.createWaveShaper();
  clip.curve = curveClip();
  clip.oversample = '2x';
  clip.connect(volG);
  const limiter = comp(c, -3, 0, 20, 0.002, 0.09);
  limiter.connect(clip);
  const makeup = c.createGain();
  makeup.gain.value = 1.5;
  makeup.connect(limiter);
  const glue = comp(c, -18, 10, 3, 0.008, 0.18);
  glue.connect(makeup);

  const sum = c.createGain();
  sum.connect(glue);
  musicIn = c.createGain();
  musicIn.gain.value = 0.75;
  duckG = c.createGain();
  musicIn.connect(duckG).connect(sum);
  stingIn = c.createGain();
  stingIn.gain.value = 0.8;
  stingIn.connect(sum);

  revIn = c.createGain();
  const rHp = c.createBiquadFilter();
  rHp.type = 'highpass';
  rHp.frequency.value = 220;
  const rLp = c.createBiquadFilter();
  rLp.type = 'lowpass';
  rLp.frequency.value = 7000;
  const conv = c.createConvolver();
  conv.buffer = makeIR(c, 3.2);
  const rOut = c.createGain();
  rOut.gain.value = 0.55;
  revIn.connect(rHp).connect(rLp).connect(conv).connect(rOut).connect(sum);

  stingRig = buildRig(c, stingIn, revIn);
  stingRig.out.gain.value = 1;
  stingRig.send.gain.value = 1;
}

// ---------- per-track instrument rig (own buses so tracks can crossfade) ----------

interface Rig {
  out: GainNode;
  send: GainNode;
  lead: GainNode;
  leadClean: GainNode;
  leadDrive: GainNode;
  leadDist: GainNode;
  gtr: GainNode[];
  gtrDrive: GainNode[];
  bass: GainNode;
  bassDrive: GainNode;
  orgL: GainNode;
  orgR: GainNode;
  orgDrive: GainNode;
  choir: GainNode;
  drums: GainNode;
  drumsVerb: GainNode;
  vib: GainNode;
  lfo: OscillatorNode;
  nodes: AudioNode[];
}

function buildRig(c: AudioContext, dest: AudioNode, rev: AudioNode): Rig {
  const nodes: AudioNode[] = [];
  const g = (v = 1) => {
    const n = c.createGain();
    n.gain.value = v;
    nodes.push(n);
    return n;
  };
  const bq = (type: BiquadFilterType, f: number, q = 0.707, gain = 0) => {
    const n = c.createBiquadFilter();
    n.type = type;
    n.frequency.value = f;
    n.Q.value = q;
    n.gain.value = gain;
    nodes.push(n);
    return n;
  };
  const ws = (k: number, os: OverSampleType) => {
    const n = c.createWaveShaper();
    n.curve = curveDrive(k);
    n.oversample = os;
    nodes.push(n);
    return n;
  };
  const pn = (v: number): AudioNode => {
    if (typeof c.createStereoPanner !== 'function') return g(1);
    const n = c.createStereoPanner();
    n.pan.value = v;
    nodes.push(n);
    return n;
  };

  const out = g(0);
  out.connect(dest);
  const send = g(0);
  send.connect(rev);

  // lead (harpsichord / flute): clean path + amp path
  const lead = g(1);
  const leadHp = bq('highpass', 110);
  const leadClean = g(1);
  lead.connect(leadHp);
  leadHp.connect(leadClean).connect(out);
  const leadDrive = g(6);
  const leadDist = g(0);
  leadHp.connect(leadDrive).connect(ws(30, '4x')).connect(bq('peaking', 1700, 1.1, 5)).connect(bq('lowpass', 5200, 0.8)).connect(leadDist).connect(out);
  lead.connect(g(0.16)).connect(send);

  // double-tracked guitars, two-stage high-gain amp + cab
  const gtr: GainNode[] = [];
  const gtrDrive: GainNode[] = [];
  for (const side of [-1, 1]) {
    const inp = g(1);
    const drv = g(6);
    inp.connect(drv)
      .connect(bq('highpass', 110, 0.7))
      .connect(ws(8, '4x'))
      .connect(bq('highpass', 160, 0.6))
      .connect(g(5))
      .connect(ws(40, '4x'))
      .connect(bq('peaking', 110, 1, 4))
      .connect(bq('peaking', 420, 1, -3))
      .connect(bq('peaking', 900, 0.9, 4))
      .connect(bq('lowpass', 3500, 0.9))
      .connect(bq('lowpass', 6500, 0.6))
      .connect(g(0.2))
      .connect(pn(side * 0.8))
      .connect(out);
    gtr.push(inp);
    gtrDrive.push(drv);
  }

  // bass
  const bass = g(1);
  const bassDrive = g(1.3);
  bass.connect(bassDrive).connect(ws(3, '2x')).connect(bq('lowpass', 2400, 0.7)).connect(g(0.42)).connect(out);

  // organ (stereo pair -> gentle overdrive -> cathedral send)
  const orgL = g(1);
  const orgR = g(1);
  const orgBus = g(1);
  orgL.connect(pn(-0.45)).connect(orgBus);
  orgR.connect(pn(0.45)).connect(orgBus);
  const orgDrive = g(0.9);
  orgBus.connect(orgDrive).connect(ws(1.5, '2x')).connect(bq('lowpass', 7000)).connect(g(0.6)).connect(out);
  orgBus.connect(g(0.5)).connect(send);

  // choir: "aah" formant bank
  const choir = g(1);
  const choirOut = g(2.4);
  for (const [f, q, v] of [[730, 7, 1], [1090, 8, 0.55], [2440, 10, 0.3]]) choir.connect(bq('bandpass', f, q)).connect(g(v)).connect(choirOut);
  choir.connect(bq('lowpass', 800)).connect(g(0.2)).connect(choirOut);
  choirOut.connect(bq('highpass', 150)).connect(out);
  choirOut.connect(g(0.75)).connect(send);

  // drums
  const drums = g(1);
  const dComp = comp(c, -12, 4, 4, 0.003, 0.12);
  nodes.push(dComp);
  drums.connect(dComp).connect(g(0.85)).connect(out);
  const drumsVerb = g(1);
  drumsVerb.connect(drums);
  drumsVerb.connect(g(0.22)).connect(send);

  // shared vibrato LFO (cents)
  const lfo = c.createOscillator();
  lfo.frequency.value = 5.6;
  const vib = g(11);
  lfo.connect(vib);
  lfo.start();

  return { out, send, lead, leadClean, leadDrive, leadDist, gtr, gtrDrive, bass, bassDrive, orgL, orgR, orgDrive, choir, drums, drumsVerb, vib, lfo, nodes };
}

function disposeRig(r: Rig) {
  try {
    r.lfo.stop();
    r.lfo.disconnect();
  } catch {
    // already stopped
  }
  for (const n of r.nodes) {
    try {
      n.disconnect();
    } catch {
      // ignore
    }
  }
}

const LEAD_TRASH = [0, 0, 0, 0.3, 0.45, 0.6, 0.9];

function applyLevel(r: Rig, L: number, t: number) {
  const set = (p: AudioParam, v: number) => p.setTargetAtTime(v, t, 0.03);
  const tr = LEAD_TRASH[clamp(L, 0, 6)];
  set(r.leadClean.gain, 1 - tr * 0.55);
  set(r.leadDist.gain, tr * 0.32);
  set(r.leadDrive.gain, L >= 6 ? 16 : 6);
  for (const d of r.gtrDrive) set(d.gain, L >= 6 ? 14 : 6);
  set(r.bassDrive.gain, L >= 6 ? 3.2 : 1.3);
  set(r.orgDrive.gain, L >= 6 ? 3 : 0.9);
}

// ---------- voices ----------

let active = 0;

function own(src: AudioScheduledSourceNode, nodes?: AudioNode[], fn?: () => void) {
  active++;
  src.onended = () => {
    active--;
    try {
      src.disconnect();
      if (nodes) for (const n of nodes) n.disconnect();
      if (fn) fn();
    } catch {
      // node already detached
    }
  };
}

const busy = (prio: number) => active > CAP * (prio >= 3 ? 1.5 : prio === 2 ? 1 : 0.7);

function osc(c: AudioContext, w: PeriodicWave | OscillatorType, f: number, t: number, end: number, det = 0): OscillatorNode {
  const o = c.createOscillator();
  if (typeof w === 'string') o.type = w as OscillatorType;
  else o.setPeriodicWave(w);
  o.frequency.setValueAtTime(f, t);
  if (det) o.detune.setValueAtTime(det, t);
  o.start(t);
  o.stop(end);
  return o;
}

function noiseSrc(c: AudioContext, t: number, end: number): AudioBufferSourceNode | null {
  if (!noiseBuf) return null;
  const n = c.createBufferSource();
  n.buffer = noiseBuf;
  n.loop = true;
  n.start(t, Math.random() * 1.5);
  n.stop(end);
  return n;
}

function filt(c: AudioContext, type: BiquadFilterType, f: number, q = 0.707): BiquadFilterNode {
  const n = c.createBiquadFilter();
  n.type = type;
  n.frequency.value = f;
  n.Q.value = q;
  return n;
}

function amp(c: AudioContext): GainNode {
  const n = c.createGain();
  n.gain.value = 0;
  return n;
}

function hitEnv(p: AudioParam, t: number, v: number, tau: number, delay = 0) {
  p.setValueAtTime(v, t);
  p.setTargetAtTime(0, t + delay, tau);
}

function panNode(c: AudioContext, v: number): AudioNode {
  if (typeof c.createStereoPanner !== 'function') return c.createGain();
  const p = c.createStereoPanner();
  p.pan.value = v;
  return p;
}

interface Bend { to: number; at: number; dur: number }

function bendOsc(o: OscillatorNode, f: number, t: number, b?: Bend) {
  if (!b) return;
  o.frequency.setValueAtTime(f, t + b.at);
  o.frequency.exponentialRampToValueAtTime(f * b.to, t + b.at + b.dur);
}

function harp(r: Rig, t: number, m: number, len: number, vel: number, bend?: Bend) {
  const c = ctx;
  if (!c || !waves || busy(2)) return;
  const f = mtof(m);
  const tau = clamp(1.15 - (m - 40) * 0.017, 0.2, 1.15);
  const damp = Math.max(t + len, t + 0.065);
  const end = Math.min(damp + 0.12, t + tau * 5 + 0.05);
  const lp = filt(c, 'lowpass', 2000, 1.1);
  lp.frequency.setValueAtTime(Math.min(17000, f * 16 + 2500), t);
  lp.frequency.setTargetAtTime(Math.min(11000, Math.max(f * 4, 1500)), t + 0.002, 0.08);
  const g = amp(c);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel, t + 0.0015);
  g.gain.setTargetAtTime(vel * 0.45, t + 0.0015, 0.04);
  g.gain.setTargetAtTime(0, t + 0.06, tau);
  if (damp + 0.02 < end) g.gain.setTargetAtTime(0, damp, 0.02);
  const o1 = osc(c, waves.harp, f, t, end, -5 + rnd(2));
  const o2 = osc(c, waves.harp, f, t, end, 5 + rnd(2));
  bendOsc(o1, f, t, bend);
  bendOsc(o2, f, t, bend);
  const p = panNode(c, clamp((m - 62) / 32, -0.55, 0.55) + rnd(0.05));
  o1.connect(lp);
  o2.connect(lp);
  lp.connect(g).connect(p).connect(r.lead);
  own(o1, [lp, g, p]);
  own(o2);
  if (busy(1)) return;
  const n = noiseSrc(c, t, t + 0.04);
  if (!n) return;
  const bp = filt(c, 'bandpass', clamp(f * 3, 1800, 9000), 1.4);
  const ng = amp(c);
  hitEnv(ng.gain, t, vel * 0.7, 0.007);
  n.connect(bp).connect(ng).connect(p);
  own(n, [bp, ng]);
}

function flute(r: Rig, t: number, m: number, len: number, vel: number, bend?: Bend) {
  const c = ctx;
  if (!c || !waves || busy(2)) return;
  const f = mtof(m);
  const end = t + len + 0.15;
  const o = osc(c, waves.flute, f, t, end);
  bendOsc(o, f, t, bend);
  r.vib.connect(o.detune);
  const g = amp(c);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel, t + 0.018);
  g.gain.setTargetAtTime(vel * 0.8, t + 0.018, 0.1);
  g.gain.setTargetAtTime(0, t + len, 0.03);
  o.connect(g).connect(r.lead);
  own(o, [g], () => r.vib.disconnect(o.detune));
  if (busy(1)) return;
  const n = noiseSrc(c, t, t + Math.min(len, 0.25) + 0.05);
  if (!n) return;
  const bp = filt(c, 'bandpass', Math.min(f * 2, 9000), 2.5);
  const ng = amp(c);
  hitEnv(ng.gain, t, vel * 0.35, 0.03);
  n.connect(bp).connect(ng).connect(r.lead);
  own(n, [bp, ng]);
}

type GKind = 'X' | 'p' | 'n' | 'pn' | 'drone';

function gtr(r: Rig, t: number, root: number, len: number, kind: GKind, p5 = 7, vel = 1, bend?: Bend) {
  const c = ctx;
  if (!c || busy(2)) return;
  const iv = kind === 'n' || kind === 'pn' ? [0, 12] : kind === 'p' ? [0, p5] : [0, p5, 12];
  const mute = kind === 'p' || kind === 'pn';
  const drone = kind === 'drone';
  for (let side = 0; side < 2; side++) {
    const ts = t + side * 0.008 + Math.random() * 0.002;
    const g = amp(c);
    const a = vel * (mute ? 0.33 : 0.3);
    let end: number;
    g.gain.setValueAtTime(0, ts);
    if (drone) {
      g.gain.linearRampToValueAtTime(a * 0.6, ts + 0.9);
      g.gain.setTargetAtTime(0, ts + len, 0.35);
      end = ts + len + 1.6;
    } else if (mute) {
      g.gain.linearRampToValueAtTime(a, ts + 0.002);
      g.gain.setTargetAtTime(0, ts + 0.002, 0.045);
      g.gain.setTargetAtTime(0, ts + Math.min(len, 0.11), 0.01);
      end = ts + Math.min(len, 0.11) + 0.08;
    } else {
      g.gain.linearRampToValueAtTime(a, ts + 0.003);
      g.gain.setTargetAtTime(a * 0.75, ts + 0.003, 0.3);
      g.gain.setTargetAtTime(0, ts + len, 0.025);
      end = ts + len + 0.12;
    }
    let head: AudioNode = g;
    const extra: AudioNode[] = [g];
    if (mute || drone) {
      const lp = filt(c, 'lowpass', drone ? 320 : 650, 0.8);
      lp.connect(g);
      head = lp;
      extra.push(lp);
    }
    g.connect(r.gtr[side]);
    iv.forEach((d, i) => {
      const fr = mtof(root + d);
      const o = osc(c, 'sawtooth', fr, ts, end, (side ? 6 : -6) + i * 2 + rnd(2));
      bendOsc(o, fr, ts, bend);
      o.connect(head);
      own(o, i === 0 ? extra : undefined);
    });
  }
}

function bassN(r: Rig, t: number, m: number, len: number, vel = 1) {
  const c = ctx;
  if (!c || busy(3)) return;
  const f = mtof(m);
  const end = t + len + 0.1;
  const o1 = osc(c, 'sawtooth', f, t, end);
  const o2 = osc(c, 'sine', f, t, end);
  const lp = filt(c, 'lowpass', 1000, 2);
  lp.frequency.setValueAtTime(Math.min(f * 12, 6000), t);
  lp.frequency.setTargetAtTime(Math.max(f * 3, 180), t + 0.003, 0.12);
  const g = amp(c);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel * 0.55, t + 0.004);
  g.gain.setTargetAtTime(vel * 0.42, t + 0.004, 0.2);
  g.gain.setTargetAtTime(0, t + len, 0.025);
  o1.connect(lp).connect(g);
  o2.connect(g);
  g.connect(r.bass);
  own(o1, [lp, g]);
  own(o2);
}

function organN(r: Rig, t: number, m: number, len: number, vel: number, atk = 0.006, bend?: Bend) {
  const c = ctx;
  if (!c || !waves || busy(1)) return;
  const f = mtof(m) / 2;
  const end = t + len + 0.45;
  const pair: [GainNode, number][] = [[r.orgL, -4], [r.orgR, 4]];
  for (const [bus, det] of pair) {
    const o = osc(c, waves.organ, f, t, end, det);
    bendOsc(o, f, t, bend);
    r.vib.connect(o.detune);
    const g = amp(c);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + atk);
    g.gain.setTargetAtTime(0, t + Math.max(len, atk), 0.08);
    o.connect(g).connect(bus);
    own(o, [g], () => r.vib.disconnect(o.detune));
  }
}

function choirN(r: Rig, t: number, m: number, len: number, vel: number, atk = 0.2) {
  const c = ctx;
  if (!c || busy(1)) return;
  const f = mtof(m);
  const end = t + len + 1.0;
  const g = amp(c);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel, t + atk);
  g.gain.setTargetAtTime(0, t + Math.max(len, atk), 0.22);
  g.connect(r.choir);
  [-11, 11].forEach((det, i) => {
    const o = osc(c, 'sawtooth', f, t, end, det + rnd(3));
    r.vib.connect(o.detune);
    o.connect(g);
    own(o, i === 0 ? [g] : undefined, () => r.vib.disconnect(o.detune));
  });
}

// ---------- drums ----------

function kick(r: Rig, t: number, vel = 1, tight = false) {
  const c = ctx;
  if (!c || busy(3)) return;
  const o = osc(c, 'sine', 165, t, t + (tight ? 0.24 : 0.48));
  o.frequency.exponentialRampToValueAtTime(58, t + 0.04);
  o.frequency.exponentialRampToValueAtTime(43, t + 0.2);
  const g = amp(c);
  hitEnv(g.gain, t, vel, tight ? 0.055 : 0.11, 0.01);
  o.connect(g).connect(r.drums);
  own(o, [g]);
  const n = noiseSrc(c, t, t + 0.03);
  if (!n) return;
  const hp = filt(c, 'highpass', 2500);
  const ng = amp(c);
  hitEnv(ng.gain, t, vel * 0.55, 0.005);
  n.connect(hp).connect(ng).connect(r.drums);
  own(n, [hp, ng]);
}

function snare(r: Rig, t: number, vel = 1) {
  const c = ctx;
  if (!c || busy(3)) return;
  const o = osc(c, 'triangle', 220, t, t + 0.2);
  o.frequency.exponentialRampToValueAtTime(170, t + 0.06);
  const og = amp(c);
  hitEnv(og.gain, t, vel * 0.75, 0.04);
  o.connect(og).connect(r.drumsVerb);
  own(o, [og]);
  const n = noiseSrc(c, t, t + 0.38);
  if (!n) return;
  const bp = filt(c, 'bandpass', 2400, 0.55);
  const g1 = amp(c);
  hitEnv(g1.gain, t, vel * 0.95, 0.075, 0.003);
  const hp = filt(c, 'highpass', 6500);
  const g2 = amp(c);
  hitEnv(g2.gain, t, vel * 0.4, 0.035);
  n.connect(bp).connect(g1).connect(r.drumsVerb);
  n.connect(hp).connect(g2).connect(r.drumsVerb);
  own(n, [bp, g1, hp, g2]);
}

function hat(r: Rig, t: number, vel = 1, open = false) {
  const c = ctx;
  if (!c || busy(1)) return;
  const n = noiseSrc(c, t, t + (open ? 0.5 : 0.1));
  if (!n) return;
  const hp = filt(c, 'highpass', 7500);
  const g = amp(c);
  hitEnv(g.gain, t, vel * 0.22, open ? 0.09 : 0.016);
  n.connect(hp).connect(g).connect(r.drums);
  own(n, [hp, g]);
}

function crash(r: Rig, t: number, vel = 1) {
  const c = ctx;
  if (!c || busy(2)) return;
  const n = noiseSrc(c, t, t + 2.6);
  if (!n) return;
  const hp = filt(c, 'highpass', 4200);
  const g = amp(c);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel * 0.32, t + 0.003);
  g.gain.setTargetAtTime(0, t + 0.003, 0.5);
  const bp = filt(c, 'bandpass', 6500, 0.8);
  const g2 = amp(c);
  hitEnv(g2.gain, t, vel * 0.15, 0.25);
  n.connect(hp).connect(g).connect(r.drumsVerb);
  n.connect(bp).connect(g2).connect(r.drumsVerb);
  own(n, [hp, g, bp, g2]);
}

function china(r: Rig, t: number, vel = 1) {
  const c = ctx;
  if (!c || busy(2)) return;
  const bp = filt(c, 'bandpass', 3000, 1.4);
  const g = amp(c);
  hitEnv(g.gain, t, vel * 0.5, 0.16, 0.002);
  bp.connect(g).connect(r.drums);
  const n = noiseSrc(c, t, t + 1.1);
  if (n) {
    const hp = filt(c, 'highpass', 7000);
    const g2 = amp(c);
    hitEnv(g2.gain, t, vel * 0.2, 0.08);
    n.connect(bp);
    n.connect(hp).connect(g2).connect(r.drums);
    own(n, [bp, g, hp, g2]);
  }
  for (const f of [540, 1310]) {
    const o = osc(c, 'square', f, t, t + 0.6);
    const og = c.createGain();
    og.gain.value = 0.25;
    o.connect(og).connect(bp);
    own(o, [og]);
  }
}

const TOMS = [0, 210, 150, 100];

function tom(r: Rig, t: number, which: number, vel = 1) {
  const c = ctx;
  if (!c || busy(2)) return;
  const f = TOMS[clamp(which, 1, 3)];
  const o = osc(c, 'sine', f * 1.7, t, t + 0.8);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
  const g = amp(c);
  hitEnv(g.gain, t, vel * 0.85, 0.14);
  o.connect(g).connect(r.drumsVerb);
  own(o, [g]);
  const n = noiseSrc(c, t, t + 0.1);
  if (!n) return;
  const lp = filt(c, 'lowpass', 1800);
  const ng = amp(c);
  hitEnv(ng.gain, t, vel * 0.25, 0.02);
  n.connect(lp).connect(ng).connect(r.drumsVerb);
  own(n, [lp, ng]);
}

function hit(r: Rig, t: number, h: Hit) {
  switch (h) {
    case 'k': kick(r, t, 1); break;
    case 's': snare(r, t, 0.9); break;
    case 'c': crash(r, t, 1); break;
    case 'x': china(r, t, 0.9); break;
    case 't': tom(r, t, 1); break;
    case 'm': tom(r, t, 2); break;
    case 'l': tom(r, t, 3); break;
  }
}

// ---------- scheduler ----------

interface Player {
  song: Song;
  rig: Rig;
  next: number;
  step: number;
  barIdx: number;
  beat: number;
  L: number;
  sd: number;
  bar: Bar;
  stopAt: number;
  fading: boolean;
  dead: boolean;
}

let players: Player[] = [];
let timer: ReturnType<typeof setInterval> | null = null;
let level = 2;
let pending: BachTrackId | null = null;
const subs = new Set<(beat: number, bar: number) => void>();

function barAt(sg: Song, i: number): Bar {
  if (i < sg.intro.length) return sg.intro[i];
  return sg.loop[(i - sg.intro.length) % sg.loop.length];
}

function fireBeat(c: AudioContext, p: Player, t: number) {
  const beat = p.beat++;
  const bar = p.barIdx;
  if (!subs.size) return;
  setTimeout(() => {
    if (p.fading) return;
    subs.forEach((cb) => {
      try {
        cb(beat, bar);
      } catch {
        // subscriber error must not kill the clock
      }
    });
  }, Math.max(0, (t - c.currentTime) * 1000));
}

/** length (in steps) of a hit at step s in pattern pat: runs over '-' until a chord change */
function holdLen(pat: string, s: number, len: number, segStart: (k: number) => boolean) {
  let k = 1;
  while (s + k < len && pat[(s + k) % pat.length] === '-' && !segStart(s + k)) k++;
  return k;
}

/** steps until the next chord change */
function chordRun(s: number, len: number, segStart: (k: number) => boolean) {
  let k = 1;
  while (s + k < len && !segStart(s + k)) k++;
  return k;
}

function stepPlayer(c: AudioContext, p: Player) {
  const sg = p.song;
  const r = p.rig;
  const t = p.next;
  if (p.step === 0) {
    p.bar = barAt(sg, p.barIdx);
    p.L = level;
    p.sd = 60 / ((p.bar.bpm ?? sg.bpm) * (p.L >= 6 ? 1.15 : 1)) / 4;
    applyLevel(r, p.L, t);
  }
  const b = p.bar;
  const s = p.step;
  const L = p.L;
  const sd = p.sd;
  const lv = sg.lv;
  const len = b.len;
  const nch = b.ch.length;
  const seg = (k: number) => Math.floor((k * nch) / len);
  const segStart = (k: number) => k === 0 || b.ch[seg(k)].k !== b.ch[seg(k - 1)].k;
  const ch = b.ch[seg(s)];
  const segLen = len / nch;
  const at = (n: Note) => t + (n[1] - s) * sd;
  const loopPos = p.barIdx - sg.intro.length;
  const phrasePos = loopPos >= 0 ? loopPos % sg.phrase : -1;

  if (s % 4 === 0) fireBeat(c, p, t);

  // harpsichord (+ flute double)
  for (const n of b.hi[s]) {
    const v = sg.harpVel * (n[1] % 4 === 0 ? 1 : 0.84) * (1 + rnd(0.06));
    harp(r, at(n) + Math.random() * 0.002, n[0], n[2] * sd, v);
    if (sg.flute && L >= lv.flute) flute(r, at(n), n[0], n[2] * sd * 0.92, 0.13);
  }
  if (b.lo) {
    for (const n of b.lo[s]) harp(r, at(n), n[0], n[2] * sd, sg.harpVel * 0.8);
  } else if (b.d.l && L < lv.gtr) {
    const v = sg.harpVel * 0.72;
    if (sg.lh === 'oct' && s % 2 === 0) {
      const base = fold(ch.b, 38);
      harp(r, t, s % 4 === 0 ? base : base + 12, 2 * sd, v);
    } else if (sg.lh === 'walk' && s % 4 === 0) {
      const k = Math.round((s - seg(s) * segLen) / 4);
      harp(r, t, k % 2 === 0 ? fold(ch.b, 40) : fold(ch.r + ch.p5, 40), 4 * sd, v);
    }
  }

  const gp = b.gtr ?? sg.gtr[clamp(L, 3, 6) - 3];

  // bass
  if (L >= lv.bass) {
    if (b.bass) {
      for (const n of b.bass[s]) bassN(r, at(n), n[0], n[2] * sd * 0.95);
    } else if (b.riff) {
      for (const n of b.riff[s]) bassN(r, at(n), n[0] - 12, n[2] * sd * 0.9);
    } else if (b.d.b) {
      const base = fold(ch.b, 28);
      if (L >= lv.gtr && b.d.g) {
        let cc = gp[s % gp.length];
        if (cc === '-' && segStart(s)) cc = 'X';
        if (cc === 'X' || cc === 'p') bassN(r, t, base, (cc === 'p' ? 0.8 : holdLen(gp, s, len, segStart) * 0.94) * sd);
      } else {
        let bc = sg.bassPat[s % 16];
        if (bc === '-' && segStart(s)) bc = 'r';
        if (bc !== '.' && bc !== '-') {
          const m = bc === 'o' ? base + 12 : bc === 'f' ? fold(ch.r + ch.p5, 31) : bc === 't' ? fold(ch.r + ch.iv[1], 31) : base;
          bassN(r, t, m, holdLen(sg.bassPat, s, len, segStart) * sd * 0.92);
        }
      }
    }
  }

  // guitars
  if (L >= lv.gtr) {
    if (b.riff) {
      for (const n of b.riff[s]) gtr(r, at(n), n[0], n[2] * sd * 0.92, n[2] <= 1 ? 'pn' : 'n');
    } else if (b.d.g) {
      let cc = gp[s % gp.length];
      if (cc === '-' && segStart(s)) cc = 'X';
      if (cc === 'X' || cc === 'p') gtr(r, t, fold(ch.r, 38), holdLen(gp, s, len, segStart) * sd * 0.94, cc === 'X' ? 'X' : 'p', ch.p5);
    }
  }

  // organ
  if (L >= lv.org) {
    if (b.org) {
      for (const n of b.org[s]) organN(r, at(n), n[0], n[2] * sd, 0.07, 0.01);
    } else if (b.d.o && segStart(s)) {
      const pad = sg.org === 'pad';
      const run = chordRun(s, len, segStart);
      const ln = (pad ? run : Math.min(run, 3)) * sd;
      const notes = voicing(ch, 55);
      notes.push(fold(ch.r, 43));
      for (const m of notes) organN(r, t, m, ln, pad ? 0.045 : 0.07, pad ? 0.12 : 0.005);
    }
  }

  // choir
  if (L >= lv.choir) {
    if (b.choir) {
      for (const n of b.choir[s]) choirN(r, at(n), n[0], n[2] * sd, 0.08);
    } else if (b.d.c && segStart(s)) {
      const run = chordRun(s, len, segStart) * sd;
      for (const m of voicing(ch, 57)) choirN(r, t, m, run, 0.07, Math.min(0.2, run * 0.3));
    }
  }

  if (sg.drone && s === 0 && L >= lv.drone) gtr(r, t, sg.drone, len * sd + 0.5, 'drone', 7, 0.8);

  if (L >= lv.drums) drumStep(p, s, t, L, phrasePos);
}

function drumStep(p: Player, s: number, t: number, L: number, phrasePos: number) {
  const r = p.rig;
  const b = p.bar;
  const sg = p.song;
  const len = b.len;
  if (b.hits) for (const h of b.hits[s]) hit(r, t, h);
  if (!b.d.d) return;
  if (s === 0 && (L >= 5 || phrasePos === 0 || b.crash)) crash(r, t, 0.9);
  if ((b.fill || phrasePos === sg.phrase - 1) && s >= len - 4) {
    const i = s - (len - 4);
    if (L >= 6) {
      snare(r, t, 0.6 + i * 0.12);
      kick(r, t, 0.9, true);
    } else {
      tom(r, t, [1, 1, 2, 3][i]);
      if (L >= 4 && i % 2 === 0) kick(r, t, 0.9, true);
    }
    return;
  }
  const i = s % 16;
  if (L >= 6) {
    if (sg.res === 1 || sg.half) {
      if (i % 2 === 0) kick(r, t, 0.95, true);
      else snare(r, t, 0.72);
    } else if (i % 2 === 0) {
      kick(r, t, 0.95, true);
      snare(r, t, 0.75);
    }
    if (i % 4 === 0) china(r, t, 0.85);
    return;
  }
  const P = drumGrid(sg, L);
  const tight = L >= 4;
  if (P[0][i] === 'x') kick(r, t, i % 4 === 0 ? 1 : 0.85, tight);
  if (P[1][i] === 'x') snare(r, t, 1);
  if (P[2][i] === 'x') hat(r, t, i % 4 === 0 ? 1 : 0.65);
  if (P[3][i] === 'x') china(r, t, 0.8);
}

function tick() {
  const c = ctx;
  if (!c) return;
  const now = c.currentTime;
  for (const p of players) {
    if (p.fading && now > p.stopAt) {
      p.dead = true;
      disposeRig(p.rig);
      continue;
    }
    if (p.next < now - 0.2) p.next = now + 0.03;
    let guard = 0;
    while (p.next < now + LOOKAHEAD && guard++ < 48) {
      try {
        stepPlayer(c, p);
      } catch {
        // keep the clock alive
      }
      p.next += p.sd;
      if (++p.step >= p.bar.len) {
        p.step = 0;
        p.barIdx++;
      }
    }
  }
  players = players.filter((p) => !p.dead);
  if (!players.length && timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function fadePlayer(p: Player, now: number, sec: number) {
  if (p.fading) return;
  p.fading = true;
  p.stopAt = now + sec + 0.15;
  for (const g of [p.rig.out.gain, p.rig.send.gain]) {
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + Math.max(0.01, sec));
  }
}

function startSong(id: BachTrackId) {
  const c = ctx;
  if (!c || !musicIn || !revIn) return;
  const sg = SONGS[id];
  if (!sg) return;
  const cur = players.find((p) => !p.fading);
  if (cur && cur.song.id === id) return;
  const now = c.currentTime;
  for (const p of players) fadePlayer(p, now, XFADE);
  const rig = buildRig(c, musicIn, revIn);
  for (const g of [rig.out.gain, rig.send.gain]) {
    g.setValueAtTime(cur ? 0 : 1, now);
    if (cur) g.linearRampToValueAtTime(1, now + XFADE);
  }
  const bar = barAt(sg, 0);
  players.push({
    song: sg, rig, next: now + (cur ? 0.03 : 0.06), step: 0, barIdx: 0, beat: 0, L: level,
    sd: 60 / (bar.bpm ?? sg.bpm) / 4, bar, stopAt: Infinity, fading: false, dead: false,
  });
  if (timer === null) timer = setInterval(tick, TICK_MS);
  tick();
}

// ---------- stingers ----------

const lastSting: Record<StingKind, number> = { finale: -1, boss: -1, death: -1, carnage: -1 };

function stab(r: Rig, t: number, name: string, len: number) {
  const c = chord(name);
  const v = voicing(c, 55);
  v.push(fold(c.r, 43));
  for (const m of v) organN(r, t, m, len, 0.075, 0.008);
  voicing(c, 60).forEach((m, i) => harp(r, t + i * 0.012, m, len, 0.18));
  gtr(r, t, fold(c.r, 38), len, 'X', c.p5, 1.05);
  bassN(r, t, fold(c.r, 28), len);
}

function playSting(kind: StingKind) {
  const c = ctx;
  const r = stingRig;
  if (!c || !r) return;
  const now = c.currentTime;
  if (now - lastSting[kind] < 0.25) return;
  lastSting[kind] = now;
  const t0 = now + 0.03;
  let dur = 2;

  if (kind === 'finale') {
    applyLevel(r, 3, t0);
    [62, 64, 66, 67, 69, 71, 73, 74, 76, 78, 79, 81, 83, 85, 86].forEach((m, i) => harp(r, t0 + i * 0.03, m, 0.09, 0.2));
    const t1 = t0 + 0.48;
    const t2 = t1 + 0.4;
    const t3 = t2 + 0.46;
    stab(r, t1, 'G', 0.36);
    kick(r, t1, 1);
    snare(r, t1, 0.9);
    stab(r, t2, 'A7', 0.42);
    kick(r, t2, 1);
    for (let i = 0; i < 10; i++) harp(r, t2 + 0.03 + i * 0.04, i % 2 ? 78 : 76, 0.05, 0.16);
    for (let i = 0; i < 12; i++) snare(r, t2 + 0.06 + i * 0.033, 0.3 + i * 0.05);
    [50, 57, 62, 66, 69, 74, 78, 81, 86].forEach((m, i) => harp(r, t3 + i * 0.018, m, 2.0, 0.2));
    [38, 50, 57, 62, 66, 69, 74].forEach((m) => organN(r, t3, m, 2.2, 0.075, 0.01));
    [62, 66, 69, 74].forEach((m) => choirN(r, t3, m, 2.0, 0.08, 0.08));
    gtr(r, t3, 38, 2.2, 'X', 7, 1.1);
    bassN(r, t3, 26, 2.2);
    kick(r, t3, 1.1);
    crash(r, t3, 1);
    china(r, t3, 0.8);
    tom(r, t3, 3, 1);
    dur = t3 - now + 2.2;
  } else if (kind === 'boss') {
    applyLevel(r, 5, t0);
    [49, 48, 47].forEach((rt, i) => {
      const tt = t0 + i * 0.3;
      const ln = i < 2 ? 0.28 : 2.0;
      [rt - 12, rt, rt + 3, rt + 6, rt + 9, rt + 12].forEach((m) => organN(r, tt, m, ln, 0.065, 0.008));
      gtr(r, tt, fold(rt, 38), ln, 'X', 6, 1, i === 2 ? { to: 0.5, at: 0.9, dur: 1.1 } : undefined);
      bassN(r, tt, fold(rt, 28), ln);
      kick(r, tt, 1.1);
      china(r, tt, 1);
    });
    const tf = t0 + 0.6;
    [59, 62, 65, 68].forEach((m) => choirN(r, tf, m, 1.8, 0.09, 0.12));
    crash(r, tf, 1);
    [59, 62, 65, 68, 71, 74, 77, 80, 83, 80, 77, 74, 71, 68, 65, 62].forEach((m, i) => harp(r, tf + 0.05 + i * 0.045, m, 0.1, 0.17));
    for (let i = 0; i < 6; i++) tom(r, tf + 0.9 + i * 0.12, i < 3 ? 2 : 3, 0.9);
    dur = 2.8;
  } else if (kind === 'death') {
    applyLevel(r, 0, t0);
    const bt = 0.6;
    [46, 58, 67, 70, 74].forEach((m, i) => harp(r, t0 + i * 0.035, m, bt * 1.4, 0.17));
    [58, 62, 67].forEach((m) => organN(r, t0, m, bt * 0.95, 0.035, 0.08));
    [45, 57, 69, 73, 76].forEach((m, i) => harp(r, t0 + bt + i * 0.035, m, bt * 1.4, 0.17));
    [57, 61, 64].forEach((m) => organN(r, t0 + bt, m, bt * 0.95, 0.035, 0.08));
    const t2 = t0 + bt * 2.1;
    [50, 62, 65, 69, 74].forEach((m, i) => harp(r, t2 + i * 0.04, m, 2.2, 0.18, { to: 0.42 + i * 0.03, at: 0.25 + i * 0.05, dur: 1.5 }));
    [50, 57, 62, 65].forEach((m) => organN(r, t2, m, 1.8, 0.04, 0.05, { to: 0.5, at: 0.3, dur: 1.5 }));
    const t3 = t2 + 2.3;
    harp(r, t3, 85, 0.3, 0.15, { to: 0.94, at: 0.02, dur: 0.15 });
    tom(r, t3 + 0.25, 3, 0.6);
    dur = t3 - now + 0.6;
  } else {
    applyLevel(r, 6, t0);
    const sc = [0, 2, 3, 5, 7, 8, 11];
    const st = 0.034;
    const count = 20;
    for (let i = 0; i < count; i++) {
      const tt = t0 + i * st;
      harp(r, tt, 62 + sc[i % 7] + 12 * Math.floor(i / 7), 0.06, 0.2);
      if (i % 2 === 0) kick(r, tt, 0.6 + i * 0.02, true);
      else snare(r, tt, 0.4 + i * 0.03);
      if (i % 4 === 0) gtr(r, tt, 38 + Math.floor(i / 4), st * 3.5, 'p', 7, 0.9);
    }
    china(r, t0, 0.9);
    const tS = t0 + count * st;
    flute(r, tS, 93, 0.8, 0.2, { to: 1.0595, at: 0.04, dur: 0.18 });
    harp(r, tS, 93, 0.5, 0.22);
    gtr(r, tS, 38, 0.9, 'X', 7, 1.1);
    bassN(r, tS, 26, 0.9);
    kick(r, tS, 1.1);
    crash(r, tS, 1);
    china(r, tS, 1);
    dur = tS - now + 0.9;
  }

  if (duckG) {
    const g = duckG.gain;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(0.4, now, 0.03);
    g.setTargetAtTime(1, now + dur, 0.25);
  }
}

// ---------- public API ----------

export const bach = {
  init(c?: AudioContext): void {
    try {
      if (!ctx) {
        let nc: AudioContext | null = c ?? null;
        if (!nc) {
          const AC = getAC();
          if (!AC) return;
          nc = new AC();
        }
        ctx = nc;
        buildGraph(nc);
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
      if (pending) {
        const id = pending;
        pending = null;
        startSong(id);
      }
    } catch {
      // Web Audio unavailable
    }
  },

  play(id: BachTrackId, intensity?: number): void {
    if (intensity !== undefined) level = clamp(Math.round(intensity), 0, 6);
    if (!ctx) {
      pending = id;
      return;
    }
    try {
      if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
      startSong(id);
    } catch {
      // ignore
    }
  },

  stop(fade = 0.5): void {
    pending = null;
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      for (const p of players) fadePlayer(p, now, Math.max(0, fade));
    } catch {
      // ignore
    }
  },

  setIntensity(lvl: number): void {
    level = clamp(Math.round(lvl), 0, 6);
  },

  setVolume(v: number): void {
    volume = clamp(v, 0, 1);
    if (!ctx || !volG) return;
    try {
      volG.gain.setTargetAtTime(volume, ctx.currentTime, 0.03);
    } catch {
      // ignore
    }
  },

  isPlaying(): boolean {
    return players.some((p) => !p.fading);
  },

  current(): BachTrackId | null {
    const p = players.find((x) => !x.fading);
    return p ? p.song.id : null;
  },

  analyser(): AnalyserNode | null {
    return anl;
  },

  onBeat(cb: (beat: number, bar: number) => void): () => void {
    subs.add(cb);
    return () => {
      subs.delete(cb);
    };
  },

  sting(kind: 'finale' | 'boss' | 'death' | 'carnage'): void {
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
      playSting(kind);
    } catch {
      // ignore
    }
  },
};
