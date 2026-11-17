
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CONSTANTS } from '../constants';
import { 
  createHeroBodyTexture,
  createContrabassTexture, 
  createDrumsticksTexture,
  createGuitarTexture,
  createPianoTexture,
  createHarpsichordTexture,
  createNoteTexture,
  createTeacherTexture, 
  createEagleTexture,
  createKawikTexture,
  createClassroomFloorTexture, 
  createMountainFloorTexture,
  createGardenFloorTexture,
  createParticleTexture,
  createTextTexture,
  createHealthBarTexture,
  createSpeechBubbleTexture,
  createDeskTexture,
  createChairTexture,
  createTatooTexture,
  createTatooShellTexture,
  createTaupeTexture,
  createDesertFloorTexture,
  createVolcanoFloorTexture,
  createCactusTexture,
  createChickenTexture,
  createLionTexture,
  createCatTexture,
  createGrenadeTexture,
  createFartTexture,
  createYarnTexture,
  createShockwaveTexture,
  createDeskDamagedTexture,
  createChairDamagedTexture,
  createSnowballTexture,
  createSnowballDamagedTexture,
  createDirtMoundTexture,
  createDirtMoundDamagedTexture,
  createLavaCraterTexture,
  createLavaCraterDamagedTexture,
  createLavaProjectileTexture,
  createTaupeShadowTexture,
  createRabbitTexture,
  createCarrotTexture,
  createLightningTexture,
  createRabbitLandingShadowTexture,
  createWindmillTexture,
  createWindmillDamagedTexture,
  createGnomeTexture,
  createGnomeDamagedTexture,
  createEnchantedGardenFloorTexture,
  createSnakeTexture,
  createSnakeConstrictionTexture,
  createVineTexture,
  createVineDamagedTexture,
  createTotemTexture,
  createTotemDamagedTexture,
  createJungleFloorTexture,
} from '../services/assetFactory';
import { Hero, Enemy, Particle, FloatingText, GameStateStatus, Prop, CharacterType, GameSettings, KeyBindings, Projectile, CarrotBomb } from '../types';
import { playSound, startMusic, stopMusic } from '../services/audioService';
import { fetchTeacherInsults, fetchBossTaunts, fetchBossDeathMessage } from '../services/contentService';

interface GameCanvasProps {
  gameState: GameStateStatus;
  character: CharacterType;
  stage: number;
  spawnThreshold: number;
  isDebugMode: boolean;
  isPaused: boolean;
  settings: GameSettings;
  setScore: (score: number) => void;
  setWave: (wave: number) => void;
  setStage: (stage: number) => void;
  onLoseLife: () => void;
  setKillCount: (kills: number) => void;
  onGameOver: () => void;
  onBossEnter: () => void;
  onSpecialUsed: (name: string) => void;
  onStageAdvance: () => void;
  onVictory: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  character,
  stage,
  spawnThreshold,
  isDebugMode,
  isPaused,
  settings,
  setScore, 
  setWave,
  setStage,
  onLoseLife,
  setKillCount,
  onGameOver,
  onBossEnter,
  onSpecialUsed,
  onStageAdvance,
  onVictory
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  
  // Game State Refs
  const gameStateRef = useRef(gameState);
  const heroRef = useRef<Hero | null>(null);
  const heroShadowRef = useRef<THREE.Mesh | null>(null);
  
  // Cooldown UI Refs
  const cooldownCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cooldownTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const cooldownSpriteRef = useRef<THREE.Sprite | null>(null);

  const enemiesRef = useRef<Enemy[]>([]);
  const propsRef = useRef<Prop[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const carrotBombsRef = useRef<CarrotBomb[]>([]);
  const floatTextRef = useRef<FloatingText[]>([]);
  const keysPressed = useRef<Set<string>>(new Set());
  const frameIdRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const waveRef = useRef(1);
  const timeRef = useRef(0);
  const traumaRef = useRef(0);
  const hitStopRef = useRef(0);
  const spawnThresholdRef = useRef(spawnThreshold);
  const isDebugModeRef = useRef(isDebugMode);
  const isPausedRef = useRef(isPaused);
  const stageRef = useRef(stage);
  
  // Boss Mechanics
  const killCountRef = useRef(0);
  const bossActiveRef = useRef(false);

  // AI Content Refs
  const insultPoolRef = useRef<string[]>([]);
  const bossTauntPoolRef = useRef<string[]>([]);
  const lastInsultFetchRef = useRef<number>(0);

  // Scene Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const groundMeshRef = useRef<THREE.Mesh | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Textures Cache
  const texturesRef = useRef<{
    heroBody: THREE.Texture | null;
    weapon: THREE.Texture | null;
    enemies: THREE.Texture[];
    eagle: THREE.Texture | null;
    kawik: THREE.Texture | null;
    tatoo: THREE.Texture | null;
    tatooShell: THREE.Texture | null;
    taupe: THREE.Texture | null;
    particles: THREE.Texture[];
    bam: THREE.Texture | null;
    pow: THREE.Texture | null;
    groundSchool: THREE.Texture | null;
    groundMountain: THREE.Texture | null;
    groundGarden: THREE.Texture | null;
    groundDesert: THREE.Texture | null;
    groundVolcano: THREE.Texture | null;
    desk: THREE.Texture | null;
    chair: THREE.Texture | null;
    cactus: THREE.Texture | null;
    shadow: THREE.Texture | null;
    chicken: THREE.Texture | null;
    lion: THREE.Texture | null;
    cat: THREE.Texture | null;
    grenade: THREE.Texture | null;
    fart: THREE.Texture | null;
    yarn: THREE.Texture | null;
    shockwave: THREE.Texture | null;
    deskDamaged: THREE.Texture[];
    chairDamaged: THREE.Texture[];
    snowball: THREE.Texture | null;
    snowballDamaged: THREE.Texture[];
    dirtMound: THREE.Texture | null;
    dirtMoundDamaged: THREE.Texture[];
    lavaCrater: THREE.Texture | null;
    lavaCraterDamaged: THREE.Texture[];
    lavaProjectile: THREE.Texture | null;
    taupeShadow: THREE.Texture | null;
    rabbit: THREE.Texture | null;
    carrot: THREE.Texture | null;
    lightning: THREE.Texture | null;
    rabbitLandingShadow: THREE.Texture | null;
    windmill: THREE.Texture | null;
    windmillDamaged: THREE.Texture[];
    gnome: THREE.Texture | null;
    gnomeDamaged: THREE.Texture[];
    groundGarden2: THREE.Texture | null;
    snake: THREE.Texture | null;
    snakeConstriction: THREE.Texture | null;
    vine: THREE.Texture | null;
    vineDamaged: THREE.Texture[];
    totem: THREE.Texture | null;
    totemDamaged: THREE.Texture[];
    groundJungle: THREE.Texture | null;
  }>({
    heroBody: null,
    weapon: null,
    enemies: [],
    eagle: null,
    kawik: null,
    tatoo: null,
    tatooShell: null,
    taupe: null,
    particles: [],
    bam: null,
    pow: null,
    groundSchool: null,
    groundMountain: null,
    groundGarden: null,
    groundDesert: null,
    groundVolcano: null,
    desk: null,
    chair: null,
    cactus: null,
    shadow: null,
    chicken: null,
    lion: null,
    cat: null,
    grenade: null,
    fart: null,
    yarn: null,
    shockwave: null,
    deskDamaged: [],
    chairDamaged: [],
    snowball: null,
    snowballDamaged: [],
    dirtMound: null,
    dirtMoundDamaged: [],
    lavaCrater: null,
    lavaCraterDamaged: [],
    lavaProjectile: null,
    taupeShadow: null,
    rabbit: null,
    carrot: null,
    lightning: null,
    rabbitLandingShadow: null,
    windmill: null,
    windmillDamaged: [],
    gnome: null,
    gnomeDamaged: [],
    groundGarden2: null,
    snake: null,
    snakeConstriction: null,
    vine: null,
    vineDamaged: [],
    totem: null,
    totemDamaged: [],
    groundJungle: null,
  });

  useEffect(() => {
    fetchTeacherInsults().then(insults => {
        if(isMountedRef.current) insultPoolRef.current.push(...insults);
    });
    fetchBossTaunts().then(taunts => {
        if(isMountedRef.current) bossTauntPoolRef.current.push(...taunts);
    });
  }, []);

  useEffect(() => {
      spawnThresholdRef.current = spawnThreshold;
  }, [spawnThreshold]);

  useEffect(() => {
      stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    gameStateRef.current = gameState;
    if (gameState === GameStateStatus.PLAYING) {
          startMusic();
      } else {
          stopMusic();
      }
      return () => stopMusic();
  }, [gameState]);

  useEffect(() => {
      isPausedRef.current = isPaused;
      if (!isPaused) keysPressed.current.clear();
  }, [isPaused]);

  useEffect(() => {
      isDebugModeRef.current = isDebugMode;
      enemiesRef.current.forEach(enemy => {
          if (enemy.isBoss) {
              enemy.health = isDebugMode ? 1 : enemy.maxHealth;
          }
      });
  }, [isDebugMode]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!mountRef.current) return;

    while (mountRef.current.firstChild) {
        mountRef.current.removeChild(mountRef.current.firstChild);
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    let bgColor = CONSTANTS.COLORS.BG_SCHOOL;
    if (stageRef.current === 2) bgColor = CONSTANTS.COLORS.BG_MOUNTAIN;
    if (stageRef.current === 3) bgColor = CONSTANTS.COLORS.BG_GARDEN;
    if (stageRef.current === 4) bgColor = CONSTANTS.COLORS.BG_DESERT;
    if (stageRef.current === 5) bgColor = CONSTANTS.COLORS.BG_VOLCANO;
    if (stageRef.current === 6) bgColor = CONSTANTS.COLORS.BG_GARDEN2;
    if (stageRef.current === 7) bgColor = CONSTANTS.COLORS.BG_JUNGLE;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.Fog(bgColor, 20, 80);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    const CAMERA_OFFSET = new THREE.Vector3(24, 32, 24);
    camera.position.copy(CAMERA_OFFSET);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer;
    try {
        renderer = new THREE.WebGLRenderer({ 
            antialias: false,
            alpha: false,
            stencil: false,
            depth: true,
            precision: 'mediump'
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;
    } catch (e) {
        console.error("Critical: WebGL creation failed", e);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'absolute inset-0 flex items-center justify-center text-white pixel-font text-center p-10 bg-black z-50';
        errorDiv.innerText = "WEBGL ERROR: YOUR BROWSER OR HARDWARE MIGHT NOT SUPPORT THIS GAME OR WEBGL CONTEXTS ARE EXHAUSTED.";
        mountRef.current.appendChild(errorDiv);
        return;
    }

    texturesRef.current.heroBody = createHeroBodyTexture(character);
    
    switch(character) {
        case 'armand': texturesRef.current.weapon = createContrabassTexture(); break;
        case 'adrien': texturesRef.current.weapon = createDrumsticksTexture(); break;
        case 'eliot': texturesRef.current.weapon = createGuitarTexture(); break;
        case 'swan': texturesRef.current.weapon = createPianoTexture(); break;
        case 'pierre': texturesRef.current.weapon = createHarpsichordTexture(); break;
        case 'audrey': texturesRef.current.weapon = createNoteTexture(); break;
        default: texturesRef.current.weapon = createContrabassTexture();
    }

    texturesRef.current.chicken = createChickenTexture();
    texturesRef.current.lion = createLionTexture();
    texturesRef.current.cat = createCatTexture();
    texturesRef.current.grenade = createGrenadeTexture();
    texturesRef.current.fart = createFartTexture();
    texturesRef.current.yarn = createYarnTexture();
    texturesRef.current.shockwave = createShockwaveTexture();
    texturesRef.current.deskDamaged = [1, 2, 3].map(l => createDeskDamagedTexture(l as 1|2|3));
    texturesRef.current.chairDamaged = [1, 2, 3].map(l => createChairDamagedTexture(l as 1|2|3));
    texturesRef.current.snowball = createSnowballTexture();
    texturesRef.current.snowballDamaged = [1, 2, 3].map(l => createSnowballDamagedTexture(l as 1|2|3));
    texturesRef.current.dirtMound = createDirtMoundTexture();
    texturesRef.current.dirtMoundDamaged = [1, 2, 3].map(l => createDirtMoundDamagedTexture(l as 1|2|3));
    texturesRef.current.lavaCrater = createLavaCraterTexture();
    texturesRef.current.lavaCraterDamaged = [1, 2, 3].map(l => createLavaCraterDamagedTexture(l as 1|2|3));
    texturesRef.current.lavaProjectile = createLavaProjectileTexture();
    texturesRef.current.taupeShadow = createTaupeShadowTexture();
    texturesRef.current.rabbit = createRabbitTexture();
    texturesRef.current.carrot = createCarrotTexture();
    texturesRef.current.lightning = createLightningTexture();
    texturesRef.current.rabbitLandingShadow = createRabbitLandingShadowTexture();
    texturesRef.current.windmill = createWindmillTexture();
    texturesRef.current.windmillDamaged = [1, 2, 3].map(l => createWindmillDamagedTexture(l as 1|2|3));
    texturesRef.current.gnome = createGnomeTexture();
    texturesRef.current.gnomeDamaged = [1, 2, 3].map(l => createGnomeDamagedTexture(l as 1|2|3));
    texturesRef.current.snake = createSnakeTexture();
    texturesRef.current.snakeConstriction = createSnakeConstrictionTexture();
    texturesRef.current.vine = createVineTexture();
    texturesRef.current.vineDamaged = [1, 2, 3].map(l => createVineDamagedTexture(l as 1|2|3));
    texturesRef.current.totem = createTotemTexture();
    texturesRef.current.totemDamaged = [1, 2, 3].map(l => createTotemDamagedTexture(l as 1|2|3));
    
    texturesRef.current.enemies = [
      createTeacherTexture(0),
      createTeacherTexture(1),
      createTeacherTexture(2),
      createTeacherTexture(3)
    ];
    texturesRef.current.eagle = createEagleTexture();
    texturesRef.current.kawik = createKawikTexture();
    texturesRef.current.tatoo = createTatooTexture();
    texturesRef.current.tatooShell = createTatooShellTexture();
    texturesRef.current.taupe = createTaupeTexture();

    texturesRef.current.groundSchool = createClassroomFloorTexture();
    if (texturesRef.current.groundSchool) texturesRef.current.groundSchool.repeat.set(CONSTANTS.ARENA_SIZE / 8, CONSTANTS.ARENA_SIZE / 8);
    
    texturesRef.current.groundMountain = createMountainFloorTexture();
    if (texturesRef.current.groundMountain) texturesRef.current.groundMountain.repeat.set(CONSTANTS.ARENA_SIZE / 16, CONSTANTS.ARENA_SIZE / 16);

    texturesRef.current.groundGarden = createGardenFloorTexture();
    if (texturesRef.current.groundGarden) texturesRef.current.groundGarden.repeat.set(CONSTANTS.ARENA_SIZE / 8, CONSTANTS.ARENA_SIZE / 8);

    texturesRef.current.groundDesert = createDesertFloorTexture();
    if (texturesRef.current.groundDesert) texturesRef.current.groundDesert.repeat.set(CONSTANTS.ARENA_SIZE / 10, CONSTANTS.ARENA_SIZE / 10);

    texturesRef.current.groundVolcano = createVolcanoFloorTexture();
    if (texturesRef.current.groundVolcano) texturesRef.current.groundVolcano.repeat.set(CONSTANTS.ARENA_SIZE / 10, CONSTANTS.ARENA_SIZE / 10);

    texturesRef.current.groundGarden2 = createEnchantedGardenFloorTexture();
    if (texturesRef.current.groundGarden2) texturesRef.current.groundGarden2.repeat.set(CONSTANTS.ARENA_SIZE / 10, CONSTANTS.ARENA_SIZE / 10);

    texturesRef.current.groundJungle = createJungleFloorTexture();
    if (texturesRef.current.groundJungle) texturesRef.current.groundJungle.repeat.set(CONSTANTS.ARENA_SIZE / 10, CONSTANTS.ARENA_SIZE / 10);

    texturesRef.current.desk = createDeskTexture();
    texturesRef.current.chair = createChairTexture();
    texturesRef.current.cactus = createCactusTexture();
    
    texturesRef.current.particles = [
      createParticleTexture('#ffffff'), 
      createParticleTexture('#ef4444'), 
      createParticleTexture('#fcd34d'), 
      createParticleTexture('#78350f'), 
    ];
    texturesRef.current.bam = createTextTexture('BAM!', '#ff0000');
    texturesRef.current.pow = createTextTexture('CRASH!', '#ffff00');

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 64; shadowCanvas.height = 64;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
        sCtx.fillStyle = 'rgba(0,0,0,0.5)';
        sCtx.filter = 'blur(8px)';
        sCtx.beginPath(); sCtx.ellipse(32, 32, 20, 20, 0, 0, Math.PI*2); sCtx.fill();
        texturesRef.current.shadow = new THREE.CanvasTexture(shadowCanvas);
    }

    const groundGeo = new THREE.BoxGeometry(CONSTANTS.ARENA_SIZE, 40, CONSTANTS.ARENA_SIZE);
    
    let currentFloorTex = texturesRef.current.groundSchool;
    if (stageRef.current === 2) currentFloorTex = texturesRef.current.groundMountain;
    if (stageRef.current === 3) currentFloorTex = texturesRef.current.groundGarden;
    if (stageRef.current === 4) currentFloorTex = texturesRef.current.groundDesert;
    if (stageRef.current === 5) currentFloorTex = texturesRef.current.groundVolcano;
    if (stageRef.current === 6) currentFloorTex = texturesRef.current.groundGarden2;
    if (stageRef.current === 7) currentFloorTex = texturesRef.current.groundJungle;

    const topMat = new THREE.MeshBasicMaterial({ map: currentFloorTex });

    let sideColor = 0x1a1a1a;
    if (stageRef.current === 2) sideColor = 0x555555;
    if (stageRef.current === 3) sideColor = 0x3f6212;
    if (stageRef.current === 4) sideColor = 0x8b6914;
    if (stageRef.current === 5) sideColor = 0x330000;
    if (stageRef.current === 6) sideColor = 0x1f3a0a;
    if (stageRef.current === 7) sideColor = 0x0a1a05;

    const sideMat = new THREE.MeshBasicMaterial({ color: sideColor }); 
    const groundMaterials = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
    const ground = new THREE.Mesh(groundGeo, groundMaterials);
    ground.position.y = -20; 
    scene.add(ground);
    groundMeshRef.current = ground;

    const borderGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(CONSTANTS.ARENA_SIZE, 2, CONSTANTS.ARENA_SIZE));
    const borderMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 4 });
    const border = new THREE.LineSegments(borderGeo, borderMat);
    border.position.y = 0.1;
    scene.add(border);

