import * as THREE from 'three';
import type { Game } from '../Game';
import { ArenaBoss, TAU, angleOf, clamp01, dirOf, easeOut, rectAngle, wrapAngle } from './kit';
import { box, buildRig, cone, PivotDef, Rig, sph, tor } from '../models/builder';
import { PAL } from '../palette';
import { audio } from '../audio/audio';

const SCALE = '#1d5c45';
const SCALE2 = '#14402f';
const BELLY = '#d8c98a';
const GLOW_W = '#e8fbff';

const N = 18;
const RAD = Array.from({ length: N }, (_, i) => (i < 6 ? 1.1 + 0.08 * i : 1.5 - ((i - 6) / (N - 7)) * 1.1));
const SPACING = Array.from({ length: N }, (_, i) => (i === 0 ? 1.6 : (RAD[i - 1] + RAD[i]) * 0.62));
const WHIP_STEP = 0.62;
const SWEEP_R = 2.4 + (N - 1) * WHIP_STEP + 0.6;
const COIL_N = 9;
const LUNGE_W = 3.4;

type BodyMode = 'chain' | 'coil' | 'whip';

// Le Serpent (final boss): a giant cobra made of a chain of segments following the head.
// Slithers in S-curves, sweeps its tail around (telegraphed circle, jump over it), lunges
// (telegraphed) and constricts the hero: invulnerable while squeezing, 1 damage every 2 s,
// the hero mashes 6 times to escape, then the snake is stunned (bonus damage).
// Phase 2: faster lunges, venom spit fan, double tail sweep.
export class Serpent extends ArenaBoss {
  rig: Rig;
  private seg: THREE.Vector3[] = [];
  private mode: BodyMode = 'chain';
  private lift = 3.2;
  private liftWant = 3.2;
  private pitch = 0;
  private hood = 1;
  private jaw = 0;
  private lastDt = 1 / 60;
  private lungeCd = 2;
  private lungeDir = new THREE.Vector3();
  private from = new THREE.Vector3();
  private to = new THREE.Vector3();
  private whipA = 0;
  private whipPrev = 0;
  private whipSign = 1;
  private whipRaise = 0;
  private swept = false;
  private squeezeT = 0;
  private coilA = 0;
  private coilOut = new THREE.Vector3();
  private lastPresses = 0;
  private wave = 0;
  private decide = 0;
  private venom: THREE.Mesh;
  private rattle: THREE.Mesh;
  private tmp = new THREE.Vector3();

