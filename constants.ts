
export const CONSTANTS = {
  ARENA_SIZE: 60,
  HERO_SPEED: 0.28,
  HERO_JUMP_FORCE: 0.8,
  GRAVITY: 0.04,
  ENEMY_SPEED_BASE: 0.06,
  FRICTION: 0.88,
  KNOCKBACK: 3.5, 
  ENEMY_PUSH_FORCE: 0.15,
  ATTACK_COOLDOWN: 25, 
  ATTACK_DURATION: 15, 
  ATTACK_RANGE: 7.5, 
  ATTACK_ARC: Math.PI * 1.5, 
  MAX_ENEMIES: 100,
  WAVE_INTERVAL: 600, 
  HIT_STOP_FRAMES: 4,
  SCREEN_SHAKE_DECAY: 0.9,
  DAMAGE_HERO: 10,
  DAMAGE_ENEMY: 35,
  BOSS: {
    SPAWN_KILLS: 15,
    // Boss 1: Director
    DIRECTOR: {
      HP: 200, // Reduced to approx 5-6 hits (40dmg per hit)
      SCALE: 8.0,
      SPEED: 0.035,
      PUSH_FORCE: 4.0
    },
    // Boss 2: Eagle
    EAGLE: {
      HP: 1500, 
      SCALE: 10.0,
      SPEED: 0.15, 
      PUSH_FORCE: 6.0
    },
    // Boss 3: Kawik (Guinea Pig)
    KAWIK: {
      HP: 3000,
      SCALE: 9.0,
      SPEED: 0.06, // Reduced from 0.12
      PUSH_FORCE: 8.0
    },
    // Boss 4: Tatoo (Armadillo)
    TATOO: {
      HP: 4000,
      SCALE: 9,
      SPEED: 0.05,
      PUSH_FORCE: 10,
      SHELL_SPEED: 0.25,
      SHELL_DURATION: 180,
      WALK_DURATION: 240
    },
    // Boss 5: Taupe (Mole)
    TAUPE: {
      HP: 5000,
      SCALE: 8,
      SPEED: 0.08,
      PUSH_FORCE: 7,
      BURROW_DURATION: 180,
      SURFACE_DURATION: 300
    },
    KNOCKBACK_RESISTANCE: 0.2
  },
  POWERS: {
      ARMAND_SPIN_DURATION: 300, // 5 Seconds
      ARMAND_COOLDOWN: 120, // 2 seconds
      ELIOT_FART_COOLDOWN: 120,
      SWAN_CAT_COOLDOWN: 120,
      AUDREY_CHICKEN_DURATION: 120, 
      AUDREY_COOLDOWN: 120,
      ADRIEN_ROAR_COOLDOWN: 120,
      PIERRE_NUKE_COOLDOWN: 120, 
  },
  NAMES: {
      ARMAND: "BOW SPIN!",
      ELIOT: "GAS ATTACK!",
      SWAN: "CAT LAUNCH!",
      AUDREY: "CHICKEN MODE!",
      ADRIEN: "LION ROAR!",
      PIERRE: "TACTICAL NUKE!"
  },
  COLORS: {
    BG_SCHOOL: 0x000000,
    BG_MOUNTAIN: 0x87CEEB, // Sky blue
    BG_GARDEN: 0x86efac, // Light Green
    BG_DESERT: 0xedc9af, // Sandy beige
    BG_VOLCANO: 0x1a0a00, // Dark volcanic red-black
    GROUND_SCHOOL: 0x2a2a30,
    GROUND_MOUNTAIN: 0xe5e7eb, // Snow/Cloud white
    GROUND_GARDEN: 0x3f6212, // Dark leafy green
    GROUND_DESERT: 0xd4a574, // Sandy ground
    GROUND_VOLCANO: 0x2a1a0a, // Dark volcanic rock
    GRID: 0x33333a
  },
  DEFAULT_SETTINGS: {
      volume: 0.3,
      keys: {
          up: ['w', 'arrowup'],
          down: ['s', 'arrowdown'],
          left: ['a', 'arrowleft'],
          right: ['d', 'arrowright'],
          attack: [' '],
          jump: ['shift'],
          special: ['e', 'enter']
      }
  }
};
