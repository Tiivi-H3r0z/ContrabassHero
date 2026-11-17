
import * as THREE from 'three';
import { CharacterType } from '../types';

// Helper to create a canvas and get context
const validContext = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("No 2d context");
  return { canvas, ctx };
};

// Helper to create THREE texture from canvas
const createTexture = (canvas: HTMLCanvasElement) => {
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

// --- DRAWING PRIMITIVES ---

const drawHeroBody = (ctx: CanvasRenderingContext2D, character: CharacterType) => {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(32, 58, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- CLOTHES ---
  if (character === 'armand') {
      ctx.fillStyle = '#3b82f6'; // Blue shirt
      ctx.fillRect(24, 24, 16, 24);
      ctx.fillStyle = '#1e3a8a'; // Dark pants
      ctx.fillRect(24, 48, 16, 10);
  } else if (character === 'adrien') {
      ctx.fillStyle = '#10b981'; // Green shirt
      ctx.fillRect(24, 24, 16, 24);
      ctx.fillStyle = '#1e3a8a'; 
      ctx.fillRect(24, 48, 16, 10);
  } else if (character === 'eliot') {
      ctx.fillStyle = '#f97316'; // Orange shirt
      ctx.fillRect(24, 24, 16, 24);
      ctx.fillStyle = '#4b5563'; // Grey jeans
      ctx.fillRect(24, 48, 16, 10);
  } else if (character === 'swan') {
      ctx.fillStyle = '#6366f1'; // Indigo shirt
      ctx.fillRect(24, 24, 16, 24);
      ctx.fillStyle = '#000000'; // Black pants
      ctx.fillRect(24, 48, 16, 10);
  } else if (character === 'pierre') {
      ctx.fillStyle = '#ffffff'; // White ruffled shirt
      ctx.fillRect(22, 24, 20, 24);
      ctx.fillStyle = '#7f1d1d'; // Velvet pants
      ctx.fillRect(24, 48, 16, 10);
  } else if (character === 'audrey') {
      ctx.fillStyle = '#eab308'; // Mustard Dress
      ctx.beginPath();
      ctx.moveTo(24, 24);
      ctx.lineTo(40, 24);
      ctx.lineTo(44, 58); // Dress flare
      ctx.lineTo(20, 58);
      ctx.fill();
  }

  // --- HEAD ---
  ctx.fillStyle = '#fca5a5'; // Skin
  ctx.fillRect(26, 10, 12, 14);

  // --- HAIR & FACE ---
  if (character === 'armand') {
      ctx.fillStyle = '#451a03'; // Brown
      ctx.fillRect(24, 6, 16, 6);
      ctx.fillRect(24, 6, 4, 12); // Sideburns
  } else if (character === 'adrien') {
      ctx.fillStyle = '#fcd34d'; // Blonde
      ctx.fillRect(24, 6, 16, 8);
      ctx.fillRect(22, 8, 4, 10); // Messy blonde
      ctx.fillRect(38, 8, 4, 8);
  } else if (character === 'eliot') {
      ctx.fillStyle = '#fdba74'; // Venetian Blonde (Orange-ish)
      ctx.fillRect(24, 6, 16, 6); // Short
      ctx.fillRect(24, 8, 2, 8);
      // Glasses
      ctx.fillStyle = 'black';
      ctx.fillRect(26, 14, 5, 2);
      ctx.fillRect(33, 14, 5, 2);
      ctx.fillRect(31, 15, 2, 1); // Bridge
  } else if (character === 'swan') {
      ctx.fillStyle = '#3e2723'; // Dark Brunette
      ctx.beginPath(); // Curly mid-long
      ctx.arc(26, 10, 4, 0, Math.PI*2);
      ctx.arc(38, 10, 4, 0, Math.PI*2);
      ctx.arc(24, 16, 4, 0, Math.PI*2);
      ctx.arc(40, 16, 4, 0, Math.PI*2);
      ctx.rect(26, 6, 12, 6);
      ctx.fill();
      // Glasses
      ctx.fillStyle = 'black';
      ctx.fillRect(26, 14, 5, 2);
      ctx.fillRect(33, 14, 5, 2);
      ctx.fillRect(31, 15, 2, 1);
  } else if (character === 'pierre') {
      ctx.fillStyle = '#fcd34d'; // Blonde
      // Long ponytail
      ctx.fillRect(24, 6, 16, 12);
      ctx.fillRect(40, 10, 4, 12); // Ponytail
      // Mischievous Smile
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(32, 18, 3, 0, Math.PI);
      ctx.stroke();
  } else if (character === 'audrey') {
      ctx.fillStyle = '#5d4037'; // Brunette
      // Curly mid-long
      ctx.beginPath();
      ctx.arc(26, 8, 5, 0, Math.PI*2);
      ctx.arc(38, 8, 5, 0, Math.PI*2);
      ctx.arc(22, 16, 5, 0, Math.PI*2);
      ctx.arc(42, 16, 5, 0, Math.PI*2);
      ctx.rect(26, 4, 12, 6);
      ctx.fill();
  }

  // Eyes (Generic for all except those with glasses who had them drawn, or Pierre)
  if (character !== 'pierre') {
      ctx.fillStyle = 'black';
      ctx.fillRect(28, 15, 2, 2);
      ctx.fillRect(34, 15, 2, 2);
  } else {
      // Pierre eyes
      ctx.fillStyle = 'black';
      ctx.fillRect(28, 15, 2, 1);
      ctx.fillRect(34, 15, 2, 1);
  }
};

const drawContrabassShape = (ctx: CanvasRenderingContext2D) => {
    // ... existing contrabass code ...
    ctx.strokeStyle = '#2e1005'; 
    ctx.lineWidth = 4;
    ctx.fillStyle = '#5c2608'; 
    ctx.beginPath();
    ctx.ellipse(0, 40, 45, 55, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-35, 20);
    ctx.quadraticCurveTo(-20, 0, -35, -20); 
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(35, 20);
    ctx.quadraticCurveTo(20, 0, 35, -20); 
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -35, 38, 40, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a0500';
    ctx.font = 'bold 40px serif';
    ctx.fillText("f", -30, 20);
    ctx.fillText("f", 10, 20);
    ctx.fillStyle = '#1c1917';
    ctx.beginPath(); ctx.moveTo(-10, 90); ctx.lineTo(10, 90); ctx.lineTo(5, 50); ctx.lineTo(-5, 50); ctx.fill();
    ctx.fillStyle = '#d97706'; ctx.fillRect(-15, 25, 30, 4);
    ctx.fillStyle = '#1c1917'; ctx.fillRect(-8, -100, 16, 100);
    ctx.fillStyle = '#5c2608'; ctx.beginPath(); ctx.arc(0, -110, 12, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#d4d4d8'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-4, -110); ctx.lineTo(-4, 90); ctx.moveTo(-1.5, -110); ctx.lineTo(-1.5, 90);
    ctx.moveTo(1.5, -110); ctx.lineTo(1.5, 90); ctx.moveTo(4, -110); ctx.lineTo(4, 90); ctx.stroke();
};

const drawDrumsticksShape = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#fcd34d'; 
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-10, 20); ctx.lineTo(15, -20); ctx.stroke();
    ctx.fillStyle = '#fcd34d'; ctx.beginPath(); ctx.arc(15, -20, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, 20); ctx.lineTo(-15, -20); ctx.stroke();
    ctx.beginPath(); ctx.arc(-15, -20, 4, 0, Math.PI*2); ctx.fill();
};

const drawGuitarShape = (ctx: CanvasRenderingContext2D) => {
    ctx.translate(0, -20);
    // Body
    ctx.fillStyle = '#991b1b'; // Red Guitar
    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 30, 25, 30, 0, 0, Math.PI*2);
    ctx.ellipse(0, -10, 20, 20, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();
    // Neck
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(-5, -60, 10, 60);
    // Head
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(-8, -75, 16, 15);
};

const drawPianoShape = (ctx: CanvasRenderingContext2D) => {
    // Upright Piano visual
    ctx.fillStyle = '#000000';
    ctx.fillRect(-40, -30, 80, 60);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-38, 0, 76, 20); // Keys bg
    // Black keys
    ctx.fillStyle = 'black';
    for(let i=-35; i<35; i+=10) {
        if (i % 20 !== 0) ctx.fillRect(i, 0, 6, 12);
    }
};

const drawHarpsichordShape = (ctx: CanvasRenderingContext2D) => {
    // Fancy wood piano
    ctx.fillStyle = '#78350f'; // Wood
    ctx.beginPath();
    ctx.moveTo(-40, -40);
    ctx.lineTo(20, -40);
    ctx.lineTo(40, 20);
    ctx.lineTo(-40, 20);
    ctx.fill();
    
    // Gold trim
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fef3c7'; // Keys
    ctx.fillRect(-38, 5, 60, 15);
};

