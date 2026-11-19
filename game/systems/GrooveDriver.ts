import * as THREE from 'three';
import type { Game } from '../Game';
import { Groove, GrooveEvent, InputResult, Sym, TIERS, GROOVE_MAX, SPECIALS, COMBOS } from './groove';
import { music } from '../audio/music';
import { audio } from '../audio/audio';
import { PAL } from '../palette';
import type { Action } from '../../types';

// In-game Groove: feeds the rhythm engine with the real button presses (timestamped at the key event),
// runs the effects of the motifs available in game, the build-up / drop bonuses, tiers and power.
// Effects you earned keep running for BUFF_BARS after you switch to another motif, so they stack.
const TOLERANCE: Record<string, number> = { facile: 1.3, normal: 1, carnage: 0.8 };
const INPUTS: [Action, Sym][] = [['attack', 'f'], ['heavy', 'F'], ['dash', 'D']];
const TIER_COL = [PAL.fog, PAL.power, PAL.ui, PAL.combo, PAL.reward, PAL.reward];
const GHOSTS = 8;
export const BUFF_BARS = 2;
const NAME = Object.fromEntries(COMBOS.map((c) => [c.id, c.name]));

export class GrooveDriver {
  groove: Groove;
  pulseStacks = 0;
  private buffs = new Map<string, { until: number; len: number }>();
  private tagN = 0;
  private dashTag = 0;
  private dashSlash = 0;
  private clockT = 0;
  private beat = 0.4;
  private hudBuffs = '';
  private lastMove = -1e9;
  private still = false;
  // afterimages (Marche funèbre): ghost copies of the hero rig
  private ghosts: { root: THREE.Group; parts: THREE.Object3D[]; mat: THREE.MeshBasicMaterial; life: number }[] = [];
  private live: THREE.Object3D[] = [];
  private ghostIdx = 0;
  private ghostT = 0;

  constructor(private game: Game) {
    this.groove = new Groove(TOLERANCE[game.settings.difficulty] ?? 1.2);
    const hero = game.hero;
    hero.rig.root.traverse((o) => this.live.push(o));
    for (let i = 0; i < GHOSTS; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.ui).multiplyScalar(1.6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const clone = hero.rig.root.clone(true);
      const parts: THREE.Object3D[] = [];
      clone.traverse((o) => {
        parts.push(o);
        const m = o as THREE.Mesh;
        if (m.isMesh) { if ((m.material as THREE.Material) === hero.rig.outline) m.visible = false; else m.material = mat; }
      });
      const root = new THREE.Group();
      root.add(clone);
      root.visible = false;
      game.scene.add(root);
      this.ghosts.push({ root, parts, mat, life: 0 });
    }
  }

  private tag() { return -5_000_000 - ++this.tagN; }

  // Effect of a motif: running, or earned less than BUFF_BARS ago.
  active(id: string) {
    const b = this.buffs.get(id);
    return !!b && b.until > this.clockT;
  }

  dmgMul() { return this.groove.power() * (1 + 0.05 * this.pulseStacks); }
  speedMul() { return 1 + (this.groove.power() - 1) * 0.6; }

  // Called every fixed tick before the hitstop early-out, so presses during hit-stop still count.
  tick(dt: number) {
    const g = this.game;
    const c = music.clock();
    if (c) {
      this.clockT = c.t;
      this.beat = 60 / c.bpm;
      if (!g.cutscene && !g.finales.active && !g.hero.dead) {
        const now = performance.now();
        for (const [a, sym] of INPUTS) {
          if (!g.input.pressed(a)) continue;
          const t = c.t - Math.max(0, now - g.input.pressTime(a)) / 1000;
          this.onInput(sym, t, this.groove.input(sym, t, c.bpm, c.phase));
        }
      }
      this.handle(this.groove.update(dt, c.t, this.beat));
    }
    if (!this.active('pulsation')) this.pulseStacks = 0;
    // move to groove: no dash / step for 2 bars halves the groove gains
    if (g.hero.state === 'dash' || g.hero.stepping()) this.lastMove = this.clockT;
    const still = this.clockT - this.lastMove > 8 * this.beat && this.groove.value > 0.5;
    this.groove.gainMul = still ? 0.5 : 1;
    if (still !== this.still) { this.still = still; g.hud.set('grooveStill', still); }
    // dash cuts (Marche funèbre, Galop charge)
    const h = g.hero;
    if (this.dashSlash > 0 && (h.state === 'dash' || h.stepping())) {
      g.heroStrike({ center: h.pos.clone(), radius: 2, arc: 7, facing: h.facing, dmg: this.dashSlash, kb: this.dashSlash > 20 ? 14 : 5, launch: this.dashSlash > 20 ? 5 : 0, guard: true, tag: this.dashTag, color: PAL.ui, quietSlash: true, heavy: this.dashSlash > 20 });
    } else this.dashSlash = 0;
    this.updateGhosts(dt);
    g.hud.set('groove', this.groove.value / GROOVE_MAX);
    g.hud.set('grooveTier', this.groove.tier);
    const m = this.groove.motif;
    g.hud.set('grooveMotif', m && this.clockT - this.groove.lastIn < this.beat * 2.2 ? (m.combo ? m.combo.name : m.complexity >= 2 ? 'Motif libre' : '') : '');
    let hb = '';
    for (const [id, b] of this.buffs) if (b.until > this.clockT) hb += `${NAME[id]}:${(Math.ceil(((b.until - this.clockT) / b.len) * 10) / 10).toFixed(1)}|`;
    if (hb !== this.hudBuffs) { this.hudBuffs = hb; g.hud.set('grooveBuffs', hb); }
  }

