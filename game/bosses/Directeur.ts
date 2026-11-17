import * as THREE from 'three';
import type { Game } from '../Game';
import { Boss } from './Boss';
import { box, buildRig, cap, cone, cyl, hemi, Rig, sph, tor } from '../models/builder';
import { PAL } from '../palette';
import type { Telegraph } from '../core/Fx';
import { audio } from '../audio/audio';

const SUIT = '#3a4258';
const SKIN = '#e0c9b0';

// Le Directeur: charges in straight lines (telegraphed rectangle), slams with his megaphone
// (telegraphed circle, jump over it), summons supervisors. Phase 2 (< 50%): double charge, summons CPE.
export class Directeur extends Boss {
  rig: Rig;
  private tele: Telegraph | null = null;
  private chargeDir = new THREE.Vector3();
  private chargeLeft = 0;
  private cycle = 0;
  private charges = 0;

  constructor(game: Game) {
    super(game, 'directeur');
    this.radius = 2.4;
    this.height = 7;
    this.rig = buildRig([
      { name: 'hips', at: [0, 1.5, 0], parts: [cap(0.32, 0.9, '#222634', [-0.5, -0.6, 0]), cap(0.32, 0.9, '#222634', [0.5, -0.6, 0]), box(0.7, 0.3, 1.0, '#111111', [-0.5, -1.35, 0.15]), box(0.7, 0.3, 1.0, '#111111', [0.5, -1.35, 0.15])] },
      { name: 'torso', parent: 'hips', parts: [
        sph(1.7, SUIT, [0, 1.7, 0], [1, 1.1, 0.85]),
        cone(0.5, 1.2, '#f2efe6', [0, 2.6, 1.2], [Math.PI, 0, 0], 3),
        box(0.35, 1.6, 0.1, PAL.danger, [0, 2.0, 1.45], [0.15, 0, 0], 0.6),
        box(0.5, 0.3, 0.08, '#d4a017', [-0.8, 2.4, 1.3]),
      ] },
      { name: 'head', parent: 'torso', at: [0, 3.9, 0.1], parts: [
        sph(1.15, SKIN, [0, 0, 0], [1, 1.05, 0.95]),
        sph(0.35, '#555555', [-1.0, 0.1, -0.1], [0.6, 1.3, 1.2]), sph(0.35, '#555555', [1.0, 0.1, -0.1], [0.6, 1.3, 1.2]),
        box(1.6, 0.08, 0.6, '#555555', [0.1, 1.05, 0.1], [0.1, 0, 0.15]),
        sph(0.34, '#ffffff', [-0.42, 0.15, 0.9], [1, 0.9, 0.5]), sph(0.34, '#ffffff', [0.42, 0.15, 0.9], [1, 0.9, 0.5]),
        sph(0.11, PAL.danger, [-0.42, 0.15, 1.08], 1, 3), sph(0.11, PAL.danger, [0.42, 0.15, 1.08], 1, 3),
        box(0.85, 0.65, 0.08, PAL.ink, [-0.42, 0.15, 1.1]), box(0.85, 0.65, 0.08, PAL.ink, [0.42, 0.15, 1.1]),
        box(0.62, 0.45, 0.1, '#ffffff', [-0.42, 0.15, 1.12]), box(0.62, 0.45, 0.1, '#ffffff', [0.42, 0.15, 1.12]),
        sph(0.1, PAL.danger, [-0.42, 0.15, 1.2], 1, 3), sph(0.1, PAL.danger, [0.42, 0.15, 1.2], 1, 3),
        box(0.6, 0.12, 0.08, PAL.ink, [-0.45, 0.62, 1.05], [0, 0, -0.4]), box(0.6, 0.12, 0.08, PAL.ink, [0.45, 0.62, 1.05], [0, 0, 0.4]),
        sph(0.45, PAL.ink, [0, -0.55, 0.85], [1.3, 0.55, 0.5]),
        box(0.7, 0.12, 0.08, '#ffffff', [0, -0.42, 1.05]),
      ] },
      { name: 'armL', parent: 'torso', at: [-1.6, 2.6, 0], parts: [cap(0.3, 1.2, SUIT, [0, -0.8, 0]), sph(0.38, SKIN, [0, -1.7, 0])] },
      { name: 'armR', parent: 'torso', at: [1.6, 2.6, 0], parts: [cap(0.3, 1.2, SUIT, [0, -0.8, 0]), sph(0.38, SKIN, [0, -1.7, 0])] },
      { name: 'mega', parent: 'armR', at: [0, -1.8, 0.3], parts: [cone(0.9, 1.8, '#e8e2d0', [0, 0, 1.0], [-Math.PI / 2, 0, 0], 14), tor(0.9, 0.08, PAL.danger, [0, 0, 1.9], [0, 0, 0], Math.PI * 2, 1.5), cyl(0.15, 0.15, 0.6, '#444', [0, -0.3, 0.4])] },
    ], 0.08);
    this.rig.root.scale.setScalar(1);
  }