const drawNoteShape = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#ec4899'; // Pink note
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    
    // Head
    ctx.beginPath();
    ctx.ellipse(-10, 10, 12, 10, -0.2, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();
    
    // Stem
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(0, -30);
    ctx.stroke();
    
    // Flag
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.quadraticCurveTo(20, -20, 20, 0);
    ctx.quadraticCurveTo(10, -10, 0, -10);
    ctx.fill();
};

// --- EXPORTED GENERATORS ---

export const createHeroBodyTexture = (character: CharacterType): THREE.Texture => {
  const { canvas, ctx } = validContext(64, 64);
  drawHeroBody(ctx, character);
  return createTexture(canvas);
};

export const createContrabassTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(128, 256); 
    ctx.translate(64, 128);
    drawContrabassShape(ctx);
    return createTexture(canvas);
};

export const createDrumsticksTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(64, 64);
    ctx.translate(32, 32);
    drawDrumsticksShape(ctx);
    return createTexture(canvas);
};

export const createGuitarTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(128, 256);
    ctx.translate(64, 128);
    ctx.scale(1.5, 1.5);
    drawGuitarShape(ctx);
    return createTexture(canvas);
};

export const createPianoTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(128, 128);
    ctx.translate(64, 64);
    drawPianoShape(ctx);
    return createTexture(canvas);
};

export const createHarpsichordTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(128, 128);
    ctx.translate(64, 64);
    drawHarpsichordShape(ctx);
    return createTexture(canvas);
};

export const createNoteTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(64, 64);
    ctx.translate(32, 32);
    drawNoteShape(ctx);
    return createTexture(canvas);
};

export const getCharacterPreview = (type: CharacterType): string => {
    const { canvas, ctx } = validContext(256, 256);
    
    // Draw Hero (Scaled x3)
    ctx.save();
    ctx.translate(128 - (64*3)/2, 128 - (64*3)/2 + 20);
    ctx.scale(3, 3);
    drawHeroBody(ctx, type);
    ctx.restore();

    // Draw Weapon
    ctx.save();
    if (type === 'armand') {
        ctx.translate(128 + 40, 128 + 20);
        ctx.scale(1.2, 1.2);
        drawContrabassShape(ctx);
    } else if (type === 'adrien') {
        ctx.translate(128 + 40, 128);
        ctx.scale(3, 3);
        drawDrumsticksShape(ctx);
    } else if (type === 'eliot') {
        ctx.translate(128 + 30, 128 + 20);
        ctx.scale(1.5, 1.5);
        drawGuitarShape(ctx);
    } else if (type === 'swan') {
        ctx.translate(128 + 50, 128 + 30);
        ctx.scale(1.0, 1.0);
        drawPianoShape(ctx);
    } else if (type === 'pierre') {
        ctx.translate(128 + 50, 128 + 30);
        ctx.scale(1.0, 1.0);
        drawHarpsichordShape(ctx);
    } else if (type === 'audrey') {
        ctx.translate(128 + 40, 128 - 20);
        ctx.scale(2.0, 2.0);
        drawNoteShape(ctx);
    }
    ctx.restore();

    return canvas.toDataURL();
};

