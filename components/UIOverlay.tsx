
import React, { useState, useEffect } from 'react';
import { GameStateStatus, CharacterType, GameSettings, KeyBindings } from '../types';
import { CONSTANTS } from '../constants';
import { initAudio } from '../services/audioService';
import { getCharacterPreview } from '../services/assetFactory';

interface UIOverlayProps {
  gameState: GameStateStatus;
  score: number;
  wave: number;
  playerHealth: number;
  killCount: number;
  showBossIntro: boolean;
  specialPowerName: string;
  showSpecialAnim: boolean;
  stage: number;
  spawnThreshold: number;
  isDebugMode: boolean;
  settings: GameSettings;
  onStart: (character: CharacterType) => void;
  onRestart: () => void;
  onDebug: () => void;
  onUpdateSettings: (s: GameSettings) => void;
}

type MenuMode = 'MAIN' | 'OPTIONS';

export const UIOverlay: React.FC<UIOverlayProps> = ({
  gameState,
  score,
  wave,
  playerHealth,
  killCount,
  showBossIntro,
  specialPowerName,
  showSpecialAnim,
  stage,
  spawnThreshold,
  isDebugMode,
  settings,
  onStart,
  onRestart,
  onDebug,
  onUpdateSettings
}) => {
  const [selectedChar, setSelectedChar] = useState<CharacterType>('armand');
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [menuMode, setMenuMode] = useState<MenuMode>('MAIN');
  const [bindingKey, setBindingKey] = useState<keyof KeyBindings | null>(null);
  
  // Navigation State
  const [focusedId, setFocusedId] = useState<string>('BTN_START');

  useEffect(() => {
    setPreviews({
      armand: getCharacterPreview('armand'),
      adrien: getCharacterPreview('adrien'),
      eliot: getCharacterPreview('eliot'),
      swan: getCharacterPreview('swan'),
      pierre: getCharacterPreview('pierre'),
      audrey: getCharacterPreview('audrey'),
    });
  }, []);
  
  // Keyboard Navigation Logic
  useEffect(() => {
    if (gameState !== GameStateStatus.MENU) return;

    const handleNav = (e: KeyboardEvent) => {
        if (menuMode === 'MAIN') {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
                e.preventDefault();
            }

            // GRID NAVIGATION for 6 characters (3x2) + Buttons
            // Row 1: Armand, Adrien, Eliot
            // Row 2: Swan, Pierre, Audrey
            // Row 3: Start, Options

            switch (e.key) {
                case 'ArrowUp':
                    if (focusedId === 'BTN_START' || focusedId === 'BTN_OPTIONS') setFocusedId('CHAR_PIERRE'); // Go to mid row
                    else if (focusedId === 'CHAR_SWAN') setFocusedId('CHAR_ARMAND');
                    else if (focusedId === 'CHAR_PIERRE') setFocusedId('CHAR_ADRIEN');
                    else if (focusedId === 'CHAR_AUDREY') setFocusedId('CHAR_ELIOT');
                    break;
                case 'ArrowDown':
                    if (focusedId === 'CHAR_ARMAND') setFocusedId('CHAR_SWAN');
                    else if (focusedId === 'CHAR_ADRIEN') setFocusedId('CHAR_PIERRE');
                    else if (focusedId === 'CHAR_ELIOT') setFocusedId('CHAR_AUDREY');
                    else if (focusedId.startsWith('CHAR_')) setFocusedId('BTN_START');
                    break;
                case 'ArrowLeft':
                    if (focusedId === 'CHAR_ADRIEN') setFocusedId('CHAR_ARMAND');
                    else if (focusedId === 'CHAR_ELIOT') setFocusedId('CHAR_ADRIEN');
                    else if (focusedId === 'CHAR_PIERRE') setFocusedId('CHAR_SWAN');
                    else if (focusedId === 'CHAR_AUDREY') setFocusedId('CHAR_PIERRE');
                    else if (focusedId === 'BTN_OPTIONS') setFocusedId('BTN_START');
                    break;
                case 'ArrowRight':
                    if (focusedId === 'CHAR_ARMAND') setFocusedId('CHAR_ADRIEN');
                    else if (focusedId === 'CHAR_ADRIEN') setFocusedId('CHAR_ELIOT');
                    else if (focusedId === 'CHAR_SWAN') setFocusedId('CHAR_PIERRE');
                    else if (focusedId === 'CHAR_PIERRE') setFocusedId('CHAR_AUDREY');
                    else if (focusedId === 'BTN_START') setFocusedId('BTN_OPTIONS');
                    break;
                case 'Enter':
                    if (focusedId.startsWith('CHAR_')) {
                        const char = focusedId.replace('CHAR_', '').toLowerCase() as CharacterType;
                        setSelectedChar(char);
                    }
                    if (focusedId === 'BTN_START') handleStart();
                    if (focusedId === 'BTN_OPTIONS') setMenuMode('OPTIONS');
                    break;
            }
        } else if (menuMode === 'OPTIONS') {
            if (e.key === 'Escape') {
                setMenuMode('MAIN');
                setFocusedId('BTN_OPTIONS');
            }
        }
    };

    window.addEventListener('keydown', handleNav);
    return () => window.removeEventListener('keydown', handleNav);
  }, [gameState, menuMode, focusedId, selectedChar, settings]);

  // Input Binding Listener
  useEffect(() => {
    if (!bindingKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        const newKeys = { ...settings.keys };
        newKeys[bindingKey] = [key]; 
        
        onUpdateSettings({ ...settings, keys: newKeys });
        setBindingKey(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bindingKey, settings, onUpdateSettings]);

  const handleStart = () => {
      initAudio(settings.volume); // Unlock audio context
      onStart(selectedChar);
  };

  const handleRestart = () => {
      initAudio(settings.volume);
      onRestart();
  };

  const getBossIntroText = () => {
      if (stage === 1) return "LE DIRECTEUR\nARRIVE";
      if (stage === 2) return "L'AIGLE\nEST LÀ";
      return "LE KAWIK\nSE RAPPROCHE";
  }

  const displayKey = (k: string[]) => k[0] === ' ' ? 'SPACE' : k[0].toUpperCase().replace('ARROW', '');

  const characters: {id: CharacterType, name: string, title: string, color: string}[] = [
      { id: 'armand', name: 'ARMAND', title: 'THE BASSIST', color: 'blue' },
      { id: 'adrien', name: 'ADRIEN', title: 'THE DRUMMER', color: 'green' },
      { id: 'eliot', name: 'ELIOT', title: 'THE GUITARIST', color: 'orange' },
      { id: 'swan', name: 'SWAN', title: 'THE PIANIST', color: 'indigo' },
      { id: 'pierre', name: 'PIERRE', title: 'THE MAESTRO', color: 'yellow' },
      { id: 'audrey', name: 'AUDREY', title: 'THE SOPRANO', color: 'pink' },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 font-sans text-white select-none">
      
      {/* Boss Entrance Overlay */}
      {showBossIntro && gameState === GameStateStatus.PLAYING && (
         <div className="fixed top-1/2 left-1/2 w-full text-center boss-zoom z-50 pointer-events-none -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-7xl md:text-9xl text-red-600 pixel-font drop-shadow-[0_12px_12px_rgba(0,0,0,1)] stroke-black stroke-2 whitespace-pre-line leading-tight">
              {getBossIntroText()}
            </h1>
         </div>
      )}
      
      {/* Special Power Announcement */}
      {showSpecialAnim && gameState === GameStateStatus.PLAYING && (
         <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
             <h1 className="text-6xl md:text-8xl text-yellow-300 pixel-font drop-shadow-[0_0_20px_rgba(255,215,0,0.8)] stroke-black stroke-2 animate-ping whitespace-nowrap">
                 {specialPowerName}
             </h1>
         </div>
      )}
      
      {/* Test Mode Indicator */}
      {gameState === GameStateStatus.PLAYING && isDebugMode && (
          <div className="absolute top-6 right-6 text-red-500 pixel-font font-bold animate-pulse border-2 border-red-500 px-2 py-1 rounded bg-black/50">
              TEST MODE ACTIVE
          </div>
      )}

      {/* HUD */}
      {gameState === GameStateStatus.PLAYING && (
        <div className="flex justify-between items-start pixel-font">
          <div className="flex flex-col gap-2">
             <div className="text-yellow-400 text-xl drop-shadow-lg filter bg-black/40 px-3 py-1 rounded">SCORE: {score.toLocaleString()}</div>
             
             {/* Player Health Bar */}
             <div className="w-64 h-8 bg-black/50 border-2 border-white/20 rounded-lg overflow-hidden relative shadow-inner">
                <div 
                    className={`h-full transition-all duration-300 ${playerHealth > 50 ? 'bg-green-500' : playerHealth > 25 ? 'bg-yellow-500' : 'bg-red-600'}`}
                    style={{ width: `${Math.max(0, playerHealth)}%` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold drop-shadow-md">
                    HP: {Math.max(0, Math.ceil(playerHealth))} / 100
                </div>
             </div>

             <div className="text-purple-300 text-[10px] bg-black/40 px-3 py-1 rounded">
                 SPECIAL: [ {displayKey(settings.keys.special)} ]
             </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="text-3xl text-red-500 animate-pulse drop-shadow-lg filter bg-black/40 px-3 py-1 rounded">STAGE {stage}</div>
            <div className="text-xs text-gray-300 bg-black/40 px-2 py-1 rounded">
                {stage === 1 ? "Escape the School" : stage === 2 ? "Summit the Mountain" : "Survive the Garden"}
            </div>
            {killCount >= spawnThreshold ? (
                <div className="text-xl text-red-600 font-bold animate-bounce bg-black/40 px-2 rounded">BOSS ACTIVE</div>
            ) : (
                <div className="text-sm text-red-300 bg-black/40 px-2 rounded">KILLS: {killCount} / {spawnThreshold}</div>
            )}
          </div>
        </div>
      )}
      
      {/* DEBUG BUTTON */}
      {gameState === GameStateStatus.PLAYING && (
         <div className="absolute bottom-6 left-6 pointer-events-auto">
             <button 
                onClick={onDebug}
                className={`px-3 py-1 text-xs border rounded font-mono transition-colors ${isDebugMode ? 'bg-red-900/80 border-red-500 text-red-200' : 'bg-gray-800/50 border-gray-600 text-gray-400 hover:bg-gray-700'}`}
             >
                {isDebugMode ? '[TEST MODE ON]' : '[TEST MODE] (T)'}
             </button>
         </div>
      )}

      {/* Menu Screen */}
      {gameState === GameStateStatus.MENU && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center pointer-events-auto overflow-y-auto">
          {/* Radial gradient overlay for spotlight effect */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,rgba(0,0,0,0.5)_100%)] pointer-events-none"></div>

          {/* MAIN MENU VIEW */}
          {menuMode === 'MAIN' && (
          <div className="z-10 flex flex-col items-center w-full max-w-5xl py-8">
              <h1 className="text-5xl md:text-7xl text-yellow-400 mb-2 pixel-font text-center drop-shadow-[6px_6px_0_rgba(0,0,0,1)] tracking-tighter leading-tight animate-bounce-slow">
                CONTRABASS<br/><span className="text-white text-4xl md:text-6xl">HERO</span>
              </h1>
              
              <p className="text-lg text-blue-200 mb-6 text-center leading-relaxed pixel-font drop-shadow-md">
                 Defend your artistic integrity against the faculty!
              </p>
              
              {/* Character Selector - Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 justify-center">
                 {characters.map((char) => (
                     <button 
                        key={char.id}
                        onClick={() => { setSelectedChar(char.id); setFocusedId(`CHAR_${char.id.toUpperCase()}`); }}
                        onMouseEnter={() => setFocusedId(`CHAR_${char.id.toUpperCase()}`)}
                        className={`group relative flex flex-col items-center gap-1 p-2 rounded-xl border-4 transition-all duration-300 ${
                            focusedId === `CHAR_${char.id.toUpperCase()}` ? 'ring-4 ring-yellow-400 scale-105 z-20' : ''
                        } ${selectedChar === char.id ? `border-${char.color}-500 bg-${char.color}-900/60 shadow-[0_0_20px_rgba(255,255,255,0.3)]` : 'border-gray-600 bg-gray-800/60 opacity-70 hover:opacity-100'}`}
                     >
                        <div className="relative">
                            {previews[char.id] ? (
                                <img src={previews[char.id]} alt={char.name} className="w-24 h-24 md:w-32 md:h-32 object-contain pixelated drop-shadow-xl group-hover:-translate-y-2 transition-transform" style={{imageRendering: 'pixelated'}} />
                            ) : (
                                <div className="w-32 h-32 bg-gray-500 rounded-full border-2 border-white"></div>
                            )}
                        </div>
                        <div className="text-center">
                            <span className={`block pixel-font text-lg md:text-xl text-${char.color}-100`}>{char.name}</span>
                            <span className={`block text-[10px] md:text-xs text-${char.color}-300 font-mono tracking-widest`}>{char.title}</span>
                        </div>
                        {selectedChar === char.id && <div className={`absolute -top-3 -right-3 bg-${char.color}-500 text-white text-xs px-2 py-1 rounded pixel-font animate-bounce`}>P1</div>}
                     </button>
                 ))}
              </div>

              {/* Instructions Panel */}
              <div className="bg-black/40 border-2 border-white/20 p-4 rounded-lg mb-6 backdrop-blur-md w-full max-w-4xl grid grid-cols-1 md:grid-cols-5 gap-4 items-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-red-500/5 pointer-events-none"></div>
                  
                  <div className="text-center p-2">
                      <div className="text-yellow-400 text-[10px] mb-2 pixel-font tracking-widest">MOVEMENT</div>
                      <div className="flex gap-1 justify-center flex-wrap">
                          <kbd className="border-b-4 border-gray-700 bg-gray-800 rounded px-2 py-1 font-mono text-sm min-w-[30px]">{displayKey(settings.keys.up)}</kbd>
                          <kbd className="border-b-4 border-gray-700 bg-gray-800 rounded px-2 py-1 font-mono text-sm min-w-[30px]">{displayKey(settings.keys.left)}</kbd>
                          <kbd className="border-b-4 border-gray-700 bg-gray-800 rounded px-2 py-1 font-mono text-sm min-w-[30px]">{displayKey(settings.keys.down)}</kbd>
                          <kbd className="border-b-4 border-gray-700 bg-gray-800 rounded px-2 py-1 font-mono text-sm min-w-[30px]">{displayKey(settings.keys.right)}</kbd>
                      </div>
                  </div>
                  
                  <div className="text-center border-l-0 md:border-l border-white/10 p-2">
                      <div className="text-blue-400 text-[10px] mb-2 pixel-font tracking-widest">JUMP</div>
                      <kbd className="border-b-4 border-gray-700 bg-gray-800 rounded px-4 py-2 font-mono text-sm block mx-auto w-max">{displayKey(settings.keys.jump)}</kbd>
                  </div>

                  <div className="text-center border-l-0 md:border-l border-white/10 p-2">
                      <div className="text-red-400 text-[10px] mb-2 pixel-font tracking-widest">ATTACK</div>
                      <kbd className="border-b-4 border-gray-700 bg-gray-800 rounded px-6 py-2 font-mono text-sm block mx-auto w-max">{displayKey(settings.keys.attack)}</kbd>
                  </div>

                  <div className="text-center border-l-0 md:border-l border-white/10 p-2">
                      <div className="text-purple-400 text-[10px] mb-2 pixel-font tracking-widest">SPECIAL</div>
                      <kbd className="border-b-4 border-gray-700 bg-gray-800 rounded px-6 py-2 font-mono text-sm block mx-auto w-max">{displayKey(settings.keys.special)}</kbd>
                  </div>

                  <div className="text-center border-l-0 md:border-l border-white/10 p-2">
                      <div className="text-green-400 text-[10px] mb-2 pixel-font tracking-widest">OBJECTIVE</div>
                      <div className="text-xs font-bold text-white leading-tight drop-shadow-md">
                          KNOCK THEM<br/>INTO THE<br/><span className="text-red-500">VOID</span>
                      </div>
                  </div>
              </div>

              <div className="flex gap-4">
                  <button 
                    onClick={handleStart}
                    onMouseEnter={() => setFocusedId('BTN_START')}
                    className={`group relative px-10 py-5 bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white font-bold text-2xl border-b-8 border-blue-900 active:border-b-0 active:translate-y-2 active:border-t-8 transition-all pixel-font shadow-[0_10px_0_rgba(0,0,0,0.5)] ${
                        focusedId === 'BTN_START' ? 'ring-4 ring-yellow-400 scale-105 z-20' : ''
                    }`}
                  >
                    <span className="relative z-10 drop-shadow-md">START RECITAL</span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  </button>
                  
                  <button 
                    onClick={() => setMenuMode('OPTIONS')}
                    onMouseEnter={() => setFocusedId('BTN_OPTIONS')}
                    className={`group relative px-6 py-5 bg-gradient-to-b from-gray-500 to-gray-700 hover:from-gray-400 hover:to-gray-600 text-white font-bold text-xl border-b-8 border-gray-900 active:border-b-0 active:translate-y-2 active:border-t-8 transition-all pixel-font shadow-[0_10px_0_rgba(0,0,0,0.5)] ${
                        focusedId === 'BTN_OPTIONS' ? 'ring-4 ring-yellow-400 scale-105 z-20' : ''
                    }`}
                  >
                     <span className="relative z-10">OPTIONS</span>
                  </button>
              </div>
          </div>
          )}

          {/* OPTIONS MENU VIEW */}
          {menuMode === 'OPTIONS' && (
              <div className="z-20 bg-gray-800/90 p-8 rounded-xl border-4 border-gray-600 w-full max-w-lg backdrop-blur-xl">
                  <h2 className="text-3xl text-white pixel-font text-center mb-6">OPTIONS</h2>
                  
                  {/* Volume */}
                  <div className="mb-6">
                      <label className="block text-blue-300 pixel-font text-sm mb-2">MASTER VOLUME: {Math.round(settings.volume * 100)}%</label>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        value={settings.volume} 
                        onChange={(e) => onUpdateSettings({...settings, volume: parseFloat(e.target.value)})}
                        className="w-full h-4 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                  </div>
                  
                  {/* Key Bindings */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                      {(Object.keys(settings.keys) as Array<keyof KeyBindings>).map(action => (
                          <div key={action} className="bg-gray-900 p-3 rounded flex justify-between items-center">
                              <span className="text-gray-400 text-xs pixel-font uppercase">{action}</span>
                              <button 
                                onClick={() => setBindingKey(action)}
                                className={`px-3 py-1 text-sm font-mono rounded border-b-4 active:border-b-0 active:mt-1 ${bindingKey === action ? 'bg-red-600 text-white animate-pulse border-red-800' : 'bg-gray-700 text-white border-gray-900 hover:bg-gray-600'}`}
                              >
                                  {bindingKey === action ? 'PRESS KEY...' : displayKey(settings.keys[action])}
                              </button>
                          </div>
                      ))}
                  </div>

                  <div className="text-center">
                      <button 
                        onClick={() => { setMenuMode('MAIN'); setFocusedId('BTN_OPTIONS'); }}
                        className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold pixel-font rounded border-b-4 border-gray-800 active:border-b-0 active:translate-y-1"
                      >
                          BACK (ESC)
                      </button>
                  </div>
              </div>
          )}
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === GameStateStatus.GAME_OVER && (
        <div className="absolute inset-0 bg-red-900/90 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto animate-in fade-in duration-1000">
          <h2 className="text-6xl text-white mb-2 pixel-font drop-shadow-[4px_4px_0_black]">FAILED</h2>
          <p className="text-2xl text-red-200 mb-8 pixel-font bg-black/30 px-6 py-2 rounded">
              Stage {stage} <span className="mx-2">•</span> Score: {score.toLocaleString()}
          </p>
          <button 
            onClick={handleRestart}
            className="group px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-bold text-xl border-b-8 border-green-800 active:border-b-0 active:translate-y-2 transition-all pixel-font shadow-lg"
          >
            TRY AGAIN
          </button>
        </div>
      )}
    </div>
  );
};
