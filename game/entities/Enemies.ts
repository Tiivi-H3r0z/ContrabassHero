import * as THREE from 'three';
import type { Game } from '../Game';
import { PAL } from '../palette';
import { makeOutlineMaterial, makeToonMaterial, hullGeometry } from '../render/toon';
import { ENEMY_CAP, ENEMY_GEOS, ENEMY_STATS, EnemyKind } from './enemyModels';
import { audio } from '../audio/audio';
import { TEACHER_BARKS } from '../data/dialogues';
import { inQuad, outQuad } from '../core/anim';

export type EnemyState = 'spawn' | 'chase' | 'windup' | 'lunge' | 'recover' | 'stun' | 'air' | 'fall' | 'dying' | 'flat' | 'stake';
export type KillStyle = 'pop' | 'flat' | 'stake';

export interface Enemy {
  id: number;
  kind: EnemyKind;
  slot: number;
  alive: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  y: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  mass: number;
  state: EnemyState;
  t: number;
  flash: number;
  facing: number;
  phase: number;
  hitTags: Map<number, number>;
  cd: number;
  mutant: boolean;
  scaleMul: number;
  buffed: boolean;
  dotTimer: number;
  contaminated: number;
  squash: number;
  sqv: number;
  spin: number;
  lungeDir: THREE.Vector3;
  killStyle: KillStyle;
  credited: boolean;
}

export interface HitInfo {
  dmg: number;
  dir: THREE.Vector3;
  kb: number;
  launch?: number;
  stun?: number;
  breaksGuard?: boolean;
  tag: number;
  crit?: boolean;
  quiet?: boolean;
  color?: THREE.ColorRepresentation;
  style?: KillStyle;
}

const tmpO = new THREE.Object3D();
const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const KINDS: EnemyKind[] = ['solfege', 'surveillant', 'maths', 'cpe', 'inspecteur'];
const GRAV = 38;

interface Batch { mesh: THREE.InstancedMesh; hull: THREE.InstancedMesh; flash: THREE.InstancedBufferAttribute; free: number[]; used: number }

export class Enemies {
  list: Enemy[] = [];
  private batches = {} as Record<EnemyKind, Batch>;
  group = new THREE.Group();
  private nextId = 1;
  private barkCd = 3;
  private auras: THREE.Mesh[] = [];
  freeze = false;
  private lastBlockPop = -1;