export const createTeacherTexture = (seed: number): THREE.Texture => {
  const { canvas, ctx } = validContext(64, 64);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(32, 60, 12, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  const suitColor = seed % 2 === 0 ? '#4b5563' : '#57534e';
  ctx.fillStyle = suitColor;
  ctx.fillRect(22, 28, 20, 28);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(30, 30, 4, 12);
  ctx.fillStyle = '#e5e5e5'; 
  ctx.fillRect(24, 8, 16, 20);
  ctx.fillStyle = '#1f2937';
  if (seed % 3 === 0) {
    ctx.fillRect(22, 16, 4, 6);
    ctx.fillRect(38, 16, 4, 6);
  } else {
    ctx.fillRect(22, 4, 20, 6);
  }
  ctx.fillStyle = 'black';
  ctx.fillRect(27, 16, 3, 2);
  ctx.fillRect(35, 16, 3, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(27, 19, 3, 1);
  ctx.fillRect(35, 19, 3, 1);
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(32, 24, 4, Math.PI, 0);
  ctx.stroke();
  if (seed % 4 === 0) {
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(28, 20, 2, 2);
    ctx.fillRect(28, 23, 2, 2);
  }

  return createTexture(canvas);
};

export const createEagleTexture = (): THREE.Texture => {
    // High resolution for the giant head
    const { canvas, ctx } = validContext(256, 256);
    
    const cx = 128;
    const cy = 128;

    // Draw a "Screaming Eagle" style head (Side profile)

    // Neck plumage (Dark brown/black at bottom)
    ctx.fillStyle = '#27272a'; // Dark color
    ctx.beginPath();
    ctx.moveTo(cx - 80, cy + 60);
    ctx.lineTo(cx + 40, cy + 128);
    ctx.lineTo(cx - 128, cy + 128);
    ctx.fill();

    // Head Feathers (White)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx + 20, cy - 20); // Near beak top
    ctx.quadraticCurveTo(cx, cy - 100, cx - 80, cy - 80); // Top head
    ctx.quadraticCurveTo(cx - 120, cy - 40, cx - 100, cy + 40); // Back head
    ctx.quadraticCurveTo(cx - 90, cy + 100, cx - 60, cy + 120); // Neck
    ctx.lineTo(cx - 20, cy + 90); 
    ctx.lineTo(cx + 40, cy + 30); // Jaw connection
    ctx.fill();
    
    // Feather texture (rough)
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    for(let i=0; i<50; i++) {
        const x = cx - 90 + Math.random() * 100;
        const y = cy - 70 + Math.random() * 150;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 5 + Math.random()*10, y + 10);
        ctx.stroke();
    }

    // BEAK - Massive and Open
    // Gradient for beak
    const grd = ctx.createLinearGradient(cx, cy, cx+120, cy+20);
    grd.addColorStop(0, '#fcd34d'); // Yellow
    grd.addColorStop(1, '#d97706'); // Orange
    
    ctx.fillStyle = grd;
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 3;

    // Upper Beak (Curved down)
    ctx.beginPath();
    ctx.moveTo(cx + 20, cy - 20); // Bridge
    ctx.quadraticCurveTo(cx + 80, cy - 30, cx + 120, cy + 20); // Tip
    ctx.quadraticCurveTo(cx + 100, cy + 25, cx + 70, cy + 10); // Under hook
    ctx.lineTo(cx + 40, cy + 5); // Mouth corner upper
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Lower Beak
    ctx.beginPath();
    ctx.moveTo(cx + 40, cy + 30); // Jaw
    ctx.quadraticCurveTo(cx + 80, cy + 50, cx + 110, cy + 40); // Tip
    ctx.lineTo(cx + 50, cy + 20); // Mouth corner lower
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Mouth Interior (Red/Dark)
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.moveTo(cx + 40, cy + 5);
    ctx.lineTo(cx + 70, cy + 10); // Deep inside
    ctx.lineTo(cx + 50, cy + 20);
    ctx.fill();
    
    // Tongue
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.ellipse(cx + 55, cy + 15, 8, 4, 0.2, 0, Math.PI*2);
    ctx.fill();

    // Eye (Crazy/Intense)
    ctx.fillStyle = '#fef08a'; // Yellowish eye
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 30, 14, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();

    // Pupil (Small point)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 30, 4, 0, Math.PI*2);
    ctx.fill();

    // Brow (Angry)
    ctx.strokeStyle = '#9ca3af';
    ctx.beginPath();
    ctx.moveTo(cx - 25, cy - 40);
    ctx.quadraticCurveTo(cx - 5, cy - 45, cx + 15, cy - 35);
    ctx.stroke();

    return createTexture(canvas);
};

export const createKawikTexture = (): THREE.Texture => {
  const { canvas, ctx } = validContext(256, 256);
  
  const cx = 128;
  const cy = 128;

  // Body (Oval, Potato shaped)
  ctx.fillStyle = '#ffffff'; // Base white
  ctx.beginPath();
  ctx.ellipse(cx, cy + 20, 100, 80, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fur Patches (Orange/Brown)
  ctx.fillStyle = '#c2410c'; // Rusty orange
  ctx.beginPath();
  ctx.ellipse(cx - 40, cy + 10, 50, 60, -0.2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#78350f'; // Dark brown rear
  ctx.beginPath();
  ctx.ellipse(cx + 60, cy + 30, 40, 50, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (Black beady)
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(cx - 60, cy - 20, 8, 0, Math.PI * 2); // Left
  ctx.arc(cx + 60, cy - 20, 8, 0, Math.PI * 2); // Right (wide set because it's 2.5D flat)
  ctx.fill();
  
  // Sparkle in eye
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(cx - 62, cy - 22, 2, 0, Math.PI * 2);
  ctx.arc(cx + 58, cy - 22, 2, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.fillStyle = '#fca5a5';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // TEETH (Giant buck teeth)
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e5e5e5';
  ctx.lineWidth = 2;
  // Tooth 1
  ctx.fillRect(cx - 12, cy + 25, 10, 30);
  ctx.strokeRect(cx - 12, cy + 25, 10, 30);
  // Tooth 2
  ctx.fillRect(cx + 2, cy + 25, 10, 30);
  ctx.strokeRect(cx + 2, cy + 25, 10, 30);

  // Whiskers
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  // Left
  ctx.moveTo(cx - 20, cy + 15); ctx.lineTo(cx - 80, cy + 5);
  ctx.moveTo(cx - 20, cy + 20); ctx.lineTo(cx - 85, cy + 25);
  // Right
  ctx.moveTo(cx + 20, cy + 15); ctx.lineTo(cx + 80, cy + 5);
  ctx.moveTo(cx + 20, cy + 20); ctx.lineTo(cx + 85, cy + 25);
  ctx.stroke();

  // Feet (Tiny, frantic looking)
  ctx.fillStyle = '#fca5a5';
  // Front Left
  ctx.beginPath(); ctx.ellipse(cx - 50, cy + 90, 15, 10, 0, 0, Math.PI*2); ctx.fill();
  // Front Right
  ctx.beginPath(); ctx.ellipse(cx + 50, cy + 90, 15, 10, 0, 0, Math.PI*2); ctx.fill();
  
  // Texture (Fur lines)
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 2;
  for(let i=0; i<100; i++) {
      const x = cx - 90 + Math.random() * 180;
      const y = cy - 40 + Math.random() * 120;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x+5, y+5); ctx.stroke();
  }

  return createTexture(canvas);
}

export const createClassroomFloorTexture = (): THREE.Texture => {
  const { canvas, ctx } = validContext(512, 512);
  ctx.fillStyle = '#5d4037'; 
  ctx.fillRect(0, 0, 512, 512);
  const plankHeight = 32;
  const plankWidths = [64, 96, 128, 48];
  for(let y=0; y<512; y+=plankHeight) {
      let x = (y / plankHeight) % 2 === 0 ? 0 : -32; 
      while(x < 512) {
          const w = plankWidths[Math.floor(Math.random() * plankWidths.length)];
          const hue = 20 + Math.random() * 5;
          const sat = 40 + Math.random() * 10;
          const light = 25 + Math.random() * 10;
          ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
          ctx.fillRect(x, y, w - 2, plankHeight - 2); 
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(x + 4, y + plankHeight/2, 2, 2);
          ctx.fillRect(x + w - 6, y + plankHeight/2, 2, 2);
          x += w;
      }
  }
  const tex = createTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
};

export const createMountainFloorTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(512, 512);
    // Base snow/rock
    ctx.fillStyle = '#e5e7eb'; // Grey/White
    ctx.fillRect(0,0,512,512);
    
    // Random stones
    for(let i=0; i<200; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const s = Math.random() * 20 + 5;
        ctx.fillStyle = Math.random() > 0.5 ? '#9ca3af' : '#d1d5db';
        ctx.beginPath();
        ctx.ellipse(x, y, s, s*0.6, Math.random(), 0, Math.PI*2);
        ctx.fill();
    }
    // Cloud Wisps
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for(let i=0; i<50; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const r = Math.random() * 60 + 20;
        ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    }

    const tex = createTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

export const createGardenFloorTexture = (): THREE.Texture => {
  const { canvas, ctx } = validContext(512, 512);
  // Base Grass
  ctx.fillStyle = '#3f6212'; 
  ctx.fillRect(0,0,512,512);
  
  // Grass blades
  for(let i=0; i<2000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const h = Math.random() * 10 + 5;
      ctx.strokeStyle = Math.random() > 0.5 ? '#4d7c0f' : '#65a30d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random()-0.5)*5, y - h);
      ctx.stroke();
  }
  
  // Mud patches
  for(let i=0; i<20; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * 40 + 20;
      ctx.fillStyle = 'rgba(67, 36, 12, 0.4)';
      ctx.beginPath();
      ctx.ellipse(x, y, r, r*0.7, Math.random(), 0, Math.PI*2);
      ctx.fill();
  }

  const tex = createTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const drawDesk = (ctx: CanvasRenderingContext2D, damage: 0|1|2|3 = 0) => {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(6, 48, 52, 6);
    // Table surface — progressively darker/greyer
    const surfaceColors = ['#8d6e63', '#7a5c52', '#624840', '#4a3028'];
    ctx.fillStyle = surfaceColors[damage];
    ctx.fillRect(4, 16, 56, 32);
    // Table edge
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(4, 44, 56, 4);
    // Paper on desk
    ctx.fillStyle = damage >= 2 ? 'rgba(200,200,200,0.4)' : '#fff';
    ctx.fillRect(10, 20, 12, 16);
    // Red dot
    if (damage < 3) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(45, 25, 4, 0, Math.PI*2); ctx.fill();
    }
    // Cracks — appear progressively
    ctx.strokeStyle = 'rgba(30,15,5,0.8)';
    if (damage >= 1) {
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(20, 20); ctx.lineTo(28, 30); ctx.lineTo(22, 38); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(42, 18); ctx.lineTo(50, 26); ctx.stroke();
    }
    if (damage >= 2) {
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(10, 28); ctx.lineTo(26, 34); ctx.lineTo(18, 44); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(36, 22); ctx.lineTo(58, 36); ctx.stroke();
        // Big crack through surface
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(8, 16); ctx.lineTo(32, 28); ctx.lineTo(22, 48); ctx.stroke();
        // Missing corner chunk
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath(); ctx.moveTo(50, 16); ctx.lineTo(60, 16); ctx.lineTo(60, 26); ctx.fill();
    }
    if (damage >= 3) {
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(4, 20); ctx.lineTo(60, 44); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(4, 40); ctx.lineTo(40, 16); ctx.stroke();
        // Splinters / holes
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(14, 22, 8, 6);
        ctx.fillRect(38, 32, 10, 8);
        // Very dark overlay — almost destroyed
        ctx.fillStyle = 'rgba(20,8,0,0.45)';
        ctx.fillRect(4, 16, 56, 32);
    }
};

export const createDeskTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(64, 64);
    drawDesk(ctx, 0);
    return createTexture(canvas);
};

export const createDeskDamagedTexture = (level: 1|2|3): THREE.Texture => {
    const { canvas, ctx } = validContext(64, 64);
    drawDesk(ctx, level);
    return createTexture(canvas);
};

const drawChair = (ctx: CanvasRenderingContext2D, damage: 0|1|2|3 = 0) => {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(16, 26, 8, 3, 0, 0, Math.PI*2); ctx.fill();
    // Seat — darkens with damage
    const seatColors = ['#a1887f', '#8d7068', '#7a5a50', '#5c3f36'];
    ctx.fillStyle = seatColors[damage];
    ctx.fillRect(8, 8, 16, 16);
    // Seat edge
    ctx.fillStyle = '#795548';
    ctx.fillRect(8, 22, 16, 2);
    // Backrest — disappears at level 3
    if (damage < 3) {
        ctx.fillStyle = damage >= 2 ? '#6d4c41' : '#5d4037';
        ctx.fillRect(8, 4, 16, 4);
    }
    // Legs — progressively broken
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(8, 24, 3, 6);   // left leg
    if (damage < 2) ctx.fillRect(21, 24, 3, 6); // right leg (missing at lvl 2+)
    // Cracks
    ctx.strokeStyle = 'rgba(30,10,0,0.85)';
    if (damage >= 1) {
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(10, 8); ctx.lineTo(14, 20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(20, 6); ctx.lineTo(18, 16); ctx.stroke();
    }
    if (damage >= 2) {
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(8, 10); ctx.lineTo(24, 22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, 18); ctx.lineTo(20, 10); ctx.stroke();
        // Jagged broken right edge
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.moveTo(22, 12); ctx.lineTo(26, 10); ctx.lineTo(26, 20); ctx.lineTo(22, 22); ctx.fill();
    }
    if (damage >= 3) {
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(24, 24); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, 24); ctx.lineTo(24, 8); ctx.stroke();
        ctx.fillStyle = 'rgba(20,8,0,0.5)';
        ctx.fillRect(8, 8, 16, 16);
    }
};

export const createChairTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(32, 32);
    drawChair(ctx, 0);
    return createTexture(canvas);
};

export const createChairDamagedTexture = (level: 1|2|3): THREE.Texture => {
    const { canvas, ctx } = validContext(32, 32);
    drawChair(ctx, level);
    return createTexture(canvas);
};

export const createParticleTexture = (color: string): THREE.Texture => {
  const { canvas, ctx } = validContext(16, 16);
  ctx.fillStyle = color;
  ctx.fillRect(2, 2, 12, 12);
  return createTexture(canvas);
};

export const createTextTexture = (text: string, color: string): THREE.Texture => {
  const { canvas, ctx } = validContext(128, 64);
  ctx.font = 'bold 40px monospace'; 
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 4;
  ctx.strokeText(text, 64, 32);
  ctx.fillText(text, 64, 32);
  return createTexture(canvas);
};

export const createSpeechBubbleTexture = (text: string): THREE.Texture => {
    const width = 512;
    const height = 256;
    const { canvas, ctx } = validContext(width, height);
    const x = 10;
    const y = 10;
    const w = width - 20;
    const h = height - 60; 
    const r = 40;
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r);
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width/2 - 20, y+h);
    ctx.lineTo(width/2, y+h+40);
    ctx.lineTo(width/2 + 20, y+h);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'black';
    const fontSize = 36; 
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxWidth = w - 60; 
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    const lineHeight = fontSize * 1.2;
    const totalTextHeight = lines.length * lineHeight;
    const startY = y + (h / 2) - (totalTextHeight / 2) + (lineHeight * 0.4); 
    lines.forEach((line, i) => {
        ctx.fillText(line, width / 2, startY + (i * lineHeight));
    });
    return createTexture(canvas);
};