    const heroBodyMaterial = new THREE.SpriteMaterial({ map: texturesRef.current.heroBody });
    const heroMesh = new THREE.Sprite(heroBodyMaterial);
    heroMesh.scale.set(4, 4, 1);
    heroMesh.center.set(0.5, 0.0); 
    scene.add(heroMesh);

    const cdCanvas = document.createElement('canvas');
    cdCanvas.width = 64;
    cdCanvas.height = 64;
    cooldownCanvasRef.current = cdCanvas;
    const cdTex = new THREE.CanvasTexture(cdCanvas);
    cooldownTextureRef.current = cdTex;
    const cdMat = new THREE.SpriteMaterial({ map: cdTex, depthTest: false, transparent: true });
    const cdSprite = new THREE.Sprite(cdMat);
    cdSprite.scale.set(0.6, 0.6, 1);
    cdSprite.position.set(0.6, 0.8, 0.01); 
    cdSprite.visible = false;
    heroMesh.add(cdSprite);
    cooldownSpriteRef.current = cdSprite;

    const shadowMat = new THREE.MeshBasicMaterial({ 
        map: texturesRef.current.shadow, 
        transparent: true, 
        depthWrite: false 
    });
    const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.1; 
    scene.add(shadowMesh);
    heroShadowRef.current = shadowMesh;

    const weaponMaterial = new THREE.SpriteMaterial({ map: texturesRef.current.weapon });
    const weaponMesh = new THREE.Sprite(weaponMaterial);
    
    if (character === 'armand') {
        weaponMesh.scale.set(0.6, 1.2, 1); 
        weaponMesh.center.set(0.5, 0.6); 
        weaponMesh.position.set(0, 0.3, 0.1); 
    } else if (character === 'adrien') {
        weaponMesh.scale.set(0.5, 0.5, 1); 
        weaponMesh.center.set(0.5, 0.5);
        weaponMesh.position.set(0, 0.3, 0.1);
    } else if (character === 'eliot') {
        weaponMesh.scale.set(0.7, 0.7, 1); 
        weaponMesh.center.set(0.5, 0.6);
        weaponMesh.position.set(0, 0.3, 0.1);
    } else if (character === 'swan' || character === 'pierre') {
        weaponMesh.scale.set(1.0, 1.0, 1); 
        weaponMesh.center.set(0.5, 0.5);
        weaponMesh.position.set(0, 0.3, 0.1);
    } else if (character === 'audrey') {
        weaponMesh.scale.set(0.4, 0.4, 1); 
        weaponMesh.center.set(0.5, 0.5);
        weaponMesh.position.set(0, 0.8, 0.1); 
    }

    heroMesh.add(weaponMesh);

    heroRef.current = {
      id: 'hero',
      mesh: heroMesh,
      weaponMesh: weaponMesh,
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      health: 100,
      maxHealth: 100,
      isDead: false,
      radius: 1.5,
      attackTimer: 0,
      isAttacking: false,
      facing: new THREE.Vector3(0, 0, 1),
      isJumping: false,
      specialCooldown: 0,
      maxSpecialCooldown: 120,
      specialActiveTimer: 0
    };

