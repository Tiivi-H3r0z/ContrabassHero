import * as THREE from 'three';
import type { Game } from '../Game';
import { PAL } from '../palette';
import { makeOutlineMaterial, makeToonMaterial, toonMesh } from '../render/toon';
import { fartGeometry } from '../models/heroes';
import { audio } from '../audio/audio';
import { music } from '../audio/music';

export const SPECIAL_NAMES = {
  armand: "TOUPIE D'ARCHET !",
  adrien: 'RUGISSEMENT DU LION !',
  eliot: 'ATTAQUE AU GAZ !',
  swan: 'CHAT-MISSILE !',
  pierre: 'FRAPPE NUCLÉAIRE !',
  audrey: 'MODE POULE !',
} as const;

export const SPECIAL_DESC = {
  armand: "Tourbillon de 5 s : la contrebasse fauche tout autour, rebonds sur les bords.",
  adrien: 'Onde de choc géante, puis 7 s en lion : plus rapide, griffes ×1,6.',
  eliot: 'Huit nuages toxiques. Les profs contaminés se décomposent… et contaminent.',
  swan: 'Trois chats à tête chercheuse qui rebondissent de prof en prof.',
  pierre: "Compte à rebours, puis l'arène est rasée. Le boss perd 12 % de ses PV.",
  audrey: '6 s en poule géante invincible : coups de bec et œufs explosifs.',
} as const;

interface Cloud { obj: THREE.Object3D; pos: THREE.Vector3; vel: THREE.Vector3; life: number; tick: number; r: number }

export class Specials {
  group = new THREE.Group();
  private clouds: Cloud[] = [];
  private fartGeo = fartGeometry();
  private mat = makeToonMaterial({ transparent: true });
  private outline = makeOutlineMaterial(0.04, '#2a4a00');
  private tick = 0;
  private eggTimer = 0;
  private nukeT = -1;

  constructor(private game: Game) {
    this.mat.opacity = 0.85;
  }

