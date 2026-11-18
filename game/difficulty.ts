import type { Difficulty } from '../types';

export interface DiffDef {
  label: string;
  lives: number;
  iframes: number;
  enemyHp: number;
  enemyCooldown: number;
  enemyWindup: number;
  enemySpeed: number;
  bossHp: number;
  quota: number;
  fallCostsLife: boolean;
  aimAssist: number; // half-angle (radians) of the auto-aim cone when moving, 0 = off
  holdCombo: boolean;
  maxAlive: number;
}

export const DIFFICULTIES: Record<Difficulty, DiffDef> = {
  facile: { label: 'FACILE', lives: 8, iframes: 1.8, enemyHp: 0.75, enemyCooldown: 1.8, enemyWindup: 1.35, enemySpeed: 0.85, bossHp: 0.6, quota: 0.7, fallCostsLife: false, aimAssist: 1.2, holdCombo: true, maxAlive: 0.75 },
  normal: { label: 'NORMAL', lives: 6, iframes: 1.4, enemyHp: 1, enemyCooldown: 1.2, enemyWindup: 1.1, enemySpeed: 1, bossHp: 0.85, quota: 0.9, fallCostsLife: true, aimAssist: 0.7, holdCombo: true, maxAlive: 0.9 },
  carnage: { label: 'CARNAGE', lives: 5, iframes: 1.2, enemyHp: 1.15, enemyCooldown: 0.9, enemyWindup: 0.9, enemySpeed: 1.1, bossHp: 1.15, quota: 1.1, fallCostsLife: true, aimAssist: 0, holdCombo: false, maxAlive: 1.1 },
};

export const DIFF_ORDER: Difficulty[] = ['facile', 'normal', 'carnage'];