export const createHealthBarTexture = (percent: number): THREE.Texture => {
    const { canvas, ctx } = validContext(32, 4);
    ctx.fillStyle = 'black';
    ctx.fillRect(0,0,32,4);
    ctx.fillStyle = percent > 0.5 ? '#22c55e' : '#ef4444';
    ctx.fillRect(1, 1, Math.max(0, 30 * percent), 2);
    return createTexture(canvas);
};

// --- NEW ASSETS FOR POWERS ---

export const createChickenTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(64, 64);
    // Body
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(32, 32, 20, 15, 0, 0, Math.PI*2); ctx.fill();
    // Head
    ctx.beginPath(); ctx.arc(48, 20, 10, 0, Math.PI*2); ctx.fill();
    // Comb
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(48, 12, 4, 0, Math.PI*2); ctx.fill();
    // Beak
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.moveTo(56, 18); ctx.lineTo(62, 20); ctx.lineTo(56, 22); ctx.fill();
    // Eye
    ctx.fillStyle = 'black'; ctx.fillRect(50, 18, 2, 2);
    return createTexture(canvas);
};

export const createLionTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(64, 64);
    // Mane
    ctx.fillStyle = '#d97706';
    ctx.beginPath(); ctx.arc(32, 32, 24, 0, Math.PI*2); ctx.fill();
    // Face
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath(); ctx.arc(32, 32, 16, 0, Math.PI*2); ctx.fill();
    // Eyes
    ctx.fillStyle = 'black'; 
    ctx.fillRect(24, 28, 4, 4);
    ctx.fillRect(36, 28, 4, 4);
    // Nose
    ctx.fillStyle = '#78350f';
    ctx.beginPath(); ctx.moveTo(32, 40); ctx.lineTo(28, 36); ctx.lineTo(36, 36); ctx.fill();
    return createTexture(canvas);
};

export const createCatTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(32, 32);
    ctx.fillStyle = '#f97316'; // Orange cat
    ctx.beginPath(); ctx.arc(16, 16, 12, 0, Math.PI*2); ctx.fill();
    // Ears
    ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(4, 0); ctx.lineTo(12, 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(24, 8); ctx.lineTo(28, 0); ctx.lineTo(20, 4); ctx.fill();
    // Face
    ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(16, 20, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'black'; ctx.fillRect(12, 12, 2, 2); ctx.fillRect(18, 12, 2, 2);
    return createTexture(canvas);
};

export const createGrenadeTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(32, 32);
    ctx.fillStyle = '#10b981';
    ctx.beginPath(); ctx.ellipse(16, 18, 10, 12, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#065f46'; // Lines
    ctx.fillRect(8, 12, 16, 2);
    ctx.fillRect(8, 22, 16, 2);
    ctx.fillStyle = '#52525b'; // Pin
    ctx.fillRect(14, 2, 4, 6);
    return createTexture(canvas);
};

export const createShockwaveTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(256, 256);
    const cx = 128, cy = 128;
    // Outer glow ring
    const grad = ctx.createRadialGradient(cx, cy, 80, cx, cy, 128);
    grad.addColorStop(0,   'rgba(255, 200, 50, 0.0)');
    grad.addColorStop(0.5, 'rgba(255, 200, 50, 0.9)');
    grad.addColorStop(0.75,'rgba(255, 100, 0,  0.6)');
    grad.addColorStop(1,   'rgba(255, 50,  0,  0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 128, 0, Math.PI * 2);
    ctx.fill();
    // Inner cutout to make it a ring
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, 76, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    return createTexture(canvas);
};

// --- SNOWBALL ---
const drawSnowball = (ctx: CanvasRenderingContext2D, damage: 0|1|2|3 = 0) => {
    const cx = 32, cy = 36;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(cx, 58, 18, 5, 0, 0, Math.PI*2); ctx.fill();
    // Base sphere
    const baseColors = ['#f0f4ff', '#d8e4f0', '#c0cce0', '#a0b0c4'];
    ctx.fillStyle = baseColors[damage];
    ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI*2); ctx.fill();
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(cx - 6, cy - 8, 9, 0, Math.PI*2); ctx.fill();
    // Snow texture dots
    ctx.fillStyle = 'rgba(180,200,230,0.5)';
    for(let i=0; i<8; i++) {
        ctx.beginPath(); ctx.arc(cx-16+i*5, cy+4+Math.sin(i)*6, 2, 0, Math.PI*2); ctx.fill();
    }
    // Cracks
    ctx.strokeStyle = 'rgba(80,110,150,0.9)';
    if (damage >= 1) {
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(22, 28); ctx.lineTo(30, 42); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(40, 24); ctx.lineTo(46, 36); ctx.stroke();
    }
    if (damage >= 2) {
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(18, 36); ctx.lineTo(32, 28); ctx.lineTo(44, 40); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(28, 20); ctx.lineTo(22, 34); ctx.stroke();
        // Chunk missing
        ctx.fillStyle = 'rgba(100,130,170,0.6)';
        ctx.beginPath(); ctx.arc(44, 28, 7, 0, Math.PI*2); ctx.fill();
    }
    if (damage >= 3) {
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(14, 24); ctx.lineTo(52, 50); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(14, 44); ctx.lineTo(48, 22); ctx.stroke();
        ctx.fillStyle = 'rgba(80,110,150,0.5)';
        ctx.fillRect(20, 28, 8, 8);
        ctx.fillRect(36, 38, 8, 6);
    }
};

export const createSnowballTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(64, 64);
    drawSnowball(ctx, 0);
    return createTexture(canvas);
};

export const createSnowballDamagedTexture = (level: 1|2|3): THREE.Texture => {
    const { canvas, ctx } = validContext(64, 64);
    drawSnowball(ctx, level);
    return createTexture(canvas);
};

// --- DIRT MOUND ---
const drawDirtMound = (ctx: CanvasRenderingContext2D, damage: 0|1|2|3 = 0) => {
    const cx = 32, cy = 42;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(cx, 58, 22, 5, 0, 0, Math.PI*2); ctx.fill();
    // Base mound
    const moundColors = ['#78501a', '#6a4415', '#5a3810', '#402808'];
    ctx.fillStyle = moundColors[damage];
    ctx.beginPath();
    ctx.moveTo(8, 56);
    ctx.quadraticCurveTo(10, 28, cx, 16);
    ctx.quadraticCurveTo(54, 28, 56, 56);
    ctx.closePath();
    ctx.fill();
    // Soil texture lines
    ctx.strokeStyle = 'rgba(40,20,5,0.5)';
    ctx.lineWidth = 1;
    for(let i=0; i<5; i++) {
        ctx.beginPath();
        ctx.moveTo(12 + i*9, 50); ctx.quadraticCurveTo(cx, 40 - i*4, 52 - i*9, 50);
        ctx.stroke();
    }
    // Grass sprouts on top (disappear with damage)
    if (damage < 2) {
        ctx.strokeStyle = '#4d7c0f';
        ctx.lineWidth = 2;
        for(let i=0; i<5; i++) {
            const gx = cx - 10 + i*5;
            ctx.beginPath(); ctx.moveTo(gx, 18 + i%2*4); ctx.lineTo(gx-3, 10 + i%3*3); ctx.stroke();
        }
    }
    // Cracks
    ctx.strokeStyle = 'rgba(20,8,0,0.8)';
    if (damage >= 1) {
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(22, 30); ctx.lineTo(28, 44); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(38, 26); ctx.lineTo(44, 38); ctx.stroke();
    }
    if (damage >= 2) {
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(16, 38); ctx.lineTo(30, 28); ctx.lineTo(46, 40); ctx.stroke();
        // Collapsed side
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.moveTo(44, 20); ctx.lineTo(58, 34); ctx.lineTo(56, 56); ctx.lineTo(46, 52); ctx.fill();
    }
    if (damage >= 3) {
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(10, 24); ctx.lineTo(56, 50); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(10, 46); ctx.lineTo(50, 20); ctx.stroke();
        ctx.fillStyle = 'rgba(20,8,0,0.5)'; ctx.fillRect(18, 26, 12, 10); ctx.fillRect(36, 34, 10, 8);
    }
};

export const createDirtMoundTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(64, 64);
    drawDirtMound(ctx, 0);
    return createTexture(canvas);
};

export const createDirtMoundDamagedTexture = (level: 1|2|3): THREE.Texture => {
    const { canvas, ctx } = validContext(64, 64);
    drawDirtMound(ctx, level);
    return createTexture(canvas);
};

