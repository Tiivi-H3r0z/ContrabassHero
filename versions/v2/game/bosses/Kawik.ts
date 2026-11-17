import * as THREE from 'three';
import type { Game } from '../Game';
import { ArenaBoss, TAU, angleOf, clamp01, dirOf, easeIn, easeOut, rectAngle } from './kit';
import { box, buildRig, cone, hemi, Rig, sph } from '../models/builder';
import { PAL } from '../palette';
import { audio } from '../audio/audio';

const CARAMEL = '#d98e3b';
const CREAM = '#f5efe2';
const CHOCO = '#5a3a22';
const PINK = '#f2a0a8';

const POUND_R = 4.5;
const WAVE_R0 = 4;
const WAVE_R1 = 17;
const WAVE_T = 0.75;

// Kawik: colossal, chubby guinea pig. Puffs its cheeks then spits a seed spread, rolls in a
// telegraphed line, and ground-pounds a shockwave ring the hero has to jump over.
// Phase 2: the roll ricochets off the arena edge twice.
export class Kawik extends ArenaBoss {
  rig: Rig;
  private cycle = 0;
  private rollDir = new THREE.Vector3();
  private rollLeft = 0;
  private bounces = 0;
  private bouncing = false;
  private waveHit = false;
  private mouth: THREE.Mesh;
  private rollAngle = 0;

  constructor(game: Game) {
    super(game, 'kawik');
    this.radius = 3.6;
    this.height = 6.5;
    const foot = (x: number, z: number) => [sph(0.65, PINK, [x, 0, z], [1, 0.6, 1.3]), box(0.12, 0.1, 0.3, PAL.ink, [x - 0.25, -0.1, z + 0.8]), box(0.12, 0.1, 0.3, PAL.ink, [x + 0.25, -0.1, z + 0.8])];
    this.rig = buildRig([
      { name: 'core', at: [0, 3, 0], parts: [
        sph(3, CREAM, [0, 0, 0], [1.25, 0.95, 1.4]),
        sph(2.4, CARAMEL, [0, 0.9, -1.4], [1.35, 0.85, 1.2]),
        sph(1.6, CHOCO, [-1.9, 0.6, 1.0], [0.9, 1, 1.1]),
        sph(1.4, CARAMEL, [2.1, 0.2, 0.6], [0.8, 1.1, 1.2]),
        sph(1.1, CHOCO, [1.0, 1.6, -2.4], [1.2, 0.8, 1]),
        cone(0.7, 1.3, CARAMEL, [0, 2.9, -0.6], [-0.4, 0, 0], 8), cone(0.6, 1.1, CREAM, [-0.7, 2.7, -0.2], [-0.2, 0, 0.5], 8), cone(0.6, 1.1, CREAM, [0.7, 2.7, -0.2], [-0.2, 0, -0.5], 8),
        sph(1.0, CREAM, [0, -0.4, -3.8], [1.3, 1, 0.6]),
      ] },
      { name: 'head', parent: 'core', at: [0, 0.6, 3.1], parts: [
        sph(2.1, CREAM, [0, 0, 0], [1.15, 1, 1.05]),
        sph(1.5, CARAMEL, [-0.9, 0.7, -0.3], [1, 1, 1]),
        sph(1.3, CHOCO, [1.0, 0.8, -0.4]),
        hemi(0.9, PINK, [-1.6, 1.5, -0.4], [0.2, 0, 0.9], [1, 0.4, 1]),
        hemi(0.9, PINK, [1.6, 1.5, -0.4], [0.2, 0, -0.9], [1, 0.4, 1]),
        sph(0.62, PAL.ink, [-0.95, 0.45, 1.55], [1, 1.1, 0.7]), sph(0.62, PAL.ink, [0.95, 0.45, 1.55], [1, 1.1, 0.7]),
        sph(0.22, PAL.danger, [-0.95, 0.5, 1.95], 1, 3), sph(0.22, PAL.danger, [0.95, 0.5, 1.95], 1, 3),
        sph(0.12, '#ffffff', [-0.75, 0.75, 1.95], 1, 1.5), sph(0.12, '#ffffff', [1.15, 0.75, 1.95], 1, 1.5),
        box(0.7, 0.14, 0.2, PAL.ink, [-0.95, 1.25, 1.6], [0, 0, -0.35]), box(0.7, 0.14, 0.2, PAL.ink, [0.95, 1.25, 1.6], [0, 0, 0.35]),
        sph(0.32, PINK, [0, -0.25, 2.1], [1.3, 0.9, 0.9]),
        box(0.3, 0.45, 0.12, '#ffffff', [-0.17, -0.85, 1.95]), box(0.3, 0.45, 0.12, '#ffffff', [0.17, -0.85, 1.95]),
        box(1.8, 0.05, 0.05, PAL.ink, [-1.3, -0.35, 1.8], [0, 0.3, 0.12]), box(1.8, 0.05, 0.05, PAL.ink, [-1.3, -0.6, 1.8], [0, 0.3, -0.12]),
        box(1.8, 0.05, 0.05, PAL.ink, [1.3, -0.35, 1.8], [0, -0.3, -0.12]), box(1.8, 0.05, 0.05, PAL.ink, [1.3, -0.6, 1.8], [0, -0.3, 0.12]),
      ] },
      { name: 'cheekL', parent: 'head', at: [-1.25, -0.6, 1.0], parts: [sph(0.85, CREAM, [0, 0, 0], [1, 0.9, 1])] },
      { name: 'cheekR', parent: 'head', at: [1.25, -0.6, 1.0], parts: [sph(0.85, CREAM, [0, 0, 0], [1, 0.9, 1])] },
      { name: 'footFL', parent: 'core', at: [-1.7, -2.45, 2.1], parts: foot(0, 0) },
      { name: 'footFR', parent: 'core', at: [1.7, -2.45, 2.1], parts: foot(0, 0) },
      { name: 'footBL', parent: 'core', at: [-1.9, -2.45, -1.9], parts: foot(0, 0) },
      { name: 'footBR', parent: 'core', at: [1.9, -2.45, -1.9], parts: foot(0, 0) },
    ], 0.08);
    this.mouth = this.glowOrb(this.rig.pivots.head, [0, -0.7, 2.0], 0.5);
  }