  constructor(private game: Game) {
    const mat = makeToonMaterial();
    const outline = makeOutlineMaterial(0.05);
    for (const k of KINDS) {
      const geo = ENEMY_GEOS[k]();
      const cap = ENEMY_CAP[k];
      const flash = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1);
      flash.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('iFlash', flash);
      const mesh = new THREE.InstancedMesh(geo, mat, cap);
      const hull = new THREE.InstancedMesh(hullGeometry(geo), outline, cap);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      hull.instanceMatrix = mesh.instanceMatrix;
      mesh.frustumCulled = hull.frustumCulled = false;
      tmpO.scale.setScalar(0); tmpO.updateMatrix();
      for (let i = 0; i < cap; i++) mesh.setMatrixAt(i, tmpO.matrix);
      this.group.add(mesh, hull);
      this.batches[k] = { mesh, hull, flash, free: Array.from({ length: cap }, (_, i) => cap - 1 - i), used: 0 };
    }
    const auraGeo = new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2);
    for (let i = 0; i < ENEMY_CAP.inspecteur; i++) {
      const m = new THREE.Mesh(auraGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.danger).multiplyScalar(1.4), transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
      m.visible = false;
      this.auras.push(m);
      this.group.add(m);
    }
  }

  count(kind?: EnemyKind) { return kind ? this.batches[kind].used : this.list.length; }

  spawn(kind: EnemyKind, at: THREE.Vector3, mode: 'edge' | 'drop' | 'portal' | 'ground', mutant = false): Enemy | null {
    const b = this.batches[kind];
    const slot = b.free.pop();
    if (slot === undefined) return null;
    b.used++;
    const s = ENEMY_STATS[kind];
    const hpMul = (mutant ? 2.5 : 1) * this.game.difficulty;
    const e: Enemy = {
      id: this.nextId++, kind, slot, alive: true,
      pos: at.clone().setY(0), vel: new THREE.Vector3(), y: 0, vy: 0,
      hp: s.hp * hpMul, maxHp: s.hp * hpMul, radius: s.radius * (mutant ? 1.35 : 1), mass: s.mass * (mutant ? 1.8 : 1),
      state: 'spawn', t: 0, flash: 0, facing: Math.atan2(-at.x, -at.z), phase: Math.random() * 10,
      hitTags: new Map(), cd: 1 + Math.random() * 1.5, mutant, scaleMul: mutant ? 1.35 : 1, buffed: false,
      dotTimer: 0, contaminated: 0, squash: -0.3, sqv: 0, spin: 0, lungeDir: new THREE.Vector3(), killStyle: 'pop', credited: false,
    };
    if (mode === 'edge') {
      e.y = -5; e.vy = 17; e.squash = -0.5;
      v1.copy(at).setY(0).normalize().multiplyScalar(-5);
      e.vel.copy(v1);
    } else if (mode === 'drop') {
      e.y = 16 + Math.random() * 6; e.vy = 0;
    } else if (mode === 'portal') {
      e.y = 2; e.vy = 10;
      e.vel.set((Math.random() - 0.5) * 12, 0, (Math.random() - 0.5) * 12);
    } else {
      e.state = 'chase';
    }
    this.list.push(e);
    return e;
  }

  private release(e: Enemy) {
    e.alive = false;
    const b = this.batches[e.kind];
    b.free.push(e.slot);
    b.used--;
    tmpO.scale.setScalar(0); tmpO.position.set(0, -100, 0); tmpO.updateMatrix();
    b.mesh.setMatrixAt(e.slot, tmpO.matrix);
    b.flash.setX(e.slot, 0);
  }

  headPos(e: Enemy, out = new THREE.Vector3()) {
    return out.set(e.pos.x, e.y + ENEMY_STATS[e.kind].height * e.scaleMul + 0.4, e.pos.z);
  }

  hit(e: Enemy, h: HitInfo): boolean {
    if (!e.alive || e.state === 'dying' || e.state === 'fall' || e.state === 'flat' || e.state === 'stake' || e.state === 'spawn' && e.y < -1) return false;
    const last = e.hitTags.get(h.tag);
    if (last !== undefined) return false;
    e.hitTags.set(h.tag, this.game.time);
    let dmg = h.dmg;
    let kb = h.kb;
    if (e.buffed) dmg *= 0.7;
    let blocked = false;
    if (e.kind === 'cpe' && !h.breaksGuard && e.state !== 'stun' && e.state !== 'air') {
      const toAtt = Math.atan2(-h.dir.x, -h.dir.z);
      let d = Math.abs(toAtt - e.facing) % (Math.PI * 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      if (d < 1.1) { blocked = true; dmg *= 0.2; kb *= 0.25; }
    }
    e.hp -= dmg;
    e.killStyle = h.style ?? 'pop';
    e.flash = 1;
    e.squash = Math.max(e.squash, 0.3);
    e.sqv += 6;
    const k = kb / e.mass;
    e.vel.addScaledVector(h.dir, k);
    if (h.launch && !blocked) {
      e.vy = Math.max(e.vy, h.launch / Math.sqrt(e.mass));
      if (e.y <= 0.01) e.y = 0.05;
      e.state = 'air';
      e.squash = -0.45;
      e.sqv = 0;
      e.spin = (Math.random() - 0.5) * 12;
    } else if (e.state === 'air') {
      e.vy = Math.max(e.vy, 5);
    } else if (!blocked) {
      e.state = 'stun';
      e.t = h.stun ?? 0.32;
    }
    const head = this.headPos(e, v2);
    head.y -= 0.8;
    if (blocked) {
      if (this.game.time - this.lastBlockPop > 0.5) { this.lastBlockPop = this.game.time; this.game.overlay.pop('BLOQUÉ', head, 'block'); }
      if (!h.quiet) audio.play('shieldHit');
      this.game.fx.burst(head, PAL.bone, 6, 8, { size: 0.25, life: 0.25 });
    } else if (!h.quiet) {
      if (h.crit || dmg >= 60) this.game.overlay.pop(String(Math.round(dmg)), head, h.crit ? 'crit' : 'dmg');
      this.game.fx.burst(head, h.color ?? PAL.bone, h.crit ? 14 : 7, h.crit ? 16 : 11, { size: 0.3, life: 0.3, up: 0.9 });
    }
    this.game.onEnemyHit(e, dmg, !!h.crit, blocked);
    if (e.hp <= 0) this.kill(e, false);
    return true;
  }

  private credit(e: Enemy, out: boolean) {
    if (e.credited) return;
    e.credited = true;
    this.game.onEnemyKilled(e, out);
  }

  kill(e: Enemy, out: boolean) {
    if (!e.alive || e.state === 'dying' || e.state === 'flat' || e.state === 'stake') return;
    if (out) { e.state = 'fall'; e.t = 0; return; }
    const g = this.game;
    this.credit(e, false);
    e.t = 0;
    if (e.y > 0.8) {
      // juggle kill: bursts in mid-air into a rain of notes
      const p = v1.set(e.pos.x, e.y + 1.4, e.pos.z);
      g.fx.burst(p, PAL.power, 16, 16, { size: 0.4, life: 0.6, up: 1.4 });
      g.fx.burst(p, PAL.combo, 8, 12, { size: 0.35, life: 0.5, up: 1.2 });
      g.fx.debris(p, [PAL.ink, '#ffffff', PAL.bone], 14, 15, 0.4);
      g.fx.splat(e.pos, 2.4);
      g.killWord('juggle', p);
      audio.play('teacherDie', { pitch: 1.2 });
      this.release(e);
      return;
    }
    if (e.killStyle === 'flat') {
      e.state = 'flat';
      g.fx.splat(e.pos, 3.4 + e.radius);
      g.fx.debris(v1.set(e.pos.x, 0.8, e.pos.z), [PAL.ink, '#ffffff', '#7a2a2a'], 10, 11, 0.4);
      g.fx.ring(e.pos, PAL.bone, 0.4, 3, 0.25, 1.4);
      g.killWord('flat', v1.set(e.pos.x, 2, e.pos.z));
      audio.play('smash', { pitch: 1.5, volume: 0.5 });
    } else if (e.killStyle === 'stake') {
      e.state = 'stake';
      g.fx.ring(e.pos, PAL.bone, 0.4, 2.4, 0.25, 1.4);
      g.killWord('stake', v1.set(e.pos.x, 3, e.pos.z));
      audio.play('block', { pitch: 0.6 });
    } else {
      e.state = 'dying';
    }
  }

  private finalize(e: Enemy, out: boolean) {
    const p = v1.set(e.pos.x, Math.max(0.5, e.y + 1.4), e.pos.z);
    if (!out) {
      this.game.fx.debris(p, [PAL.ink, PAL.ink, '#ffffff', '#f4efe6', PAL.bone], 16 + (e.mutant ? 10 : 0), 15, 0.42);
      this.game.fx.burst(p, PAL.bone, 12, 14, { size: 0.38, life: 0.4 });
      this.game.fx.burst(p, PAL.power, 6, 12, { size: 0.3, life: 0.5, up: 1.3 });
      this.game.fx.splat(e.pos, 2.6 + e.radius * 1.6);
      if (e.state === 'dying') this.game.killWord('pop', p);
      audio.play('teacherDie', { pitch: 0.9 + Math.random() * 0.25 });
    }
    this.credit(e, out);
    this.release(e);
  }

  killAll(reason: 'nuke' | 'clear') {
    for (const e of this.list) {
      if (!e.alive) continue;
      if (reason === 'clear') { e.hp = 0; this.kill(e, false); }
      else { e.hp = 0; e.vy = 14 + Math.random() * 8; e.state = 'air'; e.spin = 15; }
    }
  }

  update(dt: number) {
    const g = this.game;
    const hero = g.hero;
    const R = g.arenaRadius;
    this.barkCd -= dt;
    const inspectors = this.list.filter((e) => e.alive && e.kind === 'inspecteur' && e.state !== 'dying' && e.state !== 'fall');

    for (const e of this.list) {
      if (!e.alive) continue;
      e.t += dt;
      e.phase += dt;
      e.flash = Math.max(0, e.flash - dt * 7);
      e.sqv += (-230 * e.squash - 11 * e.sqv) * dt;
      e.squash = Math.max(-0.55, Math.min(0.6, e.squash + e.sqv * dt));
      e.cd -= dt;
      if (e.contaminated > 0) {
        e.contaminated -= dt;
        e.dotTimer -= dt;
        if (e.dotTimer <= 0) {
          e.dotTimer = 0.45;
          this.hit(e, { dmg: 6, dir: v2.set(0, 0, 0), kb: 0, tag: -Math.floor(g.time * 10) - e.id * 1000, quiet: true, stun: 0.05 });
          g.fx.burst(this.headPos(e, v1), '#a6ff00', 3, 4, { size: 0.3, life: 0.5, grav: -4 });
        }
      }
      e.buffed = inspectors.some((i) => i !== e && i.pos.distanceToSquared(e.pos) < 49);
      const speedMul = (e.buffed ? 1.3 : 1) * g.enemySpeedMul;
      const s = ENEMY_STATS[e.kind];
      const toHero = v1.subVectors(hero.pos, e.pos).setY(0);
      const dist = toHero.length();
      const grounded = e.y <= 0.001;

      switch (e.state) {
        case 'spawn':
          e.vy -= GRAV * dt;
          e.y += e.vy * dt;
          if (e.y <= 0 && e.vy < 0) {
            e.y = 0; e.vy = 0; e.state = 'chase'; e.squash = 0.5; e.sqv = 0;
            e.vel.multiplyScalar(0.2);
            g.fx.ring(e.pos, PAL.bone, 0.3, 2.2, 0.35, 1.4);
          }
          break;
        case 'chase': {
          if (this.freeze) break;
          const dir = toHero.normalize();
          let want = s.speed * speedMul;
          if (e.kind === 'maths') {
            if (dist < 8) want = -s.speed * speedMul;
            else if (dist < 13) { dir.set(-dir.z, 0, dir.x).multiplyScalar(Math.sin(e.id) > 0 ? 1 : -1); want *= 0.6; }
            if (e.cd <= 0 && dist < 17 && !hero.dead) { e.state = 'windup'; e.t = 0; }
          } else if (dist < s.reach + 1.2 && e.cd <= 0 && !hero.dead && hero.y < 2) {
            e.state = 'windup'; e.t = 0;
          }
          const wob = Math.sin(e.phase * 1.7 + e.id) * 0.35;
          const cs = Math.cos(wob), sn = Math.sin(wob);
          const dx = dir.x * cs - dir.z * sn, dz = dir.x * sn + dir.z * cs;
          const k = 1 - Math.pow(0.002, dt);
          e.vel.x += (dx * want - e.vel.x) * k;
          e.vel.z += (dz * want - e.vel.z) * k;
          const nx = e.pos.x + e.vel.x * dt, nz = e.pos.z + e.vel.z * dt;
          if (Math.hypot(nx, nz) > R - 1.2) { e.vel.x *= 0.2; e.vel.z *= 0.2; e.vel.addScaledVector(v2.set(-e.pos.x, 0, -e.pos.z).normalize(), 2); }
          if (dist > 0.1) e.facing = Math.atan2(hero.pos.x - e.pos.x, hero.pos.z - e.pos.z);
          if (this.barkCd <= 0 && dist < 18 && Math.random() < 0.02 && g.overlay.activeBubbles() < 2) {
            this.barkCd = 3.5 + Math.random() * 3;
            const lines = TEACHER_BARKS[e.kind];
            g.overlay.bubble(lines[Math.floor(Math.random() * lines.length)], () => (e.alive ? this.headPos(e, new THREE.Vector3()) : null), 2.2, 'enemy');
          }
          break;
        }
        case 'windup': {
          e.vel.multiplyScalar(Math.pow(0.001, dt));
          e.facing = Math.atan2(hero.pos.x - e.pos.x, hero.pos.z - e.pos.z);
          const wind = e.kind === 'maths' ? 0.55 : e.kind === 'cpe' ? 0.6 : 0.42;
          if (e.t < dt * 1.5) g.fx.burst(this.headPos(e, v2), PAL.danger, 4, 3, { size: 0.3, life: 0.3, grav: 0 });
          e.squash += (0.32 * outQuad(e.t / wind) - e.squash) * Math.min(1, dt * 20);
          e.sqv = 0;
          if (e.t >= wind) {
            if (e.kind === 'maths') {
              const from = this.headPos(e, new THREE.Vector3());
              from.y -= 0.8;
              const lead = hero.pos.clone().addScaledVector(hero.vel, 0.35).setY(1.4);
              g.projectiles.enemyShot('chalk', from, lead.sub(from).normalize().multiplyScalar(24), 1);
              audio.play('chalkThrow');
              e.state = 'recover'; e.t = 0; e.cd = 2.2 + Math.random() * 1.5;
            } else {
              e.state = 'lunge'; e.t = 0;
              e.lungeDir.copy(toHero).normalize();
              e.vel.copy(e.lungeDir).multiplyScalar(e.kind === 'surveillant' ? 17 : 13);
              e.squash = -0.4; e.sqv = 0;
              if (e.kind === 'surveillant' && Math.random() < 0.3) audio.play('whistle', { volume: 0.5 });
            }
          }
          break;
        }
        case 'lunge':
          if (dist < e.radius + 1.0 && !hero.dead) hero.hurt(e.pos, e.kind === 'cpe' ? 1 : 1);
          if (e.t > 0.2) { e.state = 'recover'; e.t = 0; e.cd = 1.2 + Math.random() * 1.2; }
          break;
        case 'recover':
          e.vel.multiplyScalar(Math.pow(0.0005, dt));
          if (e.t > 0.45) e.state = 'chase';
          break;
        case 'stun':
          e.vel.multiplyScalar(Math.pow(0.004, dt));
          if (e.t <= 0) e.state = 'chase';
          e.t -= dt * 2;
          break;
        case 'air':
          e.vy -= GRAV * dt;
          e.y += e.vy * dt;
          e.vel.multiplyScalar(Math.pow(0.4, dt));
          if (e.y <= 0) {
            const inside = Math.hypot(e.pos.x, e.pos.z) < R;
            if (inside) {
              e.y = 0;
              if (e.vy < -12) { g.fx.ring(e.pos, PAL.bone, 0.3, 2.5, 0.3, 1.2); g.fx.splat(e.pos, 1.4); }
              e.vy = 0; e.spin = 0; e.squash = 0.55; e.sqv = 0;
              if (e.hp <= 0) this.kill(e, false); else { e.state = 'stun'; e.t = 0.35; }
            }
          }
          break;
        case 'fall':
          e.vy -= GRAV * dt;
          e.y += e.vy * dt;
          e.spin = e.spin || 6;
          if (e.y < -30) { this.finalize(e, true); continue; }
          break;
        case 'dying':
          e.vel.multiplyScalar(Math.pow(0.001, dt));
          if (e.t > 0.16) { this.finalize(e, false); continue; }
          break;
        case 'flat':
          e.vel.set(0, 0, 0);
          if (e.t > 1.3) { this.release(e); continue; }
          break;
        case 'stake':
          e.vel.set(0, 0, 0);
          e.y = -2.1 * Math.min(1, e.t / 0.3) * Math.min(1, e.t / 0.3);
          if (e.t > 0.85) { e.y = 0.2; e.state = 'dying'; e.t = 0.1; }
          break;
      }

      if (e.state !== 'chase' && e.state !== 'spawn' && grounded && e.state !== 'lunge') {
        e.vel.multiplyScalar(Math.pow(0.02, dt));
      }
      e.pos.x += e.vel.x * dt;
      e.pos.z += e.vel.z * dt;

      if (e.state !== 'spawn' && e.state !== 'fall' && e.state !== 'dying') {
        const r = Math.hypot(e.pos.x, e.pos.z);
        if (r > R + 0.3 && e.y <= 0.5) {
          e.state = 'fall'; e.t = 0; e.vy = Math.min(e.vy, 2);
          g.onEnemyOut(e);
        }
      }
    }

    this.separate(dt);
    this.list = this.list.filter((e) => e.alive);
    this.writeInstances(inspectors);
  }

  private separate(dt: number) {
    const L = this.list;
    const hero = this.game.hero;
    for (let i = 0; i < L.length; i++) {
      const a = L[i];
      if (!a.alive || a.state === 'fall' || a.state === 'spawn' || a.state === 'flat' || a.state === 'stake') continue;
      for (let j = i + 1; j < L.length; j++) {
        const b = L[j];
        if (!b.alive || b.state === 'fall' || b.state === 'spawn' || b.state === 'flat' || b.state === 'stake') continue;
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
        const rr = a.radius + b.radius;
        if (dx > rr || dx < -rr || dz > rr || dz < -rr) continue;
        const d2 = dx * dx + dz * dz;
        if (d2 >= rr * rr || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const push = (rr - d) / d * 0.5;
        const wa = b.mass / (a.mass + b.mass), wb = 1 - wa;
        a.pos.x -= dx * push * wa * 1.6; a.pos.z -= dz * push * wa * 1.6;
        b.pos.x += dx * push * wb * 1.6; b.pos.z += dz * push * wb * 1.6;
      }
      if (!hero.dead && a.y < 2 && hero.y < 2) {
        const dx = a.pos.x - hero.pos.x, dz = a.pos.z - hero.pos.z;
        const rr = a.radius + hero.radius;
        const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          a.pos.x += dx / d * (rr - d);
          a.pos.z += dz / d * (rr - d);
        }
      }
      for (const p of this.game.props) {
        if (!p.alive || !p.big) continue;
        const dx = a.pos.x - p.position.x, dz = a.pos.z - p.position.z;
        const rr = a.radius + p.radius;
        const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          a.pos.x += dx / d * (rr - d);
          a.pos.z += dz / d * (rr - d);
        }
      }
    }
    void dt;
  }

  private writeInstances(inspectors: Enemy[]) {
    for (const e of this.list) {
      const b = this.batches[e.kind];
      const walking = e.state === 'chase';
      const gait = walking ? Math.abs(Math.sin(e.phase * 9 + e.id)) : 0;
      tmpO.position.set(e.pos.x, e.y + gait * 0.32, e.pos.z);
      let rx = 0, rz = walking ? Math.sin(e.phase * 9 + e.id) * 0.16 : 0;
      if (e.state === 'windup') rx = -0.45 * outQuad(e.t / 0.4) - Math.sin(e.t * 40) * 0.04;
      if (e.state === 'lunge') rx = 0.55;
      if (e.state === 'recover') rx = 0.55 * (1 - outQuad(e.t / 0.3));
      if (e.state === 'stun') rx = -0.3;
      if (e.state === 'air' || e.state === 'fall') { rx = e.phase * e.spin; rz = e.phase * e.spin * 0.6; }
      tmpO.rotation.set(rx, e.facing, rz, 'YXZ');
      let sc = e.scaleMul;
      if (e.state === 'dying') sc *= 1 + 0.75 * inQuad(e.t / 0.16);
      if (e.state === 'spawn' && e.y < 0) sc *= Math.max(0.3, 1 + e.y / 8);
      const airStretch = e.state === 'air' || e.state === 'spawn' ? Math.min(0.35, Math.abs(e.vy) * 0.018) : 0;
      const sq = e.state === 'flat' ? 0.92 : e.squash - airStretch + (walking ? (0.5 - gait) * 0.14 : 0);
      const sy = 1 - sq, sxz = 1 + sq * 0.55;
      tmpO.scale.set(sc * sxz, sc * sy, sc * sxz);
      tmpO.updateMatrix();
      b.mesh.setMatrixAt(e.slot, tmpO.matrix);
      const pulse = e.state === 'windup' ? 0.25 + 0.25 * Math.sin(e.t * 30) : 0;
      b.flash.setX(e.slot, Math.max(e.flash, pulse, e.state === 'dying' ? 1 : 0));
    }
    for (const k of KINDS) {
      const b = this.batches[k];
      b.mesh.instanceMatrix.needsUpdate = true;
      b.flash.needsUpdate = true;
    }
    this.auras.forEach((a, i) => {
      const e = inspectors[i];
      a.visible = !!e;
      if (e) {
        a.position.set(e.pos.x, 0.08, e.pos.z);
        const s = 7 + Math.sin(this.game.time * 4) * 0.2;
        a.scale.set(s, 1, s);
      }
    });
  }

  // Rewrite instance matrices without simulating (used while the world is frozen, e.g. Finales).
  refresh() { this.writeInstances([]); }

  addShadows() {
    const fx = this.game.fx;
    for (const e of this.list) if (e.state !== 'fall' && e.state !== 'flat' && e.y > -0.5) fx.addShadow(e.pos.x, e.pos.z, e.radius * 2.6, e.y);
  }

  nearest(p: THREE.Vector3, maxDist = Infinity, exclude?: Set<number>): Enemy | null {
    let best: Enemy | null = null, bd = maxDist * maxDist;
    for (const e of this.list) {
      if (!e.alive || e.state === 'dying' || e.state === 'fall' || e.state === 'spawn' || e.state === 'flat' || e.state === 'stake') continue;
      if (exclude?.has(e.id)) continue;
      const d = e.pos.distanceToSquared(p);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  dispose() {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
  }
}
