export const clamp01 = (k: number) => (k < 0 ? 0 : k > 1 ? 1 : k);
export const inQuad = (k: number) => { k = clamp01(k); return k * k; };
export const outQuad = (k: number) => { k = clamp01(k); return 1 - (1 - k) * (1 - k); };
export const inOutQuad = (k: number) => { k = clamp01(k); return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; };
export const outBack = (k: number, s = 2.2) => { k = clamp01(k) - 1; return 1 + (s + 1) * k * k * k + s * k * k; };

// Cartoon strike curve: anticipation (ease-out quad back), snap (ease-in quad), overshoot then settle.
// Returns ~ -antic during windup, 1 at impact time `at`, wobbling around 1 afterwards.
export const strikeCurve = (t: number, at: number, dur: number, antic = 0.25, over = 0.14) => {
  const a = at * 0.6;
  if (t < a) return -antic * outQuad(t / a);
  if (t < at) return -antic + (1 + antic) * inQuad((t - a) / (at - a));
  const r = clamp01((t - at) / Math.max(0.001, dur - at));
  return 1 + over * Math.sin(r * Math.PI * 2.5) * (1 - r);
};

// Damped spring used for squash (+) & stretch (-). Underdamped on purpose: cartoon wobble.
export class Squash {
  v = 0;
  x = 0;
  constructor(public k = 260, public d = 13) {}
  hit(impulse: number) { this.v += impulse; }
  set(x: number) { this.x = x; }
  update(dt: number) {
    this.v += (-this.k * this.x - this.d * this.v) * dt;
    this.x += this.v * dt;
    if (this.x > 0.6) { this.x = 0.6; this.v = 0; }
    if (this.x < -0.6) { this.x = -0.6; this.v = 0; }
  }
  // volume-preserving-ish scale: y shrinks on squash, xz grows
  get sy() { return 1 - this.x; }
  get sxz() { return 1 + this.x * 0.55; }
}
