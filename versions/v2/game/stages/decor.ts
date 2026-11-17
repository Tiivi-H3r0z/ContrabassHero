import * as THREE from 'three';
import { box, cap, cone, cyl, ico, Part, sph } from '../models/builder';
import { Theme } from './defs';
import { mergeAll, placed, rng } from './util';

// Far silhouettes (one per call), roughly 4-8 units tall before scaling.
const silhouette = (stage: number, theme: Theme, r: () => number): Part[] => {
  switch (stage) {
    case 1: {
      const k = r();
      if (k < 0.35) return [box(2, 4.5, 1.4, '#2c3f66'), box(0.1, 4.3, 1.42, '#1a2238'), box(0.8, 0.08, 0.05, '#8fd8ff', [0, 1.6, 0.72], [0, 0, 0], 1.8)];
      if (k < 0.7) return [box(3, 0.2, 1.8, '#5d4434', [0, 1, 0]), cyl(0.08, 0.08, 2, '#3a4060', [-1.2, 0, 0.6]), cyl(0.08, 0.08, 2, '#3a4060', [1.2, 0, -0.6])];
      return [box(5, 3, 0.25, '#1f3a2a'), box(5.4, 0.3, 0.4, '#5d4434', [0, -1.6, 0]), box(3, 0.06, 0.05, '#d8e0f8', [0, 0.4, 0.15], [0, 0, 0.05])];
    }
    case 2: return r() < 0.6
      ? [cone(2.5, 9, '#5f93c4', [0, 0, 0], [0, 0, 0], 5), cone(1.4, 5, '#7aaedb', [1.6, -1.5, 0.4], [0, 0, -0.3], 5), cone(0.4, 1.6, '#9ff3ff', [0, -5, 0], [Math.PI, 0, 0], 4, 1.8)]
      : [ico(3, '#4f7aa8', [0, 0, 0], [r(), r(), r()], [1.3, 0.7, 1.1]), sph(2.4, '#a9c2dc', [0, 1.2, 0], [1.3, 0.35, 1.1])];
    case 3: {
      const k = r();
      if (k < 0.4) return [cone(1.4, 7, '#7a2f6e', [0, 0, 0], [Math.PI, 0, 0], 8), cone(0.5, 3, '#3f8a3a', [0, 4.5, 0], [0, 0, 0], 5), sph(0.3, '#7cff2e', [0, -3.4, 0], 1, 2)];
      if (k < 0.75) return [sph(3, '#5f8a22', [0, 0, 0], [1.2, 0.9, 1.2]), cyl(0.3, 0.4, 1.2, '#3f5a20', [0, 2.8, 0]), box(1.5, 0.3, 0.3, '#c8ff6a', [0, -0.6, 2.9], [0, 0, 0], 2)];
      return [sph(2.6, '#3f8a5a'), sph(2.2, '#2f7048', [0.8, 0.6, 0.5])];
    }
    case 4: {
      const k = r();
      if (k < 0.4) return [cyl(3, 4, 4, '#7a3a5e', [0, 0, 0], [0, 0, 0], 7), cyl(3.2, 3.2, 0.4, '#b06a90', [0, 2.1, 0], [0, 0, 0], 7)];
      if (k < 0.7) return [cone(4, 5, '#8a4466', [0, 0, 0], [0, 0, 0], 4), cone(0.15, 0.6, '#ff5fc8', [0, 2.7, 0], [0, 0, 0], 4, 2)];
      return [cap(0.7, 5, '#2f7a6a'), cap(0.45, 1.8, '#2f7a6a', [1.3, 0.8, 0]), box(1.4, 0.4, 0.4, '#2f7a6a', [0.7, 0, 0])];
    }
    case 5: return [
      cone(1.3, 8, '#1e1828', [0, 0, 0], [0, 0, (r() - 0.5) * 0.4], 4), cone(0.8, 5, '#2a2238', [1.2, -1, 0.3], [0, 0, -0.4], 4),
      box(0.12, 5, 0.2, r() > 0.5 ? '#ffd34d' : '#ff3d8b', [0.3, 0, 0.9], [0, 0, 0.1], 2),
    ];
    case 6: return [cyl(0.5, 0.8, 4, '#bfb0c8', [0, -1, 0]), sph(3, r() > 0.5 ? '#7a3a9a' : '#5a2a8a', [0, 1.2, 0], [1, 0.5, 1]), sph(0.35, '#6ffcff', [1.4, 2, 0.6], 1, 2), sph(0.3, '#ff8af0', [-1, 2.1, -0.8], 1, 2)];
    default: return r() < 0.5
      ? [box(1.5, 1.5, 1.5, '#3a4a30', [0, -1.6, 0]), box(1.4, 1.4, 1.4, '#4a5a3a'), box(1.3, 1.3, 1.3, '#3a4a30', [0, 1.5, 0]), sph(0.2, '#00ffa3', [-0.3, 0.1, 0.72], 1, 2), sph(0.2, '#00ffa3', [0.3, 0.1, 0.72], 1, 2)]
      : [cyl(0.25, 0.4, 7, '#2a3a24'), sph(2.5, '#1f5a34', [0, 3.8, 0], [1.3, 0.4, 1.3]), sph(0.25, '#5fffc8', [1.6, 3.6, 0.3], 1, 2)];
  }
};

