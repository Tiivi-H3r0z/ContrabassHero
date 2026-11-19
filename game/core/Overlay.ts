import * as THREE from 'three';

interface Pop { el: HTMLDivElement; pos: THREE.Vector3; vel: THREE.Vector3; life: number; max: number; scale: number; active: boolean; rot: number }
export interface Bubble {
  el: HTMLDivElement;
  txt: HTMLSpanElement;
  follow: () => THREE.Vector3 | null;
  life: number;
  active: boolean;
  full: string;
  shown: number;
  speed: number;
  cut: boolean;
  id: number;
}

type PopKind = 'dmg' | 'crit' | 'out' | 'heal' | 'block' | 'score' | 'big' | 'sfx' | 'beat' | 'goth';

const splatImage = (seed: number) => {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  let s = seed * 9301 + 49297;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  ctx.fillStyle = '#01060a';
  ctx.beginPath(); ctx.arc(128, 128, 54 + rnd() * 16, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 20; i++) {
    const a = rnd() * Math.PI * 2, d = 60 + rnd() * 60, r = 4 + rnd() * 14;
    ctx.lineWidth = r; ctx.strokeStyle = '#01060a'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(128 + Math.cos(a) * d, 128 + Math.sin(a) * d); ctx.stroke();
    ctx.beginPath(); ctx.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, r * 0.9, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 5; i++) {
    const x = 90 + rnd() * 76;
    ctx.lineWidth = 6 + rnd() * 8;
    ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x, 190 + rnd() * 60); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(140,200,230,.35)';
  ctx.beginPath(); ctx.ellipse(105, 102, 18, 9, -0.6, 0, Math.PI * 2); ctx.fill();
  return c.toDataURL();
};

