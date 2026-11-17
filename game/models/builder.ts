import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeOutlineMaterial, makeToonMaterial, toonMesh, ToonPart, ToonMaterial, OutlineMaterial } from '../render/toon';

export type V3 = [number, number, number];

export interface Part {
  geo: THREE.BufferGeometry;
  color: THREE.ColorRepresentation;
  glow?: number; // emissive multiplier (>= 1.5 blooms)
  pos?: V3;
  rot?: V3;
  scale?: V3 | number;
}

const SEG = { s: 18, r: 12 };

export const sph = (r: number, color: THREE.ColorRepresentation, pos?: V3, scale?: V3 | number, glow?: number): Part =>
  ({ geo: new THREE.SphereGeometry(r, SEG.s, SEG.r), color, pos, scale, glow });
export const hemi = (r: number, color: THREE.ColorRepresentation, pos?: V3, rot?: V3, scale?: V3 | number): Part =>
  ({ geo: new THREE.SphereGeometry(r, SEG.s, 8, 0, Math.PI * 2, 0, Math.PI / 2), color, pos, rot, scale });
export const box = (w: number, h: number, d: number, color: THREE.ColorRepresentation, pos?: V3, rot?: V3, glow?: number): Part =>
  ({ geo: new THREE.BoxGeometry(w, h, d), color, pos, rot, glow });
export const cap = (r: number, len: number, color: THREE.ColorRepresentation, pos?: V3, rot?: V3, scale?: V3 | number): Part =>
  ({ geo: new THREE.CapsuleGeometry(r, len, 4, 10), color, pos, rot, scale });
export const cyl = (rt: number, rb: number, h: number, color: THREE.ColorRepresentation, pos?: V3, rot?: V3, seg = 14, glow?: number): Part =>
  ({ geo: new THREE.CylinderGeometry(rt, rb, h, seg), color, pos, rot, glow });
export const cone = (r: number, h: number, color: THREE.ColorRepresentation, pos?: V3, rot?: V3, seg = 12, glow?: number): Part =>
  ({ geo: new THREE.ConeGeometry(r, h, seg), color, pos, rot, glow });
export const tor = (R: number, r: number, color: THREE.ColorRepresentation, pos?: V3, rot?: V3, arc = Math.PI * 2, glow?: number): Part =>
  ({ geo: new THREE.TorusGeometry(R, r, 8, 20, arc), color, pos, rot, glow });
export const ico = (r: number, color: THREE.ColorRepresentation, pos?: V3, rot?: V3, scale?: V3 | number, detail = 0): Part =>
  ({ geo: new THREE.IcosahedronGeometry(r, detail), color, pos, rot, scale });

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();

export const mergeParts = (parts: Part[]): THREE.BufferGeometry => {
  const geos = parts.map((p) => {
    let g = p.geo.index ? p.geo : p.geo;
    g = g.clone();
    if (g.getAttribute('uv')) g.deleteAttribute('uv');
    if (!g.index) {
      const idx: number[] = [];
      for (let i = 0; i < g.getAttribute('position').count; i++) idx.push(i);
      g.setIndex(idx);
    }
    const n = g.getAttribute('position').count;
    const c = new THREE.Color(p.color);
    const col = new Float32Array(n * 3);
    const em = new Float32Array(n * 3);
    const e = p.glow ?? 0;
    for (let i = 0; i < n; i++) {
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      em[i * 3] = c.r * e; em[i * 3 + 1] = c.g * e; em[i * 3 + 2] = c.b * e;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('emis', new THREE.BufferAttribute(em, 3));
    const s = p.scale === undefined ? 1 : p.scale;
    if (typeof s === 'number') tmpS.set(s, s, s); else tmpS.set(s[0], s[1], s[2]);
    tmpE.set(...(p.rot ?? [0, 0, 0]));
    tmpQ.setFromEuler(tmpE);
    tmpP.set(...(p.pos ?? [0, 0, 0]));
    tmpM.compose(tmpP, tmpQ, tmpS);
    g.applyMatrix4(tmpM);
    return g;
  });
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  parts.forEach((p) => p.geo.dispose());
  if (!merged) throw new Error('mergeParts failed');
  merged.computeBoundingSphere();
  return merged;
};

// A rig is a hierarchy of named pivots; each pivot holds one merged toon mesh with an outline hull.
export interface Rig {
  root: THREE.Group;
  pivots: Record<string, THREE.Group>;
  parts: ToonPart[];
  mat: ToonMaterial;
  outline: OutlineMaterial;
}

export interface PivotDef {
  name: string;
  parent?: string;
  at?: V3;
  parts: Part[];
}

export const buildRig = (defs: PivotDef[], outlineThickness = 0.06): Rig => {
  const mat = makeToonMaterial();
  const outline = makeOutlineMaterial(outlineThickness);
  const root = new THREE.Group();
  const pivots: Record<string, THREE.Group> = {};
  const parts: ToonPart[] = [];
  for (const d of defs) {
    const pivot = new THREE.Group();
    pivot.name = d.name;
    if (d.at) pivot.position.set(...d.at);
    (d.parent ? pivots[d.parent] : root).add(pivot);
    pivots[d.name] = pivot;
    if (d.parts.length) {
      const tp = toonMesh(mergeParts(d.parts), mat, outline);
      pivot.add(tp.group);
      parts.push(tp);
    }
  }
  return { root, pivots, parts, mat, outline };
};

export const disposeObject = (obj: THREE.Object3D) => {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else if (mat) mat.dispose();
  });
};