  constructor(game: Game) {
    super(game, 'serpent');
    this.radius = 2.3;
    this.height = 6.5;
    const defs: PivotDef[] = [
      { name: 'head', at: [0, 3.2, 0], parts: [
        sph(1.45, SCALE, [0, 0.1, 0.3], [1.2, 0.72, 1.5]),
        sph(1.0, SCALE2, [0, 0.45, 1.3], [1.15, 0.5, 1.2]),
        sph(0.8, BELLY, [0, -0.35, 0.6], [1.2, 0.4, 1.4]),
        sph(0.42, PAL.danger, [-0.85, 0.48, 1.15], [1, 0.9, 0.75], 3.4), sph(0.42, PAL.danger, [0.85, 0.48, 1.15], [1, 0.9, 0.75], 3.4),
        box(0.08, 0.5, 0.15, PAL.ink, [-0.88, 0.48, 1.45]), box(0.08, 0.5, 0.15, PAL.ink, [0.88, 0.48, 1.45]),
        box(1.0, 0.2, 0.4, PAL.ink, [-0.75, 0.85, 1.1], [0, 0.2, -0.35]), box(1.0, 0.2, 0.4, PAL.ink, [0.75, 0.85, 1.1], [0, -0.2, 0.35]),
        sph(0.1, PAL.ink, [-0.3, 0.3, 2.45]), sph(0.1, PAL.ink, [0.3, 0.3, 2.45]),
        cone(0.16, 0.7, '#ffffff', [-0.55, -0.45, 2.0], [Math.PI, 0, 0], 6), cone(0.16, 0.7, '#ffffff', [0.55, -0.45, 2.0], [Math.PI, 0, 0], 6),
        sph(0.16, GLOW_W, [0, 0.75, 0.2], [1, 0.5, 1.6], 2.4), sph(0.12, PAL.danger, [0, 0.72, -0.5], [1, 0.5, 1.4], 2.6),
        sph(0.12, GLOW_W, [-0.5, 0.65, -0.2], [1, 0.5, 1.2], 2.2), sph(0.12, GLOW_W, [0.5, 0.65, -0.2], [1, 0.5, 1.2], 2.2),
      ] },
      { name: 'jaw', parent: 'head', at: [0, -0.35, -0.2], parts: [
        sph(1.15, SCALE, [0, -0.1, 1.2], [1.1, 0.32, 1.35]),
        sph(0.9, '#8a1f2c', [0, 0.08, 1.2], [1, 0.15, 1.2]),
        cone(0.1, 0.45, '#ffffff', [-0.55, 0.25, 2.1], [0, 0, 0], 5), cone(0.1, 0.45, '#ffffff', [0.55, 0.25, 2.1], [0, 0, 0], 5),
      ] },
      { name: 'tongue', parent: 'jaw', at: [0, 0.1, 1.6], parts: [box(0.14, 0.05, 1.6, '#d6335a', [0, 0, 0.8]), box(0.08, 0.05, 0.6, '#d6335a', [-0.12, 0, 1.75], [0, -0.4, 0]), box(0.08, 0.05, 0.6, '#d6335a', [0.12, 0, 1.75], [0, 0.4, 0])] },
      { name: 'hood', parent: 'head', at: [0, -0.4, -0.9], parts: [
        sph(2.5, SCALE, [0, -0.8, 0], [1.3, 1.15, 0.2]),
        sph(2.0, BELLY, [0, -0.9, 0.18], [1.15, 1.0, 0.1]),
        sph(0.42, PAL.danger, [-1.35, -0.3, -0.45], [1, 1.3, 0.3], 3), sph(0.42, PAL.danger, [1.35, -0.3, -0.45], [1, 1.3, 0.3], 3),
        tor(0.6, 0.09, GLOW_W, [-1.35, -0.3, -0.48], [0, 0, 0], TAU, 2.2), tor(0.6, 0.09, GLOW_W, [1.35, -0.3, -0.48], [0, 0, 0], TAU, 2.2),
        sph(0.18, GLOW_W, [-2.2, -1.2, 0.2], 1, 2.2), sph(0.18, GLOW_W, [2.2, -1.2, 0.2], 1, 2.2),
        sph(0.18, PAL.danger, [-1.5, -2.2, 0.2], 1, 2.6), sph(0.18, PAL.danger, [1.5, -2.2, 0.2], 1, 2.6),
        sph(0.22, GLOW_W, [0, -2.6, 0.22], 1, 2.2),
      ] },
    ];
    for (let i = 0; i < N; i++) {
      const r = RAD[i];
      const parts = [
        sph(r, i % 2 ? SCALE : SCALE2, [0, 0, 0], [1, 0.85, 1.3]),
        sph(r * 0.85, BELLY, [0, -r * 0.38, 0], [1, 0.55, 1.25]),
        sph(r * 0.3, i % 3 === 0 ? PAL.danger : GLOW_W, [0, r * 0.8, 0], [1, 0.45, 1.8], i % 3 === 0 ? 2.8 : 2.2),
        sph(r * 0.16, GLOW_W, [-r * 0.78, r * 0.35, 0], [0.5, 1, 1.4], 2), sph(r * 0.16, GLOW_W, [r * 0.78, r * 0.35, 0], [0.5, 1, 1.4], 2),
      ];
      if (i === N - 1) parts.push(cone(r * 0.9, 2.4, SCALE2, [0, 0, -1.6], [-Math.PI / 2, 0, 0], 10), sph(r * 0.6, PAL.danger, [0, 0, -2.8], [1, 1, 1.6], 2.8));
      defs.push({ name: 'seg' + i, parts });
    }
    this.rig = buildRig(defs, 0.08);
    const P = this.rig.pivots;
    this.venom = this.glowOrb(P.head, [0, -0.2, 2.6], 0.5);
    this.rattle = this.glowOrb(P['seg' + (N - 1)], [0, 0, -2.8], 0.7);
    // Start coiled around the drop point.
    let a = 0, r = 2.6;
    for (let i = 0; i < N; i++) {
      a += SPACING[i] / r;
      r += 0.22;
      this.seg.push(new THREE.Vector3(this.pos.x + Math.sin(a) * r, RAD[i], this.pos.z + Math.cos(a) * r));
    }
  }

