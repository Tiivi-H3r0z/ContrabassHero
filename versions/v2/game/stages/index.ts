import * as THREE from 'three';
import { makeOutlineMaterial, makeToonMaterial, neonMaterial, toonMesh } from '../render/toon';
import { toonGradient } from '../render/toon';
import { ARENA_RADIUS, PropInstance, StageBuild, StageDef, STAGES, THEMES } from './defs';
import { buildDistantDecor, buildLamps, buildMotes } from './decor';
import { paintFloor } from './floor';
import { buildIsland, buildIslets } from './island';
import { buildProps } from './props';
import { buildSky } from './sky';

export { ARENA_RADIUS, STAGES };
export type { PropInstance, StageBuild, StageDef };

const RIM_INTENSITY = 1.15;

export function buildStage(stage: number): StageBuild {
  const idx = Math.min(6, Math.max(0, Math.round(stage) - 1));
  const def = STAGES[idx];
  const theme = THEMES[idx];
  const group = new THREE.Group();
  group.name = `stage-${def.id}`;

  // Backdrop
  const sky = buildSky(theme);
  group.add(sky.mesh);

  // Floor
  const tex = paintFloor(def.id, def.neon);
  const floorMat = makeToonMaterial({ map: tex.map });
  floorMat.emissive.set(0xffffff);
  floorMat.emissiveMap = tex.emissive;
  floorMat.emissiveIntensity = tex.intensity;
  const floorGeo = new THREE.CircleGeometry(ARENA_RADIUS, 128);
  floorGeo.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.name = 'floor';
  group.add(floor);

  // Island body + edge ring
  const island = buildIsland(def.id, theme, def.neon);
  const rockMat = makeToonMaterial();
  const rockOutline = makeOutlineMaterial(0.14);
  group.add(toonMesh(island.geo, rockMat, rockOutline).group);
  const ringMat = neonMaterial(def.neon, 1.7);
  const ring = new THREE.Mesh(island.ringGeo, ringMat);
  group.add(ring);

  // Mid-distance islets (outlined, bobbing)
  const isletMat = makeToonMaterial();
  const isletOutline = makeOutlineMaterial(0.12);
  const islets = buildIslets(def.id, theme).map((it) => {
    const g = toonMesh(it.geo, isletMat, isletOutline).group;
    g.position.copy(it.pos);
    group.add(g);
    return { g, base: it.pos.y, phase: it.phase };
  });

  // Far decor (no outlines), two counter-rotating layers
  const decor = buildDistantDecor(def.id, theme);
  const decorMat = makeToonMaterial();
  const nearLayer = new THREE.Mesh(decor.near, decorMat);
  const farLayer = new THREE.Mesh(decor.far, decorMat);
  group.add(nearLayer, farLayer);

  // Lamps
  const lamps = buildLamps(def.id, def.neon);
  group.add(lamps.mesh);
  if (lamps.housing.getAttribute('position')) group.add(toonMesh(lamps.housing, isletMat, isletOutline).group);
  else lamps.housing.dispose();

  // Motes
  const motes = buildMotes(theme.mote, def.id);
  group.add(motes.points);

  // Lights
  const hemi = new THREE.HemisphereLight(def.hemiSky, def.hemiGround, def.hemiIntensity);
  const key = new THREE.DirectionalLight(def.keyColor, def.keyIntensity);
  key.position.set(18, 40, 6);
  key.target.position.set(0, 0, 0);
  const rimA = new THREE.PointLight(def.rimA, RIM_INTENSITY, 75, 0);
  rimA.position.set(-30, 9, 4);
  const rimB = new THREE.PointLight(def.rimB, RIM_INTENSITY, 75, 0);
  rimB.position.set(4, 9, -30);
  group.add(hemi, key, key.target, rimA, rimB);
  const lights: [THREE.Light, number][] = [[hemi, hemi.intensity], [key, key.intensity], [rimA, rimA.intensity], [rimB, rimB.intensity]];

  // Props
  const { props, spinners } = buildProps(def.id, group);

  const floorEm = floorMat.emissiveIntensity;
  const update = (dt: number, time: number) => {
    sky.uniforms.uTime.value = time;
    motes.uniforms.uTime.value = time;
    nearLayer.rotation.y += dt * 0.012;
    farLayer.rotation.y -= dt * 0.006;
    for (const it of islets) {
      it.g.position.y = it.base + Math.sin(time * 0.5 + it.phase) * 0.8;
      it.g.rotation.y += dt * 0.03;
    }
    for (const s of spinners) s.rotation.z += dt * 2.2;
    lamps.update(time);
    if (def.id === 5) floorMat.emissiveIntensity = floorEm * (0.85 + 0.15 * Math.sin(time * 1.3) + 0.05 * Math.sin(time * 5.1));
  };

  const setDarkness = (k: number) => {
    const f = 1 - 0.95 * Math.min(1, Math.max(0, k));
    for (const [l, i] of lights) l.intensity = i * f;
    sky.uniforms.uDim.value = Math.min(1, Math.max(0, k));
  };

  const dispose = () => {
    const geos = new Set<THREE.BufferGeometry>();
    const mats = new Set<THREE.Material>();
    const collect = (o: THREE.Object3D) => o.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.geometry) geos.add(m.geometry);
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => mats.add(x)); else if (mat) mats.add(mat);
    });
    collect(group);
    props.forEach((p) => collect(p.object));
    geos.forEach((g) => g.dispose());
    const grad = toonGradient();
    mats.forEach((m) => {
      const mm = m as THREE.MeshToonMaterial;
      for (const t of [mm.map, mm.emissiveMap]) if (t && t !== grad) t.dispose();
      m.dispose();
    });
    group.removeFromParent();
    group.clear();
  };

  update(0, 0);
  return { def, group, props, update, setDarkness, dispose };
}
