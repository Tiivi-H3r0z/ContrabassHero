import * as THREE from 'three';
import { ARENA_RADIUS } from './defs';
import { fbm2, rng } from './util';

const SIZE = 1024;
const S = SIZE / (ARENA_RADIUS * 2); // px per world unit
const C = SIZE / 2;

type Ctx = CanvasRenderingContext2D;
type Rand = () => number;

const canvas = () => {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  return c;
};

// Soft noise layer: computed at low res, upscaled with smoothing.
const noiseLayer = (ctx: Ctx, a: string, b: string, scale: number, alpha = 1, seed = 0, oct = 3, contrast = 1) => {
  const n = 192;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const x = c.getContext('2d')!;
  const img = x.createImageData(n, n);
  const ca = new THREE.Color(a), cb = new THREE.Color(b);
  const tmp = new THREE.Color();
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let v = fbm2(i / n * scale + seed * 13.1, j / n * scale - seed * 7.7, oct);
    v = Math.min(1, Math.max(0, (v - 0.5) * 2 * contrast + 0.5));
    tmp.copy(ca).lerp(cb, v);
    const o = (j * n + i) * 4;
    img.data[o] = tmp.r * 255; img.data[o + 1] = tmp.g * 255; img.data[o + 2] = tmp.b * 255; img.data[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(c, 0, 0, SIZE, SIZE);
  ctx.restore();
};

const w2p = (v: number) => C + v * S;
const dist = (x: number, y: number) => Math.hypot(x - C, y - C) / S;

// Random point on the floor (world units), optionally avoiding the readable center.
const spot = (r: Rand, minR = 0, maxR = ARENA_RADIUS - 0.5) => {
  const a = r() * Math.PI * 2;
  const d = Math.sqrt(minR * minR + r() * (maxR * maxR - minR * minR));
  return [w2p(Math.cos(a) * d), w2p(Math.sin(a) * d)] as const;
};

const blob = (ctx: Ctx, x: number, y: number, rx: number, ry: number, rot: number, fill: string) => {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
};

const glowDot = (ctx: Ctx, x: number, y: number, r: number, color: string, core = '#ffffff') => {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, core);
  g.addColorStop(0.35, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
};

const wobblyLine = (ctx: Ctx, r: Rand, x: number, y: number, len: number, ang: number, steps: number, jitter: number) => {
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i < steps; i++) {
    ang += (r() - 0.5) * jitter;
    x += Math.cos(ang) * len / steps;
    y += Math.sin(ang) * len / steps;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
};

// Distance guides: soft rings every 7 units + an edge warning band, center kept clean.
const guides = (ctx: Ctx, em: Ctx, neon: string, lineCol: string) => {
  ctx.save();
  ctx.strokeStyle = lineCol;
  ctx.lineWidth = 3;
  for (const rr of [7, 14, 21]) { ctx.beginPath(); ctx.arc(C, C, rr * S, 0, Math.PI * 2); ctx.stroke(); }
  // Edge darkening
  const g = ctx.createRadialGradient(C, C, (ARENA_RADIUS - 4) * S, C, C, ARENA_RADIUS * S);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.restore();

  em.save();
  em.globalAlpha = 0.22;
  em.strokeStyle = neon;
  em.lineWidth = 2;
  for (const rr of [7, 14, 21]) { em.beginPath(); em.arc(C, C, rr * S, 0, Math.PI * 2); em.stroke(); }
  em.globalAlpha = 0.5;
  em.lineWidth = 4;
  em.setLineDash([18, 14]);
  em.beginPath(); em.arc(C, C, (ARENA_RADIUS - 1.3) * S, 0, Math.PI * 2); em.stroke();
  em.restore();
};

// Fade busy detail toward a flat tone in the very center.
const calmCenter = (ctx: Ctx, color: string, radius = 5, alpha = 0.55) => {
  const c = new THREE.Color(color);
  const rgb = `${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0}`;
  const g = ctx.createRadialGradient(C, C, 0, C, C, radius * S);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
};

const school = (ctx: Ctx, em: Ctx, r: Rand) => {
  const t = 2 * S;
  const off = C % t;
  for (let y = -1; y < SIZE / t + 1; y++) for (let x = -1; x < SIZE / t + 1; x++) {
    const dark = (x + y) & 1;
    const v = (r() - 0.5) * 6;
    ctx.fillStyle = dark ? `rgb(${26 + v},${28 + v},${50 + v})` : `rgb(${50 + v},${54 + v},${84 + v})`;
    ctx.fillRect(off + x * t, off + y * t, t, t);
  }
  ctx.strokeStyle = 'rgba(10,12,30,0.55)';
  ctx.lineWidth = 1.5;
  for (let i = -1; i < SIZE / t + 1; i++) {
    ctx.beginPath(); ctx.moveTo(off + i * t, 0); ctx.lineTo(off + i * t, SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, off + i * t); ctx.lineTo(SIZE, off + i * t); ctx.stroke();
  }
  noiseLayer(ctx, '#000000', '#8090ff', 6, 0.08, 1);
  // Reflections of the corridor tubes: long soft bands
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const y = SIZE * (0.12 + i * 0.19);
    const g = ctx.createLinearGradient(0, y - 22, 0, y + 22);
    g.addColorStop(0, 'rgba(120,170,255,0)');
    g.addColorStop(0.5, 'rgba(120,170,255,0.07)');
    g.addColorStop(1, 'rgba(120,170,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 22, SIZE, 44);
  }
  ctx.restore();
  // Scuffs
  ctx.strokeStyle = 'rgba(8,8,20,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 70; i++) {
    const [x, y] = spot(r, 5);
    ctx.beginPath(); ctx.arc(x, y, 6 + r() * 16, r() * 6, r() * 6 + 0.8 + r()); ctx.stroke();
  }
  // Chalk / paper bits
  for (let i = 0; i < 26; i++) {
    const [x, y] = spot(r, 6);
    ctx.save(); ctx.translate(x, y); ctx.rotate(r() * 6);
    ctx.fillStyle = 'rgba(200,210,240,0.35)'; ctx.fillRect(-6, -4, 12, 8);
    ctx.restore();
  }
  calmCenter(ctx, '#2c3058', 4, 0.25);
};

