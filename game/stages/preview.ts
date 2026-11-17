import * as THREE from 'three';
import { Pipeline } from '../render/Pipeline';
import { CameraRig } from '../core/CameraRig';
import { buildHero } from '../models/heroes';
import { buildStage } from './index';

const q = new URLSearchParams(location.search);
const num = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d);
const stageId = num('stage', 1);
const container = document.getElementById('view')!;
const scene = new THREE.Scene();
const rig = new CameraRig(container.clientWidth / Math.max(1, container.clientHeight));
rig.dist = rig.baseDist = num('dist', 40);
const pipe = new Pipeline(container, scene, rig.camera);

const stage = buildStage(stageId);
scene.add(stage.group);
scene.background = new THREE.Color(stage.def.bg);
scene.fog = new THREE.Fog(stage.def.fog, stage.def.fogNear, stage.def.fogFar);
stage.setDarkness(num('dark', 0));

const heroes = ['armand', 'audrey', 'swan'] as const;
const hp = new THREE.Vector3(num('x', 0), 0, num('z', 0));
heroes.forEach((h, i) => {
  const r = buildHero(h);
  r.root.position.set(hp.x + (i - 1) * 3, 0, hp.z + (i === 1 ? -2 : 0));
  r.root.rotation.y = Math.PI / 4;
  scene.add(r.root);
});
rig.target.copy(hp);
rig.snap();

let draws = 0;
const hud = document.getElementById('hud')!;
const label = `${stage.def.id} · ${stage.def.name} — ${stage.def.mood} · props ${stage.props.length}`;

const t0 = performance.now();
const tOff = num('t', 0);
let last = t0;
const loop = () => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const time = tOff + (now - t0) / 1000;
  stage.update(dt, time);
  if (q.get('spin') === '1') {
    rig.target.set(Math.cos(time * 0.2) * 20, 0, Math.sin(time * 0.2) * 20);
  }
  rig.update(dt);
  pipe.renderer.info.reset();
  pipe.render(time);
  draws = pipe.renderer.info.render.calls;
  hud.textContent = `${label} · ${draws} draw calls (incl. post)`;
  requestAnimationFrame(loop);
};
pipe.renderer.info.autoReset = false;
loop();
setInterval(() => { document.title = `Stage ${stageId} · ${draws} calls`; }, 500);
window.addEventListener('resize', () => {
  rig.camera.aspect = container.clientWidth / Math.max(1, container.clientHeight);
  rig.camera.updateProjectionMatrix();
  pipe.resize(container.clientWidth, container.clientHeight);
});
