import * as THREE from 'three';
import { PAL } from '../palette';
import { Theme } from './defs';

const vertex = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragment = `
uniform float uTime;
uniform float uDim;
uniform vec3 uDeep, uTint, uTop, uNebula, uBelow;
uniform vec3 uRift, uRiftCore;
uniform vec3 uRiftDir;
uniform float uAurora, uSun;
uniform vec3 uSunDir, uSunA, uSunB;
varying vec3 vDir;

float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * vnoise(p); p = p * 2.07 + 7.1; a *= 0.5; } return v; }

void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  // Vertical gradient: deep void below, stage tint band near the horizon, dark top.
  vec3 col = mix(uDeep, uBelow, smoothstep(-1.0, -0.55, y));
  col = mix(col, uTint * 0.55, smoothstep(-0.55, -0.12, y));
  col = mix(col, uTint * 0.8, smoothstep(-0.2, 0.0, y) * (1.0 - smoothstep(0.0, 0.25, y)));
  col = mix(col, uTop, smoothstep(0.05, 0.6, y));
  // Nebula
  float n = fbm(d * 3.2 + vec3(0.0, uTime * 0.01, 0.0));
  float n2 = fbm(d * 7.0 - vec3(uTime * 0.015, 0.0, 0.0));
  col += uNebula * smoothstep(0.45, 0.85, n) * 0.22 * (0.6 + n2);
  col *= 1.0 - uDim * 0.75;

  // Stars
  vec3 sp = d * 220.0;
  vec3 cell = floor(sp);
  float h = hash3(cell);
  if (h > 0.965) {
    vec3 c = cell + vec3(hash3(cell + 1.3), hash3(cell + 2.7), hash3(cell + 4.1));
    float dd = length(sp - c);
    float tw = 0.6 + 0.4 * sin(uTime * (1.0 + h * 4.0) + h * 40.0);
    float s = smoothstep(0.55, 0.0, dd) * tw * (h > 0.995 ? 1.8 : 0.8);
    col += mix(vec3(0.75, 0.9, 1.0), uNebula * 2.0, step(0.985, h)) * s;
  }

  // Aurora (stage 2): hanging curtains around the horizon band.
  if (uAurora > 0.0) {
    float az = atan(d.z, d.x);
    float band = smoothstep(-0.62, -0.32, y) * (1.0 - smoothstep(-0.05, 0.25, y));
    float curtain = 0.5 + 0.5 * sin(az * 7.0 + fbm(vec3(az * 2.0, uTime * 0.12, 0.0)) * 6.0 + uTime * 0.25);
    curtain = pow(curtain, 3.0);
    float rays = 0.6 + 0.4 * sin(az * 60.0 + uTime * 0.6 + n * 8.0);
    vec3 ac = mix(vec3(0.15, 1.0, 0.75), vec3(0.55, 0.35, 1.0), smoothstep(-0.45, -0.05, y));
    col += ac * band * curtain * rays * 0.85 * uAurora * (1.0 - uDim * 0.6);
  }

  // Striped synthwave sun (stage 4).
  if (uSun > 0.0) {
    vec3 sd = normalize(uSunDir);
    vec3 su = normalize(vec3(0.0, 1.0, 0.0) - sd * sd.y);
    vec3 sr = normalize(cross(sd, su));
    float cosA = dot(d, sd);
    vec2 p = vec2(dot(d, sr), dot(d, su)) / 0.2;
    if (cosA > 0.0) {
      float r = length(p);
      float disc = smoothstep(1.0, 0.985, r);
      float stripeY = p.y;
      float stripes = 1.0;
      if (stripeY < 0.25) {
        float k = (0.25 - stripeY) / 1.25;
        float f = fract((stripeY + uTime * 0.04) * 7.0);
        stripes = step(k * 0.85, f);
      }
      float sy = smoothstep(-0.9, 0.8, p.y);
      vec3 sc = mix(mix(uSunB, vec3(1.0, 0.55, 0.85), smoothstep(0.0, 0.5, sy)), uSunA, smoothstep(0.5, 1.0, sy));
      col = mix(col, sc * 0.95, disc * stripes);
      col += uSunB * 0.12 * smoothstep(2.6, 1.0, r) * (1.0 - disc * stripes);
    }
  }

  // The rift: turquoise swirling portal.
  vec3 rd = normalize(uRiftDir);
  vec3 t1 = normalize(cross(rd, vec3(0.0, 1.0, 0.0)));
  vec3 t2 = cross(t1, rd);
  float ca = dot(d, rd);
  if (ca > 0.0) {
    vec2 q = vec2(dot(d, t1), dot(d, t2)) / 0.34;
    q.y *= 1.25;
    float r = length(q);
    float a = atan(q.y, q.x);
    float sw = a + 2.6 * log(r + 0.02) - uTime * 0.35;
    float arms = 0.5 + 0.5 * sin(sw * 3.0 + fbm(vec3(q * 3.0, uTime * 0.1)) * 3.0);
    float ring = exp(-pow((r - 0.32) * 7.0, 2.0));
    float halo = smoothstep(1.1, 0.25, r);
    float hole = smoothstep(0.12, 0.3, r);
    float swirl = pow(arms, 2.0) * halo * hole;
    float noiseR = fbm(vec3(q * 5.0 + vec2(uTime * 0.05), uTime * 0.07));
    vec3 rc = uRift * (swirl * 0.22 + ring * 0.42 * (0.6 + 0.7 * noiseR)) + uRiftCore * ring * pow(arms, 4.0) * 0.75;
    col = mix(col, col * 0.25, (1.0 - hole) * halo);
    col += rc * smoothstep(-0.1, 0.4, ca);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export const buildSky = (theme: Theme) => {
  const uniforms = {
    uTime: { value: 0 },
    uDim: { value: 0 },
    uDeep: { value: new THREE.Color(theme.skyDeep) },
    uTint: { value: new THREE.Color(theme.skyTint) },
    uTop: { value: new THREE.Color(theme.skyTop) },
    uNebula: { value: new THREE.Color(theme.nebula) },
    uBelow: { value: new THREE.Color(theme.belowGlow) },
    uRift: { value: new THREE.Color(PAL.power) },
    uRiftCore: { value: new THREE.Color('#d8fff6') },
    uRiftDir: { value: new THREE.Vector3(-1, -0.4, -0.4).normalize() },
    uAurora: { value: theme.aurora },
    uSun: { value: theme.sun },
    uSunDir: { value: new THREE.Vector3(-0.2, -0.3, -1).normalize() },
    uSunA: { value: new THREE.Color('#fff0a0') },
    uSunB: { value: new THREE.Color('#ff3d8b') },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vertex,
    fragmentShader: fragment,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), mat);
  mesh.frustumCulled = false;
  // Drawn last among opaques with depth test: only void pixels pay for the shader.
  mesh.renderOrder = 1000;
  return { mesh, uniforms };
};
