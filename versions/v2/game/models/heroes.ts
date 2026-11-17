import type { CharacterType } from '../../types';
import { HERO_COLORS, PAL } from '../palette';
import { box, buildRig, cap, cone, cyl, hemi, ico, mergeParts, Part, PivotDef, Rig, sph, tor } from './builder';

const SKIN = '#ffc9a8';
const WOOD = '#b5541c';
const DARKWOOD = '#3a1a0c';
const INK = PAL.ink;

interface Look { shirt: string; pants: string; shoes: string; hair: string; dress?: boolean; glasses?: boolean }

const LOOKS: Record<CharacterType, Look> = {
  armand: { shirt: '#2f6bff', pants: '#1c2a5e', shoes: '#f4f4f4', hair: '#4a2410' },
  adrien: { shirt: '#18b878', pants: '#22305a', shoes: '#ff4d6d', hair: '#ffd23f' },
  eliot: { shirt: '#ff8a3d', pants: '#545c6a', shoes: '#222222', hair: '#f0a060', glasses: true },
  swan: { shirt: '#4b4ad8', pants: '#15151c', shoes: '#f4f4f4', hair: '#2e1c14', glasses: true },
  pierre: { shirt: '#f2efe6', pants: '#7f1d1d', shoes: '#2a1a10', hair: '#ffd23f' },
  audrey: { shirt: '#e3b21a', pants: '#e3b21a', shoes: '#c2185b', hair: '#5d3a28', dress: true },
};

const eyes = (glasses: boolean, cross = 0.04): Part[] => {
  const p: Part[] = [
    sph(0.27, '#ffffff', [-0.29, 0.1, 0.6], [1, 1.1, 0.7]),
    sph(0.27, '#ffffff', [0.29, 0.06, 0.6], [1, 1.1, 0.7]),
    sph(0.055, INK, [-0.29 + cross, 0.12, 0.79]),
    sph(0.055, INK, [0.29 - cross * 1.5, 0.09, 0.79]),
    sph(0.22, INK, [0, -0.36, 0.62], [1.25, 0.6, 0.45]),
    sph(0.1, '#ff6f91', [0.05, -0.42, 0.68], [1, 0.5, 0.6]),
    box(0.18, 0.06, 0.05, '#ffffff', [0, -0.27, 0.71]),
  ];
  if (glasses) {
    p.push(tor(0.3, 0.04, '#111111', [-0.29, 0.1, 0.72]), tor(0.3, 0.04, '#111111', [0.29, 0.06, 0.72]), box(0.22, 0.05, 0.05, '#111111', [0, 0.1, 0.78]));
  }
  return p;
};

const hair = (c: CharacterType, col: string): Part[] => {
  switch (c) {
    case 'armand': return [hemi(0.84, col, [0, 0.04, -0.04], [-0.35, 0, 0]), sph(0.32, col, [0.2, 0.62, 0.45], [1.3, 0.6, 0.8]), sph(0.2, col, [-0.72, 0.05, 0.1], [0.6, 1.3, 0.8]), sph(0.2, col, [0.72, 0.05, 0.1], [0.6, 1.3, 0.8])];
    case 'adrien': {
      const p: Part[] = [hemi(0.83, col, [0, 0.02, 0], [-0.2, 0, 0])];
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        p.push(cone(0.22, 0.75, col, [Math.cos(a) * 0.55, 0.6, Math.sin(a) * 0.5 - 0.05], [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9]));
      }
      p.push(cone(0.25, 0.9, col, [0, 0.95, 0]));
      return p;
    }
    case 'eliot': return [hemi(0.83, col, [0, 0.06, -0.02], [-0.25, 0, 0]), sph(0.25, col, [-0.3, 0.6, 0.5], [1.4, 0.5, 0.7])];
    case 'swan': {
      const p: Part[] = [];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        p.push(sph(0.34, col, [Math.cos(a) * 0.7, 0.35 + Math.sin(i * 2.1) * 0.12, Math.sin(a) * 0.62 - 0.12]));
      }
      p.push(hemi(0.84, col, [0, 0.12, -0.05], [-0.15, 0, 0]), sph(0.36, col, [-0.62, -0.35, -0.1]), sph(0.36, col, [0.62, -0.35, -0.1]));
      return p;
    }
    case 'pierre': return [hemi(0.84, col, [0, 0.03, -0.03], [-0.3, 0, 0]), cap(0.2, 0.9, col, [0, -0.35, -0.85], [0.5, 0, 0]), tor(0.14, 0.06, '#7f1d1d', [0, 0.18, -0.78], [0.4, 0, 0])];
    case 'audrey': {
      const p: Part[] = [hemi(0.86, col, [0, 0.1, -0.05], [-0.2, 0, 0])];
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const r = i % 2 ? 0.42 : 0.36;
        p.push(sph(r, col, [Math.cos(a) * 0.85, -0.1 + Math.sin(i * 1.7) * 0.25, Math.sin(a) * 0.7 - 0.25]));
      }
      return p;
    }
  }
};

