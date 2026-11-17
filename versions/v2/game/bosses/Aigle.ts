import * as THREE from 'three';
import type { Game } from '../Game';
import { ArenaBoss, angleOf, clamp01, easeIn, easeOut } from './kit';
import { box, buildRig, cone, cyl, Rig, sph } from '../models/builder';
import { PAL } from '../palette';
import { audio } from '../audio/audio';

const BROWN = '#6b4a2f';
const DARK = '#3b2718';
const WHITE = '#f4f1e8';
const BEAK = '#f2b51d';

const FLY_Y = 9;
const DIVE_R = 4.2;

// L'Aigle: circles out of reach and fires feather fans, dives on a telegraphed circle
// then stays stuck beak-first in the ground (the punish window). Phase 2: double dive, wider volleys.
export class Aigle extends ArenaBoss {
  rig: Rig;
  private orbitA = 0;
  private orbitDir = 1;
  private cycle = 0;
  private dives = 0;
  private volleys = 0;
  private target = new THREE.Vector3();
  private from = new THREE.Vector3();
  private hover = new THREE.Vector3();
  private fromY = 0;
  private charge: THREE.Mesh;
  private tmp = new THREE.Vector3();

  constructor(game: Game) {
    super(game, 'aigle');
    this.radius = 2.8;
    this.height = 7.5;
    const feathers = (side: number) => {
      const parts = [
        box(4.4, 0.32, 2.2, BROWN, [side * 2.3, 0, -0.1]),
        box(2.2, 0.36, 1.6, WHITE, [side * 0.9, 0.08, 0.35]),
      ];
      for (let i = 0; i < 5; i++) parts.push(box(1.7, 0.18, 0.55, DARK, [side * (4.2 + i * 0.12), -0.05, 0.75 - i * 0.48], [0, side * (0.15 + i * 0.12), 0]));
      return parts;
    };
    this.rig = buildRig([
      { name: 'legL', at: [-0.75, 2.2, 0.1], parts: [cyl(0.24, 0.2, 1.8, BEAK, [0, -0.9, 0]), cone(0.14, 0.6, PAL.ink, [-0.25, -1.85, 0.45], [1.6, 0, 0], 6), cone(0.14, 0.6, PAL.ink, [0.25, -1.85, 0.45], [1.6, 0, 0], 6), cone(0.14, 0.5, PAL.ink, [0, -1.85, -0.35], [-1.6, 0, 0], 6)] },
      { name: 'legR', at: [0.75, 2.2, 0.1], parts: [cyl(0.24, 0.2, 1.8, BEAK, [0, -0.9, 0]), cone(0.14, 0.6, PAL.ink, [-0.25, -1.85, 0.45], [1.6, 0, 0], 6), cone(0.14, 0.6, PAL.ink, [0.25, -1.85, 0.45], [1.6, 0, 0], 6), cone(0.14, 0.5, PAL.ink, [0, -1.85, -0.35], [-1.6, 0, 0], 6)] },
      { name: 'body', at: [0, 3.4, 0], parts: [
        sph(1.9, BROWN, [0, 0, 0], [1, 1.2, 1.25]),
        sph(1.45, '#d8c4a0', [0, -0.2, 0.85], [1, 1.15, 0.6]),
        sph(1.2, WHITE, [0, 1.6, 0.6], [1.15, 0.8, 1]),
      ] },
      { name: 'tail', parent: 'body', at: [0, -0.9, -2.0], parts: [
        box(0.7, 0.2, 2.2, WHITE, [0, 0, -0.9], [0.35, 0, 0]),
        box(0.7, 0.2, 2.0, WHITE, [-0.6, 0, -0.8], [0.35, -0.35, 0]),
        box(0.7, 0.2, 2.0, WHITE, [0.6, 0, -0.8], [0.35, 0.35, 0]),
      ] },
      { name: 'head', parent: 'body', at: [0, 2.3, 1.1], parts: [
        sph(1.15, WHITE, [0, 0, 0], [1, 1, 1.1]),
        sph(0.5, WHITE, [-0.55, -0.55, -0.6]), sph(0.5, WHITE, [0.55, -0.55, -0.6]),
        cone(0.5, 1.3, BEAK, [0, -0.1, 1.45], [Math.PI / 2, 0, 0], 10),
        sph(0.42, BEAK, [0, 0.12, 1.05], [1, 0.8, 1]),
        cone(0.2, 0.55, BEAK, [0, -0.5, 2.05], [Math.PI, 0, 0], 6),
        sph(0.34, '#ffffff', [-0.55, 0.22, 0.82], [1, 1, 0.6]), sph(0.34, '#ffffff', [0.55, 0.22, 0.82], [1, 1, 0.6]),
        sph(0.17, PAL.danger, [-0.58, 0.2, 1.0], 1, 3), sph(0.17, PAL.danger, [0.58, 0.2, 1.0], 1, 3),
        box(0.75, 0.2, 0.3, PAL.ink, [-0.5, 0.55, 0.9], [0, 0, -0.45]), box(0.75, 0.2, 0.3, PAL.ink, [0.5, 0.55, 0.9], [0, 0, 0.45]),
      ] },
      { name: 'wingL', parent: 'body', at: [-1.5, 0.9, 0], parts: feathers(-1) },
      { name: 'wingR', parent: 'body', at: [1.5, 0.9, 0], parts: feathers(1) },
    ], 0.08);
    this.rig.root.scale.setScalar(1.05);
    this.charge = this.glowOrb(this.rig.pivots.head, [0, -0.2, 2.2], 0.55);
  }

