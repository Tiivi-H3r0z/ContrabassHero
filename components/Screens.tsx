import React, { useEffect, useState } from 'react';
import type { Action, CharacterType, GameSettings, RunState, StageStats } from '../types';
import { CHARACTERS } from '../types';
import { useMenuNav } from './useMenuNav';
import { HERO_COLORS } from '../game/palette';
import { HERO_MODS } from '../game/entities/Hero';
import { SPECIAL_DESC, SPECIAL_NAMES } from '../game/entities/Specials';
import { GAME_OVER_TAUNTS, STAGE_CLEAR_LINES } from '../game/data/dialogues';
import { DEFAULT_KEYS, normKey } from '../game/core/Input';
import { audio } from '../game/audio/audio';
import { music } from '../game/audio/music';
import type { Portraits } from '../game/portraits';

const NAMES: Record<CharacterType, [string, string]> = {
  armand: ['ARMAND', 'Le bassiste'],
  adrien: ['ADRIEN', 'Le batteur'],
  eliot: ['ELIOT', 'Le guitariste'],
  swan: ['SWAN', 'Le pianiste'],
  pierre: ['PIERRE', 'Le maestro'],
  audrey: ['AUDREY', 'La soprano'],
};
export const heroName = (c: CharacterType) => NAMES[c][0];

const keyLabel = (k: string) => (k === ' ' ? 'ESPACE' : k.replace('arrow', '').toUpperCase());

const MenuButtons: React.FC<{ items: { label: string; kind?: 'sec' | 'dng'; action: () => void }[]; onBack?: () => void; enabled?: boolean }> = ({ items, onBack, enabled = true }) => {
  const [i, setI] = useState(0);
  useMenuNav({ count: items.length, index: i, setIndex: setI, onConfirm: (k) => items[k].action(), onBack, enabled });
  return (
    <div className="menu-list">
      {items.map((it, k) => (
        <button key={it.label} className={`btn ${it.kind ?? ''} ${k === i ? 'focus' : ''}`} onMouseEnter={() => setI(k)} onClick={() => { audio.play('uiSelect'); it.action(); }}>
          <span>{it.label}</span>
        </button>
      ))}
    </div>
  );
};

export const TitleScreen: React.FC<{ onPlay: () => void; onOptions: () => void; onMoves: () => void; onCalib: () => void; calibDone: boolean; enabled: boolean; difficulty: string; onDifficulty: () => void }> = ({ onPlay, onOptions, onMoves, onCalib, calibDone, enabled, difficulty, onDifficulty }) => {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (armed) return;
    const arm = () => { audio.init(); music.init(); music.play('menu'); setArmed(true); };
    const onKey = (e: KeyboardEvent) => { e.preventDefault(); arm(); };
    window.addEventListener('keydown', onKey, { once: true });
    window.addEventListener('pointerdown', arm, { once: true });
    let raf = 0;
    const poll = () => {
      raf = requestAnimationFrame(poll);
      const p = navigator.getGamepads ? Array.from(navigator.getGamepads()).find(Boolean) : null;
      if (p && p.buttons.some((b) => b.pressed)) arm();
    };
    raf = requestAnimationFrame(poll);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', arm); cancelAnimationFrame(raf); };
  }, [armed]);
  return (
    <div className="layer title fadein">
      <div className="vignette" />
      <div className="title-left">
        <h1 className="logo goth">Contrabass<small>HERO</small></h1>
        <span className="stamp">ÉDITION CARNAGE</span>
        <p className="pitch">Six gamins. Six instruments. <b>Le conservatoire va saigner de l'encre.</b></p>
        {armed ? (
          <MenuButtons enabled={enabled} items={[{ label: 'JOUER', action: onPlay }, { label: `MODE : ${difficulty}`, kind: 'sec', action: onDifficulty }, { label: calibDone ? 'CALAGE DU RYTHME' : 'CALAGE DU RYTHME · À FAIRE', kind: calibDone ? 'sec' : undefined, action: onCalib }, { label: 'LISTE DES COUPS', kind: 'sec', action: onMoves }, { label: 'OPTIONS', kind: 'sec', action: onOptions }, { label: 'VERSIONS', kind: 'sec', action: () => { location.href = location.pathname; } }]} />
        ) : (
          <div className="press">APPUIE SUR UNE TOUCHE</div>
        )}
      </div>
      <div className="title-foot label">
        <span>Clavier ou manette</span>
        <span className="kbd">ZQSD / flèches</span><span className="kbd">Espace</span> frappe
        <span className="kbd">F</span> lourd <span className="kbd">Maj</span> dash <span className="kbd">C</span> saut <span className="kbd">E</span> pouvoir
      </div>
    </div>
  );
};

