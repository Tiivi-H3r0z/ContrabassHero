
import React, { useState, useCallback, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { UIOverlay } from './components/UIOverlay';
import { GameStateStatus, CharacterType, GameSettings } from './types';
import { CONSTANTS } from './constants';
import { setMasterVolume } from './services/audioService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameStateStatus>(GameStateStatus.MENU);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [stage, setStage] = useState(1); // 1 = School, 2 = Mountain
  const [playerHealth, setPlayerHealth] = useState(100);
  const [killCount, setKillCount] = useState(0);
  const [showBossIntro, setShowBossIntro] = useState(false);
  const [character, setCharacter] = useState<CharacterType>('armand');
  
  // Special Power Animation State
  const [specialPowerName, setSpecialPowerName] = useState("");
  const [showSpecialAnim, setShowSpecialAnim] = useState(false);
  
  // Settings
  const [settings, setSettings] = useState<GameSettings>(CONSTANTS.DEFAULT_SETTINGS);
  
  // Debug / State Logic
  const [spawnThreshold, setSpawnThreshold] = useState(CONSTANTS.BOSS.SPAWN_KILLS);
  const [isDebugMode, setIsDebugMode] = useState(false);
  
  // Force remount of GameCanvas to reset WebGL context cleanly on new game
  const [gameId, setGameId] = useState(0);

  const startGame = useCallback((selectedChar: CharacterType) => {
    setScore(0);
    setWave(1);
    setStage(1);
    setPlayerHealth(100);
    setKillCount(0);
    setShowBossIntro(false);
    setCharacter(selectedChar);
    setGameState(GameStateStatus.PLAYING);
    setGameId(prev => prev + 1); // FORCE NEW GAME INSTANCE
    
    // Reset debug state
    setSpawnThreshold(CONSTANTS.BOSS.SPAWN_KILLS);
    setIsDebugMode(false);
  }, []);

  // Restart uses current character
  const restartGame = useCallback(() => {
    startGame(character);
  }, [character, startGame]);

  const handleGameOver = useCallback(() => {
    setGameState(GameStateStatus.GAME_OVER);
    setShowBossIntro(false);
  }, []);

  const handleBossEnter = useCallback(() => {
    setShowBossIntro(true);
    setTimeout(() => setShowBossIntro(false), 3500);
  }, []);

  const handleSpecialUsed = useCallback((name: string) => {
      setSpecialPowerName(name);
      setShowSpecialAnim(true);
      setTimeout(() => setShowSpecialAnim(false), 2000);
  }, []);
  
  const handleDebug = useCallback(() => {
      setSpawnThreshold(1);
      setIsDebugMode(true);
  }, []);

  const updateSettings = useCallback((newSettings: GameSettings) => {
      setSettings(newSettings);
      setMasterVolume(newSettings.volume);
  }, []);

  // Keyboard shortcut for Test Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === 't' && gameState === GameStateStatus.PLAYING) {
            handleDebug();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDebug, gameState]);

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      {gameState !== GameStateStatus.MENU && (
        <GameCanvas 
          key={gameId} // Unmount/Remount on restart
          gameState={gameState} 
          character={character}
          stage={stage}
          spawnThreshold={spawnThreshold}
          isDebugMode={isDebugMode}
          settings={settings}
          setScore={setScore}
          setWave={setWave}
          setStage={setStage}
          setPlayerHealth={setPlayerHealth}
          setKillCount={setKillCount}
          onGameOver={handleGameOver}
          onBossEnter={handleBossEnter}
          onSpecialUsed={handleSpecialUsed}
        />
      )}
      
      <UIOverlay 
        gameState={gameState}
        score={score}
        wave={wave}
        stage={stage}
        playerHealth={playerHealth}
        killCount={killCount}
        showBossIntro={showBossIntro}
        specialPowerName={specialPowerName}
        showSpecialAnim={showSpecialAnim}
        spawnThreshold={spawnThreshold}
        isDebugMode={isDebugMode}
        settings={settings}
        onStart={startGame}
        onRestart={restartGame}
        onDebug={handleDebug}
        onUpdateSettings={updateSettings}
      />
    </div>
  );
};

export default App;
