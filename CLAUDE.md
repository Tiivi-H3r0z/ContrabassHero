# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run preview      # Preview production build
```

**Environment setup:** Create a `.env.local` file with your Gemini API key:
```
GEMINI_API_KEY=your_key_here
```

The game runs without the API key (falls back to hardcoded French insults/taunts).

## Architecture

This is a React + Three.js browser game with no backend. There are no tests.

### State split: App vs GameCanvas

`App.tsx` owns all **React state** (score, wave, health, stage, game phase). `GameCanvas.tsx` owns all **Three.js/game-loop state** via refs — it never re-renders reactively; instead it reads props through refs synced in `useEffect` hooks and calls setter callbacks (`setScore`, `setPlayerHealth`, etc.) to push data back up to React.

This means:
- React state changes do NOT cause GameCanvas to re-run the game loop
- To force a full game reset (new WebGL context), `App` increments a `gameId` key on `<GameCanvas>` to unmount/remount it entirely
- The game loop (`animate()`) is a `requestAnimationFrame` loop that lives entirely inside a single large `useEffect` in `GameCanvas`

### Key files

| File | Role |
|---|---|
| `App.tsx` | Top-level state, game lifecycle, debug mode toggle |
| `components/GameCanvas.tsx` | Three.js scene, game loop, physics, combat, enemy AI, special powers |
| `components/UIOverlay.tsx` | All HTML/CSS UI: menu, HUD, game over, options, key rebinding |
| `services/assetFactory.ts` | Procedural texture generation using Canvas 2D API (no image files) |
| `services/audioService.ts` | Web Audio API synthesizer for SFX; external MP3 URL for BGM |
| `services/contentService.ts` | Gemini API calls for AI-generated French insults/boss taunts |
| `constants.ts` | All tunable game numbers (speeds, damage, cooldowns, boss stats, colors) |
| `types.ts` | TypeScript interfaces for all game entities (Hero, Enemy, Particle, Prop, Projectile) |

### Rendering approach

All visuals are **Three.js Sprites** (billboarded quads). Every texture is generated at runtime via Canvas 2D API in `assetFactory.ts` — there are no image assets. The camera is a fixed isometric-ish PerspectiveCamera offset `(24, 32, 24)` that follows the player via `lerp`.

### Game loop flow (per frame in `animate()`)

1. Hit-stop check (freeze frame on hit)
2. Special power active timer tick
3. Input reading → hero velocity → position update → arena bounds
4. Attack input → AoE damage to nearby enemies
5. Enemy AI: move toward hero, damage on contact (1s invincibility), physics
6. Enemy death check → kill counter → boss spawn trigger (at `CONSTANTS.BOSS.SPAWN_KILLS` kills)
7. Wave/enemy spawn timer (1 enemy per 60 frames when no boss)
8. Camera follow + screen shake (`traumaRef`)
9. Render

### Characters and special powers

6 playable characters defined in `types.ts` as `CharacterType`. Each has a unique weapon texture and special ability activated with `E`/`Enter`:
- **Armand** (contrabass): spin attack, bounces around arena
- **Adrien** (drums): transforms into lion, AoE knockback
- **Eliot** (guitar): fart cloud, damages nearby enemies
- **Swan** (piano): launches a cat projectile
- **Pierre** (harpsichord): tactical nuke, instant-kills all enemies
- **Audrey** (vocals/note): transforms into chicken

### Stage progression

3 stages (School → Mountain → Garden), each with a different boss, floor texture, background color, and environment props. Stage advances after killing the stage boss. Boss spawns replace all current enemies when the kill threshold is reached.

### AI integration

`contentService.ts` calls the Gemini API (`gemini-3-flash-preview` model) on game start to fetch French-language insult pools for teachers and boss taunts. The API key must be `GEMINI_API_KEY` in `.env.local`; Vite exposes it as `process.env.API_KEY` via the `define` config in `vite.config.ts`.

### Audio

All SFX are synthesized at runtime using Web Audio API oscillators and noise buffers — no audio files. Background music streams from an external MP3 URL hardcoded in `audioService.ts` (`BACKGROUND_MUSIC_URL`). Audio context is unlocked on first user click (menu start/restart buttons call `initAudio()`).

### Known Windows limitation

Files in `migrated_prompt_history/` have colons in their names (`prompt_2025-11-20T18:20:53.196Z.json`) and cannot be checked out on Windows. This folder contains AI Studio prompt history and is not part of the game code.
