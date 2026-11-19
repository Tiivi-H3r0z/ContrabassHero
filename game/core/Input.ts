import type { Action, KeyBindings } from '../../types';
import { touch } from './touch';

export const DEFAULT_KEYS: KeyBindings = {
  up: ['w', 'z', 'arrowup'],
  down: ['s', 'arrowdown'],
  left: ['a', 'q', 'arrowleft'],
  right: ['d', 'arrowright'],
  attack: [' ', 'j'],
  heavy: ['f', 'k'],
  dash: ['shift', 'l'],
  jump: ['c', 'i'],
  special: ['e', 'o'],
};

// Gamepad standard mapping: A=0 B=1 X=2 Y=3 LB=4 RB=5 LT=6 RT=7 Start=9
const PAD: Partial<Record<Action, number[]>> = {
  jump: [0],
  dash: [1, 4],
  attack: [2],
  heavy: [3],
  special: [5, 7],
};

const ACTIONS: Action[] = ['up', 'down', 'left', 'right', 'attack', 'heavy', 'dash', 'jump', 'special'];

export const normKey = (k: string) => (k === 'Spacebar' ? ' ' : k.toLowerCase());

export class Input {
  keys: KeyBindings;
  private down = new Set<string>();
  private pending = new Set<string>();
  private pressedKeys = new Set<string>();
  // performance.now() of each key press, for rhythm judgement finer than the 60 Hz tick
  private pendingAt = new Map<string, number>();
  private pressedAt = new Map<string, number>();
  private padPrev: boolean[] = [];
  private padNow: boolean[] = [];
  private touchPressed = new Set<Action>();
  moveX = 0;
  moveY = 0;
  usingPad = false;
  pausePressed = false;
  private pendingPause = false;

  constructor(keys: KeyBindings) {
    this.keys = keys;
    window.addEventListener('keydown', this.onDown);
    window.addEventListener('keyup', this.onUp);
    window.addEventListener('blur', this.onBlur);
  }

  private onDown = (e: KeyboardEvent) => {
    const k = normKey(e.key);
    if (k === 'escape' || k === 'p') { this.pendingPause = true; return; }
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (!e.repeat) { this.pending.add(k); if (!this.pendingAt.has(k)) this.pendingAt.set(k, e.timeStamp || performance.now()); }
    this.down.add(k);
    this.usingPad = false;
  };
  private onUp = (e: KeyboardEvent) => { this.down.delete(normKey(e.key)); };
  private onBlur = () => { this.down.clear(); };

  // Call once per fixed tick.
  poll() {
    this.pressedKeys = this.pending;
    this.pressedAt = this.pendingAt;
    this.pendingAt = new Map();
    this.touchPressed = touch.consume();
    if (touch.pause) { touch.pause = false; this.pendingPause = true; }
    this.pending = new Set();
    this.pausePressed = this.pendingPause;
    this.pendingPause = false;

    this.padPrev = this.padNow;
    this.padNow = [];
    let px = 0, py = 0;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      p.buttons.forEach((b, i) => { this.padNow[i] = this.padNow[i] || b.pressed; });
      const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0;
      if (Math.hypot(ax, ay) > 0.22) { px = ax; py = -ay; }
      if (p.buttons[12]?.pressed) py = 1;
      if (p.buttons[13]?.pressed) py = -1;
      if (p.buttons[14]?.pressed) px = -1;
      if (p.buttons[15]?.pressed) px = 1;
      if (this.padNow.some(Boolean) || px || py) this.usingPad = true;
      if (p.buttons[9]?.pressed && !this.padPrev[9]) this.pausePressed = true;
      break;
    }
    let kx = 0, ky = 0;
    if (this.heldKey('left')) kx -= 1;
    if (this.heldKey('right')) kx += 1;
    if (this.heldKey('up')) ky += 1;
    if (this.heldKey('down')) ky -= 1;
    if (touch.active && (touch.mx || touch.my)) { this.moveX = touch.mx; this.moveY = touch.my; }
    else if (px || py) { this.moveX = px; this.moveY = py; }
    else { const l = Math.hypot(kx, ky) || 1; this.moveX = kx / l; this.moveY = ky / l; }
  }

  simulate(mx: number, my: number, acts: Action[]) {
    this.moveX = mx; this.moveY = my;
    acts.forEach((a) => this.pressedKeys.add(this.keys[a][0]));
  }

  private heldKey(a: Action) { return this.keys[a].some((k) => this.down.has(k)); }

  held(a: Action) {
    if (this.heldKey(a) || touch.held.has(a)) return true;
    return (PAD[a] ?? []).some((i) => this.padNow[i]);
  }

  pressed(a: Action) {
    if (this.touchPressed.has(a)) return true;
    if (this.keys[a].some((k) => this.pressedKeys.has(k))) return true;
    return (PAD[a] ?? []).some((i) => this.padNow[i] && !this.padPrev[i]);
  }

  // When the action was pressed this tick (key event time), now for pads / touch.
  pressTime(a: Action) {
    let t = Infinity;
    for (const k of this.keys[a]) { const v = this.pressedAt.get(k); if (v !== undefined && v < t) t = v; }
    return t === Infinity ? performance.now() : t;
  }

  anyConfirm() {
    return this.pressed('attack') || this.pressed('jump') || this.pressedKeys.has('enter');
  }

  rumble(strong: number, weak: number, ms: number) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      const act = (p as (Gamepad & { vibrationActuator?: { playEffect?: (t: string, o: object) => Promise<unknown> } }) | null)?.vibrationActuator;
      if (act?.playEffect) act.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
    }
  }

  static actions = ACTIONS;

  dispose() {
    window.removeEventListener('keydown', this.onDown);
    window.removeEventListener('keyup', this.onUp);
    window.removeEventListener('blur', this.onBlur);
  }
}
