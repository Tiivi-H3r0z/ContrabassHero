import * as THREE from 'three';
import type { Game } from '../Game';
import type { Enemy } from '../entities/Enemies';
import type { CharacterType } from '../../types';
import { FINALE } from '../data/dialogues';
import { HERO_COLORS, PAL } from '../palette';
import { audio } from '../audio/audio';
import { music } from '../audio/music';
import { inQuad } from '../core/anim';

interface Target {
  pos: THREE.Vector3;
  height: number;
  boss: boolean;
  enemy: Enemy | null;
}

interface Active {
  target: Target;
  t: number;
  char: CharacterType;
  next: number;
  step: number;
  sink: number;
  inflate: number;
  jitter: number;
  done: boolean;
}

const CARD = 0.75;   // gothic card, world frozen
const SHOW = 1.55;   // choreography length

// Finales: hero-specific executions on a low boss (<= 12 % HP) or a weakened elite (CPE / inspecteur <= 35 %).
export class Finales {
  active: Active | null = null;
  candidate: Target | null = null;
  private markT = 0;
  private promptShown = false;
  private test = new URLSearchParams(location.search).has('finaletest');

  constructor(private game: Game) {}

  scan(dt: number) {
    const g = this.game;
    const h = g.hero;
    this.candidate = null;
    if (h.dead || h.state === 'fall' || h.state === 'constricted' || g.cutscene) { this.setPrompt(false); return; }
    const b = g.boss;
    if (b && !b.dead && b.phase !== 'enter' && b.reachable() && b.hp <= b.maxHp * 0.12 && (this.test || b.pos.distanceTo(h.pos) < 11 + b.radius)) {
      this.candidate = { pos: b.pos, height: b.height, boss: true, enemy: null };
    } else {
      let best: Enemy | null = null, bd = 30;
      for (const e of g.enemies.list) {
        if (!e.alive || (e.kind !== 'cpe' && e.kind !== 'inspecteur')) continue;
        if (e.state === 'dying' || e.state === 'fall' || e.state === 'flat' || e.state === 'stake' || e.state === 'spawn') continue;
        if (e.hp > e.maxHp * 0.35) continue;
        const d = e.pos.distanceToSquared(h.pos);
        if (d < bd) { bd = d; best = e; }
      }
      if (best) this.candidate = { pos: best.pos, height: 3.2 * best.scaleMul, boss: false, enemy: best };
    }
    this.setPrompt(!!this.candidate);
    if (this.candidate) {
      this.markT -= dt;
      if (this.markT <= 0) {
        this.markT = 0.35;
        g.fx.ring(this.candidate.pos, PAL.reward, 0.5, this.candidate.boss ? 7 : 3.4, 0.35, 2.8);
      }
    }
  }

  private setPrompt(on: boolean) {
    if (on === this.promptShown) return;
    this.promptShown = on;
    this.game.hud.set('finalePrompt', on);
    if (on) audio.play('specialReady', { pitch: 0.7, volume: 0.6 });
  }

  // Called by the hero when heavy is pressed. Returns true if a finale started.
  tryStart(): boolean {
    if (!this.candidate || this.active) return false;
    const g = this.game;
    const h = g.hero;
    const t = this.candidate;
    const dir = new THREE.Vector3().subVectors(t.pos, h.pos).setY(0);
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
    dir.normalize();
    const standOff = t.boss ? (g.boss?.radius ?? 3) + 1.6 : 2.4;
    h.pos.copy(t.pos).addScaledVector(dir, -standOff).setY(0);
    h.vel.set(0, 0, 0);
    h.y = 0; h.vy = 0;
    h.facing = Math.atan2(dir.x, dir.z);
    h.endSpecial();
    this.active = { target: t, t: 0, char: h.char, next: CARD, step: 0, sink: 0, inflate: 0, jitter: 0, done: false };
    this.setPrompt(false);
    const f = FINALE[h.char];
    g.hud.set('finale', { id: Date.now(), name: f.name, hero: h.char, line: f.line });
    g.dialogue.bark(h.char, f.line);
    g.projectiles.clearEnemyShots();
    g.impactFrames(3, true);
    g.cam.addPunch(0.9);
    music.duck(0.55, 2.6);
    music.sting('finale');
    audio.play('bossCharge', { pitch: 1.4 });
    return true;
  }

