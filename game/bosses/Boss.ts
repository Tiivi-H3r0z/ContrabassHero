import * as THREE from 'three';
import type { Game } from '../Game';
import type { BossId } from '../data/dialogues';
import { BOSS_TAUNTS } from '../data/dialogues';
import { Rig } from '../models/builder';
import { PAL } from '../palette';
import { audio } from '../audio/audio';

export interface BossHit {
  dmg: number;
  dir: THREE.Vector3;
  kb: number;
  tag: number;
  crit?: boolean;
  color?: THREE.ColorRepresentation;
  ignoreInvuln?: boolean;
  heavy?: boolean;
}

export const BOSS_INFO: Record<BossId, { name: string; title: string; hp: number }> = {
  directeur: { name: 'LE DIRECTEUR', title: 'Tyran du règlement intérieur', hp: 1500 },
  aigle: { name: "L'AIGLE", title: 'Prédateur des cimes', hp: 1900 },
  kawik: { name: 'KAWIK', title: "Cochon d'Inde colossal", hp: 2400 },
  tatoo: { name: 'TATOO', title: 'Boule de démolition blindée', hp: 2900 },
  taupe: { name: 'LA TAUPE', title: 'Terreur du sous-sol', hp: 3300 },
  ninja_pain: { name: 'NINJA PAIN', title: 'Lapin assassin', hp: 3800 },
  serpent: { name: 'LE SERPENT', title: "L'Étreinte", hp: 4600 },
};

export const BOSS_ORDER: BossId[] = ['directeur', 'aigle', 'kawik', 'tatoo', 'taupe', 'ninja_pain', 'serpent'];

// Base class for bosses. Subclasses build `rig` in their constructor and implement think().
// Coordinates: pos is the ground position (y = 0 plane), `y` is the height above ground.
export abstract class Boss {
  root = new THREE.Group();
  abstract rig: Rig;
  pos = new THREE.Vector3(0, 0, -14);
  vel = new THREE.Vector3();
  y = 0;
  vy = 0;
  facing = 0;
  hp: number;
  maxHp: number;
  radius = 3;
  height = 6;
  flash = 0;
  dead = false;
  deathT = 0;
  invulnerable = false;
  phase = 'intro';
  phaseT = 0;
  stagger = 0;
  squash = 0;
  private sqv = 0;
  private lastSquash = 0;
  private hitTags = new Set<number>();
  private tauntCd = 6;
  name: string;
  title: string;

  constructor(protected game: Game, public id: BossId) {
    const info = BOSS_INFO[id];
    this.hp = info.hp * game.difficulty * ((game as { bossHpMul?: number }).bossHpMul ?? 1);
    this.maxHp = this.hp;
    this.name = info.name;
    this.title = info.title;
  }

  // Called once after the rig exists.
  mount() {
    this.root.add(this.rig.root);
    this.game.scene.add(this.root);
    this.y = 22;
    this.vy = -30;
    this.setPhase('enter');
  }

  setPhase(p: string) { this.phase = p; this.phaseT = 0; }

  get hero() { return this.game.hero; }

  toHero(out = new THREE.Vector3()) { return out.subVectors(this.hero.pos, this.pos).setY(0); }

  faceHero(dt: number, speed = 6) {
    const d = this.toHero();
    const target = Math.atan2(d.x, d.z);
    let diff = target - this.facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.facing += diff * Math.min(1, dt * speed);
  }

  // Can the hero's strike reach the boss right now (e.g. flying bosses are out of reach)?
  reachable() { return this.y < 3.5; }

  takeHit(h: BossHit): boolean {
    if (this.dead || this.phase === 'enter') return false;
    if (this.hitTags.has(h.tag)) return false;
    this.hitTags.add(h.tag);
    if (this.hitTags.size > 200) this.hitTags.clear();
    const head = this.pos.clone().setY(this.y + this.height * 0.75);
    if (this.invulnerable && !h.ignoreInvuln) {
      this.game.overlay.pop('BLOQUÉ', head, 'block');
      audio.play('block');
      this.game.fx.burst(head, PAL.bone, 6, 8, { size: 0.3, life: 0.25 });
      return false;
    }
    this.hp -= h.dmg;
    this.flash = 1;
    this.sqv += 3.5;
    this.stagger += h.dmg;
    this.vel.addScaledVector(h.dir, h.kb * 0.08);
    this.game.overlay.pop(String(Math.round(h.dmg)), head, h.crit ? 'crit' : 'dmg');
    this.game.fx.burst(head, h.color ?? PAL.bone, h.crit ? 16 : 8, 14, { size: 0.35, life: 0.35 });
    this.game.onBossHit(this, h.dmg, !!h.crit);
    if (this.hp <= 0) { this.hp = 0; this.die(); }
    return true;
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.deathT = 0;
    this.invulnerable = true;
    this.game.onBossDying(this);
  }

