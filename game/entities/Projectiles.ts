import * as THREE from 'three';
import type { Game } from '../Game';
import type { Enemy } from './Enemies';
import { PAL } from '../palette';
import { makeOutlineMaterial, makeToonMaterial, neonMaterial, toonMesh } from '../render/toon';
import { catGeometry, eggGeometry } from '../models/heroes';
import { audio } from '../audio/audio';

export type EnemyShotKind = 'chalk' | 'feather' | 'seed' | 'lava' | 'carrot' | 'orb';

interface Proj {
  kind: EnemyShotKind | 'cat' | 'egg';
  obj: THREE.Object3D;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  radius: number;
  enemy: boolean;
  dmg: number;
  grav: number;
  target: Enemy | null;
  bossTarget: boolean;
  hitIds: Set<number>;
  tag: number;
  fuse: number;
  aoe: number;
}

export class Projectiles {
  group = new THREE.Group();
  list: Proj[] = [];
  private geos: Record<string, THREE.BufferGeometry> = {};
  private mats: Record<string, THREE.Material> = {};
  private toon = makeToonMaterial();
  private outline = makeOutlineMaterial(0.05);
  private catGeo = catGeometry();
  private eggGeo = eggGeometry();

  constructor(private game: Game) {
    this.geos.chalk = new THREE.BoxGeometry(0.25, 0.25, 0.9);
    this.geos.feather = new THREE.ConeGeometry(0.22, 1.4, 5).rotateX(Math.PI / 2);
    this.geos.seed = new THREE.SphereGeometry(0.4, 10, 8);
    this.geos.lava = new THREE.IcosahedronGeometry(0.75, 1);
    this.geos.carrot = new THREE.ConeGeometry(0.35, 1.4, 8).rotateX(Math.PI / 2);
    this.geos.orb = new THREE.IcosahedronGeometry(0.5, 1);
    const core = neonMaterial(PAL.danger, 2.4);
    this.mats.chalk = neonMaterial('#ffffff', 1.6);
    this.mats.feather = core;
    this.mats.seed = core;
    this.mats.lava = neonMaterial(PAL.danger, 3);
    this.mats.carrot = core;
    this.mats.orb = core;
  }

  enemyShot(kind: EnemyShotKind, from: THREE.Vector3, vel: THREE.Vector3, dmg = 1, opts: { grav?: number; life?: number; radius?: number; aoe?: number } = {}) {
    const obj = new THREE.Group();
    const m = new THREE.Mesh(this.geos[kind], this.mats[kind]);
    obj.add(m);
    if (kind === 'chalk') {
      const glow = new THREE.Mesh(this.geos.orb, this.mats.orb);
      glow.scale.setScalar(0.6);
      obj.add(glow);
    }
    obj.position.copy(from);
    this.group.add(obj);
    this.list.push({ kind, obj, pos: from.clone(), vel: vel.clone(), life: opts.life ?? 3, radius: opts.radius ?? 0.7, enemy: true, dmg, grav: opts.grav ?? 0, target: null, bossTarget: false, hitIds: new Set(), tag: 0, fuse: 0, aoe: opts.aoe ?? 0 });
  }

  cat(from: THREE.Vector3, dir: THREE.Vector3) {
    const tp = toonMesh(this.catGeo, this.toon, this.outline);
    tp.group.scale.setScalar(1.3);
    this.group.add(tp.group);
    this.list.push({ kind: 'cat', obj: tp.group, pos: from.clone(), vel: dir.clone().multiplyScalar(20), life: 6, radius: 1.2, enemy: false, dmg: 34, grav: 0, target: null, bossTarget: false, hitIds: new Set(), tag: this.game.hero.newTag(), fuse: 0, aoe: 0 });
  }

  egg(from: THREE.Vector3) {
    const tp = toonMesh(this.eggGeo, this.toon, this.outline);
    this.group.add(tp.group);
    this.list.push({ kind: 'egg', obj: tp.group, pos: from.clone().setY(1.2), vel: new THREE.Vector3(0, 4, 0), life: 3, radius: 0.5, enemy: false, dmg: 40, grav: 20, target: null, bossTarget: false, hitIds: new Set(), tag: 0, fuse: 0.9, aoe: 3.8 });
  }

