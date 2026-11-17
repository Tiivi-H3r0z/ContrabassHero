import * as THREE from 'three';
import type { CharacterType } from '../types';
import { CHARACTERS } from '../types';
import { Pipeline } from './render/Pipeline';
import { buildHero, HeroRig } from './models/heroes';
import { buildStage, StageBuild } from './stages';
import { Fx } from './core/Fx';
import { HERO_COLORS, PAL } from './palette';
import { disposeObject } from './models/builder';
import { strikeCurve } from './core/anim';

// Live 3D backdrop for the title and character select screens.
export class MenuScene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(34, 1, 0.5, 900);
  private pipeline: Pipeline;
  private stage: StageBuild;
  private heroes: { c: CharacterType; rig: HeroRig; home: THREE.Vector3; swingT: number }[] = [];
  private fx = new Fx();
  private mode: 'title' | 'select' = 'title';
  private selected: CharacterType = 'armand';
  private t = 0;
  private raf = 0;
  private last = performance.now();
  private ring: THREE.Mesh;
  private spot: THREE.PointLight;
  private ro: ResizeObserver;
  private camPos = new THREE.Vector3(30, 22, 30);
  private camLook = new THREE.Vector3();

  constructor(private container: HTMLElement) {
    this.stage = buildStage(1 + Math.floor(Math.random() * 7));
    this.scene.add(this.stage.group);
    this.scene.background = new THREE.Color(this.stage.def.bg);
    this.scene.fog = new THREE.Fog(this.stage.def.fog, this.stage.def.fogNear * 1.4, this.stage.def.fogFar * 1.4);
    this.stage.props.forEach((p) => { if (p.position.length() < 12) p.object.visible = false; });
    this.scene.add(this.fx.group);
    CHARACTERS.forEach((c, i) => {
      const rig = buildHero(c);
      const a = (i - 2.5) * 0.42;
      const home = new THREE.Vector3(Math.sin(a) * 9, 0, Math.cos(a) * 9 - 9);
      rig.root.position.copy(home);
      rig.root.rotation.y = Math.atan2(-home.x, 9 - home.z) * 0.4 + 0.8;
      this.scene.add(rig.root);
      this.heroes.push({ c, rig, home, swingT: Math.random() * 4 });
    });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.0, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.ring.position.y = 0.06;
    this.scene.add(this.ring);
    this.spot = new THREE.PointLight('#ffffff', 40, 16, 1.4);
    this.scene.add(this.spot);
    this.pipeline = new Pipeline(container, this.scene, this.camera);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    this.raf = requestAnimationFrame(this.frame);
  }

  setMode(m: 'title' | 'select') { this.mode = m; }
  setSelected(c: CharacterType) {
    if (c === this.selected) return;
    this.selected = c;
    const h = this.heroes.find((x) => x.c === c);
    if (h) {
      this.fx.burst(new THREE.Vector3(0, 2, 0), HERO_COLORS[c], 30, 14, { size: 0.4, life: 0.5 });
      this.fx.ring(new THREE.Vector3(), HERO_COLORS[c], 0.5, 5, 0.4, 3);
      h.swingT = 0;
    }
  }
  celebrate() {
    this.fx.burst(new THREE.Vector3(0, 2, 0), HERO_COLORS[this.selected], 80, 22, { size: 0.5, life: 0.7 });
    this.fx.ring(new THREE.Vector3(), PAL.power, 0.5, 12, 0.6, 3);
  }

  private resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.pipeline.resize(w, h);
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    const t = this.t;
    const sel = this.mode === 'select';
    for (const h of this.heroes) {
      const P = h.rig.pivots;
      const isSel = h.c === this.selected;
      const target = sel ? (isSel ? new THREE.Vector3(0, 0, 0) : h.home.clone().multiplyScalar(1.6).setY(-30)) : h.home;
      h.rig.root.position.lerp(target, 1 - Math.pow(0.002, dt));
      h.rig.root.visible = h.rig.root.position.y > -20;
      if (sel && isSel) h.rig.root.rotation.y += dt * 0.7;
      else if (!sel) h.rig.root.rotation.y += (0.5 - h.rig.root.position.x * 0.04 - h.rig.root.rotation.y) * dt * 2;
      h.swingT += dt;
      const k = (h.swingT % 3.2);
      P.hips.position.y = 0.95 + Math.abs(Math.sin(t * 3 + h.home.x)) * 0.06;
      P.head.rotation.z = Math.sin(t * 2 + h.home.x) * 0.08;
      P.armL.rotation.set(Math.sin(t * 2) * 0.2, 0, 0.2);
      if (k < 0.5) {
        const e = k / 0.5;
        const v = strikeCurve(k, 0.24, 0.5, 0.3, 0.16);
        P.armR.rotation.set(-Math.PI * 1.05 + 2.6 * v, 0, 0);
        P.torso.rotation.x = -0.3 + 0.7 * v;
        h.rig.root.scale.set(1 + 0.12 * Math.sin(e * Math.PI), 1 - 0.14 * Math.sin(e * Math.PI), 1 + 0.12 * Math.sin(e * Math.PI));
        P.weapon.rotation.set(Math.PI, 0, 0);
        if (e > 0.45 && e < 0.5) this.fx.ring(h.rig.root.position, HERO_COLORS[h.c], 0.5, 4, 0.3, 2.5);
      } else {
        P.torso.rotation.x = 0;
        h.rig.root.scale.set(1, 1 + Math.sin(t * 3.2 + h.home.x) * 0.025, 1);
        P.armR.rotation.set(-0.3 + Math.sin(t * 2) * 0.1, 0, -0.15);
        P.weapon.rotation.set(0.9, 0, 0);
      }
    }
    const col = new THREE.Color(HERO_COLORS[this.selected]);
    (this.ring.material as THREE.MeshBasicMaterial).color.copy(col).multiplyScalar(2.5);
    (this.ring.material as THREE.MeshBasicMaterial).opacity = sel ? 0.9 : 0;
    this.spot.color.copy(col);
    this.spot.position.set(2, 6, 4);
    this.spot.intensity = sel ? 60 : 0;
    if (sel) {
      this.camPos.lerp(new THREE.Vector3(-2.5 + Math.sin(t * 0.3) * 1.5, 5.5, 14), 1 - Math.pow(0.01, dt));
      this.camLook.lerp(new THREE.Vector3(-3.2, 2.6, 0), 1 - Math.pow(0.01, dt));
    } else {
      const a = t * 0.08;
      this.camPos.lerp(new THREE.Vector3(Math.sin(a) * 8 - 2, 9, 26 + Math.cos(a) * 4), 1 - Math.pow(0.02, dt));
      this.camLook.lerp(new THREE.Vector3(-7, 3, -6), 1 - Math.pow(0.02, dt));
      if (Math.random() < dt * 2) this.fx.burst(new THREE.Vector3((Math.random() - 0.5) * 30, 1, (Math.random() - 0.5) * 20 - 6), PAL.power, 6, 6, { size: 0.3, life: 0.8, grav: -2 });
    }
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    this.fx.update(dt);
    this.stage.update(dt, t);
    this.pipeline.render(t);
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.heroes.forEach((h) => disposeObject(h.rig.root));
    this.stage.dispose();
    this.pipeline.dispose();
  }
}
