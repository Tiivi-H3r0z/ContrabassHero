import { useEffect, useRef } from 'react';
import { audio } from '../game/audio/audio';

interface NavOpts {
  count: number;
  index: number;
  setIndex: (i: number) => void;
  onConfirm: (i: number) => void;
  onBack?: () => void;
  onLeft?: (i: number) => boolean | void;
  onRight?: (i: number) => boolean | void;
  axis?: 'v' | 'h';
  enabled?: boolean;
}

// Keyboard + gamepad menu navigation. onLeft/onRight returning true means "handled" (e.g. slider).
export const useMenuNav = (o: NavOpts) => {
  const ref = useRef(o);
  ref.current = o;

  useEffect(() => {
    if (o.enabled === false) return;
    const move = (d: number) => {
      const c = ref.current;
      if (c.count <= 0) return;
      c.setIndex((c.index + d + c.count) % c.count);
      audio.play('uiMove');
    };
    const side = (d: number) => {
      const c = ref.current;
      const fn = d < 0 ? c.onLeft : c.onRight;
      if (fn && fn(c.index)) return;
      if (c.axis === 'h') move(d);
    };
    const vert = (d: number) => { if (ref.current.axis !== 'h') move(d); };
    const confirm = () => { audio.play('uiSelect'); ref.current.onConfirm(ref.current.index); };
    const back = () => { if (ref.current.onBack) { audio.play('uiBack'); ref.current.onBack(); } };

    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'w', 'z'].includes(k)) { e.preventDefault(); vert(-1); }
      else if (['arrowdown', 's'].includes(k)) { e.preventDefault(); vert(1); }
      else if (['arrowleft', 'a', 'q'].includes(k)) { e.preventDefault(); side(-1); }
      else if (['arrowright', 'd'].includes(k)) { e.preventDefault(); side(1); }
      else if (k === 'enter' || k === ' ' || k === 'j') { e.preventDefault(); confirm(); }
      else if (k === 'escape' || k === 'backspace') { e.preventDefault(); back(); }
    };
    window.addEventListener('keydown', onKey);

    let raf = 0;
    let prev: boolean[] = [];
    let repeatT = 0;
    let lastDir = '';
    let last = performance.now();
    const poll = (now: number) => {
      raf = requestAnimationFrame(poll);
      const dt = (now - last) / 1000;
      last = now;
      const p = navigator.getGamepads ? Array.from(navigator.getGamepads()).find(Boolean) : null;
      if (!p) return;
      const btn = p.buttons.map((b) => b.pressed);
      const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0;
      const dir = btn[12] || ay < -0.6 ? 'u' : btn[13] || ay > 0.6 ? 'd' : btn[14] || ax < -0.6 ? 'l' : btn[15] || ax > 0.6 ? 'r' : '';
      if (dir && (dir !== lastDir || (repeatT -= dt) <= 0)) {
        repeatT = dir !== lastDir ? 0.38 : 0.11;
        if (dir === 'u') vert(-1); else if (dir === 'd') vert(1); else if (dir === 'l') side(-1); else side(1);
      }
      lastDir = dir;
      if (btn[0] && !prev[0]) confirm();
      if (btn[1] && !prev[1]) back();
      if (btn[9] && !prev[9]) back();
      prev = btn;
    };
    raf = requestAnimationFrame(poll);
    return () => { window.removeEventListener('keydown', onKey); cancelAnimationFrame(raf); };
  }, [o.enabled]);
};
