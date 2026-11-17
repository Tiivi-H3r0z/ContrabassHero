import React, { useEffect, useRef } from 'react';
import { Game, GameCallbacks } from '../game/Game';
import type { HudStore } from '../game/core/hudStore';
import type { GameSettings, RunState } from '../types';

interface Props {
  run: RunState;
  settings: GameSettings;
  paused: boolean;
  hud: HudStore;
  callbacks: GameCallbacks;
}

export const GameView: React.FC<Props> = ({ run, settings, paused, hud, callbacks }) => {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Game | null>(null);
  const cb = useRef(callbacks);
  cb.current = callbacks;

  useEffect(() => {
    if (!host.current) return;
    const g = new Game(host.current, run, settings, hud, {
      onStageClear: (r, s) => cb.current.onStageClear(r, s),
      onGameOver: (r, s) => cb.current.onGameOver(r, s),
      onVictory: (r, s) => cb.current.onVictory(r, s),
      onPauseRequest: () => cb.current.onPauseRequest(),
    });
    game.current = g;
    (window as unknown as { __game?: Game }).__game = g;
    return () => { g.dispose(); game.current = null; };
  }, []);

  useEffect(() => { game.current?.setPaused(paused); }, [paused]);
  useEffect(() => { game.current?.updateSettings(settings); }, [settings]);

  return <div ref={host} className="game-host" />;
};
