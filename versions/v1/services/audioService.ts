
import * as THREE from 'three';

// "Horrible" Arcade Synthesizer & Audio Service
// Generates gritty, punchy sounds using Web Audio API for SFX
// Plays external MP3 for background music

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

// --- MUSIC CONFIGURATION ---
// TODO: Replace this URL with your hosted MP3 file link
const BACKGROUND_MUSIC_URL: string = '';

let bgm: HTMLAudioElement | null = null;

export const initAudio = (volume?: number) => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = volume ?? 0.3;
    masterGain.connect(audioCtx.destination);
  } else if (volume !== undefined && masterGain) {
    masterGain.gain.value = volume;
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return { ctx: audioCtx, out: masterGain! };
};

export const setMasterVolume = (val: number) => {
    const v = Math.max(0, Math.min(1, val));
    if (masterGain) {
        masterGain.gain.value = v;
    }
    if (bgm) {
        bgm.volume = v;
    }
};

// Helper for noise buffer
const createNoiseBuffer = (ctx: AudioContext) => {
  const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

let noiseBuffer: AudioBuffer | null = null;

// --- MUSIC CONTROLS ---

export const startMusic = () => {
    // Check if user has configured the URL
    if (BACKGROUND_MUSIC_URL === 'YOUR_MP3_URL_HERE') {
        console.log("Background Music: No URL configured in services/audioService.ts");
        return;
    }

    if (!bgm) {
        bgm = new Audio(BACKGROUND_MUSIC_URL);
        bgm.loop = true;
        bgm.volume = masterGain?.gain.value ?? 0.3;
    }

    // Only play if currently paused to avoid overlaps
    if (bgm.paused) {
        bgm.play().catch(e => {
            console.warn("Background music playback failed. Ensure the URL is valid and user has interacted with the page.", e);
        });
    }
};

export const stopMusic = () => {
    if (bgm) {
        bgm.pause();
        bgm.currentTime = 0; // Reset track to beginning
    }
};

// --- SOUND EFFECTS ---

export const playSound = (type: 'swing' | 'hit' | 'hurt' | 'die' | 'spawn' | 'break' | 'bossSpawn' | 'fart' | 'meow' | 'roar' | 'cluck' | 'explosion' | 'peck' | 'shred') => {
  const { ctx, out } = initAudio();
  const now = ctx.currentTime;

  if (!noiseBuffer) noiseBuffer = createNoiseBuffer(ctx);

  // Default nodes for gritty sounds
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  // Distortion curve for extra "horrible" grit
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(44100);
  const deg = Math.PI / 180;
  for (let i=0; i<44100; i++) {
      const x = i * 2 / 44100 - 1;
      curve[i] = (3 + 20) * x * 20 * deg / (Math.PI + 20 * Math.abs(x));
  }
  shaper.curve = curve;

  // Default Routing: osc -> gain -> shaper -> out
  osc.connect(gain);
  gain.connect(shaper);
  shaper.connect(out);

  switch (type) {
    case 'swing':
      // Heavy, low whoosh
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.8, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      
      osc.start(now);
      osc.stop(now + 0.3);
      break;

    case 'hit':
      // Contrabass Impact: Massive, distorted, low-end dominant
      const bassFreq = 500 + Math.random() * 200; // Deep low end
      
      // Dedicated high-gain distortion path for this sound to dominate
      const hitDistortion = ctx.createWaveShaper();
      // Aggressive clipping curve (S-curve)
      const hCurve = new Float32Array(256);
      for(let i=0; i<256; i++) {
          const x = (i / 128) - 1;
          // Very high distortion amount (k=100)
          hCurve[i] = (3 + 100) * x * 20 * deg / (Math.PI + 100 * Math.abs(x));
      }
      hitDistortion.curve = hCurve;
      hitDistortion.oversample = '4x';
      
      const hitMix = ctx.createGain();
      hitMix.gain.value = 6.0; // Drive input into distortion extremely hard for "blown out" sound
      
      hitMix.connect(hitDistortion);
      hitDistortion.connect(out);

      // Layer 1: Texture (Sawtooth) - The "Grit"
      const texOsc = ctx.createOscillator();
      const texFilter = ctx.createBiquadFilter();
      const texGain = ctx.createGain();
      
      texOsc.type = 'sawtooth';
      texOsc.frequency.setValueAtTime(bassFreq, now);
      texOsc.frequency.exponentialRampToValueAtTime(bassFreq * 0.8, now + 0.4);
      
      texFilter.type = 'lowpass';
      texFilter.Q.value = 2; // Resonant
      texFilter.frequency.setValueAtTime(600, now);
      texFilter.frequency.exponentialRampToValueAtTime(50, now + 0.3);
      
      texGain.gain.setValueAtTime(1.5, now);
      texGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      
      texOsc.connect(texFilter);
      texFilter.connect(texGain);
      texGain.connect(hitMix);
      texOsc.start(now);
      texOsc.stop(now + 0.6);

      // Layer 2: Body (Triangle) - The "Punch"
      const bodyOsc = ctx.createOscillator();
      const bodyGain = ctx.createGain();
      
      bodyOsc.type = 'triangle'; 
      bodyOsc.frequency.setValueAtTime(bassFreq, now);
      bodyOsc.frequency.linearRampToValueAtTime(bassFreq * 0.5, now + 0.4);
      
      bodyGain.gain.setValueAtTime(2.0, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      
      bodyOsc.connect(bodyGain);
      bodyGain.connect(hitMix);
      bodyOsc.start(now);
      bodyOsc.stop(now + 0.6);
      
      // Layer 3: Sub-bass (Sine) - The "Floor"
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(bassFreq / 2, now); // Sub octave
      subGain.gain.setValueAtTime(3.0, now);
      subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      
      subOsc.connect(subGain);
      subGain.connect(hitMix);
      subOsc.start(now);
      subOsc.stop(now + 0.5);
      break;

    case 'hurt':
      // Sharp, jarring square wave
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.1);
      
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.15);
      
      osc.start(now);
      osc.stop(now + 0.15);
      break;

    case 'die':
      // Long descending slide
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(10, now + 1.5);
      
      // LFO for tremolo
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 15;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 500; // FM synthesis
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now);
      lfo.stop(now + 1.5);

      gain.gain.setValueAtTime(0.6, now);
      gain.gain.linearRampToValueAtTime(0, now + 1.5);
      
      osc.start(now);
      osc.stop(now + 1.5);
      break;
      
    case 'spawn':
        // Eerie discordant bell
        osc.type = 'sine';
        osc.frequency.setValueAtTime(666, now); // Devil's interval ish
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(666 * 1.414, now); // Tritone-ish
        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(0.1, now + 0.05);
        gain2.gain.linearRampToValueAtTime(0, now + 0.5);
        
        osc2.connect(gain2);
        gain2.connect(out);
        
        osc.start(now);
        osc.stop(now + 0.5);
        osc2.start(now);
        osc2.stop(now + 0.5);
        break;

    case 'bossSpawn':
        // Demonic Roar: Sawtooth slide + Detuned Square + Distortion
        const oscB1 = ctx.createOscillator();
        oscB1.type = 'sawtooth';
        oscB1.frequency.setValueAtTime(80, now);
        oscB1.frequency.exponentialRampToValueAtTime(20, now + 3.0);
        
        const oscB2 = ctx.createOscillator();
        oscB2.type = 'square';
        oscB2.frequency.setValueAtTime(110, now); // Dissonant interval
        oscB2.frequency.exponentialRampToValueAtTime(25, now + 3.0);
        
        const gainB = ctx.createGain();
        gainB.gain.setValueAtTime(0, now);
        gainB.gain.linearRampToValueAtTime(0.8, now + 0.1);
        gainB.gain.exponentialRampToValueAtTime(0.01, now + 3.0);
        
        // Connect through the dirty shaper
        oscB1.connect(gainB);
        oscB2.connect(gainB);
        gainB.connect(shaper);
        
        oscB1.start(now);
        oscB1.stop(now + 3.0);
        oscB2.start(now);
        oscB2.stop(now + 3.0);
        break;

    case 'break':
        // Wood smash sound: noise burst + low thud
        const noise = ctx.createBufferSource();
        if (!noiseBuffer) noiseBuffer = createNoiseBuffer(ctx);
        noise.buffer = noiseBuffer;
        const nFilter = ctx.createBiquadFilter();
        nFilter.type = 'highpass';
        nFilter.frequency.value = 800;
        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.5, now);
        nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        
        noise.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(out);
        noise.start(now);
        noise.stop(now + 0.2);

        const thud = ctx.createOscillator();
        thud.frequency.setValueAtTime(150, now);
        thud.frequency.exponentialRampToValueAtTime(40, now + 0.2);
        const tGain = ctx.createGain();
        tGain.gain.setValueAtTime(0.8, now);
        tGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        thud.connect(tGain);
        tGain.connect(out);
        thud.start(now);
        thud.stop(now + 0.2);
        break;
        
    case 'fart':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.3);
        gain.gain.setValueAtTime(1.0, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
        break;
    case 'meow':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(300, now + 0.3);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
        break;
    case 'cluck':
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(250, now + 0.1);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
        break;
    case 'peck':
        // Short high pitched impact
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.05);
        osc.start(now); osc.stop(now + 0.05);
        break;
    case 'roar':
        const noiseR = ctx.createBufferSource();
        if (!noiseBuffer) noiseBuffer = createNoiseBuffer(ctx);
        noiseR.buffer = noiseBuffer;
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
        const g = ctx.createGain(); g.gain.setValueAtTime(1, now); g.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
        noiseR.connect(f); f.connect(g); g.connect(out);
        noiseR.start(now); noiseR.stop(now + 1.0);
        break;
    case 'explosion':
        const noiseE = ctx.createBufferSource();
        if (!noiseBuffer) noiseBuffer = createNoiseBuffer(ctx);
        noiseE.buffer = noiseBuffer;
        const gE = ctx.createGain(); gE.gain.setValueAtTime(1, now); gE.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        noiseE.connect(gE); gE.connect(out);
        noiseE.start(now); noiseE.stop(now + 0.5);
        break;
    case 'shred':
        // Scratchy noise for cat attack
        const noiseS = ctx.createBufferSource();
        if (!noiseBuffer) noiseBuffer = createNoiseBuffer(ctx);
        noiseS.buffer = noiseBuffer;
        const fS = ctx.createBiquadFilter(); fS.type = 'highpass'; fS.frequency.value = 1200;
        const gS = ctx.createGain(); gS.gain.setValueAtTime(0.4, now); gS.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        noiseS.connect(fS); fS.connect(gS); gS.connect(out);
        noiseS.start(now); noiseS.stop(now + 0.15);
        break;
  }
};
