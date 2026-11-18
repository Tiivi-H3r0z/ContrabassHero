import React, { useRef } from 'react';
import type { Action } from '../types';
import { touch } from '../game/core/touch';

// On-screen controls for phones and tablets: virtual stick + big action buttons.
export const TouchControls: React.FC = () => {
  const stick = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLElement>(null);
  const stickId = useRef<number | null>(null);

  const moveStick = (e: React.PointerEvent) => {
    const el = stick.current;
    if (!el || stickId.current !== e.pointerId) return;
    const r = el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const max = r.width * 0.42;
    const l = Math.hypot(dx, dy);
    if (l > max) { dx *= max / l; dy *= max / l; }
    touch.active = true;
    touch.mx = dx / max;
    touch.my = -dy / max;
    if (Math.hypot(touch.mx, touch.my) < 0.18) { touch.mx = 0; touch.my = 0; }
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  const endStick = (e: React.PointerEvent) => {
    if (stickId.current !== e.pointerId) return;
    stickId.current = null;
    touch.mx = 0; touch.my = 0;
    if (knob.current) knob.current.style.transform = '';
  };

  const btn = (a: Action, label: string) => (
    <div
      className={`tb ${a}`}
      onPointerDown={(e) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture(e.pointerId); touch.press(a); (e.currentTarget as HTMLElement).classList.add('on'); }}
      onPointerUp={(e) => { touch.release(a); (e.currentTarget as HTMLElement).classList.remove('on'); }}
      onPointerCancel={(e) => { touch.release(a); (e.currentTarget as HTMLElement).classList.remove('on'); }}
    >{label}</div>
  );

  return (
    <div className="touch" onContextMenu={(e) => e.preventDefault()}>
      <div
        ref={stick}
        className="stick"
        onPointerDown={(e) => { e.preventDefault(); stickId.current = e.pointerId; (e.target as HTMLElement).setPointerCapture(e.pointerId); moveStick(e); }}
        onPointerMove={moveStick}
        onPointerUp={endStick}
        onPointerCancel={endStick}
      ><i ref={knob} /></div>
      <div className="btns">
        {btn('attack', 'FRAPPE')}
        {btn('heavy', 'LOURD')}
        {btn('jump', 'SAUT')}
        {btn('dash', 'DASH')}
        {btn('special', 'POUVOIR')}
      </div>
      <button className="pause" type="button" onClick={() => { touch.pause = true; }}>PAUSE</button>
    </div>
  );
};