// --- LAVA CRATER ---
const drawLavaCrater = (ctx: CanvasRenderingContext2D, damage: 0|1|2|3 = 0) => {
    const cx = 32, cy = 38;
    // Outer dark rock rim
    const rimColors = ['#2a1a0a', '#1e1206', '#160e04', '#0c0804'];
    ctx.fillStyle = rimColors[damage];
    ctx.beginPath(); ctx.ellipse(cx, cy, 28, 20, 0, 0, Math.PI*2); ctx.fill();
    // Lava glow inside (brighter with more damage)
    const innerRadius = damage >= 2 ? 20 : damage >= 1 ? 17 : 14;
    const glowGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, innerRadius);
    if (damage >= 2) {
        glowGrad.addColorStop(0, 'rgba(255, 255, 100, 1)');
        glowGrad.addColorStop(0.3, 'rgba(255, 160, 0, 1)');
        glowGrad.addColorStop(0.7, 'rgba(220, 60, 0, 0.9)');
        glowGrad.addColorStop(1, 'rgba(100, 20, 0, 0.4)');
    } else if (damage >= 1) {
        glowGrad.addColorStop(0, 'rgba(255, 200, 50, 0.9)');
        glowGrad.addColorStop(0.4, 'rgba(220, 80, 0, 0.8)');
        glowGrad.addColorStop(1, 'rgba(80, 15, 0, 0.3)');
    } else {
        glowGrad.addColorStop(0, 'rgba(255, 140, 0, 0.8)');
        glowGrad.addColorStop(0.5, 'rgba(180, 50, 0, 0.7)');
        glowGrad.addColorStop(1, 'rgba(60, 10, 0, 0.2)');
    }
    ctx.fillStyle = glowGrad;
    ctx.beginPath(); ctx.ellipse(cx, cy, innerRadius, innerRadius * 0.7, 0, 0, Math.PI*2); ctx.fill();
    // Rock texture on rim
    ctx.strokeStyle = 'rgba(80,40,10,0.6)';
    ctx.lineWidth = 1;
    for(let i=0; i<6; i++) {
        const a = (i/6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a)*22, cy + Math.sin(a)*16);
        ctx.lineTo(cx + Math.cos(a)*28, cy + Math.sin(a)*20);
        ctx.stroke();
    }
    // Cracks radiating out with damage
    ctx.strokeStyle = 'rgba(255,100,0,0.7)';
    if (damage >= 1) {
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx, cy-4); ctx.lineTo(cx-8, cy-22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+6, cy-2); ctx.lineTo(cx+20, cy-16); ctx.stroke();
    }
    if (damage >= 2) {
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx-4, cy+4); ctx.lineTo(cx-22, cy+14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+4, cy+4); ctx.lineTo(cx+18, cy+16); ctx.stroke();
        // Extra glow pulse chunks
        ctx.fillStyle = 'rgba(255,120,0,0.5)';
        ctx.beginPath(); ctx.arc(cx-14, cy-14, 4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+12, cy+12, 3, 0, Math.PI*2); ctx.fill();
    }
    if (damage >= 3) {
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(255,200,50,0.9)';
        ctx.beginPath(); ctx.moveTo(cx-28, cy-10); ctx.lineTo(cx+26, cy+14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-20, cy+18); ctx.lineTo(cx+22, cy-16); ctx.stroke();
        ctx.fillStyle = 'rgba(255,80,0,0.6)'; ctx.fillRect(cx-16, cy-10, 6, 6); ctx.fillRect(cx+8, cy+4, 5, 5);
    }
};

export const createLavaCraterTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(64, 64);
    drawLavaCrater(ctx, 0);
    return createTexture(canvas);
};

export const createLavaCraterDamagedTexture = (level: 1|2|3): THREE.Texture => {
    const { canvas, ctx } = validContext(64, 64);
    drawLavaCrater(ctx, level);
    return createTexture(canvas);
};

// --- LAVA PROJECTILE ---
export const createLavaProjectileTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(32, 32);
    const cx = 16, cy = 16;
    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, 12);
    grad.addColorStop(0,   'rgba(255, 255, 150, 1)');
    grad.addColorStop(0.3, 'rgba(255, 160,   0, 1)');
    grad.addColorStop(0.7, 'rgba(200,  40,   0, 0.8)');
    grad.addColorStop(1,   'rgba(100,   0,   0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI*2); ctx.fill();
    return createTexture(canvas);
};

// --- TAUPE UNDERGROUND INDICATOR ---
export const createTaupeShadowTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(128, 128);
    const cx = 64, cy = 64;
    // Large pulsing danger circle
    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 60);
    grad.addColorStop(0,   'rgba(0, 0, 0, 0.95)');
    grad.addColorStop(0.5, 'rgba(20, 10, 40, 0.85)');
    grad.addColorStop(0.8, 'rgba(80, 20, 80, 0.5)');
    grad.addColorStop(1,   'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI*2); ctx.fill();
    // Warning ring
    ctx.strokeStyle = 'rgba(200, 0, 200, 0.9)';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 6]);
    ctx.beginPath(); ctx.arc(cx, cy, 50, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
    // Claw marks
    ctx.strokeStyle = 'rgba(255, 80, 255, 0.8)';
    ctx.lineWidth = 3;
    const clawAngles = [0, Math.PI*0.4, Math.PI*0.8, Math.PI*1.2, Math.PI*1.6];
    clawAngles.forEach(a => {
        const cos = Math.cos(a), sin = Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(cx + cos*20, cy + sin*20);
        ctx.lineTo(cx + cos*46, cy + sin*46);
        ctx.stroke();
        // Barb
        ctx.beginPath();
        ctx.moveTo(cx + cos*46, cy + sin*46);
        ctx.lineTo(cx + Math.cos(a+0.4)*38, cy + Math.sin(a+0.4)*38);
        ctx.stroke();
    });
    // Center eye
    ctx.fillStyle = 'rgba(220, 50, 220, 0.9)';
    ctx.beginPath(); ctx.ellipse(cx, cy, 10, 7, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.95)';
    ctx.beginPath(); ctx.ellipse(cx, cy, 5, 4, 0, 0, Math.PI*2); ctx.fill();
    return createTexture(canvas);
};

export const createFartTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(64, 64);
    ctx.fillStyle = 'rgba(34, 197, 94, 0.6)'; // Green gas
    for(let i=0; i<5; i++) {
        ctx.beginPath(); 
        ctx.arc(32 + (Math.random()-0.5)*20, 32 + (Math.random()-0.5)*20, 10 + Math.random()*10, 0, Math.PI*2);
        ctx.fill();
    }
    return createTexture(canvas);
};

