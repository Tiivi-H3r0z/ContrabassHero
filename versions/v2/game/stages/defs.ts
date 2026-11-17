import * as THREE from 'three';

export const ARENA_RADIUS = 28;

export interface StageDef {
  id: number;
  name: string;
  mood: string;
  bg: string;
  fog: string; fogNear: number; fogFar: number;
  neon: string;
  hemiSky: string; hemiGround: string; hemiIntensity: number;
  keyColor: string; keyIntensity: number;
  rimA: string; rimB: string;
}

export interface PropInstance {
  object: THREE.Object3D;
  position: THREE.Vector3;
  radius: number;
  hp: number;
  debris: string[];
  big: boolean;
}

export interface StageBuild {
  def: StageDef;
  group: THREE.Group;
  props: PropInstance[];
  update(dt: number, time: number): void;
  setDarkness(k: number): void;
  dispose(): void;
}

const base = { fogNear: 80, fogFar: 270, hemiIntensity: 0.9, keyIntensity: 2.0 };

export const STAGES: StageDef[] = [
  { ...base, id: 1, name: "L'École", mood: 'Néons de couloir', bg: '#050a1a', fog: '#08102a', neon: '#8fd8ff', hemiSky: '#a4aad8', hemiGround: '#1b1a3a', keyColor: '#e8efff', rimA: '#19e3ff', rimB: '#a36bff' },
  { ...base, id: 2, name: 'La Montagne', mood: 'Glacier UV', bg: '#03101c', fog: '#071d30', neon: '#9ff3ff', hemiSky: '#b4c8e0', hemiGround: '#0d2a4a', keyColor: '#eef8ff', rimA: '#9ff3ff', rimB: '#7a6bff' },
  { ...base, id: 3, name: 'Le Potager', mood: 'Potager radioactif', bg: '#030d07', fog: '#061a0c', neon: '#7cff2e', hemiSky: '#c8d4bc', hemiGround: '#0e2a12', keyColor: '#fbf6e2', rimA: '#8fd860', rimB: '#3fd8c8' },
  { ...base, id: 4, name: 'Le Désert', mood: 'Désert synthwave', bg: '#10051a', fog: '#220a2a', neon: '#ff5fc8', hemiSky: '#ffb6dc', hemiGround: '#3a1240', keyColor: '#fff0e4', rimA: '#ff5fc8', rimB: '#4da3ff' },
  { ...base, id: 5, name: 'Le Volcan', mood: 'Forge', bg: '#0a0309', fog: '#1a0614', neon: '#ffd34d', hemiSky: '#ffa6cc', hemiGround: '#1a0510', keyColor: '#fff0dc', rimA: '#ff3d8b', rimB: '#ffd34d' },
  { ...base, id: 6, name: 'Le Jardin enchanté', mood: 'Champignons fluo', bg: '#0b0517', fog: '#180a2c', neon: '#d04bff', hemiSky: '#d8b0ff', hemiGround: '#1d0b33', keyColor: '#f6ecff', rimA: '#d04bff', rimB: '#00ffd5' },
  { ...base, id: 7, name: 'La Jungle', mood: 'Jungle bioluminescente', bg: '#020b08', fog: '#03140f', neon: '#00ffa3', hemiSky: '#a6f0cc', hemiGround: '#03140f', keyColor: '#ecfff4', rimA: '#00ffa3', rimB: '#4da3ff' },
];

// Internal per-stage art data (not part of the public StageDef).
export interface Theme {
  skyDeep: string;    // straight below
  skyTint: string;    // band around the horizon
  skyTop: string;     // above
  nebula: string;     // faint clouds in the void
  rockTop: string;    // platform lip
  rockA: string; rockB: string; // strata
  rockDeep: string;   // underside
  drip: string;       // hanging details under the lip
  crystal: string;    // glowing crystals under the island
  mote: string;       // ambient floating particles
  aurora: number; sun: number; belowGlow: string;
}

export const THEMES: Theme[] = [
  { skyDeep: '#02050d', skyTint: '#2a2a6a', skyTop: '#0b0a24', nebula: '#4a3aa8', rockTop: '#4a5170', rockA: '#30344f', rockB: '#262a42', rockDeep: '#171a2c', drip: '#3a4060', crystal: '#8fd8ff', mote: '#9fdcff', aurora: 0, sun: 0, belowGlow: '#0a1440' },
  { skyDeep: '#020a14', skyTint: '#2f6ea0', skyTop: '#0d2a4a', nebula: '#3a6ec0', rockTop: '#a8c2de', rockA: '#4f6f96', rockB: '#3d5a80', rockDeep: '#1d3150', drip: '#9fdcff', crystal: '#9ff3ff', mote: '#d8f6ff', aurora: 1, sun: 0, belowGlow: '#0a2a48' },
  { skyDeep: '#020804', skyTint: '#2d6b1a', skyTop: '#0e2a12', nebula: '#4a9a20', rockTop: '#3f5a26', rockA: '#4a3426', rockB: '#3a281e', rockDeep: '#1f1612', drip: '#5a3e2a', crystal: '#7cff2e', mote: '#b6ff5a', aurora: 0, sun: 0, belowGlow: '#0c2a08' },
  { skyDeep: '#0a0312', skyTint: '#a0306a', skyTop: '#3a1240', nebula: '#c0408a', rockTop: '#b0607e', rockA: '#8a4466', rockB: '#6e3656', rockDeep: '#3a1a34', drip: '#a05478', crystal: '#ff5fc8', mote: '#ffb0e0', aurora: 0, sun: 1, belowGlow: '#3a0a40' },
  { skyDeep: '#080206', skyTint: '#5a0f3a', skyTop: '#1a0510', nebula: '#8a1a5a', rockTop: '#2a2228', rockA: '#1e181e', rockB: '#161216', rockDeep: '#0c090c', drip: '#ffd34d', crystal: '#ffd34d', mote: '#ffe08a', aurora: 0, sun: 0, belowGlow: '#4a0a2e' },
  { skyDeep: '#06020e', skyTint: '#6a1f9a', skyTop: '#1d0b33', nebula: '#8a3ad0', rockTop: '#4a2e6a', rockA: '#3a2452', rockB: '#2e1c42', rockDeep: '#170e24', drip: '#5a3a80', crystal: '#d04bff', mote: '#e0a0ff', aurora: 0, sun: 0, belowGlow: '#2a0a4a' },
  { skyDeep: '#010806', skyTint: '#0b5a40', skyTop: '#03140f', nebula: '#109a6a', rockTop: '#24452e', rockA: '#2a3a2a', rockB: '#1f2e22', rockDeep: '#0e1810', drip: '#1f6a3a', crystal: '#00ffa3', mote: '#7dffd0', aurora: 0, sun: 0, belowGlow: '#03301e' },
];
