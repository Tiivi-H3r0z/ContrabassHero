
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
  createYarnTexture
} from '../services/assetFactory';
import { Hero, Enemy, Particle, FloatingText, GameStateStatus, Prop, CharacterType, GameSettings, KeyBindings, Projectile } from '../types';
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
  setPlayerHealth: (hp: number) => void;
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
  setPlayerHealth,
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
    yarn: null
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
      if (isDebugMode) {
          enemiesRef.current.forEach(enemy => {
              if (enemy.isBoss) {
                  enemy.health = 1;
              }
          });
      }
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

    const topMat = new THREE.MeshBasicMaterial({ map: currentFloorTex });

    let sideColor = 0x1a1a1a;
    if (stageRef.current === 2) sideColor = 0x555555;
    if (stageRef.current === 3) sideColor = 0x3f6212;
    if (stageRef.current === 4) sideColor = 0x8b6914;
    if (stageRef.current === 5) sideColor = 0x330000;

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
                    propsRef.current.push({ id: `desk_${r}_${c}`, type: 'desk', mesh: deskMesh, position: new THREE.Vector3(x + jX, 0, z + jZ), radius: 2.0, health: 30 });
                }
            }
        } else if (stageRef.current === 2) {
             for(let i=0; i<15; i++) {
                const r = CONSTANTS.ARENA_SIZE / 2.2;
                const x = (Math.random() - 0.5) * 2 * r, z = (Math.random() - 0.5) * 2 * r;
                if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
                const rockMesh = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x4b5563 }));
                const size = 2 + Math.random() * 2;
                rockMesh.scale.set(size, size, 1);
                rockMesh.position.set(x, size/2, z);
                scene.add(rockMesh);
                propsRef.current.push({ id: `rock_${i}`, type: 'rock', mesh: rockMesh, position: new THREE.Vector3(x, 0, z), radius: size/2, health: 100 });
             }
        } else if (stageRef.current === 3) {
            for(let i=0; i<12; i++) {
                const r = CONSTANTS.ARENA_SIZE / 2.5;
                const x = (Math.random() - 0.5) * 2 * r, z = (Math.random() - 0.5) * 2 * r;
                if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
                const chairMesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturesRef.current.chair }));
                chairMesh.scale.set(3, 3, 1);
                chairMesh.position.set(x, 1.5, z);
                scene.add(chairMesh);
                propsRef.current.push({ id: `chair_${i}`, type: 'chair', mesh: chairMesh, position: new THREE.Vector3(x, 0, z), radius: 1.5, health: 20 });
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
                propsRef.current.push({ id: `cactus_${i}`, type: 'rock', mesh: cactusMesh, position: new THREE.Vector3(x, 0, z), radius: size/2, health: 80 });
            }
        } else if (stageRef.current === 5) {
            // Volcano: scatter rocks + lava glow at edges
            for(let i=0; i<15; i++) {
                const r = CONSTANTS.ARENA_SIZE / 2.2;
                const x = (Math.random() - 0.5) * 2 * r, z = (Math.random() - 0.5) * 2 * r;
                if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
                const rockMesh = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x2a1a0a }));
                const size = 2 + Math.random() * 2;
                rockMesh.scale.set(size, size, 1);
                rockMesh.position.set(x, size/2, z);
                scene.add(rockMesh);
                propsRef.current.push({ id: `vrock_${i}`, type: 'rock', mesh: rockMesh, position: new THREE.Vector3(x, 0, z), radius: size/2, health: 100 });
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
        let bossType: Enemy['type'] = 'boss_director';
        let stats: any = {...CONSTANTS.BOSS.DIRECTOR};
        let tex = texturesRef.current.enemies[0];
        if (stageRef.current === 2) { bossType = 'boss_eagle'; stats = {...CONSTANTS.BOSS.EAGLE}; tex = texturesRef.current.eagle!; }
        else if (stageRef.current === 3) { bossType = 'boss_kawik'; stats = {...CONSTANTS.BOSS.KAWIK}; tex = texturesRef.current.kawik!; }
        else if (stageRef.current === 4) { bossType = 'boss_tatoo'; stats = {...CONSTANTS.BOSS.TATOO}; tex = texturesRef.current.tatoo!; }
        else if (stageRef.current === 5) { bossType = 'boss_taupe'; stats = {...CONSTANTS.BOSS.TAUPE}; tex = texturesRef.current.taupe!; }
        if (isDebugModeRef.current) stats.HP = 1;
        const mesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xffcccc }));
        mesh.scale.set(stats.SCALE, stats.SCALE, 1); mesh.center.set(0.5, 0);
        scene.add(mesh);
        const hpSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: createHealthBarTexture(1) }));
        hpSprite.position.set(0, 1.1, 0); hpSprite.scale.set(1, 0.05, 1);
        mesh.add(hpSprite);
        const bossEnemy: Enemy = { id: `boss_${Date.now()}`, type: bossType, variation: 0, mesh, position: new THREE.Vector3(0, 0, -CONSTANTS.ARENA_SIZE/2+5), velocity: new THREE.Vector3(0, 0, 0), health: stats.HP, maxHealth: stats.HP, isDead: false, radius: 3.5, stunTimer: 0, speechBubble: null, isBoss: true };
        if (bossType === 'boss_tatoo') { bossEnemy.bossPhase = 'walk'; bossEnemy.bossPhaseTimer = CONSTANTS.BOSS.TATOO.WALK_DURATION; }
        if (bossType === 'boss_taupe') { bossEnemy.bossPhase = 'surface'; bossEnemy.bossPhaseTimer = CONSTANTS.BOSS.TAUPE.SURFACE_DURATION; }
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
        hero.specialActiveTimer = 120;
        hero.specialCooldown = CONSTANTS.POWERS.ADRIEN_ROAR_COOLDOWN;
        hero.maxSpecialCooldown = CONSTANTS.POWERS.ADRIEN_ROAR_COOLDOWN;
        if (texturesRef.current.lion) hero.mesh.material.map = texturesRef.current.lion;
        hero.mesh.scale.set(8, 8, 1);
        if (hero.mesh.children[0]) (hero.mesh.children[0] as THREE.Sprite).visible = false;
        playSound('roar');
        enemiesRef.current.forEach(e => {
          if (e.position.distanceTo(hero.position) < 15) {
            e.velocity.add(e.position.clone().sub(hero.position).normalize().multiplyScalar(5));
            e.health -= 20;
          }
        });
      } else if (character === 'eliot') {
        hero.specialCooldown = CONSTANTS.POWERS.ELIOT_FART_COOLDOWN;
        hero.maxSpecialCooldown = CONSTANTS.POWERS.ELIOT_FART_COOLDOWN;
        playSound('fart');
        enemiesRef.current.forEach(e => {
          if (e.position.distanceTo(hero.position) < 8) {
            e.health -= 50;
            spawnParticle(e.position, 0, 10, 0.2);
          }
        });
      } else if (character === 'swan') {
        hero.specialCooldown = CONSTANTS.POWERS.SWAN_CAT_COOLDOWN;
        hero.maxSpecialCooldown = CONSTANTS.POWERS.SWAN_CAT_COOLDOWN;
        playSound('meow');
        enemiesRef.current.forEach(e => {
          if (e.position.distanceTo(hero.position) < 10) {
            e.health -= 100;
            spawnBloodExplosion(e.position);
          }
        });
      } else if (character === 'pierre') {
        hero.specialCooldown = CONSTANTS.POWERS.PIERRE_NUKE_COOLDOWN;
        hero.maxSpecialCooldown = CONSTANTS.POWERS.PIERRE_NUKE_COOLDOWN;
        playSound('explosion');
        enemiesRef.current.forEach(e => {
          e.health -= 500;
          spawnBloodExplosion(e.position, true);
        });
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
              enemiesRef.current.forEach(e => { if(e.position.distanceTo(hero.position) < 5) { e.health = 0; playSound('break'); } });
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
              if (isKeyPressed('jump') && !hero.isJumping && hero.position.y === 0) { hero.velocity.y = CONSTANTS.HERO_JUMP_FORCE; hero.isJumping = true; }
              hero.position.add(hero.velocity);
              if (Math.abs(hero.position.x) <= arenaHalf && Math.abs(hero.position.z) <= arenaHalf && hero.position.y < 0) { hero.position.y = 0; hero.velocity.y = 0; hero.isJumping = false; }
              if (hero.position.y < -50) { hero.isDead = true; playSound('die'); onGameOver(); }
              hero.mesh.position.set(hero.position.x, 2 + hero.position.y, hero.position.z);
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
                      e.health -= 40;
                      // Knockback
                      const kbDir = e.position.clone().sub(hero.position).normalize();
                      e.velocity.add(kbDir.multiplyScalar(CONSTANTS.KNOCKBACK));
                      traumaRef.current = 0.3;
                      hitStopRef.current = CONSTANTS.HIT_STOP_FRAMES;
                  }
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

      const living: Enemy[] = [];
      enemiesRef.current.forEach(e => {
          if (e.health <= 0 || e.position.y < -50) {
              spawnBloodExplosion(e.position, e.isBoss); sceneRef.current!.remove(e.mesh); removeSpeechBubble(e); playSound('die');
              if (e.isBoss) {
                // Clean up taupe shadow if present
                if (e.bossShadowMesh) { sceneRef.current!.remove(e.bossShadowMesh); }
                bossActiveRef.current = true; // Keep true to suppress spawns during transition
                if (stageRef.current < 5) {
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
                      const now = Date.now();
                      if (!hero.lastHitTime || now - hero.lastHitTime > 500) {
                          hero.health -= CONSTANTS.DAMAGE_HERO * 1.5;
                          setPlayerHealth(hero.health);
                          hero.lastHitTime = now;
                          traumaRef.current = 0.6;
                          playSound('hit');
                          if (hero.health <= 0) { hero.isDead = true; playSound('die'); onGameOver(); }
                      }
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
                      const shadowMat = new THREE.SpriteMaterial({ map: texturesRef.current.shadow, transparent: true, opacity: 0.8 });
                      const shadowSprite = new THREE.Sprite(shadowMat);
                      shadowSprite.scale.set(6, 6, 1);
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
                      // Damage hero if close to eruption
                      if (dist < 5.0 && !hero.isDead) {
                          hero.velocity.add(dir.clone().negate().multiplyScalar(CONSTANTS.BOSS.TAUPE.PUSH_FORCE));
                          hero.health -= CONSTANTS.DAMAGE_HERO * 2;
                          setPlayerHealth(hero.health);
                          hero.lastHitTime = Date.now();
                          if (hero.health <= 0) { hero.isDead = true; playSound('die'); onGameOver(); }
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

          if (e.stunTimer > 0) {
              e.stunTimer--;
          } else if (e.type !== 'boss_tatoo' && e.type !== 'boss_taupe') {
              // Only move if not too close (avoid jitter)
              if (dist > 1.5) {
                  e.velocity.x += dir.x * 0.05;
                  e.velocity.z += dir.z * 0.05;
              }
          }

          {
              // Attack player if very close
              if (dist < 2.0 && !hero.isDead) {
                  // Damage player
                  const now = Date.now();
                  // Simple invincibility check
                  if (!hero.lastHitTime || now - hero.lastHitTime > 1000) {
                      hero.health -= CONSTANTS.DAMAGE_HERO;
                      setPlayerHealth(hero.health);
                      hero.lastHitTime = now;
                      traumaRef.current = 0.5;
                      playSound('hit');

                      // Strong push on hit
                      hero.velocity.add(dir.clone().multiplyScalar(2.5));

                      if (hero.health <= 0) {
                          hero.isDead = true;
                          playSound('die');
                          onGameOver();
                      }
                  } else {
                      // Constant pushing force even during invincibility
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