export const createTatooTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(256, 256);
    const cx = 128, cy = 128;

    // Body (armored oval)
    ctx.fillStyle = '#6b5b4f'; // Brown-gray armor
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 100, 70, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shell bands
    ctx.strokeStyle = '#4a3f35';
    ctx.lineWidth = 4;
    for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.ellipse(cx + i * 22, cy + 10, 12, 65, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Shell highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 20, 60, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head (small, poking out left)
    ctx.fillStyle = '#8b7b6b';
    ctx.beginPath();
    ctx.ellipse(cx - 90, cy + 20, 30, 25, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = '#a08878';
    ctx.beginPath();
    ctx.ellipse(cx - 115, cy + 25, 15, 12, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.arc(cx - 125, cy + 22, 5, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(cx - 85, cy + 10, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(cx - 86, cy + 9, 2, 0, Math.PI * 2);
    ctx.fill();

    // Ear
    ctx.fillStyle = '#7b6b5b';
    ctx.beginPath();
    ctx.ellipse(cx - 75, cy - 5, 10, 8, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Stubby legs
    ctx.fillStyle = '#6b5b4f';
    ctx.beginPath();
    ctx.ellipse(cx - 55, cy + 80, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 55, cy + 80, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - 25, cy + 82, 15, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 25, cy + 82, 15, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Claws
    ctx.fillStyle = '#3a3a3a';
    for (const lx of [-55, -25, 25, 55]) {
        for (let c = -1; c <= 1; c++) {
            ctx.beginPath();
            ctx.ellipse(cx + lx + c * 5, cy + 90, 3, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Tail
    ctx.strokeStyle = '#6b5b4f';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx + 95, cy + 30);
    ctx.quadraticCurveTo(cx + 120, cy + 15, cx + 115, cy + 40);
    ctx.stroke();

    return createTexture(canvas);
};

export const createTatooShellTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(256, 256);
    const cx = 128, cy = 128;

    // Rolled-up ball
    ctx.fillStyle = '#6b5b4f';
    ctx.beginPath();
    ctx.arc(cx, cy, 95, 0, Math.PI * 2);
    ctx.fill();

    // Armor bands (circular)
    ctx.strokeStyle = '#4a3f35';
    ctx.lineWidth = 5;
    for (let i = 1; i <= 5; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, i * 16, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Cross bands
    ctx.lineWidth = 4;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20);
        ctx.lineTo(cx + Math.cos(a) * 90, cy + Math.sin(a) * 90);
        ctx.stroke();
    }

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(cx - 20, cy - 25, 35, 0, Math.PI * 2);
    ctx.fill();

    // Texture roughness
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    for (let i = 0; i < 60; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 85;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3 + Math.random() * 4, 0, Math.PI * 2);
        ctx.fill();
    }

    return createTexture(canvas);
};

export const createTaupeTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(256, 256);
    const cx = 128, cy = 128;

    // Body (round, dark brown)
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 15, 85, 75, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly (lighter)
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 30, 50, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Big pink nose
    ctx.fillStyle = '#f48fb1';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 15, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    // Nose tip
    ctx.fillStyle = '#ec407a';
    ctx.beginPath();
    ctx.arc(cx, cy - 20, 8, 0, Math.PI * 2);
    ctx.fill();

    // Tiny eyes
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(cx - 30, cy - 25, 4, 0, Math.PI * 2);
    ctx.arc(cx + 30, cy - 25, 4, 0, Math.PI * 2);
    ctx.fill();

    // Large digging claws (left)
    ctx.fillStyle = '#d7ccc8';
    ctx.beginPath();
    ctx.ellipse(cx - 80, cy + 20, 30, 20, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Claw digits
    ctx.fillStyle = '#4e342e';
    for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.ellipse(cx - 105 + i * 8, cy + 15 + Math.abs(i) * 5, 6, 14, -0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    // Large digging claws (right)
    ctx.fillStyle = '#d7ccc8';
    ctx.beginPath();
    ctx.ellipse(cx + 80, cy + 20, 30, 20, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4e342e';
    for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.ellipse(cx + 105 + i * 8, cy + 15 + Math.abs(i) * 5, 6, 14, 0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    // Feet
    ctx.fillStyle = '#4e342e';
    ctx.beginPath();
    ctx.ellipse(cx - 35, cy + 85, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 35, cy + 85, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fur texture
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 80; i++) {
        const x = cx - 70 + Math.random() * 140;
        const y = cy - 40 + Math.random() * 120;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (Math.random() - 0.5) * 8, y + 6);
        ctx.stroke();
    }

    return createTexture(canvas);
};

export const createDesertFloorTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(512, 512);
    // Base sand
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(0, 0, 512, 512);

    // Sand variation
    for (let i = 0; i < 300; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const s = Math.random() * 30 + 5;
        ctx.fillStyle = Math.random() > 0.5 ? '#c9975e' : '#deb887';
        ctx.beginPath();
        ctx.ellipse(x, y, s, s * 0.6, Math.random(), 0, Math.PI * 2);
        ctx.fill();
    }

    // Small pebbles
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillStyle = '#8b7355';
        ctx.beginPath();
        ctx.ellipse(x, y, 3 + Math.random() * 4, 2 + Math.random() * 3, Math.random(), 0, Math.PI * 2);
        ctx.fill();
    }

    // Cracks
    ctx.strokeStyle = 'rgba(139, 115, 85, 0.4)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 15; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.beginPath();
        ctx.moveTo(x, y);
        let cx2 = x, cy2 = y;
        for (let j = 0; j < 5; j++) {
            cx2 += (Math.random() - 0.5) * 40;
            cy2 += (Math.random() - 0.5) * 40;
            ctx.lineTo(cx2, cy2);
        }
        ctx.stroke();
    }

    const tex = createTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
};

export const createVolcanoFloorTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(512, 512);
    // Dark volcanic rock base
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 512, 512);

    // Rock texture variation
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const s = Math.random() * 25 + 5;
        ctx.fillStyle = Math.random() > 0.5 ? '#2a1a0a' : '#1f1f1f';
        ctx.beginPath();
        ctx.ellipse(x, y, s, s * 0.7, Math.random(), 0, Math.PI * 2);
        ctx.fill();
    }

    // Lava cracks (glowing orange)
    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 8;
    for (let i = 0; i < 12; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.beginPath();
        ctx.moveTo(x, y);
        let cx2 = x, cy2 = y;
        for (let j = 0; j < 6; j++) {
            cx2 += (Math.random() - 0.5) * 50;
            cy2 += (Math.random() - 0.5) * 50;
            ctx.lineTo(cx2, cy2);
        }
        ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Lava pools
    ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
    for (let i = 0; i < 8; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const r = Math.random() * 20 + 10;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    const tex = createTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
};

export const createCactusTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(64, 64);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(32, 58, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main trunk
    ctx.fillStyle = '#2d6a2d';
    ctx.fillRect(26, 14, 12, 42);

    // Left arm
    ctx.fillRect(14, 20, 12, 8);
    ctx.fillRect(14, 12, 8, 16);

    // Right arm
    ctx.fillRect(38, 26, 12, 8);
    ctx.fillRect(44, 18, 8, 16);

    // Highlights
    ctx.fillStyle = '#3a8a3a';
    ctx.fillRect(28, 16, 4, 38);
    ctx.fillRect(16, 22, 4, 4);
    ctx.fillRect(46, 20, 4, 4);

    // Spines
    ctx.fillStyle = '#aacc88';
    const spines = [[25, 18], [39, 22], [25, 30], [39, 35], [25, 42], [13, 16], [27, 16], [45, 22], [51, 28]];
    for (const [sx, sy] of spines) {
        ctx.fillRect(sx, sy, 1, 2);
    }

    // Top round
    ctx.fillStyle = '#2d6a2d';
    ctx.beginPath();
    ctx.arc(32, 14, 6, 0, Math.PI * 2);
    ctx.fill();

    return createTexture(canvas);
};

export const createYarnTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(32, 32);
    ctx.fillStyle = '#ef4444'; // Red yarn (teacher tie color)
    ctx.beginPath(); ctx.arc(16, 16, 14, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1;
    for(let i=0; i<10; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random()*32, Math.random()*32);
        ctx.quadraticCurveTo(Math.random()*32, Math.random()*32, Math.random()*32, Math.random()*32);
        ctx.stroke();
    }
    return createTexture(canvas);
};

// --- NINJA PAIN (RABBIT) BOSS ---
export const createRabbitTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(256, 256);
    const cx = 128, cy = 140;

    // Ears (long, grey with pink inner)
    ctx.fillStyle = '#6b6b6b';
    ctx.beginPath(); ctx.ellipse(cx - 28, cy - 80, 16, 55, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 28, cy - 80, 16, 55,  0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f8a5c2';
    ctx.beginPath(); ctx.ellipse(cx - 28, cy - 78, 7, 42, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 28, cy - 78, 7, 42,  0.1, 0, Math.PI * 2); ctx.fill();

    // Body (grey, round)
    ctx.fillStyle = '#7a7a7a';
    ctx.beginPath(); ctx.ellipse(cx, cy + 30, 75, 65, 0, 0, Math.PI * 2); ctx.fill();

    // Belly (lighter)
    ctx.fillStyle = '#a8a8a8';
    ctx.beginPath(); ctx.ellipse(cx, cy + 45, 45, 40, 0, 0, Math.PI * 2); ctx.fill();

    // Head
    ctx.fillStyle = '#7a7a7a';
    ctx.beginPath(); ctx.ellipse(cx, cy - 10, 55, 50, 0, 0, Math.PI * 2); ctx.fill();

    // White forehead spot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(cx, cy - 30, 16, 12, 0, 0, Math.PI * 2); ctx.fill();

    // Red glowing eyes
    ctx.fillStyle = '#ff1a1a';
    ctx.beginPath(); ctx.arc(cx - 18, cy - 10, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 18, cy - 10, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffcccc';
    ctx.beginPath(); ctx.arc(cx - 16, cy - 12, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 20, cy - 12, 2, 0, Math.PI * 2); ctx.fill();

    // Pink nose
    ctx.fillStyle = '#ec407a';
    ctx.beginPath(); ctx.ellipse(cx, cy + 8, 5, 4, 0, 0, Math.PI * 2); ctx.fill();

    // Buck teeth
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 6, cy + 12, 5, 10);
    ctx.fillRect(cx + 1, cy + 12, 5, 10);

    // Feet
    ctx.fillStyle = '#5a5a5a';
    ctx.beginPath(); ctx.ellipse(cx - 32, cy + 88, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 32, cy + 88, 22, 10, 0, 0, Math.PI * 2); ctx.fill();

    // Fur texture
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 80; i++) {
        const x = cx - 65 + Math.random() * 130;
        const y = cy - 20 + Math.random() * 100;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (Math.random() - 0.5) * 8, y + 6);
        ctx.stroke();
    }

    return createTexture(canvas);
};

