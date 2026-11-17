import * as THREE from 'three';
import type { Game } from '../Game';
import type { CharacterType } from '../../types';
import { buildChicken, buildHero, buildLion, HeroRig } from '../models/heroes';
import { Rig } from '../models/builder';
import { HERO_COLORS, PAL } from '../palette';
import { audio } from '../audio/audio';
import { clamp01, inQuad, outQuad, Squash, strikeCurve } from '../core/anim';

export type HeroState = 'move' | 'attack' | 'heavy' | 'heavyRelease' | 'dash' | 'dashStrike' | 'smash' | 'hurt' | 'fall' | 'constricted' | 'dead';

interface Step { dur: number; at: number; arc: number; range: number; dmg: number; kb: number; launch: number; anim: 'sweepR' | 'sweepL' | 'overhead' | 'spin'; guard?: boolean }

const STEPS: Step[] = [
  { dur: 0.3, at: 0.09, arc: 2.7, range: 0, dmg: 22, kb: 9, launch: 0, anim: 'sweepR' },
  { dur: 0.3, at: 0.09, arc: 2.7, range: 0, dmg: 22, kb: 9, launch: 0, anim: 'sweepL' },
  { dur: 0.36, at: 0.13, arc: 1.8, range: 0.7, dmg: 30, kb: 13, launch: 0, anim: 'overhead' },
  { dur: 0.5, at: 0.16, arc: 7, range: 0.4, dmg: 46, kb: 22, launch: 11, anim: 'spin', guard: true },
];

export interface HeroMods { dmg: number; speed: number; atk: number; range: number }

export const HERO_MODS: Record<CharacterType, HeroMods> = {
  armand: { dmg: 1.0, speed: 1.0, atk: 0.95, range: 0.3 },
  adrien: { dmg: 0.82, speed: 1.1, atk: 1.35, range: 0 },
  eliot: { dmg: 1.0, speed: 1.0, atk: 1.05, range: 0.2 },
  swan: { dmg: 1.25, speed: 0.95, atk: 0.85, range: 0.2 },
  pierre: { dmg: 1.12, speed: 0.95, atk: 0.9, range: 0.5 },
  audrey: { dmg: 0.92, speed: 1.06, atk: 1.12, range: 1.0 },
};

const GRAV = 48;

export class Hero {
  root = new THREE.Group();
  rig: HeroRig;
  alt: Rig | null = null;
  altKind: 'lion' | 'chicken' | null = null;
  color: THREE.Color;
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  y = 0;
  vy = 0;
  facing = 0;
  radius = 0.9;
  lives = 5;
  maxLives = 5;
  iframes = 0;
  dead = false;
  state: HeroState = 'move';
  stateT = 0;
  comboStep = 0;
  comboWindow = 0;
  queued = false;
  struck = false;
  heavyCharge = 0;
  dashCd = 0;
  dashDir = new THREE.Vector3();
  airAttacked = false;
  special = 0;
  specialT = 0;
  specialActive = false;
  constrictJumps = 0;
  mods: HeroMods;
  runPhase = 0;
  spinExtra = 0;
  damageTaken = 0;
  light: THREE.PointLight;
  private tagBase = 0;
  attackTag = 0;
  invulnerableSpecial = false;
  speedBoost = 1;
  sq = new Squash(300, 14);
  fwd = new Squash(240, 12);
  lean = 0;
  private prevFacing = 0;
  dmgBoost = 1;

  constructor(private game: Game, public char: CharacterType) {
    this.rig = buildHero(char);
    this.root.add(this.rig.root);
    this.color = new THREE.Color(HERO_COLORS[char]);
    this.mods = HERO_MODS[char];
    this.light = new THREE.PointLight(this.color, 6, 12, 1.6);
    this.light.position.set(0, 6, 2);
    this.root.add(this.light);
  }

  get reach() { return (this.altKind === 'lion' ? 4.2 : this.rig.reach * 0.85) + 1.1 + this.mods.range; }

  newTag() { this.attackTag = ++this.tagBase + this.game.tagSalt; return this.attackTag; }

