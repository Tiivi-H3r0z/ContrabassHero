import * as THREE from 'three';
import { box, buildRig, cap, cone, cyl, hemi, ico, Part, PivotDef, sph, tor } from '../models/builder';
import { PAL } from '../palette';
import { ARENA_RADIUS, PropInstance } from './defs';
import { rng } from './util';

const INK = PAL.ink;

interface PropType {
  radius: number;
  hp: number;
  debris: string[];
  count: number;
  build: (r: () => number) => PivotDef[];
  spin?: string; // pivot name rotated by update()
}

const one = (parts: Part[]): PivotDef[] => [{ name: 'body', parts }];

// ---- 1 École ------------------------------------------------------------------------------
const desk = (): PivotDef[] => one([
  box(2.3, 0.16, 1.3, '#7a5a44', [0, 1.45, 0]),
  box(2.1, 0.5, 1.1, '#5d4434', [0, 1.15, 0]),
  ...[[-1, -0.5], [1, -0.5], [-1, 0.5], [1, 0.5]].map(([x, z]) => cyl(0.06, 0.06, 1.4, '#56607a', [x, 0.7, z], [0, 0, 0], 6)),
  box(0.6, 0.1, 0.45, '#3d6fb0', [0.5, 1.58, 0.1], [0, 0.3, 0]),
  box(0.55, 0.06, 0.4, '#d8d0bc', [0.5, 1.65, 0.1], [0, 0.3, 0]),
  cyl(0.04, 0.04, 0.7, '#c9a43a', [-0.5, 1.56, -0.2], [0, 0, Math.PI / 2 - 0.2], 5),
]);
const chair = (): PivotDef[] => one([
  box(1.0, 0.12, 1.0, '#3f6f7a', [0, 0.95, 0]),
  box(1.0, 0.9, 0.12, '#3f6f7a', [0, 1.55, -0.45], [-0.1, 0, 0]),
  ...[[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]].map(([x, z]) => cyl(0.05, 0.05, 0.95, '#56607a', [x, 0.47, z], [0, 0, 0], 6)),
]);
const lockers = (r: () => number): PivotDef[] => {
  const p: Part[] = [];
  const cols = ['#3b5b8c', '#34507c', '#40649a'];
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 0.95;
    const open = r() > 0.75 && i !== 1;
    p.push(box(0.92, 3.5, 1.1, cols[i], [x, 1.75, 0]));
    for (let k = 0; k < 4; k++) p.push(box(0.5, 0.05, 0.04, '#1a2238', [x, 3.0 - k * 0.12, 0.56]));
    p.push(box(0.08, 0.35, 0.08, '#9aa6c0', [x + 0.32, 1.8, 0.58]));
    if (open) p.push(box(0.88, 3.3, 0.06, cols[i], [x + 0.1, 1.75, 0.95], [0, -1.1, 0]), box(0.75, 3.2, 0.1, '#0c1122', [x, 1.75, 0.52]));
  }
  p.push(box(2.95, 0.12, 1.15, '#22324f', [0, 3.56, 0]), box(2.95, 0.2, 1.15, '#22324f', [0, 0.1, 0]));
  return one(p);
};