export const createCarrotTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(64, 128);
    // Leaves
    ctx.fillStyle = '#2d6a2d';
    for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.ellipse(32 + i * 6, 18, 4, 16, i * 0.2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = '#4caf50';
    for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.ellipse(32 + i * 5, 16, 3, 12, i * 0.2, 0, Math.PI * 2);
        ctx.fill();
    }
    // Carrot body (orange triangle)
    ctx.fillStyle = '#ff8c00';
    ctx.beginPath();
    ctx.moveTo(18, 34);
    ctx.lineTo(46, 34);
    ctx.lineTo(32, 118);
    ctx.closePath();
    ctx.fill();
    // Highlight
    ctx.fillStyle = '#ffab40';
    ctx.beginPath();
    ctx.moveTo(22, 38);
    ctx.lineTo(28, 38);
    ctx.lineTo(30, 100);
    ctx.closePath();
    ctx.fill();
    // Ridges
    ctx.strokeStyle = '#d96d00';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
        const y = 45 + i * 15;
        ctx.beginPath();
        ctx.moveTo(20 + i, y);
        ctx.lineTo(44 - i, y);
        ctx.stroke();
    }
    return createTexture(canvas);
};

export const createLightningTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(128, 256);
    // Glow
    const grad = ctx.createRadialGradient(64, 128, 5, 64, 128, 70);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.3, 'rgba(200,220,255,0.5)');
    grad.addColorStop(1, 'rgba(100,100,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 256);

    // Main bolt (zigzag)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(64, 0);
    ctx.lineTo(54, 50);
    ctx.lineTo(74, 90);
    ctx.lineTo(52, 140);
    ctx.lineTo(76, 180);
    ctx.lineTo(60, 230);
    ctx.lineTo(64, 256);
    ctx.stroke();

    // Inner bolt (yellow)
    ctx.strokeStyle = '#fff59d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(64, 0);
    ctx.lineTo(54, 50);
    ctx.lineTo(74, 90);
    ctx.lineTo(52, 140);
    ctx.lineTo(76, 180);
    ctx.lineTo(60, 230);
    ctx.lineTo(64, 256);
    ctx.stroke();

    return createTexture(canvas);
};

export const createRabbitLandingShadowTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(128, 128);
    const cx = 64, cy = 64;
    // Dark circle
    const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 55);
    grad.addColorStop(0,   'rgba(0, 0, 0, 0.9)');
    grad.addColorStop(0.6, 'rgba(40, 0, 0, 0.7)');
    grad.addColorStop(1,   'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, 55, 0, Math.PI * 2); ctx.fill();
    // Red warning ring
    ctx.strokeStyle = 'rgba(255, 40, 40, 0.95)';
    ctx.lineWidth = 5;
    ctx.setLineDash([10, 6]);
    ctx.beginPath(); ctx.arc(cx, cy, 48, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // Crosshair
    ctx.strokeStyle = 'rgba(255, 80, 80, 0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 40, cy); ctx.lineTo(cx - 10, cy);
    ctx.moveTo(cx + 10, cy); ctx.lineTo(cx + 40, cy);
    ctx.moveTo(cx, cy - 40); ctx.lineTo(cx, cy - 10);
    ctx.moveTo(cx, cy + 10); ctx.lineTo(cx, cy + 40);
    ctx.stroke();
    return createTexture(canvas);
};

// --- STAGE 6 PROPS (WINDMILL + GNOME) ---
const drawWindmill = (ctx: CanvasRenderingContext2D, damage: 0|1|2|3 = 0) => {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(64, 122, 28, 5, 0, 0, Math.PI * 2); ctx.fill();

    if (damage >= 3) {
        // Destroyed: rubble pile
        ctx.fillStyle = '#6b5b4b';
        ctx.beginPath(); ctx.ellipse(64, 115, 30, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8a7a6a';
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.arc(48 + i * 4, 112 + (i % 2) * 4, 3 + (i % 3), 0, Math.PI * 2);
            ctx.fill();
        }
        return;
    }

    // Stone tower body (trapezoid)
    ctx.fillStyle = '#c9b896';
    ctx.beginPath();
    ctx.moveTo(48, 120);
    ctx.lineTo(80, 120);
    ctx.lineTo(74, 55);
    ctx.lineTo(54, 55);
    ctx.closePath();
    ctx.fill();
    // Stone details
    ctx.strokeStyle = '#8a7a5a';
    ctx.lineWidth = 1;
    for (let y = 60; y < 120; y += 10) {
        ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(78, y); ctx.stroke();
    }
    // Door
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(60, 98, 8, 22);
    // Window
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(61, 78, 6, 6);

    // Red conical roof
    ctx.fillStyle = damage >= 2 ? '#8a2020' : '#c62828';
    ctx.beginPath();
    ctx.moveTo(50, 58);
    ctx.lineTo(78, 58);
    ctx.lineTo(64, 32);
    ctx.closePath();
    ctx.fill();

    // Sails hub
    ctx.fillStyle = '#5a3a1a';
    ctx.beginPath(); ctx.arc(64, 48, 4, 0, Math.PI * 2); ctx.fill();

    // Sails (4 blades) - damage removes blades
    ctx.fillStyle = '#fafafa';
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 1;
    const bladeCount = damage === 0 ? 4 : damage === 1 ? 3 : 2;
    for (let i = 0; i < bladeCount; i++) {
        const a = (i * Math.PI / 2) + 0.3;
        const cos = Math.cos(a), sin = Math.sin(a);
        ctx.save();
        ctx.translate(64, 48);
        ctx.rotate(a);
        ctx.fillRect(4, -3, 26, 6);
        ctx.strokeRect(4, -3, 26, 6);
        ctx.restore();
    }

    if (damage >= 1) {
        // Cracks
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(56, 70); ctx.lineTo(60, 85); ctx.lineTo(58, 100);
        ctx.stroke();
    }
};

export const createWindmillTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(128, 128);
    drawWindmill(ctx, 0);
    return createTexture(canvas);
};
export const createWindmillDamagedTexture = (level: 1|2|3): THREE.Texture => {
    const { canvas, ctx } = validContext(128, 128);
    drawWindmill(ctx, level);
    return createTexture(canvas);
};