export const weaponParts = (c: CharacterType): { parts: Part[]; reach: number } => {
  const g = HERO_COLORS[c];
  switch (c) {
    case 'armand': {
      const o = -2.5;
      const p: Part[] = [
        sph(1, WOOD, [0, 1.25 + o, 0], [0.78, 1.0, 0.3]),
        sph(1, WOOD, [0, 2.3 + o, 0], [0.56, 0.56, 0.28]),
        box(0.16, 1.9, 0.13, DARKWOOD, [0, 3.2 + o, 0.05]),
        sph(0.16, DARKWOOD, [0, 4.2 + o, 0], [1, 1.2, 0.8]),
        box(0.4, 0.08, 0.06, DARKWOOD, [0, 0.75 + o, 0.3]),
        box(0.05, 0.4, 0.04, INK, [-0.3, 1.5 + o, 0.3], [0, 0, 0.2]),
        box(0.05, 0.4, 0.04, INK, [0.3, 1.5 + o, 0.3], [0, 0, -0.2]),
        cyl(0.05, 0.05, 0.6, '#555555', [0, -0.05 + o, 0]),
      ];
      [-0.08, -0.03, 0.03, 0.08].forEach((x) => p.push(box(0.022, 3.4, 0.022, g, [x, 2.4 + o, 0.33], undefined, 3)));
      return { parts: p, reach: 4.6 };
    }
    case 'adrien': return {
      parts: [cyl(0.07, 0.12, 2.4, '#e9c48a', [0, 1.1, 0]), sph(0.16, '#e9c48a', [0, 2.35, 0], [1, 1.4, 1]), tor(0.13, 0.04, g, [0, 1.6, 0], [Math.PI / 2, 0, 0], Math.PI * 2, 3), tor(0.13, 0.04, g, [0, 0.4, 0], [Math.PI / 2, 0, 0], Math.PI * 2, 3)],
      reach: 3.4,
    };
    case 'eliot': {
      const p: Part[] = [
        box(0.16, 1.8, 0.1, DARKWOOD, [0, 0.9, 0]),
        box(0.3, 0.45, 0.08, INK, [0, 1.95, 0], [0, 0, 0.2]),
        box(0.55, 1.5, 0.22, '#d81b60', [-0.3, -0.45, 0], [0, 0, -0.45]),
        box(0.55, 1.5, 0.22, '#d81b60', [0.3, -0.45, 0], [0, 0, 0.45]),
        box(0.4, 0.15, 0.05, '#f4f4f4', [0, -0.4, 0.13]),
      ];
      [-0.04, 0, 0.04].forEach((x) => p.push(box(0.018, 2.6, 0.02, g, [x, 0.5, 0.08], undefined, 3)));
      return { parts: p, reach: 3.6 };
    }
    case 'swan': {
      const p: Part[] = [box(0.6, 3.0, 0.28, '#111118', [0, 1.4, 0]), box(0.48, 2.7, 0.06, '#f4f4f4', [0.02, 1.45, 0.14])];
      for (let i = 0; i < 11; i++) if (i % 7 !== 2 && i % 7 !== 6) p.push(box(0.26, 0.12, 0.08, INK, [-0.1, 0.25 + i * 0.24, 0.18]));
      p.push(box(0.62, 0.08, 0.3, g, [0, 2.9, 0], undefined, 3), box(0.62, 0.08, 0.3, g, [0, -0.1, 0], undefined, 3));
      return { parts: p, reach: 3.8 };
    }
    case 'pierre': {
      const p: Part[] = [
        cyl(0.08, 0.1, 1.2, '#d4a017', [0, 0.4, 0]),
        box(1.3, 2.0, 0.6, '#5a0f1e', [0, 1.9, 0]),
        box(1.36, 0.12, 0.66, '#d4a017', [0, 2.9, 0]),
        box(1.36, 0.12, 0.66, '#d4a017', [0, 0.9, 0]),
        box(1.1, 0.4, 0.1, '#f4f0e0', [0, 1.4, 0.32]),
        cone(0.5, 0.9, '#5a0f1e', [0, 3.3, 0], [0, 0, 0], 4),
      ];
      for (let i = 0; i < 6; i++) p.push(box(0.08, 0.2, 0.06, INK, [-0.45 + i * 0.18, 1.48, 0.38]));
      p.push(sph(0.12, g, [0, 3.85, 0], 1, 3));
      return { parts: p, reach: 4.0 };
    }
    case 'audrey': return {
      parts: [box(0.12, 2.0, 0.12, INK, [0, 1.0, 0]), sph(0.5, INK, [-0.35, 2.05, 0], [1.25, 0.85, 0.6]), box(0.12, 0.7, 0.1, INK, [0.25, 0.25, 0], [0, 0, 0.6]), sph(0.2, g, [-0.35, 2.05, 0.3], [1.4, 0.9, 0.3], 3), tor(0.6, 0.05, g, [-0.35, 2.05, 0], [0, 0, 0], Math.PI * 2, 3)],
      reach: 3.2,
    };
  }
};

