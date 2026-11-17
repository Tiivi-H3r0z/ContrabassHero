import * as THREE from 'three';
import { PAL } from '../palette';
import { box, cap, cone, cyl, hemi, mergeParts, Part, sph, tor } from '../models/builder';

export type EnemyKind = 'solfege' | 'surveillant' | 'maths' | 'cpe' | 'inspecteur';

const SKIN = '#d9cfc0';
const INK = PAL.ink;
const EYE = PAL.danger;

const face = (y: number, z: number, opts: { glasses?: boolean; monocle?: boolean; mustache?: boolean } = {}): Part[] => {
  const p: Part[] = [
    sph(0.17, '#f4efe6', [-0.2, y, z], [1, 0.8, 0.6]),
    sph(0.17, '#f4efe6', [0.2, y, z], [1, 0.8, 0.6]),
    sph(0.075, EYE, [-0.2, y, z + 0.1], 1, 3),
    sph(0.075, EYE, [0.2, y, z + 0.1], 1, 3),
    box(0.3, 0.07, 0.06, INK, [-0.2, y + 0.18, z + 0.06], [0, 0, -0.45]),
    box(0.3, 0.07, 0.06, INK, [0.2, y + 0.18, z + 0.06], [0, 0, 0.45]),
    box(0.3, 0.06, 0.05, INK, [0, y - 0.32, z + 0.02], [0, 0, 0.12]),
  ];
  if (opts.glasses) p.push(tor(0.2, 0.035, INK, [-0.2, y, z + 0.1]), tor(0.2, 0.035, INK, [0.2, y, z + 0.1]));
  if (opts.monocle) p.push(tor(0.21, 0.04, '#d4a017', [0.2, y, z + 0.12]));
  if (opts.mustache) p.push(sph(0.14, '#3a2a20', [-0.12, y - 0.2, z + 0.03], [1.4, 0.5, 0.6]), sph(0.14, '#3a2a20', [0.12, y - 0.2, z + 0.03], [1.4, 0.5, 0.6]));
  return p;
};

const legs = (col: string, h = 0.5, w = 0.2): Part[] => [cap(0.13, h, col, [-w, 0.4, 0]), cap(0.13, h, col, [w, 0.4, 0]), box(0.26, 0.14, 0.4, INK, [-w, 0.07, 0.06]), box(0.26, 0.14, 0.4, INK, [w, 0.07, 0.06])];