  private onInput(sym: Sym, t: number, r: InputResult) {
    const g = this.game, h = g.hero;
    if (sym === 'D') this.lastMove = t;
    if (r.inRhythm) {
      h.rhythmPress = sym;
      g.breakHitstop();
      // the note you played, right now (the hit itself lands a few frames later)
      audio.play('tap', { pitch: sym === 'F' ? 0.75 : sym === 'D' ? 1.45 : 1.05, volume: 0.8 });
    }
    this.handle(r.events, sym);
    if (!r.inRhythm) return;
    // build-up: every note in rhythm during a ramp feeds the groove more and more
    const rp = music.rampProgress();
    if (rp >= 0) {
      this.handle(this.groove.bonus(0.4 + rp * 1.2));
      g.fx.ring(h.pos, PAL.combo, 0.3, 2 + rp * 4, 0.2, 1.4 + rp);
    }
    const drop = music.dropNear(t, 0.13);
    if (sym === 'F' && drop !== null) this.dropHit();
    if (sym === 'F') {
      if (this.active('marteau')) this.hammer();
      if (this.active('boutoir')) this.shockwave(6, 24, PAL.combo);
      if (this.active('galop')) { h.charge(); this.dashTag = this.tag(); this.dashSlash = 30; audio.play('dash', { pitch: 0.8 }); }
    }
    if (sym === 'D' && this.active('marche') && this.dashSlash < 20) { this.dashTag = this.tag(); this.dashSlash = 14; }
    g.fx.ring(h.pos, TIER_COL[this.groove.tier], 0.3, 1.6 + this.groove.tier * 0.3, 0.16, 1.2);
  }

  // Marteau: every heavy hit on the beat slams the ground around the hero.
  private hammer() {
    const g = this.game, h = g.hero;
    g.heroStrike({ center: h.pos.clone(), radius: 3.4, arc: 7, facing: h.facing, dmg: 26, kb: 15, launch: 4, guard: true, tag: this.tag(), color: PAL.combo, heavy: true, style: 'flat' });
    g.fx.ring(h.pos, PAL.combo, 0.5, 7, 0.32, 3);
    g.fx.ring(h.pos, PAL.bone, 0.3, 4, 0.2, 2);
    g.fx.splat(h.pos, 3.2, PAL.void3);
    g.fx.debris(h.pos.clone().setY(0.6), [PAL.ink, PAL.bone], 12, 12, 0.4);
    g.shake(0.45, 0.35, 3);
    audio.play('smash', { pitch: 1.25, volume: 0.7 });
  }

  // Coup de boutoir / chute: a knock-back wave around the hero.
  private shockwave(r: number, dmg: number, col: string) {
    const g = this.game, h = g.hero;
    g.heroStrike({ center: h.pos.clone(), radius: r, arc: 7, facing: h.facing, dmg, kb: 26, launch: 7, guard: true, tag: this.tag(), color: col, heavy: true });
    for (let i = 0; i < 3; i++) g.fx.ring(h.pos, i === 1 ? PAL.bone : col, 0.6, r * (1.4 + i * 0.4), 0.3 + i * 0.1, 3 - i * 0.6);
    g.fx.burst(h.pos.clone().setY(1), col, 24, 18, { size: 0.45, life: 0.45, up: 0.6 });
    g.shake(0.6, 0.5, 4);
    audio.play('hitHeavy', { pitch: 0.8 });
  }

