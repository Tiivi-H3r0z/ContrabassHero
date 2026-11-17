import { BibleDemo } from './bible-demo';
import { getPortraits } from '../game/portraits';
import { audio, Sfx } from '../game/audio/audio';
import { bach, BACH_TRACKS, BachTrackId } from '../game/audio/bach';
import { NUANCES } from '../game/palette';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const INK = '#01060a', BONE = '#e8fbff', POWER = '#00ffd5', COMBO = '#ff3d8b', DANGER = '#ff5a1a', REWARD = '#ffc21a';

// ---------- sound gate ----------
let soundOn = false;
const enableSound = () => {
  if (soundOn) return;
  soundOn = true;
  audio.init();
  audio.setVolumes({ master: 0.8, music: 0.5, sfx: 0.9 });
  bach.init();
  bach.setVolume(0.85);
  $('#soundToggle').textContent = 'SON ACTIVÉ';
};
$('#soundToggle').addEventListener('click', enableSound);

// ---------- hero demo ----------
const demoHost = $('#demo');
const flashEl = $('#flash');
const cmbN = $('#cmbN'), cmbD = $('#cmbD');
const popLayer = document.createElement('div');
popLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;overflow:hidden';
demoHost.appendChild(popLayer);
let lastPop = 0;
const pop = (text: string, x: number, y: number, kind: 'sfx' | 'out' | 'goth') => {
  const now = performance.now();
  if (kind === 'sfx' && now - lastPop < 120) return;
  lastPop = now;
  const el = document.createElement('div');
  el.className = 'pop ' + kind;
  el.textContent = text;
  popLayer.appendChild(el);
  const rot = (Math.random() - 0.5) * 16;
  el.animate([
    { transform: `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${rot}deg) scale(2)`, opacity: 1 },
    { transform: `translate(${x}px,${y - 30}px) translate(-50%,-50%) rotate(${rot}deg) scale(1)`, opacity: 1, offset: 0.15 },
    { transform: `translate(${x}px,${y - 70}px) translate(-50%,-50%) rotate(${rot}deg) scale(.9)`, opacity: 0 },
  ], { duration: kind === 'goth' ? 1300 : 800, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => el.remove();
};
let demo: BibleDemo | null = null;
try {
  demo = new BibleDemo(demoHost, {
    pop,
    combo: (n) => {
      cmbN.textContent = String(n);
      cmbN.classList.remove('bump'); void cmbN.offsetWidth; cmbN.classList.add('bump');
      const lvl = n >= 120 ? 6 : n >= 80 ? 5 : n >= 50 ? 4 : n >= 35 ? 3 : n >= 20 ? 2 : n >= 10 ? 1 : 0;
      cmbD.textContent = lvl === 6 ? 'CARNAGE' : NUANCES[lvl];
      cmbD.style.fontFamily = lvl === 6 ? 'var(--f-goth)' : '';
      cmbD.style.color = lvl === 6 ? COMBO : '';
      if (bach.isPlaying()) bach.setIntensity(Math.max(+intensity.value, lvl));
      if (n > 160) demo?.resetCombo();
    },
    flash: () => flashEl.animate([{ opacity: 0.55 }, { opacity: 0 }], { duration: 160 }),
  });
} catch {
  demoHost.insertAdjacentHTML('beforeend', '<p class="hero-cap" style="left:18px;right:auto">WebGL indisponible</p>');
}

// ---------- portraits ----------
setTimeout(() => {
  const portraits = getPortraits();
  document.querySelectorAll<HTMLElement>('[data-portrait]').forEach((el) => {
    const src = portraits[el.dataset.portrait!];
    if (src) el.innerHTML = `<img src="${src}" alt="">`;
  });
  document.querySelectorAll<HTMLImageElement>('img[data-portrait-img]').forEach((img) => {
    const src = portraits[img.dataset.portraitImg!];
    if (src) img.src = src; else img.remove();
  });
}, 200);

// ---------- ink splats ----------
const splat = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color = INK) => {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2, d = r * (0.9 + Math.random() * 1.1), rr = r * (0.08 + Math.random() * 0.25);
    ctx.lineWidth = rr * 0.9; ctx.strokeStyle = color; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr, 0, Math.PI * 2); ctx.fill();
    if (Math.random() < 0.5) { const d2 = d * (1.2 + Math.random() * 0.4); ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d2, cy + Math.sin(a) * d2, rr * 0.5, 0, Math.PI * 2); ctx.fill(); }
  }
};
{
  const c = $<HTMLCanvasElement>('#drop');
  const ctx = c.getContext('2d')!;
  splat(ctx, 120, 120, 52);
  ctx.fillStyle = 'rgba(232,251,255,.35)';
  ctx.beginPath(); ctx.ellipse(100, 98, 14, 8, -0.6, 0, Math.PI * 2); ctx.fill();
  const box = $('#splatBox');
  const cv = document.createElement('canvas');
  cv.width = 600; cv.height = 300;
  const cx = cv.getContext('2d')!;
  for (let i = 0; i < 5; i++) splat(cx, 60 + Math.random() * 480, 50 + Math.random() * 200, 18 + Math.random() * 30);
  box.style.backgroundImage = `url(${cv.toDataURL()})`;
  box.style.backgroundSize = 'cover';
}

