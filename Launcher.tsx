import React, { useEffect, useRef, useState } from 'react';
import type { Root } from 'react-dom/client';
import './styles/launcher.css';

interface VersionCard {
  v: '1' | '2' | '3';
  tag: string;
  name: string;
  pitch: string;
  points: string[];
  cls: string;
  badge?: string;
}

const CARDS: VersionCard[] = [
  { v: '1', tag: 'Version 1', name: 'PIXEL', cls: 'c1', pitch: "L'original. Sprites pixel en 2,5D, une contrebasse et des profs tristes.", points: ['Sprites 2D dessinés en code', '7 stages, 7 boss', 'Le jeu de départ'] },
  { v: '2', tag: 'Version 2', name: 'NÉON', cls: 'c2', pitch: 'La refonte 3D : toon, contours encre, néons Plasma froid.', points: ['3D toon temps réel', 'Horde, combos, nuances pp → fff', '6 événements, dialogues'] },
  { v: '3', tag: 'Version 3', name: 'Carnage', cls: 'c3', badge: 'NOUVEAU', pitch: "L'ultra-violence musicale. Bach passé à la tronçonneuse.", points: ['Mises à mort et Finales', 'Rang CARNAGE, frappe sur le temps', 'Bach thrash adaptatif'] },
];

const go = (v: string) => { location.search = `?v=${v}`; };

const splat = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) => {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, d = r * (0.9 + Math.random() * 1.2), rr = r * (0.07 + Math.random() * 0.22);
    ctx.lineWidth = rr; ctx.strokeStyle = color; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr * 0.8, 0, Math.PI * 2); ctx.fill();
  }
};

const Launcher: React.FC = () => {
  const [i, setI] = useState(2);
  const [art, setArt] = useState<Record<string, string>>({});
  const bg = useRef<HTMLCanvasElement>(null);
  const idx = useRef(i);
  idx.current = i;

  useEffect(() => {
    const c = bg.current;
    if (c) {
      c.width = 1600; c.height = 900;
      const ctx = c.getContext('2d')!;
      for (let k = 0; k < 9; k++) splat(ctx, Math.random() * 1600, Math.random() * 900, 20 + Math.random() * 60, k % 3 === 0 ? 'rgba(255,61,139,.10)' : 'rgba(0,0,0,.55)');
    }
    // Real assets of each era for the card posters (loaded lazily, failures are ignored).
    (async () => {
      const out: Record<string, string> = {};
      try { const v1 = await import('./versions/v1/services/assetFactory'); out.v1 = v1.getCharacterPreview('armand'); } catch { /* ignore */ }
      try { const p = await import('./game/portraits'); const all = p.getPortraits(); out.v2 = all.armand_full; out.v3 = all.pierre_full; out.boss = all.serpent; } catch { /* ignore */ }
      setArt(out);
    })();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowleft', 'a', 'q'].includes(k)) setI((x) => (x + 2) % 3);
      else if (['arrowright', 'd'].includes(k)) setI((x) => (x + 1) % 3);
      else if (['1', '2', '3'].includes(k)) go(k);
      else if (k === 'enter' || k === ' ') { e.preventDefault(); go(CARDS[idx.current].v); }
    };
    window.addEventListener('keydown', onKey);
    let raf = 0, prev: boolean[] = [], lastDir = 0, rep = 0;
    const poll = () => {
      raf = requestAnimationFrame(poll);
      const p = navigator.getGamepads ? Array.from(navigator.getGamepads()).find(Boolean) : null;
      if (!p) return;
      const b = p.buttons.map((x) => x.pressed);
      const ax = p.axes[0] ?? 0;
      const dir = b[14] || ax < -0.6 ? -1 : b[15] || ax > 0.6 ? 1 : 0;
      if (dir && (dir !== lastDir || --rep <= 0)) { setI((x) => (x + 3 + dir) % 3); rep = 20; }
      lastDir = dir;
      if (b[0] && !prev[0]) go(CARDS[idx.current].v);
      prev = b;
    };
    raf = requestAnimationFrame(poll);
    return () => { window.removeEventListener('keydown', onKey); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="lx">
      <canvas ref={bg} className="lx-bg" aria-hidden="true" />
      <header className="lx-head">
        <span className="lx-eyebrow">Contrabass Hero</span>
        <h1 className="lx-title">Choisis ton <em>époque.</em></h1>
      </header>
      <div className="lx-cards" role="listbox" aria-label="Versions du jeu">
        {CARDS.map((c, k) => (
          <button key={c.v} role="option" aria-selected={k === i} className={`lx-card ${c.cls} ${k === i ? 'on' : ''}`} onMouseEnter={() => setI(k)} onClick={() => go(c.v)}>
            {c.badge && <span className="lx-badge">{c.badge}</span>}
            <div className="lx-poster">
              {c.v === '1' && art.v1 && <img src={art.v1} alt="" className="pix" />}
              {c.v === '2' && art.v2 && <img src={art.v2} alt="" />}
              {c.v === '3' && art.v3 && <img src={art.v3} alt="" />}
              {c.v === '3' && art.boss && <img src={art.boss} alt="" className="boss" />}
            </div>
            <div className="lx-body">
              <span className="lx-tag">{c.tag}</span>
              <span className="lx-name">{c.name}</span>
              <p>{c.pitch}</p>
              <ul>{c.points.map((p) => <li key={p}>{p}</li>)}</ul>
              <span className="lx-go">JOUER ▶</span>
            </div>
          </button>
        ))}
      </div>
      <footer className="lx-foot"><span className="kbd">◀ ▶</span> choisir · <span className="kbd">Entrée</span> / <span className="kbd">A</span> jouer · <span className="kbd">1</span> <span className="kbd">2</span> <span className="kbd">3</span> accès direct</footer>
    </div>
  );
};

export const mount = (root: Root) => root.render(<Launcher />);