  update(dt: number) {
    const g = this.game;
    const hero = g.hero;
    for (const p of this.list) {
      p.life -= dt;
      if (p.kind === 'cat') {
        if (!p.target || !p.target.alive || p.target.state === 'dying' || p.target.state === 'fall') {
          p.target = g.enemies.nearest(p.pos, 30, p.hitIds);
          p.bossTarget = !p.target && !!g.boss && !g.boss.dead;
        }
        const tgt = p.target ? p.target.pos : p.bossTarget && g.boss ? g.boss.pos : null;
        if (tgt) {
          const want = new THREE.Vector3(tgt.x - p.pos.x, 0, tgt.z - p.pos.z).normalize().multiplyScalar(26);
          p.vel.lerp(want, 1 - Math.pow(0.002, dt));
        }
        p.pos.y = 1.4 + Math.sin(p.life * 12) * 0.3;
        if (p.target && p.target.pos.distanceTo(p.pos.clone().setY(0)) < p.radius + p.target.radius) {
          g.enemies.hit(p.target, { dmg: p.dmg * hero.mods.dmg, dir: p.vel.clone().setY(0).normalize(), kb: 10, launch: 6, tag: p.tag + p.target.id * 7, color: '#8f6bff', breaksGuard: true });
          p.hitIds.add(p.target.id);
          if (p.hitIds.size > 6) p.hitIds.clear();
          audio.play('meow', { pitch: 1 + Math.random() * 0.4, volume: 0.5 });
          g.fx.burst(p.pos, '#8f6bff', 10, 12, { size: 0.35, life: 0.3 });
          p.target = null;
        } else if (p.bossTarget && g.boss && !g.boss.dead && g.boss.pos.distanceTo(p.pos.clone().setY(0)) < p.radius + g.boss.radius) {
          g.boss.takeHit({ dmg: p.dmg * 0.8, dir: p.vel.clone().setY(0).normalize(), kb: 2, tag: p.tag + Math.floor(g.time * 4), color: '#8f6bff' });
          p.vel.multiplyScalar(-1);
          p.bossTarget = false;
        }
        const r = Math.hypot(p.pos.x, p.pos.z);
        if (r > g.arenaRadius - 1) p.vel.addScaledVector(new THREE.Vector3(-p.pos.x, 0, -p.pos.z).normalize(), 40 * dt);
      } else if (p.kind === 'egg') {
        p.fuse -= dt;
        if (p.fuse <= 0) {
          g.heroStrike({ center: p.pos.clone().setY(0), radius: p.aoe, arc: 7, facing: 0, dmg: p.dmg * hero.mods.dmg, kb: 14, launch: 9, guard: true, tag: hero.newTag(), color: '#ff5fd2' });
          g.fx.ring(p.pos, '#ff5fd2', 0.4, p.aoe, 0.3, 3);
          g.fx.burst(p.pos, '#ffffff', 16, 14, { size: 0.4, life: 0.4 });
          g.fx.debris(p.pos, ['#fff4e0', '#ffd23f'], 8, 10, 0.35);
          audio.play('egg');
          p.life = 0;
        }
      }
      p.vel.y -= p.grav * dt;
      p.pos.addScaledVector(p.vel, dt);
      if (p.kind === 'egg' && p.pos.y < 0.4) { p.pos.y = 0.4; p.vel.set(0, 0, 0); }
      p.obj.position.copy(p.pos);
      if (p.vel.lengthSq() > 0.1 && p.kind !== 'egg') p.obj.rotation.y = Math.atan2(p.vel.x, p.vel.z);
      if (p.kind === 'lava' || p.kind === 'seed' || p.kind === 'orb') p.obj.rotation.x += dt * 8;
      if (p.enemy) {
        if (Math.random() < 0.6) g.fx.burst(p.pos, p.kind === 'chalk' ? '#ffffff' : PAL.danger, 1, 1, { size: 0.3, life: 0.25, grav: 0 });
        const dx = p.pos.x - hero.pos.x, dz = p.pos.z - hero.pos.z, dy = p.pos.y - (hero.y + 1.5);
        if (dx * dx + dz * dz < (p.radius + hero.radius) ** 2 && Math.abs(dy) < 2.2) {
          if (hero.hurt(p.pos, p.dmg)) p.life = 0;
        }
        if (p.grav > 0 && p.pos.y <= 0.2) {
          if (p.aoe > 0) {
            g.fx.ring(p.pos, PAL.danger, 0.3, p.aoe, 0.3, 2);
            g.fx.burst(p.pos.clone().setY(0.5), PAL.danger, 12, 10, { size: 0.4, life: 0.4 });
            if (hero.pos.distanceTo(p.pos.clone().setY(0)) < p.aoe + hero.radius && hero.y < 1.5) hero.hurt(p.pos, p.dmg);
            audio.play('explosion', { volume: 0.35, pitch: 1.4 });
          }
          p.life = 0;
        }
      }
      if (Math.hypot(p.pos.x, p.pos.z) > g.arenaRadius + 14) p.life = 0;
      if (p.life <= 0) this.group.remove(p.obj);
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  clearEnemyShots() {
    for (const p of this.list) if (p.enemy) { p.life = 0; this.group.remove(p.obj); }
    this.list = this.list.filter((p) => p.life > 0);
  }

  dispose() {
    Object.values(this.geos).forEach((g) => g.dispose());
    Object.values(this.mats).forEach((m) => m.dispose());
    this.catGeo.dispose(); this.eggGeo.dispose(); this.toon.dispose(); this.outline.dispose();
  }
}
