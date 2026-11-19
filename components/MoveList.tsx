import React, { useState } from 'react';
import type { KeyBindings } from '../types';
import { useMenuNav } from './useMenuNav';
import { COMBOS, SPECIALS, TIERS, TIER_POWER, ComboDef, Family, Sym } from '../game/systems/groove';

// Fighting-game style move list: the rhythm motifs available in game, read from the groove engine.
const FAM: Record<Family, { name: string; col: string }> = {
  base: { name: 'Base', col: 'var(--power)' },
  eclair: { name: 'Éclair', col: 'var(--ui)' },
  colosse: { name: 'Colosse', col: 'var(--combo)' },
  virtuose: { name: 'Virtuose', col: 'var(--reward)' },
};
const SYM_COL: Record<Sym, string> = { f: 'var(--power)', F: 'var(--combo)', D: 'var(--ui)' };
const keyShort = (k: string) => (k === ' ' ? 'ESP' : k === 'shift' ? 'MAJ' : k.replace('arrow', '').toUpperCase().slice(0, 4));

const Pattern: React.FC<{ c: ComboDef; keys: KeyBindings }> = ({ c, keys }) => {
  const n = Math.max(16, c.pattern.length);
  const label: Record<Sym, string> = { f: keyShort(keys.attack[0]), F: keyShort(keys.heavy[0]), D: keyShort(keys.dash[0]) };
  return (
    <div className="ml-pat" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      {Array.from({ length: n }, (_, i) => {
        const ch = c.pattern[i % c.pattern.length];
        const on = ch !== '.';
        return <i key={i} className={i % 4 === 0 ? 'beat' : ''} style={on ? { background: SYM_COL[ch as Sym] } : undefined}>{on ? label[ch as Sym] : ''}</i>;
      })}
    </div>
  );
};

export const MoveListScreen: React.FC<{ keys: KeyBindings; onClose: () => void }> = ({ keys, onClose }) => {
  const moves = COMBOS.filter((c) => c.ingame);
  const [i, setI] = useState(0);
  useMenuNav({ count: moves.length + 1, index: i, setIndex: setI, onConfirm: (k) => { if (k === moves.length) onClose(); }, onBack: onClose });
  const m = moves[Math.min(i, moves.length - 1)];
  return (
    <div className="modal-back fadein">
      <div className="panel movelist">
        <h2 className="shout">LISTE DES COUPS</h2>
        <p className="ml-intro">Tape en rythme avec la musique : <b>frappe</b>, <b>coup fort</b> et <b>dash</b> sont des notes. Répète un motif : le jeu le reconnaît, la jauge de <b>Groove</b> monte, tu deviens plus fort. Plus tes motifs sont variés, plus ça monte. Taper à côté ne coûte rien.</p>
        <div className="ml-body">
          <ul className="ml-list">
            {moves.map((c, k) => (
              <li key={c.id} className={k === i ? 'focus' : ''} onMouseEnter={() => setI(k)} style={{ borderLeftColor: FAM[c.family].col }}>
                <b>{c.name}</b><span style={{ color: FAM[c.family].col }}>{FAM[c.family].name}</span>
              </li>
            ))}
            {Object.values(SPECIALS).filter((x) => (x as { ingame?: boolean }).ingame).map((x) => (
              <li key={x.name} className="ml-special" style={{ borderLeftColor: FAM[x.family].col }} title={x.how}><b>{x.name}</b><span>Spécial</span><em>{x.how}</em></li>
            ))}
            <li className="ml-soon">D'autres coups arrivent…</li>
          </ul>
          {m && (
            <div className="ml-detail">
              <div className="ml-fam" style={{ background: FAM[m.family].col }}>{FAM[m.family].name}</div>
              <h3 className="shout">{m.name}</h3>
              <Pattern c={m} keys={keys} />
              <div className="ml-legend">1 case = 1 double-croche · 4 cases = 1 temps · à répéter en boucle</div>
              <p><b>Effet</b>{m.effect}</p>
              <p><b>Visuel</b>{m.look}</p>
            </div>
          )}
        </div>
        <div className="ml-tiers">
          {TIERS.map((t, k) => <div key={t.name}><b>{t.name}</b><span>×{TIER_POWER[k]}</span></div>)}
        </div>
        <div className="result-actions" style={{ marginTop: 18 }}>
          <button className={`btn ${i === moves.length ? 'focus' : ''}`} onMouseEnter={() => setI(moves.length)} onClick={onClose}><span>RETOUR</span></button>
        </div>
      </div>
    </div>
  );
};
