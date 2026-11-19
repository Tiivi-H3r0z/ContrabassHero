// Music studio data model. Mirrors game/audio/tracks.json (read by game/audio/music.ts).
// Musical positions are stored on the grid: start / loop in beats, sections in bars, kicks in 16ths,
// all counted from `phase` (time in seconds of beat 0, aligned on the kick).

export type SectionType = 'normal' | 'drop' | 'break';
export interface Section { bar: number; type: SectionType }
export interface Anchor { beat: number; time: number }
// Build-up: punches get denser and stronger from bar `from` to bar `to`, then an explosion on the first step of `to` (the drop).
export interface Ramp { from: number; to: number }
// Punch style learnt from a hand-edited passage: per 16th position of the bar, minimum detected strength
// to keep a kick (0 = always, 10 = never) and the strength the user gives it (null = keep the detected one).
export interface KickRule { thr: number[]; level: (number | null)[]; from: number; to: number; accuracy: number }

export interface AutoSnap { bpm: number; phase: number; start: number; loopStart: number; loopEnd: number; sections: Section[]; ramps?: Ramp[] }

export interface TrackDoc {
  bpm: number;
  phase: number;
  start: number;
  loopStart: number;
  loopEnd: number;
  kickMin: number;
  kicks?: string;
  kickEdits: Record<string, number>;
  sections: Section[];
  ramps: Ramp[];
  // boss arrival (beats); null / undefined = automatic (2nd drop, at least 90 s of play)
  boss?: number | null;
  anchors: Anchor[];
  kickRule?: KickRule;
  ruleOn?: boolean;
  breakPunch?: boolean;
  // kicks is the final composed map: the game fires on any digit >= 1 (otherwise on digits >= kickMin)
  kicksFinal?: boolean;
  auto?: AutoSnap;
  updated?: string;
}

export interface StudioData { version: 1; slots: Record<string, string>; tracks: Record<string, TrackDoc> }

export const STAGES = [1, 2, 3, 4, 5, 6, 7];
export const HEROES = ['armand', 'adrien', 'eliot', 'swan', 'pierre', 'audrey'] as const;

export const beatLen = (d: Pick<TrackDoc, 'bpm'>) => 60 / d.bpm;
export const stepLen = (d: Pick<TrackDoc, 'bpm'>) => 15 / d.bpm;
export const beatTime = (d: Pick<TrackDoc, 'bpm' | 'phase'>, beat: number) => d.phase + beat * beatLen(d);
export const timeBeat = (d: Pick<TrackDoc, 'bpm' | 'phase'>, t: number) => (t - d.phase) / beatLen(d);
export const barTime = (d: Pick<TrackDoc, 'bpm' | 'phase'>, bar: number) => beatTime(d, bar * 4);

export const sectionAt = (d: TrackDoc, t: number): SectionType => {
  let s: SectionType = 'normal';
  const sorted = [...d.sections].sort((a, b) => a.bar - b.bar);
  for (const x of sorted) { if (barTime(d, x.bar) <= t + 1e-6) s = x.type; else break; }
  return s;
};

// Least-squares fit of a constant tempo through the anchors (time = phase + beat * T).
export const fitAnchors = (anchors: Anchor[], fallbackBpm: number): { bpm: number; phase: number } | null => {
  if (!anchors.length) return null;
  if (anchors.length === 1) {
    const T = 60 / fallbackBpm;
    return { bpm: fallbackBpm, phase: anchors[0].time - anchors[0].beat * T };
  }
  const n = anchors.length;
  const mb = anchors.reduce((s, a) => s + a.beat, 0) / n;
  const mt = anchors.reduce((s, a) => s + a.time, 0) / n;
  let cov = 0, vb = 0;
  for (const a of anchors) { cov += (a.beat - mb) * (a.time - mt); vb += (a.beat - mb) ** 2; }
  if (vb < 1e-9) return { bpm: fallbackBpm, phase: mt - mb * (60 / fallbackBpm) };
  const T = cov / vb;
  if (T <= 0.2 || T > 1.2) return null;
  return { bpm: 60 / T, phase: mt - mb * T };
};

export const anchorError = (d: TrackDoc, a: Anchor) => a.time - beatTime(d, a.beat);

export const round = (x: number, p = 10000) => Math.round(x * p) / p;