export interface HeroRig extends Rig { reach: number }

export const buildHero = (c: CharacterType): HeroRig => {
  const L = LOOKS[c];
  const legs = (side: number): Part[] => L.dress
    ? [cap(0.1, 0.5, SKIN, [0, -0.35, 0]), box(0.3, 0.2, 0.48, L.shoes, [0, -0.78, 0.08])]
    : [cap(0.14, 0.5, L.pants, [0, -0.35, 0]), box(0.34, 0.22, 0.52, L.shoes, [0, -0.78, 0.08])];
  const torso: Part[] = L.dress
    ? [cone(0.85, 1.2, L.shirt, [0, 0.2, 0], [0, 0, 0], 14), cap(0.36, 0.4, L.shirt, [0, 0.75, 0], [0, 0, 0], [1, 1, 0.8]), box(0.6, 0.08, 0.5, PAL.combo, [0, 0.45, 0])]
    : [cap(0.43, 0.5, L.shirt, [0, 0.55, 0], [0, 0, 0], [1, 1, 0.78])];
  if (c === 'pierre') torso.push(cone(0.25, 0.35, '#ffffff', [0, 0.95, 0.3], [-1.9, 0, 0]), cone(0.2, 0.3, '#ffffff', [0, 0.75, 0.33], [-1.9, 0, 0]), tor(0.42, 0.06, '#d4a017', [0, 1.05, 0], [Math.PI / 2, 0, 0]));
  if (c === 'adrien') torso.push(box(0.5, 0.12, 0.05, '#ffffff', [0, 0.6, 0.36]));
  if (c === 'eliot') torso.push(tor(0.32, 0.07, '#e06a20', [0, 1.05, -0.1], [1.2, 0, 0]));
  if (c === 'armand') torso.push(box(0.12, 0.9, 0.05, '#1c2a5e', [0.18, 0.55, 0.33], [0, 0, 0.5]));
  const w = weaponParts(c);
  const defs: PivotDef[] = [
    { name: 'hips', at: [0, 0.95, 0], parts: [] },
    { name: 'legL', parent: 'hips', at: [-0.22, 0, 0], parts: legs(-1) },
    { name: 'legR', parent: 'hips', at: [0.22, 0, 0], parts: legs(1) },
    { name: 'torso', parent: 'hips', at: [0, 0, 0], parts: torso },
    { name: 'head', parent: 'torso', at: [0, 1.7, 0], parts: [sph(0.8, SKIN, [0, 0, 0], [1, 1.05, 0.95]), sph(0.13, SKIN, [0, -0.08, 0.8]), sph(0.16, SKIN, [-0.78, 0, 0]), sph(0.16, SKIN, [0.78, 0, 0]), ...eyes(!!L.glasses, c === 'pierre' ? -0.02 : 0.05), ...hair(c, L.hair)] },
    { name: 'armL', parent: 'torso', at: [-0.55, 1.0, 0], parts: [cap(0.1, 0.55, L.dress ? SKIN : L.shirt, [0, -0.35, 0]), sph(0.15, SKIN, [0, -0.75, 0])] },
    { name: 'armR', parent: 'torso', at: [0.55, 1.0, 0], parts: [cap(0.1, 0.55, L.dress ? SKIN : L.shirt, [0, -0.35, 0]), sph(0.15, SKIN, [0, -0.75, 0])] },
    { name: 'weapon', parent: 'armR', at: [0, -0.75, 0], parts: w.parts },
  ];
  if (c === 'adrien') defs.push({ name: 'weapon2', parent: 'armL', at: [0, -0.75, 0], parts: weaponParts('adrien').parts });
  const rig = buildRig(defs, 0.055) as HeroRig;
  rig.reach = w.reach;
  rig.pivots.weapon.rotation.x = Math.PI / 2;
  if (rig.pivots.weapon2) rig.pivots.weapon2.rotation.x = Math.PI / 2;
  return rig;
};

