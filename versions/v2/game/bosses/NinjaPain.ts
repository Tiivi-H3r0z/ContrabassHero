import * as THREE from 'three';
import type { Game } from '../Game';
import { ArenaBoss, angleOf, clamp01, dirOf, easeOut, rectAngle } from './kit';
import { box, buildRig, cap, cone, cyl, mergeParts, Rig, sph, tor } from '../models/builder';
import { hullGeometry, makeOutlineMaterial, makeToonMaterial, neonMaterial } from '../render/toon';
import type { Telegraph } from '../core/Fx';
import { PAL } from '../palette';
import { audio } from '../audio/audio';

const FUR = '#f2efe9';
const GARB = '#1d2233';
const BAND = '#c21d3a';
const STEEL = '#dfe9f0';
const CARROT = '#ff8f2a';
const LEAF = '#4caf3a';

const JUMP_H = 14;
const LAND_R = 5.5;
const BOLT_R = 3;
const DASH_LEN = 16;
const MAX_CARROTS = 16;

interface Carrot { obj: THREE.Group; pos: THREE.Vector3; y: number; vy: number; state: 'fall' | 'planted' | 'armed'; t: number; fuse: number; tele: Telegraph | null }
interface Bolt { mesh: THREE.Mesh; t: number }

// Ninja Pain: ninja rabbit. Crouch, leap out of reach towards a telegraphed landing circle, shockwave.
// Drops carrot bombs that get struck by lightning a few seconds later (telegraphed). Katana dash.
// Phase 2: carrots rain from the sky during every jump, double dash.
export class NinjaPain extends ArenaBoss {
  rig: Rig;
  private cycle = 0;
  private from = new THREE.Vector3();
  private target = new THREE.Vector3();
  private dashDir = new THREE.Vector3();
  private dashes = 0;
  private dropped = 0;
  private rainT = 0;
  private flip = 0;
  private strafe = 1;
  private extras = new THREE.Group();
  private carrots: Carrot[] = [];
  private bolts: Bolt[] = [];
  private carrotGeo: THREE.BufferGeometry;
  private carrotHull: THREE.BufferGeometry;
  private carrotMat = makeToonMaterial();
  private carrotOutline = makeOutlineMaterial(0.06);
  private boltGeo: THREE.BufferGeometry;
  private boltMat = neonMaterial('#ffffff', 3.2);
  private boltMat2 = neonMaterial(PAL.danger, 2.6);
  private bladeGlow: THREE.Mesh;