{
  const hc = document.querySelector<HTMLCanvasElement>('.hsplat');
  if (hc) {
    hc.width = 640; hc.height = 360;
    const c2 = hc.getContext('2d')!;
    c2.globalAlpha = 0.85;
    splat(c2, 180, 250, 34); splat(c2, 330, 300, 22); splat(c2, 260, 180, 14);
  }
}

// ---------- kill loops (2D) ----------
interface TOpts { sx?: number; sy?: number; rot?: number; inflate?: number; tint?: string; sink?: number; alpha?: number }
const teacher = (ctx: CanvasRenderingContext2D, x: number, y: number, o: TOpts = {}) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.rot ?? 0);
  ctx.scale(o.sx ?? 1, o.sy ?? 1);
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
  const suit = o.tint ?? '#6b6a75';
  ctx.fillStyle = suit;
  ctx.beginPath(); ctx.roundRect(-14, -34, 28, 34, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#7a2a2a'; ctx.fillRect(-2, -30, 4, 16);
  const hr = 13 * (1 + (o.inflate ?? 0));
  ctx.fillStyle = o.tint ? o.tint : '#d9cfc0';
  ctx.beginPath(); ctx.arc(0, -34 - hr + 2, hr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = DANGER;
  ctx.beginPath(); ctx.arc(-5, -34 - hr + 1, 2.4, 0, Math.PI * 2); ctx.arc(5, -34 - hr + 1, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-9, -34 - hr - 4); ctx.lineTo(-2, -34 - hr - 1); ctx.moveTo(9, -34 - hr - 4); ctx.lineTo(2, -34 - hr - 1); ctx.stroke();
  ctx.restore();
};
const ground = (ctx: CanvasRenderingContext2D, w: number, gy: number) => {
  ctx.strokeStyle = '#0e3346'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
};
const word = (ctx: CanvasRenderingContext2D, txt: string, x: number, y: number, color: string, size = 26, rot = -0.12) => {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.font = `${size}px "Luckiest Guy", Impact, sans-serif`;
  ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.strokeText(txt, 0, 0); ctx.fillStyle = color; ctx.fillText(txt, 0, 0);
  ctx.restore();
};
const notes = (ctx: CanvasRenderingContext2D, x: number, y: number, k: number, n: number, color = POWER) => {
  ctx.save(); ctx.font = '22px serif'; ctx.fillStyle = color; ctx.textAlign = 'center';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3;
    ctx.globalAlpha = 1 - k;
    ctx.fillText(i % 2 ? '♪' : '♫', x + Math.cos(a) * k * 70, y + Math.sin(a) * k * 50 - k * 20);
  }
  ctx.restore();
};
const shards = (ctx: CanvasRenderingContext2D, x: number, y: number, k: number, n: number) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + i;
    const px = x + Math.cos(a) * k * (50 + (i % 3) * 18), py = y + Math.sin(a) * k * 40 + k * k * 60;
    ctx.fillStyle = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? INK : BONE;
    ctx.save(); ctx.translate(px, py); ctx.rotate(k * 8 + i); ctx.fillRect(-4, -3, 8, 6); ctx.restore();
  }
};
const bass = (ctx: CanvasRenderingContext2D, x: number, y: number, rot: number) => {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = '#b5541c'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, -18, 15, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3a1a0c'; ctx.fillRect(-3, -70, 6, 40); ctx.strokeRect(-3, -70, 6, 40);
  ctx.strokeStyle = POWER; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -68); ctx.lineTo(0, -4); ctx.stroke();
  ctx.restore();
};
const KILLS: Record<string, (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void> = {
  out: (ctx, w, h, t) => {
    const gy = h - 26; ground(ctx, w * 0.62, gy);
    ctx.fillStyle = COMBO; ctx.globalAlpha = 0.25; ctx.fillRect(w * 0.62, gy, w, 3); ctx.globalAlpha = 1;
    if (t < 0.35) { teacher(ctx, w * 0.4, gy, { sy: 1 - Math.abs(Math.sin(t * 30)) * 0.05 }); bass(ctx, w * 0.2, gy - 4, -1.2 + t * 2); }
    else {
      const k = (t - 0.35) / 1.6;
      bass(ctx, w * 0.2, gy - 4, -0.5);
      teacher(ctx, w * 0.4 + k * w * 0.55, gy - Math.sin(Math.min(1, k * 1.4) * Math.PI) * 50 + Math.max(0, k - 0.6) * 160, { rot: k * 14, sx: 1 - k * 0.4, sy: 1 + 0.2 - k * 0.6 });
      if (k < 0.7) word(ctx, 'OUT !', w * 0.62, 34, COMBO);
    }
  },
  pop: (ctx, w, h, t) => {
    const gy = h - 26; ground(ctx, w, gy);
    if (t < 0.9) teacher(ctx, w / 2, gy, { inflate: inQ(t / 0.9) * 1.1, sy: 1 + Math.sin(t * 40) * 0.03 * t });
    else {
      const k = Math.min(1, (t - 0.9) / 0.8);
      ctx.save(); ctx.globalAlpha = 0.9; ctx.translate(w / 2, gy + 2); ctx.scale(1, 0.3); splat(ctx, 0, 0, 34 + k * 8); ctx.restore();
      shards(ctx, w / 2, gy - 50, k, 12); notes(ctx, w / 2, gy - 50, k, 6);
      if (k < 0.8) word(ctx, 'SPLOTCH', w / 2, 36, BONE);
    }
  },
  flat: (ctx, w, h, t) => {
    const gy = h - 26; ground(ctx, w, gy);
    const hit = 0.55;
    if (t < hit) { teacher(ctx, w / 2, gy); bass(ctx, w / 2 + 6, gy - 120 + inQ(t / hit) * 60, 0); }
    else {
      const k = t - hit;
      ctx.save(); ctx.translate(w / 2, gy + 1); ctx.scale(1, 0.25); splat(ctx, 0, 0, 40); ctx.restore();
      teacher(ctx, w / 2, gy, { sy: 0.12 + Math.max(0, 0.12 - k) , sx: 1.9 });
      ctx.fillStyle = '#7a2a2a'; ctx.save(); ctx.translate(w / 2 + 30, gy - 4); ctx.rotate(-0.4 + Math.sin(k * 12) * 0.2); ctx.fillRect(0, -3, 22, 6); ctx.restore();
      bass(ctx, w / 2 + 6, gy - 60 - outQ(k * 2) * 20, 0);
      if (k < 1) word(ctx, 'FLATCH', w / 2, 34, REWARD);
    }
  },
  juggle: (ctx, w, h, t) => {
    const gy = h - 26; ground(ctx, w, gy);
    if (t < 1.4) {
      const b = (t % 0.35) / 0.35;
      const y = gy - 30 - Math.sin(b * Math.PI) * 50 - t * 20;
      teacher(ctx, w / 2, y, { rot: t * 6, sy: 1 + (b < 0.15 ? -0.2 : 0.1) });
      if (b < 0.2) word(ctx, 'PAF', w / 2 + 40, y - 30, BONE, 20);
    } else {
      const k = Math.min(1, (t - 1.4) / 0.8);
      notes(ctx, w / 2, gy - 90, k, 10, POWER); shards(ctx, w / 2, gy - 90, k, 8);
    }
  },
  stake: (ctx, w, h, t) => {
    const gy = h - 30;
    const sink = Math.min(1, outQ(t / 0.5));
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, gy); ctx.clip();
    if (t < 1.6) teacher(ctx, w / 2, gy + sink * 34, {});
    ctx.restore();
    ground(ctx, w, gy);
    if (t < 0.5) bass(ctx, w / 2 + 4, gy - 110 + t * 60, 0);
    if (t > 1.2 && t < 1.6) word(ctx, '…', w / 2 + 34, gy - 46, BONE, 22);
    if (t >= 1.6) { const k = Math.min(1, (t - 1.6) / 0.6); shards(ctx, w / 2, gy - 14, k, 10); notes(ctx, w / 2, gy - 14, k, 5); if (k < 0.8) word(ctx, 'TOC', w / 2, 34, REWARD); }
  },
  gas: (ctx, w, h, t) => {
    const gy = h - 26; ground(ctx, w, gy);
    const k = Math.min(1, t / 1.4);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(166,255,0,${0.25 + 0.1 * (i % 2)})`;
      ctx.beginPath(); ctx.arc(w / 2 + Math.cos(i + t * 2) * 40, gy - 50 + Math.sin(i * 2 + t * 3) * 20, 18 + i * 2, 0, Math.PI * 2); ctx.fill();
    }
    if (t < 1.4) teacher(ctx, w / 2, gy, { tint: k > 0.3 ? '#8fbf3a' : undefined, inflate: Math.sin(k * Math.PI) * 0.6 });
    else { notes(ctx, w / 2, gy - 50, Math.min(1, (t - 1.4) / 0.7), 4, '#a6ff00'); word(ctx, 'PFFRRT', w / 2, 34, '#a6ff00'); }
  },
};
function inQ(k: number) { k = Math.max(0, Math.min(1, k)); return k * k; }
function outQ(k: number) { k = Math.max(0, Math.min(1, k)); return 1 - (1 - k) * (1 - k); }
const killCanvases = Array.from(document.querySelectorAll<HTMLCanvasElement>('canvas[data-kill]'));
killCanvases.forEach((c) => { c.width = 360; c.height = 170; });
const t0 = performance.now();
const killLoop = (now: number) => {
  requestAnimationFrame(killLoop);
  const t = ((now - t0) / 1000) % 2.6;
  for (const c of killCanvases) {
    const r = c.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) continue;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.save();
    ctx.scale(1.5, 1.5);
    KILLS[c.dataset.kill!]?.(ctx, c.width / 1.5, c.height / 1.5, t);
    ctx.restore();
  }
};
requestAnimationFrame(killLoop);

// ---------- music deck ----------
const intensity = $<HTMLInputElement>('#intensity');
const lvlSpans = Array.from(document.querySelectorAll('#lvls span'));
const showLvl = () => lvlSpans.forEach((s, i) => s.classList.toggle('on', i === +intensity.value));
showLvl();
intensity.addEventListener('input', () => { showLvl(); bach.setIntensity(+intensity.value); });

const tracksEl = $('#tracks');
const nowEl = $('#nowPlaying');
const beatEl = $('#beat');
const renderTracks = () => {
  const cur = bach.current();
  tracksEl.innerHTML = BACH_TRACKS.map((tr) => `
    <button class="track ${cur === tr.id ? 'on' : ''}" data-id="${tr.id}" type="button">
      <span class="pl">${cur === tr.id ? '■' : '▶'}</span>
      <span><span class="tt">${tr.title}</span><br><span class="st">${tr.subtitle}</span></span>
      <span class="meta"><b>${tr.bpm}</b>BPM · ${tr.bwv.startsWith('BWV') ? tr.bwv : 'BWV ' + tr.bwv}</span>
    </button>`).join('');
};
const playTrack = (id: BachTrackId) => {
  enableSound();
  if (bach.current() === id && bach.isPlaying()) {
    bach.stop(0.6);
    if (demo) demo.externalBeat = false;
    nowEl.textContent = 'Silence.';
  } else {
    bach.play(id, +intensity.value);
    if (demo) demo.externalBeat = true;
    nowEl.textContent = BACH_TRACKS.find((t) => t.id === id)?.title ?? '';
  }
  renderTracks();
};
tracksEl.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
  if (b) playTrack(b.dataset.id as BachTrackId);
});
renderTracks();
$('#heroPlay').addEventListener('click', () => {
  intensity.value = '4'; showLvl();
  playTrack('toccata');
  $('#heroPlay').classList.toggle('on', bach.isPlaying());
});
bach.onBeat((beat, bar) => {
  beatEl.textContent = `MESURE ${bar + 1} · TEMPS ${(beat % 4) + 1}`;
  const lvl = +intensity.value;
  if (demo && (lvl >= 4 || beat % 2 === 0)) demo.attack();
});

const stings: [string, Parameters<typeof bach.sting>[0]][] = [['Finale', 'finale'], ['Boss', 'boss'], ['Mort', 'death'], ['Carnage', 'carnage']];
$('#stings').innerHTML = stings.map(([l, k]) => `<button class="chipbtn" data-sting="${k}" type="button">${l}</button>`).join('');
$('#stings').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-sting]');
  if (!b) return;
  enableSound();
  bach.sting(b.dataset.sting as Parameters<typeof bach.sting>[0]);
});

const SFX: [string, Sfx][] = [
  ['Coup', 'hit'], ['Coup lourd', 'hitHeavy'], ['Critique', 'crit'], ['Smash', 'smash'], ['Éjection', 'out'], ['Corde qui casse', 'stringSnap'],
  ['Prof éclaté', 'teacherDie'], ['Explosion', 'explosion'], ['Toupie', 'special_armand'], ['Lion', 'special_adrien'], ['Gaz', 'special_eliot'],
  ['Chat', 'special_swan'], ['Clavecin', 'special_pierre'], ['Alarme nucléaire', 'nukeAlarm'], ['Poule', 'special_audrey'], ['Boss', 'bossRoar'], ['Sirène', 'eventSiren'],
];
$('#sfx').innerHTML = SFX.map(([l, k]) => `<button class="chipbtn" data-sfx="${k}" type="button">${l}</button>`).join('');
$('#sfx').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-sfx]');
  if (!b) return;
  enableSound();
  audio.play(b.dataset.sfx as Sfx);
});

// ---------- scope ----------
const scope = $<HTMLCanvasElement>('#scope');
const sctx = scope.getContext('2d')!;
let buf: Uint8Array<ArrayBuffer> | null = null;
let fbuf: Uint8Array<ArrayBuffer> | null = null;
const drawScope = () => {
  requestAnimationFrame(drawScope);
  const r = scope.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return;
  const W = (scope.width = Math.floor(r.width * Math.min(2, devicePixelRatio)));
  const H = (scope.height = Math.floor(r.height * Math.min(2, devicePixelRatio)));
  sctx.fillStyle = INK;
  sctx.fillRect(0, 0, W, H);
  const an = bach.analyser();
  if (!an) {
    sctx.strokeStyle = 'rgba(0,255,213,.25)'; sctx.lineWidth = 2;
    sctx.beginPath(); sctx.moveTo(0, H / 2); sctx.lineTo(W, H / 2); sctx.stroke();
    return;
  }
  if (!buf || buf.length !== an.fftSize) buf = new Uint8Array(an.fftSize);
  if (!fbuf || fbuf.length !== an.frequencyBinCount) fbuf = new Uint8Array(an.frequencyBinCount);
  an.getByteFrequencyData(fbuf);
  const bars = 64;
  for (let i = 0; i < bars; i++) {
    const v = fbuf[Math.floor(Math.pow(i / bars, 1.7) * fbuf.length * 0.7)] / 255;
    const bh = v * H * 0.75;
    sctx.fillStyle = i / bars > 0.75 ? COMBO : i / bars > 0.4 ? POWER : '#0e3346';
    sctx.globalAlpha = 0.35 + v * 0.65;
    sctx.fillRect((i / bars) * W + 1, H - bh, W / bars - 3, bh);
  }
  sctx.globalAlpha = 1;
  an.getByteTimeDomainData(buf);
  sctx.lineWidth = 3 * Math.min(2, devicePixelRatio);
  sctx.strokeStyle = POWER;
  sctx.shadowColor = POWER; sctx.shadowBlur = 16;
  sctx.beginPath();
  for (let i = 0; i < buf.length; i += 2) {
    const x = (i / buf.length) * W, y = (buf[i] / 255) * H * 0.8 + H * 0.1;
    if (i === 0) sctx.moveTo(x, y); else sctx.lineTo(x, y);
  }
  sctx.stroke();
  sctx.shadowBlur = 0;
};
requestAnimationFrame(drawScope);

// ---------- screenshot helper: ?shot=<section id> shows only that section ----------
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  const st = document.createElement('style');
  st.textContent = `header.hero, main > section:not(#${shot}), footer { display: none !important; } body::after { display: none; }`;
  document.head.appendChild(st);
}
