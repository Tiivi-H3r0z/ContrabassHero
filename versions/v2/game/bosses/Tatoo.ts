import * as THREE from 'three';
import type { Game } from '../Game';
import { ArenaBoss, TAU, angleOf, clamp01, dirOf, easeOut, rectAngle } from './kit';
import { box, buildRig, cap, cone, hemi, Rig, sph, tor } from '../models/builder';
import { PAL } from '../palette';
import { audio } from '../audio/audio';

const SHELL = '#8f8270';
const BAND = '#5e5244';
const SKIN = '#d9b29a';
const CLAW = '#2a2420';

const SWIPE_LEN = 7.5;
const SWIPE_W = 6.5;
const ROLL_TIME = 3;
const BALL_R = 2.9;

// Tatoo: armadillo bureaucrat. Walks (vulnerable, claw swipes), then curls into an invulnerable
// ball that rolls fast and ricochets off the arena edge, then stays dizzy (bonus damage).
// Phase 2: shorter walks, faster rolls, radial spike volley when uncurling.
export class Tatoo extends ArenaBoss {
  rig: Rig;
  private rollDir = new THREE.Vector3();
  private rollT = 0;
  private bounces = 0;
  private swipeCd = 1.5;
  private walkT = 0;
  private ballSpin = 0;
  private spikeGlow: THREE.Mesh;