// ---- 2 Montagne ---------------------------------------------------------------------------
const SNOW = '#a9c2dc';
const snowman = (r: () => number): PivotDef[] => one([
  sph(1.05, SNOW, [0, 0.95, 0]),
  sph(0.78, SNOW, [0, 2.3, 0]),
  sph(0.56, SNOW, [0, 3.35, 0]),
  sph(0.07, INK, [-0.2, 3.45, 0.5]), sph(0.07, INK, [0.2, 3.45, 0.5]),
  cone(0.1, 0.6, '#c98a4a', [0, 3.32, 0.75], [Math.PI / 2, 0, 0], 6),
  tor(0.5, 0.13, '#3d6fb0', [0, 2.85, 0], [Math.PI / 2, 0, 0]),
  box(0.3, 0.7, 0.1, '#3d6fb0', [0.35, 2.5, 0.5], [0.2, 0, 0.2]),
  cyl(0.04, 0.04, 1.2, '#3a2a20', [-1.1, 2.6, 0], [0, 0, 1.0 + r() * 0.3], 4),
  cyl(0.04, 0.04, 1.2, '#3a2a20', [1.1, 2.6, 0], [0, 0, -1.0 - r() * 0.3], 4),
  ...[0, 1, 2].map((i) => sph(0.07, INK, [0, 2.6 - i * 0.3, 0.76])),
  cyl(0.38, 0.42, 0.5, INK, [0, 3.95, 0], [0.1, 0, 0], 10), cyl(0.6, 0.6, 0.06, INK, [0, 3.72, 0], [0.1, 0, 0], 12),
]);
const iceRock = (r: () => number): PivotDef[] => {
  const p: Part[] = [];
  for (let i = 0; i < 6; i++) {
    const a = r() * 6, d = r() * 0.9;
    p.push(ico(0.7 + r() * 0.7, i % 2 ? '#5f93c4' : '#7aaedb', [Math.cos(a) * d, 0.6 + r() * 0.5, Math.sin(a) * d], [r(), r(), r()], [1, 1.2 + r() * 0.8, 1]));
  }
  p.push(cone(0.45, 3.0, '#9fdcff', [0.1, 1.6, 0], [0.1, 0, -0.15], 4), cone(0.3, 2.2, '#9fdcff', [-0.6, 1.2, 0.4], [0.3, 0, 0.35], 4));
  p.push(cone(0.18, 0.8, '#9ff3ff', [0.12, 3.0, -0.05], [0.1, 0, -0.15], 4, 1.8));
  return one(p);
};
const snowballs = (): PivotDef[] => one([sph(0.6, SNOW, [-0.4, 0.55, 0]), sph(0.55, '#9db6d2', [0.5, 0.5, 0.2]), sph(0.5, SNOW, [0.05, 1.3, 0.1]), sph(0.35, '#9db6d2', [0.1, 0.32, -0.6])]);
const crystal = (r: () => number): PivotDef[] => {
  const p: Part[] = [ico(0.6, '#4f7aa8', [0, 0.3, 0], [0, 0, 0], [1.2, 0.6, 1.2])];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * 6.28, t = 0.25 + r() * 0.3, h = 1.4 + r() * 1.6;
    p.push(cone(0.3, h, '#7fc8ef', [Math.cos(a) * 0.3, h / 2 + 0.2, Math.sin(a) * 0.3], [Math.sin(a) * t, 0, -Math.cos(a) * t], 5, 0.35));
  }
  p.push(cone(0.36, 2.8, '#9ff3ff', [0, 1.6, 0], [0, 0, 0], 5, 1.6));
  return one(p);
};