  constructor(game: Game) {
    super(game, 'ninja_pain');
    this.radius = 2.3;
    this.height = 7.5;
    const ear = [cap(0.38, 2.4, FUR, [0, 1.5, 0]), cap(0.2, 2.0, '#f6a3b8', [0, 1.5, 0.22])];
    const foot = [cap(0.38, 0.7, GARB, [0, -0.55, 0]), sph(0.55, FUR, [0, -1.25, 0.45], [0.9, 0.55, 1.7])];
    this.rig = buildRig([
      { name: 'hips', at: [0, 1.75, 0], parts: [sph(0.95, GARB, [0, 0.1, 0], [1.1, 0.8, 0.9]), sph(0.55, FUR, [0, 0.2, -0.95])] },
      { name: 'legL', parent: 'hips', at: [-0.6, -0.1, 0], parts: foot },
      { name: 'legR', parent: 'hips', at: [0.6, -0.1, 0], parts: foot },
      { name: 'torso', parent: 'hips', parts: [
        sph(1.3, GARB, [0, 1.3, 0], [1, 1.15, 0.85]),
        sph(0.8, FUR, [0, 1.5, 0.75], [1, 1.2, 0.5]),
        box(2.4, 0.35, 1.8, BAND, [0, 0.45, 0], [0, 0, 0]),
        box(0.25, 2.6, 0.12, '#3a2a1a', [0, 1.4, -1.05], [0, 0, 0.7]),
      ] },
      { name: 'head', parent: 'torso', at: [0, 3.0, 0.05], parts: [
        sph(1.25, FUR, [0, 0, 0], [1.05, 0.95, 1]),
        sph(0.75, GARB, [0, -0.45, 0.6], [1.25, 0.8, 0.9]),
        sph(0.42, '#ffffff', [-0.45, 0.15, 0.95], [1, 1.1, 0.5]), sph(0.42, '#ffffff', [0.45, 0.15, 0.95], [1, 1.1, 0.5]),
        sph(0.2, PAL.danger, [-0.45, 0.13, 1.15], [1, 1, 0.6], 3.2), sph(0.2, PAL.danger, [0.45, 0.13, 1.15], [1, 1, 0.6], 3.2),
        box(0.75, 0.16, 0.2, PAL.ink, [-0.45, 0.62, 1.0], [0, 0, -0.45]), box(0.75, 0.16, 0.2, PAL.ink, [0.45, 0.62, 1.0], [0, 0, 0.45]),
        tor(1.2, 0.17, BAND, [0, 0.55, 0], [Math.PI / 2 + 0.1, 0, 0]),
        sph(0.25, BAND, [0, 0.6, -1.2]),
        sph(0.18, '#f6a3b8', [0, -0.2, 1.3], [1.2, 0.8, 0.8]),
      ] },
      { name: 'ribbon', parent: 'head', at: [0, 0.6, -1.25], parts: [box(0.32, 0.06, 1.8, BAND, [-0.2, 0, -0.85], [0, -0.2, 0]), box(0.32, 0.06, 1.5, BAND, [0.2, -0.05, -0.7], [0, 0.25, 0])] },
      { name: 'earL', parent: 'head', at: [-0.5, 0.9, -0.15], parts: ear },
      { name: 'earR', parent: 'head', at: [0.5, 0.9, -0.15], parts: ear },
      { name: 'armL', parent: 'torso', at: [-1.25, 2.0, 0], parts: [cap(0.3, 1.1, GARB, [0, -0.7, 0]), sph(0.4, FUR, [0, -1.5, 0])] },
      { name: 'armR', parent: 'torso', at: [1.25, 2.0, 0], parts: [cap(0.3, 1.1, GARB, [0, -0.7, 0]), sph(0.4, FUR, [0, -1.5, 0])] },
      { name: 'katana', parent: 'armR', at: [0, -1.55, 0.1], parts: [
        cyl(0.13, 0.13, 1.1, '#2b2b2b', [0, 0, 0.2], [Math.PI / 2, 0, 0]),
        cyl(0.4, 0.4, 0.1, '#d4a017', [0, 0, 0.8], [Math.PI / 2, 0, 0], 10),
        box(0.08, 0.32, 4.0, STEEL, [0, 0, 2.85], [0, 0, 0], 0.6),
        cone(0.16, 0.5, STEEL, [0, 0, 5.05], [Math.PI / 2, 0, 0], 4),
      ] },
    ], 0.08);
    this.rig.root.scale.setScalar(0.92);
    this.bladeGlow = this.glowOrb(this.rig.pivots.katana, [0, 0, 2.85], 0.3);
    this.bladeGlow.scale.set(0.5, 1, 7);

    const cparts = [cone(0.42, 1.7, CARROT, [0, 0.55, 0], [Math.PI, 0, 0], 10), cone(0.18, 0.9, LEAF, [0, 1.75, 0], [0, 0, 0.3], 5), cone(0.18, 0.9, LEAF, [0, 1.75, 0], [0, 0, -0.3], 5), cone(0.16, 0.8, LEAF, [0, 1.7, 0], [0.35, 0, 0], 5)];
    for (let i = 0; i < 3; i++) cparts.push(box(0.6 - i * 0.12, 0.05, 0.06, '#b8561a', [0, 0.9 - i * 0.35, 0.33 - i * 0.07], [0, 0, 0.2]));
    this.carrotGeo = mergeParts(cparts);
    this.carrotHull = hullGeometry(this.carrotGeo);
    const bparts = [];
    let x = 0, z = 0;
    for (let i = 0; i < 8; i++) {
      const nx = (Math.random() - 0.5) * 2.2, nz = (Math.random() - 0.5) * 2.2;
      const y0 = i * 4, y1 = y0 + 4;
      const dx = nx - x, dz = nz - z;
      const len = Math.hypot(dx, 4, dz);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, 4, dz).normalize());
      const e = new THREE.Euler().setFromQuaternion(q);
      bparts.push(box(0.35, len, 0.35, '#ffffff', [(x + nx) / 2, (y0 + y1) / 2, (z + nz) / 2], [e.x, e.y, e.z]));
      x = nx; z = nz;
    }
    this.boltGeo = mergeParts(bparts);
    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(this.boltGeo, i % 2 ? this.boltMat2 : this.boltMat);
      mesh.visible = false;
      this.extras.add(mesh);
      this.bolts.push({ mesh, t: 0 });
    }
    game.scene.add(this.extras);
  }

  private resetPose() {
    const P = this.rig.pivots;
    P.hips.position.set(0, 1.75, 0);
    P.hips.rotation.set(0, 0, 0);
    P.torso.rotation.set(0, 0, 0);
    P.head.rotation.set(0, 0, 0);
    P.legL.rotation.set(0, 0, 0); P.legR.rotation.set(0, 0, 0);
    P.armL.rotation.set(0, 0, 0.2);
    P.armR.rotation.set(0.6, 0, -0.2);
    P.katana.rotation.set(0.9, 0, 0);
    P.earL.rotation.set(-0.15, 0, 0.12); P.earR.rotation.set(-0.15, 0, -0.12);
    P.ribbon.rotation.set(Math.sin(this.game.time * 9) * 0.2, Math.sin(this.game.time * 7) * 0.3, 0);
    this.bladeGlow.visible = false;
  }

  think(dt: number) {
    const g = this.game;
    const P = this.rig.pivots;
    const t = this.phaseT;
    const enr = this.enraged;
    const toHero = this.toHero();
    const dist = toHero.length();
    this.resetPose();
    this.updateCarrots(dt);

    switch (this.phase) {
      case 'idle':
      case 'stalk': {
        this.faceHero(dt, 8);
        const fwd = dist > 0.01 ? toHero.clone().divideScalar(dist) : dirOf(this.facing);
        const side = new THREE.Vector3(fwd.z, 0, -fwd.x).multiplyScalar(this.strafe);
        const want = fwd.clone().multiplyScalar(dist > 10 ? 1 : dist < 7 ? -1 : 0).add(side).multiplyScalar(enr ? 11 : 9);
        this.vel.lerp(want, 0.1);
        const hop = Math.abs(Math.sin(t * 9));
        P.hips.position.y = 1.75 + hop * 0.6;
        P.legL.rotation.x = -hop * 0.6; P.legR.rotation.x = -hop * 0.6;
        P.earL.rotation.x = -0.3 - hop * 0.3; P.earR.rotation.x = -0.3 - hop * 0.3;
        P.armR.rotation.set(-0.4, 0, -0.5);
        P.katana.rotation.set(0.2, 0, 0);
        if (this.nearEdge(2)) this.strafe *= -1;
        if (t > (enr ? 0.6 : 0.9)) {
          this.cycle++;
          this.strafe = Math.random() < 0.5 ? 1 : -1;
          if (this.cycle % 3 === 2 && dist < 18) { this.dashes = 0; this.setPhase('dashTele'); }
          else this.setPhase('jumpPrep');
        }
        break;
      }
      case 'jumpPrep': {
        this.vel.multiplyScalar(0.7);
        this.faceHero(dt, 10);
        const k = easeOut(t / 0.5);
        P.hips.position.y = 1.75 - 0.8 * k;
        P.legL.rotation.x = 0.9 * k; P.legR.rotation.x = 0.9 * k;
        P.torso.rotation.x = 0.4 * k;
        P.earL.rotation.x = -1.0 * k; P.earR.rotation.x = -1.0 * k;
        P.armL.rotation.set(0.8 * k, 0, 0.6 * k);
        P.armR.rotation.set(0.8 * k, 0, -0.6 * k);
        this.squash = Math.max(this.squash, 0.25 * k);
        if (t < dt * 1.5) audio.play('bossCharge', { pitch: 1.4, volume: 0.6 });
        if (t > 0.5) {
          this.from.copy(this.pos);
          this.target.copy(this.hero.pos);
          this.inArena(this.target, 3);
          g.fx.telegraphCircle(this.target, LAND_R, this.airTime());
          audio.play('telegraph');
          audio.play('jump', { pitch: 0.6 });
          g.fx.ring(this.pos, PAL.bone, 0.5, 5, 0.3, 1.5);
          g.fx.burst(this.pos.clone().setY(0.4), PAL.bone, 16, 12, { size: 0.4, life: 0.4, up: 0.3 });
          this.dropped = 0;
          this.rainT = 0;
          this.flip = 0;
          this.setPhase('jumpAir');
        }
        break;
      }
      case 'jumpAir': {
        const T = this.airTime();
        const k = clamp01(t / T);
        this.vel.set(0, 0, 0);
        this.pos.lerpVectors(this.from, this.target, k);
        this.y = 4 * JUMP_H * k * (1 - k);
        const d = this.target.clone().sub(this.from).setY(0);
        if (d.lengthSq() > 0.1) this.facing = angleOf(d);
        this.flip = k < 0.15 || k > 0.85 ? this.flip : this.flip + dt * 12;
        P.hips.rotation.x = this.flip;
        P.hips.position.y = 2.5;
        P.legL.rotation.x = -1.2; P.legR.rotation.x = -1.2;
        P.armL.rotation.set(-1.2, 0, 0.5);
        P.earL.rotation.x = -1.3; P.earR.rotation.x = -1.3;
        if (k > 0.85) { P.hips.rotation.x = 0; P.armR.rotation.set(-2.8, 0, -0.2); P.katana.rotation.set(-0.3, 0, 0); this.bladeGlow.visible = true; }
        const drops = enr ? 3 : 2;
        if (this.dropped < drops && k > 0.25 + this.dropped * (0.5 / drops)) {
          this.dropped++;
          this.spawnCarrot(this.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3)), Math.max(3, this.y + 2));
        }
        if (enr) {
          this.rainT -= dt;
          if (this.rainT <= 0) {
            this.rainT = 0.3;
            const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 9;
            this.spawnCarrot(this.hero.pos.clone().add(new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r)), 16);
          }
        }
        if (t >= T) {
          this.y = 0;
          this.pos.copy(this.target);
          this.land();
          this.setPhase('landRecover');
        }
        break;
      }
      case 'landRecover': {
        this.y = 0;
        this.vel.multiplyScalar(0.6);
        P.hips.position.y = 1.0;
        P.legL.rotation.x = 1.0; P.legR.rotation.x = 1.0;
        P.torso.rotation.x = 0.55;
        P.armR.rotation.set(0.2, 0, -0.3);
        P.katana.rotation.set(1.4, 0, 0);
        P.head.rotation.x = 0.3;
        P.earL.rotation.set(0.6, 0, 0.5); P.earR.rotation.set(0.6, 0, -0.5);
        if (t > 0.4) this.stars();
        if (t > 1.1) this.setPhase('stalk');
        break;
      }
      case 'dashTele': {
        const D = enr ? 0.62 : 0.75;
        if (t < dt * 1.5) {
          this.faceHero(1, 1);
          dirOf(this.facing, this.dashDir);
          const len = Math.min(DASH_LEN, this.edgeDist(this.pos, this.dashDir, 0.5));
          this.from.copy(this.pos);
          this.target.copy(this.pos).addScaledVector(this.dashDir, len);
          g.fx.telegraphRect(this.pos, rectAngle(this.dashDir), len + this.radius, 3.4, D);
          audio.play('telegraph');
          audio.play('hiss', { pitch: 1.8, volume: 0.5 });
        }
        this.vel.set(0, 0, 0);
        const k = easeOut(t / D);
        P.hips.position.y = 1.75 - 0.5 * k;
        P.torso.rotation.set(0.5 * k, -0.6 * k, 0);
        P.armR.rotation.set(-1.2 * k, 0, -0.2 - 0.5 * k);
        P.katana.rotation.set(1.5 * k, 0, 0);
        P.legL.rotation.x = -0.6 * k; P.legR.rotation.x = 0.8 * k;
        P.earL.rotation.x = -1.1 * k; P.earR.rotation.x = -1.1 * k;
        this.bladeGlow.visible = Math.floor(t * 20) % 2 === 0;
        if (t > D) { this.setPhase('dash'); audio.play('swingHeavy', { pitch: 0.7 }); }
        break;
      }
      case 'dash': {
        const DT = 0.22;
        const k = clamp01(t / DT);
        const prev = this.pos.clone();
        this.pos.lerpVectors(this.from, this.target, easeOut(k));
        this.vel.set(0, 0, 0);
        this.facing = angleOf(this.dashDir);
        P.torso.rotation.set(0.6, 0.6, 0);
        P.armR.rotation.set(-1.4, 0, 1.2);
        P.katana.rotation.set(1.5, 0, 0);
        P.earL.rotation.x = -1.4; P.earR.rotation.x = -1.4;
        this.bladeGlow.visible = true;
        this.segmentHit(prev, this.pos);
        g.fx.burst(this.pos.clone().setY(2), PAL.bone, 3, 4, { size: 0.5, life: 0.25, grav: 0 });
        if (t > DT) {
          g.fx.slash(this.pos, this.facing - Math.PI / 2, PAL.danger, 1.4, 0.15, 1, 2);
          g.fx.slash(this.pos, this.facing - Math.PI / 2, PAL.bone, 1.1, 0.2, -1, 1.6);
          g.shake(0.3, 0.25, 3);
          this.dashes++;
          if (enr && this.dashes < 2) this.setPhase('dashTele');
          else this.setPhase('dashRecover');
        }
        break;
      }
      case 'dashRecover': {
        this.vel.set(0, 0, 0);
        P.torso.rotation.set(0.3, 0.3, 0);
        P.armR.rotation.set(-0.3, 0, 0.8);
        P.katana.rotation.set(1.5, 0, 0);
        P.hips.position.y = 1.4;
        P.head.rotation.x = 0.2;
        if (t > 1.0) this.setPhase('stalk');
        break;
      }
    }
  }

  private airTime() { return this.enraged ? 1.3 : 1.5; }

  private segmentHit(a: THREE.Vector3, b: THREE.Vector3) {
    const h = this.hero;
    if (h.y > 2.5) return;
    const ab = b.clone().sub(a).setY(0);
    const len2 = ab.lengthSq();
    const ah = h.pos.clone().sub(a).setY(0);
    const k = len2 > 1e-6 ? clamp01(ah.dot(ab) / len2) : 0;
    const closest = a.clone().addScaledVector(ab, k);
    if (closest.distanceTo(h.pos.clone().setY(0)) < this.radius + h.radius + 0.3) h.hurt(closest);
    this.hitEnemiesIn(b, this.radius + 1, 35, 14, 6, this.sweepTag());
  }

  private land() {
    const g = this.game;
    this.squash = 0.6;
    g.fx.ring(this.pos, PAL.danger, 1, LAND_R + 2, 0.4, 3);
    g.fx.ring(this.pos, PAL.bone, 0.5, LAND_R, 0.3, 2);
    g.fx.splat(this.pos, 7, PAL.void3);
    g.fx.burst(this.pos.clone().setY(0.8), PAL.bone, 30, 18, { size: 0.45, life: 0.5, up: 0.4 });
    g.fx.slash(this.pos, this.facing - Math.PI / 2, PAL.danger, 1.6, 0.18, 1, 0.8);
    g.shake(0.75, 0.45, 7);
    audio.play('bossLand');
    audio.play('smash', { pitch: 0.9 });
    this.hurtIn(this.pos, LAND_R, 1.4);
    this.hitEnemiesIn(this.pos, LAND_R + 1, 30, 16, 10);
  }

  // ---------- Carrot bombs ----------
  private spawnCarrot(at: THREE.Vector3, fromY: number) {
    if (this.carrots.filter((c) => c.state !== 'armed').length >= MAX_CARROTS) return;
    const pos = this.inArena(at.clone(), 1.5);
    const obj = new THREE.Group();
    obj.add(new THREE.Mesh(this.carrotGeo, this.carrotMat));
    obj.add(new THREE.Mesh(this.carrotHull, this.carrotOutline));
    obj.scale.setScalar(1.4);
    obj.position.set(pos.x, fromY, pos.z);
    this.extras.add(obj);
    const fall = Math.sqrt((2 * fromY) / 36);
    const tele = this.game.fx.telegraphCircle(pos, 1.4, fall, 0.02);
    this.carrots.push({ obj, pos, y: fromY, vy: 0, state: 'fall', t: 0, fuse: (this.enraged ? 3.4 : 4) + Math.random() * 0.6, tele });
  }

  private updateCarrots(dt: number) {
    const g = this.game;
    for (const b of this.bolts) {
      if (!b.mesh.visible) continue;
      b.t -= dt;
      b.mesh.scale.set(1 + Math.random() * 0.6, 1, 1 + Math.random() * 0.6);
      b.mesh.rotation.y = Math.random() * Math.PI * 2;
      if (b.t <= 0) b.mesh.visible = false;
    }
    for (const c of this.carrots) {
      c.t += dt;
      if (c.state === 'fall') {
        c.vy -= 36 * dt;
        c.y += c.vy * dt;
        c.obj.rotation.set(0, c.t * 6, 0);
        if (c.y <= 0) {
          c.y = 0;
          c.state = 'planted';
          c.t = 0;
          c.obj.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * 6, (Math.random() - 0.5) * 0.4);
          g.fx.debris(c.pos.clone().setY(0.3), ['#5b3a24', LEAF], 5, 6, 0.3);
          g.fx.ring(c.pos, PAL.bone, 0.3, 1.8, 0.2, 1);
          audio.play('block', { pitch: 1.6, volume: 0.35 });
          this.hurtIn(c.pos, 1.4, 2.5);
        }
      } else if (c.state === 'planted') {
        if (c.t > c.fuse) {
          c.state = 'armed';
          c.t = 0;
          c.tele = g.fx.telegraphCircle(c.pos, BOLT_R, 0.9);
          audio.play('telegraph', { volume: 0.45, pitch: 1.3 });
        }
      } else {
        const k = c.t / 0.9;
        c.obj.rotation.x = Math.sin(c.t * 60) * 0.15 * (0.4 + k);
        c.obj.rotation.z = Math.cos(c.t * 55) * 0.15 * (0.4 + k);
        if (Math.random() < 0.3 + k * 0.5) g.fx.burst(c.pos.clone().setY(2.2), '#ffffff', 1, 4, { size: 0.25, life: 0.2, grav: 0 });
        if (c.t >= 0.9) this.strike(c);
      }
      c.obj.position.set(c.pos.x, c.y + (c.state === 'fall' ? 0 : -0.25), c.pos.z);
    }
    const dead = this.carrots.filter((c) => c.state === 'armed' && c.t >= 0.9);
    if (dead.length) {
      for (const c of dead) this.extras.remove(c.obj);
      this.carrots = this.carrots.filter((c) => !(c.state === 'armed' && c.t >= 0.9));
    }
  }

  private strike(c: Carrot) {
    const g = this.game;
    const b = this.bolts.find((x) => !x.mesh.visible) ?? this.bolts[0];
    b.mesh.visible = true;
    b.t = 0.18;
    b.mesh.position.set(c.pos.x, 0, c.pos.z);
    g.fx.ring(c.pos, '#ffffff', 0.5, BOLT_R + 1, 0.3, 3);
    g.fx.ring(c.pos, PAL.danger, 0.3, BOLT_R, 0.25, 2.5);
    g.fx.burst(c.pos.clone().setY(1), '#ffffff', 18, 16, { size: 0.35, life: 0.35, up: 1 });
    g.fx.burst(c.pos.clone().setY(1), CARROT, 12, 12, { size: 0.35, life: 0.4, up: 1 });
    g.fx.splat(c.pos, 3.5, PAL.void3);
    g.shake(0.35, 0.2, 2);
    audio.play('lightning', { volume: 0.8, pitch: 0.9 + Math.random() * 0.2 });
    this.hurtIn(c.pos, BOLT_R, 6);
    this.hitEnemiesIn(c.pos, BOLT_R, 40, 10, 8);
  }

  private clearCarrots() {
    for (const c of this.carrots) {
      this.game.fx.burst(c.pos.clone().setY(1), CARROT, 6, 8, { size: 0.3, life: 0.3 });
      if (c.tele && c.state !== 'planted') this.game.fx.cancelTelegraph(c.tele);
      this.extras.remove(c.obj);
    }
    this.carrots = [];
    for (const b of this.bolts) b.mesh.visible = false;
  }

  die() {
    this.clearCarrots();
    super.die();
  }

  dispose() {
    this.clearCarrots();
    this.game.scene.remove(this.extras);
    super.dispose();
    this.carrotGeo.dispose();
    this.carrotHull.dispose();
    this.carrotMat.dispose();
    this.carrotOutline.dispose();
    this.boltGeo.dispose();
    this.boltMat.dispose();
    this.boltMat2.dispose();
  }
}
