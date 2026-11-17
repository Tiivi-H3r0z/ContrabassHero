import type { CharacterType } from '../../types';

export interface DialogueView {
  speaker: string;
  name: string;
  text: string;
  full: boolean;
  side: 'left' | 'right';
  portrait: string;
  blocking: boolean;
}

export interface BannerView { id: number; title: string; subtitle: string; time: number }
export interface CutinView { id: number; hero: CharacterType; name: string }
export interface BossIntroView { id: number; boss: string; name: string; title: string }
export interface FinaleView { id: number; name: string; hero: CharacterType; line: string }

export interface HudState {
  hero: CharacterType;
  stage: number;
  lives: number;
  maxLives: number;
  score: number;
  combo: number;
  comboTimer: number;
  nuance: number;
  special: number;
  kills: number;
  quota: number;
  bossActive: boolean;
  bossName: string;
  bossHp: number;
  bossInvulnerable: boolean;
  banner: BannerView | null;
  dialogue: DialogueView | null;
  cutin: CutinView | null;
  bossIntro: BossIntroView | null;
  hint: string;
  hurt: number;
  beat: number;
  finale: FinaleView | null;
  finalePrompt: boolean;
}

type Listener = () => void;

export const createHudStore = (init: HudState) => {
  let state = init;
  let draft: HudState = { ...init };
  let dirty = false;
  const listeners = new Set<Listener>();
  return {
    get: () => state,
    subscribe: (l: Listener) => { listeners.add(l); return () => { listeners.delete(l); }; },
    set<K extends keyof HudState>(k: K, v: HudState[K]) {
      if (draft[k] !== v) { draft[k] = v; dirty = true; }
    },
    commit() {
      if (!dirty) return;
      state = draft;
      draft = { ...draft };
      dirty = false;
      listeners.forEach((l) => l());
    },
  };
};

export type HudStore = ReturnType<typeof createHudStore>;