  update(dt: number) {
    const a = this.active;
    if (!a) return;
    const g = this.game;
    a.t += dt;
    const local = a.t - CARD;
    g.hero.finalePose(Math.max(0, local), dt);
    if (local >= 0) this.choreo(a, local, dt);
    this.applyTarget(a);
    if (local >= SHOW && !a.done) this.finish(a);
    if (local >= SHOW + 0.35) {
      this.active = null;
      g.hero.state = 'move';
      g.hud.set('finale', null);
    }
  }

  private hitFx(a: Active, intensity: number, word?: string) {
    const g = this.game;
    const p = a.target.pos.clone().setY(a.target.height * (0.4 + Math.random() * 0.4) - a.sink);
    const col = HERO_COLORS[a.char];
    g.fx.burst(p, col, 6 + intensity * 6, 10 + intensity * 6, { size: 0.35, life: 0.35 });
    g.fx.debris(p, [PAL.ink, '#ffffff', PAL.bone], 3 + intensity * 4, 10 + intensity * 4, 0.35);
    g.cam.addTrauma(0.12 + intensity * 0.12);
    a.jitter = 1;
    if (word) g.overlay.pop(word, p.clone().setY(p.y + 1.5), 'sfx');
    if (g.boss && a.target.boss) g.boss.rig.mat.userData.flash.value = 1;
    if (a.target.enemy) a.target.enemy.flash = 1;
  }