// ---- 3 Potager ----------------------------------------------------------------------------
const pumpkin = (): PivotDef[] => {
  const p: Part[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    p.push(sph(1.0, i % 2 ? '#4f7418' : '#5a821e', [Math.cos(a) * 0.75, 1.15, Math.sin(a) * 0.75], [0.75, 1.0, 0.75]));
  }
  p.push(sph(1.2, '#4c7016', [0, 1.15, 0], [1.1, 0.95, 1.1]));
  p.push(cyl(0.16, 0.24, 0.7, '#3f5a20', [0, 2.3, 0], [0.2, 0, 0.1], 6));
  // carved glowing face
  p.push(cone(0.28, 0.4, '#c8ff6a', [-0.45, 1.45, 1.62], [Math.PI / 2, 0, 0], 3, 2.2));
  p.push(cone(0.28, 0.4, '#c8ff6a', [0.45, 1.45, 1.62], [Math.PI / 2, 0, 0], 3, 2.2));
  p.push(box(1.1, 0.22, 0.2, '#c8ff6a', [0, 0.85, 1.66], [0, 0, 0], 2.2));
  p.push(box(0.2, 0.2, 0.2, '#4c7016', [-0.2, 0.95, 1.7]), box(0.2, 0.2, 0.2, '#4c7016', [0.25, 0.75, 1.7]));
  return one(p);
};
const carrot = (r: () => number): PivotDef[] => one([
  cone(0.75, 2.6, '#8a3a7e', [0, 1.0, 0], [Math.PI + (r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3], 9),
  tor(0.62, 0.05, '#c060b0', [0, 1.4, 0], [Math.PI / 2, 0, 0], Math.PI * 2, 1.6),
  tor(0.42, 0.05, '#c060b0', [0, 0.6, 0], [Math.PI / 2, 0, 0], Math.PI * 2, 1.6),
  sph(0.85, '#3a281e', [0, 0.05, 0], [1.2, 0.25, 1.2]),
  cone(0.22, 1.6, '#3f8a3a', [0, 2.9, 0], [0, 0, 0.1], 5),
  cone(0.2, 1.4, '#3f8a3a', [0.3, 2.8, 0.1], [0.2, 0, -0.5], 5),
  cone(0.2, 1.4, '#3f8a3a', [-0.3, 2.8, -0.1], [-0.2, 0, 0.5], 5),
  sph(0.12, '#b6ff3a', [0, 3.75, 0], 1, 2.2),
]);
const cabbage = (): PivotDef[] => {
  const p: Part[] = [sph(0.9, '#3f7a48', [0, 0.95, 0])];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    p.push(hemi(0.9, i % 2 ? '#3f8a5a' : '#2f7048', [Math.cos(a) * 0.55, 0.55, Math.sin(a) * 0.55], [Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1], [1, 0.4, 1]));
    p.push(box(0.05, 0.05, 0.75, '#b6ff3a', [Math.cos(a) * 0.95, 0.75, Math.sin(a) * 0.95], [0.5, -a + Math.PI / 2, 0], 1.7));
  }
  return one(p);
};
const mound = (r: () => number): PivotDef[] => one([
  sph(1.0, '#4a3326', [0, 0.05, 0], [1.1, 0.5, 1.0]),
  sph(0.6, '#5a3e2c', [0.5, 0.15, 0.3], [1, 0.6, 1]),
  ico(0.2, '#2a1d16', [-0.6, 0.35, 0.4], [r(), r(), r()]),
  cyl(0.04, 0.04, 0.5, '#3f6a2a', [0, 0.65, 0], [0, 0, 0], 4),
  sph(0.15, '#7cff2e', [0, 0.95, 0], [1, 0.6, 1], 1.8),
]);

