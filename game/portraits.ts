import * as THREE from 'three';
import { CHARACTERS } from '../types';
import { buildHero } from './models/heroes';
import { BOSS_ORDER } from './bosses/Boss';
import { createBoss } from './bosses';
import type { Game } from './Game';
import { disposeObject } from './models/builder';

export type Portraits = Record<string, string>;

let cache: Portraits | null = null;

// Renders every hero head and boss bust once into PNG data URLs, then drops the WebGL context.
export const getPortraits = (): Portraits => {
  if (cache) return cache;
  const out: Portraits = {};
  let renderer: THREE.WebGLRenderer | null = null;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(256, 256, false);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#cfefff', '#1a2a3a', 2.2));
    const key = new THREE.DirectionalLight('#ffffff', 2.2);
    key.position.set(3, 5, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#00ffd5', 2.5);
    rim.position.set(-6, 2, -4);
    scene.add(rim);
    const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 200);

    const shoot = (obj: THREE.Object3D, focus: THREE.Object3D, pad: number, yBias = 0) => {
      scene.add(obj);
      obj.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(focus);
      const c = box.getCenter(new THREE.Vector3());
      const s = box.getSize(new THREE.Vector3());
      const r = Math.max(s.x, s.y) * pad;
      const dist = r / Math.tan((cam.fov * Math.PI) / 360);
      cam.position.set(c.x + dist * 0.28, c.y + yBias * r + dist * 0.05, c.z + dist);
      cam.lookAt(c.x, c.y + yBias * r, c.z);
      renderer!.render(scene, cam);
      const url = renderer!.domElement.toDataURL('image/png');
      scene.remove(obj);
      return url;
    };

    for (const c of CHARACTERS) {
      const rig = buildHero(c);
      rig.root.rotation.y = 0.35;
      out[c] = shoot(rig.root, rig.pivots.head, 0.62, -0.05);
      out[c + '_full'] = shoot(rig.root, rig.root, 0.62, 0);
      disposeObject(rig.root);
    }
    const stub = { difficulty: 1, scene: new THREE.Scene() } as unknown as Game;
    for (const id of BOSS_ORDER) {
      try {
        const b = createBoss(stub, id);
        b.rig.root.rotation.y = 0.4;
        out[id] = shoot(b.rig.root, b.rig.root, 0.55, 0.12);
        disposeObject(b.rig.root);
      } catch {
        out[id] = '';
      }
    }
  } catch {
    // no WebGL: portraits stay empty, UI falls back to colored blocks
  } finally {
    renderer?.dispose();
    renderer?.forceContextLoss();
  }
  cache = out;
  return out;
};