export const buildLion = (): Rig => buildRig([
  { name: 'hips', at: [0, 1.6, 0], parts: [cap(0.9, 1.6, '#e8a33a', [0, 0, 0], [Math.PI / 2, 0, 0]), cone(0.18, 1.2, '#e8a33a', [0, 0.6, -1.9], [-0.9, 0, 0])] },
  { name: 'head', parent: 'hips', at: [0, 0.7, 1.5], parts: [
    ...Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return cone(0.4, 1.1, i % 2 ? '#ffb21a' : '#ff7a1a', [Math.cos(a) * 0.8, Math.sin(a) * 0.8, -0.2], [Math.PI / 2 + Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9 + Math.PI], 8, 0.6); }),
    sph(0.85, '#f0b04a'), sph(0.4, '#ffe0a8', [0, -0.3, 0.7], [1.2, 0.8, 0.9]), sph(0.14, INK, [0, -0.05, 1.05]),
    sph(0.22, '#ffffff', [-0.32, 0.25, 0.65]), sph(0.22, '#ffffff', [0.32, 0.25, 0.65]), sph(0.05, INK, [-0.3, 0.27, 0.86]), sph(0.05, INK, [0.3, 0.25, 0.86]),
    sph(0.3, INK, [0, -0.55, 0.65], [1.2, 0.7, 0.5]), cone(0.07, 0.25, '#ffffff', [-0.18, -0.4, 0.85], [Math.PI, 0, 0]), cone(0.07, 0.25, '#ffffff', [0.18, -0.4, 0.85], [Math.PI, 0, 0]),
  ] },
  { name: 'legL', parent: 'hips', at: [-0.55, -0.4, 1.0], parts: [cap(0.24, 0.7, '#e8a33a', [0, -0.5, 0]), sph(0.3, '#f0b04a', [0, -1.0, 0.1])] },
  { name: 'legR', parent: 'hips', at: [0.55, -0.4, 1.0], parts: [cap(0.24, 0.7, '#e8a33a', [0, -0.5, 0]), sph(0.3, '#f0b04a', [0, -1.0, 0.1])] },
  { name: 'legBL', parent: 'hips', at: [-0.55, -0.4, -1.0], parts: [cap(0.24, 0.7, '#e8a33a', [0, -0.5, 0]), sph(0.3, '#f0b04a', [0, -1.0, 0.1])] },
  { name: 'legBR', parent: 'hips', at: [0.55, -0.4, -1.0], parts: [cap(0.24, 0.7, '#e8a33a', [0, -0.5, 0]), sph(0.3, '#f0b04a', [0, -1.0, 0.1])] },
], 0.07);

