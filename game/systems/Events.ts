import * as THREE from 'three';
import type { Game, StrikeOpts } from '../Game';
import type { Enemy } from '../entities/Enemies';
import type { EventId } from '../data/dialogues';
import { EVENT_TEXT } from '../data/dialogues';
import { PAL } from '../palette';
import { box, buildRig, cyl, mergeParts, Rig, sph, tor } from '../models/builder';
import { makeOutlineMaterial, makeToonMaterial, neonMaterial, toonMesh } from '../render/toon';
import type { Telegraph } from '../core/Fx';
import { audio } from '../audio/audio';
import { music } from '../audio/music';

interface Desk { obj: THREE.Object3D; pos: THREE.Vector3; tele: Telegraph; t: number; done: boolean }

const DURATION: Record<EventId, number> = { blackout: 20, rift: 22, pop_quiz: 22, recess: 12, council: 40, helicopter: 14 };
const ORDER: EventId[] = ['pop_quiz', 'blackout', 'rift', 'helicopter', 'recess', 'council'];

export class Events {
  current: EventId | null = null;
  private t = 0;
  private timer = 32;
  private last: EventId | null = null;
  private used = new Set<EventId>();
  forcedIntensity: number | null = null;
  private sub = 0;
  private group = new THREE.Group();
  private desks: Desk[] = [];
  private deskGeo: THREE.BufferGeometry;
  private toon = makeToonMaterial();
  private outline = makeOutlineMaterial(0.05);
  private portal: { obj: THREE.Group; pos: THREE.Vector3; hp: number; flash: number } | null = null;
  private council: Enemy[] = [];
  private beams: THREE.Mesh[] = [];
  private heli: Rig | null = null;
  private heliFrom = new THREE.Vector3();
  private heliTo = new THREE.Vector3();
  private darkness = 0;

