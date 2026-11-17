# CLAUDE.md

Guidance for Claude Code when working in this repository.

## The game

**Contrabass Hero** is a frantic arena hack'n'slash in the browser. A band of young musicians fights hordes of conservatory teachers with their instruments, then a boss per stage. Tone: absurd family humour (fart clouds, chicken transformation, cat launcher, tactical nuke). Core loop: move, smash, knock enemies off a floating platform into the void, reach the kill threshold, beat the boss, next stage.

## Commands

```bash
npm install        # dependencies
npm run dev        # dev server on http://localhost:5555 (vite.config.ts)
npm run build      # production build -> dist/
npm run preview    # serve the build
```

No tests, no backend, no API key needed. `contentService.ts` returns hardcoded French insults/taunts (the old Gemini integration was removed; README is an AI Studio leftover).

## Stack

React 19 + Three.js 0.181 + Vite 6 + TypeScript. Tailwind comes from the CDN script in `index.html` (no Tailwind build). `index.html` also contains an AI Studio importmap that Vite ignores in practice; `/index.css` is referenced but does not exist.

## Architecture

### State split: App vs GameCanvas

- `App.tsx` owns React state: score, stage, lives (5), kill count, game phase, overlays (boss intro, stage complete, special name), settings, pause, debug.
- `GameCanvas.tsx` owns everything Three.js through refs. It never re-renders reactively: props are mirrored into refs via `useEffect`, and data goes back up through setter callbacks (`setScore`, `setKillCount`, `onLoseLife`, `onBossEnter`, `onStageAdvance`...).
- React state changes do NOT restart the loop. To reset (new game or new stage), `App` increments `gameId`, used as `key` on `<GameCanvas>` to remount it with a fresh WebGL context.
- The whole game loop (`animate()`, `requestAnimationFrame`) lives in one large `useEffect` in `GameCanvas` (~1900 lines). Frame-based timers assume 60 fps.

### Key files

| File | Role |
|---|---|
| `App.tsx` | Top-level state, lifecycle, keyboard shortcuts (`Esc` pause, `T` test mode) |
| `components/GameCanvas.tsx` | Scene, loop, input, physics, combat, enemy + boss AI, specials, props, camera |
| `components/UIOverlay.tsx` | All HTML UI: menu + character select, options/key rebinding, HUD, pause, game over, victory, overlays |
| `services/assetFactory.ts` | Procedural textures drawn with Canvas 2D (no image files), incl. damaged prop states |
| `services/audioService.ts` | Web Audio synthesized SFX (`playSound(type)`); `BACKGROUND_MUSIC_URL` is empty |
| `services/contentService.ts` | Hardcoded French insults, boss taunts, boss death lines |
| `constants.ts` | All tunables: speeds, damage, cooldowns, boss stats per boss, colors, default key bindings |
| `types.ts` | Entities: Hero, Enemy (+ boss phases), Projectile, CarrotBomb, Prop, Particle, FloatingText |

### Rendering (current)

Everything is a `THREE.Sprite` (billboard) with a `NearestFilter` canvas texture: pixel-art 2.5D. Fixed perspective camera at offset `(24, 32, 24)` lerping toward the hero; screen shake via `traumaRef`; hit-stop via `hitStopRef`. Movement input is rotated for the isometric view (up = -x -z).

### Frame flow in `animate()`

1. Hit-stop / pause check
2. Special power timers
3. Input -> hero velocity -> position, jump, gravity, fall into void (lose a life, respawn with 2s invincibility)
4. Hero vs destructible props (3 hits to destroy)
5. Attack -> radial hit (`ATTACK_RANGE`), 40 dmg, knockback, shake, hit-stop
6. Enemy AI: chase, contact damage (1s invincibility), speech bubbles, boss phase machines
7. Deaths -> kill counter -> boss spawn at `spawnThreshold` (15, or 1 in test mode)
8. Spawn timer (1 teacher / 60 frames when no boss)
9. Projectiles, particles, floating texts
10. Camera follow + shake, render

### Characters and specials (`E` / `Enter`)

| Hero | Instrument | Special |
|---|---|---|
| Armand | contrabass | Bow spin: bounces around the arena |
| Adrien | drums | Lion roar: AoE knockback |
| Eliot | guitar | Gas attack: fart clouds that contaminate enemies |
| Swan | piano | Cat launch: homing cat projectile |
| Pierre | harpsichord | Tactical nuke: kills all regular enemies |
| Audrey | vocals (note) | Chicken mode |

### Stages and bosses

| # | Stage | Boss | Mechanic |
|---|---|---|---|
| 1 | School | Le Directeur | Heavy chaser |
| 2 | Mountain | L'Aigle | Fast |
| 3 | Garden | Kawik (guinea pig) | Tank |
| 4 | Desert | Tatoo (armadillo) | Shell phase: rolling, invulnerable |
| 5 | Volcano | La Taupe (mole) | Burrow phase: invulnerable, lava projectiles |
| 6 | Enchanted garden | Ninja Pain (rabbit) | Jumps, carrot bombs + lightning, phase 2 under 50% HP |
| 7 | Jungle | Le Serpent | Constricts the hero: 3 jumps to escape |

Boss spawn clears regular enemies. Killing the boss shows "STAGE COMPLETE" and remounts the canvas on the next stage; after stage 7 -> victory.

### Known issues

- Victory screen says "all 5 stages" (there are 7).
- Character colors in `UIOverlay` use dynamic Tailwind classes (`border-${color}-500`), which only work because Tailwind runs from the CDN.
- `migrated_prompt_history/` files have colons in their names and cannot be checked out on Windows (AI Studio history, not game code).

## Redesign in progress

Target art direction (3D toon shading, ink outlines, neon, frantic hack'n'slash): https://claude.ai/artifact/Acw5UoV5fou8kAqcfCzFFV. Color semantics are strict: green = helps the player, cyan = UI, magenta = combo, yellow = reward, red-orange = danger/enemies only.

## Conventions

- Code and identifiers in English, player-facing text in French.
- All tunable numbers go in `constants.ts`.
- No image or audio files so far: assets are generated in code.
