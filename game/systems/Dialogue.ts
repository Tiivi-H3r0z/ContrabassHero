import type { Game } from '../Game';
import type { Line, Speaker } from '../data/dialogues';
import { CHARACTERS } from '../../types';
import { BOSS_INFO } from '../bosses/Boss';
import { audio } from '../audio/audio';
import { music } from '../audio/music';

const HERO_NAMES: Record<string, string> = { armand: 'ARMAND', adrien: 'ADRIEN', eliot: 'ELIOT', swan: 'SWAN', pierre: 'PIERRE', audrey: 'AUDREY' };

interface Resolved { key: string; name: string; text: string; side: 'left' | 'right' }

export class Dialogue {
  private queue: Resolved[] = [];
  private cur: Resolved | null = null;
  private shown = 0;
  private hold = 0;
  private blocking = false;
  private onDone: (() => void) | null = null;
  private blipT = 0;
  private barkQueue: Resolved[] = [];

  constructor(private game: Game) {}

  private resolve(l: Line): Resolved {
    let key: Speaker | string = l.speaker;
    let suffix = '';
    if (key === 'hero') key = this.game.hero.char;
    if (key === 'radio') { key = this.game.radioMate; suffix = ' · RADIO'; }
    const isHero = (CHARACTERS as string[]).includes(key);
    const name = isHero ? HERO_NAMES[key] + suffix : BOSS_INFO[key as keyof typeof BOSS_INFO]?.name ?? String(key).toUpperCase();
    return { key, name, text: l.text, side: isHero ? 'right' : 'left' };
  }

  play(lines: Line[], blocking: boolean, onDone?: () => void) {
    if (!lines.length) { onDone?.(); return; }
    this.queue = lines.map((l) => this.resolve(l));
    this.blocking = blocking;
    this.onDone = onDone ?? null;
    this.game.cutscene = blocking;
    if (blocking) { music.duck(0.5, 60); this.game.overlay.clearBubbles(); }
    this.next();
  }

  bark(speaker: Speaker, text: string) {
    if (this.blocking) return;
    const r = this.resolve({ speaker, text });
    if (!this.cur) { this.queue = [r]; this.onDone = null; this.next(); }
    else if (this.barkQueue.length < 1) this.barkQueue.push(r);
  }

  private next() {
    this.cur = this.queue.shift() ?? this.barkQueue.shift() ?? null;
    this.shown = 0;
    this.hold = 0;
    if (!this.cur) {
      this.game.hud.set('dialogue', null);
      const wasBlocking = this.blocking;
      this.blocking = false;
      this.game.cutscene = false;
      if (wasBlocking) music.duck(0, 0.01);
      const cb = this.onDone;
      this.onDone = null;
      cb?.();
    }
  }

  update(dt: number) {
    if (!this.cur) return;
    const len = this.cur.text.length;
    const input = this.game.input;
    if (this.blocking && (input.pressed('dash') || input.pressed('heavy') || input.pressed('special'))) {
      audio.play('uiBack', { volume: 0.5 });
      this.queue = [];
      this.barkQueue = [];
      this.next();
      return;
    }
    if (this.shown < len) {
      this.shown = Math.min(len, this.shown + dt * (this.blocking ? 70 : 60));
      this.blipT -= dt;
      if (this.blipT <= 0) { this.blipT = 0.05; audio.play('typewriter', { volume: 0.35 }); }
      if (this.blocking && input.anyConfirm()) this.shown = len;
    } else {
      this.hold += dt;
      const advance = this.blocking ? input.anyConfirm() || this.hold > 1.1 + len * 0.018 : this.hold > 1.6 + len * 0.02;
      if (advance) {
        if (this.blocking) audio.play('uiMove', { volume: 0.5 });
        this.next();
        if (!this.cur) return;
      }
    }
    const c = this.cur;
    this.game.hud.set('dialogue', {
      speaker: c.key,
      name: c.name,
      text: c.text.slice(0, Math.floor(this.shown)),
      full: this.shown >= len,
      side: c.side,
      portrait: c.key,
      blocking: this.blocking,
    });
  }

  dispose() { this.queue = []; this.cur = null; }
}