// ---- 4 Désert -----------------------------------------------------------------------------
const CACT = '#2f7a6a';
const cactus = (r: () => number): PivotDef[] => {
  const h = 2.6 + r() * 1.2;
  const p: Part[] = [cap(0.45, h, CACT, [0, h / 2 + 0.45, 0])];
  const armL = 1.0 + r(), armR = 1.4 + r();
  p.push(cap(0.28, 0.6, CACT, [-0.65, armL, 0], [0, 0, Math.PI / 2]), cap(0.28, 0.9, CACT, [-0.95, armL + 0.55, 0]));
  p.push(cap(0.28, 0.6, CACT, [0.65, armR, 0], [0, 0, Math.PI / 2]), cap(0.28, 0.7, CACT, [0.95, armR + 0.45, 0]));
  for (let i = 0; i < 4; i++) p.push(box(0.04, h * 0.85, 0.04, '#1f5a4c', [Math.cos(i * 1.57) * 0.44, h / 2 + 0.4, Math.sin(i * 1.57) * 0.44]));
  p.push(sph(0.2, '#ff5fc8', [0, h + 0.95, 0], [1, 0.6, 1], 2), sph(0.14, '#ff5fc8', [-0.95, armL + 1.15, 0], [1, 0.6, 1], 2));
  return one(p);
};
const rock = (r: () => number): PivotDef[] => one([
  ico(1.4, '#7a4a6a', [0, 0.9, 0], [r(), r(), r()], [1.2, 0.8, 1.1], 1),
  ico(0.9, '#8a5678', [0.9, 1.7, 0.3], [r(), r(), r()], [1, 0.8, 1], 1),
  ico(0.7, '#6a3c5c', [-1.0, 0.5, 0.6], [r(), r(), r()], 1, 1),
  box(2.4, 0.08, 0.6, '#b06a90', [0.1, 1.1, 1.05], [0, 0.1, 0.05]),
]);
const skull = (): PivotDef[] => one([
  sph(1.6, '#c9b4c4', [0, 1.1, 0], [1.1, 0.9, 1.0]),
  sph(1.1, '#bda6b8', [0, 0.6, 1.3], [0.9, 0.6, 0.9]),
  sph(0.45, INK, [-0.6, 1.4, 1.2], [1, 1.1, 0.6]), sph(0.45, INK, [0.6, 1.4, 1.2], [1, 1.1, 0.6]),
  sph(0.13, '#ff5fc8', [-0.6, 1.35, 1.42], 1, 2.4), sph(0.13, '#ff5fc8', [0.6, 1.35, 1.42], 1, 2.4),
  cone(0.16, 0.4, INK, [0, 0.85, 2.05], [Math.PI / 2, 0, 0], 3),
  ...[-0.45, -0.15, 0.15, 0.45].map((x) => box(0.2, 0.3, 0.15, '#e0d0dc', [x, 0.25, 2.05])),
  cone(0.35, 2.4, '#d8c8d4', [-1.6, 2.3, 0], [0, 0, 1.0], 8), cone(0.35, 2.4, '#d8c8d4', [1.6, 2.3, 0], [0, 0, -1.0], 8),
  sph(1.9, '#9a4a74', [0, 0, 0], [1.3, 0.25, 1.4]),
]);
const barrel = (r: () => number): PivotDef[] => one([
  sph(0.7, '#2a6e5e', [0, 0.6, 0], [1, 0.9, 1]),
  ...Array.from({ length: 6 }, (_, i) => box(0.04, 1.1, 0.04, '#1f5a4c', [Math.cos(i * 1.05) * 0.69, 0.6, Math.sin(i * 1.05) * 0.69])),
  sph(0.5, '#2a6e5e', [0.75, 0.4, 0.3 * r()], 0.9),
  sph(0.16, '#ff5fc8', [0, 1.25, 0], [1, 0.6, 1], 2),
]);

