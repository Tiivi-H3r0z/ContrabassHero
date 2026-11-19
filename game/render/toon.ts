import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PAL } from '../palette';

let gradient: THREE.DataTexture | null = null;

export const toonGradient = () => {
  if (gradient) return gradient;
  const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  gradient = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
};

export type ToonMaterial = THREE.MeshToonMaterial & { userData: { flash: { value: number } } };

// Toon material reading per-vertex color + per-vertex emissive ("emis" attribute, linear HDR),
// with a red hit flash (keeps shading so the silhouette stays readable): uniform for single meshes, per-instance attribute "iFlash" for InstancedMesh.
export const makeToonMaterial = (opts: { map?: THREE.Texture; vertexColors?: boolean; color?: THREE.ColorRepresentation; transparent?: boolean } = {}): ToonMaterial => {
  const vertexColors = opts.vertexColors ?? !opts.map;
  const mat = new THREE.MeshToonMaterial({
    gradientMap: toonGradient(),
    vertexColors,
    map: opts.map ?? null,
    color: opts.color ?? 0xffffff,
    transparent: opts.transparent ?? false,
  }) as ToonMaterial;
  const flash = { value: 0 };
  mat.userData.flash = flash;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFlash = flash;
    const hasEmis = vertexColors;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
${hasEmis ? 'attribute vec3 emis;' : ''}
varying vec3 vEmis;
varying float vFlash;
#ifdef USE_INSTANCING
attribute float iFlash;
attribute float iInk;
#endif
varying float vInk;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
${hasEmis ? 'vEmis = emis;' : 'vEmis = vec3(0.0);'}
#ifdef USE_INSTANCING
vFlash = iFlash;
vInk = iInk;
#else
vFlash = 0.0;
vInk = 0.0;
#endif`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vEmis;
varying float vFlash;
varying float vInk;
uniform float uFlash;`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.012, 0.025, 0.035), clamp(vInk, 0.0, 0.82));
gl_FragColor.rgb += vEmis;
float fl = clamp(max(vFlash, uFlash), 0.0, 1.0);
float lumF = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(2.3, 0.07, 0.05) * (0.35 + 1.1 * lumF), fl * 0.88);`);
  };
  mat.customProgramCacheKey = () => (vertexColors ? 'toon-vc' : 'toon-map');
  return mat;
};

const outlineVertex = `
uniform float thickness;
void main() {
  vec3 p = position + normal * thickness;
  vec4 wp = vec4(p, 1.0);
  #ifdef USE_INSTANCING
  wp = instanceMatrix * wp;
  #endif
  gl_Position = projectionMatrix * modelViewMatrix * wp;
}`;
const outlineFragment = `
uniform vec3 color;
uniform float opacity;
void main() { gl_FragColor = vec4(color, opacity); }`;

export type OutlineMaterial = THREE.ShaderMaterial & { uniforms: { thickness: { value: number }; color: { value: THREE.Color }; opacity: { value: number } } };

export const makeOutlineMaterial = (thickness = 0.06, color: THREE.ColorRepresentation = PAL.ink): OutlineMaterial => new THREE.ShaderMaterial({
  uniforms: { thickness: { value: thickness }, color: { value: new THREE.Color(color) }, opacity: { value: 1 } },
  vertexShader: outlineVertex,
  fragmentShader: outlineFragment,
  side: THREE.BackSide,
}) as OutlineMaterial;

// Smooth-normal copy of a geometry so the pushed hull has no gaps at hard edges.
export const hullGeometry = (geo: THREE.BufferGeometry) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', geo.getAttribute('position'));
  if (geo.index) g.setIndex(geo.index);
  const merged = mergeVertices(g, 1e-3);
  merged.computeVertexNormals();
  return merged;
};

export interface ToonPart {
  group: THREE.Group;
  mesh: THREE.Mesh;
  hull: THREE.Mesh | null;
}

export const toonMesh = (geo: THREE.BufferGeometry, mat: THREE.Material, outline: OutlineMaterial | null): ToonPart => {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);
  let hull: THREE.Mesh | null = null;
  if (outline) {
    hull = new THREE.Mesh(hullGeometry(geo), outline);
    group.add(hull);
  }
  return { group, mesh, hull };
};

// Unlit HDR material for neon parts (pushed above the bloom threshold).
export const neonMaterial = (color: THREE.ColorRepresentation, intensity = 2.2, opts: THREE.MeshBasicMaterialParameters = {}) => {
  const c = new THREE.Color(color).multiplyScalar(intensity);
  return new THREE.MeshBasicMaterial({ color: c, toneMapped: false, ...opts });
};