  canAct() { return !this.dead && this.state !== 'hurt' && this.state !== 'fall' && this.state !== 'constricted'; }

  vulnerable() {
    return !this.dead && this.iframes <= 0 && !this.invulnerableSpecial && this.state !== 'dash' && this.state !== 'fall' && !this.game.cutscene;
  }

  hurt(from: THREE.Vector3, dmg = 1): boolean {
    if (!this.vulnerable()) return false;
    this.lives = Math.max(0, this.lives - dmg);
    this.damageTaken += dmg;
    this.iframes = 1.3;
    this.sq.set(0.4);
    this.fwd.set(-0.35);
    const away = this.pos.clone().sub(from).setY(0);
    if (away.lengthSq() < 0.01) away.set(Math.random() - 0.5, 0, Math.random() - 0.5);
    away.normalize();
    this.vel.copy(away).multiplyScalar(16);
    this.vy = 6;
    this.y = Math.max(this.y, 0.01);
    if (this.state !== 'constricted') { this.state = 'hurt'; this.stateT = 0; }
    this.heavyCharge = 0;
    this.game.onHeroHurt();
    if (this.lives <= 0) this.die();
    return true;
  }

  die() {
    this.dead = true;
    this.state = 'dead';
    this.stateT = 0;
    this.endSpecial();
    this.game.onHeroDead();
  }

  heal(n = 1) { this.lives = Math.min(this.maxLives, this.lives + n); }

  respawn() {
    this.pos.set(0, 0, 0);
    this.vel.set(0, 0, 0);
    this.y = 18;
    this.vy = -5;
    this.state = 'move';
    this.iframes = 2.2;
    this.sq.set(-0.3);
    this.airAttacked = true;
  }

  setAlt(kind: 'lion' | 'chicken' | null) {
    if (this.alt) { this.root.remove(this.alt.root); this.alt = null; }
    this.altKind = kind;
    this.rig.root.visible = !kind;
    if (kind) {
      this.alt = kind === 'lion' ? buildLion() : buildChicken();
      this.root.add(this.alt.root);
      this.game.fx.burst(this.pos.clone().setY(2), this.color, 40, 18, { size: 0.5, life: 0.6 });
      this.game.fx.ring(this.pos, this.color, 0.5, 7, 0.5, 3);
    }
  }

  endSpecial() {
    this.specialActive = false;
    this.invulnerableSpecial = false;
    this.speedBoost = 1;
    this.dmgBoost = 1;
    this.spinExtra = 0;
    if (this.altKind) this.setAlt(null);
  }

  // Execution animation driven by the Finales system (world frozen).
  finalePose(t: number, dt: number) {
    const periods: Record<CharacterType, number> = { armand: 0.4, adrien: 0.11, eliot: 0.24, swan: 0.16, pierre: 0.2, audrey: 0 };
    const per = periods[this.char];
    if (per === 0 || t <= 0) {
      this.state = 'heavy';
      this.heavyCharge = t <= 0 ? 0.4 : 1;
    } else {
      this.state = 'attack';
      const step = this.char === 'adrien' || this.char === 'eliot' ? Math.floor(t / per) % 2 : 2;
      this.comboStep = step;
      const st = STEPS[step];
      this.stateT = ((t % per) / per) * (st.dur / this.mods.atk);
    }
    this.animate(dt);
  }

  private moveDir(out: THREE.Vector3) {
    const inp = this.game.input;
    const s = Math.SQRT1_2;
    out.set((inp.moveX - inp.moveY) * s, 0, (-inp.moveX - inp.moveY) * s);
    return out;
  }

