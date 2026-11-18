import * as THREE from 'three';
import { PAL } from '../palette';

const tmpO = new THREE.Object3D();
const tmpC = new THREE.Color();

interface P { pos: THREE.Vector3; vel: THREE.Vector3; rot: THREE.Vector3; spin: THREE.Vector3; life: number; max: number; size: number; grav: number; drag: number; color: THREE.Color; shrink: boolean }

class ParticlePool {
  mesh: THREE.InstancedMesh;
  ps: P[] = [];
  private next = 0;
  constructor(geo: THREE.BufferGeometry, mat: THREE.Material, count: number) {
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < count; i++) {
      this.ps.push({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0, max: 0, size: 0, grav: 0, drag: 0, color: new THREE.Color(), shrink: true });
      this.mesh.setColorAt(i, tmpC.set(0, 0, 0));
    }
    this.mesh.count = count;
  }
  spawn(pos: THREE.Vector3, vel: THREE.Vector3, color: THREE.Color, size: number, life: number, grav: number, drag: number, shrink = true) {
    const p = this.ps[this.next];
    this.next = (this.next + 1) % this.ps.length;
    p.pos.copy(pos); p.vel.copy(vel); p.color.copy(color); p.size = size; p.life = life; p.max = life; p.grav = grav; p.drag = drag; p.shrink = shrink;
    p.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    p.spin.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
  }
  update(dt: number) {
    const m = this.mesh;
    for (let i = 0; i < this.ps.length; i++) {
      const p = this.ps[i];
      if (p.life <= 0) { tmpO.scale.setScalar(0); tmpO.updateMatrix(); m.setMatrixAt(i, tmpO.matrix); continue; }
      p.life -= dt;
      p.vel.y -= p.grav * dt;
      p.vel.multiplyScalar(Math.pow(p.drag, dt));
      p.pos.addScaledVector(p.vel, dt);
      if (p.pos.y < 0.05 && p.grav > 0) { p.pos.y = 0.05; p.vel.y *= -0.35; p.vel.x *= 0.6; p.vel.z *= 0.6; }
      p.rot.addScaledVector(p.spin, dt);
      const k = p.shrink ? Math.max(0, p.life / p.max) : 1;
      tmpO.position.copy(p.pos);
      tmpO.rotation.set(p.rot.x, p.rot.y, p.rot.z);
      tmpO.scale.setScalar(p.size * k);
      tmpO.updateMatrix();
      m.setMatrixAt(i, tmpO.matrix);
      m.setColorAt(i, p.color);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
}

const arcGeometry = (inner: number, outer: number, arc: number, seg = 28) => {
  const g = new THREE.BufferGeometry();
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, a = -arc / 2 + arc * u;
    pos.push(Math.cos(a) * inner, 0, Math.sin(a) * inner, Math.cos(a) * outer, 0, Math.sin(a) * outer);
    uv.push(u, 0, u, 1);
    if (i < seg) { const b = i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
};

const arcMaterial = () => new THREE.ShaderMaterial({
  uniforms: { color: { value: new THREE.Color() }, fade: { value: 1 }, head: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform vec3 color; uniform float fade; uniform float head; varying vec2 vUv;
    void main(){ float t = clamp(1.0 - (head - vUv.x) * 2.2, 0.0, 1.0) * step(vUv.x, head);
    float edge = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
    float a = t * t * edge * fade; gl_FragColor = vec4(color * (1.0 + t * 1.5), a); }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
});

const teleMaterial = () => new THREE.ShaderMaterial({
  uniforms: { color: { value: new THREE.Color(PAL.danger).multiplyScalar(1.6) }, progress: { value: 0 }, mode: { value: 0 }, time: { value: 0 }, aspect: { value: 1 }, alpha: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform vec3 color; uniform float progress; uniform float mode; uniform float time; uniform float aspect; uniform float alpha; varying vec2 vUv;
    void main(){
      float a = 0.0;
      if (mode < 0.5) {
        float d = length(vUv - 0.5) * 2.0;
        if (d > 1.0) discard;
        float border = smoothstep(0.86, 0.93, d);
        float fill = step(d, progress) * 0.38;
        float stripes = step(0.5, fract((vUv.x + vUv.y) * 8.0 - time * 2.0)) * 0.08;
        a = max(border, fill + stripes);
      } else {
        vec2 e = min(vUv, 1.0 - vUv) * vec2(aspect, 1.0);
        float border = 1.0 - smoothstep(0.03, 0.07, min(e.x, e.y));
        float fill = step(vUv.y, progress) * 0.38;
        float chev = step(0.6, fract(vUv.y * 6.0 - time * 3.0)) * 0.12;
        a = max(border, fill + chev);
      }
      float pulse = 0.75 + 0.25 * sin(time * 18.0);
      gl_FragColor = vec4(color, a * pulse * alpha);
    }`,
  transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2,
});

export interface Telegraph { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; t: number; dur: number; done: boolean; hold: number }

const splatTexture = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(64, 64, 34, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 26, r = 4 + Math.random() * 10;
    ctx.beginPath(); ctx.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = r * 0.8; ctx.strokeStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.cos(a) * d, 64 + Math.sin(a) * d); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  return t;
};

const shadowTexture = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 31);
  g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(0.6, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
};

export class Fx {
  group = new THREE.Group();
  glow: ParticlePool;
  solid: ParticlePool;
  private rings: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; t: number; dur: number; r0: number; r1: number; active: boolean }[] = [];
  private arcs: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; t: number; dur: number; active: boolean; spin: number }[] = [];
  private decalMesh!: THREE.InstancedMesh;
  private decals: { x: number; z: number; y: number; size: number; rot: number; t: number; life: number; active: boolean }[] = [];
  private decalNext = 0;
  private decalDirty = false;
  private teles: Telegraph[] = [];
  shadows: THREE.InstancedMesh;
  private shadowCount = 0;
  private time = 0;

  constructor() {
    this.group.name = 'fx';
    this.glow = new ParticlePool(new THREE.OctahedronGeometry(0.5, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), 700);
    this.solid = new ParticlePool(new THREE.BoxGeometry(1, 0.15, 0.7), new THREE.MeshBasicMaterial({ color: 0xffffff }), 500);
    this.group.add(this.glow.mesh, this.solid.mesh);
    const ringGeo = new THREE.RingGeometry(0.82, 1, 48).rotateX(-Math.PI / 2);
    for (let i = 0; i < 28; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.rings.push({ mesh, mat, t: 0, dur: 1, r0: 0, r1: 1, active: false });
    }
    const arcGeo = arcGeometry(1.2, 4.6, Math.PI * 1.25);
    for (let i = 0; i < 10; i++) {
      const mat = arcMaterial();
      const mesh = new THREE.Mesh(arcGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.arcs.push({ mesh, mat, t: 0, dur: 0.2, active: false, spin: 0 });
    }
    const splat = splatTexture();
    const decalGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const DECALS = 280;
    this.decalMesh = new THREE.InstancedMesh(decalGeo, new THREE.MeshBasicMaterial({ map: splat, color: 0xffffff, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }), DECALS);
    this.decalMesh.frustumCulled = false;
    this.decalMesh.renderOrder = 1;
    this.decalMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    tmpO.scale.setScalar(0); tmpO.updateMatrix();
    for (let i = 0; i < DECALS; i++) {
      this.decalMesh.setMatrixAt(i, tmpO.matrix);
      this.decalMesh.setColorAt(i, tmpC.set(PAL.ink));
      this.decals.push({ x: 0, z: 0, y: 0.03 + (i % 12) * 0.0015, size: 1, rot: 0, t: 0, life: 16, active: false });
    }
    this.group.add(this.decalMesh);
    const teleGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    for (let i = 0; i < 24; i++) {
      const mat = teleMaterial();
      const mesh = new THREE.Mesh(teleGeo, mat);
      mesh.visible = false;
      mesh.renderOrder = 2;
      this.group.add(mesh);
      this.teles.push({ mesh, mat, t: 0, dur: 1, done: true, hold: 0 });
    }
    this.shadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }), 220);
    this.shadows.frustumCulled = false;
    this.shadows.renderOrder = 1;
    this.group.add(this.shadows);
  }

  burst(pos: THREE.Vector3, color: THREE.ColorRepresentation, count: number, speed: number, opts: { size?: number; life?: number; grav?: number; up?: number; intensity?: number; drag?: number } = {}) {
    const c = new THREE.Color(color).multiplyScalar(opts.intensity ?? 2.5);
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      v.set(Math.random() - 0.5, Math.random() * (opts.up ?? 0.6), Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      this.glow.spawn(pos, v, c, (opts.size ?? 0.35) * (0.6 + Math.random() * 0.8), (opts.life ?? 0.5) * (0.6 + Math.random() * 0.7), opts.grav ?? 12, opts.drag ?? 0.15);
    }
  }

  debris(pos: THREE.Vector3, colors: THREE.ColorRepresentation[], count: number, speed: number, size = 0.5) {
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      v.set(Math.random() - 0.5, 0.6 + Math.random(), Math.random() - 0.5).normalize().multiplyScalar(speed * (0.5 + Math.random() * 0.7));
      this.solid.spawn(pos, v, new THREE.Color(colors[i % colors.length]), size * (0.6 + Math.random() * 0.8), 1.1 + Math.random() * 0.8, 26, 0.5, true);
    }
  }

  ring(pos: THREE.Vector3, color: THREE.ColorRepresentation, r0: number, r1: number, dur: number, intensity = 2.5, y = 0.15) {
    const r = this.rings.find((x) => !x.active) ?? this.rings[0];
    r.active = true; r.t = 0; r.dur = dur; r.r0 = r0; r.r1 = r1;
    r.mat.color.set(color).multiplyScalar(intensity);
    r.mesh.position.set(pos.x, y, pos.z);
    r.mesh.visible = true;
  }

  slash(pos: THREE.Vector3, angle: number, color: THREE.ColorRepresentation, scale = 1, dur = 0.18, spin = 1, y = 1.4) {
    const a = this.arcs.find((x) => !x.active) ?? this.arcs[0];
    a.active = true; a.t = 0; a.dur = dur; a.spin = spin;
    a.mat.uniforms.color.value.set(color).multiplyScalar(2.2);
    a.mesh.position.set(pos.x, y, pos.z);
    a.mesh.rotation.set(0, -angle, 0);
    a.mesh.scale.set(scale, scale, scale * spin);
    a.mesh.visible = true;
  }

  splat(pos: THREE.Vector3, size: number, color: THREE.ColorRepresentation = PAL.ink) {
    const i = this.decalNext;
    this.decalNext = (this.decalNext + 1) % this.decals.length;
    const d = this.decals[i];
    d.active = true; d.t = 0; d.x = pos.x; d.z = pos.z; d.size = size; d.rot = Math.random() * Math.PI * 2;
    d.life = color === PAL.ink ? 18 : 9;
    this.decalMesh.setColorAt(i, tmpC.set(color));
    if (this.decalMesh.instanceColor) this.decalMesh.instanceColor.needsUpdate = true;
    this.decalDirty = true;
  }

  // Black ink jet in the direction of a hit, with drops that land and stain the floor.
  inkSpray(pos: THREE.Vector3, dir: THREE.Vector3, power = 1) {
    const ink = tmpC.set(PAL.ink).clone();
    const gloss = new THREE.Color('#1c3a4a');
    const v = new THREE.Vector3();
    const n = Math.round(9 * power);
    for (let i = 0; i < n; i++) {
      v.copy(dir).multiplyScalar(9 + Math.random() * 12 * power);
      v.x += (Math.random() - 0.5) * 7; v.z += (Math.random() - 0.5) * 7;
      v.y = 3 + Math.random() * 7;
      this.solid.spawn(pos, v, i % 4 === 0 ? gloss : ink, 0.22 + Math.random() * 0.32 * power, 0.7 + Math.random() * 0.6, 30, 0.6, true);
    }
    const drops = 1 + Math.round(Math.random() * 2 * power);
    for (let i = 0; i < drops; i++) {
      const d = 1 + Math.random() * 3.2 * power;
      v.set(pos.x + dir.x * d + (Math.random() - 0.5) * 1.4, 0, pos.z + dir.z * d + (Math.random() - 0.5) * 1.4);
      this.splat(v, 0.55 + Math.random() * 1.1 * power);
    }
  }

  telegraphCircle(pos: THREE.Vector3, radius: number, dur: number, hold = 0.12): Telegraph {
    const t = this.teles.find((x) => x.done) ?? this.teles[0];
    t.done = false; t.t = 0; t.dur = dur; t.hold = hold;
    t.mat.uniforms.mode.value = 0;
    t.mat.uniforms.progress.value = 0;
    t.mat.uniforms.alpha.value = 1;
    t.mesh.position.set(pos.x, 0.06, pos.z);
    t.mesh.rotation.set(0, 0, 0);
    t.mesh.scale.set(radius * 2, 1, radius * 2);
    t.mesh.visible = true;
    return t;
  }

  telegraphRect(from: THREE.Vector3, dirAngle: number, length: number, width: number, dur: number, hold = 0.12): Telegraph {
    const t = this.teles.find((x) => x.done) ?? this.teles[0];
    t.done = false; t.t = 0; t.dur = dur; t.hold = hold;
    t.mat.uniforms.mode.value = 1;
    t.mat.uniforms.progress.value = 0;
    t.mat.uniforms.alpha.value = 1;
    t.mat.uniforms.aspect.value = width / length;
    const cx = from.x + Math.cos(dirAngle) * length / 2, cz = from.z + Math.sin(dirAngle) * length / 2;
    t.mesh.position.set(cx, 0.06, cz);
    t.mesh.rotation.set(0, -dirAngle + Math.PI / 2, 0);
    t.mesh.scale.set(width, 1, length);
    t.mesh.visible = true;
    return t;
  }

  cancelTelegraph(t: Telegraph) { t.done = true; t.mesh.visible = false; }

  // Shadows are rebuilt each frame: call beginShadows, addShadow*, endShadows.
  beginShadows() { this.shadowCount = 0; }
  addShadow(x: number, z: number, size: number, height = 0) {
    if (this.shadowCount >= this.shadows.count) return;
    const s = size * Math.max(0.35, 1 - height * 0.06);
    tmpO.position.set(x, 0.04, z);
    tmpO.rotation.set(0, 0, 0);
    tmpO.scale.set(s, 1, s);
    tmpO.updateMatrix();
    this.shadows.setMatrixAt(this.shadowCount++, tmpO.matrix);
  }
  endShadows() {
    for (let i = this.shadowCount; i < this.shadows.count; i++) {
      tmpO.scale.setScalar(0); tmpO.updateMatrix(); this.shadows.setMatrixAt(i, tmpO.matrix);
    }
    this.shadows.instanceMatrix.needsUpdate = true;
  }

  update(dt: number) {
    this.time += dt;
    this.glow.update(dt);
    this.solid.update(dt);
    for (const r of this.rings) {
      if (!r.active) continue;
      r.t += dt;
      const k = r.t / r.dur;
      if (k >= 1) { r.active = false; r.mesh.visible = false; continue; }
      const e = 1 - Math.pow(1 - k, 3);
      const s = r.r0 + (r.r1 - r.r0) * e;
      r.mesh.scale.set(s, 1, s);
      r.mat.opacity = 1 - k;
    }
    for (const a of this.arcs) {
      if (!a.active) continue;
      a.t += dt;
      const k = a.t / a.dur;
      if (k >= 1.6) { a.active = false; a.mesh.visible = false; continue; }
      a.mat.uniforms.head.value = Math.min(1, k * 1.2);
      a.mat.uniforms.fade.value = k < 1 ? 1 : 1 - (k - 1) / 0.6;
    }
    let anyDecal = this.decalDirty;
    for (let i = 0; i < this.decals.length; i++) {
      const d = this.decals[i];
      if (!d.active) continue;
      d.t += dt;
      let k = 1;
      if (d.t < 0.09) k = (d.t / 0.09) * 1.15;
      else if (d.t < 0.18) k = 1.15 - (d.t - 0.09) / 0.09 * 0.15;
      if (d.t > d.life - 2) k *= Math.max(0, (d.life - d.t) / 2);
      if (d.t > d.life) { d.active = false; k = 0; }
      if (d.t < 0.2 || d.t > d.life - 2.05) {
        tmpO.position.set(d.x, d.y, d.z);
        tmpO.rotation.set(0, d.rot, 0);
        tmpO.scale.set(d.size * k, 1, d.size * k);
        tmpO.updateMatrix();
        this.decalMesh.setMatrixAt(i, tmpO.matrix);
        anyDecal = true;
      }
    }
    if (anyDecal) { this.decalMesh.instanceMatrix.needsUpdate = true; this.decalDirty = false; }
    for (const t of this.teles) {
      if (t.done) continue;
      t.t += dt;
      t.mat.uniforms.time.value = this.time;
      t.mat.uniforms.progress.value = Math.min(1, t.t / t.dur);
      if (t.t > t.dur + t.hold) { t.done = true; t.mesh.visible = false; }
    }
  }
}