  reachable() { return this.y < 3.5; }

  protected onEnrage() { this.orbitDir *= -1; }

  private headWorld(out: THREE.Vector3) {
    this.rig.pivots.head.getWorldPosition(out);
    return out;
  }

  private pose(dt: number, flying: boolean) {
    const P = this.rig.pivots;
    const t = this.game.time;
    P.body.position.set(0, 3.4, 0);
    P.body.rotation.set(0, 0, 0);
    P.head.rotation.set(0, 0, 0);
    P.tail.rotation.set(0, 0, 0);
    P.wingL.rotation.set(0, 0, 0);
    P.wingR.rotation.set(0, 0, 0);
    P.legL.rotation.set(0, 0, 0);
    P.legR.rotation.set(0, 0, 0);
    if (flying) {
      const f = Math.sin(t * 9);
      P.body.rotation.x = 0.55;
      P.wingL.rotation.z = f * 0.7;
      P.wingR.rotation.z = -f * 0.7;
      P.head.rotation.x = -0.45;
      P.legL.rotation.x = 1.2; P.legR.rotation.x = 1.2;
      P.tail.rotation.x = Math.sin(t * 4) * 0.1;
    } else {
      P.wingL.rotation.z = 1.2;
      P.wingR.rotation.z = -1.2;
    }
    void dt;
  }