export const ENEMY_GEOS: Record<EnemyKind, () => THREE.BufferGeometry> = {
  solfege: () => mergeParts([
    ...legs('#3a3a44'),
    cap(0.5, 0.6, '#6b6a75', [0, 1.25, 0], [0, 0, 0], [1, 1, 0.8]),
    box(0.12, 0.55, 0.05, '#7a2a2a', [0, 1.35, 0.42]),
    cap(0.1, 0.55, '#6b6a75', [-0.6, 1.2, 0], [0, 0, 0.25]), cap(0.1, 0.55, '#6b6a75', [0.6, 1.2, 0], [0, 0, -0.25]),
    cyl(0.025, 0.025, 1.1, '#e8e2d0', [0.75, 1.0, 0.45], [1.2, 0, 0]),
    sph(0.55, SKIN, [0, 2.25, 0]),
    hemi(0.57, '#8a8a92', [0, 2.3, -0.06], [-0.5, 0, 0]),
    sph(0.24, '#8a8a92', [0, 2.6, -0.45]),
    ...face(2.3, 0.42),
  ]),
  surveillant: () => mergeParts([
    ...legs('#4a5060', 0.75, 0.16),
    cap(0.38, 0.75, '#b8a888', [0, 1.55, 0], [0, 0, 0], [1, 1, 0.8]),
    box(0.06, 0.8, 0.05, '#d8ccb0', [0, 1.55, 0.31]),
    cap(0.08, 0.7, '#b8a888', [-0.48, 1.45, 0], [0, 0, 0.2]), cap(0.08, 0.7, '#b8a888', [0.48, 1.45, 0], [0, 0, -0.2]),
    sph(0.46, SKIN, [0, 2.6, 0]),
    hemi(0.5, '#4a5060', [0, 2.72, 0], [0, 0, 0]),
    box(0.55, 0.06, 0.45, '#4a5060', [0, 2.74, 0.4]),
    sph(0.09, '#c8ccd4', [0.05, 2.32, 0.46]),
    ...face(2.6, 0.36),
  ]),
  maths: () => mergeParts([
    ...legs('#4a3a30'),
    cap(0.52, 0.55, '#7a5c44', [0, 1.2, 0], [0, 0, 0], [1, 1, 0.85]),
    box(0.3, 0.3, 0.05, '#5a4434', [-0.22, 1.0, 0.44]),
    cap(0.1, 0.55, '#7a5c44', [-0.6, 1.2, 0], [0, 0, 0.25]), cap(0.1, 0.55, '#7a5c44', [0.62, 1.35, 0.2], [-1.0, 0, -0.3]),
    box(0.12, 0.35, 0.12, '#f4f4f4', [0.75, 1.55, 0.55], undefined, 1.2),
    sph(0.56, SKIN, [0, 2.2, 0]),
    sph(0.2, '#9a8f84', [-0.5, 2.2, -0.1], [0.7, 1.2, 1]), sph(0.2, '#9a8f84', [0.5, 2.2, -0.1], [0.7, 1.2, 1]),
    ...face(2.25, 0.42, { glasses: true }),
  ]),
  cpe: () => mergeParts([
    ...legs('#2a3448', 0.4, 0.3),
    sph(0.95, '#3c4a66', [0, 1.45, 0], [1, 1, 0.85]),
    cap(0.16, 0.6, '#3c4a66', [-0.95, 1.35, 0.2], [-0.6, 0, 0.3]), cap(0.16, 0.6, '#3c4a66', [0.95, 1.35, 0.2], [-0.6, 0, -0.3]),
    box(1.6, 1.25, 0.32, '#5a3a2a', [0, 1.35, 1.0]),
    box(1.0, 0.5, 0.06, '#6e4a36', [0, 1.55, 1.18]),
    box(0.25, 0.12, 0.08, '#d4a017', [0, 1.4, 1.22]),
    sph(0.55, SKIN, [0, 2.6, 0.1]),
    hemi(0.57, '#3a2a20', [0, 2.65, 0.05], [-0.3, 0, 0]),
    ...face(2.65, 0.5, { mustache: true }),
  ]),
  inspecteur: () => mergeParts([
    ...legs('#1e1e24', 0.6, 0.2),
    cone(0.85, 1.9, '#2e2e36', [0, 1.35, 0], [0, 0, 0], 12),
    cap(0.1, 0.7, '#2e2e36', [-0.55, 1.65, 0], [0, 0, 0.3]), cap(0.1, 0.7, '#2e2e36', [0.55, 1.65, 0], [0, 0, -0.3]),
    box(0.75, 0.55, 0.2, '#4a2a1a', [0.85, 0.95, 0.1]),
    box(0.3, 0.08, 0.06, '#d4a017', [0.85, 1.25, 0.1]),
    sph(0.5, SKIN, [0, 2.65, 0]),
    cyl(0.62, 0.62, 0.06, INK, [0, 3.02, 0]), hemi(0.42, INK, [0, 3.04, 0]),
    box(0.06, 0.6, 0.04, '#d4a017', [0, 1.8, 0.62], undefined, 1.5),
    ...face(2.7, 0.38, { monocle: true }),
  ]),
};

export interface EnemyStats { hp: number; speed: number; radius: number; mass: number; score: number; height: number; reach: number }

export const ENEMY_STATS: Record<EnemyKind, EnemyStats> = {
  solfege: { hp: 40, speed: 5.2, radius: 0.75, mass: 1, score: 100, height: 2.9, reach: 2.0 },
  surveillant: { hp: 26, speed: 8.8, radius: 0.65, mass: 0.8, score: 80, height: 3.1, reach: 1.8 },
  maths: { hp: 34, speed: 4.4, radius: 0.75, mass: 1, score: 150, height: 2.9, reach: 14 },
  cpe: { hp: 150, speed: 3.3, radius: 1.15, mass: 3, score: 300, height: 3.2, reach: 2.4 },
  inspecteur: { hp: 240, speed: 3.8, radius: 1.0, mass: 2.4, score: 600, height: 3.4, reach: 2.2 },
};

export const ENEMY_CAP: Record<EnemyKind, number> = { solfege: 110, surveillant: 60, maths: 34, cpe: 22, inspecteur: 12 };