    const spawnEnvironment = () => {
        if(!isMountedRef.current) return;
        propsRef.current.forEach(p => scene.remove(p.mesh));
        propsRef.current = [];

        if (stageRef.current === 1) {
            const spacingX = 7, spacingZ = 7;
            const startX = -((5) * spacingX) / 2, startZ = -((4) * spacingZ) / 2;
            for(let r=0; r<5; r++) {
                for(let c=0; c<6; c++) {
                    const x = startX + c * spacingX, z = startZ + r * spacingZ;
                    if (Math.abs(x) < 4 && Math.abs(z) < 4) continue;
                    const jX = (Math.random() - 0.5) * 0.5, jZ = (Math.random() - 0.5) * 0.5;
                    const deskMesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturesRef.current.desk }));
                    deskMesh.position.set(x + jX, 2, z + jZ);
                    deskMesh.scale.set(4, 4, 1);
                    scene.add(deskMesh);
                    propsRef.current.push({ id: `desk_${r}_${c}`, type: 'desk', mesh: deskMesh, position: new THREE.Vector3(x + jX, 0, z + jZ), radius: 2.0, hitCount: 0, maxHits: 3, lastHitTime: 0 });
                }
            }
        } else if (stageRef.current === 2) {
             for(let i=0; i<15; i++) {
                const r = CONSTANTS.ARENA_SIZE / 2.2;
                const x = (Math.random() - 0.5) * 2 * r, z = (Math.random() - 0.5) * 2 * r;
                if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
                const snowMesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturesRef.current.snowball }));
                const size = 2.5 + Math.random() * 1.5;
                snowMesh.scale.set(size, size, 1);
                snowMesh.position.set(x, size/2, z);
                scene.add(snowMesh);
                propsRef.current.push({ id: `snowball_${i}`, type: 'snowball', mesh: snowMesh, position: new THREE.Vector3(x, 0, z), radius: size/2, hitCount: 0, maxHits: 3, lastHitTime: 0 });
             }
        } else if (stageRef.current === 3) {
            for(let i=0; i<12; i++) {
                const r = CONSTANTS.ARENA_SIZE / 2.5;
                const x = (Math.random() - 0.5) * 2 * r, z = (Math.random() - 0.5) * 2 * r;
                if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
                const dirtMesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturesRef.current.dirtMound }));
                const size = 3 + Math.random();
                dirtMesh.scale.set(size, size, 1);
                dirtMesh.position.set(x, size/2, z);
                scene.add(dirtMesh);
                propsRef.current.push({ id: `dirt_${i}`, type: 'dirt_mound', mesh: dirtMesh, position: new THREE.Vector3(x, 0, z), radius: size/2, hitCount: 0, maxHits: 3, lastHitTime: 0 });
            }
        } else if (stageRef.current === 4) {
            // Desert: scatter cactus props
            for(let i=0; i<15; i++) {
                const r = CONSTANTS.ARENA_SIZE / 2.2;
                const x = (Math.random() - 0.5) * 2 * r, z = (Math.random() - 0.5) * 2 * r;
                if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
                const cactusMesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturesRef.current.cactus }));
                const size = 3 + Math.random() * 2;
                cactusMesh.scale.set(size, size, 1);
                cactusMesh.position.set(x, size/2, z);
                scene.add(cactusMesh);
                propsRef.current.push({ id: `cactus_${i}`, type: 'rock', mesh: cactusMesh, position: new THREE.Vector3(x, 0, z), radius: size/2, hitCount: 0, maxHits: 3, lastHitTime: 0 });
            }
        } else if (stageRef.current === 5) {
            // Volcano: lava craters that spit lava
            for(let i=0; i<12; i++) {
                const r = CONSTANTS.ARENA_SIZE / 2.2;
                const x = (Math.random() - 0.5) * 2 * r, z = (Math.random() - 0.5) * 2 * r;
                if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
                const craterMesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturesRef.current.lavaCrater }));
                const size = 3 + Math.random() * 2;
                craterMesh.scale.set(size, size, 1);
                craterMesh.position.set(x, size/2, z);
                scene.add(craterMesh);
                propsRef.current.push({ id: `crater_${i}`, type: 'lava_crater', mesh: craterMesh, position: new THREE.Vector3(x, 0, z), radius: size/2, hitCount: 0, maxHits: 3, lastHitTime: 0 });
            }
        } else if (stageRef.current === 6) {
            // Enchanted garden: windmills + gnomes
            for(let i=0; i<8; i++) {
                const r = CONSTANTS.ARENA_SIZE / 2.2;
                const x = (Math.random() - 0.5) * 2 * r, z = (Math.random() - 0.5) * 2 * r;
                if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
                const mMesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturesRef.current.windmill }));
                const size = 4.5 + Math.random() * 1.5;
                mMesh.scale.set(size, size, 1);
                mMesh.center.set(0.5, 0);
                mMesh.position.set(x, 0, z);
                scene.add(mMesh);
                propsRef.current.push({ id: `windmill_${i}`, type: 'windmill', mesh: mMesh, position: new THREE.Vector3(x, 0, z), radius: size/3, hitCount: 0, maxHits: 3, lastHitTime: 0 });
            }
            for(let i=0; i<10; i++) {
                const r = CONSTANTS.ARENA_SIZE / 2.5;
                const x = (Math.random() - 0.5) * 2 * r, z = (Math.random() - 0.5) * 2 * r;
                if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
                const gMesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturesRef.current.gnome }));
                const size = 3 + Math.random() * 0.8;
                gMesh.scale.set(size, size, 1);
                gMesh.center.set(0.5, 0);
                gMesh.position.set(x, 0, z);
                scene.add(gMesh);
                propsRef.current.push({ id: `gnome_${i}`, type: 'gnome', mesh: gMesh, position: new THREE.Vector3(x, 0, z), radius: size/3, hitCount: 0, maxHits: 3, lastHitTime: 0 });
            }
        } else if (stageRef.current === 7) {
            // Jungle: vines + totems
            for(let i=0; i<10; i++) {
                const r = CONSTANTS.ARENA_SIZE / 2.2;
                const x = (Math.random() - 0.5) * 2 * r, z = (Math.random() - 0.5) * 2 * r;
                if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
                const vMesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturesRef.current.vine }));
                const size = 4 + Math.random() * 1.5;
                vMesh.scale.set(size, size, 1);
                vMesh.center.set(0.5, 0);
                vMesh.position.set(x, 0, z);
                scene.add(vMesh);
                propsRef.current.push({ id: `vine_${i}`, type: 'vine', mesh: vMesh, position: new THREE.Vector3(x, 0, z), radius: size/3, hitCount: 0, maxHits: 3, lastHitTime: 0 });
            }
            for(let i=0; i<6; i++) {
                const r = CONSTANTS.ARENA_SIZE / 2.5;
                const x = (Math.random() - 0.5) * 2 * r, z = (Math.random() - 0.5) * 2 * r;
                if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
                const tMesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturesRef.current.totem }));
                const size = 4 + Math.random();
                tMesh.scale.set(size, size, 1);
                tMesh.center.set(0.5, 0);
                tMesh.position.set(x, 0, z);
                scene.add(tMesh);
                propsRef.current.push({ id: `totem_${i}`, type: 'totem', mesh: tMesh, position: new THREE.Vector3(x, 0, z), radius: size/3, hitCount: 0, maxHits: 3, lastHitTime: 0 });
            }
        }
    };

    if (gameStateRef.current === GameStateStatus.PLAYING) {
        spawnEnvironment();
        killCountRef.current = 0;
        setKillCount(0);
        bossActiveRef.current = false;
    }

    const spawnParticle = (pos: THREE.Vector3, typeIndex: number, count: number = 5, speed: number = 0.3) => {
      for (let i = 0; i < count; i++) {
        const tex = texturesRef.current.particles[typeIndex];
        const mesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
        const offset = new THREE.Vector3((Math.random()-0.5) * 1.5, 1 + Math.random() * 2, (Math.random()-0.5) * 1.5);
        mesh.position.copy(pos).add(offset);
        mesh.scale.set(0.6, 0.6, 1); 
        scene.add(mesh);
        const vel = new THREE.Vector3((Math.random()-0.5), Math.random() * 0.5 + 0.2, (Math.random()-0.5)).normalize().multiplyScalar(speed * (Math.random() * 2 + 0.5));
        particlesRef.current.push({ id: `p_${Date.now()}_${i}`, mesh, life: 1.0, maxLife: 1.0, velocity: vel, scaleSpeed: 0.02 });
      }
    };

    const spawnBloodExplosion = (pos: THREE.Vector3, big: boolean = false) => spawnParticle(pos, 1, big ? 100 : 40, big ? 1.5 : 0.8);
    const spawnWoodChips = (pos: THREE.Vector3) => spawnParticle(pos, 3, 15, 0.5);

    // Returns true if the prop is fully destroyed and should be removed from propsRef
    const hitProp = (prop: Prop): boolean => {
        const now = Date.now();
        if (now - prop.lastHitTime < 500) return false; // cooldown — ignore hit
        prop.lastHitTime = now;
        prop.hitCount++;
        const isWood = prop.type === 'desk' || prop.type === 'chair';
        const isSnow = prop.type === 'snowball';
        const isDirt = prop.type === 'dirt_mound';
        const isLava = prop.type === 'lava_crater';
        const isWindmill = prop.type === 'windmill';
        const isGnome = prop.type === 'gnome';
        const isVine = prop.type === 'vine';
        const isTotem = prop.type === 'totem';
        if (prop.hitCount >= prop.maxHits) {
            // Final hit — full destruction
            sceneRef.current!.remove(prop.mesh);
            playSound('break');
            if (isWood) {
                spawnWoodChips(prop.position);
                spawnParticle(prop.position, 2, 10, 0.6);
            } else if (isSnow) {
                spawnParticle(prop.position, 0, 20, 0.7); // White snow burst
                spawnParticle(prop.position, 2, 8, 0.5);
            } else if (isDirt) {
                spawnParticle(prop.position, 3, 20, 0.7); // Brown dirt burst
                spawnParticle(prop.position, 0, 8, 0.4);
            } else if (isLava) {
                spawnParticle(prop.position, 1, 25, 1.0); // Red lava burst
                spawnParticle(prop.position, 2, 15, 0.8);
                traumaRef.current = Math.max(traumaRef.current, 0.5);
            } else if (isWindmill) {
                spawnParticle(prop.position, 3, 18, 0.7); // Wood/stone chips
                spawnParticle(prop.position, 0, 10, 0.5);
            } else if (isGnome) {
                spawnParticle(prop.position, 0, 15, 0.6); // White ceramic shards
                spawnParticle(prop.position, 1, 8, 0.5);
            } else if (isVine) {
                spawnParticle(prop.position, 2, 18, 0.7); // Green leaf burst
                spawnParticle(prop.position, 0, 8, 0.4);
            } else if (isTotem) {
                spawnParticle(prop.position, 3, 20, 0.8); // Brown wood/stone
                spawnParticle(prop.position, 1, 10, 0.5);
            } else {
                spawnParticle(prop.position, 3, 18, 0.8);
                spawnParticle(prop.position, 0, 10, 0.5);
            }
            traumaRef.current = Math.max(traumaRef.current, 0.3);
            return true;
        }
        // Partial hit — update texture and spawn small particles
        if (isWood) {
            const dmgTextures = prop.type === 'desk'
                ? texturesRef.current.deskDamaged
                : texturesRef.current.chairDamaged;
            if (dmgTextures[prop.hitCount - 1]) {
                prop.mesh.material.map = dmgTextures[prop.hitCount - 1];
                prop.mesh.material.needsUpdate = true;
            }
            spawnWoodChips(prop.position);
            spawnParticle(prop.position, 2, 4, 0.3);
        } else if (isSnow) {
            const dmg = texturesRef.current.snowballDamaged[prop.hitCount - 1];
            if (dmg) { prop.mesh.material.map = dmg; prop.mesh.material.needsUpdate = true; }
            spawnParticle(prop.position, 0, 8, 0.4);
        } else if (isDirt) {
            const dmg = texturesRef.current.dirtMoundDamaged[prop.hitCount - 1];
            if (dmg) { prop.mesh.material.map = dmg; prop.mesh.material.needsUpdate = true; }
            spawnParticle(prop.position, 3, 8, 0.4);
        } else if (isLava) {
            const dmg = texturesRef.current.lavaCraterDamaged[prop.hitCount - 1];
            if (dmg) { prop.mesh.material.map = dmg; prop.mesh.material.needsUpdate = true; }
            spawnParticle(prop.position, 1, 8, 0.5); // Small lava splash
            spawnParticle(prop.position, 2, 4, 0.4);
        } else if (isWindmill) {
            const dmg = texturesRef.current.windmillDamaged[prop.hitCount - 1];
            if (dmg) { prop.mesh.material.map = dmg; prop.mesh.material.needsUpdate = true; }
            spawnParticle(prop.position, 3, 6, 0.4);
        } else if (isGnome) {
            const dmg = texturesRef.current.gnomeDamaged[prop.hitCount - 1];
            if (dmg) { prop.mesh.material.map = dmg; prop.mesh.material.needsUpdate = true; }
            spawnParticle(prop.position, 0, 6, 0.4);
        } else if (isVine) {
            const dmg = texturesRef.current.vineDamaged[prop.hitCount - 1];
            if (dmg) { prop.mesh.material.map = dmg; prop.mesh.material.needsUpdate = true; }
            spawnParticle(prop.position, 2, 6, 0.4);
        } else if (isTotem) {
            const dmg = texturesRef.current.totemDamaged[prop.hitCount - 1];
            if (dmg) { prop.mesh.material.map = dmg; prop.mesh.material.needsUpdate = true; }
            spawnParticle(prop.position, 3, 6, 0.4);
        } else {
            spawnParticle(prop.position, 3, 8, 0.4);
            spawnParticle(prop.position, 0, 4, 0.3);
        }
        traumaRef.current = Math.max(traumaRef.current, 0.15);
        playSound('break');
        return false;
    };

    const spawnYarn = (pos: THREE.Vector3) => {
        const tex = texturesRef.current.yarn;
        if (!tex) return;
        const mesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
        mesh.position.copy(pos); mesh.position.y = 1; mesh.scale.set(2, 2, 1);
        scene.add(mesh);
        particlesRef.current.push({ id: `yarn_${Date.now()}`, mesh, life: 3.0, maxLife: 3.0, velocity: new THREE.Vector3(0,0,0), scaleSpeed: -0.002 });
    };

    const spawnFloatingText = (pos: THREE.Vector3, isCrit: boolean, text?: string) => {
      const tex = text ? createTextTexture(text, '#ffff00') : (isCrit ? texturesRef.current.bam : texturesRef.current.pow);
      if (!tex) return;
      const mesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 1 }));
      mesh.position.copy(pos).add(new THREE.Vector3(0, 4, 0));
      mesh.scale.set(6, 3, 1);
      scene.add(mesh);
      floatTextRef.current.push({ id: `txt_${Date.now()}`, mesh, life: 1.5, velocity: new THREE.Vector3(0, 0.15, 0) });
    };

    const removeSpeechBubble = (enemy: Enemy) => {
        if (enemy.speechBubble) {
            scene.remove(enemy.speechBubble.mesh);
            enemy.speechBubble = null;
        }
    };

    const spawnBoss = () => {
        enemiesRef.current.forEach(e => {
            spawnBloodExplosion(e.position);
            removeSpeechBubble(e);
            scene.remove(e.mesh);
        });
        enemiesRef.current = [];
        projectilesRef.current.forEach(p => sceneRef.current!.remove(p.mesh));
        projectilesRef.current = [];
        let bossType: Enemy['type'] = 'boss_director';
        let stats: any = {...CONSTANTS.BOSS.DIRECTOR};
        let tex = texturesRef.current.enemies[0];
        if (stageRef.current === 2) { bossType = 'boss_eagle'; stats = {...CONSTANTS.BOSS.EAGLE}; tex = texturesRef.current.eagle!; }
        else if (stageRef.current === 3) { bossType = 'boss_kawik'; stats = {...CONSTANTS.BOSS.KAWIK}; tex = texturesRef.current.kawik!; }
        else if (stageRef.current === 4) { bossType = 'boss_tatoo'; stats = {...CONSTANTS.BOSS.TATOO}; tex = texturesRef.current.tatoo!; }
        else if (stageRef.current === 5) { bossType = 'boss_taupe'; stats = {...CONSTANTS.BOSS.TAUPE}; tex = texturesRef.current.taupe!; }
        else if (stageRef.current === 6) { bossType = 'boss_ninja_pain'; stats = {...CONSTANTS.BOSS.NINJA_PAIN}; tex = texturesRef.current.rabbit!; }
        else if (stageRef.current === 7) { bossType = 'boss_snake'; stats = {...CONSTANTS.BOSS.SNAKE}; tex = texturesRef.current.snake!; }
        const realHP = stats.HP;
        const mesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xffcccc }));
        mesh.scale.set(stats.SCALE, stats.SCALE, 1); mesh.center.set(0.5, 0);
        scene.add(mesh);
        const hpSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: createHealthBarTexture(1) }));
        hpSprite.position.set(0, 1.1, 0); hpSprite.scale.set(1, 0.05, 1);
        mesh.add(hpSprite);
        const bossEnemy: Enemy = { id: `boss_${Date.now()}`, type: bossType, variation: 0, mesh, position: new THREE.Vector3(0, 0, -CONSTANTS.ARENA_SIZE/2+5), velocity: new THREE.Vector3(0, 0, 0), health: isDebugModeRef.current ? 1 : realHP, maxHealth: realHP, isDead: false, radius: 3.5, stunTimer: 0, speechBubble: null, isBoss: true };
        if (bossType === 'boss_tatoo') { bossEnemy.bossPhase = 'walk'; bossEnemy.bossPhaseTimer = CONSTANTS.BOSS.TATOO.WALK_DURATION; }
        if (bossType === 'boss_taupe') { bossEnemy.bossPhase = 'surface'; bossEnemy.bossPhaseTimer = CONSTANTS.BOSS.TAUPE.SURFACE_DURATION; }
        if (bossType === 'boss_ninja_pain') { bossEnemy.bossPhase = 'jump_prep'; bossEnemy.bossPhaseTimer = CONSTANTS.BOSS.NINJA_PAIN.JUMP_PREP_DURATION; }
        if (bossType === 'boss_snake') { bossEnemy.bossPhase = 'slither'; bossEnemy.bossPhaseTimer = CONSTANTS.BOSS.SNAKE.SLITHER_DURATION; }
        enemiesRef.current.push(bossEnemy);
        bossActiveRef.current = true; playSound('bossSpawn'); traumaRef.current = 1.0; onBossEnter();
    };

    const spawnEnemy = () => {
      const safeZone = (CONSTANTS.ARENA_SIZE / 2) - 5;
      const x = (Math.random() * 2 - 1) * safeZone, z = (Math.random() * 2 - 1) * safeZone, y = 0;
      const tex = texturesRef.current.enemies[Math.floor(Math.random() * texturesRef.current.enemies.length)];
      const mesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
      mesh.scale.set(3.8, 3.8, 1); mesh.center.set(0.5, 0);
      scene.add(mesh);
      const hpSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: createHealthBarTexture(1) }));
      hpSprite.position.set(0, 1.1, 0); hpSprite.scale.set(0.8, 0.1, 1);
      mesh.add(hpSprite);
      enemiesRef.current.push({ id: `enemy_${Date.now()}`, type: 'teacher', variation: 0, mesh, position: new THREE.Vector3(x, y, z), velocity: new THREE.Vector3(0, 0, 0), health: 50 + (waveRef.current * 5), maxHealth: 50 + (waveRef.current * 5), isDead: false, radius: 1.5, stunTimer: 0, speechBubble: null, isBoss: false });
      playSound('spawn');
    };

    const activateSpecial = () => {
      const hero = heroRef.current;
      if (!hero || hero.specialCooldown > 0 || hero.isDead) return;

      const powerName = (CONSTANTS.NAMES as any)[character.toUpperCase()];
      onSpecialUsed(powerName);

      if (character === 'armand') {
        hero.specialActiveTimer = CONSTANTS.POWERS.ARMAND_SPIN_DURATION;
        hero.specialCooldown = CONSTANTS.POWERS.ARMAND_COOLDOWN;
        hero.maxSpecialCooldown = CONSTANTS.POWERS.ARMAND_COOLDOWN;
        hero.velocity.set((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2).normalize().multiplyScalar(1.2);
        playSound('swing');
      } else if (character === 'adrien') {
        hero.specialActiveTimer = CONSTANTS.POWERS.ADRIEN_ROAR_DURATION;
        hero.specialCooldown = CONSTANTS.POWERS.ADRIEN_ROAR_COOLDOWN;
        hero.maxSpecialCooldown = CONSTANTS.POWERS.ADRIEN_ROAR_COOLDOWN;
        if (texturesRef.current.lion) hero.mesh.material.map = texturesRef.current.lion;
        hero.mesh.scale.set(8, 8, 1);
        if (hero.mesh.children[0]) (hero.mesh.children[0] as THREE.Sprite).visible = false;
        playSound('roar');
        traumaRef.current = 1.0;
        if (texturesRef.current.shockwave) {
          ([{ opacity: 1.0, life: 0.9, scaleSpeed: -0.55 }, { opacity: 0.7, life: 0.7, scaleSpeed: -0.4 }] as const).forEach(({ opacity, life, scaleSpeed }) => {
            const swMesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturesRef.current.shockwave!, transparent: true, opacity, depthTest: false }));
            swMesh.scale.set(2, 2, 1);
            swMesh.position.set(hero.position.x, 1.5, hero.position.z);
            sceneRef.current!.add(swMesh);
            particlesRef.current.push({ id: `shockwave_${Date.now()}_${opacity}`, mesh: swMesh, life, maxLife: life, velocity: new THREE.Vector3(0,0,0), scaleSpeed });
          });
        }
        spawnParticle(hero.position, 1, 60, 1.8);
        spawnParticle(hero.position, 0, 30, 1.2);
        spawnFloatingText(hero.position, true, 'ROAAR!');
      } else if (character === 'eliot') {
        hero.specialCooldown = CONSTANTS.POWERS.ELIOT_FART_COOLDOWN;
        hero.maxSpecialCooldown = CONSTANTS.POWERS.ELIOT_FART_COOLDOWN;
        playSound('fart');
        for (let i = 0; i < CONSTANTS.POWERS.ELIOT_FART_COUNT; i++) {
          const angle = (i / CONSTANTS.POWERS.ELIOT_FART_COUNT) * Math.PI * 2 + Math.random() * 0.5;
          const dist = 0.5 + Math.random() * 3.5;
          const spawnPos = new THREE.Vector3(
            hero.position.x + Math.cos(angle) * dist,
            0,
            hero.position.z + Math.sin(angle) * dist
          );
          const fartMesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturesRef.current.fart!, transparent: true, opacity: 0.85, depthTest: false }));
          const scale = 1.2 + Math.random() * 1.2;
          fartMesh.scale.set(scale, scale, 1);
          fartMesh.position.set(spawnPos.x, 0.5 + Math.random() * 0.5, spawnPos.z);
          sceneRef.current!.add(fartMesh);
          const driftAngle = angle + (Math.random() - 0.5) * 1.2;
          const driftSpeed = 0.015 + Math.random() * 0.02;
          projectilesRef.current.push({
            id: `fart_${Date.now()}_${i}`,
            type: 'fart',
            mesh: fartMesh,
            position: spawnPos.clone(),
            velocity: new THREE.Vector3(Math.cos(driftAngle) * driftSpeed, 0, Math.sin(driftAngle) * driftSpeed),
            life: CONSTANTS.POWERS.ELIOT_FART_LIFETIME,
            radius: CONSTANTS.POWERS.ELIOT_FART_RADIUS,
          });
        }
      } else if (character === 'swan') {
        hero.specialCooldown = CONSTANTS.POWERS.SWAN_CAT_COOLDOWN;
        hero.maxSpecialCooldown = CONSTANTS.POWERS.SWAN_CAT_COOLDOWN;
        playSound('meow');
        const aliveEnemies = enemiesRef.current.filter(e => !e.isDead && e.health > 0);
        for (let i = 0; i < 10; i++) {
          const angle = (i / 3) * Math.PI * 2;
          const spawnPos = new THREE.Vector3(
            hero.position.x + Math.cos(angle) * 2.0,
            0,
            hero.position.z + Math.sin(angle) * 2.0
          );
          const catMesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturesRef.current.cat!, transparent: true, opacity: 1.0, depthTest: false }));
          catMesh.scale.set(2.0, 2.0, 1);
          catMesh.position.set(spawnPos.x, 1.0, spawnPos.z);
          sceneRef.current!.add(catMesh);
          projectilesRef.current.push({
            id: `cat_${Date.now()}_${i}`,
            type: 'cat',
            mesh: catMesh,
            position: spawnPos.clone(),
            velocity: new THREE.Vector3(Math.cos(angle) * 0.3, 0, Math.sin(angle) * 0.3),
            life: CONSTANTS.POWERS.SWAN_CAT_DURATION,
            radius: 1.0,
            targetId: aliveEnemies[i % Math.max(1, aliveEnemies.length)]?.id,
          });
        }
      } else if (character === 'pierre') {
        hero.specialCooldown = CONSTANTS.POWERS.PIERRE_NUKE_COOLDOWN;
        hero.maxSpecialCooldown = CONSTANTS.POWERS.PIERRE_NUKE_COOLDOWN;
        playSound('explosion');
        enemiesRef.current.forEach(e => {
          e.health -= CONSTANTS.SPECIAL_DAMAGE;
          spawnBloodExplosion(e.position, true);
        });
        propsRef.current = propsRef.current.filter(prop => { sceneRef.current!.remove(prop.mesh); spawnParticle(prop.position, 1, 10, 0.8); return false; });
      } else if (character === 'audrey') {
        hero.specialActiveTimer = CONSTANTS.POWERS.AUDREY_CHICKEN_DURATION;
        hero.specialCooldown = CONSTANTS.POWERS.AUDREY_COOLDOWN;
        hero.maxSpecialCooldown = CONSTANTS.POWERS.AUDREY_COOLDOWN;
        if (texturesRef.current.chicken) hero.mesh.material.map = texturesRef.current.chicken;
        hero.mesh.scale.set(2.5, 2.5, 1);
        if (hero.mesh.children[0]) (hero.mesh.children[0] as THREE.Sprite).visible = false;
        playSound('cluck');
      }
    };

    const updateCooldownUI = (hero: Hero) => {
      const cdSprite = cooldownSpriteRef.current;
      const cdCanvas = cooldownCanvasRef.current;
      const cdTex = cooldownTextureRef.current;
      if (!cdSprite || !cdCanvas || !cdTex) return;

      if (hero.specialCooldown > 0) {
        cdSprite.visible = true;
        const ctx = cdCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0,0,64,64);
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.beginPath();
          ctx.moveTo(32, 32);
          const progress = hero.specialCooldown / hero.maxSpecialCooldown;
          ctx.arc(32, 32, 30, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * progress), false);
          ctx.lineTo(32, 32);
          ctx.fill();
          cdTex.needsUpdate = true;
        }
      } else {
        cdSprite.visible = false;
      }
    };

    const animate = () => {
      if(!isMountedRef.current || !rendererRef.current) return;
      frameIdRef.current = requestAnimationFrame(animate);
      if (gameStateRef.current !== GameStateStatus.PLAYING || isPausedRef.current) return;

      if (hitStopRef.current > 0) {
        hitStopRef.current--;
        rendererRef.current.render(sceneRef.current!, camera);
        return; 
      }

      const hero = heroRef.current;
      if (!hero) return;

      const arenaHalf = CONSTANTS.ARENA_SIZE / 2;

      if (hero.specialActiveTimer > 0) {
          hero.specialActiveTimer--;
          if (character === 'armand') {
              hero.mesh.material.rotation += 0.8;
              if (Math.abs(hero.position.x + hero.velocity.x) > arenaHalf-2) hero.velocity.x *= -1;
              if (Math.abs(hero.position.z + hero.velocity.z) > arenaHalf-2) hero.velocity.z *= -1;
              hero.position.add(hero.velocity);
              hero.mesh.position.set(hero.position.x, 2 + hero.position.y, hero.position.z);
              enemiesRef.current.forEach(e => { if(e.position.distanceTo(hero.position) < 5) { e.health -= CONSTANTS.SPECIAL_DAMAGE; playSound('break'); } });
              propsRef.current = propsRef.current.filter(prop => { if (prop.position.distanceTo(hero.position) < 6) { return !hitProp(prop); } return true; });
          }
          if (character === 'adrien') {
              const elapsed = CONSTANTS.POWERS.ADRIEN_ROAR_DURATION - hero.specialActiveTimer;
              const waveRadius = elapsed * 1.3;
              enemiesRef.current.forEach(e => {
                  if (!e.isDead && e.health > 0) {
                      const dist = e.position.distanceTo(hero.position);
                      if (dist <= waveRadius && dist > (waveRadius - 1.3)) {
                          e.health -= CONSTANTS.SPECIAL_DAMAGE;
                          e.velocity.add(e.position.clone().sub(hero.position).normalize().multiplyScalar(4));
                          spawnBloodExplosion(e.position, e.isBoss);
                      }
                  }
              });
              propsRef.current = propsRef.current.filter(prop => {
                  const dist = prop.position.distanceTo(hero.position);
                  if (dist <= waveRadius && dist > (waveRadius - 1.3)) { return !hitProp(prop); }
                  return true;
              });
          }
          if (hero.specialActiveTimer === 0) {
              if (character === 'audrey' || character === 'adrien') {
                  hero.mesh.material.map = texturesRef.current.heroBody;
                  hero.mesh.scale.set(4, 4, 1);
                  if (hero.mesh.children[0]) (hero.mesh.children[0] as THREE.Sprite).visible = true;
              }
              if (character === 'armand') { hero.mesh.material.rotation = 0; hero.velocity.set(0,0,0); }
          }
      }

      if (hero.specialCooldown > 0) hero.specialCooldown--;
      updateCooldownUI(hero);

      const isKeyPressed = (action: keyof KeyBindings) => settings.keys[action].some(k => keysPressed.current.has(k));
      if (!hero.isDead) {
          const inputMove = new THREE.Vector3(0,0,0);
          if (hero.specialActiveTimer === 0 || character !== 'armand') {
              if (isKeyPressed('up')) { inputMove.x -= 1; inputMove.z -= 1; }
              if (isKeyPressed('down')) { inputMove.x += 1; inputMove.z += 1; }
              if (isKeyPressed('left')) { inputMove.x -= 1; inputMove.z += 1; }
              if (isKeyPressed('right')) { inputMove.x += 1; inputMove.z -= 1; }
              let speed = CONSTANTS.HERO_SPEED;
              if (inputMove.length() > 0) {
                  inputMove.normalize().multiplyScalar(speed);
                  hero.velocity.x += inputMove.x * 0.2; hero.velocity.z += inputMove.z * 0.2;
                  const hVel = new THREE.Vector2(hero.velocity.x, hero.velocity.z);
                  if (hVel.length() > speed && !hero.isAttacking) { hVel.normalize().multiplyScalar(speed); hero.velocity.x = hVel.x; hero.velocity.z = hVel.y; }
                  hero.facing.copy(inputMove).normalize();
              }
              hero.velocity.x *= CONSTANTS.FRICTION; hero.velocity.z *= CONSTANTS.FRICTION; hero.velocity.y -= CONSTANTS.GRAVITY;
              if (isKeyPressed('jump') && !hero.isJumping && hero.position.y === 0) {
                  hero.velocity.y = CONSTANTS.HERO_JUMP_FORCE; hero.isJumping = true;
                  // Count jumps for snake constriction escape
                  if (hero.isConstricted && hero.constrictJumps !== undefined) {
                      hero.constrictJumps++;
                      spawnFloatingText(hero.position, false, `JUMP ${hero.constrictJumps}/${CONSTANTS.BOSS.SNAKE.CONSTRICT_ESCAPE_JUMPS}`);
                  }
              }
              hero.position.add(hero.velocity);
              if (Math.abs(hero.position.x) <= arenaHalf && Math.abs(hero.position.z) <= arenaHalf && hero.position.y < 0) { hero.position.y = 0; hero.velocity.y = 0; hero.isJumping = false; }
              if (hero.position.y < -50) {
                playSound('die');
                hero.position.set(0, 0, 0);
                hero.velocity.set(0, 0, 0);
                hero.isJumping = false;
                hero.lastHitTime = Date.now() + 2000; // 2s invincibility on respawn
                onLoseLife();
              }
              hero.mesh.position.set(hero.position.x, 2 + hero.position.y, hero.position.z);
              // Hero-prop solid collision: push hero out, hit the prop
              propsRef.current = propsRef.current.filter(prop => {
                  const dist = hero.position.distanceTo(prop.position);
                  const minDist = prop.radius + 0.8;
                  if (dist < minDist && dist > 0.01) {
                      const pushDir = hero.position.clone().sub(prop.position).normalize();
                      const overlap = minDist - dist;
                      hero.position.add(pushDir.multiplyScalar(overlap));
                      hero.velocity.multiplyScalar(0.3);
                      hero.mesh.position.set(hero.position.x, 2 + hero.position.y, hero.position.z);
                      return !hitProp(prop);
                  }
                  return true;
              });
          }
          if (isKeyPressed('special')) activateSpecial();
          if (isKeyPressed('attack') && hero.attackTimer === 0) {
              hero.isAttacking = true; 
              hero.attackTimer = CONSTANTS.ATTACK_COOLDOWN; 
              playSound('swing');
              hero.velocity.add(hero.facing.clone().multiplyScalar(2.5));
              enemiesRef.current.forEach(e => {
                  if(e.position.distanceTo(hero.position) < CONSTANTS.ATTACK_RANGE) {
                      // Invincibility checks: Tatoo in shell, Taupe burrowed
                      if (e.type === 'boss_tatoo' && e.bossPhase === 'shell') return;
                      if (e.type === 'boss_taupe' && e.bossPhase === 'burrow') return;
                      if (e.type === 'boss_ninja_pain' && (e.bossPhase === 'jump_air' || e.bossPhase === 'jump_air_p2')) return;
                      if (e.type === 'boss_snake' && e.bossPhase === 'constrict') return;
                      e.health -= 40;
                      // Knockback
                      const kbDir = e.position.clone().sub(hero.position).normalize();
                      e.velocity.add(kbDir.multiplyScalar(CONSTANTS.KNOCKBACK));
                      traumaRef.current = 0.3;
                      hitStopRef.current = CONSTANTS.HIT_STOP_FRAMES;
                  }
              });
              propsRef.current = propsRef.current.filter(prop => {
                  if (prop.position.distanceTo(hero.position) < CONSTANTS.ATTACK_RANGE) {
                      return !hitProp(prop);
                  }
                  return true;
              });
          }
      }

      // Weapon Swing Animation
      if (hero.attackTimer > 0) {
          const progress = 1 - (hero.attackTimer / CONSTANTS.ATTACK_COOLDOWN);
          if (progress < 0.5) {
              // Swing down
              hero.weaponMesh.material.rotation = -Math.PI * 2 * progress;
          } else {
              // Return to idle
              hero.weaponMesh.material.rotation = -Math.PI * (1 - progress);
          }
          if (hero.attackTimer === 1) {
              hero.isAttacking = false;
              hero.weaponMesh.material.rotation = 0;
          }
          hero.attackTimer--;
      }

      // Particle update
      const aliveParticles: Particle[] = [];
      particlesRef.current.forEach(p => {
        p.life -= 0.016;
        if (p.life <= 0) { sceneRef.current!.remove(p.mesh); return; }
        const t = p.life / p.maxLife;
        p.mesh.position.add(p.velocity);
        p.velocity.y -= 0.012;
        const s = Math.max(0, p.mesh.scale.x - p.scaleSpeed);
        p.mesh.scale.set(s, s, 1);
        (p.mesh.material as THREE.SpriteMaterial).opacity = t;
        aliveParticles.push(p);
      });
      particlesRef.current = aliveParticles;

      // Floating text update
      const aliveText: FloatingText[] = [];
      floatTextRef.current.forEach(ft => {
        ft.life -= 0.016;
        if (ft.life <= 0) { sceneRef.current!.remove(ft.mesh); return; }
        ft.mesh.position.add(ft.velocity);
        (ft.mesh.material as THREE.SpriteMaterial).opacity = Math.min(1, ft.life * 1.5);
        aliveText.push(ft);
      });
      floatTextRef.current = aliveText;

      // Lava crater periodic shooting
      if (stageRef.current === 5) {
        propsRef.current.forEach((prop, idx) => {
          if (prop.type !== 'lava_crater') return;
          if ((timeRef.current + idx * 37) % 150 === 0) {
            const tex = texturesRef.current.lavaProjectile;
            if (!tex) return;
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.08 + Math.random() * 0.06;
            const lavaMesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 1.0, depthTest: false }));
            lavaMesh.scale.set(1.2, 1.2, 1);
            lavaMesh.position.set(prop.position.x, 1.5, prop.position.z);
            sceneRef.current!.add(lavaMesh);
            projectilesRef.current.push({
              id: `lava_${Date.now()}_${prop.id}`,
              type: 'lava',
              mesh: lavaMesh,
              position: prop.position.clone(),
              velocity: new THREE.Vector3(Math.cos(angle) * speed, 0.05, Math.sin(angle) * speed),
              life: 90,
              radius: 0.8,
            });
          }
        });
      }

      // Carrot bombs (Ninja Pain)
      const NP = CONSTANTS.BOSS.NINJA_PAIN;
      const livingCarrots: CarrotBomb[] = [];
      carrotBombsRef.current.forEach(c => {
          c.groundTime++;
          // Idle phase
          if (c.phase === 'idle') {
              c.mesh.position.set(c.position.x, 1.5, c.position.z);
              if (c.groundTime >= NP.CARROT_GROUND_FRAMES - NP.CARROT_VIBRATE_FRAMES) {
                  c.phase = 'vibrating';
              }
              livingCarrots.push(c);
              return;
          }
          // Vibrating phase
          if (c.phase === 'vibrating') {
              c.mesh.position.set(
                  c.position.x + (Math.random() - 0.5) * 0.2,
                  1.5 + (Math.random() - 0.5) * 0.2,
                  c.position.z + (Math.random() - 0.5) * 0.2
              );
              if (c.groundTime >= NP.CARROT_GROUND_FRAMES) {
                  c.phase = 'struck';
                  c.groundTime = 0;
                  // Spawn lightning
                  if (texturesRef.current.lightning) {
                      const lMesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturesRef.current.lightning, transparent: true, opacity: 1.0, depthTest: false }));
                      lMesh.scale.set(3, 8, 1);
                      lMesh.center.set(0.5, 0);
                      lMesh.position.set(c.position.x, 0.1, c.position.z);
                      scene.add(lMesh);
                      c.lightningMesh = lMesh;
                  }
                  playSound('explosion');
                  traumaRef.current = 0.6;
                  // Damage hero if within radius
                  if (!hero.isDead && hero.position.distanceTo(c.position) < NP.LIGHTNING_RADIUS) {
                      const now = Date.now();
                      if (!hero.lastHitTime || now - hero.lastHitTime > 1000) {
                          hero.lastHitTime = now;
                          onLoseLife();
                      }
                  }
                  spawnParticle(c.position, 0, 20, 0.8);
                  spawnParticle(c.position, 2, 10, 0.6);
              }
              livingCarrots.push(c);
              return;
          }
          // Struck phase: lightning visible briefly
          if (c.phase === 'struck') {
              if (c.lightningMesh) {
                  const fade = 1 - (c.groundTime / NP.LIGHTNING_DURATION);
                  (c.lightningMesh.material as THREE.SpriteMaterial).opacity = Math.max(0, fade);
              }
              if (c.groundTime >= NP.LIGHTNING_DURATION) {
                  scene.remove(c.mesh);
                  if (c.lightningMesh) scene.remove(c.lightningMesh);
                  return;
              }
              livingCarrots.push(c);
              return;
          }
      });
      carrotBombsRef.current = livingCarrots;

      // Fart clouds + lava + cat projectile update
      const livingFarts: Projectile[] = [];
      projectilesRef.current.forEach(p => {
        if (p.type === 'cat') {
          p.life--;
          if (p.life <= 0) { sceneRef.current!.remove(p.mesh); return; }
          // Re-target if current target is dead or gone
          let target = enemiesRef.current.find(e => e.id === p.targetId && !e.isDead && e.health > 0);
          if (!target && enemiesRef.current.length > 0) {
            target = enemiesRef.current.reduce((best: Enemy | null, e) => {
              if (e.isDead || e.health <= 0) return best;
              return (!best || e.position.distanceTo(p.position) < best.position.distanceTo(p.position)) ? e : best;
            }, null) ?? undefined;
            if (target) p.targetId = target.id;
          }
          if (target) {
            const toTarget = target.position.clone().sub(p.position).normalize().multiplyScalar(0.55);
            p.velocity.lerp(toTarget, 0.3);
          }
          p.position.add(p.velocity);
          p.mesh.position.set(p.position.x, 1.0 + Math.sin(p.life * 0.15) * 0.3, p.position.z);
          (p.mesh.material as THREE.SpriteMaterial).rotation += 0.12;
          (p.mesh.material as THREE.SpriteMaterial).opacity = Math.min(1, p.life / 20);
          if (target && target.position.distanceTo(p.position) < p.radius + target.radius) {
            target.health -= CONSTANTS.SPECIAL_DAMAGE;
            spawnBloodExplosion(target.position);
            playSound('shred');
            sceneRef.current!.remove(p.mesh);
            return;
          }
          livingFarts.push(p);
          return;
        }
        if (p.type === 'lava') {
          p.life--;
          p.velocity.y -= 0.005;
          p.position.add(p.velocity);
          p.mesh.position.set(p.position.x, Math.max(0.3, p.position.y + p.velocity.y), p.position.z);
          (p.mesh.material as THREE.SpriteMaterial).opacity = Math.min(1, p.life / 30);
          if (p.life <= 0 || p.position.y < -1) { sceneRef.current!.remove(p.mesh); return; }
          // Hurt hero on contact
          if (!hero.isDead && p.position.distanceTo(hero.position) < p.radius + 1.0) {
            const now = Date.now();
            if (!hero.lastHitTime || now - hero.lastHitTime > 1000) {
              hero.lastHitTime = now;
              traumaRef.current = 0.4;
              playSound('hit');
              const pushDir = hero.position.clone().sub(p.position).normalize();
              hero.velocity.add(pushDir.multiplyScalar(2.0));
            }
            sceneRef.current!.remove(p.mesh);
            spawnParticle(p.position, 1, 5, 0.4);
            return;
          }
          livingFarts.push(p);
          return;
        }
        if (p.type !== 'fart') { livingFarts.push(p); return; }
        p.life--;
        p.position.add(p.velocity);
        p.mesh.position.set(p.position.x, p.mesh.position.y, p.position.z);
        const lifeRatio = p.life / CONSTANTS.POWERS.ELIOT_FART_LIFETIME;
        (p.mesh.material as THREE.SpriteMaterial).opacity = Math.min(0.85, lifeRatio * 2);
        if (p.life <= 0) { sceneRef.current!.remove(p.mesh); return; }
        // Collision with enemies
        let hit = false;
        enemiesRef.current.forEach(e => {
          if (!e.isDead && e.position.distanceTo(p.position) < p.radius) {
            e.health -= CONSTANTS.SPECIAL_DAMAGE;
            spawnBloodExplosion(e.position);
            hit = true;
          }
        });
        // Collision with props
        propsRef.current = propsRef.current.filter(prop => {
          if (prop.position.distanceTo(p.position) < p.radius + prop.radius) {
            const destroyed = hitProp(prop);
            if (destroyed) hit = true;
            return !destroyed;
          }
          return true;
        });
        if (hit) { sceneRef.current!.remove(p.mesh); } else { livingFarts.push(p); }
      });
      projectilesRef.current = livingFarts;

      const living: Enemy[] = [];
      enemiesRef.current.forEach(e => {
          if (e.health <= 0 || e.position.y < -50) {
              spawnBloodExplosion(e.position, e.isBoss); sceneRef.current!.remove(e.mesh); removeSpeechBubble(e); playSound('die');
              if (e.isBoss) {
                // Clean up boss shadow if present
                if (e.bossShadowMesh) { sceneRef.current!.remove(e.bossShadowMesh); }
                // Clean up carrot bombs (Ninja Pain)
                carrotBombsRef.current.forEach(c => {
                    sceneRef.current!.remove(c.mesh);
                    if (c.lightningMesh) sceneRef.current!.remove(c.lightningMesh);
                });
                carrotBombsRef.current = [];
                // Release hero from snake constriction if active
                if (hero.isConstricted) {
                    hero.isConstricted = false;
                    hero.constrictJumps = 0;
                    hero.constrictDamageTimer = undefined;
                }
                bossActiveRef.current = true; // Keep true to suppress spawns during transition
                if (stageRef.current < 7) {
                  onStageAdvance();
                } else {
                  onVictory();
                }
              }
              else { killCountRef.current++; setKillCount(killCountRef.current); }
              return;
          }

          // Enemy AI: Move towards player
          const dist = e.position.distanceTo(hero.position);
          const dir = new THREE.Vector3().subVectors(hero.position, e.position).normalize();

          // --- TATOO AI ---
          if (e.type === 'boss_tatoo' && e.bossPhase !== undefined) {
              if (e.bossPhaseTimer !== undefined) e.bossPhaseTimer--;

              if (e.bossPhase === 'shell') {
                  // Swap texture to shell
                  if (texturesRef.current.tatooShell) e.mesh.material.map = texturesRef.current.tatooShell;
                  // Move in straight line, bounce off walls
                  e.position.add(e.velocity);
                  const half = CONSTANTS.ARENA_SIZE / 2 - 2;
                  if (Math.abs(e.position.x) > half) { e.velocity.x *= -1; e.position.x = Math.sign(e.position.x) * half; }
                  if (Math.abs(e.position.z) > half) { e.velocity.z *= -1; e.position.z = Math.sign(e.position.z) * half; }
                  // Strong push on hero contact
                  if (dist < 4.0 && !hero.isDead) {
                      const pushDir = hero.position.clone().sub(e.position).normalize();
                      hero.velocity.add(pushDir.multiplyScalar(CONSTANTS.BOSS.TATOO.PUSH_FORCE * 0.3));
                      traumaRef.current = 0.6;
                      playSound('hit');
                  }
                  // Transition to walk
                  if (e.bossPhaseTimer !== undefined && e.bossPhaseTimer <= 0) {
                      e.bossPhase = 'walk';
                      e.bossPhaseTimer = CONSTANTS.BOSS.TATOO.WALK_DURATION;
                      e.velocity.set(0, 0, 0);
                      if (texturesRef.current.tatoo) e.mesh.material.map = texturesRef.current.tatoo;
                  }
                  e.mesh.position.set(e.position.x, 1.75 + e.position.y, e.position.z);
                  if (e.mesh.children[0]) {
                      const hpBar = e.mesh.children[0] as THREE.Sprite;
                      hpBar.material.map = createHealthBarTexture(e.health / e.maxHealth);
                  }
                  living.push(e);
                  return;
              } else if (e.bossPhase === 'walk') {
                  // Normal movement toward player, vulnerable
                  if (e.stunTimer > 0) { e.stunTimer--; }
                  else if (dist > 1.5) {
                      e.velocity.x += dir.x * CONSTANTS.BOSS.TATOO.SPEED;
                      e.velocity.z += dir.z * CONSTANTS.BOSS.TATOO.SPEED;
                  }
                  // Transition to shell
                  if (e.bossPhaseTimer !== undefined && e.bossPhaseTimer <= 0) {
                      e.bossPhase = 'shell';
                      e.bossPhaseTimer = CONSTANTS.BOSS.TATOO.SHELL_DURATION;
                      // Launch in random direction
                      const angle = Math.random() * Math.PI * 2;
                      e.velocity.set(Math.cos(angle) * CONSTANTS.BOSS.TATOO.SHELL_SPEED, 0, Math.sin(angle) * CONSTANTS.BOSS.TATOO.SHELL_SPEED);
                      playSound('swing');
                  }
              }
          }

          // --- TAUPE AI ---
          if (e.type === 'boss_taupe' && e.bossPhase !== undefined) {
              if (e.bossPhaseTimer !== undefined) e.bossPhaseTimer--;

              if (e.bossPhase === 'burrow') {
                  e.mesh.visible = false;
                  // Create shadow if not exists
                  if (!e.bossShadowMesh) {
                      const shadowMat = new THREE.SpriteMaterial({ map: texturesRef.current.taupeShadow, transparent: true, opacity: 1.0 });
                      const shadowSprite = new THREE.Sprite(shadowMat);
                      shadowSprite.scale.set(12, 12, 1);
                      shadowSprite.center.set(0.5, 0.5);
                      scene.add(shadowSprite);
                      e.bossShadowMesh = shadowSprite;
                  }
                  // Shadow follows toward player
                  const shadowDir = hero.position.clone().sub(e.position).normalize();
                  e.position.x += shadowDir.x * CONSTANTS.BOSS.TAUPE.SPEED * 1.5;
                  e.position.z += shadowDir.z * CONSTANTS.BOSS.TAUPE.SPEED * 1.5;
                  e.position.y = 0;
                  e.bossShadowMesh.position.set(e.position.x, 0.15, e.position.z);
                  // Transition: erupt
                  if (e.bossPhaseTimer !== undefined && e.bossPhaseTimer <= 0) {
                      e.bossPhase = 'surface';
                      e.bossPhaseTimer = CONSTANTS.BOSS.TAUPE.SURFACE_DURATION;
                      e.mesh.visible = true;
                      if (e.bossShadowMesh) { scene.remove(e.bossShadowMesh); e.bossShadowMesh = undefined; }
                      // Eruption effect
                      spawnParticle(e.position, 3, 30, 1.0); // Brown rock burst
                      spawnParticle(e.position, 0, 15, 0.8); // White dust
                      traumaRef.current = 0.6;
                      playSound('explosion');
                      // Push hero if close to eruption
                      if (dist < 5.0 && !hero.isDead) {
                          hero.velocity.add(dir.clone().negate().multiplyScalar(CONSTANTS.BOSS.TAUPE.PUSH_FORCE));
                      }
                  }
                  e.mesh.position.set(e.position.x, 1.75, e.position.z);
                  if (e.mesh.children[0]) {
                      const hpBar = e.mesh.children[0] as THREE.Sprite;
                      hpBar.material.map = createHealthBarTexture(e.health / e.maxHealth);
                  }
                  living.push(e);
                  return;
              } else if (e.bossPhase === 'surface') {
                  // Normal movement toward player, vulnerable
                  if (e.stunTimer > 0) { e.stunTimer--; }
                  else if (dist > 1.5) {
                      e.velocity.x += dir.x * CONSTANTS.BOSS.TAUPE.SPEED;
                      e.velocity.z += dir.z * CONSTANTS.BOSS.TAUPE.SPEED;
                  }
                  // Transition to burrow
                  if (e.bossPhaseTimer !== undefined && e.bossPhaseTimer <= 0) {
                      e.bossPhase = 'burrow';
                      e.bossPhaseTimer = CONSTANTS.BOSS.TAUPE.BURROW_DURATION;
                      e.velocity.set(0, 0, 0);
                      spawnParticle(e.position, 3, 10, 0.5); // Dig particles
                      playSound('break');
                  }
              }
          }

          // --- NINJA PAIN (RABBIT) AI ---
          if (e.type === 'boss_ninja_pain' && e.bossPhase !== undefined) {
              if (e.bossPhaseTimer !== undefined) e.bossPhaseTimer--;
              const NP = CONSTANTS.BOSS.NINJA_PAIN;
              const inPhase2 = e.health <= e.maxHealth * NP.PHASE2_HP_RATIO;

              const spawnCarrotAt = (x: number, z: number) => {
                  const tex = texturesRef.current.carrot;
                  if (!tex) return;
                  const cMesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 1.0 }));
                  cMesh.scale.set(1.5, 3.0, 1);
                  cMesh.center.set(0.5, 0);
                  cMesh.position.set(x, 0.1, z);
                  scene.add(cMesh);
                  carrotBombsRef.current.push({
                      id: `carrot_${Date.now()}_${Math.random()}`,
                      mesh: cMesh,
                      position: new THREE.Vector3(x, 0, z),
                      groundTime: 0,
                      phase: 'idle',
                  });
              };

              const triggerLand = () => {
                  const lx = e.bossLandingX ?? e.position.x;
                  const lz = e.bossLandingZ ?? e.position.z;
                  e.position.x = lx;
                  e.position.z = lz;
                  e.position.y = 0;
                  e.mesh.visible = true;
                  if (e.bossShadowMesh) { scene.remove(e.bossShadowMesh); e.bossShadowMesh = undefined; }
                  // Damage / push at landing
                  const landPos = new THREE.Vector3(lx, 0, lz);
                  if (!hero.isDead && hero.position.distanceTo(landPos) < NP.LAND_DAMAGE_RADIUS) {
                      const now = Date.now();
                      if (!hero.lastHitTime || now - hero.lastHitTime > 1000) {
                          hero.lastHitTime = now;
                          onLoseLife();
                      }
                      const pushDir = hero.position.clone().sub(landPos);
                      if (pushDir.length() < 0.1) pushDir.set(Math.random()-0.5, 0, Math.random()-0.5);
                      pushDir.normalize();
                      hero.velocity.add(pushDir.multiplyScalar(NP.LAND_PUSH_FORCE));
                  } else if (!hero.isDead && hero.position.distanceTo(landPos) < NP.LAND_DAMAGE_RADIUS * 2) {
                      const pushDir = hero.position.clone().sub(landPos).normalize();
                      hero.velocity.add(pushDir.multiplyScalar(NP.LAND_PUSH_FORCE * 0.5));
                  }
                  spawnParticle(landPos, 3, 30, 1.0);
                  spawnParticle(landPos, 0, 15, 0.7);
                  traumaRef.current = 0.8;
                  playSound('explosion');
                  // Spawn carrots from landing point in phase 1
                  if (!inPhase2) {
                      for (let i = 0; i < NP.PHASE1_CARROTS_ON_LAND; i++) {
                          const a = (i / NP.PHASE1_CARROTS_ON_LAND) * Math.PI * 2;
                          const r = 2 + Math.random() * 2;
                          spawnCarrotAt(lx + Math.cos(a) * r, lz + Math.sin(a) * r);
                      }
                  }
              };

              if (e.bossPhase === 'jump_prep' || e.bossPhase === 'jump_prep_p2') {
                  // Visible, crouched, vulnerable
                  e.mesh.visible = true;
                  e.mesh.scale.y = NP.SCALE * 0.85; // squashed (crouching)
                  e.mesh.position.set(e.position.x, 1.75, e.position.z);
                  if (e.bossPhaseTimer !== undefined && e.bossPhaseTimer <= 0) {
                      // Take off: pick landing point on the player
                      e.bossLandingX = hero.position.x;
                      e.bossLandingZ = hero.position.z;
                      const half = CONSTANTS.ARENA_SIZE / 2 - 3;
                      e.bossLandingX = Math.max(-half, Math.min(half, e.bossLandingX));
                      e.bossLandingZ = Math.max(-half, Math.min(half, e.bossLandingZ));
                      e.bossPhase = inPhase2 ? 'jump_air_p2' : 'jump_air';
                      e.bossPhaseTimer = NP.JUMP_AIR_DURATION;
                      e.mesh.scale.y = NP.SCALE;
                      // Spawn landing shadow telegraph
                      if (texturesRef.current.rabbitLandingShadow) {
                          const shadowMat = new THREE.SpriteMaterial({ map: texturesRef.current.rabbitLandingShadow, transparent: true, opacity: 1.0 });
                          const shadowSprite = new THREE.Sprite(shadowMat);
                          shadowSprite.scale.set(NP.LAND_DAMAGE_RADIUS * 2.4, NP.LAND_DAMAGE_RADIUS * 2.4, 1);
                          shadowSprite.center.set(0.5, 0.5);
                          shadowSprite.position.set(e.bossLandingX, 0.15, e.bossLandingZ);
                          scene.add(shadowSprite);
                          e.bossShadowMesh = shadowSprite;
                      }
                      // Phase 1: invisible in air. Phase 2: visible in air.
                      if (!inPhase2) e.mesh.visible = false;
                      playSound('swing');
                  }
                  // Update HP bar
                  if (e.mesh.children[0]) {
                      const hpBar = e.mesh.children[0] as THREE.Sprite;
                      hpBar.material.map = createHealthBarTexture(e.health / e.maxHealth);
                  }
                  living.push(e);
                  return;
              } else if (e.bossPhase === 'jump_air' || e.bossPhase === 'jump_air_p2') {
                  const totalT = NP.JUMP_AIR_DURATION;
                  const elapsed = totalT - (e.bossPhaseTimer ?? 0);
                  const t = elapsed / totalT;
                  // Track the landing point with the player a bit during jump
                  if (t < 0.6 && e.bossLandingX !== undefined && e.bossLandingZ !== undefined) {
                      e.bossLandingX += (hero.position.x - e.bossLandingX) * 0.03;
                      e.bossLandingZ += (hero.position.z - e.bossLandingZ) * 0.03;
                      const half = CONSTANTS.ARENA_SIZE / 2 - 3;
                      e.bossLandingX = Math.max(-half, Math.min(half, e.bossLandingX));
                      e.bossLandingZ = Math.max(-half, Math.min(half, e.bossLandingZ));
                      if (e.bossShadowMesh) e.bossShadowMesh.position.set(e.bossLandingX, 0.15, e.bossLandingZ);
                  }
                  // Pulsate landing shadow
                  if (e.bossShadowMesh) {
                      const pulse = 1 + Math.sin(timeRef.current * 0.4) * 0.1;
                      const sz = NP.LAND_DAMAGE_RADIUS * 2.4 * pulse;
                      e.bossShadowMesh.scale.set(sz, sz, 1);
                  }
                  // Phase 2: visible flying arc above landing point
                  if (e.bossPhase === 'jump_air_p2') {
                      const arcH = 14;
                      const yOff = Math.sin(t * Math.PI) * arcH;
                      const lx = e.bossLandingX ?? e.position.x;
                      const lz = e.bossLandingZ ?? e.position.z;
                      // interpolate from current position to landing
                      const sx = e.position.x + (lx - e.position.x) * 0.05;
                      const sz_ = e.position.z + (lz - e.position.z) * 0.05;
                      e.position.x = sx;
                      e.position.z = sz_;
                      e.mesh.position.set(sx, 1.75 + yOff, sz_);
                      // Carrot rain in phase 2
                      if (timeRef.current % NP.PHASE2_CARROT_INTERVAL === 0) {
                          const half = CONSTANTS.ARENA_SIZE / 2 - 4;
                          spawnCarrotAt((Math.random() - 0.5) * 2 * half, (Math.random() - 0.5) * 2 * half);
                      }
                  }
                  // Land
                  if (e.bossPhaseTimer !== undefined && e.bossPhaseTimer <= 0) {
                      triggerLand();
                      e.bossPhase = inPhase2 ? 'jump_prep_p2' : 'jump_prep';
                      e.bossPhaseTimer = NP.JUMP_PREP_DURATION;
                  }
                  if (e.mesh.children[0]) {
                      const hpBar = e.mesh.children[0] as THREE.Sprite;
                      hpBar.material.map = createHealthBarTexture(e.health / e.maxHealth);
                  }
                  living.push(e);
                  return;
              }
          }

          // --- SNAKE AI ---
          if (e.type === 'boss_snake' && e.bossPhase !== undefined) {
              if (e.bossPhaseTimer !== undefined) e.bossPhaseTimer--;
              const SK = CONSTANTS.BOSS.SNAKE;

              if (e.bossPhase === 'slither') {
                  // Move toward player, try to constrict
                  if (e.stunTimer > 0) { e.stunTimer--; }
                  else if (dist > 1.5) {
                      e.velocity.x += dir.x * SK.SPEED;
                      e.velocity.z += dir.z * SK.SPEED;
                  }
                  // Snake body sway
                  e.mesh.material.rotation = Math.sin(timeRef.current * 0.08) * 0.15;

                  // Check if close enough to constrict
                  if (dist < SK.CONSTRICT_RANGE && !hero.isDead && !hero.isConstricted) {
                      e.bossPhase = 'constrict';
                      e.bossPhaseTimer = SK.CONSTRICT_DURATION;
                      hero.isConstricted = true;
                      hero.constrictJumps = 0;
                      hero.constrictDamageTimer = SK.CONSTRICT_DAMAGE_INTERVAL;
                      e.velocity.set(0, 0, 0);
                      playSound('hit');
                      traumaRef.current = 0.6;
                      spawnFloatingText(hero.position, true, 'CONSTRICTED!');
                      // Spawn constriction visual on hero
                      if (texturesRef.current.snakeConstriction && !e.bossShadowMesh) {
                          const cMat = new THREE.SpriteMaterial({ map: texturesRef.current.snakeConstriction, transparent: true, opacity: 0.8 });
                          const cSprite = new THREE.Sprite(cMat);
                          cSprite.scale.set(5, 5, 1);
                          cSprite.center.set(0.5, 0.0);
                          scene.add(cSprite);
                          e.bossShadowMesh = cSprite; // reuse field for constriction visual
                      }
                  }
                  // Transition to slither again if timer runs out (re-approach)
                  if (e.bossPhaseTimer !== undefined && e.bossPhaseTimer <= 0) {
                      e.bossPhaseTimer = SK.SLITHER_DURATION;
                  }
              } else if (e.bossPhase === 'constrict') {
                  // Snake is wrapped around hero
                  e.position.copy(hero.position);
                  e.mesh.position.set(hero.position.x, 1.75, hero.position.z);
                  // Show constriction visual on hero
                  if (e.bossShadowMesh) {
                      e.bossShadowMesh.position.set(hero.position.x, 2, hero.position.z);
                      // Pulse the constriction visual
                      const pulse = 1 + Math.sin(timeRef.current * 0.3) * 0.08;
                      e.bossShadowMesh.scale.set(5 * pulse, 5 * pulse, 1);
                      (e.bossShadowMesh.material as THREE.SpriteMaterial).rotation += 0.02;
                  }
                  // Slow hero dramatically
                  hero.velocity.x *= 0.5;
                  hero.velocity.z *= 0.5;

                  // Tick constriction damage timer
                  if (hero.constrictDamageTimer !== undefined) {
                      hero.constrictDamageTimer--;
                      if (hero.constrictDamageTimer <= 0) {
                          hero.constrictDamageTimer = SK.CONSTRICT_DAMAGE_INTERVAL;
                          onLoseLife();
                          traumaRef.current = 0.4;
                          playSound('hit');
                          spawnParticle(hero.position, 1, 10, 0.5);
                      }
                  }

                  // Release if hero jumps 3 times or timer expires
                  if ((hero.constrictJumps !== undefined && hero.constrictJumps >= SK.CONSTRICT_ESCAPE_JUMPS) ||
                      (e.bossPhaseTimer !== undefined && e.bossPhaseTimer <= 0)) {
                      const escaped = hero.constrictJumps !== undefined && hero.constrictJumps >= SK.CONSTRICT_ESCAPE_JUMPS;
                      hero.isConstricted = false;
                      hero.constrictJumps = 0;
                      hero.constrictDamageTimer = undefined;
                      // Remove constriction visual
                      if (e.bossShadowMesh) { scene.remove(e.bossShadowMesh); e.bossShadowMesh = undefined; }
                      e.mesh.material.rotation = 0;
                      if (escaped) {
                          // Snake is stunned after escape
                          e.bossPhase = 'stunned';
                          e.bossPhaseTimer = SK.STUNNED_DURATION;
                          // Push snake away
                          const pushDir = e.position.clone().sub(hero.position);
                          if (pushDir.length() < 0.1) pushDir.set(1, 0, 0);
                          pushDir.normalize();
                          e.velocity.add(pushDir.multiplyScalar(SK.PUSH_FORCE));
                          spawnFloatingText(hero.position, true, 'FREED!');
                          playSound('break');
                          traumaRef.current = 0.5;
                      } else {
                          e.bossPhase = 'slither';
                          e.bossPhaseTimer = SK.SLITHER_DURATION;
                      }
                  }
              } else if (e.bossPhase === 'stunned') {
                  // Vulnerable, not moving
                  e.mesh.material.rotation = Math.sin(timeRef.current * 0.5) * 0.3;
                  if (e.bossPhaseTimer !== undefined && e.bossPhaseTimer <= 0) {
                      e.bossPhase = 'slither';
                      e.bossPhaseTimer = SK.SLITHER_DURATION;
                      e.mesh.material.rotation = 0;
                  }
              }

              // Physics for snake
              e.velocity.y -= CONSTANTS.GRAVITY;
              e.velocity.x *= 0.9;
              e.velocity.z *= 0.9;
              e.position.add(e.velocity);
              if (e.position.y < 0) { e.position.y = 0; e.velocity.y = 0; }
              const half = CONSTANTS.ARENA_SIZE / 2 - 2;
              e.position.x = Math.max(-half, Math.min(half, e.position.x));
              e.position.z = Math.max(-half, Math.min(half, e.position.z));
              if (e.bossPhase !== 'constrict') {
                  e.mesh.position.set(e.position.x, 1.75 + e.position.y, e.position.z);
              }
              if (e.mesh.children[0]) {
                  const hpBar = e.mesh.children[0] as THREE.Sprite;
                  hpBar.material.map = createHealthBarTexture(e.health / e.maxHealth);
              }
              living.push(e);
              return;
          }

          if (e.stunTimer > 0) {
              e.stunTimer--;
          } else if (e.type !== 'boss_tatoo' && e.type !== 'boss_taupe' && e.type !== 'boss_ninja_pain' && e.type !== 'boss_snake') {
              if (dist > 1.5) {
                  e.velocity.x += dir.x * CONSTANTS.ENEMY_SPEED_BASE;
                  e.velocity.z += dir.z * CONSTANTS.ENEMY_SPEED_BASE;
              }
          }

          {
              // Attack player if very close
              if (dist < 2.0 && !hero.isDead) {
                  // Damage player
                  const now = Date.now();
                  // Simple invincibility check
                  if (!hero.lastHitTime || now - hero.lastHitTime > 1000) {
                      hero.lastHitTime = now;
                      traumaRef.current = 0.5;
                      playSound('hit');
                      hero.velocity.add(dir.clone().multiplyScalar(2.5));
                  } else {
                      hero.velocity.add(dir.clone().multiplyScalar(CONSTANTS.ENEMY_PUSH_FORCE));
                  }
              } else if (dist < 4.0) {
                  // Start pushing even before direct contact
                  hero.velocity.add(dir.clone().multiplyScalar(CONSTANTS.ENEMY_PUSH_FORCE * 0.5));
              }
          }

          // Physics
          e.velocity.y -= CONSTANTS.GRAVITY;
          e.velocity.x *= 0.9;
          e.velocity.z *= 0.9;
          e.position.add(e.velocity);

          // Enemy-prop solid collision
          propsRef.current.forEach(prop => {
              const dist = e.position.distanceTo(prop.position);
              const minDist = prop.radius + 0.6;
              if (dist < minDist && dist > 0.01) {
                  const pushDir = e.position.clone().sub(prop.position).normalize();
                  e.position.add(pushDir.multiplyScalar(minDist - dist));
                  e.velocity.multiplyScalar(0.5);
              }
          });

          // Floor collision
          if (e.position.y < 0 && Math.abs(e.position.x) < arenaHalf && Math.abs(e.position.z) < arenaHalf) {
              e.position.y = 0;
              e.velocity.y = 0;
          }

          e.mesh.position.set(e.position.x, 1.75 + e.position.y, e.position.z);
          
          // Update HP bar
          if (e.mesh.children[0]) {
              const hpBar = e.mesh.children[0] as THREE.Sprite;
              hpBar.material.map = createHealthBarTexture(e.health / e.maxHealth);
          }

          living.push(e);
      });
      enemiesRef.current = living;

      timeRef.current++;
      if (!bossActiveRef.current) {
          if (killCountRef.current >= spawnThresholdRef.current) spawnBoss();
          else if (timeRef.current % 60 === 0) spawnEnemy();
      }
      camera.position.lerp(new THREE.Vector3(hero.position.x + 24, 32, hero.position.z + 24), 0.1);
      camera.lookAt(hero.position.x, 0, hero.position.z);
      if (traumaRef.current > 0) {
          traumaRef.current -= 0.05;
          const shake = traumaRef.current * traumaRef.current * 2;
          camera.position.x += (Math.random() - 0.5) * shake;
          camera.position.y += (Math.random() - 0.5) * shake;
          camera.position.z += (Math.random() - 0.5) * shake;
      }

      rendererRef.current.render(sceneRef.current!, camera);
    };

    animate();

    const handleKeyDown = (e: KeyboardEvent) => keysPressed.current.add(e.key.toLowerCase());
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      isMountedRef.current = false;
      cancelAnimationFrame(frameIdRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if(sceneRef.current) {
          sceneRef.current.traverse((obj) => {
              if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
                  if (obj.geometry) obj.geometry.dispose();
                  if (obj.material) {
                      if (Array.isArray(obj.material)) obj.material.forEach((m) => m && m.dispose && m.dispose());
                      else if (obj.material.dispose) (obj.material as any).dispose();
                  }
              }
          });
      }
      if (rendererRef.current) {
          const r = rendererRef.current;
          if (mountRef.current && r.domElement && mountRef.current.contains(r.domElement)) mountRef.current.removeChild(r.domElement);
          r.dispose(); r.forceContextLoss(); rendererRef.current = null;
      }
    };
  }, [character]);

  return <div ref={mountRef} className="absolute inset-0 z-0" />;
};