  think(dt: number) {
    const g = this.game;
    const P = this.rig.pivots;
    const t = this.phaseT;
    const enr = this.enraged;
    this.charge.visible = false;

    switch (this.phase) {
      case 'idle': {
        this.pose(dt, false);
        this.faceHero(dt, 5);
        P.head.rotation.y = Math.sin(t * 7) * 0.3;
        P.body.position.y = 3.4 + Math.sin(t * 5) * 0.06;
        if (t > (enr ? 0.5 : 0.9)) this.setPhase('takeoff');
        break;
      }
      case 'takeoff': {
        this.pose(dt, true);
        if (t < dt * 1.5) {
          audio.play('screech');
          g.fx.ring(this.pos, PAL.bone, 1, 8, 0.4, 1.5);
          g.fx.burst(this.pos.clone().setY(0.5), PAL.bone, 20, 14, { size: 0.4, life: 0.5, up: 0.3 });
          this.fromY = this.y;
          this.orbitA = Math.atan2(this.pos.z - this.hero.pos.z, this.pos.x - this.hero.pos.x);
        }
        const k = easeOut(t / 0.8);
        this.y = this.fromY + (FLY_Y - this.fromY) * k;
        P.wingL.rotation.z = Math.sin(t * 16) * 0.9;
        P.wingR.rotation.z = -Math.sin(t * 16) * 0.9;
        this.vel.set(0, 0, 0);
        if (t > 0.8) this.setPhase('fly');
        break;
      }
      case 'fly': {
        this.pose(dt, true);
        const w = (enr ? 1.0 : 0.75) * this.orbitDir;
        this.orbitA += w * dt;
        const R = 12;
        this.tmp.set(this.hero.pos.x + Math.cos(this.orbitA) * R, 0, this.hero.pos.z + Math.sin(this.orbitA) * R);
        this.inArena(this.tmp, 3);
        const d = this.tmp.sub(this.pos).setY(0);
        const len = d.length();
        const sp = Math.min(len * 3, enr ? 22 : 17);
        if (len > 0.01) {
          this.pos.addScaledVector(d, sp * dt / len);
          const want = angleOf(d);
          let diff = want - this.facing;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          this.facing += diff * Math.min(1, dt * 4);
          P.body.rotation.z = -Math.sign(diff) * Math.min(0.5, Math.abs(diff));
        }
        this.vel.set(0, 0, 0);
        this.y = FLY_Y + Math.sin(this.game.time * 2) * 0.6;
        if (t > (enr ? 1.0 : 1.4)) {
          this.cycle++;
          this.setPhase(this.cycle % 2 === 1 ? 'volleyTele' : 'diveTele');
        }
        break;
      }
      case 'volleyTele': {
        this.pose(dt, true);
        this.faceHero(dt, 8);
        this.vel.set(0, 0, 0);
        const D = enr ? 0.6 : 0.7;
        if (t < dt * 1.5) { audio.play('screech', { pitch: 1.2 }); audio.play('telegraph', { volume: 0.6 }); }
        const k = clamp01(t / D);
        P.body.rotation.x = 0.55 - 0.7 * k;
        P.wingL.rotation.set(0, -0.6 * k, -0.9 * k);
        P.wingR.rotation.set(0, 0.6 * k, 0.9 * k);
        P.head.rotation.x = -0.2;
        this.charge.visible = true;
        this.charge.scale.setScalar(0.3 + k * 1.1 + Math.sin(this.game.time * 40) * 0.1);
        this.y += Math.sin(t * 30) * 0.01;
        if (t > D) {
          const from = this.headWorld(this.tmp).clone();
          const dx = this.hero.pos.x - from.x, dz = this.hero.pos.z - from.z;
          const hd = Math.max(4, Math.hypot(dx, dz));
          const speed = enr ? 24 : 20;
          const T = hd / speed;
          const n = enr ? 9 : 5;
          this.fan('feather', from, Math.atan2(dx, dz), n, enr ? 1.5 : 0.9, speed, { vy: (1.2 - from.y) / T, grav: 0.01, life: T + 0.6, radius: 0.75 });
          g.fx.burst(from, PAL.danger, 14, 12, { size: 0.35, life: 0.35 });
          g.fx.burst(from, PAL.bone, 10, 10, { size: 0.3, life: 0.4 });
          P.wingL.rotation.z = 0.8; P.wingR.rotation.z = -0.8;
          audio.play('chalkThrow', { pitch: 0.7 });
          this.volleys++;
          if (enr && this.volleys % 2 === 1) this.setPhase('volleyTele');
          else this.setPhase('fly');
        }
        break;
      }
      case 'diveTele': {
        this.pose(dt, true);
        const D = enr ? 0.8 : 0.95;
        if (t < dt * 1.5) {
          this.target.copy(this.hero.pos);
          this.inArena(this.target, 3);
          g.fx.telegraphCircle(this.target, DIVE_R, D);
          audio.play('telegraph');
          audio.play('screech', { pitch: 0.85 });
          this.from.copy(this.pos);
          this.fromY = this.y;
          const ap = this.target.clone().sub(this.pos).setY(0);
          if (ap.lengthSq() < 0.5) ap.set(Math.sin(this.facing), 0, Math.cos(this.facing));
          ap.normalize();
          this.hover.copy(this.target).addScaledVector(ap, -7);
          this.inArena(this.hover, 1);
        }
        this.vel.set(0, 0, 0);
        const a = 0.62 * D;
        if (t < a) {
          const k = easeOut(t / a);
          this.pos.lerpVectors(this.from, this.hover, k);
          this.y = this.fromY + (12 - this.fromY) * k;
          P.body.rotation.x = 0.55 - 0.9 * k;
          P.wingL.rotation.z = -0.9 * k + Math.sin(t * 14) * 0.3;
          P.wingR.rotation.z = 0.9 * k - Math.sin(t * 14) * 0.3;
        } else {
          const k = easeIn((t - a) / (D - a));
          this.pos.lerpVectors(this.hover, this.target, k);
          this.y = 12 * (1 - k);
          P.body.rotation.x = 1.45;
          P.wingL.rotation.set(0, 1.0, 0.3);
          P.wingR.rotation.set(0, -1.0, -0.3);
          P.head.rotation.x = 0.2;
          if (Math.random() < 0.7) g.fx.burst(this.pos.clone().setY(this.y + 2), PAL.bone, 2, 4, { size: 0.4, life: 0.3, grav: 0 });
        }
        const d = this.target.clone().sub(this.pos).setY(0);
        if (d.lengthSq() > 0.05) this.facing = angleOf(d);
        if (t >= D) {
          this.pos.copy(this.target);
          this.y = 0;
          this.impact();
          if (enr && this.dives === 0) { this.dives = 1; this.setPhase('diveTele'); }
          else { this.dives = 0; this.setPhase('stuck'); }
        }
        break;
      }
      case 'stuck': {
        this.pose(dt, false);
        this.y = 0;
        this.vel.multiplyScalar(0.5);
        P.body.position.y = 2.1;
        P.body.rotation.x = 1.25;
        P.head.rotation.x = 0.3 + Math.sin(t * 25) * 0.05;
        P.wingL.rotation.set(0, 0, Math.sin(t * 12) * 0.8 - 0.2);
        P.wingR.rotation.set(0, 0, -Math.sin(t * 12) * 0.8 + 0.2);
        P.legL.rotation.x = Math.sin(t * 14) * 0.7;
        P.legR.rotation.x = -Math.sin(t * 14) * 0.7;
        P.tail.rotation.x = -0.6 + Math.sin(t * 18) * 0.2;
        this.stars(5);
        if (Math.random() < 0.08) g.fx.debris(this.pos.clone().addScaledVector(this.tmp.set(Math.sin(this.facing), 0, Math.cos(this.facing)), 2).setY(0.3), ['#7a6650', PAL.bone], 2, 5, 0.3);
        if (t > 1.4) this.setPhase('pullOut');
        break;
      }
      case 'pullOut': {
        this.pose(dt, false);
        const k = clamp01(t / 0.35);
        P.body.position.y = 2.1 + 1.3 * k;
        P.body.rotation.x = 1.25 * (1 - k) - 0.3 * Math.sin(k * Math.PI);
        P.wingL.rotation.z = -0.8 * k; P.wingR.rotation.z = 0.8 * k;
        if (t < dt * 1.5) {
          audio.play('screech', { pitch: 0.7 });
          g.fx.debris(this.pos.clone().setY(0.4), ['#7a6650', PAL.bone, PAL.ink], 10, 9, 0.4);
        }
        if (t > 0.45) this.setPhase('takeoff');
        break;
      }
    }
  }

  private impact() {
    const g = this.game;
    g.fx.ring(this.pos, PAL.danger, 1, DIVE_R + 2, 0.4, 3);
    g.fx.ring(this.pos, PAL.bone, 0.5, DIVE_R, 0.3, 1.5);
    g.fx.splat(this.pos, 6, PAL.void3);
    g.fx.debris(this.pos.clone().setY(0.4), ['#7a6650', PAL.bone, PAL.ink], 18, 14, 0.5);
    g.fx.burst(this.pos.clone().setY(1), PAL.bone, 26, 18, { size: 0.45, life: 0.5, up: 0.4 });
    g.shake(0.7, 0.45, 7);
    audio.play('bossLand');
    audio.play('smash', { pitch: 0.8 });
    this.squash = 0.5;
    this.hurtIn(this.pos, DIVE_R, 1.6);
    this.hitEnemiesIn(this.pos, DIVE_R + 1, 30, 16, 9);
  }
}