const mountain = (ctx: Ctx, em: Ctx, r: Rand) => {
  noiseLayer(ctx, '#3c5274', '#5e7898', 7, 1, 2, 4, 1.4);
  noiseLayer(ctx, '#34486a', '#6c84a6', 22, 0.25, 5);
  // Wind streaks
  ctx.strokeStyle = 'rgba(200,225,255,0.10)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 120; i++) {
    const [x, y] = spot(r, 4);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 20, y - 6, x + 40 + r() * 30, y - 4); ctx.stroke();
  }
  // Ice patches with cracks
  for (let i = 0; i < 12; i++) {
    const [x, y] = spot(r, 7, 25);
    const rx = 30 + r() * 50, ry = 18 + r() * 30, rot = r() * 3;
    blob(ctx, x, y, rx, ry, rot, 'rgba(40,80,130,0.6)');
    blob(ctx, x - rx * 0.2, y - ry * 0.25, rx * 0.5, ry * 0.25, rot, 'rgba(170,220,255,0.25)');
    ctx.strokeStyle = 'rgba(170,220,255,0.4)';
    em.strokeStyle = '#9ff3ff';
    ctx.lineWidth = 1.5; em.lineWidth = 1.5;
    for (let k = 0; k < 4; k++) {
      const a = r() * 6, l = rx * (0.4 + r() * 0.6);
      const seed = r() * 1000;
      const r1 = rng(seed), r2 = rng(seed);
      wobblyLine(ctx, r1, x, y, l, a, 5, 1.2);
      em.globalAlpha = 0.3;
      wobblyLine(em, r2, x, y, l, a, 5, 1.2);
      em.globalAlpha = 1;
    }
  }
  // Snow pebbles
  for (let i = 0; i < 200; i++) {
    const [x, y] = spot(r, 5);
    blob(ctx, x, y, 2 + r() * 4, 1.5 + r() * 3, 0, r() > 0.5 ? 'rgba(220,235,255,0.35)' : 'rgba(40,60,100,0.25)');
  }
  calmCenter(ctx, '#4c6486', 5, 0.4);
};