export const SelectScreen: React.FC<{ selected: CharacterType; setSelected: (c: CharacterType) => void; onConfirm: () => void; onBack: () => void; portraits: Portraits; enabled: boolean }> = ({ selected, setSelected, onConfirm, onBack, portraits, enabled }) => {
  const idx = CHARACTERS.indexOf(selected);
  useMenuNav({ count: CHARACTERS.length, index: idx, setIndex: (i) => setSelected(CHARACTERS[i]), onConfirm: () => onConfirm(), onBack, axis: 'h', enabled });
  const m = HERO_MODS[selected];
  const hc = HERO_COLORS[selected];
  const stats: [string, number][] = [['Puissance', m.dmg / 1.3], ['Vitesse', m.speed / 1.15], ['Cadence', m.atk / 1.4], ['Portée', 0.45 + m.range / 1.8]];
  return (
    <div className="layer select fadein" style={{ ['--hc' as string]: hc }}>
      <h1 className="shout">CHOISIS TON MUSICIEN</h1>
      <div className="select-mid">
        <div />
        <div className="panel select-info">
          <div className="nm">{NAMES[selected][0]}</div>
          <div className="label role">{NAMES[selected][1]}</div>
          {stats.map(([n, v]) => (
            <div className="stat" key={n}><span className="label">{n}</span><div className="bar"><i style={{ width: `${Math.round(Math.min(1, v) * 100)}%` }} /></div></div>
          ))}
          <div className="sp-name">{SPECIAL_NAMES[selected]}</div>
          <div className="sp-desc">{SPECIAL_DESC[selected]}</div>
        </div>
      </div>
      <div>
        <div className="roster">
          {CHARACTERS.map((c) => (
            <button key={c} className={`chip ${c === selected ? 'on' : ''}`} style={{ ['--hc' as string]: HERO_COLORS[c] }} onClick={() => { if (c === selected) onConfirm(); else { audio.play('uiMove'); setSelected(c); } }}>
              {portraits[c] ? <img src={portraits[c]} alt="" /> : <div style={{ aspectRatio: '1' }} />}
              <span className="cn">{NAMES[c][0]}</span>
            </button>
          ))}
        </div>
        <div className="select-foot">
          <span className="label"><span className="kbd">◀ ▶</span> choisir · <span className="kbd">Entrée</span> / <span className="kbd">A</span> valider · <span className="kbd">Échap</span> retour</span>
          <button className="btn" onClick={onConfirm}><span>C'EST PARTI</span></button>
        </div>
      </div>
    </div>
  );
};

const ACTION_LABELS: Record<Action, string> = { up: 'Haut', down: 'Bas', left: 'Gauche', right: 'Droite', attack: 'Frappe', heavy: 'Coup lourd', dash: 'Dash', jump: 'Saut', special: 'Pouvoir' };