  update(dt: number) {
    const g = this.game;
    const inp = g.input;
    this.stateT += dt;
    this.iframes = Math.max(0, this.iframes - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.comboWindow = Math.max(0, this.comboWindow - dt);
    const R = g.arenaRadius;
    const md = this.moveDir(new THREE.Vector3());
    const moving = md.lengthSq() > 0.01;
    const grounded = this.y <= 0.001;
    const baseSpeed = 15 * this.mods.speed * this.speedBoost;

    if (this.dead) {
      this.vel.multiplyScalar(Math.pow(0.01, dt));
      this.integrate(dt, R);
      this.animate(dt);
      return;
    }

    if (this.state === 'constricted') {
      this.vel.set(0, 0, 0);
      if (inp.pressed('jump') || inp.pressed('attack')) {
        this.constrictJumps++;
        this.y = 0.6;
        g.fx.burst(this.pos.clone().setY(2), this.color, 8, 10, { size: 0.3, life: 0.3 });
        g.overlay.pop(`${this.constrictJumps} / 6`, this.pos.clone().setY(4.5), 'score');
        audio.play('jump', { pitch: 1 + this.constrictJumps * 0.08 });
      }
      this.y = Math.max(0, this.y - dt * 4);
      this.animate(dt);
      return;
    }

    if (inp.pressed('special') && this.special >= 1 && this.canAct() && !this.specialActive) {
      g.specials.activate();
    }

    // State machine
    switch (this.state) {
      case 'move': {
        const k = 1 - Math.pow(grounded ? 0.00002 : 0.02, dt);
        this.vel.x += (md.x * baseSpeed - this.vel.x) * k;
        this.vel.z += (md.z * baseSpeed - this.vel.z) * k;
        if (moving) this.turnTo(Math.atan2(md.x, md.z), dt, 22);
        if (grounded && inp.pressed('jump')) this.jump();
        else if (inp.pressed('dash') && this.dashCd <= 0) this.startDash(md);
        else if (inp.pressed('attack')) {
          if (!grounded && !this.airAttacked) this.startSmash();
          else if (grounded) this.startStep(this.comboWindow > 0 ? this.comboStep : 0);
        } else if (inp.pressed('heavy') && grounded && g.finales.tryStart()) {
          // finale started
        } else if (inp.pressed('heavy') && grounded) {
          this.state = 'heavy'; this.stateT = 0; this.heavyCharge = 0;
          audio.play('charge');
        }
        break;
      }
      case 'attack': {
        const st = STEPS[this.comboStep];
        const dur = st.dur / this.mods.atk;
        const at = st.at / this.mods.atk;
        this.vel.multiplyScalar(Math.pow(0.002, dt));
        if (moving && this.stateT < at) this.turnTo(Math.atan2(md.x, md.z), dt, 30);
        if (!this.struck && this.stateT >= at) { this.struck = true; this.strike(st); }
        if (inp.pressed('attack') && this.stateT > at * 0.6) this.queued = true;
        if (inp.pressed('dash') && this.dashCd <= 0 && this.struck) { this.startDash(md); break; }
        if (inp.pressed('jump') && this.struck) { this.jump(); break; }
        if (this.stateT >= dur) {
          if (this.queued && this.comboStep < STEPS.length - 1) this.startStep(this.comboStep + 1);
          else if (this.queued) this.startStep(0);
          else {
            this.state = 'move';
            this.comboWindow = 0.4;
            this.comboStep = this.comboStep < STEPS.length - 1 ? this.comboStep + 1 : 0;
            this.spinExtra = 0;
          }
        }
        break;
      }
      case 'heavy': {
        this.heavyCharge = clamp01(this.stateT / 0.75);
        const k = 1 - Math.pow(0.001, dt);
        this.vel.x += (md.x * baseSpeed * 0.3 - this.vel.x) * k;
        this.vel.z += (md.z * baseSpeed * 0.3 - this.vel.z) * k;
        if (moving) this.turnTo(Math.atan2(md.x, md.z), dt, 10);
        if (Math.random() < 0.5) g.fx.burst(this.pos.clone().setY(1 + Math.random() * 2), this.color, 1, 4 + this.heavyCharge * 6, { size: 0.25, life: 0.3, grav: -6 });
        if (this.heavyCharge >= 1 && this.stateT < 0.75 + dt) { audio.play('specialReady', { pitch: 1.5, volume: 0.6 }); g.fx.ring(this.pos, this.color, 0.5, 3, 0.25, 3); }
        if (!inp.held('heavy') || this.stateT > 1.6) { this.state = 'heavyRelease'; this.stateT = 0; this.struck = false; }
        break;
      }
      case 'heavyRelease': {
        this.vel.multiplyScalar(Math.pow(0.001, dt));
        if (!this.struck && this.stateT > 0.08) {
          this.struck = true;
          const c = Math.max(0.25, this.heavyCharge);
          this.sq.set(0.55);
          const r = 4.5 + 3.5 * c;
          g.heroStrike({ center: this.pos, radius: r, arc: 7, facing: this.facing, dmg: (32 + 52 * c) * this.mods.dmg, kb: 16 + 16 * c, launch: 6 + 9 * c, guard: true, tag: this.newTag(), color: this.color, heavy: true, style: c > 0.6 ? 'flat' : 'pop' });
          g.fx.ring(this.pos, this.color, 0.5, r, 0.4, 3);
          g.fx.ring(this.pos, PAL.bone, 0.3, r * 0.7, 0.3, 1.5);
          g.fx.burst(this.pos.clone().setY(0.5), this.color, 30, 22, { size: 0.45, life: 0.5, up: 0.5 });
          g.fx.splat(this.pos, 3 + c * 2, PAL.void3);
          g.shake(0.35 + 0.35 * c, 0.4 * c + 0.2, c > 0.9 ? 8 : 5);
          audio.play('smash', { pitch: 1.1 - c * 0.2 });
          g.input.rumble(0.8 * c + 0.2, 0.6, 180);
        }
        if (this.stateT > 0.42) { this.state = 'move'; this.heavyCharge = 0; }
        break;
      }
      case 'dash': {
        if (this.stateT > 0.17) {
          this.state = 'move';
          this.vel.multiplyScalar(0.35);
        } else {
          this.vel.copy(this.dashDir).multiplyScalar(44);
          if (inp.pressed('attack')) { this.state = 'dashStrike'; this.stateT = 0; this.struck = false; }
          g.fx.burst(this.pos.clone().setY(1.6), this.color, 2, 2, { size: 0.5, life: 0.25, grav: 0 });
        }
        break;
      }
      case 'dashStrike': {
        this.vel.copy(this.dashDir).multiplyScalar(this.stateT < 0.1 ? 30 : 4);
        if (!this.struck && this.stateT > 0.05) {
          this.struck = true;
          g.heroStrike({ center: this.pos.clone().addScaledVector(this.dashDir, 1.5), radius: this.reach * 0.9, arc: 1.6, facing: this.facing, dmg: 32 * this.mods.dmg, kb: 16, launch: 0, guard: true, tag: this.newTag(), color: this.color });
          g.fx.slash(this.pos, this.facing - Math.PI / 2, this.color, this.reach / 4.4, 0.12, 1, 1.3);
          audio.play('swingHeavy');
        }
        if (this.stateT > 0.3) this.state = 'move';
        break;
      }
      case 'smash': {
        this.vel.multiplyScalar(Math.pow(0.05, dt));
        break;
      }
      case 'hurt':
        this.vel.multiplyScalar(Math.pow(0.02, dt));
        if (this.stateT > 0.32) this.state = 'move';
        break;
      case 'fall':
        if (this.y < -26) {
          g.onHeroFell();
        }
        break;
    }

    this.integrate(dt, R);
    if (this.state !== 'fall' && this.state !== 'dead') this.collideProps();
    this.animate(dt);
  }

  private integrate(dt: number, R: number) {
    const g = this.game;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    const r = Math.hypot(this.pos.x, this.pos.z);
    const outside = r > R;
    if (this.specialActive && this.char === 'armand' && outside) {
      const n = new THREE.Vector3(this.pos.x, 0, this.pos.z).normalize();
      this.pos.x = n.x * (R - 0.1); this.pos.z = n.z * (R - 0.1);
      const d = this.vel.dot(n);
      if (d > 0) this.vel.addScaledVector(n, -2 * d);
    }
    if (this.y > 0 || this.vy > 0 || outside || this.state === 'fall') {
      this.vy -= GRAV * dt * (this.state === 'smash' ? 2.2 : 1);
      this.y += this.vy * dt;
      const insideNow = Math.hypot(this.pos.x, this.pos.z) <= R;
      if (this.y <= 0 && insideNow && this.state !== 'fall') {
        const wasSmash = this.state === 'smash';
        const impact = this.vy;
        this.y = 0; this.vy = 0;
        this.airAttacked = false;
        if (wasSmash) this.landSmash();
        else if (impact < -4) { this.sq.set(Math.min(0.5, 0.12 - impact * 0.016)); if (impact < -12) { audio.play('land', { volume: 0.6 }); g.fx.ring(this.pos, PAL.bone, 0.3, 2, 0.25, 1); } }
      } else if (this.y <= 0 && !insideNow && this.state !== 'fall' && this.state !== 'dead') {
        this.state = 'fall'; this.stateT = 0;
        this.endSpecial();
        audio.play('out', { pitch: 0.8 });
      }
    }
  }

  private collideProps() {
    for (const p of this.game.props) {
      if (!p.alive) continue;
      const dx = this.pos.x - p.position.x, dz = this.pos.z - p.position.z;
      const rr = p.radius + this.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-6 && this.y < 2.5) {
        const d = Math.sqrt(d2);
        this.pos.x += dx / d * (rr - d);
        this.pos.z += dz / d * (rr - d);
        if (this.state === 'dash' || (this.specialActive && this.char === 'armand')) this.game.hitProp(p, this.newTag());
      }
    }
  }