const garden = (ctx: Ctx, em: Ctx, r: Rand) => {
  noiseLayer(ctx, '#2c1a40', '#4e3270', 9, 1, 3, 4, 1.3);
  noiseLayer(ctx, '#20122e', '#5a3a80', 30, 0.35, 8);
  // Moss tufts
  for (let i = 0; i < 900; i++) {
    const [x, y] = spot(r, 3);
    blob(ctx, x, y, 2 + r() * 5, 2 + r() * 4, r() * 3, r() > 0.5 ? 'rgba(110,70,160,0.35)' : 'rgba(20,8,36,0.35)');
  }
  // Stepping stones
  let a = r() * 6;
  for (let i = 0; i < 16; i++) {
    const d = 6 + i * 1.3;
    a += 0.25;
    const x = w2p(Math.cos(a) * d), y = w2p(Math.sin(a) * d);
    blob(ctx, x + 2, y + 3, 22, 15, a, 'rgba(10,4,20,0.6)');
    blob(ctx, x, y, 22, 15, a, '#5a4e70');
    blob(ctx, x - 5, y - 4, 12, 7, a, 'rgba(160,150,190,0.35)');
  }
  // Fairy rings of glowing dots
  for (let i = 0; i < 7; i++) {
    const [x, y] = spot(r, 8, 25);
    const rad = 20 + r() * 30;
    const c = r() > 0.5 ? '#6ffcff' : '#ff8af0';
    const n = 9 + ((r() * 6) | 0);
    for (let k = 0; k < n; k++) {
      const aa = (k / n) * Math.PI * 2 + r() * 0.3;
      const px = x + Math.cos(aa) * rad, py = y + Math.sin(aa) * rad;
      blob(ctx, px, py, 4, 4, 0, c);
      glowDot(em, px, py, 8, c);
    }
  }
  // Glowing spore specks
  for (let i = 0; i < 90; i++) {
    const [x, y] = spot(r, 6);
    const c = r() > 0.5 ? '#c070ff' : '#6ffcff';
    blob(ctx, x, y, 1.5, 1.5, 0, c);
    em.globalAlpha = 0.6; glowDot(em, x, y, 4, c, c); em.globalAlpha = 1;
  }
  calmCenter(ctx, '#3a2452', 5, 0.35);
};