export const buildDistantDecor = (stage: number, theme: Theme) => {
  const r = rng(stage * 5011 + 3);
  const near: THREE.BufferGeometry[] = [];
  const far: THREE.BufferGeometry[] = [];
  const pick = (minD: number, maxD: number) => {
    // bias toward the far side (-x,-z) that the camera faces
    const a = Math.PI * 1.25 + (r() - 0.5) * (r() < 0.75 ? Math.PI * 1.4 : Math.PI * 2);
    const d = minD + r() * (maxD - minD);
    return { x: Math.cos(a) * d, z: Math.sin(a) * d };
  };
  for (let i = 0; i < 16; i++) {
    const p = pick(60, 130);
    near.push(placed(silhouette(stage, theme, r), { x: p.x, y: -15 - r() * 55, z: p.z }, r() * 6, 1.4 + r() * 1.6, (r() - 0.5) * 0.5, (r() - 0.5) * 0.5));
  }
  for (let i = 0; i < 18; i++) {
    const p = pick(70, 160);
    const s = 2 + r() * 6;
    const rock: Part[] = [
      ico(1, r() > 0.5 ? theme.rockA : theme.rockB, [0, 0, 0], [r(), r(), r()], [1.3, 0.7, 1.1]),
      cone(0.8, 2.2, theme.rockDeep, [0, -1.2, 0], [Math.PI, 0, 0], 5),
    ];
    if (r() > 0.6) rock.push(cone(0.18, 0.7, theme.crystal, [0.2, -2.4, 0], [Math.PI, 0, 0], 4, 1.8));
    far.push(placed(rock, { x: p.x, y: -10 - r() * 90, z: p.z }, r() * 6, s));
  }
  return { near: mergeAll(near), far: mergeAll(far) };
};

// Ambient glowing motes: drift up and wrap, fully animated in the vertex shader.
export const buildMotes = (color: string, stage: number) => {
  const r = rng(stage * 71 + 9);
  const n = 260;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const inside = i < 40;
    const a = r() * Math.PI * 2;
    const d = inside ? r() * 26 : 30 + r() * 45;
    pos[i * 3] = Math.cos(a) * d;
    pos[i * 3 + 1] = inside ? 5 + r() * 10 : -40 + r() * 55;
    pos[i * 3 + 2] = Math.sin(a) * d;
    seed[i] = r();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const rise = stage === 2 ? -1 : 1; // snow falls, everything else rises
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) } },
    vertexShader: `
uniform float uTime;
attribute float seed;
varying float vA;
void main() {
  vec3 p = position;
  float range = p.y > 4.0 ? 10.0 : 55.0;
  float base = p.y > 4.0 ? 5.0 : -40.0;
  p.y = base + mod(p.y - base + ${rise.toFixed(1)} * uTime * (0.6 + seed * 1.2), range);
  p.x += sin(uTime * 0.5 + seed * 30.0) * 1.2;
  p.z += cos(uTime * 0.4 + seed * 20.0) * 1.2;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float edge = min(p.y - base, base + range - p.y);
  vA = smoothstep(0.0, 2.5, edge) * (0.5 + 0.5 * sin(uTime * 2.0 + seed * 40.0));
  gl_PointSize = (2.0 + seed * 3.0) * (120.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: `