  private turnTo(target: number, dt: number, speed: number) {
    let d = target - this.facing;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.facing += d * Math.min(1, dt * speed);
  }

  private jump() {
    this.vy = 17;
    this.sq.set(-0.42);
    this.y = 0.01;
    this.state = 'move';
    audio.play('jump');
    this.game.fx.ring(this.pos, PAL.bone, 0.3, 1.6, 0.2, 1);
  }

  private startDash(md: THREE.Vector3) {
    this.state = 'dash';
    this.stateT = 0;
    this.dashCd = 0.42;
    this.fwd.set(0.55);
    this.sq.set(0.12);
    this.iframes = Math.max(this.iframes, 0.25);
    if (md.lengthSq() > 0.01) { this.dashDir.copy(md).normalize(); this.facing = Math.atan2(md.x, md.z); }
    else this.dashDir.set(Math.sin(this.facing), 0, Math.cos(this.facing));
    audio.play('dash');
    this.game.fx.ring(this.pos, this.color, 0.3, 2.2, 0.2, 2);
  }

  private startStep(i: number) {
    this.comboStep = i;
    this.spinExtra = 0;
    this.state = 'attack';
    this.stateT = 0;
    this.queued = false;
    this.struck = false;
    const md = this.moveDir(new THREE.Vector3());
    if (md.lengthSq() > 0.01) this.facing = Math.atan2(md.x, md.z);
    else {
      const t = this.game.autoTarget(this.pos, 9);
      if (t) this.facing = Math.atan2(t.x - this.pos.x, t.z - this.pos.z);
    }
    this.vel.set(Math.sin(this.facing), 0, Math.cos(this.facing)).multiplyScalar(i === 3 ? 6 : 9);
    this.sq.hit(3.5);
    audio.play(i === 3 ? 'swingHeavy' : 'swing', { pitch: 0.9 + i * 0.08 });
  }