export const OptionsScreen: React.FC<{ settings: GameSettings; onChange: (s: GameSettings) => void; onClose: () => void }> = ({ settings, onChange, onClose }) => {
  const actions = Object.keys(ACTION_LABELS) as Action[];
  const rows = ['master', 'music', 'sfx', 'shake', 'flashes', 'beatFx', ...actions, 'reset', 'close'];
  const [i, setI] = useState(0);
  const [waiting, setWaiting] = useState<Action | null>(null);
  const vol = (k: 'master' | 'music' | 'sfx', d: number) => onChange({ ...settings, [k]: Math.max(0, Math.min(1, Math.round((settings[k] + d) * 20) / 20)) });
  const activate = (k: number) => {
    const r = rows[k];
    if (r === 'shake' || r === 'flashes' || r === 'beatFx') onChange({ ...settings, [r]: !settings[r] });
    else if (r === 'reset') onChange({ ...settings, keys: DEFAULT_KEYS });
    else if (r === 'close') onClose();
    else if ((actions as string[]).includes(r)) setWaiting(r as Action);
  };
  useMenuNav({
    count: rows.length, index: i, setIndex: setI, onConfirm: activate, onBack: onClose, enabled: !waiting,
    onLeft: (k) => { const r = rows[k]; if (r === 'master' || r === 'music' || r === 'sfx') { vol(r, -0.05); return true; } return false; },
    onRight: (k) => { const r = rows[k]; if (r === 'master' || r === 'music' || r === 'sfx') { vol(r, 0.05); return true; } return false; },
  });
  useEffect(() => {
    if (!waiting) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const k = normKey(e.key);
      if (k !== 'escape') onChange({ ...settings, keys: { ...settings.keys, [waiting]: [k] } });
      setTimeout(() => setWaiting(null), 50);
    };
    window.addEventListener('keydown', onKey, { capture: true, once: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [waiting]);
  const row = (k: number) => `opt-row ${i === k ? 'focus' : ''}`;
  return (
    <div className="modal-back fadein">
      <div className="panel options">
        <h2 className="shout">OPTIONS</h2>
        {(['master', 'music', 'sfx'] as const).map((k, n) => (
          <div className={row(n)} key={k} onMouseEnter={() => setI(n)}>
            <span className="label">{k === 'master' ? 'Volume général' : k === 'music' ? 'Musique' : 'Effets'}</span>
            <input type="range" min={0} max={1} step={0.05} value={settings[k]} onChange={(e) => onChange({ ...settings, [k]: parseFloat(e.target.value) })} aria-label={k} />
            <span className="val">{Math.round(settings[k] * 100)}</span>
          </div>
        ))}
        {(['shake', 'flashes', 'beatFx'] as const).map((k, n) => (
          <div className={row(3 + n)} key={k} onMouseEnter={() => setI(3 + n)}>
            <span className="label">{k === 'shake' ? 'Tremblement' : k === 'flashes' ? "Flashs d'impact" : 'Pulsation sur le kick'}</span>
            <button className={`toggle ${settings[k] ? 'on' : ''}`} onClick={() => activate(3 + n)}>{settings[k] ? 'OUI' : 'NON'}</button>
            <span />
          </div>
        ))}
        <div className="label" style={{ marginTop: 14 }}>Touches (la manette est toujours active)</div>
        <div className="keys">
          {actions.map((a, n) => (
            <button key={a} className={`keybtn ${waiting === a ? 'wait' : ''}`} style={i === 6 + n ? { borderColor: 'var(--reward)' } : undefined} onMouseEnter={() => setI(6 + n)} onClick={() => setWaiting(a)}>
              <span>{ACTION_LABELS[a]}</span>
              <span className="kbd">{waiting === a ? '…' : settings.keys[a].map(keyLabel).join(' / ')}</span>
            </button>
          ))}
        </div>
        <div className="result-actions" style={{ paddingLeft: 36, marginTop: 20 }}>
          <button className={`btn sec ${i === rows.length - 2 ? 'focus' : ''}`} onMouseEnter={() => setI(rows.length - 2)} onClick={() => activate(rows.length - 2)}><span>TOUCHES PAR DÉFAUT</span></button>
          <button className={`btn ${i === rows.length - 1 ? 'focus' : ''}`} onMouseEnter={() => setI(rows.length - 1)} onClick={onClose}><span>RETOUR</span></button>
        </div>
      </div>
    </div>
  );
};

export const PauseScreen: React.FC<{ onResume: () => void; onOptions: () => void; onMoves: () => void; onCalib: () => void; onQuit: () => void; enabled: boolean }> = ({ onResume, onOptions, onMoves, onCalib, onQuit, enabled }) => (
  <div className="modal-back fadein">
    <div className="panel" style={{ padding: '28px 40px 34px' }}>
      <h2 className="shout" style={{ fontSize: 56, margin: '0 0 20px', color: 'var(--ui)' }}>PAUSE</h2>
      <MenuButtons enabled={enabled} onBack={onResume} items={[{ label: 'REPRENDRE', action: onResume }, { label: 'LISTE DES COUPS', kind: 'sec', action: onMoves }, { label: 'CALAGE DU RYTHME', kind: 'sec', action: onCalib }, { label: 'OPTIONS', kind: 'sec', action: onOptions }, { label: 'ABANDONNER', kind: 'dng', action: onQuit }]} />
    </div>
  </div>
);

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const ResultScreen: React.FC<{ kind: 'clear' | 'gameover' | 'victory'; stats: StageStats; run: RunState; onPrimary: () => void; onMenu: () => void }> = ({ kind, stats, run, onPrimary, onMenu }) => {
  const [taunt] = useState(() => GAME_OVER_TAUNTS[Math.floor(Math.random() * GAME_OVER_TAUNTS.length)]);
  const title = kind === 'clear' ? `Stage ${stats.stage}. Massacré.` : kind === 'victory' ? 'Coda finale.' : 'Rideau.';
  const rows: [string, string][] = kind === 'victory'
    ? [['Profs renvoyés', String(run.kills)], ['Combo max', String(run.maxCombo)], ['Temps total', fmtTime(run.time)], ['Score final', run.score.toLocaleString('fr-FR')]]
    : [['Profs renvoyés', String(stats.kills)], ['Combo max', String(stats.maxCombo)], ['Temps', fmtTime(stats.time)], ['Cordes cassées', String(stats.damageTaken)], ['Score du stage', stats.score.toLocaleString('fr-FR')], ['Score total', run.score.toLocaleString('fr-FR')]];
  const remark = kind === 'clear' ? STAGE_CLEAR_LINES[stats.stage] : kind === 'gameover' ? taunt : 'Appréciation générale : insupportable. Félicitations.';
  const items = kind === 'clear'
    ? [{ label: 'CONTINUER', action: onPrimary }]
    : kind === 'gameover'
      ? [{ label: 'REJOUER LE STAGE', action: onPrimary }, { label: 'MENU', kind: 'sec' as const, action: onMenu }]
      : [{ label: 'MENU', action: onMenu }];
  return (
    <div className="result fadein">
      <div className={`panel result-card ${kind === 'gameover' ? 'gameover-card' : kind === 'victory' ? 'victory-card' : ''}`}>
        <div>
          <span className="label">{kind === 'clear' ? 'Bulletin trimestriel' : kind === 'gameover' ? 'Toutes les cordes ont cassé' : 'Bulletin de fin d\'année'}</span>
          <h2 className="goth-title">{title}</h2>
          <div className="result-rows">{rows.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}</div>
          <div className="remark">« {remark} »</div>
        </div>
        <div className="grade"><b>{kind === 'gameover' ? '0/20' : stats.grade}</b></div>
        <div className="result-actions"><MenuButtons items={items} /></div>
      </div>
    </div>
  );
};