  taunt() {
    const lines = BOSS_TAUNTS[this.id];
    const text = lines[Math.floor(Math.random() * lines.length)];
    this.game.overlay.bubble(text, () => (this.dead ? null : this.pos.clone().setY(this.y + this.height + 1)), 2.6, 'boss');
  }

  update(dt: number) {
    this.phaseT += dt;
    this.flash = Math.max(0, this.flash - dt * 6);
    if (this.squash !== this.lastSquash) this.sqv = 0;
    this.sqv += (-150 * this.squash - 9 * this.sqv) * dt;
    this.squash = Math.max(-0.5, Math.min(0.7, this.squash + this.sqv * dt));
    this.lastSquash = this.squash;
    this.stagger = Math.max(0, this.stagger - dt * 60);
    this.tauntCd -= dt;
    if (this.tauntCd <= 0 && !this.dead && this.phase !== 'enter') {
      this.tauntCd = 9 + Math.random() * 6;
      this.taunt();
    }
    if (this.dead) {
      this.deathT += dt;
      this.root.rotation.z = Math.sin(this.deathT * 30) * 0.08 * Math.max(0, 1 - this.deathT);
      this.rig.mat.userData.flash.value = Math.floor(this.deathT * 14) % 2 ? 0.8 : 0;
      if (Math.random() < 0.3) this.game.fx.burst(this.pos.clone().setY(this.y + Math.random() * this.height), PAL.bone, 6, 12, { size: 0.4, life: 0.4 });
      this.applyTransform();
      return;
    }
    if (this.phase === 'enter') {
      if (this.y > 0.5) this.squash = -Math.min(0.45, Math.abs(this.vy) * 0.012);
      this.vy -= 60 * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0; this.vy = 0;
        this.squash = 0.7;
        this.game.fx.ring(this.pos, PAL.danger, 1, 12, 0.5, 2.5);
        this.game.fx.burst(this.pos.clone().setY(1), PAL.bone, 40, 20, { size: 0.5, life: 0.6 });
        this.game.fx.splat(this.pos, 8, PAL.void3);
        this.game.shake(0.8, 0.5, 10);
        audio.play('bossLand');
        audio.play('bossRoar');
        this.setPhase('idle');
        this.onLanded();
      }
      this.applyTransform();
      return;
    }
    this.think(dt);
    this.pos.addScaledVector(this.vel, dt);
    this.vel.multiplyScalar(Math.pow(0.05, dt));
    const R = this.game.arenaRadius - this.radius * 0.6;
    const r = Math.hypot(this.pos.x, this.pos.z);
    if (r > R) { this.pos.x *= R / r; this.pos.z *= R / r; }
    this.contactDamage();
    this.applyTransform();
  }

  protected onLanded() {}

  // Points (ground x/z + radius) where hero strikes can land. Override for long bodies.
  hitPoints(): { x: number; z: number; r: number }[] { return [{ x: this.pos.x, z: this.pos.z, r: this.radius }]; }

  addShadows(fx: import('../core/Fx').Fx) { fx.addShadow(this.pos.x, this.pos.z, this.radius * 2.4, this.y); }

  // Push the hero out of the boss body.
  protected contactDamage(hurts = false) {
    const h = this.hero;
    if (h.dead || this.y > 3 || h.y > this.height) return;
    const dx = h.pos.x - this.pos.x, dz = h.pos.z - this.pos.z;
    const rr = this.radius + h.radius;
    const d2 = dx * dx + dz * dz;
    if (d2 < rr * rr && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      h.pos.x += dx / d * (rr - d);
      h.pos.z += dz / d * (rr - d);
      if (hurts) h.hurt(this.pos);
    }
  }

  protected applyTransform() {
    this.root.position.set(this.pos.x, this.y, this.pos.z);
    this.root.rotation.y = this.facing;
    const s = this.squash;
    this.rig.root.scale.set(1 + s * 0.3, 1 - s * 0.3, 1 + s * 0.3);
    if (!this.dead) this.rig.mat.userData.flash.value = this.flash;
  }

  // Each boss implements its AI here (called each tick when alive and landed).
  abstract think(dt: number): void;

  dispose() {
    this.game.scene.remove(this.root);
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    this.rig.mat.dispose();
    this.rig.outline.dispose();
  }
}