const drawGnome = (ctx: CanvasRenderingContext2D, damage: 0|1|2|3 = 0) => {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(64, 118, 22, 4, 0, 0, Math.PI * 2); ctx.fill();

    if (damage >= 3) {
        // Destroyed: broken pieces
        ctx.fillStyle = '#c62828';
        ctx.beginPath(); ctx.arc(50, 112, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1e3a8a';
        ctx.beginPath(); ctx.arc(62, 116, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e8e8e8';
        ctx.beginPath(); ctx.arc(76, 113, 4, 0, Math.PI * 2); ctx.fill();
        return;
    }

    // Boots
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath(); ctx.ellipse(56, 114, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(72, 114, 8, 4, 0, 0, Math.PI * 2); ctx.fill();

    // Blue coat body
    ctx.fillStyle = damage >= 2 ? '#152a5a' : '#1e3a8a';
    ctx.beginPath();
    ctx.ellipse(64, 95, 22, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    // Belt
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(44, 92, 40, 4);
    // Buckle
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(61, 91, 6, 6);

    // Face (skin)
    ctx.fillStyle = '#f4c4a0';
    ctx.beginPath(); ctx.arc(64, 70, 15, 0, Math.PI * 2); ctx.fill();

    // White beard
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(50, 72);
    ctx.quadraticCurveTo(64, 95, 78, 72);
    ctx.quadraticCurveTo(72, 82, 64, 85);
    ctx.quadraticCurveTo(56, 82, 50, 72);
    ctx.fill();
    // Beard fluff
    ctx.beginPath(); ctx.arc(56, 80, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(64, 84, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(72, 80, 4, 0, Math.PI * 2); ctx.fill();

    // Eyes (small black dots)
    ctx.fillStyle = 'black';
    ctx.beginPath(); ctx.arc(59, 66, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(69, 66, 2, 0, Math.PI * 2); ctx.fill();

    // Nose
    ctx.fillStyle = '#e89880';
    ctx.beginPath(); ctx.arc(64, 71, 3, 0, Math.PI * 2); ctx.fill();

    // Red pointy hat
    ctx.fillStyle = damage >= 2 ? '#8a2020' : '#c62828';
    ctx.beginPath();
    ctx.moveTo(48, 60);
    ctx.lineTo(80, 60);
    ctx.lineTo(64, 26);
    ctx.closePath();
    ctx.fill();
    // Hat tip
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(64, 28, 3, 0, Math.PI * 2); ctx.fill();

    if (damage >= 1) {
        // Crack on hat/body
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(60, 40); ctx.lineTo(64, 55); ctx.lineTo(62, 75);
        ctx.stroke();
    }
};

export const createGnomeTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(128, 128);
    drawGnome(ctx, 0);
    return createTexture(canvas);
};
export const createGnomeDamagedTexture = (level: 1|2|3): THREE.Texture => {
    const { canvas, ctx } = validContext(128, 128);
    drawGnome(ctx, level);
    return createTexture(canvas);
};

export const createEnchantedGardenFloorTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(512, 512);
    // Deep green base
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, 0, 512, 512);

    // Moss patches
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const s = Math.random() * 25 + 8;
        ctx.fillStyle = Math.random() > 0.5 ? '#3f6b1f' : '#1f3a0a';
        ctx.beginPath();
        ctx.ellipse(x, y, s, s * 0.7, Math.random(), 0, Math.PI * 2);
        ctx.fill();
    }

    // Grass blades
    ctx.strokeStyle = '#5a9a2a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 400; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (Math.random() - 0.5) * 4, y - 5 - Math.random() * 4);
        ctx.stroke();
    }

    // Flowers (yellow, pink, white)
    const flowerColors = ['#ffeb3b', '#ff80ab', '#ffffff', '#ce93d8'];
    for (let i = 0; i < 60; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const col = flowerColors[Math.floor(Math.random() * flowerColors.length)];
        ctx.fillStyle = col;
        for (let p = 0; p < 5; p++) {
            const a = (p / 5) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = '#ffd700';
        ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
    }

    return createTexture(canvas);
};

// --- SNAKE BOSS ---
export const createSnakeTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(256, 256);
    const cx = 128, cy = 128;

    // Coiled body (layered ellipses to look like coils)
    ctx.fillStyle = '#2d6b2d';
    for (let i = 0; i < 4; i++) {
        const yy = cy + 20 - i * 8;
        ctx.beginPath();
        ctx.ellipse(cx, yy, 75 - i * 5, 25, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    // Body pattern (diamonds)
    ctx.fillStyle = '#1a4a1a';
    for (let i = 0; i < 12; i++) {
        const x = cx - 60 + Math.random() * 120;
        const y = cy - 10 + Math.random() * 60;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.random());
        ctx.fillRect(-4, -4, 8, 8);
        ctx.restore();
    }
    // Belly lighter stripe
    ctx.fillStyle = '#7acc7a';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 30, 35, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head (raised, triangular)
    ctx.fillStyle = '#2d6b2d';
    ctx.beginPath();
    ctx.moveTo(cx - 30, cy - 30);
    ctx.lineTo(cx + 30, cy - 30);
    ctx.lineTo(cx + 18, cy - 65);
    ctx.lineTo(cx - 18, cy - 65);
    ctx.closePath();
    ctx.fill();
    // Head top
    ctx.fillStyle = '#1a5a1a';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 60, 22, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (yellow, slit pupils)
    ctx.fillStyle = '#ffdd00';
    ctx.beginPath(); ctx.arc(cx - 12, cy - 58, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 12, cy - 58, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 13, cy - 63, 2, 10);
    ctx.fillRect(cx + 11, cy - 63, 2, 10);

    // Tongue (forked, red)
    ctx.strokeStyle = '#cc0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 70);
    ctx.lineTo(cx, cy - 85);
    ctx.lineTo(cx - 5, cy - 92);
    ctx.moveTo(cx, cy - 85);
    ctx.lineTo(cx + 5, cy - 92);
    ctx.stroke();

    // Scales texture
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 60; i++) {
        const x = cx - 70 + Math.random() * 140;
        const y = cy - 20 + Math.random() * 60;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.stroke();
    }

    return createTexture(canvas);
};

export const createSnakeConstrictionTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(128, 128);
    const cx = 64, cy = 64;
    // Green coils wrapping effect
    ctx.strokeStyle = '#2d6b2d';
    ctx.lineWidth = 12;
    for (let i = 0; i < 3; i++) {
        const r = 35 + i * 8;
        ctx.globalAlpha = 0.8 - i * 0.15;
        ctx.beginPath();
        ctx.arc(cx, cy, r, i * 0.7, i * 0.7 + Math.PI * 1.4);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Scale pattern
    ctx.fillStyle = '#1a5a1a';
    for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 30 + Math.random() * 20;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    return createTexture(canvas);
};

// --- STAGE 7 PROPS (VINE + TOTEM) ---
const drawVine = (ctx: CanvasRenderingContext2D, damage: 0|1|2|3 = 0) => {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(64, 122, 20, 4, 0, 0, Math.PI * 2); ctx.fill();

    if (damage >= 3) {
        ctx.fillStyle = '#2d6b2d';
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.ellipse(45 + i * 6, 116 + (i % 2) * 3, 4, 2, Math.random(), 0, Math.PI * 2);
            ctx.fill();
        }
        return;
    }

    // Main vine trunk
    ctx.strokeStyle = '#4a7a2d';
    ctx.lineWidth = damage >= 2 ? 4 : 6;
    ctx.beginPath();
    ctx.moveTo(64, 120);
    ctx.bezierCurveTo(58, 90, 70, 60, 60, 30);
    ctx.stroke();

    const branchCount = damage === 0 ? 4 : damage === 1 ? 3 : 2;
    ctx.strokeStyle = '#3a6a20';
    ctx.lineWidth = 3;
    for (let i = 0; i < branchCount; i++) {
        const y = 40 + i * 20;
        const side = i % 2 === 0 ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(64 + side * 2, y);
        ctx.quadraticCurveTo(64 + side * 20, y - 10, 64 + side * 25, y - 5);
        ctx.stroke();
    }

    ctx.fillStyle = '#2d8a2d';
    const leafCount = damage === 0 ? 8 : damage === 1 ? 5 : 3;
    for (let i = 0; i < leafCount; i++) {
        const x = 40 + Math.random() * 48;
        const y = 30 + Math.random() * 70;
        ctx.beginPath();
        ctx.ellipse(x, y, 6, 3, Math.random(), 0, Math.PI * 2);
        ctx.fill();
    }

    if (damage === 0) {
        ctx.fillStyle = '#ff6b9d';
        for (let i = 0; i < 3; i++) {
            const x = 50 + Math.random() * 28;
            const y = 35 + Math.random() * 50;
            ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
        }
    }

    if (damage >= 1) {
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(60, 60); ctx.lineTo(64, 80); ctx.lineTo(62, 100);
        ctx.stroke();
    }
};

export const createVineTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(128, 128);
    drawVine(ctx, 0);
    return createTexture(canvas);
};
export const createVineDamagedTexture = (level: 1|2|3): THREE.Texture => {
    const { canvas, ctx } = validContext(128, 128);
    drawVine(ctx, level);
    return createTexture(canvas);
};

const drawTotem = (ctx: CanvasRenderingContext2D, damage: 0|1|2|3 = 0) => {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(64, 122, 16, 4, 0, 0, Math.PI * 2); ctx.fill();

    if (damage >= 3) {
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(50, 110, 10, 8);
        ctx.fillRect(68, 112, 8, 6);
        ctx.fillStyle = '#8a5a2a';
        ctx.fillRect(56, 115, 12, 5);
        return;
    }

    ctx.fillStyle = damage >= 2 ? '#5a3a1a' : '#6b4423';
    ctx.fillRect(54, 30, 20, 90);

    const faces = damage === 0 ? 3 : damage === 1 ? 2 : 1;
    for (let i = 0; i < faces; i++) {
        const y = 38 + i * 28;
        ctx.fillStyle = '#8a6a3a';
        ctx.fillRect(52, y, 24, 24);
        ctx.fillStyle = '#ff4444';
        ctx.beginPath(); ctx.arc(59, y + 8, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(69, y + 8, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a1a0a';
        ctx.fillRect(57, y + 15, 14, 5);
        ctx.fillStyle = '#ffffff';
        for (let t = 0; t < 3; t++) {
            ctx.fillRect(59 + t * 4, y + 15, 2, 3);
        }
    }

    ctx.fillStyle = '#2d8a2d';
    ctx.beginPath();
    ctx.ellipse(64, 28, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (damage >= 1) {
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(58, 50); ctx.lineTo(62, 70); ctx.lineTo(60, 90);
        ctx.stroke();
    }
};

export const createTotemTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(128, 128);
    drawTotem(ctx, 0);
    return createTexture(canvas);
};
export const createTotemDamagedTexture = (level: 1|2|3): THREE.Texture => {
    const { canvas, ctx } = validContext(128, 128);
    drawTotem(ctx, level);
    return createTexture(canvas);
};

export const createJungleFloorTexture = (): THREE.Texture => {
    const { canvas, ctx } = validContext(512, 512);
    ctx.fillStyle = '#1a3a0a';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 150; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const s = Math.random() * 20 + 8;
        ctx.fillStyle = Math.random() > 0.5 ? '#2a4a12' : '#122a06';
        ctx.beginPath();
        ctx.ellipse(x, y, s, s * 0.7, Math.random(), 0, Math.PI * 2);
        ctx.fill();
    }

    const leafColors = ['#3a6b1a', '#2d5a14', '#4a7a2d', '#1a3a08'];
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillStyle = leafColors[Math.floor(Math.random() * leafColors.length)];
        ctx.beginPath();
        ctx.ellipse(x, y, 4, 2, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.strokeStyle = '#3a2a10';
    ctx.lineWidth = 2;
    for (let i = 0; i < 30; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 40, y + Math.random() * 20, x + (Math.random() - 0.5) * 60, y + Math.random() * 30);
        ctx.stroke();
    }

    for (let i = 0; i < 15; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillStyle = '#8a3a1a';
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#cc6a3a';
        ctx.beginPath(); ctx.arc(x, y - 2, 4, Math.PI, 0); ctx.fill();
    }

    return createTexture(canvas);
};