  reachable() { return this.y < 3.5; }

  protected contactDamage(hurts = false) {
    if (this.phase === 'constrict') return;
    super.contactDamage(hurts);
  }

  think(dt: number) {
    const g = this.game;
    const P = this.rig.pivots;
    const t = this.phaseT;
    const enr = this.enraged;
    const toHero = this.toHero();
    const dist = toHero.length();
    this.lastDt = dt;
    this.lungeCd -= dt;
    this.invulnerable = this.phase === 'constrict';
    this.bonus = this.phase === 'stunned' ? 1.5 : 1;
    this.mode = 'chain';
    this.liftWant = 3.2;
    this.pitch = 0;
    this.jaw = 0.05;
    this.venom.visible = false;
    this.rattle.visible = false;
    let hoodWant = 1;
    let tongue = Math.max(0, Math.sin(g.time * 5)) > 0.85 ? 1 : 0.15;

    switch (this.phase) {
      case 'idle': {
        this.faceHero(dt, 3);
        this.liftWant = 4.6;
        hoodWant = 1.35;
        this.jaw = 0.5;
        tongue = 1;
        if (t < dt * 1.5) audio.play('hiss');
        if (t > 1.0) this.setPhase('slither');
        break;
      }
      case 'slither': {
        const sp = enr ? 11 : 8.5;
        this.wave += dt * (enr ? 5 : 4);
        const fwd = dist > 0.01 ? toHero.clone().divideScalar(dist) : dirOf(this.facing);
        const side = this.tmp.set(fwd.z, 0, -fwd.x);
        const want = fwd.clone().multiplyScalar(dist > 6 ? sp : sp * 0.3).addScaledVector(side, Math.sin(this.wave) * sp * 0.75);
        this.vel.lerp(want, 0.08);
        if (this.vel.lengthSq() > 1) {
          const diff = wrapAngle(angleOf(this.vel) - this.facing);
          this.facing += diff * Math.min(1, dt * 5);
        }
        this.liftWant = 3.0 + Math.sin(this.wave * 0.5) * 0.3;
        this.decide -= dt;
        if (this.decide <= 0 && t > 0.6) {
          this.decide = 0.25;
          if (dist < (enr ? 11 : 9.5) && this.lungeCd <= 0) this.setPhase('lungeTele');
          else if (t > 1.3 && dist < SWEEP_R - 2 && Math.random() < 0.35) this.setPhase('sweepTele');
          else if (enr && t > 1.0 && dist > 7 && Math.random() < 0.3) this.setPhase('spitTele');
          else if (t > 3.2) this.setPhase(dist < SWEEP_R - 1 ? 'sweepTele' : enr ? 'spitTele' : 'lungeTele');
        }
        break;
      }
      case 'lungeTele': {
        const D = enr ? 0.6 : 0.85;
        const len = enr ? 13 : 11;
        if (t < dt * 1.5) {
          this.faceHero(1, 1);
          dirOf(this.facing, this.lungeDir);
          const L = Math.min(len, this.edgeDist(this.pos, this.lungeDir, 0.3));
          this.from.copy(this.pos);
          this.to.copy(this.pos).addScaledVector(this.lungeDir, L);
          g.fx.telegraphRect(this.pos, rectAngle(this.lungeDir), L + 2.5, LUNGE_W, D);
          audio.play('telegraph');
          audio.play('hiss', { pitch: 0.8 });
        }
        this.vel.multiplyScalar(0.5);
        const k = easeOut(t / D);
        this.liftWant = 3.2 + 2.6 * k;
        this.pitch = -0.5 * k;
        hoodWant = 1 + 0.5 * k;
        this.jaw = 0.1 + 0.5 * k;
        tongue = 1;
        this.pos.addScaledVector(this.lungeDir, -dt * 2.5 * (1 - k));
        if (t > D) { this.from.copy(this.pos); this.setPhase('lunge'); audio.play('screech', { pitch: 0.6 }); }
        break;
      }
      case 'lunge': {
        const DT = enr ? 0.2 : 0.26;
        const k = clamp01(t / DT);
        this.vel.set(0, 0, 0);
        this.pos.lerpVectors(this.from, this.to, easeOut(k));
        this.facing = angleOf(this.lungeDir);
        this.liftWant = 1.6;
        this.lift = Math.min(this.lift, 5.8 - 4.2 * k);
        this.pitch = 0.35;
        this.jaw = 0.9;
        hoodWant = 1.5;
        const h = this.hero;
        const snout = this.tmp.copy(this.pos).addScaledVector(this.lungeDir, 1.6);
        const hd = Math.hypot(h.pos.x - snout.x, h.pos.z - snout.z);
        if (hd < 2.1 + h.radius && h.y < 2.6 && h.vulnerable() && h.canAct()) { this.startConstrict(); break; }
        this.hitEnemiesIn(snout, 2.5, 30, 14, 6, this.sweepTag());
        if (t > DT) {
          g.fx.ring(snout, PAL.bone, 0.5, 4, 0.3, 1.5);
          g.fx.debris(snout.clone().setY(0.3), ['#3a5a2a', PAL.ink], 8, 8, 0.4);
          g.shake(0.35, 0.25, 3);
          audio.play('smash', { pitch: 1.1, volume: 0.6 });
          this.lungeCd = enr ? 1.6 : 2.6;
          this.setPhase('lungeMiss');
        }
        break;
      }
      case 'lungeMiss':
        this.vel.multiplyScalar(0.6);
        this.liftWant = 1.0;
        this.pitch = 0.3;
        this.jaw = 0.4;
        hoodWant = 0.85;
        if (t > 0.5) this.stars(2.5);
        if (t > (enr ? 1.0 : 1.3)) this.setPhase('slither');
        break;
      case 'constrict': {
        const h = this.hero;
        this.vel.set(0, 0, 0);
        this.mode = 'coil';
        this.coilA += dt * 1.6;
        this.squeezeT += dt;
        this.liftWant = 4.4;
        this.pitch = 0.25;
        this.jaw = 0.55 + Math.sin(t * 6) * 0.1;
        hoodWant = 1.45;
        tongue = 1;
        this.pos.set(h.pos.x + this.coilOut.x * 2.9, 0, h.pos.z + this.coilOut.z * 2.9);
        this.facing = angleOf(this.coilOut) + Math.PI;
        if (h.constrictJumps > this.lastPresses) {
          this.lastPresses = h.constrictJumps;
          this.squash = 0.3;
          g.fx.burst(h.pos.clone().setY(2), PAL.bone, 6, 9, { size: 0.3, life: 0.3 });
          g.shake(0.12, 0.08, 0);
        }
        if (this.squeezeT >= 2) {
          this.squeezeT = 0;
          this.squash = 0.4;
          audio.play('hiss', { pitch: 0.7 });
          g.fx.ring(h.pos, PAL.danger, 0.5, 3.5, 0.3, 2.5);
          if (h.vulnerable()) h.hurt(this.pos);
        }
        if (h.dead || h.state !== 'constricted') { this.endConstrict(false); this.setPhase('slither'); break; }
        if (h.constrictJumps >= 6) { this.endConstrict(true); this.setPhase('stunned'); break; }
        if (t > 9) { this.endConstrict(true); this.setPhase('lungeMiss'); }
        break;
      }
      case 'stunned':
        this.vel.multiplyScalar(0.7);
        this.liftWant = 0.9;
        this.pitch = 0.45;
        this.jaw = 0.7;
        tongue = 1;
        hoodWant = 0.7;
        this.stars(2.8);
        if (t < dt * 1.5) g.overlay.pop('SONNÉ ×1.5', this.pos.clone().setY(5), 'big');
        if (t > 2.5) { this.lungeCd = 1.2; this.setPhase('slither'); }
        break;
      case 'sweepTele': {
        const D = enr ? 0.75 : 0.9;
        if (t < dt * 1.5) {
          g.fx.telegraphCircle(this.pos, SWEEP_R, D);
          g.fx.telegraphCircle(this.pos, 2.2, D);
          audio.play('telegraph');
          audio.play('hiss', { pitch: 1.6 });
          this.whipA = this.facing + Math.PI;
          this.whipSign = Math.random() < 0.5 ? 1 : -1;
          this.swept = false;
        }
        this.vel.multiplyScalar(0.5);
        this.mode = 'whip';
        this.whipRaise = easeOut(t / D);
        this.whipA = this.facing + Math.PI - this.whipSign * 0.5 * this.whipRaise;
        this.whipPrev = this.whipA;
        this.liftWant = 4.2;
        hoodWant = 1.3;
        this.rattle.visible = true;
        this.rattle.scale.setScalar(0.6 + 0.5 * this.whipRaise + Math.sin(t * 60) * 0.15);
        if (Math.random() < 0.3) audio.play('shellRoll', { pitch: 2.5, volume: 0.25 });
        if (t > D) { this.setPhase('sweep'); audio.play('swingHeavy', { pitch: 0.4 }); }
        break;
      }
      case 'sweep': {
        const turns = enr ? 2 : 1;
        const DT = enr ? 0.95 : 0.55;
        const k = clamp01(t / DT);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        const a0 = this.facing + Math.PI - this.whipSign * 0.5;
        this.whipPrev = this.whipA;
        this.whipA = a0 + this.whipSign * TAU * turns * e;
        this.mode = 'whip';
        this.whipRaise = Math.max(0, 1 - k * 4);
        this.vel.set(0, 0, 0);
        this.liftWant = 3.8;
        hoodWant = 1.3;
        this.sweepHit();
        const tip = this.pos.clone().addScaledVector(dirOf(this.whipA), SWEEP_R - 1).setY(0.4);
        g.fx.burst(tip, PAL.danger, 2, 5, { size: 0.4, life: 0.3, grav: 0 });
        g.fx.burst(tip, PAL.bone, 1, 5, { size: 0.5, life: 0.4 });
        if (t > DT) { g.shake(0.3, 0.2, 2); this.setPhase('recover'); }
        break;
      }
      case 'spitTele': {
        const D = 0.7;
        if (t < dt * 1.5) { audio.play('telegraph'); audio.play('hiss', { pitch: 1.2 }); }
        this.faceHero(dt, 6);
        this.vel.multiplyScalar(0.6);
        const k = easeOut(t / D);
        this.liftWant = 5.5;
        this.pitch = -0.25 * k;
        hoodWant = 1 + 0.55 * k;
        this.jaw = 0.8 * k;
        this.venom.visible = true;
        this.venom.scale.setScalar(0.3 + k + Math.sin(t * 45) * 0.08);
        if (t > D) {
          const from = new THREE.Vector3();
          this.venom.getWorldPosition(from);
          from.y = 1.6;
          this.fan('orb', from, this.facing, 7, 1.3, 17, { life: 2.2, radius: 0.65 });
          g.fx.burst(from.clone().setY(5), PAL.danger, 20, 12, { size: 0.4, life: 0.4 });
          audio.play('screech', { pitch: 1.3, volume: 0.6 });
          this.squash = 0.3;
          this.setPhase('recover');
        }
        break;
      }
      case 'recover':
        this.vel.multiplyScalar(0.7);
        this.liftWant = 2.4;
        this.pitch = 0.15;
        if (t > (enr ? 0.9 : 1.1)) this.setPhase('slither');
        break;
    }

    const kk = Math.min(1, dt * 8);
    this.lift += (this.liftWant - this.lift) * kk;
    this.hood += (hoodWant - this.hood) * kk;
    P.head.position.y = this.lift;
    P.head.rotation.set(this.pitch, 0, 0);
    P.jaw.rotation.x = this.jaw;
    P.tongue.scale.set(1, 1, tongue);
    P.tongue.rotation.x = Math.sin(g.time * 30) * 0.15;
  }

