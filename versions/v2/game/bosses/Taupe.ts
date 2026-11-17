import * as THREE from 'three';
import type { Game } from '../Game';
import { ArenaBoss, clamp01, easeOut } from './kit';
import { box, buildRig, cap, cone, cyl, hemi, ico, Rig, sph, tor } from '../models/builder';
import { PAL } from '../palette';
import { audio } from '../audio/audio';

const FUR = '#3d3646';
const FUR2 = '#5a5163';
const PINK = '#f29bb0';
const HELMET = '#e8b923';
const DIRT = '#5b3a24';
const DIRT2 = '#7a5236';

const DEPTH = 8.5;
const ERUPT_R = 4.4;
const LAVA_AOE = 2.6;
const LAVA_T = 1.0;
const LAVA_G = 30;

// La Taupe: miner mole of the volcano. Burrows (invulnerable, only a dirt mound moves), erupts
// under a telegraphed circle, then surfaces to lob lava arcs. Phase 2: double eruption, triple lava.
export class Taupe extends ArenaBoss {
  rig: Rig;
  private target = new THREE.Vector3();
  private moundFrom = new THREE.Vector3();
  private erupts = 0;
  private throws = 0;
  private digCd = 0;
  private lava: THREE.Mesh;

  constructor(game: Game) {
    super(game, 'taupe');
    this.radius = 2.8;
    this.height = 7.5;
    const hand = (side: number) => {
      const parts = [cap(0.45, 1.0, FUR, [0, -0.6, 0]), sph(0.95, PINK, [0, -1.6, 0.25], [1.25, 0.5, 1.15])];
      for (let i = 0; i < 5; i++) parts.push(cone(0.13, 0.75, PAL.bone, [(i - 2) * 0.32 * side, -1.75, 1.25], [1.45, 0, 0], 5));
      return parts;
    };
    const star = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      star.push(cap(0.09, 0.35, PINK, [Math.cos(a) * 0.35, -0.3 + Math.sin(a) * 0.35, 2.25], [0, 0, a + Math.PI / 2]));
    }
    this.rig = buildRig([
      { name: 'legL', at: [-1.0, 1.0, 0.2], parts: [cap(0.5, 0.6, FUR, [0, -0.4, 0]), sph(0.6, PINK, [0, -0.85, 0.45], [1, 0.45, 1.4])] },
      { name: 'legR', at: [1.0, 1.0, 0.2], parts: [cap(0.5, 0.6, FUR, [0, -0.4, 0]), sph(0.6, PINK, [0, -0.85, 0.45], [1, 0.45, 1.4])] },
      { name: 'body', at: [0, 2.6, 0], parts: [
        sph(2.4, FUR, [0, 0.4, 0], [1, 1.2, 0.95]),
        sph(1.8, FUR2, [0, 0.1, 0.9], [1, 1.1, 0.6]),
        box(3.2, 0.35, 2.6, '#6b4a2a', [0, -0.9, 0.05]),
        box(0.6, 0.45, 0.2, HELMET, [0, -0.9, 1.35]),
      ] },
      { name: 'head', parent: 'body', at: [0, 3.0, 0.3], parts: [
        sph(1.6, FUR, [0, 0, 0], [1, 0.95, 1.05]),
        cone(0.75, 1.6, FUR2, [0, -0.3, 1.4], [Math.PI / 2, 0, 0], 12),
        sph(0.42, PINK, [0, -0.3, 2.2]),
        ...star,
        box(0.28, 0.4, 0.12, '#ffffff', [-0.15, -0.95, 1.6]), box(0.28, 0.4, 0.12, '#ffffff', [0.15, -0.95, 1.6]),
        sph(0.3, PAL.danger, [-0.62, 0.3, 1.25], [1.2, 0.55, 0.6], 3.2), sph(0.3, PAL.danger, [0.62, 0.3, 1.25], [1.2, 0.55, 0.6], 3.2),
        box(0.8, 0.16, 0.2, PAL.ink, [-0.6, 0.55, 1.3], [0, 0, -0.35]), box(0.8, 0.16, 0.2, PAL.ink, [0.6, 0.55, 1.3], [0, 0, 0.35]),
        hemi(1.7, HELMET, [0, 0.45, -0.05], [0, 0, 0], [1, 0.85, 1.05]),
        cyl(1.9, 1.9, 0.12, HELMET, [0, 0.45, 0.1], [0.08, 0, 0], 20),
        cyl(0.42, 0.42, 0.5, '#555555', [0, 1.2, 1.35], [Math.PI / 2 - 0.3, 0, 0]),
        sph(0.36, '#fffbe0', [0, 1.28, 1.62], [1, 1, 0.5], 2.5),
        tor(1.68, 0.08, '#b88a10', [0, 0.65, 0], [Math.PI / 2, 0, 0]),
      ] },
      { name: 'armL', parent: 'body', at: [-2.1, 1.2, 0.5], parts: hand(-1) },
      { name: 'armR', parent: 'body', at: [2.1, 1.2, 0.5], parts: hand(1) },
      { name: 'mound', parts: [
        hemi(2.7, DIRT, [0, -0.2, 0], [0, 0, 0], [1, 0.6, 1]),
        ico(0.7, DIRT2, [1.4, 0.6, 0.6], [0.3, 0.5, 0]), ico(0.55, DIRT2, [-1.2, 0.5, -0.9], [0.8, 0.1, 0.4]), ico(0.5, '#3a2416', [0.2, 1.2, -0.3], [0.2, 0.9, 0.1]),
        ico(0.45, PAL.danger, [0, 1.45, 0.4], [0, 0, 0], 1),
      ] },
    ], 0.08);
    this.rig.pivots.mound.visible = false;
    this.lava = this.glowOrb(this.rig.pivots.armR, [0, -2.2, 0.6], 0.8);
  }

  reachable() { return this.y > -1.5 && this.y < 3.5 && this.phase !== 'burrow' && this.phase !== 'eruptTele'; }

  protected contactDamage(hurts = false) {
    if (this.y < -1.5) return;
    super.contactDamage(hurts);
  }

  private resetPose() {
    const P = this.rig.pivots;
    P.body.position.set(0, 2.6, 0);
    P.body.rotation.set(0, 0, 0);
    P.head.rotation.set(0, 0, 0);
    P.armL.rotation.set(0, 0, 0.25);
    P.armR.rotation.set(0, 0, -0.25);
    P.legL.rotation.set(0, 0, 0);
    P.legR.rotation.set(0, 0, 0);
    P.mound.visible = false;
    this.lava.visible = false;
  }

  private showMound(scale = 1) {
    const P = this.rig.pivots;
    P.mound.visible = true;
    P.mound.position.y = -this.y;
    P.mound.rotation.y = -this.facing + this.game.time * 0.5;
    P.mound.scale.set(scale, scale * (0.85 + Math.sin(this.game.time * 30) * 0.15), scale);
  }

  private digFx(n = 2) {
    const g = this.game;
    if (Math.random() < 0.3) g.fx.debris(this.pos.clone().setY(0.5), [DIRT, DIRT2, '#2a1a10'], n, 9, 0.45);
    this.digCd -= 1;
    if (this.digCd <= 0) { this.digCd = 18; audio.play('dig', { volume: 0.7 }); }
  }

  think(dt: number) {
    const g = this.game;
    const P = this.rig.pivots;
    const t = this.phaseT;
    const enr = this.enraged;
    this.resetPose();
    this.invulnerable = this.phase === 'burrow' || this.phase === 'eruptTele' || (this.phase === 'dig' && t > 0.35);

    switch (this.phase) {
      case 'idle':
        this.faceHero(dt, 4);
        P.head.rotation.x = Math.sin(t * 6) * 0.1;
        if (t > 0.8) { this.throws = 0; this.setPhase('surface'); }
        break;
      case 'surface': {
        this.y = 0;
        this.faceHero(dt, 5);
        const dist = this.toHero().length();
        P.body.position.y = 2.6 + Math.sin(t * 5) * 0.08;
        P.head.rotation.y = Math.sin(t * 3) * 0.25;
        P.armL.rotation.x = Math.sin(t * 5) * 0.2;
        if (t > (enr ? 0.5 : 0.8)) {
          if (this.throws >= (enr ? 4 : 3) || (dist < 5 && this.throws > 0)) { this.erupts = 0; this.setPhase('dig'); }
          else this.setPhase('throwTele');
        }
        break;
      }
      case 'throwTele': {
        const D = enr ? 0.6 : 0.75;
        this.faceHero(dt, 8);
        if (t < dt * 1.5) audio.play('telegraph', { volume: 0.6 });
        const k = easeOut(t / D);
        P.armR.rotation.set(-2.6 * k, 0, -0.25 - 0.3 * k);
        P.body.rotation.y = -0.4 * k;
        P.body.rotation.x = -0.15 * k;
        this.lava.visible = true;
        this.lava.scale.setScalar(0.3 + 0.8 * k + Math.sin(t * 50) * 0.06);
        if (Math.random() < 0.5) {
          const w = new THREE.Vector3();
          this.lava.getWorldPosition(w);
          g.fx.burst(w, PAL.danger, 1, 3, { size: 0.3, life: 0.3, grav: -4 });
        }
        if (t > D) {
          this.throwLava();
          this.setPhase('throwRecover');
        }
        break;
      }
      case 'throwRecover': {
        const k = clamp01(t / 0.15);
        P.armR.rotation.set(-2.6 + 3.4 * k, 0, -0.25);
        P.body.rotation.y = 0.3 * k;
        P.body.rotation.x = 0.2 * k;
        if (t > (enr ? 0.35 : 0.5)) this.setPhase('surface');
        break;
      }
      case 'dig': {
        const D = enr ? 0.6 : 0.85;
        if (t < dt * 1.5) { audio.play('dig'); g.fx.splat(this.pos, 6, '#2a1a10'); this.vel.set(0, 0, 0); }
        const k = clamp01(t / D);
        this.y = -DEPTH * k * k;
        P.armL.rotation.set(-2.8 + Math.sin(t * 40) * 0.5, 0, 0.2);
        P.armR.rotation.set(-2.8 - Math.sin(t * 40) * 0.5, 0, -0.2);
        P.body.rotation.x = 0.4;
        this.digFx(3);
        this.showMound(k);
        if (t > D) { this.y = -DEPTH; this.setPhase('burrow'); }
        break;
      }
      case 'burrow': {
        this.y = -DEPTH;
        this.faceHero(dt, 3);
        this.walkTo(this.hero.pos, enr ? 16 : 13, 0.15);
        this.showMound(1);
        this.digFx(1);
        if (Math.random() < 0.3) g.fx.burst(this.pos.clone().setY(0.4), PAL.danger, 1, 4, { size: 0.3, life: 0.4 });
        const dur = this.erupts > 0 ? 0.5 : enr ? 1.2 : 1.7;
        if (t > dur) this.setPhase('eruptTele');
        break;
      }
      case 'eruptTele': {
        const D = enr ? 0.75 : 0.9;
        this.y = -DEPTH;
        if (t < dt * 1.5) {
          this.target.copy(this.hero.pos);
          this.inArena(this.target, 3);
          this.moundFrom.copy(this.pos);
          g.fx.telegraphCircle(this.target, ERUPT_R, D);
          audio.play('telegraph');
          audio.play('dig', { pitch: 0.7 });
          g.shake(0.3, 0, 0);
        }
        this.vel.set(0, 0, 0);
        this.pos.lerpVectors(this.moundFrom, this.target, easeOut(t / 0.35));
        this.showMound(1 + 0.35 * clamp01(t / D));
        this.digFx(2);
        if (t > D) {
          this.pos.copy(this.target);
          this.erupt();
          this.setPhase('erupt');
        }
        break;
      }
      case 'erupt': {
        this.vy -= 70 * dt;
        this.y += this.vy * dt;
        P.armL.rotation.set(-2.9, 0, 0.6);
        P.armR.rotation.set(-2.9, 0, -0.6);
        P.legL.rotation.x = 0.5; P.legR.rotation.x = -0.5;
        if (this.y > -2) P.mound.visible = false;
        else this.showMound(1.3);
        if (this.vy < 0 && this.y <= 0) {
          this.y = 0; this.vy = 0;
          this.squash = 0.5;
          g.fx.ring(this.pos, PAL.bone, 1, 5, 0.3, 1.5);
          audio.play('bossLand', { volume: 0.6 });
          this.erupts++;
          if (enr && this.erupts < 2) this.setPhase('dig');
          else { this.erupts = 0; this.setPhase('recover'); }
        }
        break;
      }
      case 'recover':
        this.y = 0;
        this.vel.multiplyScalar(0.7);
        P.head.rotation.set(0.2, Math.sin(t * 14) * 0.4, 0);
        P.body.rotation.z = Math.sin(t * 14) * 0.08;
        P.armL.rotation.set(0.3, 0, 0.6); P.armR.rotation.set(0.3, 0, -0.6);
        this.stars();
        if (Math.random() < 0.15) g.fx.debris(this.pos.clone().setY(4), [DIRT, DIRT2], 1, 6, 0.3);
        if (t > (enr ? 1.1 : 1.4)) { this.throws = 0; this.setPhase('surface'); }
        break;
    }
  }

  private erupt() {
    const g = this.game;
    this.y = -3;
    this.vy = 30;
    this.invulnerable = false;
    g.fx.ring(this.pos, PAL.danger, 1, ERUPT_R + 2.5, 0.45, 3);
    g.fx.ring(this.pos, PAL.bone, 0.5, ERUPT_R, 0.3, 2);
    g.fx.splat(this.pos, 9, '#2a1a10');
    g.fx.debris(this.pos.clone().setY(0.6), [DIRT, DIRT2, '#2a1a10', PAL.ink], 30, 20, 0.6);
    g.fx.burst(this.pos.clone().setY(1), PAL.danger, 30, 18, { size: 0.5, life: 0.6, up: 1.2 });
    g.shake(0.85, 0.55, 8);
    audio.play('explosion', { pitch: 0.7 });
    audio.play('bossRoar', { volume: 0.6 });
    this.hurtIn(this.pos, ERUPT_R, 3);
    this.hitEnemiesIn(this.pos, ERUPT_R + 1, 35, 14, 14);
  }

  private throwLava() {
    const g = this.game;
    const from = new THREE.Vector3();
    this.lava.getWorldPosition(from);
    const h = this.hero;
    const aim = h.pos.clone().addScaledVector(h.vel, 0.35);
    this.inArena(aim, 1.5);
    const targets = [aim];
    if (this.enraged) {
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2;
        targets.push(this.inArena(aim.clone().add(new THREE.Vector3(Math.sin(a) * 5, 0, Math.cos(a) * 5)), 1.5));
      }
    }
    for (const tg of targets) {
      this.lob('lava', from, tg, LAVA_T, LAVA_G, LAVA_AOE);
      g.fx.telegraphCircle(tg, LAVA_AOE, LAVA_T, 0.05);
    }
    g.fx.burst(from, PAL.danger, 14, 10, { size: 0.4, life: 0.4 });
    audio.play('chalkThrow', { pitch: 0.5 });
    this.throws++;
  }

  addShadows(fx: import('../core/Fx').Fx) { if (this.y > -0.5) super.addShadows(fx); }
}