// ---- 5 Volcan -----------------------------------------------------------------------------
const lavaRock = (r: () => number): PivotDef[] => {
  const p: Part[] = [ico(1.1, '#4a3a48', [0, 0.8, 0], [r(), r(), r()], [1.2, 0.9, 1.1], 1), ico(0.6, '#5a4858', [0.7, 0.4, 0.5], [r(), r(), r()], 1, 0)];
  for (let i = 0; i < 4; i++) {
    const a = r() * 6.28;
    p.push(box(0.06, 1.3, 0.12, i % 2 ? '#ffd34d' : '#ff3d8b', [Math.cos(a) * 1.15, 0.8, Math.sin(a) * 1.0], [r() - 0.5, -a, r() - 0.5], 2.2));
  }
  return one(p);
};
const obsidian = (r: () => number): PivotDef[] => {
  const p: Part[] = [sph(0.9, '#3a3040', [0, 0, 0], [1, 0.35, 1]), cone(0.12, 0.5, '#ffd34d', [0, 4.0, 0], [0, 0, 0], 4, 2.2)];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * 6.28 + r(), t = i === 0 ? 0 : 0.35 + r() * 0.2, h = i === 0 ? 3.8 : 1.6 + r() * 1.4;
    const d = i === 0 ? 0 : 0.45;
    p.push(cone(i === 0 ? 0.55 : 0.32, h, i % 2 ? '#4a3e66' : '#3a3054', [Math.cos(a) * d, h / 2, Math.sin(a) * d], [Math.sin(a) * t, 0, -Math.cos(a) * t], 4));
  }
  p.push(tor(0.75, 0.06, '#ff3d8b', [0, 0.12, 0], [Math.PI / 2, 0, 0], Math.PI * 2, 2));
  return one(p);
};
const crater = (r: () => number): PivotDef[] => {
  const p: Part[] = [tor(1.5, 0.55, '#4a3a48', [0, 0.35, 0], [Math.PI / 2, 0, 0])];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * 6.28 + r() * 0.3;
    p.push(ico(0.45 + r() * 0.25, '#5a4858', [Math.cos(a) * 1.6, 0.6, Math.sin(a) * 1.6], [r(), r(), r()]));
  }
  p.push(cyl(1.2, 1.2, 0.1, '#ff3d8b', [0, 0.32, 0], [0, 0, 0], 18, 1.8));
  p.push(cyl(0.75, 0.75, 0.12, '#ffd34d', [0, 0.36, 0], [0, 0, 0], 16, 2.2));
  p.push(sph(0.3, '#fff1b0', [0.2, 0.42, -0.1], [1, 0.4, 1], 2.4));
  return one(p);
};

// ---- 6 Jardin enchanté --------------------------------------------------------------------
const bigMushroom = (r: () => number): PivotDef[] => {
  const cap1 = r() > 0.5 ? '#7a3a9a' : '#8a2f7a';
  const p: Part[] = [
    cyl(0.45, 0.7, 2.6, '#bfb0c8', [0, 1.3, 0], [0, 0, 0.06], 12),
    sph(2.0, cap1, [0, 2.9, 0], [1, 0.55, 1]),
    cyl(1.9, 1.9, 0.12, '#d070ff', [0, 2.62, 0], [0, 0, 0], 20, 1.0),
    tor(0.55, 0.1, '#d8c8e4', [0, 1.9, 0], [Math.PI / 2, 0, 0]),
  ];
  for (let i = 0; i < 7; i++) {
    const a = r() * 6.28, d = 0.4 + r() * 1.3;
    p.push(sph(0.18 + r() * 0.12, i % 3 ? '#6ffcff' : '#ff8af0', [Math.cos(a) * d, 2.9 + Math.sqrt(Math.max(0, 1 - (d / 2) ** 2)) * 1.05, Math.sin(a) * d], [1, 0.5, 1], 2.0));
  }
  return one(p);
};
const gnome = (): PivotDef[] => one([
  cone(0.6, 1.2, '#3d5a8a', [0, 0.6, 0], [0, 0, 0], 10),
  sph(0.42, '#d8b0a0', [0, 1.45, 0]),
  cone(0.45, 1.3, '#6a2a7a', [0, 2.3, -0.1], [-0.25, 0, 0], 10),
  cone(0.42, 0.9, '#d8d0dc', [0, 1.05, 0.28], [Math.PI + 0.3, 0, 0], 8),
  sph(0.12, '#c08080', [0, 1.4, 0.42]),
  sph(0.09, '#ff3d8b', [-0.16, 1.55, 0.36], 1, 3), sph(0.09, '#ff3d8b', [0.16, 1.55, 0.36], 1, 3),
  box(0.3, 0.04, 0.04, INK, [0, 1.25, 0.4], [0, 0, 0.15]),
  box(0.05, 0.8, 0.05, '#7a6a5a', [0.55, 0.75, 0.2], [0, 0, -0.2]),
]);
const windmill = (): PivotDef[] => {
  const blades: Part[] = [sph(0.18, '#3a2a40', [0, 0, 0])];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    blades.push(box(0.35, 1.3, 0.05, i % 2 ? '#d8c8e4' : '#9a5ab8', [Math.sin(a) * 0.7, Math.cos(a) * 0.7, 0], [0, 0, -a]));
  }
  return [
    { name: 'body', parts: [cyl(0.35, 0.75, 3.2, '#8a6a5a', [0, 1.6, 0], [0, 0, 0], 6), cone(0.6, 0.9, '#5a2a6a', [0, 3.6, 0], [0, 0, 0], 6), box(0.3, 0.5, 0.1, '#ffe08a', [0, 1.8, 0.62], [0.2, 0, 0], 1.6), box(0.25, 0.35, 0.1, INK, [0, 0.4, 0.72], [0.22, 0, 0])] },
    { name: 'blades', parent: 'body', at: [0, 3.0, 0.55], parts: blades },
  ];
};
const shrooms = (r: () => number): PivotDef[] => {
  const p: Part[] = [];
  for (let i = 0; i < 4; i++) {
    const a = r() * 6.28, d = i ? 0.5 + r() * 0.3 : 0, h = 0.5 + r() * 0.8;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    const c = i % 2 ? '#6ffcff' : '#ff8af0';
    p.push(cyl(0.1, 0.14, h, '#c9b8d6', [x, h / 2, z], [0, 0, 0], 6), sph(0.35, c, [x, h, z], [1, 0.55, 1], i === 0 ? 1.6 : 0.5));
  }
  return one(p);
};