  private resetPose() {
    const P = this.rig.pivots;
    P.core.position.set(0, 3, 0);
    P.core.rotation.set(0, 0, 0);
    P.core.scale.set(1, 1, 1);
    P.head.rotation.set(0, 0, 0);
    P.cheekL.scale.setScalar(1);
    P.cheekR.scale.setScalar(1);
    for (const f of ['footFL', 'footFR', 'footBL', 'footBR']) { P[f].rotation.set(0, 0, 0); P[f].visible = true; }
    this.mouth.visible = false;
  }

  private waddle(t: number, amp: number) {
    const P = this.rig.pivots;
    const s = Math.sin(t * 11);
    P.footFL.rotation.x = s * 0.6 * amp; P.footBR.rotation.x = s * 0.6 * amp;
    P.footFR.rotation.x = -s * 0.6 * amp; P.footBL.rotation.x = -s * 0.6 * amp;
    P.core.position.y = 3 + Math.abs(s) * 0.25 * amp;
    P.core.rotation.z = s * 0.06 * amp;
  }

  think(dt: number) {
    const g = this.game;
    const P = this.rig.pivots;
    const t = this.phaseT;
    const enr = this.enraged;
    const dist = this.toHero().length();
    this.resetPose();

    switch (this.phase) {
      case 'idle':
        this.faceHero(dt, 4);
        P.core.scale.set(1 + Math.sin(t * 4) * 0.03, 1 - Math.sin(t * 4) * 0.03, 1);
        if (t > (enr ? 0.4 : 0.7)) this.setPhase('walk');
        break;
      case 'walk': {
        this.faceHero(dt, 3.5);
        this.walkTo(this.hero.pos, enr ? 8 : 6);
        this.waddle(t, 1);
        if (t > 1.6 || (dist < 9 && t > 0.6)) this.pick(dist);
        break;
      }
      case 'spitTele': {
        const D = enr ? 0.65 : 0.85;
        this.vel.multiplyScalar(0.8);
        if (t < dt * 1.5) {
          this.faceHero(1, 1);
          const n = 5, spread = enr ? 1.6 : 1.1;
          for (let i = 0; i < n; i++) {
            const a = this.facing + (i / (n - 1) - 0.5) * spread;
            g.fx.telegraphRect(this.pos, rectAngle(dirOf(a)), 17, 1.1, D);
          }
          audio.play('telegraph');
        }
        const k = clamp01(t / D);
        const puff = 1 + easeOut(k) * 0.9 + Math.sin(t * 40) * 0.04 * k;
        P.cheekL.scale.setScalar(puff); P.cheekR.scale.setScalar(puff);
        P.head.rotation.x = -0.25 * k;
        this.mouth.visible = true;
        this.mouth.scale.setScalar(0.2 + k);
        P.core.scale.set(1 + k * 0.05, 1 + k * 0.05, 1);
        if (t > D) this.spit();
        break;
      }
      case 'spitRecover':
        P.head.rotation.x = 0.15;
        P.cheekL.scale.setScalar(0.85); P.cheekR.scale.setScalar(0.85);
        if (t > 0.7) this.setPhase('walk');
        break;
      case 'rollTele': {
        const D = this.bouncing ? 0.7 : enr ? 0.75 : 0.9;
        if (t < dt * 1.5) {
          this.faceHero(1, 1);
          dirOf(this.facing, this.rollDir);
          this.showRollPath(D);
          audio.play('bossCharge');
          audio.play('telegraph');
        }
        this.vel.set(0, 0, 0);
        const k = clamp01(t / D);
        this.ball(k);
        this.rollAngle -= dt * 6 * k;
        P.core.rotation.x = this.rollAngle;
        if (Math.random() < 0.4) g.fx.burst(this.pos.clone().addScaledVector(this.rollDir, -this.radius).setY(0.4), PAL.bone, 1, 6, { size: 0.4, life: 0.3 });
        if (t > D) this.setPhase('roll');
        break;
      }
      case 'roll': {
        const sp = enr ? 34 : 29;
        this.ball(1);
        this.vel.copy(this.rollDir).multiplyScalar(sp);
        this.rollLeft -= sp * dt;
        this.rollAngle += sp / 3 * dt;
        P.core.rotation.x = this.rollAngle;
        this.facing = angleOf(this.rollDir);
        if (Math.random() < 0.7) g.fx.burst(this.pos.clone().setY(0.4), PAL.bone, 2, 7, { size: 0.45, life: 0.35 });
        if (Math.random() < 0.25) g.fx.debris(this.pos.clone().setY(0.3), ['#6a7a3a', CREAM], 1, 6, 0.35);
        this.contactDamage(true);
        this.hitEnemiesIn(this.pos, this.radius + 0.5, 30, 18, 8, this.sweepTag());
        const outward = this.rollDir.x * this.pos.x + this.rollDir.z * this.pos.z > 0;
        if (this.rollLeft <= 0 || (outward && this.nearEdge(0.6)) || t > 2.2) {
          g.shake(0.55, 0.35, 5);
          g.fx.ring(this.pos, PAL.bone, 1, 7, 0.35, 1.5);
          audio.play('bossLand', { volume: 0.7 });
          this.vel.set(0, 0, 0);
          if (this.bouncing && this.bounces < 2 && this.nearEdge(0.8)) {
            this.bounces++;
            const v = this.rollDir.clone();
            this.bounceEdge(v, 0.6);
            if (v.dot(new THREE.Vector3(this.pos.x, 0, this.pos.z)) > 0) v.set(-this.pos.x, 0, -this.pos.z);
            const toH = this.toHero().normalize();
            this.rollDir.copy(v.normalize().lerp(toH, 0.35).normalize());
            this.setPhase('rollBounce');
          } else {
            this.bouncing = false;
            this.bounces = 0;
            this.rollAngle %= TAU;
            this.setPhase('dizzy');
          }
        }
        break;
      }
      case 'rollBounce': {
        const D = 0.6;
        if (t < dt * 1.5) { this.showRollPath(D); audio.play('telegraph'); this.squash = 0.6; }
        this.vel.set(0, 0, 0);
        this.ball(1);
        this.rollAngle += dt * 10;
        P.core.rotation.x = this.rollAngle;
        P.core.position.y = 3 + Math.sin(clamp01(t / D) * Math.PI) * 1.6;
        this.facing = angleOf(this.rollDir);
        if (t > D) this.setPhase('roll');
        break;
      }
      case 'dizzy':
        this.ball(Math.max(0, 1 - t * 3));
        P.core.rotation.x = this.rollAngle * Math.max(0, 1 - t * 3);
        if (t > 0.35) {
          this.rollAngle = 0;
          P.head.rotation.z = Math.sin(t * 9) * 0.3;
          P.core.rotation.z = Math.sin(t * 9) * 0.08;
        }
        this.stars();
        if (t > (enr ? 1.2 : 1.5)) this.setPhase('walk');
        break;
      case 'poundTele': {
        const D = enr ? 0.8 : 0.95;
        if (t < dt * 1.5) {
          g.fx.telegraphCircle(this.pos, WAVE_R1, D);
          g.fx.telegraphCircle(this.pos, POUND_R + 0.5, D);
          audio.play('telegraph');
          audio.play('bossCharge', { pitch: 1.3 });
        }
        this.vel.set(0, 0, 0);
        const up = 0.6 * D;
        if (t < 0.15) { this.squash = 0.4; this.y = 0; }
        else if (t < up) this.y = 8 * easeOut((t - 0.15) / (up - 0.15));
        else this.y = 8 * (1 - easeIn((t - up) / (D - up)));
        for (const f of ['footFL', 'footFR', 'footBL', 'footBR']) P[f].rotation.x = this.y > 0.5 ? 0.8 : 0;
        P.head.rotation.x = this.y > 0.5 ? -0.3 : 0;
        if (t >= D) {
          this.y = 0;
          this.squash = 0.8;
          this.waveHit = false;
          g.fx.ring(this.pos, PAL.danger, WAVE_R0, WAVE_R1, WAVE_T, 3);
          g.fx.ring(this.pos, PAL.bone, 1, POUND_R + 1, 0.35, 2);
          g.fx.splat(this.pos, 9, PAL.void3);
          g.fx.debris(this.pos.clone().setY(0.5), ['#6a7a3a', CREAM, PAL.ink], 20, 16, 0.5);
          g.shake(0.85, 0.5, 8);
          audio.play('bossLand');
          audio.play('smash', { pitch: 0.55 });
          if (this.hurtIn(this.pos, POUND_R, 2.5)) this.waveHit = true;
          this.hitEnemiesIn(this.pos, WAVE_R1, 25, 16, 10);
          this.setPhase('shockwave');
        }
        break;
      }
      case 'shockwave': {
        this.vel.set(0, 0, 0);
        P.core.scale.set(1.08, 0.92, 1.08);
        const front = WAVE_R0 + (WAVE_R1 - WAVE_R0) * easeOut(t / WAVE_T);
        if (!this.waveHit && t < WAVE_T) {
          const h = this.hero;
          const d = Math.hypot(h.pos.x - this.pos.x, h.pos.z - this.pos.z);
          if (d > front * 0.8 - 0.6 && d < front + 0.6 && h.y < 0.9 && h.hurt(this.pos)) this.waveHit = true;
        }
        if (t > 0.3) this.stars();
        if (t > WAVE_T + (enr ? 0.6 : 0.9)) this.setPhase('walk');
        break;
      }
    }
  }