  think(dt: number) {
    const g = this.game;
    const P = this.rig.pivots;
    const enraged = this.hp < this.maxHp * 0.5;
    const toHero = this.toHero();
    const dist = toHero.length();
    const t = this.phaseT;
    P.armR.rotation.set(0, 0, 0);
    P.armL.rotation.set(0, 0, 0);
    P.head.rotation.set(0, 0, 0);
    P.hips.position.y = 1.5;

    switch (this.phase) {
      case 'idle':
        this.faceHero(dt, 5);
        P.hips.position.y = 1.5 + Math.sin(t * 6) * 0.05;
        if (t > (enraged ? 0.4 : 0.8)) {
          this.cycle++;
          if (this.cycle % 4 === 0) this.setPhase('summon');
          else if (dist > 9 || Math.random() < 0.55) this.setPhase('chargeTele');
          else this.setPhase('slamTele');
        }
        break;
      case 'walk': {
        this.faceHero(dt, 4);
        const d = toHero.normalize();
        this.vel.lerp(d.multiplyScalar(6), 0.1);
        const s = Math.sin(t * 8);
        P.armL.rotation.x = s * 0.5; P.armR.rotation.x = -s * 0.5;
        if (t > 1.6) this.setPhase('idle');
        break;
      }
      case 'chargeTele':
        if (t < dt * 1.5) {
          this.faceHero(1, 1);
          this.chargeDir.set(Math.sin(this.facing), 0, Math.cos(this.facing));
          const len = Math.min(34, g.arenaRadius * 2);
          this.tele = g.fx.telegraphRect(this.pos, Math.atan2(this.chargeDir.z, this.chargeDir.x), len, 4.6, enraged ? 0.65 : 0.9);
          this.chargeLeft = len;
          audio.play('telegraph');
          audio.play('bossCharge');
        }
        P.armR.rotation.x = -2.6;
        P.hips.position.y = 1.3;
        this.squash = 0.15;
        if (t > (enraged ? 0.65 : 0.9)) this.setPhase('charge');
        break;
      case 'charge': {
        const sp = enraged ? 36 : 30;
        this.vel.copy(this.chargeDir).multiplyScalar(sp);
        this.chargeLeft -= sp * dt;
        const s = Math.sin(t * 22);
        P.armL.rotation.x = s * 0.9; P.armR.rotation.x = -s * 0.9;
        P.hips.rotation.x = 0.3;
        if (Math.random() < 0.6) g.fx.burst(this.pos.clone().setY(0.5), PAL.bone, 2, 6, { size: 0.5, life: 0.4 });
        this.contactDamage(true);
        for (const e of g.enemies.list) if (e.alive && e.pos.distanceTo(this.pos) < this.radius + e.radius) g.enemies.hit(e, { dmg: 30, dir: this.chargeDir.clone(), kb: 18, launch: 9, tag: -500000 - Math.floor(g.time), quiet: true, breaksGuard: true });
        const r = Math.hypot(this.pos.x, this.pos.z);
        if (this.chargeLeft <= 0 || r > g.arenaRadius - this.radius - 0.5) {
          this.vel.set(0, 0, 0);
          P.hips.rotation.x = 0;
          g.shake(0.5, 0.3, 4);
          g.fx.ring(this.pos, PAL.bone, 1, 6, 0.35, 1.5);
          audio.play('bossLand', { volume: 0.7 });
          if (enraged && this.charges === 0) { this.charges = 1; this.setPhase('chargeTele'); }
          else { this.charges = 0; this.setPhase('stunned'); }
        }
        break;
      }
      case 'stunned':
        P.head.rotation.z = Math.sin(t * 10) * 0.25;
        P.hips.rotation.x = 0;
        if (Math.random() < 0.15) g.fx.burst(this.pos.clone().setY(this.height + 0.5), PAL.reward, 1, 3, { size: 0.35, life: 0.5, grav: 0 });
        if (t > (enraged ? 1.0 : 1.5)) this.setPhase(Math.random() < 0.5 ? 'walk' : 'idle');
        break;
      case 'slamTele':
        if (t < dt * 1.5) {
          this.tele = g.fx.telegraphCircle(this.pos, 7.5, 0.85);
          audio.play('telegraph');
        }
        P.armR.rotation.x = -Math.PI * (t / 0.85);
        P.armL.rotation.x = -Math.PI * (t / 0.85);
        P.hips.position.y = 1.5 + t * 1.5;
        if (t > 0.85) {
          g.fx.ring(this.pos, PAL.danger, 1, 8, 0.4, 2.5);
          g.fx.ring(this.pos, PAL.bone, 1, 6, 0.3, 1.5);
          g.fx.splat(this.pos, 7, PAL.void3);
          g.shake(0.7, 0.4, 6);
          audio.play('smash', { pitch: 0.6 });
          const h = this.hero;
          if (h.pos.distanceTo(this.pos) < 7.5 + h.radius && h.y < 1.2) h.hurt(this.pos);
          for (const e of g.enemies.list) if (e.alive && e.pos.distanceTo(this.pos) < 7.5) g.enemies.hit(e, { dmg: 20, dir: e.pos.clone().sub(this.pos).setY(0).normalize(), kb: 14, launch: 10, tag: -600000 - Math.floor(g.time * 10), quiet: true, breaksGuard: true });
          this.setPhase('recover');
        }
        break;
      case 'recover':
        P.armR.rotation.x = -0.6;
        P.armL.rotation.x = -0.6;
        this.squash = 0.2;
        if (t > 0.8) this.setPhase('walk');
        break;
      case 'summon':
        P.armR.rotation.x = -1.5;
        if (t < dt * 1.5) {
          audio.play('bossRoar');
          this.taunt();
          const n = enraged ? 3 : 4;
          for (let i = 0; i < n; i++) {
            const a = this.facing + (i - (n - 1) / 2) * 0.6;
            const p = this.pos.clone().add(new THREE.Vector3(Math.sin(a) * 5, 0, Math.cos(a) * 5));
            g.enemies.spawn(enraged && i === 0 ? 'cpe' : 'surveillant', p, 'drop');
          }
          for (let i = 0; i < 3; i++) g.fx.ring(this.pos.clone().add(new THREE.Vector3(Math.sin(this.facing) * 3, 0, Math.cos(this.facing) * 3)), PAL.danger, 0.5, 4 + i * 3, 0.4 + i * 0.15, 2, 4.5);
        }
        if (t > 1.3) this.setPhase('walk');
        break;
    }
  }
}
