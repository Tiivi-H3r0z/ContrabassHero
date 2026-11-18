import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CharacterType, GameSettings, RunState, StageStats } from './types';
import { CHARACTERS } from './types';
import { GameView } from './components/GameView';
import { Hud } from './components/Hud';
import { OptionsScreen, PauseScreen, ResultScreen, SelectScreen, TitleScreen } from './components/Screens';
import { createHudStore } from './game/core/hudStore';
import { DEFAULT_KEYS } from './game/core/Input';
import { MenuScene } from './game/MenuScene';
import { getPortraits, Portraits } from './game/portraits';
import { audio } from './game/audio/audio';
import { DIFFICULTIES, DIFF_ORDER } from './game/difficulty';
import { TouchControls } from './components/TouchControls';
import { isTouchDevice } from './game/core/touch';
import { music } from './game/audio/music';

type Screen = 'title' | 'select' | 'playing' | 'clear' | 'gameover' | 'victory';

const DEFAULT_SETTINGS: GameSettings = { master: 0.7, music: 0.5, sfx: 0.8, shake: true, flashes: true, difficulty: 'facile', keys: DEFAULT_KEYS };

const loadSettings = (): GameSettings => {
  try {
    const raw = localStorage.getItem('contrabass-settings');
    if (raw) { const s = JSON.parse(raw); return { ...DEFAULT_SETTINGS, ...s, keys: { ...DEFAULT_KEYS, ...s.keys } }; }
  } catch { /* storage unavailable */ }
  return DEFAULT_SETTINGS;
};

const newRun = (character: CharacterType, stage = 1, lives = 8): RunState => ({ character, stage, lives, score: 0, kills: 0, maxCombo: 0, time: 0 });

const makeHud = (run: RunState) => createHudStore({
  hero: run.character, stage: run.stage, lives: run.lives, maxLives: 5, score: run.score, combo: 0, comboTimer: 0, nuance: 0, special: 0,
  kills: 0, quota: 1, bossActive: false, bossName: '', bossHp: 1, bossInvulnerable: false, banner: null, dialogue: null, cutin: null, bossIntro: null, hint: '', hurt: 0, beat: 0, finale: null, finalePrompt: false, stamp: null,
});

const params = new URLSearchParams(location.search);

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('title');
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [selected, setSelected] = useState<CharacterType>('armand');
  const [run, setRun] = useState<RunState>(() => newRun('armand'));
  const [stageStart, setStageStart] = useState<RunState>(run);
  const [stats, setStats] = useState<StageStats | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [options, setOptions] = useState(false);
  const [portraits, setPortraits] = useState<Portraits>({});
  const hud = useMemo(() => makeHud(run), [gameKey]);
  const menuHost = useRef<HTMLDivElement>(null);
  const menuScene = useRef<MenuScene | null>(null);

  useEffect(() => { setPortraits(getPortraits()); }, []);

  useEffect(() => {
    audio.setVolumes({ ...settings, music: 0 });
    music.setVolume(settings.master * settings.music);
    try { localStorage.setItem('contrabass-settings', JSON.stringify(settings)); } catch { /* ignore */ }
  }, [settings]);

  const inMenu = screen === 'title' || screen === 'select';
  useEffect(() => {
    if (!inMenu || !menuHost.current) return;
    const m = new MenuScene(menuHost.current);
    menuScene.current = m;
    return () => { m.dispose(); menuScene.current = null; };
  }, [inMenu]);
  useEffect(() => { menuScene.current?.setMode(screen === 'select' ? 'select' : 'title'); }, [screen]);
  useEffect(() => { menuScene.current?.setSelected(selected); }, [selected]);

  const startStage = useCallback((r: RunState) => {
    setRun(r);
    setStageStart(r);
    setStats(null);
    setPaused(false);
    setScreen('playing');
    setGameKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const c = params.get('char') as CharacterType | null;
    const st = parseInt(params.get('stage') ?? '', 10);
    if (c && CHARACTERS.includes(c)) { audio.init(); music.init(); startStage(newRun(c, st >= 1 && st <= 7 ? st : 1, DIFFICULTIES[settings.difficulty].lives)); }
  }, []);

  const callbacks = useMemo(() => ({
    onStageClear: (r: RunState, s: StageStats) => { setRun(r); setStats(s); setScreen('clear'); },
    onGameOver: (r: RunState, s: StageStats) => { setRun(r); setStats(s); setScreen('gameover'); },
    onVictory: (r: RunState, s: StageStats) => { setRun(r); setStats(s); setScreen('victory'); },
    onPauseRequest: () => setPaused((p) => !p),
  }), []);

  const toTitle = () => { setPaused(false); setOptions(false); setScreen('title'); music.play('menu'); };

  return (
    <div className="app">
      {inMenu && <div ref={menuHost} className="layer" />}
      {screen === 'playing' && <GameView key={gameKey} run={run} settings={settings} paused={paused || options} hud={hud} callbacks={callbacks} />}
      {screen === 'playing' && <Hud store={hud} portraits={portraits} settings={settings} />}
      {screen === 'playing' && !paused && !options && isTouchDevice() && <TouchControls />}

      {screen === 'title' && <TitleScreen enabled={!options} onPlay={() => setScreen('select')} onOptions={() => setOptions(true)} difficulty={DIFFICULTIES[settings.difficulty].label} onDifficulty={() => setSettings((s) => ({ ...s, difficulty: DIFF_ORDER[(DIFF_ORDER.indexOf(s.difficulty) + 1) % DIFF_ORDER.length] }))} />}
      {screen === 'select' && (
        <SelectScreen enabled={!options} selected={selected} setSelected={setSelected} portraits={portraits}
          onBack={() => setScreen('title')}
          onConfirm={() => { menuScene.current?.celebrate(); audio.init(); music.init(); setTimeout(() => startStage(newRun(selected, 1, DIFFICULTIES[settings.difficulty].lives)), 450); }} />
      )}
      {screen === 'playing' && paused && !options && (
        <PauseScreen enabled={!options} onResume={() => setPaused(false)} onOptions={() => setOptions(true)} onQuit={toTitle} />
      )}
      {(screen === 'clear' || screen === 'gameover' || screen === 'victory') && stats && (
        <ResultScreen kind={screen} stats={stats} run={run}
          onPrimary={() => {
            const max = DIFFICULTIES[settings.difficulty].lives;
            if (screen === 'clear') startStage({ ...run, stage: run.stage + 1, lives: Math.min(max, run.lives + 2) });
            else startStage({ ...stageStart, lives: max });
          }}
          onMenu={toTitle} />
      )}
      {options && <OptionsScreen settings={settings} onChange={setSettings} onClose={() => setOptions(false)} />}
    </div>
  );
};

export default App;