export const snapOf = (d: TrackDoc) => ({
  bpm: round(d.bpm), phase: round(d.phase), start: d.start, loopStart: d.loopStart, loopEnd: d.loopEnd,
  sections: d.sections.map((s) => ({ ...s })),
  ramps: (d.ramps ?? []).map((r) => ({ ...r })),
});

export const fmtTime = (t: number) => {
  const s = Math.max(0, t);
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(2).padStart(5, '0')}`;
};

// Bars.beats.sixteenths, 1-based like a DAW.
export const fmtBBS = (d: TrackDoc, t: number) => {
  const st = Math.floor((t - d.phase) / stepLen(d) + 1e-6);
  const bar = Math.floor(st / 16);
  const beat = Math.floor((st - bar * 16) / 4);
  const six = st - bar * 16 - beat * 4;
  return `${bar + 1}.${beat + 1}.${six + 1}`;
};

export const slotLabel = (slot: string) => {
  const [k, n] = slot.split('-');
  return k === 'boss' ? `Boss ${n}` : `Niveau ${n}`;
};

export const slotsOf = (data: StudioData, file: string) => Object.entries(data.slots).filter(([, f]) => f === file).map(([s]) => s).sort();

// Human readable diff between the auto proposal and the final settings (pasted back to Claude to improve the detection).
export const adjustmentReport = (data: StudioData) => {
  const out: string[] = ['Ajustements musique (proposition auto -> réglage final)'];
  for (const [file, d] of Object.entries(data.tracks) as [string, TrackDoc][]) {
    const a = d.auto;
    out.push('', `## ${file}  [${slotsOf(data, file).map(slotLabel).join(', ') || 'non affecté'}]`);
    if (!a) { out.push('pas de proposition auto enregistrée'); continue; }
    const T = 60 / d.bpm;
    out.push(`BPM: ${a.bpm} -> ${round(d.bpm, 1000)}${Math.abs(a.bpm - d.bpm) < 0.005 ? ' (inchangé)' : ''}`);
    const dPhase = d.phase - a.phase;
    out.push(`Phase: ${a.phase.toFixed(4)} s -> ${d.phase.toFixed(4)} s (${dPhase >= 0 ? '+' : ''}${(dPhase * 1000).toFixed(1)} ms, soit ${(dPhase / T).toFixed(3)} temps)`);
    out.push(`Début: temps ${a.start} -> ${d.start} | Boucle: ${a.loopStart}-${a.loopEnd} -> ${d.loopStart}-${d.loopEnd}`);
    const fmtS = (s: Section[]) => s.length ? [...s].sort((x, y) => x.bar - y.bar).map((x) => `${x.type}@${x.bar + 1}`).join(' ') : '(aucune)';
    out.push(`Sections auto: ${fmtS(a.sections)}`);
    out.push(`Sections final: ${fmtS(d.sections)}`);
    const edits = Object.entries(d.kickEdits);
    const added = edits.filter(([, v]) => v > 0).length;
    out.push(`Kicks: seuil ${d.kickMin}, ${edits.length} retouches (${added} ajouts/forces, ${edits.length - added} suppressions)`);
    if (edits.length) out.push('Retouches (mesure.temps.16e=force): ' + edits.slice(0, 40).map(([k, v]) => {
      const st = +k; const bar = Math.floor(st / 16), beat = Math.floor((st % 16) / 4), six = st % 4;
      return `${bar + 1}.${beat + 1}.${six + 1}=${v}`;
    }).join(' ') + (edits.length > 40 ? ' …' : ''));
    const fmtR = (r?: Ramp[]) => r && r.length ? r.map((x) => `${x.from + 1}-${x.to + 1}`).join(' ') : '(aucune)';
    out.push(`Montées auto: ${fmtR(a.ramps)} | final: ${fmtR(d.ramps)}`);
    if (d.kickRule) out.push(`Style appris (mes. ${d.kickRule.from + 1}-${d.kickRule.to}, ${Math.round(d.kickRule.accuracy * 100)} %): seuils par 16e ${d.kickRule.thr.join(',')} | forces ${d.kickRule.level.map((x) => x ?? '-').join(',')}${d.ruleOn === false ? ' (désactivé)' : ''}`);
    if (d.anchors.length) out.push(`Ancres: ${d.anchors.map((x) => `temps ${x.beat}@${x.time.toFixed(3)}s`).join(', ')}`);
  }
  return out.join('\n');
};