// DOM layer projected over the canvas: damage numbers, speech bubbles, ink on the lens.
export class Overlay {
  root: HTMLDivElement;
  private pops: Pop[] = [];
  private bubbles: Bubble[] = [];
  private v = new THREE.Vector3();
  private nextId = 1;
  private splats: string[] = [];

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'g-overlay';
    container.appendChild(this.root);
    for (let i = 0; i < 48; i++) {
      const el = document.createElement('div');
      el.className = 'g-pop';
      el.style.display = 'none';
      this.root.appendChild(el);
      this.pops.push({ el, pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, max: 1, scale: 1, active: false, rot: 0 });
    }
    for (let i = 0; i < 6; i++) {
      const el = document.createElement('div');
      el.className = 'g-bubble';
      el.style.display = 'none';
      const txt = document.createElement('span');
      el.appendChild(txt);
      this.root.appendChild(el);
      this.bubbles.push({ el, txt, follow: () => null, life: 0, active: false, full: '', shown: 0, speed: 30, cut: false, id: 0 });
    }
    for (let i = 0; i < 4; i++) this.splats.push(splatImage(i + 1));
  }

  pop(text: string, pos: THREE.Vector3, kind: PopKind = 'dmg') {
    let p = this.pops.find((x) => !x.active);
    if (!p) p = this.pops.reduce((a, b) => (a.life > b.life ? a : b));
    p.active = true;
    p.el.textContent = text;
    p.el.className = 'g-pop g-pop-' + kind;
    p.el.style.display = '';
    p.pos.copy(pos);
    p.vel.set((Math.random() - 0.5) * 3, kind === 'out' ? 3 : 6, 0);
    p.life = 0;
    p.max = kind === 'big' || kind === 'goth' ? 1.4 : kind === 'out' || kind === 'sfx' ? 0.9 : 0.85;
    p.scale = kind === 'crit' || kind === 'big' || kind === 'goth' ? 1.25 : 1;
    p.rot = kind === 'crit' ? -8 + Math.random() * 4 : kind === 'sfx' ? (Math.random() - 0.5) * 24 : (Math.random() - 0.5) * 6;
  }

  // Typewriter speech bubble. Returns a handle id (0 if no slot) usable with cut().
  bubble(text: string, follow: () => THREE.Vector3 | null, seconds = 2.2, kind: 'enemy' | 'boss' | 'hero' | 'ouch' = 'enemy', speed = 34): number {
    const b = this.bubbles.find((x) => !x.active);
    if (!b) return 0;
    b.active = true;
    b.follow = follow;
    b.full = text;
    b.shown = 0;
    b.speed = speed;
    b.cut = false;
    b.life = seconds + text.length / speed;
    b.id = this.nextId++;
    b.txt.textContent = '';
    b.el.className = 'g-bubble g-bubble-' + kind;
    b.el.style.display = '';
    return b.id;
  }

  // The speaker got smashed mid-sentence: freeze the text, add a dash and a SPLOTCH stamp.
  cut(id: number, stamp = 'SPLOTCH'): boolean {
    const b = this.bubbles.find((x) => x.active && x.id === id);
    if (!b || b.cut) return false;
    b.cut = true;
    const n = Math.max(Math.floor(b.shown), Math.ceil(b.full.replace(/…$/, "").length * 0.6));
    b.txt.textContent = b.full.replace(/…$/, '').slice(0, n).trimEnd() + '—';
    b.el.classList.add('cut');
    b.el.dataset.stamp = stamp;
    b.life = 0.9;
    const pos = b.follow();
    if (pos) { const fixed = pos.clone(); b.follow = () => fixed; }
    return true;
  }

  isActive(id: number) { return this.bubbles.some((b) => b.active && b.id === id); }
  activeBubbles() { return this.bubbles.filter((b) => b.active).length; }

  // Ink splashed on the camera lens: slams in, drips down, fades.
  screenSplat(strength = 1) {
    const el = document.createElement('div');
    el.className = 'g-lens';
    const W = this.root.clientWidth, H = this.root.clientHeight;
    const size = (180 + Math.random() * 220) * strength;
    const side = Math.random();
    const x = side < 0.5 ? (Math.random() < 0.5 ? -size * 0.25 : W - size * 0.75) : Math.random() * Math.max(1, W - size);
    const y = side < 0.5 ? Math.random() * Math.max(1, H - size) : (Math.random() < 0.5 ? -size * 0.25 : H - size * 0.75);
    const rot = `rotate(${Math.floor(Math.random() * 360)}deg)`;
    el.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background-image:url(${this.splats[Math.floor(Math.random() * this.splats.length)]})`;
    this.root.appendChild(el);
    el.animate([
      { opacity: 0, transform: `${rot} scale(1.6)` },
      { opacity: 0.92, transform: `${rot} scale(1)`, offset: 0.04 },
      { opacity: 0.85, transform: `translateY(0px) ${rot} scale(1)`, offset: 0.35 },
      { opacity: 0, transform: `translateY(40px) ${rot} scale(1.04)` },
    ], { duration: 2600, easing: 'ease-in' }).onfinish = () => el.remove();
  }

  update(dt: number, camera: THREE.Camera, w: number, h: number) {
    for (const p of this.pops) {
      if (!p.active) continue;
      p.life += dt;
      p.pos.addScaledVector(p.vel, dt);
      p.vel.y -= 9 * dt;
      if (p.life >= p.max) { p.active = false; p.el.style.display = 'none'; continue; }
      this.v.copy(p.pos).project(camera);
      const x = (this.v.x + 1) / 2 * w, y = (1 - this.v.y) / 2 * h;
      const k = p.life < 0.1 ? 1.8 - p.life * 8 : 1;
      const o = p.life > p.max - 0.25 ? (p.max - p.life) / 0.25 : 1;
      p.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${p.rot}deg) scale(${k * p.scale})`;
      p.el.style.opacity = String(o);
    }
    for (const b of this.bubbles) {
      if (!b.active) continue;
      b.life -= dt;
      const pos = b.follow();
      if (b.life <= 0 || !pos) { b.active = false; b.el.style.display = 'none'; continue; }
      if (!b.cut && b.shown < b.full.length) {
        b.shown = Math.min(b.full.length, b.shown + dt * b.speed);
        b.txt.textContent = b.full.slice(0, Math.floor(b.shown));
      }
      this.v.copy(pos).project(camera);
      const bw = b.el.offsetWidth || 200, bh = b.el.offsetHeight || 40;
      let x = (this.v.x + 1) / 2 * w, y = (1 - this.v.y) / 2 * h;
      x = Math.min(w - bw / 2 - 10, Math.max(bw / 2 + 10, x));
      y = Math.min(h - 20, Math.max(bh + 70, y));
      b.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`;
      b.el.style.opacity = b.life < 0.2 ? String(b.life / 0.2) : '1';
    }
  }

  clearBubbles() { this.bubbles.forEach((b) => { b.active = false; b.el.style.display = 'none'; }); }

  dispose() { this.root.remove(); }
}