// ---- 7 Jungle -----------------------------------------------------------------------------
const totem = (r: () => number): PivotDef[] => {
  const p: Part[] = [];
  const woods = ['#4a5a3a', '#3a4a30', '#56603e'];
  for (let i = 0; i < 3; i++) {
    const y = 0.65 + i * 1.25;
    p.push(box(1.2, 1.2, 1.2, woods[i], [0, y, 0]));
    p.push(box(0.9, 0.12, 0.1, INK, [0, y - 0.3, 0.62]));
    p.push(sph(0.13, '#00ffa3', [-0.28, y + 0.15, 0.6], 1, i === 2 ? 2.4 : 1.4), sph(0.13, '#00ffa3', [0.28, y + 0.15, 0.6], 1, i === 2 ? 2.4 : 1.4));
    p.push(box(0.12, 0.4, 0.1, '#7a8a50', [0, y, 0.64]));
  }
  p.push(box(2.6, 0.22, 0.35, '#6a7a48', [0, 3.2, 0], [0, 0, (r() - 0.5) * 0.1]));
  p.push(cone(0.5, 0.6, '#3a4a30', [0, 4.6, 0], [0, 0, 0], 4));
  return one(p);
};
const fern = (r: () => number): PivotDef[] => {
  const p: Part[] = [sph(0.4, '#1f4a2c', [0, 0.2, 0])];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + r() * 0.3, t = 0.7 + r() * 0.4, l = 1.4 + r() * 0.8;
    p.push(sph(0.35, i % 2 ? '#1f5a34' : '#2a6a3a', [Math.cos(a) * l * 0.5, 0.5 + Math.cos(t) * l * 0.4, Math.sin(a) * l * 0.5], [0.45, 0.12, l * 1.3]));
    p.push(sph(0.08, '#5fffc8', [Math.cos(a) * l, 0.55 + Math.cos(t) * l * 0.3, Math.sin(a) * l], 1, 2.0));
  }
  p.push(cyl(0.05, 0.05, 2.4, '#1f6a3a', [0.2, 1.2, -0.1], [0.1, 0, 0.15], 4));
  return one(p.map((q, i) => (i > 0 && i < 17 && i % 2 === 1 ? { ...q, rot: [0, -((i - 1) / 2 / 8) * Math.PI * 2 + Math.PI / 2, 0] as [number, number, number] } : q)));
};
const flower = (r: () => number): PivotDef[] => {
  const c = r() > 0.5 ? '#ff5fd2' : '#5fe8ff';
  const p: Part[] = [cyl(0.08, 0.12, 1.6, '#1f5a34', [0, 0.8, 0], [0, 0, 0.1], 6), sph(0.45, '#1f5a34', [0.3, 0.3, 0.2], [1, 0.2, 0.5])];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    p.push(sph(0.42, c, [Math.cos(a) * 0.45, 1.75, Math.sin(a) * 0.45], [1, 0.22, 0.6], 0.5));
  }
  p.push(sph(0.25, '#fff6b0', [0, 1.82, 0], [1, 0.6, 1], 2.2));
  return one(p.map((q, i) => (i >= 2 && i < 8 ? { ...q, rot: [0, -((i - 2) / 6) * Math.PI * 2, 0.35] as [number, number, number] } : q)));
};
const stump = (r: () => number): PivotDef[] => {
  const p: Part[] = [cyl(1.4, 1.8, 1.8, '#3a2e22', [0, 0.9, 0], [0, 0, 0], 10), cyl(1.3, 1.3, 0.1, '#6a5a40', [0, 1.82, 0], [0, 0, 0], 10), tor(0.8, 0.05, '#4a3a2a', [0, 1.88, 0], [Math.PI / 2, 0, 0])];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * 6.28 + r() * 0.3;
    p.push(cap(0.25, 1.2, '#3a2e22', [Math.cos(a) * 1.8, 0.2, Math.sin(a) * 1.8], [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2]));
  }
  for (let i = 0; i < 6; i++) {
    const a = r() * 6.28;
    p.push(sph(0.12, '#00ffa3', [Math.cos(a) * 1.0, 1.95, Math.sin(a) * 1.0], [1, 0.5, 1], 2.0));
  }
  p.push(cyl(0.06, 0.06, 2.2, '#1f6a3a', [1.3, 1.0, 0.5], [0, 0, 0.2], 4));
  return one(p);
};

