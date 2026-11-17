import * as THREE from 'three';
import { Pipeline } from '../game/render/Pipeline';
import { buildHero, HeroRig } from '../game/models/heroes';
import { ENEMY_GEOS, EnemyKind } from '../game/entities/enemyModels';
import { makeOutlineMaterial, makeToonMaterial, toonMesh, ToonMaterial } from '../game/render/toon';
import { Fx } from '../game/core/Fx';
import { buildStage, StageBuild } from '../game/stages';
import { inQuad, outQuad, Squash, strikeCurve } from '../game/core/anim';
import { HERO_COLORS, PAL } from '../game/palette';

type Fate = 'walk' | 'fly' | 'pop' | 'flat' | 'drop' | 'gone';

interface Teacher {
  obj: THREE.Group;
  mat: ToonMaterial;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  y: number;
  vy: number;
  a: number;
  r: number;
  fate: Fate;
  t: number;
  spin: number;
  sq: Squash;
  flash: number;
  phase: number;
}

const STEPS = [
  { anim: 'sweepR', at: 0.09, dur: 0.3, arc: 2.8 },
  { anim: 'sweepL', at: 0.09, dur: 0.3, arc: 2.8 },
  { anim: 'overhead', at: 0.13, dur: 0.38, arc: 2.0 },
  { anim: 'spin', at: 0.16, dur: 0.5, arc: 7 },
] as const;

export interface DemoHooks {
  pop(text: string, x: number, y: number, kind: 'sfx' | 'out' | 'goth'): void;
  combo(n: number): void;
  flash(): void;
}

