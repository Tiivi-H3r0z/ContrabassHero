export type CharacterType = 'armand' | 'adrien' | 'eliot' | 'swan' | 'pierre' | 'audrey';

export const CHARACTERS: CharacterType[] = ['armand', 'adrien', 'eliot', 'swan', 'pierre', 'audrey'];

export interface KeyBindings {
  up: string[];
  down: string[];
  left: string[];
  right: string[];
  attack: string[];
  heavy: string[];
  dash: string[];
  jump: string[];
  special: string[];
}

export type Action = keyof KeyBindings;

export type Difficulty = 'facile' | 'normal' | 'carnage';

export interface GameSettings {
  master: number;
  music: number;
  sfx: number;
  shake: boolean;
  flashes: boolean;
  difficulty: Difficulty;
  keys: KeyBindings;
}

export interface RunState {
  character: CharacterType;
  stage: number;
  lives: number;
  score: number;
  kills: number;
  maxCombo: number;
  time: number;
}

export interface StageStats {
  stage: number;
  kills: number;
  maxCombo: number;
  score: number;
  time: number;
  damageTaken: number;
  grade: string;
}