  private choreo(a: Active, t: number, dt: number) {
    const g = this.game;
    const col = HERO_COLORS[a.char];
    const tp = a.target.pos;
    const every = (period: number, start: number, end: number, fn: (i: number) => void) => {
      while (a.next <= CARD + t && t <= end) {
        const local = a.next - CARD;
        if (local >= start) fn(a.step++);
        a.next += period;
      }
    };
    switch (a.char) {
      case 'armand':
        every(0.4, 0.15, 1.2, (i) => {
          a.sink = Math.min(1, a.sink + 0.36);
          this.hitFx(a, 2, ['TOC', 'TOC !', 'TOC !!'][i % 3]);
          g.fx.ring(tp, PAL.bone, 0.6, 5, 0.3, 1.6);
          g.fx.splat(tp, 3 + i);
          audio.play('smash', { pitch: 0.8 - i * 0.1 });
          g.impactFrames(1);
        });
        break;
      case 'adrien':
        every(0.055, 0.05, 1.25, (i) => {
          this.hitFx(a, 0, i % 5 === 0 ? 'PAF' : undefined);
          audio.play('hit', { pitch: 1.2 + (i % 4) * 0.1, volume: 0.6 });
        });
        break;
      case 'eliot':
        every(0.12, 0.05, 1.3, (i) => {
          g.fx.ring(g.hero.pos, '#a6ff00', 0.5, 4 + i * 1.5, 0.35, 2.6, 1.6);
          a.inflate = Math.min(1, a.inflate + 0.09);
          if (i === 5) { g.fx.debris(tp.clone().setY(a.target.height * 0.8), [PAL.ink, '#9fd8ff'], 12, 12, 0.3); g.overlay.pop('CRAC', tp.clone().setY(a.target.height + 1), 'sfx'); }
          if (i % 3 === 0) audio.play('hitHeavy', { pitch: 1.6, volume: 0.5 });
        });
        break;
      case 'swan':
        every(0.08, 0.05, 1.3, (i) => {
          g.fx.slash(tp, Math.random() * Math.PI * 2, '#8f6bff', a.target.boss ? 1.5 : 0.8, 0.12, i % 2 ? 1 : -1, a.target.height * (0.3 + Math.random() * 0.5));
          this.hitFx(a, 0, i % 4 === 0 ? 'SHRAK' : undefined);
          if (i % 4 === 0) audio.play('meow', { pitch: 1 + Math.random() * 0.5, volume: 0.6 });
        });
        break;
      case 'pierre':
        every(0.1, 0.05, 1.3, (i) => {
          const p = tp.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, a.target.height * (0.3 + Math.random() * 0.6), (Math.random() - 0.5) * 3));
          g.fx.burst(p, i % 2 ? PAL.reward : PAL.power, 10, 12, { size: 0.4, life: 0.5, up: 1.3 });
          g.fx.splat(tp.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6)), 1.6 + Math.random() * 1.6);
          a.jitter = 1;
          if (i === 0) audio.play('special_pierre');
        });
        break;
      case 'audrey':
        every(0.14, 0.05, 1.35, (i) => {
          g.fx.ring(g.hero.pos, i % 2 ? '#ff5fd2' : '#ffffff', 0.5, 5 + i * 2.2, 0.4, 3, 2.5);
          a.inflate = Math.min(1.2, a.inflate + 0.11);
          g.cam.addTrauma(0.08 + i * 0.02);
          if (i === 0) audio.play('special_audrey');
        });
        break;
    }
    void dt;
  }

  private applyTarget(a: Active) {
    const g = this.game;
    a.jitter = Math.max(0, a.jitter - 0.15);
    const jx = (Math.random() - 0.5) * a.jitter * 0.3;
    const inflate = inQuad(Math.min(1, a.inflate));
    if (a.target.boss && g.boss) {
      const b = g.boss;
      const h = b.height * 0.45 * a.sink;
      b.root.position.set(b.pos.x + jx, b.y - h, b.pos.z);
      const s = 1 + inflate * 0.6;
      b.rig.root.scale.set(s, s * (1 - a.jitter * 0.08), s);
      b.rig.mat.userData.flash.value = Math.max(0, b.rig.mat.userData.flash.value - 0.12);
    } else if (a.target.enemy) {
      const e = a.target.enemy;
      e.y = -2.2 * a.sink;
      e.scaleMul = (e.mutant ? 1.35 : 1) * (1 + inflate * 0.7);
      e.squash = a.jitter * 0.2;
      g.enemies.refresh();
    }
  }

  private finish(a: Active) {
    a.done = true;
    const g = this.game;
    const p = a.target.pos.clone().setY(Math.max(0.6, a.target.height * 0.5 - a.sink * 2));
    g.fx.burst(p, PAL.bone, 60, 26, { size: 0.6, life: 0.8, up: 1.2 });
    g.fx.burst(p, HERO_COLORS[a.char], 50, 24, { size: 0.5, life: 0.8, up: 1.3 });
    g.fx.burst(p, PAL.power, 30, 20, { size: 0.45, life: 0.9, up: 1.6 });
    g.fx.debris(p, [PAL.ink, PAL.ink, '#ffffff', '#7a2a2a', PAL.bone], 40, 20, 0.55);
    for (let i = 0; i < 3; i++) g.fx.ring(a.target.pos, i % 2 ? PAL.reward : PAL.bone, 1, 9 + i * 5, 0.5 + i * 0.15, 3);
    g.fx.splat(a.target.pos, a.target.boss ? 11 : 6);
    g.shake(1, 0.7, 6);
    g.impactFrames(3, true);
    audio.play('explosion', { volume: 1.3, pitch: 0.8 });
    g.overlay.pop(FINALE[a.char].name.toUpperCase() + ' !', p.clone().setY(p.y + 3), 'goth');
    g.addScore(a.target.boss ? 8000 * g.stageNum : 2000);
    g.bumpCombo(30);
    if (a.target.boss && g.boss) {
      const b = g.boss;
      b.rig.root.scale.set(1, 1, 1);
      b.hp = 0;
      b.die();
    } else if (a.target.enemy) {
      const e = a.target.enemy;
      e.y = 0.2;
      e.scaleMul = e.mutant ? 1.35 : 1;
      e.hp = 0;
      e.killStyle = 'pop';
      g.enemies.kill(e, false);
    }
  }
}