export class BibleDemo {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 1, 0.5, 900);
  private pipeline: Pipeline;
  private stage: StageBuild;
  private fx = new Fx();
  private hero: HeroRig;
  private heroSq = new Squash(300, 14);
  private heroFwd = new Squash(240, 12);
  private teachers: Teacher[] = [];
  private outline = makeOutlineMaterial(0.05);
  private geos: Record<EnemyKind, THREE.BufferGeometry>;
  private step = 0;
  private stepT = 99;
  private struck = true;
  private facing = 0;
  private time = 0;
  private last = performance.now();
  private raf = 0;
  private trauma = 0;
  private impact = 0;
  private combo = 0;
  private autoT = 0;
  private hitstop = 0;
  private w = 1;
  private h = 1;
  externalBeat = false;
  private v = new THREE.Vector3();

  constructor(private host: HTMLElement, private hooks: DemoHooks) {
    this.stage = buildStage(5);
    this.scene.add(this.stage.group);
    this.scene.background = new THREE.Color(this.stage.def.bg);
    this.scene.fog = new THREE.Fog(this.stage.def.fog, this.stage.def.fogNear, this.stage.def.fogFar);
    this.stage.props.forEach((p) => { if (p.position.length() < 14) p.object.visible = false; });
    this.scene.add(this.fx.group);
    this.hero = buildHero('armand');
    this.hero.root.rotation.order = 'YXZ';
    this.scene.add(this.hero.root);
    const light = new THREE.PointLight(HERO_COLORS.armand, 8, 14, 1.4);
    light.position.set(0, 6, 2);
    this.scene.add(light);
    this.geos = {
      solfege: ENEMY_GEOS.solfege(), surveillant: ENEMY_GEOS.surveillant(), maths: ENEMY_GEOS.maths(), cpe: ENEMY_GEOS.cpe(), inspecteur: ENEMY_GEOS.inspecteur(),
    };
    const kinds: EnemyKind[] = ['solfege', 'solfege', 'surveillant', 'maths', 'solfege', 'surveillant', 'cpe', 'solfege', 'maths', 'solfege', 'surveillant', 'solfege'];
    kinds.forEach((k, i) => {
      const mat = makeToonMaterial();
      const tp = toonMesh(this.geos[k], mat, this.outline);
      tp.group.rotation.order = 'YXZ';
      this.scene.add(tp.group);
      const a = (i / kinds.length) * Math.PI * 2;
      this.teachers.push({ obj: tp.group, mat, pos: new THREE.Vector3(Math.cos(a) * 9, 0, Math.sin(a) * 9), vel: new THREE.Vector3(), y: 0, vy: 0, a, r: 8 + Math.random() * 3, fate: 'walk', t: 0, spin: 0, sq: new Squash(230, 11), flash: 0, phase: Math.random() * 10 });
    });
    this.pipeline = new Pipeline(host, this.scene, this.camera);
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(host);
    this.resize();
    this.raf = requestAnimationFrame(this.frame);
  }

  private resize() {
    this.w = this.host.clientWidth;
    this.h = this.host.clientHeight;
    this.camera.aspect = this.w / Math.max(1, this.h);
    const shift = this.w > 900 ? -this.w * 0.24 : 0;
    this.camera.setViewOffset(this.w, this.h, shift, 0, this.w, this.h);
    this.camera.updateProjectionMatrix();
    this.pipeline.resize(this.w, this.h);
  }

  // Trigger the next combo step (called on the music beat when music plays).
  attack() {
    if (this.stepT < STEPS[this.step].dur * 0.7) return;
    this.step = (this.step + 1) % STEPS.length;
    this.stepT = 0;
    this.struck = false;
    const target = this.teachers.filter((t) => t.fate === 'walk').sort((a, b) => a.pos.length() - b.pos.length())[0];
    if (target) this.facing = Math.atan2(target.pos.x, target.pos.z);
    this.heroSq.hit(3.5);
  }

  private project(p: THREE.Vector3) {
    this.v.copy(p).project(this.camera);
    return { x: (this.v.x + 1) / 2 * this.w, y: (1 - this.v.y) / 2 * this.h };
  }

  private strike() {
    const st = STEPS[this.step];
    const heavy = st.anim === 'overhead' || st.anim === 'spin';
    const color = HERO_COLORS.armand;
    const origin = new THREE.Vector3();
    if (st.anim === 'spin') {
      this.fx.slash(origin, this.facing, color, 1.15, 0.22, 1, 1.2);
      this.fx.slash(origin, this.facing + Math.PI, color, 1.15, 0.22, 1, 1.2);
      this.fx.ring(origin, color, 0.5, 6, 0.3, 3);
    } else {
      this.fx.slash(origin, this.facing - Math.PI / 2, color, 1.15, 0.16, st.anim === 'sweepL' ? -1 : 1, st.anim === 'overhead' ? 0.6 : 1.35);
    }
    this.heroFwd.hit(7);
    this.heroSq.hit(-4);
    let hits = 0;
    for (const t of this.teachers) {
      if (t.fate !== 'walk') continue;
      const d = t.pos.length();
      if (d > 5.8) continue;
      let ang = Math.atan2(t.pos.x, t.pos.z) - this.facing;
      while (ang > Math.PI) ang -= Math.PI * 2;
      while (ang < -Math.PI) ang += Math.PI * 2;
      if (Math.abs(ang) > st.arc / 2) continue;
      hits++;
      t.flash = 1;
      t.t = 0;
      const dir = t.pos.clone().setY(0).normalize();
      const head = t.pos.clone().setY(2.8);
      const r = Math.random();
      if (st.anim === 'overhead' && r < 0.6) {
        t.fate = 'flat';
        t.sq.set(0.6);
        this.fx.splat(t.pos, 3.4);
        this.fx.debris(head, [PAL.ink, PAL.bone, '#ffffff'], 10, 10, 0.35);
        const s = this.project(head); this.hooks.pop('FLATCH', s.x, s.y, 'sfx');
      } else if (r < 0.45) {
        t.fate = 'fly';
        t.vel.copy(dir).multiplyScalar(22 + Math.random() * 8);
        t.vy = 10 + Math.random() * 6;
        t.spin = (Math.random() - 0.5) * 18;
        t.sq.set(-0.45);
        const s = this.project(head); this.hooks.pop('OUT !', s.x, s.y, 'out');
      } else {
        t.fate = 'pop';
        t.vel.copy(dir).multiplyScalar(5);
      }
      this.fx.burst(head, PAL.bone, 8, 12, { size: 0.3, life: 0.3 });
    }
    if (hits) {
      this.combo += hits;
      this.hooks.combo(this.combo);
      this.hitstop = heavy ? 7 : 4;
      this.trauma = Math.min(1, this.trauma + (heavy ? 0.5 : 0.25));
      if (st.anim === 'spin') {
        this.impact = 2;
        this.hooks.flash();
        const s = this.project(new THREE.Vector3(0, 6, 0));
        this.hooks.pop(Math.random() < 0.5 ? 'Coda' : 'Fortissimo', s.x, s.y - 40, 'goth');
      }
    }
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    let dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.hitstop > 0) { this.hitstop--; dt = 0; }
    this.time += dt;
    const t = this.time;

    this.autoT += dt;
    if (!this.externalBeat && this.autoT > 0.42) { this.autoT = 0; this.attack(); }

    // hero
    const st = STEPS[this.step];
    this.stepT += dt;
    if (!this.struck && this.stepT >= st.at) { this.struck = true; this.strike(); }
    this.heroSq.update(dt);
    this.heroFwd.update(dt);
    const P = this.hero.pivots;
    const v = this.stepT < st.dur + 0.15 ? strikeCurve(this.stepT, st.at, st.dur, 0.3, 0.16) : 0;
    let spin = 0;
    P.legL.rotation.set(0.45, 0, 0); P.legR.rotation.set(-0.55, 0, 0);
    P.hips.position.y = 0.95; P.hips.rotation.set(0, 0, 0);
    P.torso.rotation.set(0.15, 0, 0);
    P.head.rotation.set(0, 0, Math.sin(t * 3) * 0.05);
    P.armL.rotation.set(-0.6, 0, 0.6);
    P.armR.rotation.set(-Math.PI / 2, 0, 0.25);
    P.weapon.rotation.set(Math.PI, 0, 0);
    if (st.anim === 'sweepR' || st.anim === 'sweepL') {
      const d = st.anim === 'sweepR' ? 1 : -1;
      P.torso.rotation.y = d * (1.2 - 2.7 * v);
      P.hips.rotation.y = -P.torso.rotation.y * 0.25;
      P.head.rotation.y = -P.torso.rotation.y * 0.4;
    } else if (st.anim === 'overhead') {
      P.armR.rotation.set(-Math.PI * 1.05 + 2.6 * v, 0, 0);
      P.armL.rotation.set(-Math.PI * 1.05 + 2.4 * v, 0, 0.3);
      P.torso.rotation.x = -0.35 + 0.9 * v;
      P.hips.position.y = 0.95 - 0.18 * Math.max(0, v);
    } else {
      spin = -Math.PI * 2 * Math.min(1, Math.max(-0.08, v));
      P.armL.rotation.set(-Math.PI / 2, 0, 0.5);
    }
    const f = this.heroFwd.x;
    this.hero.root.scale.set(this.heroSq.sxz * (1 - f * 0.2), this.heroSq.sy * (1 - f * 0.25), this.heroSq.sxz * (1 + f * 0.8));
    this.hero.root.rotation.set(0, this.facing + spin, 0);

    // teachers
    this.fx.beginShadows();
    this.fx.addShadow(0, 0, 2.4, 0);
    for (const tc of this.teachers) {
      tc.t += dt;
      tc.phase += dt;
      tc.flash = Math.max(0, tc.flash - dt * 6);
      tc.sq.update(dt);
      let rx = 0, rz = 0, sc = 1;
      switch (tc.fate) {
        case 'walk': {
          tc.r = Math.max(3.4, tc.r - dt * 2.2);
          tc.a += dt * 0.12;
          tc.pos.set(Math.cos(tc.a) * tc.r, 0, Math.sin(tc.a) * tc.r);
          tc.y = Math.abs(Math.sin(tc.phase * 9)) * 0.3;
          rz = Math.sin(tc.phase * 9) * 0.16;
          break;
        }
        case 'fly':
          tc.vy -= 38 * dt;
          tc.y += tc.vy * dt;
          tc.pos.addScaledVector(tc.vel, dt);
          rx = tc.t * tc.spin; rz = tc.t * tc.spin * 0.6;
          if (Math.random() < 0.5) this.fx.burst(tc.pos.clone().setY(tc.y + 1.5), PAL.combo, 1, 2, { size: 0.35, life: 0.3, grav: 0 });
          if (tc.y < -25) this.respawn(tc);
          break;
        case 'pop': {
          const k = tc.t / 0.16;
          sc = 1 + 0.7 * inQuad(k);
          tc.flash = Math.max(tc.flash, k);
          tc.pos.addScaledVector(tc.vel, dt);
          if (k >= 1) {
            const p = tc.pos.clone().setY(1.8);
            this.fx.burst(p, PAL.bone, 18, 16, { size: 0.4, life: 0.4 });
            this.fx.burst(p, PAL.power, 10, 14, { size: 0.35, life: 0.5, up: 1.2 });
            this.fx.debris(p, [PAL.ink, PAL.ink, '#f4efe6', '#ffffff'], 22, 16, 0.45);
            this.fx.splat(tc.pos, 3.6);
            const s = this.project(p); this.hooks.pop(Math.random() < 0.5 ? 'SPLOTCH' : 'CRAC', s.x, s.y, 'sfx');
            tc.fate = 'gone'; tc.t = 0; tc.obj.visible = false;
          }
          break;
        }
        case 'flat':
          tc.sq.x = 0.6; tc.sq.v = 0;
          if (tc.t > 1.2) { tc.fate = 'gone'; tc.t = 0; tc.obj.visible = false; }
          break;
        case 'gone':
          if (tc.t > 0.6) this.respawn(tc);
          break;
        case 'drop':
          tc.vy -= 60 * dt;
          tc.y += tc.vy * dt;
          tc.sq.x = -Math.min(0.45, Math.abs(tc.vy) * 0.015);
          if (tc.y <= 0) { tc.y = 0; tc.vy = 0; tc.fate = 'walk'; tc.sq.set(0.5); this.fx.ring(tc.pos, PAL.bone, 0.3, 2.2, 0.3, 1.2); }
          break;
      }
      const face = Math.atan2(-tc.pos.x, -tc.pos.z);
      tc.obj.position.set(tc.pos.x, tc.y, tc.pos.z);
      tc.obj.rotation.set(rx, face, rz);
      const sq = tc.fate === 'flat' ? 0.92 : tc.sq.x;
      tc.obj.scale.set(sc * (1 + sq * 0.55), sc * (1 - sq), sc * (1 + sq * 0.55));
      tc.mat.userData.flash.value = tc.flash;
      if (tc.fate !== 'gone' && tc.fate !== 'fly') this.fx.addShadow(tc.pos.x, tc.pos.z, 2, tc.y);
    }
    this.fx.endShadows();
    this.fx.update(dt);
    this.stage.update(dt || 0.0001, t);

    // camera
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    const s = this.trauma * this.trauma;
    const a = t * 0.07;
    this.camera.position.set(Math.cos(a + 0.8) * 17 + Math.sin(t * 61) * s * 1.2, 13 + Math.sin(t * 77) * s, Math.sin(a + 0.8) * 17 + Math.sin(t * 93) * s * 1.2);
    this.camera.lookAt(0, 1.6, 0);
    this.camera.rotateZ(Math.sin(t * 47) * s * 0.06);
    const u = this.pipeline.final.uniforms;
    u.uImpact.value = this.impact > 0 ? 1 : 0;
    if (this.impact > 0) this.impact--;
    u.uAberration.value = s * 0.8;
    this.pipeline.render(t);
  };

  private respawn(tc: Teacher) {
    tc.a = Math.random() * Math.PI * 2;
    tc.r = 7 + Math.random() * 4;
    tc.pos.set(Math.cos(tc.a) * tc.r, 0, Math.sin(tc.a) * tc.r);
    tc.y = 14 + Math.random() * 6;
    tc.vy = 0;
    tc.fate = 'drop';
    tc.t = 0;
    tc.obj.visible = true;
    tc.vel.set(0, 0, 0);
  }

  resetCombo() { this.combo = 0; this.hooks.combo(0); }

  dispose() { cancelAnimationFrame(this.raf); this.pipeline.dispose(); this.stage.dispose(); }
}

export { outQuad };
