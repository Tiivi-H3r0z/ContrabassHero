import * as THREE from 'three';
import type { Game } from '../Game';
import type { BossId } from '../data/dialogues';
import type { EnemyShotKind } from '../entities/Projectiles';
import { Boss, BossHit } from './Boss';
import { PAL } from '../palette';
import { audio } from '../audio/audio';
import { neonMaterial } from '../render/toon';

export const TAU = Math.PI * 2;
export const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
export const easeOut = (k: number) => 1 - Math.pow(1 - clamp01(k), 3);
export const easeIn = (k: number) => clamp01(k) * clamp01(k);
export const wrapAngle = (a: number) => {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
};
// Unit vector on the ground plane for a facing angle (models face +z).
export const dirOf = (facing: number, out = new THREE.Vector3()) => out.set(Math.sin(facing), 0, Math.cos(facing));
export const angleOf = (d: THREE.Vector3) => Math.atan2(d.x, d.z);
// Angle expected by fx.telegraphRect.
export const rectAngle = (d: THREE.Vector3) => Math.atan2(d.z, d.x);

// Shared helpers for the stage 2-7 bosses: phase-2 announcement, bonus-damage windows,
// area damage on hero/minions, projectile fans, arena-edge bounces, dizzy stars.
export abstract class ArenaBoss extends Boss {
  enraged = false;
  bonus = 1;
  protected tagN = 0;

  constructor(game: Game, id: BossId) {
    super(game, id);
  }

  update(dt: number) {
    if (!this.dead && !this.enraged && this.phase !== 'enter' && this.hp > 0 && this.hp < this.maxHp * 0.5) {
      this.enraged = true;
      const g = this.game;
      audio.play('bossRoar');
      audio.play('screech', { pitch: 0.7, volume: 0.6 });
      g.fx.ring(this.pos, PAL.danger, 1, 18, 0.7, 3);
      g.fx.ring(this.pos, PAL.bone, 1, 11, 0.5, 2);
      g.fx.burst(this.pos.clone().setY(this.y + this.height * 0.6), PAL.danger, 40, 22, { size: 0.5, life: 0.6, up: 1 });
      g.shake(0.7, 0.5, 8);
      g.overlay.pop('FURIE !', this.pos.clone().setY(this.y + this.height + 2), 'big');
      this.taunt();
      this.onEnrage();
    }
    super.update(dt);
  }

  protected onEnrage() {}

  takeHit(h: BossHit): boolean {
    if (this.bonus > 1 && !this.invulnerable && !this.dead) h = { ...h, dmg: h.dmg * this.bonus, crit: true };
    return super.takeHit(h);
  }

  protected nextTag() { this.tagN = (this.tagN + 1) % 100000; return -800000 - this.tagN * 3 - this.id.length * 1000000; }

  // Hurt the hero if inside a ground circle (and low enough to be hit). Returns true if hurt.
  protected hurtIn(center: THREE.Vector3, radius: number, maxY = 1.4, from = center) {
    const h = this.hero;
    if (h.dead || h.y > maxY) return false;
    const dx = h.pos.x - center.x, dz = h.pos.z - center.z;
    const rr = radius + h.radius;
    if (dx * dx + dz * dz > rr * rr) return false;
    return h.hurt(from);
  }

  // Tag shared for ~0.5 s: continuous attacks (rolls, dashes) hit each minion at most twice per second.
  protected sweepTag() { return -50000000 - Math.floor(this.game.time * 2); }

  protected hitEnemiesIn(center: THREE.Vector3, radius: number, dmg: number, kb: number, launch = 0, tag = this.nextTag()) {
    const g = this.game;
    for (const e of g.enemies.list) {
      if (!e.alive) continue;
      const d = e.pos.clone().sub(center).setY(0);
      if (d.length() > radius + e.radius) continue;
      if (d.lengthSq() < 0.01) d.set(Math.random() - 0.5, 0, Math.random() - 0.5);
      g.enemies.hit(e, { dmg, dir: d.normalize(), kb, launch: launch || undefined, tag, quiet: true, breaksGuard: true });
    }
  }

