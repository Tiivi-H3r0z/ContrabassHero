import * as THREE from 'three';
import { box, cone, cyl, ico, Part, sph } from '../models/builder';
import { ARENA_RADIUS, Theme } from './defs';
import { col, facetColor, mergeAll, noiseRing, placed, rng } from './util';

const R = ARENA_RADIUS;

// (radius, y) profile of the island: thin lip at the floor edge, thick rocky band, then a tapering underside.
const PROFILE: [number, number][] = [
  [R - 0.1, -0.03], [R + 0.55, -0.12], [R + 1.1, -0.9], [R + 1.0, -2.2], [R + 0.4, -3.4],
  [R - 1.5, -4.6], [R - 4.5, -6.2], [R - 8.5, -8.6], [R - 13, -11.8], [R - 18, -15.5], [R - 22.5, -19.5], [R - 25.5, -23], [0, -26],
];

export const undersideY = (r: number) => {
  for (let i = PROFILE.length - 1; i > 0; i--) {
    const [r0, y0] = PROFILE[i], [r1, y1] = PROFILE[i - 1];
    if (r >= r0 && r <= r1) return y0 + (y1 - y0) * ((r - r0) / (r1 - r0 || 1));
  }
  return -26;
};

const lathe = (seed: number) => {
  const segs = 120;
  const rows = PROFILE.length;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j < rows; j++) {
    const [r, y] = PROFILE[j];
    for (let i = 0; i <= segs; i++) {
      const a = (i % segs) / segs * Math.PI * 2;
      // keep the top ring intact (floor edge), roughen everything below
      const amp = j === 0 ? 0 : j === 1 ? 0.25 : Math.min(2.6, 0.5 + j * 0.35);
      const nr = (noiseRing(a, j * 0.9 + seed, 9) - 0.45) * amp * 2;
      const ny = j <= 1 ? 0 : (noiseRing(a + 1.7, j * 1.3 + seed + 3, 13) - 0.5) * Math.min(2.4, j * 0.4);
      const rr = Math.max(0, r + nr * (r > 0.5 ? 1 : 0));
      pos.push(Math.cos(a) * rr, y + ny, Math.sin(a) * rr);
    }
  }
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < segs; i++) {
    const a = j * (segs + 1) + i, b = a + 1, c = a + segs + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
};

// Under-lip details per stage: icicles, roots, vines, magma drips...
const drips = (stage: number, theme: Theme, r: () => number): Part[] => {
  const p: Part[] = [];
  const n = 46;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.1;
    const rr = R + 0.6 + r() * 0.4;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const len = 1.2 + r() * (stage === 7 ? 6 : 3);
    const y = -2.6 - r() * 0.6;
    switch (stage) {
      case 2: p.push(cone(0.25 + r() * 0.25, len, theme.drip, [x, y - len / 2, z], [Math.PI, 0, 0], 5, 0.25)); break;
      case 5: if (i % 3 === 0) p.push(cone(0.18, len * 0.7, theme.drip, [x, y - len * 0.35, z], [Math.PI, 0, 0], 5, 2.2)); break;
      case 7: {
        p.push(cyl(0.07, 0.07, len, theme.drip, [x, y - len / 2 + 0.6, z], [0, 0, 0], 4));
        if (i % 2 === 0) p.push(sph(0.16, '#5fffc8', [x, y - len + 0.6, z], 1, 2.2));
        break;
      }
      case 3: p.push(cone(0.12 + r() * 0.1, len, theme.drip, [x, y - len / 2 + 0.6, z], [Math.PI, 0, (r() - 0.5) * 0.5], 4)); break;
      case 6: p.push(sph(0.5 + r() * 0.4, theme.drip, [x, y + 0.4, z], [1, 1.6, 1])); if (i % 4 === 0) p.push(sph(0.14, '#ff8af0', [x, y - 0.6, z], 1, 2.2)); break;
      default: break;
    }
  }
  return p;
};

