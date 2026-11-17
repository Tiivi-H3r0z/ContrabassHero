import type { CharacterType } from '../types';

// "Plasma froid" palette. Roles are strict: danger is reserved to enemies, telegraphs and damage taken.
export const PAL = {
  void: '#03111a',
  void2: '#082233',
  void3: '#0e3346',
  ink: '#01060a',
  bone: '#e8fbff',
  fog: '#86aebf',
  power: '#00ffd5',
  ui: '#4da3ff',
  combo: '#ff3d8b',
  reward: '#ffc21a',
  danger: '#ff5a1a',
} as const;

export const HERO_COLORS: Record<CharacterType, string> = {
  armand: '#3ad7ff',
  adrien: '#ffb21a',
  eliot: '#a6ff00',
  swan: '#8f6bff',
  pierre: '#fff6a0',
  audrey: '#ff5fd2',
};

export const NUANCES = ['pp', 'p', 'mf', 'f', 'ff', 'fff'] as const;
export const NUANCE_NAMES = ['pianissimo', 'piano', 'mezzo-forte', 'forte', 'fortissimo', 'fortississimo'];
export const NUANCE_THRESHOLDS = [0, 10, 20, 35, 50, 80];
export const NUANCE_MULT = [1, 1.2, 1.5, 2, 3, 5];

export const nuanceOf = (combo: number) => {
  let n = 0;
  for (let i = 0; i < NUANCE_THRESHOLDS.length; i++) if (combo >= NUANCE_THRESHOLDS[i]) n = i;
  return n;
};