  activate() {
    const g = this.game;
    const h = g.hero;
    h.special = 0;
    h.specialActive = true;
    g.onSpecial();
    switch (h.char) {
      case 'armand':
        h.specialT = 5;
        h.speedBoost = 1.35;
        h.invulnerableSpecial = false;
        audio.play('special_armand');
        break;
      case 'adrien': {
        h.specialT = 7;
        h.speedBoost = 1.3;
        h.setAlt('lion');
        audio.play('special_adrien');
        g.heroStrike({ center: h.pos, radius: 14, arc: 7, facing: 0, dmg: 45, kb: 30, launch: 8, guard: true, tag: h.newTag(), color: h.color, heavy: true });
        g.fx.ring(h.pos, h.color, 1, 15, 0.6, 3);
        g.fx.ring(h.pos, PAL.bone, 1, 11, 0.45, 2);
        g.shake(0.7, 0.6, 10);
        break;
      }
      case 'eliot': {
        h.specialT = 0.1;
        audio.play('special_eliot');
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const p = h.pos.clone().add(new THREE.Vector3(Math.cos(a) * 4, 1.2, Math.sin(a) * 4));
          this.spawnCloud(p, new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(2.5), 5.5, 2.6);
        }
        g.shake(0.3, 0.2, 4);
        break;
      }
      case 'swan': {
        h.specialT = 0.1;
        audio.play('special_swan');
        for (let i = -1; i <= 1; i++) {
          const a = h.facing + i * 0.5;
          g.projectiles.cat(h.pos.clone().setY(1.5), new THREE.Vector3(Math.sin(a), 0, Math.cos(a)));
        }
        break;
      }
      case 'pierre':
        h.specialT = 1.6;
        this.nukeT = 1.3;
        audio.play('special_pierre');
        audio.play('nukeAlarm');
        break;
      case 'audrey':
        h.specialT = 6;
        h.speedBoost = 1.5;
        h.invulnerableSpecial = true;
        h.setAlt('chicken');
        audio.play('special_audrey');
        this.eggTimer = 0.4;
        break;
    }
  }

  spawnCloud(pos: THREE.Vector3, vel: THREE.Vector3, life: number, r: number) {
    const tp = toonMesh(this.fartGeo, this.mat, this.outline);
    tp.group.position.copy(pos);
    this.group.add(tp.group);
    this.clouds.push({ obj: tp.group, pos: pos.clone(), vel, life, tick: 0, r });
  }

  update(dt: number) {
    const g = this.game;
    const h = g.hero;
    this.tick += dt;
    if (h.specialActive) {
      h.specialT -= dt;
      if (h.char === 'armand' && this.tick > 0.14) {
        this.tick = 0;
        g.heroStrike({ center: h.pos, radius: 5, arc: 7, facing: 0, dmg: 16 * h.mods.dmg, kb: 13, launch: 3, guard: true, tag: h.newTag(), color: h.color, quietSlash: true });
        g.fx.slash(h.pos, Math.random() * 6.28, h.color, 1.05, 0.14, 1, 1.4);
        if (Math.hypot(h.vel.x, h.vel.z) < 8) h.vel.add(new THREE.Vector3(Math.sin(h.facing), 0, Math.cos(h.facing)).multiplyScalar(4));
      }
      if (h.char === 'audrey') {
        this.eggTimer -= dt;
        if (this.eggTimer <= 0) { this.eggTimer = 0.4; g.projectiles.egg(h.pos.clone().addScaledVector(new THREE.Vector3(Math.sin(h.facing), 0, Math.cos(h.facing)), -1.5)); }
        if (this.tick > 0.2) {
          this.tick = 0;
          g.heroStrike({ center: h.pos, radius: 3.4, arc: 7, facing: 0, dmg: 22 * h.mods.dmg, kb: 16, launch: 5, guard: true, tag: h.newTag(), color: h.color, quietSlash: true });
        }
        if (Math.random() < 0.3) g.fx.debris(h.pos.clone().setY(2), ['#ffe4f2', '#ffffff'], 1, 6, 0.3);
      }
      if (this.nukeT > 0) {
        this.nukeT -= dt;
        g.post.uHurt = 0.35 + 0.35 * Math.sin(this.tick * 30);
        if (this.nukeT <= 0) this.detonate();
      }
      if (h.specialT <= 0) h.endSpecial();
    }
    for (const c of this.clouds) {
      c.life -= dt;
      c.tick -= dt;
      c.pos.addScaledVector(c.vel, dt);
      c.vel.multiplyScalar(Math.pow(0.4, dt));
      c.obj.position.copy(c.pos);
      c.obj.rotation.y += dt * 0.8;
      const s = Math.min(1, (5.5 - c.life) * 4, c.life * 2) * (c.r / 2.6) * (1 + Math.sin(c.life * 6) * 0.06);
      c.obj.scale.setScalar(Math.max(0.01, s) * 1.5);
      if (c.tick <= 0) {
        c.tick = 0.3;
        for (const e of g.enemies.list) {
          if (e.alive && e.pos.distanceToSquared(c.pos) < (c.r + e.radius + 0.8) ** 2) {
            g.enemies.hit(e, { dmg: 9 * h.mods.dmg, dir: e.pos.clone().sub(c.pos).setY(0).normalize(), kb: 2, tag: h.newTag(), quiet: true, color: '#a6ff00' });
            e.contaminated = 4;
          }
        }
        if (g.boss && !g.boss.dead && g.boss.pos.distanceTo(c.pos) < c.r + g.boss.radius) g.boss.takeHit({ dmg: 8, dir: new THREE.Vector3(), kb: 0, tag: h.newTag(), color: '#a6ff00' });
        g.fx.burst(c.pos, '#a6ff00', 2, 3, { size: 0.4, life: 0.6, grav: -3, intensity: 1.6 });
      }
      if (c.life <= 0) this.group.remove(c.obj);
    }
    this.clouds = this.clouds.filter((c) => c.life > 0);
  }

  onContaminatedDeath(pos: THREE.Vector3) {
    if (this.clouds.length < 14) this.spawnCloud(pos.clone().setY(1.2), new THREE.Vector3(), 2.5, 1.8);
  }

  private detonate() {
    const g = this.game;
    g.post.uHurt = 0;
    g.impactFrames(4);
    g.shake(1, 0.8, 14);
    g.slowmo(0.3, 0.9);
    audio.play('explosion', { volume: 1.6, pitch: 0.6 });
    music.duck(0.8, 1.5);
    music.sting('finale');
    g.input.rumble(1, 1, 600);
    const center = new THREE.Vector3(-6, 0, -6);
    for (let i = 0; i < 5; i++) g.fx.ring(center, i % 2 ? PAL.bone : '#fff6a0', 1, 10 + i * 9, 0.6 + i * 0.25, 3.5);
    g.fx.burst(center.clone().setY(3), '#fff6a0', 120, 40, { size: 1.0, life: 1.2, up: 1.5, grav: -2 });
    g.fx.burst(center.clone().setY(8), '#ffffff', 60, 25, { size: 1.4, life: 1.5, up: 2, grav: -6 });
    g.enemies.killAll('nuke');
    if (g.boss && !g.boss.dead) g.boss.takeHit({ dmg: g.boss.maxHp * 0.12, dir: new THREE.Vector3(), kb: 0, tag: g.hero.newTag(), crit: true, color: '#fff6a0', ignoreInvuln: true });
  }

  dispose() { this.fartGeo.dispose(); this.mat.dispose(); this.outline.dispose(); }
}