export const buildIsland = (stage: number, theme: Theme, neon: string) => {
  const r = rng(stage * 911 + 5);
  const top = col(theme.rockTop), a = col(theme.rockA), b = col(theme.rockB), deep = col(theme.rockDeep);
  const tmp = new THREE.Color();
  const body = facetColor(lathe(stage * 3.1), (c) => {
    if (c.y > -0.7) return { color: top };
    const band = Math.sin(c.y * 2.3 + Math.sin(Math.atan2(c.z, c.x) * 5) * 0.6);
    const strata = band > 0.2 ? a : b;
    const k = Math.min(1, Math.max(0, (-c.y - 4) / 18));
    return { color: tmp.copy(strata).lerp(deep, k).clone() };
  });

  // Stalactites and hanging crystals under the island
  const parts: Part[] = [];
  for (let i = 0; i < 44; i++) {
    const rad = 3 + Math.sqrt(r()) * 23;
    const ang = r() * Math.PI * 2;
    const y = undersideY(rad) + 0.9;
    const len = 3 + r() * (10 - rad * 0.2);
    const w = 0.8 + r() * 1.8;
    const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
    parts.push(cone(w, len, r() > 0.5 ? theme.rockB : theme.rockDeep, [x, y - len / 2, z], [Math.PI + (r() - 0.5) * 0.2, r() * 3, (r() - 0.5) * 0.2], 5));
  }
  for (let i = 0; i < 14; i++) {
    const rad = 5 + r() * 19;
    const ang = r() * Math.PI * 2;
    const y = undersideY(rad) + 0.3;
    const len = 1.5 + r() * 2.5;
    const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
    parts.push(cone(0.35 + r() * 0.3, len, theme.crystal, [x, y - len / 2, z], [Math.PI + (r() - 0.5) * 0.6, 0, (r() - 0.5) * 0.6], 4, 1.9));
  }
  parts.push(...drips(stage, theme, r));
  const hanging = placed(parts, { x: 0, y: 0, z: 0 });
  const geo = mergeAll([body, hanging]);

  // Glowing edge ring: marks the fall.
  const ringGeo = new THREE.TorusGeometry(R + 0.05, 0.08, 6, 160);
  ringGeo.rotateX(Math.PI / 2);
  ringGeo.translate(0, 0.02, 0);
  return { geo, ringGeo };
};

// ---- Mid-distance floating islets with a themed object on top --------------------------

