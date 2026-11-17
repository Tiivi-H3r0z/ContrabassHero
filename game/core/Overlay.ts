import * as THREE from 'three';

interface Pop { el: HTMLDivElement; pos: THREE.Vector3; vel: THREE.Vector3; life: number; max: number; scale: number; active: boolean; rot: number }
interface Bubble { el: HTMLDivElement; follow: () => THREE.Vector3 | null; life: number; active: boolean }

// DOM layer projected over the canvas: damage numbers and speech bubbles.
export class Overlay {
  root: HTMLDivElement;
  private pops: Pop[] = [];
  private bubbles: Bubble[] = [];
  private v = new THREE.Vector3();

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
    for (let i = 0; i < 4; i++) {
      const el = document.createElement('div');
      el.className = 'g-bubble';
      el.style.display = 'none';
      this.root.appendChild(el);
      this.bubbles.push({ el, follow: () => null, life: 0, active: false });
    }
  }

  pop(text: string, pos: THREE.Vector3, kind: 'dmg' | 'crit' | 'out' | 'heal' | 'block' | 'score' | 'big' | 'sfx' | 'beat' | 'goth' = 'dmg') {
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

  bubble(text: string, follow: () => THREE.Vector3 | null, seconds = 2.2, kind: 'enemy' | 'boss' | 'hero' = 'enemy') {
    let b = this.bubbles.find((x) => !x.active);
    if (!b) return false;
    b.active = true;
    b.follow = follow;
    b.life = seconds;
    b.el.textContent = text;
    b.el.className = 'g-bubble g-bubble-' + kind;
    b.el.style.display = '';
    return true;
  }

  activeBubbles() { return this.bubbles.filter((b) => b.active).length; }

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
      this.v.copy(pos).project(camera);
      const x = (this.v.x + 1) / 2 * w, y = (1 - this.v.y) / 2 * h;
      b.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`;
      b.el.style.opacity = b.life < 0.2 ? String(b.life / 0.2) : '1';
    }
  }

  clearBubbles() { this.bubbles.forEach((b) => { b.active = false; b.el.style.display = 'none'; }); }

  dispose() { this.root.remove(); }
}