  private sweepHit() {
    const h = this.hero;
    if (this.swept || h.dead) return;
    const dx = h.pos.x - this.pos.x, dz = h.pos.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 1.8 || d > SWEEP_R + h.radius) return;
    const ha = Math.atan2(dx, dz);
    const d0 = wrapAngle(ha - this.whipPrev), d1 = wrapAngle(ha - this.whipA);
    const crossed = (d0 === 0 || d1 === 0 || Math.sign(d0) !== Math.sign(d1)) && Math.abs(d0) < 1.6 && Math.abs(d1) < 1.6;
    if (crossed && h.y < 1.3 && h.hurt(this.pos)) {
      this.swept = !this.enraged;
      this.game.fx.burst(h.pos.clone().setY(1.5), PAL.danger, 12, 12, { size: 0.4, life: 0.4 });
    }
    if (crossed) {
      const tag = this.sweepTag();
      for (const e of this.game.enemies.list) {
        if (!e.alive) continue;
        const ed = Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
        if (ed < SWEEP_R && Math.abs(wrapAngle(Math.atan2(e.pos.x - this.pos.x, e.pos.z - this.pos.z) - this.whipA)) < 0.4) {
          this.game.enemies.hit(e, { dmg: 40, dir: dirOf(this.whipA + this.whipSign * Math.PI / 2), kb: 22, launch: 10, tag, quiet: true, breaksGuard: true });
        }
      }
    }
  }

  private startConstrict() {
    const g = this.game;
    const h = this.hero;
    h.state = 'constricted';
    h.stateT = 0;
    h.constrictJumps = 0;
    h.vel.set(0, 0, 0);
    h.vy = 0;
    this.lastPresses = 0;
    this.squeezeT = 0.6;
    this.coilA = Math.random() * TAU;
    this.coilOut.set(this.pos.x - h.pos.x, 0, this.pos.z - h.pos.z);
    if (this.coilOut.lengthSq() < 0.01) this.coilOut.copy(this.lungeDir).multiplyScalar(-1);
    this.coilOut.normalize();
    this.invulnerable = true;
    g.shake(0.6, 0.4, 8);
    g.fx.ring(h.pos, PAL.danger, 0.5, 5, 0.35, 3);
    g.overlay.pop('SAUTE ×6 !', h.pos.clone().setY(6), 'big');
    audio.play('hiss');
    audio.play('bossRoar', { pitch: 1.3, volume: 0.6 });
    this.taunt();
    this.setPhase('constrict');
  }

  private endConstrict(launch: boolean) {
    const g = this.game;
    const h = this.hero;
    this.invulnerable = false;
    this.mode = 'chain';
    if (!h.dead && h.state === 'constricted') {
      h.state = 'move';
      h.stateT = 0;
      h.iframes = Math.max(h.iframes, 1.0);
      h.vy = launch ? 14 : 8;
      h.y = Math.max(h.y, 0.05);
      h.vel.copy(this.coilOut).multiplyScalar(-6);
    }
    if (launch) {
      this.vel.copy(this.coilOut).multiplyScalar(14);
      g.fx.ring(h.pos, h.color, 0.5, 7, 0.4, 3);
      g.fx.burst(h.pos.clone().setY(2), h.color, 30, 18, { size: 0.45, life: 0.5, up: 1 });
      g.shake(0.6, 0.45, 8);
      audio.play('screech', { pitch: 0.7 });
      audio.play('smash', { pitch: 1.2 });
    }
  }

  die() {
    if (this.phase === 'constrict') this.endConstrict(false);
    super.die();
  }

  // Body: rope chain behind the head, or coiled around the hero, or a whip line around the head.
  private updateBody(dt: number) {
    const k = Math.min(1, dt * 12);
    const fwd = dirOf(this.facing, new THREE.Vector3());
    const groundY = (i: number) => RAD[i] * 0.85 + Math.max(0, this.y - i * 1.2);
    const neck = (i: number) => Math.max(0, this.lift - 1.0) * Math.max(0, 1 - (i + 1) / 5);
    let start = 0;
    if (this.mode === 'coil') {
      const h = this.hero;
      for (let i = 0; i < COIL_N; i++) {
        const a = this.coilA + i * 0.8;
        const rc = h.radius + RAD[i] * 0.85 + 0.2 + h.constrictJumps * 0.06;
        this.tmp.set(h.pos.x + Math.sin(a) * rc, 0.5 + (COIL_N - 1 - i) * 0.42 + h.y, h.pos.z + Math.cos(a) * rc);
        this.seg[i].lerp(this.tmp, k);
      }
      start = COIL_N;
    } else if (this.mode === 'whip') {
      const d = dirOf(this.whipA, new THREE.Vector3());
      const sweeping = this.phase === 'sweep';
      for (let i = 0; i < N; i++) {
        const r = 2.4 + i * WHIP_STEP;
        const raise = i > N - 6 ? (i - (N - 6)) * 0.7 * this.whipRaise : 0;
        this.tmp.set(this.pos.x + d.x * r, groundY(i) + raise + neck(i) * 0.5, this.pos.z + d.z * r);
        if (sweeping) this.seg[i].copy(this.tmp);
        else this.seg[i].lerp(this.tmp, Math.min(1, dt * 7));
      }
      start = N;
    }
    for (let i = start; i < N; i++) {
      const s = this.seg[i];
      const prev = i === 0 ? this.tmp.copy(this.pos).addScaledVector(fwd, -1.2) : this.seg[i - 1];
      const dx = s.x - prev.x, dz = s.z - prev.z;
      const d = Math.hypot(dx, dz);
      const sp = SPACING[i];
      if (d > sp) { s.x = prev.x + dx / d * sp; s.z = prev.z + dz / d * sp; }
      else if (d < sp * 0.55 && d > 1e-4) { s.x = prev.x + dx / d * sp * 0.55; s.z = prev.z + dz / d * sp * 0.55; }
      const wantY = groundY(i) + neck(i);
      s.y += (wantY - s.y) * Math.min(1, dt * 10);
    }
  }

  protected leanMul = 0.35;

  protected applyTransform() {
    super.applyTransform();
    const P = this.rig.pivots;
    const s = this.squash;
    this.rig.root.scale.set(1, 1, 1);
    P.head.scale.set(1 + s * 0.3, 1 - s * 0.3, 1 + s * 0.3);
    P.hood.scale.set(this.hood, 0.75 + this.hood * 0.25, 1);
    if (this.phase === 'enter') this.mode = 'chain';
    this.updateBody(this.lastDt);
    this.root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(this.rig.root.matrixWorld).invert();
    const v = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const pv = P['seg' + i];
      v.copy(this.seg[i]).applyMatrix4(inv);
      pv.position.copy(v);
      const a = i === 0 ? this.tmp.copy(this.pos).setY(this.lift) : this.seg[i - 1];
      const dx = a.x - this.seg[i].x, dz = a.z - this.seg[i].z, dy = a.y - this.seg[i].y;
      const hd = Math.hypot(dx, dz);
      pv.rotation.set(-Math.atan2(dy, Math.max(0.3, hd)) * 0.8, (hd > 0.01 ? Math.atan2(dx, dz) : this.facing) - this.facing, 0, 'YXZ');
    }
  }

  addShadows(fx: import('../core/Fx').Fx) {
    super.addShadows(fx);
    for (let i = 1; i < this.seg.length; i += 2) fx.addShadow(this.seg[i].x, this.seg[i].z, 2.2, 0);
  }

  hitPoints() {
    const pts = [{ x: this.pos.x, z: this.pos.z, r: this.radius }];
    for (let i = 2; i < this.seg.length; i += 2) pts.push({ x: this.seg[i].x, z: this.seg[i].z, r: 1.6 });
    return pts;
  }
}
