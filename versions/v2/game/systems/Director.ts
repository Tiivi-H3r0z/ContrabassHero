import * as THREE from 'three';
import type { Game } from '../Game';
import type { EnemyKind } from '../entities/enemyModels';
import { audio } from '../audio/audio';

// Spawns the horde from the edge of the island, ramping pressure over time.
export class Director {
  private t = 0;
  private spawnT = 1.5;
  private elapsed = 0;

  constructor(private game: Game) {}

  private weights(): [EnemyKind, number][] {
    const s = this.game.stageNum;
    return [
      ['solfege', 60],
      ['surveillant', 22 + s * 2],
      ['maths', s >= 2 ? 10 + s * 2 : 0],
      ['cpe', s >= 3 ? 4 + s * 1.5 : 0],
      ['inspecteur', s >= 4 && this.game.enemies.count('inspecteur') < 2 ? 1.5 + s * 0.4 : 0],
    ];
  }

  pick(): EnemyKind {
    const w = this.weights();
    const total = w.reduce((a, [, x]) => a + x, 0);
    let r = Math.random() * total;
    for (const [k, x] of w) { r -= x; if (r <= 0) return k; }
    return 'solfege';
  }

  maxAlive() {
    const g = this.game;
    const s = g.stageNum;
    if (g.phase === 'boss') return 5 + s;
    return Math.min(30 + s * 7, 16 + s * 3 + Math.floor(this.elapsed / 3.5));
  }

  update(dt: number) {
    const g = this.game;
    this.t += dt;
    this.elapsed += dt;
    this.spawnT -= dt;
    const alive = g.enemies.list.length;
    const remaining = g.quota - g.stageKills;
    if (g.phase === 'horde' && remaining - alive <= 0) return;
    if (this.spawnT > 0 || alive >= this.maxAlive()) return;
    this.spawnT = g.phase === 'boss' ? 2.6 : Math.max(0.45, 1.1 - g.stageNum * 0.06);
    const n = g.phase === 'boss' ? 1 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * (2 + g.stageNum * 0.5));
    const base = Math.random() * Math.PI * 2;
    const R = g.arenaRadius;
    let spawned = 0;
    for (let i = 0; i < n; i++) {
      if (g.phase === 'horde' && g.quota - g.stageKills - g.enemies.list.length <= 0) break;
      const a = base + (i - n / 2) * 0.13;
      const at = new THREE.Vector3(Math.cos(a) * (R - 0.8), 0, Math.sin(a) * (R - 0.8));
      if (at.distanceTo(g.hero.pos) < 6) continue;
      const kind = g.phase === 'boss' ? (Math.random() < 0.7 ? 'solfege' : 'surveillant') : this.pick();
      if (g.enemies.spawn(kind, at, 'edge')) spawned++;
    }
    if (spawned && Math.random() < 0.3) audio.play('spawn', { volume: 0.4 });
  }
}