const potager = (ctx: Ctx, em: Ctx, r: Rand) => {
  noiseLayer(ctx, '#1e150f', '#3a2a1e', 8, 1, 4, 4, 1.2);
  // Furrows along x, every 3 units
  const step = 3 * S;
  for (let y = C % step - step; y < SIZE + step; y += step) {
    const g = ctx.createLinearGradient(0, y - step / 2, 0, y + step / 2);
    g.addColorStop(0, 'rgba(70,52,38,0.0)');
    g.addColorStop(0.3, 'rgba(74,54,38,0.5)');
    g.addColorStop(0.5, 'rgba(14,9,6,0.7)');
    g.addColorStop(0.7, 'rgba(84,62,44,0.45)');
    g.addColorStop(1, 'rgba(70,52,38,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - step / 2, SIZE, step);
  }
  // Clods
  for (let i = 0; i < 700; i++) {
    const [x, y] = spot(r, 3);
    blob(ctx, x, y, 1.5 + r() * 3.5, 1.5 + r() * 2.5, r() * 3, r() > 0.5 ? 'rgba(90,66,48,0.5)' : 'rgba(10,6,4,0.45)');
  }
  // Sprouts on ridges
  ctx.lineWidth = 2.5;
  for (let y = C % step - step * 0.2; y < SIZE; y += step) {
    for (let x = r() * 30; x < SIZE; x += 26 + r() * 30) {
      if (dist(x, y) < 5 || r() < 0.3) continue;
      ctx.strokeStyle = r() > 0.85 ? '#7cbf3a' : '#3f6a2a';
      ctx.beginPath(); ctx.moveTo(x - 5, y - 7); ctx.lineTo(x, y); ctx.lineTo(x + 5, y - 8); ctx.stroke();
    }
  }
  // Radioactive puddles
  for (let i = 0; i < 9; i++) {
    const [x, y] = spot(r, 8, 25);
    const rx = 14 + r() * 26, ry = 10 + r() * 14, rot = r() * 3;
    blob(ctx, x, y, rx, ry, rot, '#2c5a16');
    blob(ctx, x, y, rx * 0.75, ry * 0.7, rot, '#3f7a18');
    em.save();
    em.globalAlpha = 0.85;
    blob(em, x, y, rx * 0.7, ry * 0.65, rot, '#1c4a08');
    glowDot(em, x - rx * 0.2, y - ry * 0.1, Math.min(rx, ry) * 0.45, '#5ac81e', '#a8ff6a');
    em.restore();
  }
  for (let i = 0; i < 60; i++) {
    const [x, y] = spot(r, 6);
    blob(ctx, x, y, 1.5, 1.5, 0, '#9cff4a');
    em.globalAlpha = 0.5; glowDot(em, x, y, 4, '#7cff2e', '#7cff2e'); em.globalAlpha = 1;
  }
  calmCenter(ctx, '#2a1e16', 5, 0.45);
};

const desert = (ctx: Ctx, em: Ctx, r: Rand) => {
  noiseLayer(ctx, '#7c3a62', '#b2608a', 5, 1, 6, 4, 1.2);
  // Dune ripples
  for (let i = 0; i < 70; i++) {
    const y0 = r() * SIZE, x0 = r() * SIZE;
    const len = 80 + r() * 200, amp = 6 + r() * 10;
    for (const [dy, c] of [[0, 'rgba(84,30,70,0.45)'], [-3, 'rgba(230,140,180,0.3)']] as const) {
      ctx.strokeStyle = c;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k <= 20; k++) {
        const x = x0 + (k / 20) * len;
        const y = y0 + dy + Math.sin(k / 20 * Math.PI * 2 + i) * amp;
        if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }
  // Synthwave grid (faint in albedo, softly emissive)
  const step = 4 * S;
  ctx.strokeStyle = 'rgba(255,120,210,0.12)';
  ctx.lineWidth = 2;
  em.strokeStyle = '#ff5fc8';
  em.lineWidth = 2;
  em.globalAlpha = 0.28;
  for (let v = C % step; v < SIZE; v += step) {
    for (const c of [ctx, em]) {
      c.beginPath(); c.moveTo(v, 0); c.lineTo(v, SIZE); c.stroke();
      c.beginPath(); c.moveTo(0, v); c.lineTo(SIZE, v); c.stroke();
    }
  }
  em.globalAlpha = 1;
  // Pebbles
  for (let i = 0; i < 260; i++) {
    const [x, y] = spot(r, 4);
    blob(ctx, x, y, 2 + r() * 3, 1.5 + r() * 2, r() * 3, r() > 0.5 ? 'rgba(60,20,50,0.45)' : 'rgba(240,170,200,0.35)');
  }
  calmCenter(ctx, '#985078', 5, 0.4);
};

const volcano = (ctx: Ctx, em: Ctx, r: Rand) => {
  noiseLayer(ctx, '#1a1419', '#382d36', 10, 1, 7, 4, 1.3);
  // Voronoi plates (jittered grid), cracks where F2 - F1 is small.
  const n = 512, cell = 64;
  const g = n / cell;
  const seeds: number[] = [];
  for (let j = 0; j < g; j++) for (let i = 0; i < g; i++) seeds.push((i + 0.15 + r() * 0.7) * cell, (j + 0.15 + r() * 0.7) * cell);
  const glowMask: number[] = [];
  for (let k = 0; k < g * g; k++) glowMask.push(r());
  const cc = document.createElement('canvas'); cc.width = cc.height = n;
  const ce = document.createElement('canvas'); ce.width = ce.height = n;
  const xc = cc.getContext('2d')!, xe = ce.getContext('2d')!;
  const ic = xc.createImageData(n, n), ie = xe.createImageData(n, n);
  const hot = new THREE.Color('#fff4c0'), mid = new THREE.Color('#ffd34d'), mag = new THREE.Color('#ff3d8b');
  const t = new THREE.Color();
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
    let f1 = 1e9, f2 = 1e9, i1 = 0, i2 = 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const gx = cx + ox, gy = cy + oy;
      if (gx < 0 || gy < 0 || gx >= g || gy >= g) continue;
      const k = gy * g + gx;
      const d = Math.hypot(seeds[k * 2] - x, seeds[k * 2 + 1] - y);
      if (d < f1) { f2 = f1; i2 = i1; f1 = d; i1 = k; } else if (d < f2) { f2 = d; i2 = k; }
    }
    const e = f2 - f1;
    const o = (y * n + x) * 4;
    const glowing = (glowMask[i1] + glowMask[i2]) % 1 < 0.4;
    const wx = (x / n - 0.5) * 2 * ARENA_RADIUS, wy = (y / n - 0.5) * 2 * ARENA_RADIUS;
    const center = Math.hypot(wx, wy) < 4.5;
    // plate shading: lighter near the plate center, darker toward cracks
    const shade = Math.min(1, e / 22);
    ic.data[o] = 255; ic.data[o + 1] = 255; ic.data[o + 2] = 255;
    ic.data[o + 3] = e < 1.6 ? 255 : (1 - shade) * 70;
    if (e < 1.6) { ic.data[o] = 6; ic.data[o + 1] = 4; ic.data[o + 2] = 6; }
    else { ic.data[o] = 0; ic.data[o + 1] = 0; ic.data[o + 2] = 0; }
    if (glowing && !center && e < 2.6) {
      const k = e / 2.6;
      if (k < 0.25) t.copy(hot); else if (k < 0.55) t.copy(hot).lerp(mid, (k - 0.25) / 0.3); else t.copy(mid).lerp(mag, (k - 0.55) / 0.45);
      const a = (k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45) * (k < 0.25 ? 1 : 0.55);
      ie.data[o] = t.r * 255; ie.data[o + 1] = t.g * 255; ie.data[o + 2] = t.b * 255; ie.data[o + 3] = a * 255;
    }
  }
  xc.putImageData(ic, 0, 0);
  xe.putImageData(ie, 0, 0);
  ctx.drawImage(cc, 0, 0, SIZE, SIZE);
  em.drawImage(ce, 0, 0, SIZE, SIZE);
  // Ash specks
  for (let i = 0; i < 300; i++) {
    const [x, y] = spot(r, 3);
    blob(ctx, x, y, 1 + r() * 2.5, 1 + r() * 2, 0, r() > 0.5 ? 'rgba(90,70,90,0.4)' : 'rgba(0,0,0,0.4)');
  }
  // Warm glow pools around cracks (albedo tint, cheap fake bounce)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.05;
  ctx.drawImage(ce, 0, 0, SIZE, SIZE);
  ctx.restore();
};

