
import * as THREE from 'three';

export type CharacterType = 'armand' | 'adrien' | 'eliot' | 'swan' | 'pierre' | 'audrey';

export interface GameConfig {
  heroSpeed: number;
  enemySpeed: number;
  arenaSize: number;
  attackCooldown: number;
  knockbackForce: number;
  friction: number;
}

export interface KeyBindings {
    up: string[];
    down: string[];
    left: string[];
    right: string[];
    attack: string[];
    jump: string[];
    special: string[];
}

export interface GameSettings {
    volume: number;
    keys: KeyBindings;
}

export interface Entity {
  id: string;
  mesh: THREE.Sprite;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  health: number;
  maxHealth: number;
  isDead: boolean;
  radius: number;
}

export interface Hero extends Entity {
  weaponMesh: THREE.Sprite;
  attackTimer: number;
  isAttacking: boolean;
  facing: THREE.Vector3; // Direction facing
  isJumping: boolean;
  specialCooldown: number;
  maxSpecialCooldown: number; // Added for UI calculation
  specialActiveTimer: number; // For duration-based powers
  lastHitTime?: number; // For invincibility frames
  isConstricted?: boolean;      // Snake boss constriction
  constrictJumps?: number;      // Jumps done while constricted (need 3 to escape)
  constrictDamageTimer?: number; // Frames until next constriction damage
}

export interface SpeechBubble {
  mesh: THREE.Sprite;
  life: number;
  offset: THREE.Vector3;
}

export interface Enemy extends Entity {
  type: 'teacher' | 'boss_director' | 'boss_eagle' | 'boss_kawik' | 'boss_tatoo' | 'boss_taupe' | 'boss_ninja_pain' | 'boss_snake';
  variation: number; // Index for texture variation
  stunTimer: number;
  speechBubble: SpeechBubble | null;
  isBoss: boolean;
  // Contamination logic for Eliot
  isContaminated?: boolean;
  contaminationTimer?: number;
  // Boss phase mechanics (Tatoo/Taupe/Ninja Pain)
  bossPhase?: 'shell' | 'walk' | 'surface' | 'burrow' | 'jump_prep' | 'jump_air' | 'jump_prep_p2' | 'jump_air_p2' | 'slither' | 'constrict' | 'stunned';
  bossPhaseTimer?: number;
  bossShadowMesh?: THREE.Sprite;
  bossLandingX?: number;
  bossLandingZ?: number;
}

export interface Particle {
  id: string;
  mesh: THREE.Sprite;
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
  scaleSpeed: number;
}

export interface Projectile {
    id: string;
    type: 'cat' | 'grenade' | 'fart' | 'lava';
    mesh: THREE.Sprite;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    life: number;
    radius: number;
    targetId?: string;
}

export interface CarrotBomb {
  id: string;
  mesh: THREE.Sprite;
  position: THREE.Vector3;
  groundTime: number;           // frames since spawned on ground
  phase: 'idle' | 'vibrating' | 'struck';
  lightningMesh?: THREE.Sprite; // shown on strike
}

export interface FloatingText {
  id: string;
  mesh: THREE.Sprite;
  life: number;
  velocity: THREE.Vector3;
}

export interface Prop {
  id: string;
  type: 'desk' | 'chair' | 'rock' | 'snowball' | 'dirt_mound' | 'lava_crater' | 'windmill' | 'gnome' | 'vine' | 'totem';
  mesh: THREE.Sprite;
  position: THREE.Vector3;
  radius: number;
  hitCount: number; // 0 = pristine, 1-2 = damaged, 3 = destroyed
  maxHits: number;
  lastHitTime: number; // ms timestamp — cooldown between hits
}

export enum GameStateStatus {
  MENU,
  PLAYING,
  GAME_OVER,
  VICTORY
}
