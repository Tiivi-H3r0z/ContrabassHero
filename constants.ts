
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
  DAMAGE_ENEMY: 35,
  ATTACK_DAMAGE: 40,      // normal attack
  SPECIAL_DAMAGE: 120,    // special power = 3× normal attack
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
    // Boss 6: Ninja Pain (Rabbit)
    NINJA_PAIN: {
      HP: 6000,
      SCALE: 7,
      JUMP_PREP_DURATION: 30,   // 0.5s crouched on ground
      JUMP_AIR_DURATION: 90,    // 1.5s in the air
      LAND_DAMAGE_RADIUS: 4.5,
      LAND_PUSH_FORCE: 18,
      CARROT_GROUND_FRAMES: 300, // 5 seconds
      CARROT_VIBRATE_FRAMES: 30, // 0.5 seconds
      LIGHTNING_RADIUS: 2.6,
      LIGHTNING_DURATION: 24,
      PHASE2_HP_RATIO: 0.5,
      PHASE2_CARROT_INTERVAL: 45, // frames between sky carrots in phase 2
      PHASE1_CARROTS_ON_LAND: 5,
    },
    // Boss 7: Snake
    SNAKE: {
      HP: 7000,
      SCALE: 9,
      SPEED: 0.10,
      CONSTRICT_RANGE: 3.5,      // Distance to grab hero
      CONSTRICT_DAMAGE_INTERVAL: 300, // 5 seconds at 60fps
      CONSTRICT_ESCAPE_JUMPS: 3,
      SLITHER_DURATION: 360,     // 6s slither phase
      CONSTRICT_DURATION: 600,   // max 10s constrict before releasing
      STUNNED_DURATION: 120,     // 2s stunned after hero escapes
      PUSH_FORCE: 5,
    },
    KNOCKBACK_RESISTANCE: 0.2
  },
  POWERS: {
      ARMAND_SPIN_DURATION: 300, // 5 Seconds
      ARMAND_COOLDOWN: 120, // 2 seconds
      ELIOT_FART_COOLDOWN: 120,
      ELIOT_FART_COUNT: 8,       // nuages spawned per use
      ELIOT_FART_LIFETIME: 210,  // frames (~3.5s)
      ELIOT_FART_RADIUS: 1.8,    // collision radius
      SWAN_CAT_COOLDOWN: 120,
      SWAN_CAT_DURATION: 300, // 5 seconds at 60fps
      AUDREY_CHICKEN_DURATION: 120, 
      AUDREY_COOLDOWN: 120,
      ADRIEN_ROAR_DURATION: 70,
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
    BG_GARDEN2: 0x2d5016, // Deep enchanted garden (stage 6)
    BG_JUNGLE: 0x0a2a0a, // Dark jungle green (stage 7)
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