const jungle = (ctx: Ctx, em: Ctx, r: Rand) => {
  noiseLayer(ctx, '#0e2418', '#1f4229', 8, 1, 9, 4, 1.3);
  // Roots
  for (let i = 0; i < 18; i++) {
    const [x, y] = spot(r, 6);
    const a = r() * 6, l = 80 + r() * 180, seed = r() * 999;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(8,6,4,0.6)'; ctx.lineWidth = 11; wobblyLine(ctx, rng(seed), x + 3, y + 3, l, a, 8, 0.7);
    ctx.strokeStyle = '#2e2418'; ctx.lineWidth = 8; wobblyLine(ctx, rng(seed), x, y, l, a, 8, 0.7);
    ctx.strokeStyle = 'rgba(120,100,70,0.35)'; ctx.lineWidth = 2; wobblyLine(ctx, rng(seed), x - 2, y - 2, l, a, 8, 0.7);
    em.strokeStyle = '#00ffa3'; em.lineWidth = 2; em.globalAlpha = 0.35; em.setLineDash([3, 18]);
    wobblyLine(em, rng(seed), x, y, l, a, 8, 0.7);
    em.setLineDash([]); em.globalAlpha = 1;
  }
  // Leaf litter
  const greens = ['#1c4a2c', '#0f2a1a', '#2a5a30', '#173a24', '#30603a'];
  for (let i = 0; i < 1100; i++) {
    const [x, y] = spot(r, 2.5);
    blob(ctx, x, y, 3 + r() * 6, 1.5 + r() * 2.5, r() * 3, greens[(r() * greens.length) | 0]);
  }
  // Bioluminescent clusters
  for (let i = 0; i < 16; i++) {
    const [x, y] = spot(r, 7, 26);
    const n = 4 + ((r() * 8) | 0);
    for (let k = 0; k < n; k++) {
      const px = x + (r() - 0.5) * 40, py = y + (r() - 0.5) * 40, s = 2 + r() * 3;
      const c = r() > 0.3 ? '#00ffa3' : '#5fe8ff';
      blob(ctx, px, py, s, s, 0, c);
      glowDot(em, px, py, s * 2.2, c, c);
    }
  }
  calmCenter(ctx, '#173a24', 5, 0.4);
};

const PAINTERS = [school, mountain, potager, desert, volcano, garden, jungle];
const LINES = ['rgba(150,170,255,0.10)', 'rgba(230,245,255,0.16)', 'rgba(140,200,90,0.10)', 'rgba(255,180,220,0.14)', 'rgba(255,210,120,0.07)', 'rgba(220,170,255,0.10)', 'rgba(120,255,190,0.09)'];

export interface FloorTextures { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture; intensity: number }

export const paintFloor = (stage: number, neon: string): FloorTextures => {
  const i = Math.min(6, Math.max(0, stage - 1));
  const mc = canvas(), ec = canvas();
  const ctx = mc.getContext('2d')!, em = ec.getContext('2d')!;
  em.fillStyle = '#000000';
  em.fillRect(0, 0, SIZE, SIZE);
  const r = rng(1000 + stage * 77);
  PAINTERS[i](ctx, em, r);
  guides(ctx, em, neon, LINES[i]);
  const make = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  };
  return { map: make(mc), emissive: make(ec), intensity: stage === 5 ? 1.7 : 1.6 };
};