  // Fan of straight projectiles around `aim` (facing convention angle).
  protected fan(kind: EnemyShotKind, from: THREE.Vector3, aim: number, count: number, spread: number, speed: number, opts: { grav?: number; life?: number; radius?: number; aoe?: number; vy?: number } = {}) {
    const g = this.game;
    for (let i = 0; i < count; i++) {
      const a = aim + (count > 1 ? (i / (count - 1) - 0.5) * spread : 0);
      const v = new THREE.Vector3(Math.sin(a) * speed, opts.vy ?? 0, Math.cos(a) * speed);
      g.projectiles.enemyShot(kind, from.clone(), v, 1, { grav: opts.grav, life: opts.life ?? 2.2, radius: opts.radius, aoe: opts.aoe });
    }
  }

  // Ballistic shot that lands at `target` (ground) after `T` seconds.
  protected lob(kind: EnemyShotKind, from: THREE.Vector3, target: THREE.Vector3, T: number, grav: number, aoe: number) {
    const v = new THREE.Vector3((target.x - from.x) / T, (0.2 - from.y + 0.5 * grav * T * T) / T, (target.z - from.z) / T);
    this.game.projectiles.enemyShot(kind, from.clone(), v, 1, { grav, life: T + 1, radius: 0.9, aoe });
  }

  // Bounce a ground velocity off the arena edge. Returns true when it bounced.
  protected bounceEdge(vel: THREE.Vector3, margin = 0.5) {
    const R = this.game.arenaRadius - this.radius * 0.6 - margin;
    const r = Math.hypot(this.pos.x, this.pos.z);
    if (r < R) return false;
    const n = new THREE.Vector3(this.pos.x / r, 0, this.pos.z / r);
    const d = vel.dot(n);
    if (d <= 0) return false;
    vel.addScaledVector(n, -2 * d);
    this.pos.x = n.x * (R - 0.05); this.pos.z = n.z * (R - 0.05);
    return true;
  }

  // Distance from `p` along unit `d` to the circle the boss body can reach.
  protected edgeDist(p: THREE.Vector3, d: THREE.Vector3, margin = 0.5) {
    const R = this.game.arenaRadius - this.radius * 0.6 - margin;
    const b = p.x * d.x + p.z * d.z;
    const c = p.x * p.x + p.z * p.z - R * R;
    const disc = b * b - c;
    return disc <= 0 ? 0 : Math.max(0, -b + Math.sqrt(disc));
  }

  protected nearEdge(margin = 0.5) {
    return Math.hypot(this.pos.x, this.pos.z) > this.game.arenaRadius - this.radius * 0.6 - margin;
  }

  // Ground point clamped inside the arena.
  protected inArena(p: THREE.Vector3, margin = 2) {
    const R = this.game.arenaRadius - margin;
    const r = Math.hypot(p.x, p.z);
    if (r > R) { p.x *= R / r; p.z *= R / r; }
    p.y = 0;
    return p;
  }

  protected stars(y = this.y + this.height + 0.5) {
    if (Math.random() < 0.22) this.game.fx.burst(this.pos.clone().setY(y), PAL.reward, 1, 3, { size: 0.4, life: 0.6, grav: 0 });
  }

  // Neon blob (hidden by default) used for danger windups: charging beak, puffed cheeks, glowing claws...
  protected glows: THREE.Mesh[] = [];
  protected glowOrb(parent: THREE.Object3D, at: [number, number, number], r: number, color: THREE.ColorRepresentation = PAL.danger, intensity = 3) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), neonMaterial(color, intensity));
    m.position.set(at[0], at[1], at[2]);
    m.visible = false;
    parent.add(m);
    this.glows.push(m);
    return m;
  }

  dispose() {
    super.dispose();
    for (const m of this.glows) (m.material as THREE.Material).dispose();
  }

  protected walkTo(target: THREE.Vector3, speed: number, k = 0.1) {
    const d = target.clone().sub(this.pos).setY(0);
    if (d.lengthSq() < 0.01) return 0;
    const len = d.length();
    this.vel.lerp(d.multiplyScalar(speed / len), k);
    return len;
  }
}
