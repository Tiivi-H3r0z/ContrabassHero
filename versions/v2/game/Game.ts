import * as THREE from 'three';
import type { CharacterType, GameSettings, RunState, StageStats } from '../types';
import { CHARACTERS } from '../types';
import { Pipeline } from './render/Pipeline';
import { CameraRig } from './core/CameraRig';
import { Input } from './core/Input';
import { Overlay } from './core/Overlay';
import { Fx } from './core/Fx';
import { HudStore } from './core/hudStore';
import { Hero } from './entities/Hero';
import { Enemies, Enemy } from './entities/Enemies';
import { Projectiles } from './entities/Projectiles';
import { Specials, SPECIAL_NAMES } from './entities/Specials';
import { Pickups } from './entities/Pickups';
import { Boss, BOSS_ORDER } from './bosses/Boss';
import { createBoss } from './bosses';
import { Events } from './systems/Events';
import { Director } from './systems/Director';
import { Dialogue } from './systems/Dialogue';
import { buildStage, StageBuild, PropInstance, ARENA_RADIUS } from './stages';
import { audio } from './audio/audio';
import { PAL, NUANCE_MULT, NUANCE_NAMES, nuanceOf } from './palette';
import { BOSS_DEATH, BOSS_INTRO, HERO_BARKS, STAGE_INTRO, VICTORY_LINES, Line } from './data/dialogues';

export interface GameCallbacks {
  onStageClear(run: RunState, stats: StageStats): void;
  onGameOver(run: RunState, stats: StageStats): void;
  onVictory(run: RunState, stats: StageStats): void;
  onPauseRequest(): void;
}

export interface GameProp extends PropInstance { alive: boolean; hits: number; lastTag: number; shakeT: number; baseRot: THREE.Euler }

export interface StrikeOpts {
  center: THREE.Vector3;
  radius: number;
  arc: number;
  facing: number;
  dmg: number;
  kb: number;
  launch: number;
  guard: boolean;
  tag: number;
  crit?: boolean;
  color?: THREE.ColorRepresentation;
  heavy?: boolean;
  quietSlash?: boolean;
}

type Phase = 'horde' | 'bossIntro' | 'boss' | 'bossDeath' | 'clear' | 'gameover';

const FIXED = 1 / 60;
const v1 = new THREE.Vector3();

export class Game {
  scene = new THREE.Scene();
  pipeline: Pipeline;
  cam: CameraRig;
  input: Input;
  overlay: Overlay;
  fx = new Fx();
  stage: StageBuild;
  hero: Hero;
  enemies: Enemies;
  projectiles: Projectiles;
  specials: Specials;
  pickups: Pickups;
  events: Events;
  director: Director;
  dialogue: Dialogue;
  boss: Boss | null = null;
  props: GameProp[] = [];
  arenaRadius = ARENA_RADIUS;
  time = 0;
  phase: Phase = 'horde';
  phaseT = 0;
  cutscene = false;
  paused = false;
  difficulty: number;
  enemySpeedMul = 1;
  tagSalt = 0;
  post = { uHurt: 0, uAberration: 0, uImpact: 0, uDark: 0 };
  stageNum: number;
  radioMate: CharacterType;

  run: RunState;
  autoplay = new URLSearchParams(location.search).has('auto');
  private autoT = 0;
  private debugEl: HTMLDivElement | null = null;
  private forcedTicks = parseInt(new URLSearchParams(location.search).get('ticks') ?? '0', 10) || 0;
  stageKills = 0;
  quota: number;
  combo = 0;
  comboTimer = 0;
  maxCombo = 0;
  nuance = 0;
  private nuanceBarked = 0;
  private stageTime = 0;
  private stageScoreStart: number;
  private hitstop = 0;
  private impact = 0;
  private timeScale = 1;
  private slowT = 0;
  private acc = 0;
  private last = 0;
  private raf = 0;
  private disposed = false;
  private resizeObs: ResizeObserver;
  private width = 1;
  private height = 1;
  private specialWasReady = false;