export const buildChicken = (): Rig => buildRig([
  { name: 'hips', at: [0, 1.6, 0], parts: [sph(1.3, '#ffe4f2', [0, 0, 0], [1, 0.95, 1.15]), cone(0.6, 1.0, '#ffd0e8', [0, 0.5, -1.3], [-1.9, 0, 0]), sph(0.5, '#ffd0e8', [-1.1, 0.1, 0], [0.4, 0.8, 1.1]), sph(0.5, '#ffd0e8', [1.1, 0.1, 0], [0.4, 0.8, 1.1])] },
  { name: 'head', parent: 'hips', at: [0, 1.3, 0.8], parts: [
    sph(0.7, '#ffe4f2'), cone(0.25, 0.6, '#ffb21a', [0, -0.05, 0.75], [Math.PI / 2, 0, 0]),
    sph(0.18, '#ff3b5c', [0, -0.45, 0.55], [0.8, 1.4, 0.6]),
    sph(0.18, '#ff5fd2', [0, 0.75, 0], 1, 2), sph(0.15, '#ff5fd2', [0, 0.7, 0.25], 1, 2), sph(0.15, '#ff5fd2', [0, 0.7, -0.25], 1, 2),
    sph(0.22, '#ffffff', [-0.3, 0.2, 0.55]), sph(0.22, '#ffffff', [0.3, 0.15, 0.55]), sph(0.05, INK, [-0.25, 0.22, 0.75]), sph(0.05, INK, [0.33, 0.14, 0.75]),
  ] },
  { name: 'legL', parent: 'hips', at: [-0.4, -1.0, 0], parts: [cyl(0.07, 0.07, 0.9, '#ffb21a', [0, -0.35, 0]), box(0.5, 0.06, 0.5, '#ffb21a', [0, -0.8, 0.15])] },
  { name: 'legR', parent: 'hips', at: [0.4, -1.0, 0], parts: [cyl(0.07, 0.07, 0.9, '#ffb21a', [0, -0.35, 0]), box(0.5, 0.06, 0.5, '#ffb21a', [0, -0.8, 0.15])] },
], 0.07);

export const catGeometry = () => mergeParts([
  sph(0.55, '#8f6bff', [0, 0, 0], [1, 0.9, 1.2]),
  sph(0.4, '#9d7dff', [0, 0.35, 0.55]),
  cone(0.15, 0.3, '#8f6bff', [-0.22, 0.75, 0.55]), cone(0.15, 0.3, '#8f6bff', [0.22, 0.75, 0.55]),
  sph(0.12, '#ffffff', [-0.14, 0.42, 0.88]), sph(0.12, '#ffffff', [0.14, 0.42, 0.88]),
  sph(0.04, INK, [-0.14, 0.42, 0.99]), sph(0.04, INK, [0.14, 0.42, 0.99]),
  cap(0.08, 0.7, '#8f6bff', [0, 0.3, -0.75], [-0.8, 0, 0]),
  tor(0.6, 0.05, '#c9b8ff', [0, 0, 0], [Math.PI / 2, 0, 0], Math.PI * 2, 2.5),
]);

export const eggGeometry = () => mergeParts([sph(0.4, '#fff4e0', [0, 0, 0], [0.85, 1.1, 0.85]), sph(0.12, '#ff5fd2', [0.15, 0.2, 0.25], 1, 2)]);

export const fartGeometry = () => mergeParts([
  ico(0.8, '#9ccc2a', [0, 0, 0], [0, 0, 0], 1, 1), ico(0.6, '#b5e33c', [0.7, 0.2, 0.2], [0, 0, 0], 1, 1), ico(0.55, '#86b51e', [-0.6, 0.3, -0.2], [0, 0, 0], 1, 1), ico(0.5, '#a6ff00', [0, 0.6, 0.4], [0, 0, 0], 1, 1),
]);