  constructor(game: Game) {
    super(game, 'tatoo');
    this.radius = 3;
    this.height = 6;
    const leg = (name: string, x: number, z: number) => ({
      name, parent: 'walker', at: [x, 1.6, z] as [number, number, number],
      parts: [cap(0.48, 0.8, SKIN, [0, -0.7, 0]), cone(0.12, 0.6, CLAW, [-0.25, -1.45, 0.45], [1.5, 0, 0], 5), cone(0.12, 0.6, CLAW, [0, -1.45, 0.5], [1.5, 0, 0], 5), cone(0.12, 0.6, CLAW, [0.25, -1.45, 0.45], [1.5, 0, 0], 5)],
    });
    const bands = [];
    for (let i = 0; i < 6; i++) bands.push(tor(2.4 - Math.abs(i - 2.5) * 0.16, 0.2, BAND, [0, 0.25, -2.1 + i * 0.84], [0, 0, 0], Math.PI));
    const ballParts = [sph(BALL_R, SHELL, [0, 0, 0])];
    for (let i = 0; i < 4; i++) ballParts.push(tor(BALL_R + 0.02, 0.24, BAND, [0, 0, 0], [0, (i / 4) * Math.PI, 0]));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU, b = (i % 2 ? 0.5 : -0.5);
      const n = new THREE.Vector3(Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b));
      const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n));
      ballParts.push(cone(0.32, 0.9, PAL.bone, [n.x * (BALL_R + 0.3), n.y * (BALL_R + 0.3), n.z * (BALL_R + 0.3)], [e.x, e.y, e.z], 6));
    }
    this.rig = buildRig([
      { name: 'walker', parts: [] },
      { name: 'body', parent: 'walker', at: [0, 2.5, 0], parts: [
        sph(2.6, SHELL, [0, 0.35, 0], [1, 0.85, 1.3]),
        sph(2.2, SKIN, [0, -0.45, 0.1], [0.95, 0.55, 1.2]),
        ...bands,
        hemi(1.4, SHELL, [0, 0.4, 2.6], [0.6, 0, 0], [1, 0.7, 1]),
        hemi(1.5, SHELL, [0, 0.3, -2.7], [-0.6, 0, 0], [1, 0.7, 1]),
      ] },
      { name: 'head', parent: 'body', at: [0, 0.2, 3.2], parts: [
        sph(1.05, SKIN, [0, 0, 0], [1, 0.9, 1.1]),
        hemi(1.1, SHELL, [0, 0.15, -0.05], [0, 0, 0], [1, 0.6, 1.1]),
        cone(0.62, 2.0, SKIN, [0, -0.35, 1.45], [Math.PI / 2, 0, 0], 10),
        sph(0.27, PAL.ink, [0, -0.35, 2.45]),
        cone(0.45, 1.3, SKIN, [-0.65, 1.0, -0.3], [-0.3, 0, 0.45], 8), cone(0.45, 1.3, SKIN, [0.65, 1.0, -0.3], [-0.3, 0, -0.45], 8),
        sph(0.3, '#ffffff', [-0.55, 0.25, 0.75], [1, 1, 0.6]), sph(0.3, '#ffffff', [0.55, 0.25, 0.75], [1, 1, 0.6]),
        sph(0.17, PAL.danger, [-0.57, 0.24, 0.92], 1, 3), sph(0.17, PAL.danger, [0.57, 0.24, 0.92], 1, 3),
        box(0.7, 0.14, 0.2, PAL.ink, [-0.5, 0.6, 0.8], [0, 0, -0.4]), box(0.7, 0.14, 0.2, PAL.ink, [0.5, 0.6, 0.8], [0, 0, 0.4]),
        tor(0.33, 0.05, PAL.ink, [-0.55, 0.25, 0.95]), tor(0.33, 0.05, PAL.ink, [0.55, 0.25, 0.95]),
      ] },
      { name: 'tail', parent: 'body', at: [0, -0.4, -3.4], parts: [cone(0.6, 2.6, SHELL, [0, 0, -1.2], [-Math.PI / 2, 0, 0], 10), tor(0.45, 0.1, BAND, [0, 0, -0.6]), tor(0.32, 0.1, BAND, [0, 0, -1.3])] },
      leg('legFL', -1.6, 1.8), leg('legFR', 1.6, 1.8), leg('legBL', -1.7, -1.7), leg('legBR', 1.7, -1.7),
      { name: 'ball', at: [0, BALL_R, 0], parts: ballParts },
    ], 0.08);
    this.rig.pivots.ball.visible = false;
    this.spikeGlow = this.glowOrb(this.rig.root, [0, BALL_R, 0], BALL_R + 0.25, PAL.danger, 1.6);
    (this.spikeGlow.material as THREE.MeshBasicMaterial).transparent = true;
    (this.spikeGlow.material as THREE.MeshBasicMaterial).opacity = 0.45;
  }

  private setBall(on: boolean) {
    this.rig.pivots.ball.visible = on;
    this.rig.pivots.walker.visible = !on;
  }

  private resetPose() {
    const P = this.rig.pivots;
    P.body.position.set(0, 2.5, 0);
    P.body.rotation.set(0, 0, 0);
    P.head.rotation.set(0, 0, 0);
    P.tail.rotation.set(0, 0, 0);
    for (const l of ['legFL', 'legFR', 'legBL', 'legBR']) P[l].rotation.set(0, 0, 0);
    P.walker.scale.setScalar(1);
    this.spikeGlow.visible = false;
  }

  think(dt: number) {
    const g = this.game;
    const P = this.rig.pivots;
    const t = this.phaseT;
    const enr = this.enraged;
    const dist = this.toHero().length();
    this.resetPose();
    this.swipeCd -= dt;
    this.invulnerable = this.phase === 'curl' || this.phase === 'shell' || this.phase === 'shellBounce' || this.phase === 'spikeTele';
    this.bonus = this.phase === 'dizzy' ? 1.5 : 1;

    switch (this.phase) {
      case 'idle':
        this.faceHero(dt, 4);
        if (t > 0.6) this.setPhase('walk');
        break;
      case 'walk': {
        this.setBall(false);
        this.faceHero(dt, 3);
        this.walkT += dt;
        this.walkTo(this.hero.pos, enr ? 6 : 4.5);
        const s = Math.sin(t * 9);
        P.legFL.rotation.x = s * 0.5; P.legBR.rotation.x = s * 0.5;
        P.legFR.rotation.x = -s * 0.5; P.legBL.rotation.x = -s * 0.5;
        P.body.position.y = 2.5 + Math.abs(s) * 0.12;
        P.tail.rotation.y = Math.sin(t * 4) * 0.3;
        P.head.rotation.y = Math.sin(t * 2.3) * 0.2;
        if (dist < SWIPE_LEN && this.swipeCd <= 0) this.setPhase('swipeTele');
        else if (this.walkT > (enr ? 2.6 : 4)) this.setPhase('curl');
        break;
      }
      case 'swipeTele': {
        const D = enr ? 0.6 : 0.7;
        if (t < dt * 1.5) {
          this.faceHero(1, 1);
          g.fx.telegraphRect(this.pos, rectAngle(dirOf(this.facing)), SWIPE_LEN + 1, SWIPE_W, D);
          audio.play('telegraph');
        }
        this.vel.multiplyScalar(0.7);
        const k = easeOut(t / D);
        P.body.rotation.x = -0.5 * k;
        P.body.position.y = 2.5 + 0.8 * k;
        P.legFL.rotation.set(-2.2 * k, 0, 0.5 * k);
        P.legFR.rotation.set(-2.2 * k, 0, -0.5 * k);
        if (t > D) {
          this.swipe();
          this.setPhase('swipeRecover');
        }
        break;
      }
      case 'swipeRecover': {
        const k = clamp01(t / 0.2);
        P.body.rotation.x = 0.35 * k;
        P.legFL.rotation.set(0.8 * k, 0, 0); P.legFR.rotation.set(0.8 * k, 0, 0);
        P.head.rotation.x = 0.3 * k;
        if (t > (enr ? 0.45 : 0.65)) this.setPhase(this.walkT > 2 && Math.random() < 0.4 ? 'curl' : 'walk');
        break;
      }
      case 'curl': {
        const D = 0.85;
        if (t < dt * 1.5) {
          this.faceHero(1, 1);
          dirOf(this.facing, this.rollDir);
          this.showPath(D);
          this.rollT = 0;
          this.walkT = 0;
          this.bounces = 0;
          audio.play('shellRoll');
          audio.play('telegraph');
        }
        this.vel.set(0, 0, 0);
        const k = clamp01(t / 0.35);
        if (t < 0.35) {
          P.walker.scale.set(1 - 0.3 * k, 1 - 0.4 * k, 1 - 0.5 * k);
          P.head.rotation.x = 1.2 * k;
          P.tail.rotation.x = -1.2 * k;
        } else {
          this.setBall(true);
          this.ballSpin -= dt * 14 * clamp01((t - 0.35) / 0.5);
          P.ball.rotation.set(this.ballSpin, 0, 0);
          if (Math.random() < 0.6) g.fx.burst(this.pos.clone().addScaledVector(this.rollDir, -2).setY(0.3), PAL.reward, 2, 7, { size: 0.25, life: 0.25 });
        }
        if (t > D) this.setPhase('shell');
        break;
      }
      case 'shell': {
        this.setBall(true);
        const sp = enr ? 31 : 25;
        this.rollT += dt;
        this.vel.copy(this.rollDir).multiplyScalar(sp);
        this.facing = angleOf(this.rollDir);
        this.ballSpin += sp / BALL_R * dt;
        P.ball.rotation.set(this.ballSpin, 0, 0);
        const back = this.pos.clone().addScaledVector(this.rollDir, -BALL_R * 0.8).setY(0.2);
        g.fx.burst(back, PAL.reward, 2, 9, { size: 0.22, life: 0.3, up: 0.9 });
        if (Math.random() < 0.5) g.fx.burst(back, PAL.danger, 1, 6, { size: 0.3, life: 0.35 });
        if (Math.random() < 0.15) audio.play('shellRoll', { volume: 0.4 });
        this.contactDamage(true);
        this.hitEnemiesIn(this.pos, this.radius + 0.4, 35, 20, 9, this.sweepTag());
        const outward = this.rollDir.x * this.pos.x + this.rollDir.z * this.pos.z > 0;
        if (outward && this.nearEdge(0.6)) {
          g.shake(0.5, 0.35, 4);
          g.fx.ring(this.pos, PAL.bone, 1, 6, 0.3, 1.5);
          g.fx.burst(this.pos.clone().setY(1), PAL.reward, 20, 16, { size: 0.3, life: 0.4 });
          audio.play('block', { pitch: 0.5 });
          audio.play('bossLand', { volume: 0.5 });
          this.vel.set(0, 0, 0);
          if (this.rollT >= ROLL_TIME) { this.setPhase(enr ? 'spikeTele' : 'uncurl'); break; }
          const v = this.rollDir.clone();
          this.bounceEdge(v, 0.6);
          if (v.x * this.pos.x + v.z * this.pos.z > 0) v.set(-this.pos.x, 0, -this.pos.z);
          this.rollDir.copy(v.normalize().lerp(this.toHero().normalize(), 0.4).normalize());
          this.bounces++;
          this.setPhase('shellBounce');
        } else if (this.rollT >= ROLL_TIME + 1.2) {
          this.vel.set(0, 0, 0);
          this.setPhase(enr ? 'spikeTele' : 'uncurl');
        }
        break;
      }
      case 'shellBounce': {
        const D = 0.6;
        this.setBall(true);
        if (t < dt * 1.5) { this.showPath(D); audio.play('telegraph', { volume: 0.7 }); this.squash = 0.5; }
        this.vel.set(0, 0, 0);
        this.facing = angleOf(this.rollDir);
        this.ballSpin += dt * 12;
        P.ball.rotation.set(this.ballSpin, 0, 0);
        P.ball.position.y = BALL_R + Math.sin(clamp01(t / D) * Math.PI) * 0.9;
        if (t > D) { P.ball.position.y = BALL_R; this.setPhase('shell'); }
        break;
      }
      case 'spikeTele': {
        const D = 0.75;
        this.setBall(true);
        if (t < dt * 1.5) {
          g.fx.telegraphCircle(this.pos, 6, D);
          audio.play('telegraph');
          audio.play('hiss', { pitch: 1.4 });
        }
        this.vel.set(0, 0, 0);
        this.ballSpin += dt * (6 + 20 * t);
        P.ball.rotation.set(0, this.ballSpin, 0);
        this.spikeGlow.visible = Math.floor(t * 16) % 2 === 0;
        this.spikeGlow.scale.setScalar(0.9 + 0.15 * (t / D));
        if (t > D) {
          const from = this.pos.clone().setY(1.5);
          const n = 14;
          const off = Math.random() * TAU;
          for (let i = 0; i < n; i++) {
            const a = off + (i / n) * TAU;
            g.projectiles.enemyShot('orb', from.clone().add(new THREE.Vector3(Math.sin(a) * 2.5, 0, Math.cos(a) * 2.5)), new THREE.Vector3(Math.sin(a) * 13, 0, Math.cos(a) * 13), 1, { life: 2.4, radius: 0.6 });
          }
          g.fx.ring(this.pos, PAL.danger, 1, 9, 0.35, 3);
          g.shake(0.45, 0.3, 4);
          audio.play('explosion', { volume: 0.5, pitch: 1.6 });
          this.setPhase('uncurl');
        }
        break;
      }
      case 'uncurl': {
        this.vel.set(0, 0, 0);
        P.ball.rotation.x *= 0.8;
        if (t > 0.3) {
          this.setBall(false);
          const k = clamp01((t - 0.3) / 0.25);
          P.walker.scale.set(0.7 + 0.3 * k, 0.6 + 0.4 * k, 0.5 + 0.5 * k);
        }
        if (t > 0.55) { this.ballSpin = 0; P.ball.rotation.set(0, 0, 0); this.setPhase('dizzy'); }
        break;
      }
      case 'dizzy':
        this.setBall(false);
        this.vel.multiplyScalar(0.6);
        P.head.rotation.set(0.4, 0, Math.sin(t * 8) * 0.35);
        P.body.rotation.z = Math.sin(t * 8) * 0.08;
        P.body.position.y = 2.2;
        P.tail.rotation.x = 0.5;
        this.stars(this.height + 0.3);
        if (t < dt * 1.5) g.overlay.pop('SONNÉ ×1.5', this.pos.clone().setY(this.height + 2), 'big');
        if (t > 2) { this.swipeCd = 0.8; this.setPhase('walk'); }
        break;
    }
  }

  private showPath(D: number) {
    const len = this.edgeDist(this.pos, this.rollDir, 0.6) + this.radius;
    this.game.fx.telegraphRect(this.pos, rectAngle(this.rollDir), Math.max(4, len), this.radius * 2, D);
  }

  private swipe() {
    const g = this.game;
    const f = dirOf(this.facing);
    const right = new THREE.Vector3(f.z, 0, -f.x);
    const h = this.hero;
    const d = h.pos.clone().sub(this.pos).setY(0);
    const along = d.dot(f), side = d.dot(right);
    if (along > -1 && along < SWIPE_LEN + h.radius + 1 && Math.abs(side) < SWIPE_W / 2 + h.radius && h.y < 2) h.hurt(this.pos);
    const c = this.pos.clone().addScaledVector(f, SWIPE_LEN * 0.5);
    this.hitEnemiesIn(c, SWIPE_LEN * 0.5, 30, 16, 6);
    g.fx.slash(this.pos.clone().addScaledVector(f, 1.5), this.facing - Math.PI / 2, PAL.danger, 1.7, 0.16, 1, 1.4);
    g.fx.slash(this.pos.clone().addScaledVector(f, 1.5), this.facing - Math.PI / 2, PAL.bone, 1.4, 0.2, -1, 1.0);
    g.shake(0.35, 0.25, 4);
    audio.play('swingHeavy', { pitch: 0.6 });
    audio.play('smash', { pitch: 1.2, volume: 0.5 });
    this.swipeCd = enrCd(this.enraged);
  }
}

const enrCd = (enr: boolean) => (enr ? 1.4 : 2);