  constructor(private container: HTMLElement, run: RunState, public settings: GameSettings, public hud: HudStore, private cb: GameCallbacks) {
    this.run = { ...run };
    this.stageNum = run.stage;
    this.stageScoreStart = run.score;
    this.difficulty = 1 + (run.stage - 1) * 0.12;
    this.quota = 40 + run.stage * 10;
    const q = parseInt(new URLSearchParams(location.search).get('quota') ?? '', 10);
    if (q > 0) this.quota = q;
    const others = CHARACTERS.filter((c) => c !== run.character);
    this.radioMate = others[Math.floor(Math.random() * others.length)];

    this.stage = buildStage(run.stage);
    this.scene.add(this.stage.group);
    this.scene.background = new THREE.Color(this.stage.def.bg);
    this.scene.fog = new THREE.Fog(this.stage.def.fog, this.stage.def.fogNear, this.stage.def.fogFar);
    this.props = this.stage.props.map((p) => ({ ...p, alive: true, hits: 0, lastTag: -1, shakeT: 0, baseRot: p.object.rotation.clone() }));

    this.width = container.clientWidth;
    this.height = container.clientHeight;
    this.cam = new CameraRig(this.width / Math.max(1, this.height));
    this.cam.shakeEnabled = settings.shake;
    this.pipeline = new Pipeline(container, this.scene, this.cam.camera);
    this.overlay = new Overlay(container);
    this.input = new Input(settings.keys);

    this.scene.add(this.fx.group);
    this.hero = new Hero(this, run.character);
    this.hero.lives = run.lives;
    this.scene.add(this.hero.root);
    this.enemies = new Enemies(this);
    this.scene.add(this.enemies.group);
    this.projectiles = new Projectiles(this);
    this.scene.add(this.projectiles.group);
    this.specials = new Specials(this);
    this.scene.add(this.specials.group);
    this.pickups = new Pickups(this);
    this.scene.add(this.pickups.group);
    this.events = new Events(this);
    this.director = new Director(this);
    this.dialogue = new Dialogue(this);

    this.hero.respawn();
    this.hero.y = 14;
    this.cam.target.copy(this.hero.pos);
    this.cam.snap();

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(container);

    this.initHud();
    if (new URLSearchParams(location.search).has('debug')) { this.debugEl = document.createElement('div'); this.debugEl.style.cssText = 'position:absolute;left:8px;bottom:120px;z-index:99;color:#fff;font:12px monospace;background:#000a;padding:4px'; container.appendChild(this.debugEl); }
    audio.music.play('stage', run.stage);
    audio.music.setIntensity(0);
    this.dialogue.play(STAGE_INTRO[run.stage] ?? [], false);

    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private initHud() {
    const h = this.hud;
    h.set('hero', this.run.character);
    h.set('stage', this.stageNum);
    h.set('lives', this.hero.lives);
    h.set('maxLives', this.hero.maxLives);
    h.set('score', this.run.score);
    h.set('quota', this.quota);
    h.set('kills', 0);
    h.set('bossActive', false);
    h.set('banner', null);
    h.set('dialogue', null);
    h.set('cutin', null);
    h.set('bossIntro', null);
    h.commit();
  }

  private resize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.cam.camera.aspect = this.width / Math.max(1, this.height);
    this.cam.camera.updateProjectionMatrix();
    this.pipeline.resize(this.width, this.height);
  }

  setPaused(p: boolean) {
    this.paused = p;
    audio.music.setPaused(p);
  }

  updateSettings(s: GameSettings) {
    this.settings = s;
    this.input.keys = s.keys;
    this.cam.shakeEnabled = s.shake;
  }