uniform vec3 uColor;
varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(uColor * (0.4 + 1.6 * a * a) * vA, a * vA);
}`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, uniforms: mat.uniforms as { uTime: { value: number } } };
};

// Floating stage lamps above the far rim (school tubes, ice beacons, lanterns...).
export interface Lamps { mesh: THREE.Mesh; housing: THREE.BufferGeometry; update(time: number): void }

export const buildLamps = (stage: number, neon: string): Lamps => {
  const r = rng(stage * 97 + 2);
  const n = stage === 1 ? 7 : 6;
  const glow: THREE.BufferGeometry[] = [];
  const housing: Part[] = [];
  const ranges: [number, number][] = [];
  let vcount = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 1.25 + (i / (n - 1) - 0.5) * Math.PI * 1.1;
    const d = 33 + r() * 4;
    const x = Math.cos(a) * d, z = Math.sin(a) * d, y = 7 + r() * 4;
    let g: THREE.BufferGeometry;
    if (stage === 1) {
      g = new THREE.BoxGeometry(5, 0.22, 0.22);
      g.translate(0, -0.12, 0);
      g.rotateY(-a + Math.PI / 2);
      housing.push(box(5.4, 0.3, 0.7, '#2a3048', [x, y + 0.2, z], [0, -a + Math.PI / 2, 0]));
      housing.push(cyl(0.04, 0.04, 6, '#2a3048', [x, y + 3.4, z]));
    } else if (stage === 4) {
      g = new THREE.TorusGeometry(1.2, 0.12, 6, 24);
      g.rotateY(-a + Math.PI / 2);
    } else {
      g = new THREE.OctahedronGeometry(0.7, 0);
      g.scale(1, 1.8, 1);
      housing.push(cone(0.9, 2.2, '#1a1a24', [x, y - 1.8, z], [Math.PI, 0, 0], 5));
    }
    g.translate(x, y, z);
    const ng = g.index ? g.toNonIndexed() : g;
    if (ng !== g) g.dispose();
    for (const k of ['uv', 'normal']) if (ng.getAttribute(k)) ng.deleteAttribute(k);
    const c = ng.getAttribute('position').count;
    ranges.push([vcount, c]);
    vcount += c;
    glow.push(ng);
  }
  const geo = mergeAll(glow);
  const colors = new Float32Array(vcount * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const mesh = new THREE.Mesh(geo, mat);
  const base = new THREE.Color(neon).multiplyScalar(2.4);
  const tubeWhite = new THREE.Color('#e8f6ff').multiplyScalar(2.4);
  const phases = ranges.map(() => r() * 100);
  const update = (time: number) => {
    for (let i = 0; i < ranges.length; i++) {
      let k: number;
      if (stage === 1) {
        // fluorescent tubes: mostly on, occasional stutter, one dead-ish tube
        const t = time * 1.0 + phases[i];
        const s = Math.sin(t * 0.7) + Math.sin(t * 1.9);
        k = s > 1.6 ? (Math.sin(time * 60 + i) > 0 ? 1 : 0.15) : 1;
        if (i === 3) k = Math.sin(time * 23) > 0.6 || Math.sin(time * 0.9) > 0.8 ? 0.9 : 0.12;
      } else {
        k = 0.75 + 0.25 * Math.sin(time * 1.6 + phases[i]);
      }
      const c = stage === 1 ? tubeWhite : base;
      const [s0, cnt] = ranges[i];
      for (let v = s0; v < s0 + cnt; v++) { colors[v * 3] = c.r * k; colors[v * 3 + 1] = c.g * k; colors[v * 3 + 2] = c.b * k; }
    }
    (geo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  };
  update(0);
  const hgeo = housing.length ? placed(housing, { x: 0, y: 0, z: 0 }) : new THREE.BufferGeometry();
  return { mesh, housing: hgeo, update };
};