  private pick(dist: number) {
    this.cycle++;
    if (this.enraged && this.cycle % 3 === 0) { this.bouncing = true; this.bounces = 0; this.setPhase('rollTele'); return; }
    if (dist > 13) { this.setPhase(Math.random() < 0.6 ? 'rollTele' : 'spitTele'); return; }
    const r = Math.random();
    this.setPhase(r < 0.38 ? 'spitTele' : r < 0.7 ? 'poundTele' : 'rollTele');
  }

  private ball(k: number) {
    const P = this.rig.pivots;
    P.core.scale.set(1 - 0.08 * k, 1 + 0.08 * k, 1 - 0.25 * k);
    for (const f of ['footFL', 'footFR', 'footBL', 'footBR']) P[f].visible = k < 0.5;
    P.head.rotation.x = 0.5 * k;
  }

  private showRollPath(D: number) {
    const len = this.edgeDist(this.pos, this.rollDir, 0.6) + this.radius;
    this.rollLeft = len;
    this.game.fx.telegraphRect(this.pos, rectAngle(this.rollDir), Math.max(4, len), this.radius * 2, D);
  }

  private spit() {
    const g = this.game;
    const enr = this.enraged;
    const head = new THREE.Vector3();
    this.mouth.getWorldPosition(head);
    head.y = 1.6;
    const n = enr ? 11 : 7;
    this.fan('seed', head, this.facing, n, enr ? 1.6 : 1.1, enr ? 19 : 17, { life: 1.6, radius: 0.6 });
    g.fx.burst(head.clone().setY(3), PAL.danger, 16, 12, { size: 0.35, life: 0.3 });
    g.fx.burst(head.clone().setY(3), CREAM, 10, 10, { size: 0.3, life: 0.4 });
    audio.play('chalkThrow', { pitch: 0.6 });
    this.squash = 0.35;
    this.setPhase('spitRecover');
  }
}