  // DROP: heavy hit right on the end of a build-up.
  private dropHit() {
    const g = this.game, h = g.hero;
    g.heroStrike({ center: h.pos.clone(), radius: 10, arc: 7, facing: h.facing, dmg: 80, kb: 34, launch: 15, guard: true, tag: this.tag(), color: PAL.reward, heavy: true, crit: true });
    for (let i = 0; i < 4; i++) g.fx.ring(h.pos, [PAL.reward, PAL.combo, PAL.bone, PAL.power][i], 1, 14 + i * 9, 0.5 + i * 0.15, 3.4);
    g.fx.burst(h.pos.clone().setY(1.5), PAL.reward, 70, 30, { size: 0.6, life: 0.8, up: 1.5 });
    g.fx.splat(h.pos, 7, PAL.void3);
    g.overlay.pop('DROP !', h.pos.clone().setY(h.y + 7), 'goth');
    g.impactFrames(2, true);
    g.shake(1, 0.9, 8);
    g.slowmo(0.35, 0.3);
    audio.play('explosion', { pitch: 0.9, volume: 1.2 });
    this.handle(this.groove.bonus(16));
  }

  private handle(events: GrooveEvent[], sym?: Sym) {
    const g = this.game, h = g.hero;
    const head = () => h.pos.clone().setY(h.y + 5.4);
    for (const e of events) {
      if (e.kind === 'cycle') {
        const c = e.motif.combo;
        if (c?.ingame) {
          const len = BUFF_BARS * 4 * this.beat;
          this.buffs.set(c.id, { until: this.clockT + Math.max(len, e.motif.length * (this.beat / 4) + this.beat), len });
        }
        if (c?.id === 'pulsation') {
          this.pulseStacks = Math.min(3, this.pulseStacks + 1);
          g.fx.ring(h.pos, PAL.power, 0.4, 3 + this.pulseStacks, 0.28, 1.8);
        }
        if (e.fresh && c) { g.overlay.pop(c.name.toUpperCase(), head(), 'big'); audio.play('comboUp', { pitch: 1.2 }); }
        else if (e.fresh && e.motif.complexity >= 2) g.overlay.pop('MOTIF LIBRE', head(), 'beat');
      } else if (e.kind === 'variation') {
        g.overlay.pop('VARIATION !', head(), 'beat');
      } else if (e.kind === 'special') {
        if (e.id === 'chute') {
          g.overlay.pop('CHUTE !', head(), 'big');
          const s = e.sym ?? sym;
          if (s === 'F') this.shockwave(5.5, 34, PAL.combo);
          else if (s === 'D') { this.dashTag = this.tag(); this.dashSlash = 26; this.shockwave(3.5, 18, PAL.ui); }
          else this.shockwave(4, 22, PAL.power);
        } else {
          g.overlay.pop(SPECIALS[e.id].name, head(), 'goth');
          g.shake(0.6, 0.5, 6);
        }
      } else if (e.kind === 'tier') {
        if (e.up) {
          g.overlay.pop(TIERS[e.tier].name, h.pos.clone().setY(h.y + 6.5), 'goth');
          for (let i = 0; i < 2; i++) g.fx.ring(h.pos, TIER_COL[e.tier], 1, 10 + i * 8, 0.45 + i * 0.15, 2.6);
          g.fx.burst(h.pos.clone().setY(1.5), TIER_COL[e.tier], 30, 18, { size: 0.45, life: 0.6, up: 1.5 });
          g.shake(0.5, 0.45, 4);
          audio.play('specialReady', { pitch: 1 + e.tier * 0.06 });
        }
      }
    }
  }

  // Pulsation: the aura beats with the music.
  onBeat() {
    if (!this.active('pulsation')) return;
    const h = this.game.hero;
    this.game.fx.ring(h.pos, PAL.power, 0.35, 2.4 + this.pulseStacks * 0.6, 0.22, 1.4);
  }

  // Called by the hero while dashing / stepping: Marche funèbre leaves afterimages.
  trail() {
    if (!this.active('marche') && this.dashSlash <= 20) return;
    this.ghostT -= 1;
    if (this.ghostT > 0) return;
    this.ghostT = 2;
    const h = this.game.hero;
    const gh = this.ghosts[this.ghostIdx++ % GHOSTS];
    gh.root.position.copy(h.root.position);
    gh.root.quaternion.copy(h.root.quaternion);
    gh.root.scale.copy(h.root.scale);
    for (let i = 0; i < Math.min(this.live.length, gh.parts.length); i++) {
      const s = this.live[i], d = gh.parts[i];
      d.position.copy(s.position); d.quaternion.copy(s.quaternion); d.scale.copy(s.scale);
    }
    gh.life = 1;
    gh.root.visible = true;
  }

  private updateGhosts(dt: number) {
    for (const gh of this.ghosts) {
      if (gh.life <= 0) continue;
      gh.life = Math.max(0, gh.life - dt * 3.2);
      gh.mat.opacity = gh.life * gh.life * 0.55;
      gh.root.visible = gh.life > 0;
    }
  }

  // Visual weight of the current tier (hero scale).
  tierScale() { return 1 + this.groove.tier * 0.025; }

  dispose() {
    for (const gh of this.ghosts) { this.game.scene.remove(gh.root); gh.mat.dispose(); }
  }
}