  private frame = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.1) dt = 0.1;
    this.acc += dt;
    let steps = 0;
    if (this.forcedTicks) { for (let i = 0; i < this.forcedTicks; i++) this.tick(); this.acc = 0; this.render(Math.min(0.1, FIXED * this.forcedTicks)); return; }
    while (this.acc >= FIXED && steps < 4) {
      this.acc -= FIXED;
      this.tick();
      steps++;
    }
    if (steps === 4) this.acc = 0;
    this.render(dt);
  };

  private tick() {
    this.input.poll();
    if (this.autoplay) this.autoPlay();
    if (this.paused) return;
    if (this.input.pausePressed && this.phase !== 'gameover' && this.phase !== 'clear') { this.cb.onPauseRequest(); return; }

    if (this.slowT > 0) {
      this.slowT -= FIXED;
      if (this.slowT <= 0) { this.timeScale = 1; audio.music.setSlowmo(1); }
    }
    const dt = FIXED * this.timeScale;
    this.dialogue.update(FIXED);
    if (this.cutscene) {
      this.fx.update(dt);
      this.stage.update(dt, this.time);
      this.time += dt;
      return;
    }
    if (this.hitstop > 0) { this.hitstop--; return; }

    this.time += dt;
    this.phaseT += dt;
    this.stageTime += dt;
    this.tagSalt = (this.tagSalt + 1) % 1000000;

    this.hero.update(dt);
    this.specials.update(dt);
    this.enemies.update(dt);
    if (this.boss) this.boss.update(dt);
    this.projectiles.update(dt);
    this.pickups.update(dt);
    this.updateProps(dt);
    if (this.phase === 'horde' || this.phase === 'boss') this.director.update(dt);
    this.events.update(dt);
    this.updatePhase(dt);
    this.fx.update(dt);
    this.stage.update(dt, this.time);

    this.comboTimer -= dt;
    if (this.comboTimer <= 0 && this.combo > 0) this.setCombo(0);

    const wasReady = this.specialWasReady;
    this.specialWasReady = this.hero.special >= 1;
    if (!wasReady && this.specialWasReady) {
      audio.play('specialReady');
      this.overlay.pop('POUVOIR PRÊT', this.hero.pos.clone().setY(5), 'heal');
    }

    this.post.uHurt = Math.max(0, this.post.uHurt - dt * 2.2);
    this.post.uAberration = Math.max(0, this.post.uAberration - dt * 3);
    this.syncHud();
  }

  private render(dt: number) {
    const h = this.hero;
    this.cam.target.set(h.pos.x, Math.max(0, h.y) * 0.3, h.pos.z);
    v1.set(Math.sin(h.facing), 0, Math.cos(h.facing)).multiplyScalar(2);
    this.cam.lookAhead.lerp(v1, 0.05);
    const crowd = this.enemies.list.length;
    const want = (this.boss && !this.boss.dead ? 38 : 31) + Math.min(5, crowd * 0.07);
    this.cam.dist += (want - this.cam.dist) * Math.min(1, dt * 1.5);
    if (!this.paused) this.cam.update(dt * this.timeScale);

    this.fx.beginShadows();
    if (h.state !== 'fall') this.fx.addShadow(h.pos.x, h.pos.z, h.altKind ? 4 : 2.4, h.y);
    this.enemies.addShadows();
    if (this.boss && !this.boss.dead && this.boss.root.parent) this.boss.addShadows(this.fx);
    this.fx.endShadows();

    const u = this.pipeline.final.uniforms;
    u.uHurt.value = this.post.uHurt;
    u.uAberration.value = this.post.uAberration;
    u.uDark.value = this.post.uDark;
    u.uImpact.value = this.impact > 0 && this.settings.flashes ? 1 : 0;
    if (this.impact > 0) this.impact--;
    this.pipeline.render(this.time);
    if (this.debugEl) { const c = this.cam.camera.position; this.debugEl.textContent = `hero ${h.pos.x.toFixed(1)},${h.y.toFixed(1)},${h.pos.z.toFixed(1)} st=${h.state} f=${h.facing.toFixed(2)} | cam ${c.x.toFixed(1)},${c.y.toFixed(1)},${c.z.toFixed(1)} d=${this.cam.dist.toFixed(1)} | en=${this.enemies.list.length} t=${this.time.toFixed(1)} nan=${this.enemies.list.filter((e) => isNaN(e.pos.x) || isNaN(e.y)).length}`; }
    this.overlay.update(dt, this.cam.camera, this.width, this.height);
  }

  private autoPlay() {
    this.autoT += FIXED;
    const h = this.hero;
    const t = this.boss && !this.boss.dead ? this.boss.pos : this.enemies.nearest(h.pos)?.pos;
    let mx = 0, my = 0;
    const acts: ('attack' | 'heavy' | 'dash' | 'jump' | 'special')[] = [];
    if (t) {
      const dx = t.x - h.pos.x, dz = t.z - h.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 3.5) { const s = Math.SQRT1_2; mx = (dx - dz) * s / d; my = (-dx - dz) * s / d; }
      if (d < 6 && Math.floor(this.autoT * 60) % 9 === 0) acts.push('attack');
    }
    if (Math.floor(this.autoT * 60) % 240 === 0) acts.push('jump');
    if (Math.floor(this.autoT * 60) % 240 === 12) acts.push('attack');
    if (h.special >= 1) acts.push('special');
    if (this.cutscene && Math.floor(this.autoT * 60) % 30 === 0) acts.push('attack');
    this.input.simulate(mx, my, acts);
  }

  // ---------- Juice ----------
  shake(trauma: number, punch: number, hitstopFrames: number) {
    this.cam.addTrauma(trauma);
    this.cam.addPunch(punch);
    this.hitstop = Math.max(this.hitstop, hitstopFrames);
    this.post.uAberration = Math.max(this.post.uAberration, punch);
  }
  impactFrames(n: number) { this.impact = Math.max(this.impact, n); }
  slowmo(factor: number, seconds: number) {
    this.timeScale = factor;
    this.slowT = seconds;
    audio.music.setSlowmo(Math.max(0.5, factor));
  }

  // ---------- Combat ----------
  heroStrike(o: StrikeOpts): number {
    let hits = 0;
    const hero = this.hero;
    const half = o.arc / 2;
    const inArc = (x: number, z: number) => {
      if (o.arc >= 6.2) return true;
      let d = Math.atan2(x - o.center.x, z - o.center.z) - o.facing;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return Math.abs(d) <= half;
    };
    for (const e of this.enemies.list) {
      if (!e.alive) continue;
      const dx = e.pos.x - o.center.x, dz = e.pos.z - o.center.z;
      const rr = o.radius + e.radius * 0.6;
      if (dx * dx + dz * dz > rr * rr) continue;
      if (e.y > hero.y + 5 || e.y < hero.y - 3) continue;
      if (!inArc(e.pos.x, e.pos.z)) continue;
      const dir = new THREE.Vector3(dx, 0, dz);
      if (dir.lengthSq() < 0.01) dir.set(Math.sin(o.facing), 0, Math.cos(o.facing));
      dir.normalize();
      if (this.enemies.hit(e, { dmg: o.dmg, dir, kb: o.kb, launch: o.launch || undefined, breaksGuard: o.guard, tag: o.tag, crit: o.crit, color: o.color })) hits++;
    }
    if (this.boss && !this.boss.dead && this.boss.reachable()) {
      const b = this.boss;
      for (const p of b.hitPoints()) {
        const dx = p.x - o.center.x, dz = p.z - o.center.z;
        const rr = o.radius + p.r * 0.8;
        if (dx * dx + dz * dz <= rr * rr && (inArc(p.x, p.z) || dx * dx + dz * dz < p.r * p.r)) {
          const dir = new THREE.Vector3(dx, 0, dz);
          if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1);
          if (b.takeHit({ dmg: o.dmg, dir: dir.normalize(), kb: o.kb, tag: o.tag, crit: o.crit, color: o.color, heavy: o.heavy })) hits++;
          break;
        }
      }
    }
    for (const p of this.props) {
      if (!p.alive) continue;
      const dx = p.position.x - o.center.x, dz = p.position.z - o.center.z;
      const rr = o.radius + p.radius;
      if (dx * dx + dz * dz <= rr * rr && inArc(p.position.x, p.position.z)) this.hitProp(p, o.tag);
    }
    hits += this.events.strike(o);
    if (hits > 0 && !o.quietSlash) {
      const heavy = o.heavy || o.crit;
      audio.play(o.crit ? 'crit' : heavy ? 'hitHeavy' : 'hit', { volume: Math.min(1.2, 0.7 + hits * 0.08) });
      this.shake(heavy ? 0.32 : 0.16, heavy ? 0.35 : 0.12, heavy ? 6 : 3);
      this.input.rumble(heavy ? 0.6 : 0.25, heavy ? 0.5 : 0.3, heavy ? 120 : 60);
      if (o.crit) this.impactFrames(1);
    } else if (hits > 0) {
      audio.play('hit', { volume: 0.5 });
    }
    return hits;
  }

  hitProp(p: GameProp, tag: number) {
    if (!p.alive || p.lastTag === tag) return;
    p.lastTag = tag;
    p.hits++;
    p.shakeT = 0.25;
    const top = p.position.clone().setY(1.5);
    this.fx.debris(top, p.debris, 5, 9, 0.35);
    audio.play('block', { pitch: 0.7, volume: 0.6 });
    if (p.hits >= p.hp) {
      p.alive = false;
      p.object.visible = false;
      this.fx.debris(top, p.debris, 18, 15, 0.6);
      this.fx.burst(top, PAL.bone, 12, 12, { size: 0.4, life: 0.4 });
      this.fx.ring(p.position, PAL.bone, 0.5, p.radius * 2.5, 0.3, 1.5);
      audio.play('smash', { pitch: 1.3, volume: 0.6 });
      this.addScore(200);
      if (Math.random() < 0.35) this.pickups.spawn(Math.random() < 0.25 && this.hero.lives < this.hero.maxLives ? 'corde' : 'note', p.position);
    }
  }

  private updateProps(dt: number) {
    for (const p of this.props) {
      if (!p.alive || p.shakeT <= 0) continue;
      p.shakeT -= dt;
      const k = Math.max(0, p.shakeT) * 4;
      p.object.rotation.set(p.baseRot.x + Math.sin(this.time * 70) * 0.08 * k, p.baseRot.y, p.baseRot.z + Math.cos(this.time * 60) * 0.08 * k);
      const s = 1 + 0.1 * k;
      p.object.scale.set(s, 1 - 0.1 * k, s);
      p.object.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material & { userData?: { flash?: { value: number } } };
        if (m && m.userData?.flash) m.userData.flash.value = k * 0.5;
      });
    }
  }

  autoTarget(pos: THREE.Vector3, range: number): THREE.Vector3 | null {
    const e = this.enemies.nearest(pos, range);
    if (this.boss && !this.boss.dead && this.boss.reachable()) {
      const bd = this.boss.pos.distanceTo(pos) - this.boss.radius;
      if (!e || bd < e.pos.distanceTo(pos)) return bd < range ? this.boss.pos : e ? e.pos : null;
    }
    return e ? e.pos : null;
  }

  private registerHit(dmg: number) {
    this.setCombo(this.combo + 1);
    this.comboTimer = 3;
    if (!this.hero.specialActive) this.hero.special = Math.min(1, this.hero.special + dmg / 430);
    this.addScore(10);
  }

  private setCombo(c: number) {
    this.combo = c;
    if (c > this.maxCombo) this.maxCombo = c;
    const n = nuanceOf(c);
    if (n !== this.nuance) {
      if (n > this.nuance) {
        audio.play('comboUp', { pitch: 1 + n * 0.1 });
        if (n >= 4) this.overlay.pop(NUANCE_NAMES[n].toUpperCase() + ' !', this.hero.pos.clone().setY(6), 'big');
        if (n >= 4 && n > this.nuanceBarked) {
          this.nuanceBarked = n;
          const lines = HERO_BARKS[this.hero.char].combo;
          this.dialogue.bark(this.hero.char, lines[Math.floor(Math.random() * lines.length)]);
        }
      }
      if (n === 0) this.nuanceBarked = 0;
      this.nuance = n;
      audio.music.setIntensity(this.events.forcedIntensity ?? n);
    }
  }

  addScore(base: number) { this.run.score += Math.round(base * NUANCE_MULT[this.nuance]); }

  onEnemyHit(_e: Enemy, dmg: number, _crit: boolean, blocked: boolean) {
    if (!blocked) this.registerHit(dmg);
  }

  onEnemyOut(e: Enemy) {
    audio.play('out', { pitch: 0.9 + Math.random() * 0.3 });
    this.overlay.pop('OUT !', e.pos.clone().setY(2.5), 'out');
    this.fx.burst(e.pos.clone().setY(1), PAL.combo, 10, 10, { size: 0.35, life: 0.5 });
  }

  onEnemyKilled(e: Enemy, out: boolean) {
    this.stageKills++;
    this.run.kills++;
    this.addScore((out ? 1.5 : 1) * (e.mutant ? 3 : 1) * ({ solfege: 100, surveillant: 80, maths: 150, cpe: 300, inspecteur: 600 })[e.kind]);
    if (!this.hero.specialActive) this.hero.special = Math.min(1, this.hero.special + 0.018);
    if (e.contaminated > 0) this.specials.onContaminatedDeath(e.pos);
    this.events.onKill(e);
    if (!out) {
      const r = Math.random();
      if (r < 0.025 && this.hero.lives < this.hero.maxLives) this.pickups.spawn('corde', e.pos);
      else if (r < 0.09) this.pickups.spawn('note', e.pos);
    }
  }

  onHeroHurt() {
    audio.play('stringSnap');
    audio.play('hurt');
    this.post.uHurt = 1;
    this.shake(0.55, 0.2, 5);
    this.input.rumble(1, 0.8, 250);
    if (this.combo >= 10) this.overlay.pop('COMBO CASSÉ', this.hero.pos.clone().setY(5), 'block');
    this.setCombo(0);
    if (Math.random() < 0.4) {
      const lines = HERO_BARKS[this.hero.char].hurt;
      this.dialogue.bark(this.hero.char, lines[Math.floor(Math.random() * lines.length)]);
    }
  }

  onHeroFell() {
    this.hero.lives = Math.max(0, this.hero.lives - 1);
    this.hero.damageTaken++;
    this.onHeroHurt();
    if (this.hero.lives <= 0) { this.hero.die(); return; }
    this.hero.respawn();
  }

  onHeroDead() {
    this.phase = 'gameover';
    this.phaseT = 0;
    this.slowmo(0.3, 1.6);
    this.impactFrames(2);
    audio.music.stop(1.5);
  }

  onSpecial() {
    const h = this.hero;
    audio.music.duck(0.5, 1.2);
    this.hitstop = Math.max(this.hitstop, 22);
    this.post.uAberration = 1;
    this.cam.addPunch(0.6);
    this.hud.set('cutin', { id: Date.now(), hero: h.char, name: SPECIAL_NAMES[h.char] });
    const lines = HERO_BARKS[h.char].special;
    this.dialogue.bark(h.char, lines[Math.floor(Math.random() * lines.length)]);
    this.input.rumble(0.6, 0.6, 300);
  }

  onBossHit(_b: Boss, dmg: number, crit: boolean) {
    this.registerHit(dmg);
    if (crit && Math.random() < 0.25) {
      const lines = HERO_BARKS[this.hero.char].boss;
      this.dialogue.bark(this.hero.char, lines[Math.floor(Math.random() * lines.length)]);
    }
  }

  onBossDying(b: Boss) {
    this.phase = 'bossDeath';
    this.phaseT = 0;
    this.slowmo(0.25, 1.4);
    this.impactFrames(3);
    this.shake(1, 0.9, 12);
    audio.play('bossDie');
    audio.music.stop(2);
    this.projectiles.clearEnemyShots();
    this.enemies.killAll('clear');
    const lines = BOSS_DEATH[b.id];
    this.overlay.clearBubbles();
    this.overlay.bubble(lines[Math.floor(Math.random() * lines.length)], () => b.pos.clone().setY(b.y + b.height + 1), 3.2, 'boss');
  }

  // ---------- Flow ----------
  private updatePhase(_dt: number) {
    if (this.phase === 'horde' && this.stageKills >= this.quota) {
      this.phase = 'bossIntro';
      this.phaseT = 0;
      this.events.stop();
      this.projectiles.clearEnemyShots();
      this.enemies.killAll('clear');
      this.shake(0.6, 0.4, 8);
      this.fx.ring(this.hero.pos, PAL.power, 1, 40, 1.2, 3);
      audio.play('eventSiren');
      audio.music.stop(1.5);
    }
    if (this.phase === 'bossIntro' && this.phaseT > 0.9 && !this.cutscene && !this.boss) {
      const id = BOSS_ORDER[this.stageNum - 1];
      const intro = BOSS_INTRO[id];
      const lines: Line[] = [
        { speaker: id, text: intro.boss[0] },
        { speaker: id, text: intro.boss[1] },
        { speaker: this.hero.char, text: intro.retort[this.hero.char] },
        { speaker: id, text: intro.boss[2] },
      ];
      this.boss = createBoss(this, id);
      this.dialogue.play(lines, true, () => {
        if (!this.boss) return;
        this.boss.mount();
        this.hud.set('bossIntro', { id: Date.now(), boss: id, name: this.boss.name, title: this.boss.title });
        this.hud.set('bossActive', true);
        this.phase = 'boss';
        this.phaseT = 0;
        audio.music.play('boss', this.stageNum);
      });
    }
    if (this.phase === 'bossDeath' && this.boss) {
      if (this.phaseT > 2.4 && this.boss.root.visible) {
        const p = this.boss.pos.clone().setY(this.boss.height * 0.5);
        this.fx.burst(p, PAL.bone, 120, 34, { size: 0.8, life: 1.2, up: 1.2 });
        this.fx.burst(p, PAL.power, 60, 26, { size: 0.6, life: 1, up: 1.2 });
        this.fx.debris(p, [PAL.bone, '#f4efe6', PAL.ink], 40, 22, 0.7);
        for (let i = 0; i < 4; i++) this.fx.ring(this.boss.pos, i % 2 ? PAL.bone : PAL.power, 1, 12 + i * 8, 0.6 + i * 0.2, 3);
        this.fx.splat(this.boss.pos, 12);
        this.shake(1, 0.7, 10);
        this.impactFrames(2);
        audio.play('explosion', { volume: 1.5, pitch: 0.7 });
        this.boss.root.visible = false;
        this.hud.set('bossActive', false);
        this.addScore(10000 * this.stageNum);
      }
      if (this.phaseT > 4.2) {
        this.phase = 'clear';
        this.phaseT = 0;
        audio.play(this.stageNum >= 7 ? 'victory' : 'stageClear');
        if (this.stageNum >= 7) {
          audio.music.play('victory');
          this.dialogue.play(VICTORY_LINES, true, () => this.finish('victory'));
        } else {
          setTimeout(() => this.finish('clear'), 1200);
        }
      }
    }
    if (this.phase === 'gameover' && this.phaseT > 2.2) {
      this.phaseT = -999;
      audio.play('gameOver');
      this.finish('gameover');
    }
  }

  private finish(kind: 'clear' | 'victory' | 'gameover') {
    if (this.disposed) return;
    this.run.lives = this.hero.lives;
    this.run.maxCombo = Math.max(this.run.maxCombo, this.maxCombo);
    this.run.time += this.stageTime;
    const stats: StageStats = {
      stage: this.stageNum,
      kills: this.stageKills,
      maxCombo: this.maxCombo,
      score: this.run.score - this.stageScoreStart,
      time: this.stageTime,
      damageTaken: this.hero.damageTaken,
      grade: this.grade(),
    };
    if (kind === 'clear') this.cb.onStageClear(this.run, stats);
    else if (kind === 'victory') this.cb.onVictory(this.run, stats);
    else this.cb.onGameOver(this.run, stats);
  }

  private grade() {
    const d = this.hero.damageTaken;
    const c = this.maxCombo;
    let pts = 0;
    pts += d === 0 ? 3 : d === 1 ? 2 : d <= 3 ? 1 : 0;
    pts += c >= 80 ? 3 : c >= 50 ? 2 : c >= 25 ? 1 : 0;
    pts += this.stageTime < 150 ? 1 : 0;
    return pts >= 6 ? 'S' : pts >= 4 ? 'A' : pts >= 3 ? 'B' : pts >= 1 ? 'C' : 'D';
  }

  private syncHud() {
    const h = this.hud;
    h.set('lives', this.hero.lives);
    h.set('score', this.run.score);
    h.set('combo', this.combo);
    h.set('comboTimer', Math.round(Math.max(0, this.comboTimer / 3) * 20) / 20);
    h.set('nuance', this.nuance);
    h.set('special', Math.round(this.hero.special * 50) / 50);
    h.set('kills', Math.min(this.stageKills, this.quota));
    h.set('hurt', Math.round(this.post.uHurt * 10) / 10);
    if (this.boss) {
      h.set('bossName', this.boss.name);
      h.set('bossHp', Math.round((this.boss.hp / this.boss.maxHp) * 200) / 200);
      h.set('bossInvulnerable', this.boss.invulnerable);
    }
    h.commit();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    this.input.dispose();
    this.overlay.dispose();
    this.dialogue.dispose();
    this.boss?.dispose();
    this.projectiles.dispose();
    this.specials.dispose();
    this.enemies.dispose();
    this.stage.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    this.pipeline.dispose();
  }
}
