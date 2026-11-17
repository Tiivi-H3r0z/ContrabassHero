import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { HudStore } from '../game/core/hudStore';
import { HERO_COLORS, NUANCES, NUANCE_NAMES, PAL } from '../game/palette';
import type { Portraits } from '../game/portraits';
import { heroName } from './Screens';
import type { GameSettings } from '../types';

const speakerColor = (k: string) => (HERO_COLORS as Record<string, string>)[k] ?? PAL.danger;

export const Hud: React.FC<{ store: HudStore; portraits: Portraits; settings: GameSettings }> = ({ store, portraits, settings }) => {
  const s = useSyncExternalStore(store.subscribe, store.get);
  const hc = HERO_COLORS[s.hero];
  const [bump, setBump] = useState(0);
  const prevCombo = useRef(0);
  const prevLives = useRef(s.lives);
  const [snapIdx, setSnapIdx] = useState(-1);
  const [cutin, setCutin] = useState<typeof s.cutin>(null);
  const [intro, setIntro] = useState<typeof s.bossIntro>(null);
  const [hint, setHint] = useState(s.stage === 1);

  useEffect(() => {
    if (s.combo > prevCombo.current) setBump((b) => b + 1);
    prevCombo.current = s.combo;
  }, [s.combo]);
  useEffect(() => {
    if (s.lives < prevLives.current) setSnapIdx(s.lives);
    prevLives.current = s.lives;
  }, [s.lives]);
  useEffect(() => {
    if (!s.cutin) return;
    setCutin(s.cutin);
    const t = setTimeout(() => setCutin(null), 1300);
    return () => clearTimeout(t);
  }, [s.cutin?.id]);
  useEffect(() => {
    if (!s.bossIntro) return;
    setIntro(s.bossIntro);
    const t = setTimeout(() => setIntro(null), 2800);
    return () => clearTimeout(t);
  }, [s.bossIntro?.id]);
  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(false), 12000);
    return () => clearTimeout(t);
  }, []);

  const d = s.dialogue;
  const keyOf = (a: keyof GameSettings['keys']) => { const k = settings.keys[a][0]; return k === ' ' ? 'ESPACE' : k.toUpperCase(); };
  const ready = s.special >= 1;

  return (
    <div className={`hud ${d?.blocking ? 'cinebars' : ''}`} style={{ ['--hc' as string]: hc }}>
      {!d?.blocking && (
        <>
          <div className="hud-tl">
            <div className="hud-port">{portraits[s.hero] && <img src={portraits[s.hero]} alt="" />}</div>
            <div className="hud-col">
              <span className="hud-hint">CORDES</span>
              <div className="strings">
                {Array.from({ length: s.maxLives }).map((_, i) => (
                  <i key={i} className={`str ${i >= s.lives ? 'cut' : ''} ${i === snapIdx ? 'snap' : ''}`} />
                ))}
              </div>
              <span className={`hud-hint ${ready ? 'ready' : ''}`} style={{ marginTop: 4 }}>{ready ? `POUVOIR PRÊT · ${keyOf('special')}` : 'POUVOIR'}</span>
              <div className={`tube ${ready ? 'full' : ''}`}><i style={{ width: `${s.special * 100}%` }} /></div>
            </div>
          </div>
          <div className="hud-tr">
            <div className="hud-stage">STAGE {s.stage}</div>
            {!s.bossActive && <>
              <div className="hud-hint" style={{ marginTop: 4 }}>{s.quota - s.kills > 0 ? `${s.quota - s.kills} PROFS AVANT LE BOSS` : 'LE BOSS ARRIVE'}</div>
              <div className="hud-kills"><i style={{ width: `${(s.kills / s.quota) * 100}%` }} /></div>
            </>}
            <div className="hud-score">{s.score.toLocaleString('fr-FR')}</div>
          </div>
          <div className={`hud-combo ${s.nuance >= 5 ? 'fff' : ''} ${s.nuance >= 6 ? 'carnage' : ''}`} style={{ opacity: s.combo > 1 ? 1 : 0 }}>
            <span key={bump} className="n bump">{s.combo}</span>
            <div className="lb">COUPS</div>
            {s.nuance >= 6 ? <div className="dyn goth">Carnage<small>×8 · tempo +15 %</small></div> : <div className="dyn">{NUANCES[s.nuance]}<small>{NUANCE_NAMES[s.nuance]}</small></div>}
            <div className="decay"><i style={{ width: `${s.comboTimer * 100}%` }} /></div>
          </div>
          {s.bossActive && (
            <div className={`bossbar ${s.bossInvulnerable ? 'inv' : ''}`}>
              <div className="bn"><b>{s.bossName}</b>{s.bossInvulnerable && <span className="label">BLOQUÉ</span>}</div>
              <div className="bar"><em style={{ width: `${s.bossHp * 100}%` }} /><i style={{ width: `${s.bossHp * 100}%` }} /></div>
            </div>
          )}
          {s.banner && (
            <div key={s.banner.id} className="banner panel">
              <div className="tape" />
              <div className="in"><div><b>{s.banner.title}</b><br /><span>{s.banner.subtitle}</span></div><span className="tm">{s.banner.time}</span></div>
            </div>
          )}
          {hint && (
            <div className="pausebtn label" style={{ color: 'var(--bone)', textShadow: '2px 2px 0 var(--ink)' }}>
              <span className="kbd">{keyOf('attack')}</span> combo · <span className="kbd">{keyOf('heavy')}</span> maintenir = lourd · <span className="kbd">{keyOf('dash')}</span> dash · <span className="kbd">{keyOf('jump')}</span> saut puis frappe = smash · <span className="kbd">{keyOf('special')}</span> pouvoir · <span className="kbd">Échap</span> pause
            </div>
          )}
        </>
      )}
      {d && (
        <div className={`dialog panel ${d.side} ${d.blocking ? '' : 'bark'}`} style={{ ['--sc' as string]: speakerColor(d.portrait) }}>
          <div className="face">{portraits[d.portrait] && <img src={portraits[d.portrait]} alt="" />}</div>
          <div className="txt">
            <span className="who">{d.name}</span>
            <p>{d.text}</p>
            {d.blocking && <span className="nx">{d.full ? `▶ ${keyOf('attack')}` : ''} · {keyOf('dash')} PASSER</span>}
          </div>
        </div>
      )}
      {cutin && (
        <div className="cutin" key={cutin.id} style={{ ['--hc' as string]: HERO_COLORS[cutin.hero] }}>
          <div className="band">
            {portraits[cutin.hero + '_full'] && <img src={portraits[cutin.hero + '_full']} alt="" />}
            <b>{cutin.name}</b>
          </div>
        </div>
      )}
      {!d?.blocking && (
        <div className="metro" aria-hidden="true">
          {[0, 1, 2, 3].map((k) => <i key={k} className={s.beat % 4 === k ? 'on' : ''} />)}
        </div>
      )}
      {s.finalePrompt && !s.finale && !d?.blocking && (
        <div className="finale-prompt"><b>Finale</b><span>{keyOf('heavy')} · EXÉCUTER</span></div>
      )}
      {s.finale && (
        <div className="finale-card" key={s.finale.id} style={{ ['--hc' as string]: HERO_COLORS[s.finale.hero] }}>
          <div className="rays" />
          {portraits[s.finale.hero + '_full'] && <img src={portraits[s.finale.hero + '_full']} alt="" />}
          <div className="fc-t"><b>{s.finale.name}</b><span>{heroName(s.finale.hero)} · FINALE</span></div>
        </div>
      )}
      {intro && (
        <div className="bossintro" key={intro.id}>
          <div className="bg" />
          <div className="band" />
          {portraits[intro.boss] && <img src={portraits[intro.boss]} alt="" />}
          <div className="nm"><b>{intro.name}</b><span>{intro.title}</span></div>
        </div>
      )}
    </div>
  );
};

export { heroName };