const D = {
  wood: ['#7a5a44', '#5d4434', '#56607a'], plastic: ['#3f6f7a', '#56607a'], locker: ['#3b5b8c', '#22324f', '#9aa6c0'],
  snow: [SNOW, '#d8e8f8', '#7aaedb'], ice: ['#7aaedb', '#9fdcff', '#4f7aa8'],
  pumpkin: ['#7fae2a', '#c8ff6a', '#3f5a20'], carrot: ['#8a3a7e', '#3f8a3a', '#c060b0'], cabbage: ['#3f8a5a', '#5aa060', '#b6ff3a'], dirt: ['#4a3326', '#2a1d16', '#5a3e2c'],
  cactus: [CACT, '#1f5a4c', '#ff5fc8'], rock: ['#7a4a6a', '#8a5678', '#b06a90'], bone: ['#c9b4c4', '#e0d0dc', '#9a4a74'],
  lava: ['#4a3a48', '#ffd34d', '#ff3d8b'], obsidian: ['#3a3054', '#4a3e66', '#ff3d8b'], crater: ['#5a4858', '#ffd34d', '#fff1b0'],
  shroom: ['#7a3a9a', '#bfb0c8', '#6ffcff', '#ff8af0'], gnome: ['#3d5a8a', '#6a2a7a', '#d8d0dc'], mill: ['#8a6a5a', '#9a5ab8', '#d8c8e4'],
  totem: ['#4a5a3a', '#3a4a30', '#00ffa3'], fern: ['#1f5a34', '#2a6a3a', '#5fffc8'], flower: ['#ff5fd2', '#5fe8ff', '#1f5a34'], stump: ['#3a2e22', '#6a5a40', '#00ffa3'],
};

