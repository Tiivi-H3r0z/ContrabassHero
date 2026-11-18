import type { Action } from '../../types';

// Shared state written by the on-screen touch controls and read by Input.poll().
export const touch = {
  active: false,
  mx: 0,
  my: 0,
  held: new Set<Action>(),
  pending: new Set<Action>(),
  pause: false,
  press(a: Action) { this.pending.add(a); this.held.add(a); this.active = true; },
  release(a: Action) { this.held.delete(a); },
  consume() { const p = this.pending; this.pending = new Set(); return p; },
};

export const isTouchDevice = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || new URLSearchParams(location.search).has('touch'));
