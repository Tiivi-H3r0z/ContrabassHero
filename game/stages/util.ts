import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mergeParts, Part } from '../models/builder';

export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const h2 = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const noise2 = (x: number, y: number) => {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = h2(ix, iy), b = h2(ix + 1, iy), c = h2(ix, iy + 1), d = h2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
};

export const fbm2 = (x: number, y: number, oct = 3) => {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += noise2(x * f, y * f) * amp; f *= 2.03; amp *= 0.5; }
  return v;
};

// Periodic noise around a circle (angle in radians) so seams close.
export const noiseRing = (angle: number, y: number, freq: number) =>
  fbm2(Math.cos(angle) * freq + 10, Math.sin(angle) * freq + y);

// Group of parts placed with a transform, merged into one geometry (color + emis attributes).
export const placed = (parts: Part[], pos: THREE.Vector3Like, rotY = 0, scale = 1, rotX = 0, rotZ = 0) => {
  const g = mergeParts(parts);
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos.x, pos.y, pos.z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotY, rotZ)),
    new THREE.Vector3(scale, scale, scale),
  );
  g.applyMatrix4(m);
  return g;
};

export const mergeAll = (geos: THREE.BufferGeometry[]) => {
  const m = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  if (!m) throw new Error('stage merge failed');
  m.computeBoundingSphere();
  return m;
};

// Flat-shaded copy with per-triangle color chosen from the triangle centroid.
export const facetColor = (geo: THREE.BufferGeometry, colorAt: (c: THREE.Vector3, i: number) => { color: THREE.Color; glow?: number }) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  const pos = g.getAttribute('position');
  const n = pos.count;
  const col = new Float32Array(n * 3);
  const em = new Float32Array(n * 3);
  const c = new THREE.Vector3();
  for (let t = 0; t < n; t += 3) {
    c.set(0, 0, 0);
    for (let k = 0; k < 3; k++) c.x += pos.getX(t + k), c.y += pos.getY(t + k), c.z += pos.getZ(t + k);
    c.multiplyScalar(1 / 3);
    const r = colorAt(c, t / 3);
    const e = r.glow ?? 0;
    for (let k = 0; k < 3; k++) {
      const o = (t + k) * 3;
      col[o] = r.color.r; col[o + 1] = r.color.g; col[o + 2] = r.color.b;
      em[o] = r.color.r * e; em[o + 1] = r.color.g * e; em[o + 2] = r.color.b * e;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('emis', new THREE.BufferAttribute(em, 3));
  g.computeVertexNormals();
  // mergeGeometries needs consistent indexing with mergeParts output (indexed).
  const idx: number[] = [];
  for (let i = 0; i < n; i++) idx.push(i);
  g.setIndex(idx);
  return g;
};

export const col = (c: THREE.ColorRepresentation) => new THREE.Color(c);