  constructor(private game: Game) {
    game.scene.add(this.group);
    this.deskGeo = mergeParts([
      box(2.2, 0.15, 1.3, '#a0703c', [0, 1.2, 0]),
      box(0.12, 1.2, 0.12, '#555c66', [-1, 0.6, -0.55]), box(0.12, 1.2, 0.12, '#555c66', [1, 0.6, -0.55]),
      box(0.12, 1.2, 0.12, '#555c66', [-1, 0.6, 0.55]), box(0.12, 1.2, 0.12, '#555c66', [1, 0.6, 0.55]),
      box(0.6, 0.05, 0.8, '#f4f4f4', [0.4, 1.3, 0.1], [0, 0.3, 0]),
    ]);
    const beamMat = neonMaterial(PAL.danger, 2.6, { transparent: true, opacity: 0.85 });
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1, 8).rotateZ(Math.PI / 2), beamMat);
      b.visible = false;
      this.group.add(b);
      this.beams.push(b);
    }
  }

  update(dt: number) {
    const g = this.game;
    this.darkness += ((this.current === 'blackout' ? 1 : 0) - this.darkness) * Math.min(1, dt * 3);
    g.post.uDark = this.darkness;
    g.stage.setDarkness(this.darkness);
    g.hero.light.intensity = 6 + this.darkness * 50;
    g.hero.light.distance = 14 + this.darkness * 8;

    if (!this.current) {
      this.timer -= dt;
      if (this.timer <= 0 && g.quota - g.stageKills > 12) this.start(this.choose());
      this.updateDesks(dt);
      return;
    }
    this.t += dt;
    this.sub -= dt;
    const left = DURATION[this.current] - this.t;
    const banner = g.hud.get().banner;
    if (banner) g.hud.set('banner', { ...banner, time: Math.max(0, Math.ceil(left)) });

    switch (this.current) {
      case 'rift': this.updateRift(dt); break;
      case 'pop_quiz':
        if (this.sub <= 0) {
          this.sub = 0.55;
          const near = Math.random() < 0.45;
          const R = g.arenaRadius - 3;
          const p = near ? g.hero.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 5, 0, (Math.random() - 0.5) * 5)) : new THREE.Vector3((Math.random() - 0.5) * 2 * R, 0, (Math.random() - 0.5) * 2 * R);
          if (p.length() > R) p.setLength(R * Math.random());
          this.dropDesk(p);
        }
        break;
      case 'recess':
        if (this.sub <= 0) {
          this.sub = 0.18;
          const a = Math.random() * Math.PI * 2, r = Math.random() * (g.arenaRadius - 3);
          g.pickups.spawn(Math.random() < 0.03 && g.hero.lives < g.hero.maxLives ? 'corde' : 'note', new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r), true);
        }
        break;
      case 'council': this.updateCouncil(); break;
      case 'helicopter': this.updateHeli(dt); break;
    }
    this.updateDesks(dt);
    if (left <= 0) this.end();
  }

  private choose(): EventId {
    let pool = ORDER.filter((e) => !this.used.has(e) && e !== this.last);
    if (this.game.stageNum < 3) pool = pool.filter((e) => e !== 'council');
    if (!pool.length) { this.used.clear(); pool = ORDER.filter((e) => e !== this.last && (this.game.stageNum >= 3 || e !== 'council')); }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  start(id: EventId) {
    const g = this.game;
    this.current = id;
    this.last = id;
    this.used.add(id);
    this.t = 0;
    this.sub = 0.5;
    const txt = EVENT_TEXT[id];
    g.hud.set('banner', { id: Date.now(), title: txt.title, subtitle: txt.subtitle, time: DURATION[id] });
    audio.play(id === 'blackout' ? 'blackout' : 'eventSiren');
    g.dialogue.bark(id === 'helicopter' ? 'directeur' : 'radio', txt.bark);
    switch (id) {
      case 'rift': {
        const a = Math.random() * Math.PI * 2;
        const pos = new THREE.Vector3(Math.cos(a) * 13, 0, Math.sin(a) * 13);
        const obj = new THREE.Group();
        const mat = neonMaterial(PAL.power, 2.8, { side: THREE.DoubleSide });
        for (let i = 0; i < 3; i++) {
          const r = new THREE.Mesh(new THREE.TorusGeometry(2.4 - i * 0.6, 0.12, 8, 40), mat);
          r.userData.spin = (i % 2 ? -1 : 1) * (1.5 + i);
          obj.add(r);
        }
        const core = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ color: '#000a10', side: THREE.DoubleSide }));
        obj.add(core);
        obj.position.copy(pos).setY(3);
        this.group.add(obj);
        this.portal = { obj, pos, hp: 420, flash: 0 };
        audio.play('portal');
        g.fx.ring(pos, PAL.power, 0.5, 8, 0.6, 3);
        break;
      }
      case 'recess':
        this.forcedIntensity = 5;
        music.setIntensity(5);
        break;
      case 'council': {
        this.council = [];
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 + Math.random();
          const p = g.hero.pos.clone().add(new THREE.Vector3(Math.cos(a) * 12, 0, Math.sin(a) * 12));
          if (p.length() > g.arenaRadius - 3) p.setLength(g.arenaRadius - 3);
          const e = g.enemies.spawn('inspecteur', p, 'drop');
          if (e) this.council.push(e);
        }
        break;
      }
      case 'helicopter': {
        const a = Math.random() * Math.PI * 2;
        this.heliFrom.set(Math.cos(a) * 60, 13, Math.sin(a) * 60);
        this.heliTo.set(-Math.cos(a) * 60, 13, -Math.sin(a) * 60);
        this.heli = buildRig([
          { name: 'body', parts: [sph(2.2, '#3c4a66', [0, 0, 0], [1, 0.8, 1.5]), sph(1.2, '#9fd8ff', [0, 0.4, 2.2], [1, 0.8, 0.7], 0.4), box(0.6, 0.6, 4.5, '#3c4a66', [0, 0.4, -4]), box(0.2, 1.6, 1.0, '#3c4a66', [0, 1.0, -6.2]), box(4, 0.15, 0.2, '#222', [0, -2.2, 0.8]), box(4, 0.15, 0.2, '#222', [0, -2.2, -0.8]), sph(0.25, PAL.danger, [1.6, 0, 1], 1, 3), sph(0.25, PAL.danger, [-1.6, 0, 1], 1, 3), sph(0.6, '#d9cfc0', [0, 0.2, 2.6]), box(1.2, 0.7, 0.1, '#ffffff', [0, -0.8, 3.2])] },
          { name: 'rotor', parent: 'body', at: [0, 2.0, 0], parts: [box(10, 0.1, 0.5, '#222'), box(0.5, 0.1, 10, '#222'), cyl(0.3, 0.3, 0.6, '#222', [0, -0.3, 0])] },
          { name: 'tail', parent: 'body', at: [0.4, 1.2, -6.2], parts: [box(0.1, 3, 0.3, '#222'), tor(0.2, 0.05, '#222', [0, 0, 0], [0, Math.PI / 2, 0])] },
        ], 0.08);
        this.heli.root.position.copy(this.heliFrom);
        this.heli.root.lookAt(this.heliTo);
        this.group.add(this.heli.root);
        audio.play('helicopter');
        break;
      }
    }
  }

  private dropDesk(p: THREE.Vector3) {
    const tele = this.game.fx.telegraphCircle(p, 2.2, 1.0, 0.05);
    const tp = toonMesh(this.deskGeo, this.toon, this.outline);
    tp.group.visible = false;
    tp.group.rotation.y = Math.random() * Math.PI;
    this.group.add(tp.group);
    this.desks.push({ obj: tp.group, pos: p.clone(), tele, t: 0, done: false });
    audio.play('telegraph', { volume: 0.4 });
  }

  private updateDesks(dt: number) {
    const g = this.game;
    for (const d of this.desks) {
      d.t += dt;
      const fallStart = 0.7;
      if (d.t > fallStart && !d.done) {
        d.obj.visible = true;
        const k = Math.min(1, (d.t - fallStart) / 0.3);
        d.obj.position.set(d.pos.x, 18 * (1 - k * k), d.pos.z);
        d.obj.rotation.x = (1 - k) * 2;
        if (k >= 1) {
          d.done = true;
          g.fx.ring(d.pos, PAL.bone, 0.5, 3.5, 0.3, 1.5);
          g.fx.debris(d.pos.clone().setY(1), ['#a0703c', '#555c66', '#f4f4f4'], 12, 13, 0.5);
          g.fx.splat(d.pos, 3.4, PAL.void3);
          g.shake(0.2, 0.1, 0);
          audio.play('smash', { volume: 0.6, pitch: 1.2 });
          if (g.hero.pos.distanceTo(d.pos) < 2.2 + g.hero.radius && g.hero.y < 2) g.hero.hurt(d.pos);
          for (const e of g.enemies.list) if (e.alive && e.pos.distanceTo(d.pos) < 2.4 + e.radius) g.enemies.hit(e, { dmg: 70, dir: e.pos.clone().sub(d.pos).setY(0).normalize(), kb: 12, launch: 8, tag: -7000 - Math.floor(d.t * 1000) - Math.floor(d.pos.x * 31), breaksGuard: true });
        }
      }
      if (d.done && d.t > 2.4) { d.obj.position.y -= dt * 3; }
      if (d.t > 3.2) { this.group.remove(d.obj); d.t = -999; }
    }
    this.desks = this.desks.filter((d) => d.t !== -999);
  }

  private updateRift(dt: number) {
    const g = this.game;
    const p = this.portal;
    if (!p) return;
    p.obj.children.forEach((c) => { if (c.userData.spin) c.rotation.z += dt * c.userData.spin; });
    p.obj.lookAt(g.cam.camera.position);
    p.flash = Math.max(0, p.flash - dt * 5);
    p.obj.scale.setScalar(1 + p.flash * 0.15 + Math.sin(g.time * 6) * 0.04);
    if (this.sub <= 0) {
      this.sub = 1.1;
      const kind = Math.random() < 0.7 ? 'solfege' : 'maths';
      g.enemies.spawn(kind, p.pos.clone(), 'portal', true);
      g.fx.burst(p.pos.clone().setY(3), PAL.power, 12, 12, { size: 0.4, life: 0.4 });
    }
    if (Math.random() < 0.5) g.fx.burst(p.pos.clone().setY(3), PAL.power, 1, 4, { size: 0.3, life: 0.6, grav: -3 });
  }

  // Lets hero strikes damage event objects (rift portal). Returns hits.
  strike(o: StrikeOpts): number {
    const p = this.portal;
    if (!p || this.current !== 'rift') return 0;
    if (p.pos.distanceTo(o.center) > o.radius + 2.2) return 0;
    p.hp -= o.dmg;
    p.flash = 1;
    this.game.overlay.pop(String(Math.round(o.dmg)), p.pos.clone().setY(5), o.crit ? 'crit' : 'dmg');
    if (p.hp <= 0) {
      const g = this.game;
      g.fx.burst(p.pos.clone().setY(3), PAL.power, 80, 26, { size: 0.6, life: 0.8 });
      for (let i = 0; i < 3; i++) g.fx.ring(p.pos, PAL.power, 0.5, 8 + i * 5, 0.5 + i * 0.2, 3);
      g.shake(0.6, 0.5, 8);
      audio.play('explosion');
      g.addScore(5000);
      g.overlay.pop('FAILLE SCELLÉE +5000', p.pos.clone().setY(6), 'big');
      this.end();
    }
    return 1;
  }

  private updateCouncil() {
    const g = this.game;
    const alive = this.council.filter((e) => e.alive && e.state !== 'dying' && e.state !== 'fall');
    this.beams.forEach((b) => (b.visible = false));
    if (!alive.length && this.t > 2) {
      g.addScore(8000);
      g.overlay.pop('CONSEIL DISSOUS +8000', g.hero.pos.clone().setY(6), 'big');
      this.end();
      return;
    }
    if (alive.length < 2) return;
    const pairs: [Enemy, Enemy][] = alive.length === 3 ? [[alive[0], alive[1]], [alive[1], alive[2]], [alive[2], alive[0]]] : [[alive[0], alive[1]]];
    const h = g.hero;
    pairs.forEach(([a, b], i) => {
      const beam = this.beams[i];
      const A = a.pos.clone().setY(1.6), B = b.pos.clone().setY(1.6);
      const len = A.distanceTo(B);
      beam.visible = true;
      beam.position.copy(A).add(B).multiplyScalar(0.5);
      beam.scale.set(len, 1 + Math.sin(g.time * 30) * 0.2, 1 + Math.sin(g.time * 30) * 0.2);
      beam.rotation.set(0, -Math.atan2(B.z - A.z, B.x - A.x), 0);
      const ab = B.clone().sub(A).setY(0), ah = h.pos.clone().sub(A).setY(0);
      const t = Math.max(0, Math.min(1, ah.dot(ab) / ab.lengthSq()));
      const closest = A.clone().setY(0).addScaledVector(ab, t);
      if (closest.distanceTo(h.pos.clone().setY(0)) < 0.9 && h.y < 1.4) h.hurt(closest);
    });
  }

  private updateHeli(dt: number) {
    const g = this.game;
    const H = this.heli;
    if (!H) return;
    const k = Math.min(1, this.t / DURATION.helicopter);
    H.root.position.lerpVectors(this.heliFrom, this.heliTo, k);
    H.root.position.y = 13 + Math.sin(this.t * 2) * 0.8;
    H.pivots.rotor.rotation.y += dt * 40;
    H.pivots.tail.rotation.x += dt * 40;
    const r = Math.hypot(H.root.position.x, H.root.position.z);
    if (this.sub <= 0 && r < g.arenaRadius - 3) {
      this.sub = 0.45;
      g.enemies.spawn(Math.random() < 0.8 ? 'solfege' : 'surveillant', H.root.position.clone().setY(0), 'drop');
    }
  }

  onKill(_e: Enemy) {}

  stop() { if (this.current) this.end(); this.timer = 9999; }

  private end() {
    const g = this.game;
    const id = this.current;
    this.current = null;
    this.timer = 48 + Math.random() * 22;
    g.hud.set('banner', null);
    this.forcedIntensity = null;
    music.setIntensity(g.nuance);
    if (id === 'rift' && this.portal) { this.group.remove(this.portal.obj); this.portal = null; }
    if (id === 'council') this.beams.forEach((b) => (b.visible = false));
    if (id === 'helicopter' && this.heli) { this.group.remove(this.heli.root); this.heli = null; }
  }
}