const isletTop = (stage: number, theme: Theme, r: () => number): Part[] => {
  switch (stage) {
    case 1: return r() > 0.5
      ? [box(1.6, 3.4, 1.0, '#3b5b8c', [0, 1.7, 0]), box(0.08, 3.2, 1.02, '#22324f', [0, 1.7, 0]), box(0.5, 0.06, 0.05, '#1a2238', [-0.4, 2.8, 0.52]), box(0.5, 0.06, 0.05, '#1a2238', [0.4, 2.8, 0.52])]
      : [box(2.2, 1.4, 0.15, '#22402e', [0, 2.2, 0]), box(2.4, 0.15, 0.25, '#7a5a44', [0, 1.45, 0.05]), cyl(0.06, 0.06, 1.5, '#56607a', [-0.8, 0.75, 0]), cyl(0.06, 0.06, 1.5, '#56607a', [0.8, 0.75, 0]), box(1.2, 0.04, 0.02, '#c8d4f0', [0, 2.4, 0.09])];
    case 2: return [cone(1.4, 2.4, '#1f4a5a', [0, 1.6, 0], [0, 0, 0], 7), cone(1.1, 2.0, '#1f4a5a', [0, 2.8, 0], [0, 0, 0], 7), cone(0.8, 1.6, '#c8dcf0', [0, 3.8, 0], [0, 0, 0], 7), cyl(0.2, 0.25, 0.8, '#3a2a20', [0, 0.4, 0])];
    case 3: return [cone(0.9, 4, '#7a2f6e', [0, 1.4, 0], [Math.PI + 0.3, 0, 0.2], 8), cone(0.3, 1.6, '#3f8a3a', [0, 3.6, 0.6], [0.3, 0, 0], 5, 0.8), cone(0.3, 1.4, '#3f8a3a', [0.3, 3.5, 0.3], [0.2, 0, -0.4], 5, 0.8)];
    case 4: return [cap(0.5, 3, '#2f7a6a'), cap(0.32, 1.2, '#2f7a6a', [0.9, 2.2, 0]), cap(0.32, 1.2, '#2f7a6a', [-0.9, 1.6, 0]), box(1.8, 0.3, 0.3, '#2f7a6a', [0, 1.6, 0]), sph(0.25, '#ff5fc8', [0, 3.4, 0], 1, 2)];
    case 5: return [cone(0.7, 4.5, '#1e1828', [0, 2.2, 0], [0, 0, 0.15], 5), cone(0.5, 3, '#1e1828', [0.7, 1.5, 0.3], [0.3, 0, -0.3], 5), sph(0.45, '#ffd34d', [0, 0.4, 0], [1, 0.5, 1], 2.2)];
    case 6: return [cyl(0.4, 0.55, 2.4, '#c9b8d6', [0, 1.2, 0]), sph(1.7, '#7a3a9a', [0, 2.6, 0], [1, 0.6, 1]), sph(0.25, '#6ffcff', [0.8, 3.1, 0.6], 1, 2), sph(0.2, '#6ffcff', [-0.7, 3.2, -0.4], 1, 2), sph(0.18, '#ff8af0', [0.1, 3.5, -0.9], 1, 2)];
    default: return [box(1.2, 1.2, 1.2, '#3a4a30', [0, 0.6, 0]), box(1.1, 1.1, 1.1, '#4a5a3a', [0, 1.75, 0]), box(1.0, 1.0, 1.0, '#3a4a30', [0, 2.8, 0]), sph(0.15, '#00ffa3', [-0.25, 1.9, 0.56], 1, 2.2), sph(0.15, '#00ffa3', [0.25, 1.9, 0.56], 1, 2.2), box(2.4, 0.25, 0.3, '#5a6a40', [0, 2.4, 0])];
  }
};

const cap = (r: number, len: number, color: string, pos: [number, number, number] = [0, len / 2 + r, 0]): Part =>
  ({ geo: new THREE.CapsuleGeometry(r, len, 3, 8), color, pos });

export interface Islet { geo: THREE.BufferGeometry; pos: THREE.Vector3; phase: number }

export const buildIslets = (stage: number, theme: Theme): Islet[] => {
  const r = rng(stage * 313 + 1);
  const out: Islet[] = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    // spread mostly on the far side (-x,-z) where the camera looks
    const ang = Math.PI * 1.25 + (i / (n - 1) - 0.5) * Math.PI * 1.35 + (r() - 0.5) * 0.2;
    const dist = 38 + r() * 18;
    const y = -9 + r() * 14;
    const size = 0.8 + r() * 0.6;
    const rock: Part[] = [
      sph(2.4, theme.rockTop, [0, -0.2, 0], [1.3, 0.35, 1.3]),
      cone(2.9, 5 + r() * 3, theme.rockA, [0, -3.2, 0], [Math.PI, 0, 0], 6),
      ico(1.2, theme.rockB, [1.4, -1.2, 0.4], [r(), r(), r()]),
      cone(0.7, 2.5, theme.rockDeep, [-1.2, -2, 0.8], [Math.PI, 0, 0.2], 5),
    ];
    if (r() > 0.4) rock.push(cone(0.25, 1.1, theme.crystal, [0.4, -6.2, 0.2], [Math.PI, 0, 0], 4, 1.9));
    const top = isletTop(stage, theme, r).map((p) => ({ ...p, pos: [(p.pos?.[0] ?? 0), (p.pos?.[1] ?? 0) + 0.3, (p.pos?.[2] ?? 0)] as [number, number, number] }));
    const geo = placed([...rock, ...top], { x: 0, y: 0, z: 0 }, r() * 6, size);
    out.push({ geo, pos: new THREE.Vector3(Math.cos(ang) * dist, y, Math.sin(ang) * dist), phase: r() * 6 });
  }
  return out;
};