const SETS: PropType[][] = [
  [
    { radius: 1.3, hp: 3, debris: D.wood, count: 6, build: desk },
    { radius: 0.8, hp: 2, debris: D.plastic, count: 5, build: chair },
    { radius: 1.8, hp: 4, debris: D.locker, count: 3, build: lockers },
  ],
  [
    { radius: 1.2, hp: 3, debris: D.snow, count: 4, build: snowman },
    { radius: 1.8, hp: 4, debris: D.ice, count: 4, build: iceRock },
    { radius: 1.0, hp: 2, debris: D.snow, count: 4, build: snowballs },
    { radius: 0.9, hp: 2, debris: D.ice, count: 3, build: crystal },
  ],
  [
    { radius: 1.8, hp: 4, debris: D.pumpkin, count: 3, build: pumpkin },
    { radius: 0.9, hp: 2, debris: D.carrot, count: 4, build: carrot },
    { radius: 1.3, hp: 3, debris: D.cabbage, count: 3, build: cabbage },
    { radius: 1.1, hp: 2, debris: D.dirt, count: 4, build: mound },
  ],
  [
    { radius: 1.0, hp: 3, debris: D.cactus, count: 6, build: cactus },
    { radius: 1.7, hp: 4, debris: D.rock, count: 4, build: rock },
    { radius: 2.0, hp: 4, debris: D.bone, count: 1, build: skull },
    { radius: 0.9, hp: 2, debris: D.cactus, count: 3, build: barrel },
  ],
  [
    { radius: 1.3, hp: 3, debris: D.lava, count: 6, build: lavaRock },
    { radius: 1.0, hp: 2, debris: D.obsidian, count: 5, build: obsidian },
    { radius: 2.0, hp: 4, debris: D.crater, count: 3, build: crater },
  ],
  [
    { radius: 1.8, hp: 3, debris: D.shroom, count: 4, build: bigMushroom },
    { radius: 0.8, hp: 2, debris: D.gnome, count: 4, build: gnome },
    { radius: 1.2, hp: 3, debris: D.mill, count: 2, build: windmill, spin: 'blades' },
    { radius: 0.9, hp: 2, debris: D.shroom, count: 4, build: shrooms },
  ],
  [
    { radius: 1.2, hp: 4, debris: D.totem, count: 4, build: totem },
    { radius: 1.1, hp: 2, debris: D.fern, count: 5, build: fern },
    { radius: 0.9, hp: 2, debris: D.flower, count: 4, build: flower },
    { radius: 2.0, hp: 4, debris: D.stump, count: 2, build: stump },
  ],
];

export interface BuiltProps { props: PropInstance[]; spinners: THREE.Object3D[] }

export const buildProps = (stage: number, parent: THREE.Group): BuiltProps => {
  const r = rng(stage * 4243 + 17);
  const set = SETS[Math.min(6, Math.max(0, stage - 1))];
  const queue: PropType[] = [];
  set.forEach((t) => { for (let i = 0; i < t.count; i++) queue.push(t); });
  queue.sort((a, b) => b.radius - a.radius); // place big ones first
  const props: PropInstance[] = [];
  const spinners: THREE.Object3D[] = [];
  const minR = 7, maxR = ARENA_RADIUS - 3;
  for (const t of queue) {
    let pos: THREE.Vector3 | null = null;
    for (let tries = 0; tries < 200 && !pos; tries++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(minR * minR + r() * (maxR * maxR - minR * minR));
      const c = new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d);
      if (d + t.radius > maxR + 1) continue;
      if (props.every((p) => p.position.distanceTo(c) > p.radius + t.radius + 2.2)) pos = c;
    }
    if (!pos) continue;
    const rig = buildRig(t.build(r), 0.06);
    rig.root.position.copy(pos);
    rig.root.rotation.set(0, r() * Math.PI * 2, 0);
    parent.add(rig.root);
    if (t.spin && rig.pivots[t.spin]) spinners.push(rig.pivots[t.spin]);
    props.push({ object: rig.root, position: pos, radius: t.radius, hp: t.hp, debris: t.debris, big: t.radius > 1.6 });
  }
  return { props, spinners };
};
