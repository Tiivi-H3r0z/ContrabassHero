
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
}

export interface SpeechBubble {
  mesh: THREE.Sprite;
  life: number;
  offset: THREE.Vector3;
}

export interface Enemy extends Entity {
  type: 'teacher' | 'boss_director' | 'boss_eagle' | 'boss_kawik';
  variation: number; // Index for texture variation
  stunTimer: number;
  speechBubble: SpeechBubble | null;
  isBoss: boolean;
  // Contamination logic for Eliot
  isContaminated?: boolean;
  contaminationTimer?: number;
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
    type: 'cat' | 'grenade' | 'fart';
    mesh: THREE.Sprite;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    life: number;
    radius: number;
    targetId?: string;
}

export interface FloatingText {
  id: string;
  mesh: THREE.Sprite;
  life: number;
  velocity: THREE.Vector3;
}

export interface Prop {
  id: string;
  type: 'desk' | 'chair' | 'rock';
  mesh: THREE.Sprite;
  position: THREE.Vector3;
  radius: number;
  health: number;
}

export enum GameStateStatus {
  MENU,
  PLAYING,
  GAME_OVER
}
