# CLAUDE.md

Guidance for Claude Code when working in this repository.

## The game

**Contrabass Hero** is a frantic 3D arena hack'n'slash in the browser. A band of young musicians fights hordes of conservatory teachers pouring out of a dimensional rift, on a floating island over the void. Knock them off the edge, chain combos, reach the stage quota, beat the boss. 7 stages, 7 bosses, 6 playable heroes. Tone: sarcastic, teens/adults, cartoon (no blood: enemies burst into ink and sheet-music confetti). All player-facing text is French.

## Commands

```bash
npm install
npm run dev        # http://localhost:5555
npm run build      # dist/
npx tsc --noEmit -p .   # type check (no tests)
```

### Test URL parameters

- `?char=swan&stage=3` start a run directly (skips menus)
- `&quota=5` boss after 5 kills
- `&debug=1` hero / camera readout
- `&auto=1` the game plays itself (for headless screenshots)
- `&ticks=60` run N simulation ticks per rendered frame (headless Chrome with SwiftShader is very slow)
- `&bloom=0` disable bloom

Headless screenshot: `"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=960,540 --virtual-time-budget=60000 --screenshot=out.png "http://localhost:5555/?char=armand&auto=1&ticks=90"`.

## Architecture

React only renders UI; the game is a plain TypeScript engine in `game/`.

| Path | Role |
|---|---|
| `App.tsx` | Screens (title, select, playing, results), run state across stages, settings (localStorage), pause/options |
| `components/GameView.tsx` | Mounts one `Game` per stage (remount via `key`) |
| `components/Hud.tsx` | HUD, dialogue box, special cut-in, boss intro card, event banner; reads `hudStore` |
| `components/Screens.tsx` | Title, character select, options/key rebinding, pause, results |
| `components/useMenuNav.ts` | Keyboard + gamepad menu navigation |
| `styles/game.css` | All UI styles (palette tokens) |
| `game/Game.ts` | Orchestrator: fixed 60 Hz loop, combat resolution (`heroStrike`), combo/nuance/score, juice (hit-stop, shake, slow-mo, impact frames), stage flow horde → boss dialogue → boss → clear |
| `game/core/` | `Input` (keyboard + gamepad + rumble), `CameraRig`, `Fx` (instanced particles, rings, slash arcs, decals, telegraphs, blob shadows), `Overlay` (DOM damage numbers and speech bubbles), `hudStore` |
| `game/render/` | `toon.ts` (toon material with per-vertex emissive + hit flash, ink outline hull shader, neon material), `Pipeline.ts` (bloom + final pass: chromatic aberration, vignette, grain, hurt tint, blackout, impact invert) |
| `game/models/` | `builder.ts` (procedural modeling: merge primitive parts into one vertex-colored geometry, rigs of named pivots), `heroes.ts` (6 heroes + instruments, lion, chicken, cat, egg, fart cloud) |
| `game/entities/` | `Hero` (combo, heavy, dash, jump smash, procedural animation), `Enemies` (5 instanced archetypes, AI, spawn from the void, knock-off), `Projectiles`, `Specials`, `Pickups` |
| `game/bosses/` | `Boss` base, `kit.ts` (ArenaBoss helpers, phase 2 at 50%), one file per boss |
| `game/systems/` | `Director` (horde spawning), `Events` (6 surprise events), `Dialogue` (typewriter, blocking scenes, barks) |
| `game/stages/` | 7 environments: floor textures, island, sky shader with the rift, distant decor, destructible props, lights |
| `game/audio/audio.ts` | Fully synthesized SFX and adaptive procedural music (intensity follows the combo nuance) |
| `game/data/dialogues.ts` | All French text: stage intros, boss scenes, barks, taunts, events, report-card lines |
| `game/MenuScene.ts`, `game/portraits.ts` | 3D menu backdrop; hero/boss portraits rendered once to PNG data URLs |

Key rules:
- No image or audio files: every model, texture and sound is generated in code.
- Models are built from primitives (`builder.ts`); emissive parts use `glow >= 1.5` to bloom (bloom threshold 1.15, linear HDR).
- Enemies are `InstancedMesh` per archetype (one draw call + one outline each); per-instance hit flash via the `iFlash` attribute.
- Gameplay timers are in seconds with a fixed 1/60 tick.
- Every damaging boss attack is telegraphed with `fx.telegraphCircle/Rect`.

## Art direction

`design/bible-visuelle.html` and `design/palettes.html` (served by Vite). Chosen palette: **Plasma froid** (`game/palette.ts`). Color roles are strict: power turquoise = helps the player / the rift, ui blue, combo pink, reward gold, danger orange = enemies, telegraphs and damage taken only. `design/stage-preview.html?stage=N` previews a stage.

## Conventions

- Code in English, player-facing text in French.
- `migrated_prompt_history/` (AI Studio leftovers) has colons in file names and cannot be checked out on Windows.