  private strike(st: Step) {
    const g = this.game;
    const crit = Math.random() < 0.12;
    this.fwd.hit(7);
    this.sq.hit(-4);
    const dmg = st.dmg * this.mods.dmg * this.dmgBoost * (crit ? 1.8 : 1) * (this.altKind === 'lion' ? 1.6 : 1);
    const range = this.reach + st.range;
    const style = st.anim === 'overhead' ? (this.char === 'armand' || this.char === 'pierre' ? 'stake' : 'flat') : 'pop';
    g.heroStrike({ center: this.pos, radius: range, arc: st.arc, facing: this.facing, dmg, kb: st.kb * (this.altKind === 'lion' ? 1.4 : 1), launch: st.launch, guard: !!st.guard, tag: this.newTag(), crit, color: this.color, heavy: st.anim === 'spin', finisher: st.anim === 'spin', style });
    const scale = range / 4.6;
    if (st.anim === 'spin') {
      g.fx.slash(this.pos, this.facing, this.color, scale, 0.22, 1, 1.2);
      g.fx.slash(this.pos, this.facing + Math.PI, this.color, scale, 0.22, 1, 1.2);
      g.fx.ring(this.pos, this.color, 0.5, range, 0.3, 2.5);
    } else {
      const dir = st.anim === 'sweepL' ? -1 : 1;
      g.fx.slash(this.pos, this.facing - Math.PI / 2, this.color, scale, 0.16, dir, st.anim === 'overhead' ? 0.6 : 1.35);
    }
  }

  private startSmash() {
    this.state = 'smash';
    this.sq.set(-0.45);
    this.stateT = 0;
    this.airAttacked = true;
    this.vy = Math.min(this.vy, -28);
    audio.play('swingHeavy', { pitch: 0.8 });
  }

  private landSmash() {
    const g = this.game;
    this.state = 'move';
    this.comboWindow = 0;
    g.heroStrike({ center: this.pos, radius: 5.8, arc: 7, facing: this.facing, dmg: 34 * this.mods.dmg * this.dmgBoost, kb: 10, launch: 13, guard: true, tag: this.newTag(), color: this.color, heavy: true, style: 'flat' });
    this.sq.set(0.6);
    g.fx.ring(this.pos, this.color, 0.5, 6.5, 0.35, 3);
    g.fx.burst(this.pos.clone().setY(0.4), this.color, 24, 18, { size: 0.4, life: 0.45, up: 0.4 });
    g.fx.splat(this.pos, 4, PAL.void3);
    g.shake(0.45, 0.3, 6);
    audio.play('smash');
    g.input.rumble(0.7, 0.5, 160);
  }

  private animate(dt: number) {
    const P = this.rig.pivots;
    const t = this.game.time;
    this.sq.update(dt);
    this.fwd.update(dt);
    this.root.position.set(this.pos.x, this.y, this.pos.z);
    const blink = this.iframes > 0 && this.state !== 'dash' && !this.dead && Math.floor(t * 18) % 2 === 0;
    this.root.visible = !blink;
    this.rig.mat.userData.flash.value = this.state === 'heavy' ? this.heavyCharge * 0.35 * (0.6 + 0.4 * Math.sin(t * 30)) : 0;
    const spd = Math.hypot(this.vel.x, this.vel.z);
    this.runPhase += dt * (5 + spd * 0.85);
    const run = Math.min(1, spd / 12) * (this.y > 0 ? 0.3 : 1);
    const raw = Math.sin(this.runPhase);
    const sw = Math.sign(raw) * Math.pow(Math.abs(raw), 0.55);
    let df = this.facing - this.prevFacing;
    while (df > Math.PI) df -= Math.PI * 2;
    while (df < -Math.PI) df += Math.PI * 2;
    this.prevFacing = this.facing;
    const leanTarget = Math.max(-0.4, Math.min(0.4, (-df / Math.max(dt, 1e-4)) * 0.035 * run));
    this.lean += (leanTarget - this.lean) * Math.min(1, dt * 14);
    const airStretch = this.y > 0.05 && this.state !== 'smash' ? Math.min(0.28, Math.abs(this.vy) * 0.013) : 0;
    const bounce = Math.abs(raw);
    const step = 1 + 0.08 * run * (bounce * 2 - 1);
    const breathe = run < 0.1 ? 1 + Math.sin(t * 3.2) * 0.025 : 1;
    const f = this.fwd.x;
    const sy = this.sq.sy * (1 + airStretch) * step * breathe * (1 - f * 0.25);
    const sxz = this.sq.sxz * (1 - airStretch * 0.45) / Math.sqrt(step);
    const target = this.alt ? this.alt.root : this.rig.root;
    target.rotation.order = 'YXZ';
    target.scale.set(sxz * (1 - f * 0.2), sy, sxz * (1 + f * 0.8));

    if (this.alt) {
      const A = this.alt.pivots;
      target.rotation.set(run * 0.15, this.facing + this.spinExtra, this.lean);
      const s = sw * run;
      if (A.legL) A.legL.rotation.x = s * 1.1;
      if (A.legR) A.legR.rotation.x = -s * 1.1;
      if (A.legBL) A.legBL.rotation.x = -s * 1.1;
      if (A.legBR) A.legBR.rotation.x = s * 1.1;
      A.hips.position.y = 1.6 + bounce * 0.35 * run;
      if (A.head) A.head.rotation.x = this.state === 'attack' ? -0.5 * strikeCurve(this.stateT, 0.08, 0.3) : Math.sin(t * 8) * 0.1;
      return;
    }

    const root = this.rig.root;
    root.rotation.set(0, this.facing + this.spinExtra, this.lean);
    P.hips.position.y = 0.95 + bounce * 0.2 * run;
    P.hips.rotation.set(0, 0, 0);
    P.legL.rotation.set(sw * 1.05 * run, 0, 0);
    P.legR.rotation.set(-sw * 1.05 * run, 0, 0);
    P.torso.rotation.set(run * 0.35, -sw * 0.18 * run, 0);
    P.head.rotation.set(-run * 0.2 + Math.sin(t * 3) * 0.03, sw * 0.12 * run, Math.sin(t * 3) * 0.05);
    P.armL.rotation.set(-sw * 1.0 * run, 0, 0.15 + run * 0.2);
    P.armR.rotation.set(sw * 0.7 * run - 0.25, 0, -0.15 - run * 0.2);
    P.weapon.rotation.set(0.9, 0, 0);
    if (P.weapon2) P.weapon2.rotation.set(0.9, 0, 0);

    switch (this.state) {
      case 'attack': {
        const st = STEPS[this.comboStep];
        const at = st.at / this.mods.atk, dur = st.dur / this.mods.atk;
        const v = strikeCurve(this.stateT, at, dur, 0.3, 0.16);
        if (st.anim === 'sweepR' || st.anim === 'sweepL') {
          const d = st.anim === 'sweepR' ? 1 : -1;
          P.torso.rotation.y = d * (1.2 - 2.7 * v);
          P.hips.rotation.y = -P.torso.rotation.y * 0.25;
          P.torso.rotation.x = 0.15 + 0.2 * Math.max(0, v);
          P.armR.rotation.set(-Math.PI / 2, 0, d * 0.25);
          P.weapon.rotation.set(Math.PI, 0, 0);
          P.armL.rotation.set(-0.6, 0, 0.9 * d);
          if (P.weapon2) { P.armL.rotation.set(-Math.PI / 2 + 0.3, 0, 0); P.weapon2.rotation.set(Math.PI, 0, 0); }
          P.head.rotation.y = -P.torso.rotation.y * 0.4;
        } else if (st.anim === 'overhead') {
          P.armR.rotation.set(-Math.PI * 1.05 + 2.6 * v, 0, 0);
          P.weapon.rotation.set(Math.PI, 0, 0);
          P.torso.rotation.x = -0.35 + 0.9 * v;
          P.hips.position.y = 0.95 - 0.18 * Math.max(0, v);
          if (P.weapon2) { P.armL.rotation.set(-Math.PI * 1.05 + 2.6 * v, 0, 0); P.weapon2.rotation.set(Math.PI, 0, 0); }
          else P.armL.rotation.set(-Math.PI * 1.05 + 2.4 * v, 0, 0.3);
        } else {
          this.spinExtra = -Math.PI * 2 * Math.min(1, Math.max(-0.08, v));
          P.armR.rotation.set(-Math.PI / 2, 0, -0.5);
          P.weapon.rotation.set(Math.PI, 0, 0);
          P.armL.rotation.set(-Math.PI / 2, 0, 0.5);
          P.torso.rotation.x = 0.25;
          P.hips.position.y = 0.95 - 0.2 * Math.max(0, Math.min(1, v));
        }
        P.legL.rotation.x = 0.45; P.legR.rotation.x = -0.55;
        break;
      }
      case 'heavy': {
        const c = this.heavyCharge;
        const tremble = Math.sin(t * 55) * 0.04 * c;
        P.armR.rotation.set(-Math.PI * 1.15 - c * 0.2, 0, -0.2);
        P.armL.rotation.set(-Math.PI * 1.15 - c * 0.2, 0, 0.2);
        P.weapon.rotation.set(Math.PI, 0, 0);
        if (P.weapon2) P.weapon2.rotation.set(Math.PI, 0, 0);
        P.hips.position.y = 0.95 - 0.28 * outQuad(c) + tremble;
        P.torso.rotation.x = -0.45 * outQuad(c);
        P.legL.rotation.x = 0.6 * c; P.legR.rotation.x = -0.6 * c;
        this.sq.x += (0.3 * c - this.sq.x) * Math.min(1, dt * 12);
        root.rotation.z = tremble;
        break;
      }
      case 'heavyRelease': {
        const k = inQuad(this.stateT / 0.08);
        P.armR.rotation.set(-Math.PI * 1.35 + 3.2 * k, 0, 0);
        P.armL.rotation.set(-Math.PI * 1.35 + 3.2 * k, 0, 0);
        P.weapon.rotation.set(Math.PI, 0, 0);
        if (P.weapon2) P.weapon2.rotation.set(Math.PI, 0, 0);
        P.torso.rotation.x = -0.45 + 1.25 * k;
        P.hips.position.y = 0.95 - 0.35 * k;
        break;
      }
      case 'dash':
      case 'dashStrike':
        P.torso.rotation.x = 0.85;
        P.head.rotation.x = -0.5;
        P.armL.rotation.set(1.4, 0, 0.4);
        P.armR.rotation.set(this.state === 'dashStrike' ? -Math.PI / 2 : 1.4, 0, -0.4);
        P.weapon.rotation.set(this.state === 'dashStrike' ? Math.PI : 0.3, 0, 0);
        P.legL.rotation.x = -1.0; P.legR.rotation.x = 0.8;
        this.fwd.x = Math.max(this.fwd.x, this.state === 'dash' ? 0.35 : 0.2);
        break;
      case 'smash':
        P.armR.rotation.set(-Math.PI * 1.15, 0, 0);
        P.armL.rotation.set(-Math.PI * 1.15, 0, 0);
        P.weapon.rotation.set(Math.PI, 0, 0);
        P.legL.rotation.x = -1.3; P.legR.rotation.x = -1.3;
        this.sq.x = Math.min(this.sq.x, -0.35);
        break;
      case 'hurt': {
        const k = outQuad(this.stateT / 0.32);
        P.torso.rotation.x = -0.7 * (1 - k);
        P.head.rotation.x = -0.5 * (1 - k);
        P.armL.rotation.set(-1.8, 0, 1.2); P.armR.rotation.set(-1.8, 0, -1.2);
        break;
      }
      case 'fall':
      case 'dead':
        P.torso.rotation.x = -0.8;
        P.armL.rotation.set(-2.7, 0, 0.9 + Math.sin(t * 25) * 0.3); P.armR.rotation.set(-2.7, 0, -0.9 - Math.sin(t * 25) * 0.3);
        P.legL.rotation.x = Math.sin(t * 24) * 0.8; P.legR.rotation.x = -Math.sin(t * 24) * 0.8;
        if (this.state === 'dead') root.rotation.x = -1.5 * outQuad(this.stateT * 3);
        break;
      case 'constricted':
        P.armL.rotation.set(-2.8, 0, 0.5); P.armR.rotation.set(-2.8, 0, -0.5);
        P.torso.rotation.y = Math.sin(t * 25) * 0.3;
        break;
      case 'move':
        if (this.y > 0.01) {
          const up = this.vy > 0;
          P.legL.rotation.x = up ? -0.9 : 0.4; P.legR.rotation.x = up ? 0.5 : -0.3;
          P.armL.rotation.set(up ? -2.4 : -0.6, 0, 1.0); P.armR.rotation.set(up ? -2.4 : -0.6, 0, -1.0);
        }
        break;
    }
    if (this.specialActive && this.char === 'armand') {
      this.spinExtra += dt * 22;
      P.armR.rotation.set(-Math.PI / 2, 0, -0.3);
      P.weapon.rotation.set(Math.PI, 0, 0);
      P.armL.rotation.set(-Math.PI / 2, 0, 0.3);
    }
  }
}

export { STEPS };
