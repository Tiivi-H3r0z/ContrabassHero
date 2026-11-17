import * as THREE from 'three';
import type { Game } from '../Game';
import { PAL } from '../palette';
import { neonMaterial } from '../render/toon';
import { audio } from '../audio/audio';

type Kind = 'note' | 'corde';

interface Pickup { kind: Kind; obj: THREE.Object3D; pos: THREE.Vector3; vy: number; y: number; life: number }

export class Pickups {
  group = new THREE.Group();
  list: Pickup[] = [];
  private noteGeo = new THREE.OctahedronGeometry(0.45, 0);
  private ringGeo = new THREE.TorusGeometry(0.7, 0.07, 6, 24);
  private spoolGeo = new THREE.TorusGeometry(0.45, 0.16, 8, 20);
  private noteMat = neonMaterial(PAL.reward, 2.4);
  private cordeMat = neonMaterial(PAL.power, 2.6);

  constructor(private game: Game) {}

  spawn(kind: Kind, at: THREE.Vector3, fromSky = false) {
    const obj = new THREE.Group();
    if (kind === 'note') {
      obj.add(new THREE.Mesh(this.noteGeo, this.noteMat));
      const r = new THREE.Mesh(this.ringGeo, this.noteMat);
      r.rotation.x = Math.PI / 2;
      obj.add(r);
    } else {
      obj.add(new THREE.Mesh(this.spoolGeo, this.cordeMat));
      const r = new THREE.Mesh(this.ringGeo, this.cordeMat);
      r.scale.setScalar(1.4);
      obj.add(r);
    }
    this.group.add(obj);
    const p = at.clone().setY(0);
    const R = this.game.arenaRadius - 2;
    if (p.length() > R) p.setLength(R);
    this.list.push({ kind, obj, pos: p, vy: fromSky ? 0 : 9, y: fromSky ? 16 : 1, life: 12 });
  }

  update(dt: number) {
    const h = this.game.hero;
    for (const p of this.list) {
      p.life -= dt;
      p.vy -= 30 * dt;
      p.y = Math.max(1, p.y + p.vy * dt);
      if (p.y === 1) p.vy = 0;
      const d = p.pos.distanceTo(h.pos);
      if (d < 5.5 && !h.dead) p.pos.lerp(h.pos, Math.min(1, dt * (12 / Math.max(0.5, d))));
      if (d < 1.4 && !h.dead && h.y < 3) {
        p.life = 0;
        if (p.kind === 'note') {
          this.game.addScore(250);
          this.game.overlay.pop('+250', p.pos.clone().setY(3), 'score');
          audio.play('pickup');
          this.game.fx.burst(p.pos.clone().setY(1.5), PAL.reward, 10, 8, { size: 0.3, life: 0.4 });
        } else {
          h.heal(1);
          this.game.overlay.pop('+1 CORDE', p.pos.clone().setY(3), 'heal');
          audio.play('heal');
          this.game.fx.burst(p.pos.clone().setY(1.5), PAL.power, 18, 10, { size: 0.35, life: 0.5 });
          this.game.fx.ring(h.pos, PAL.power, 0.5, 3, 0.3, 2.5);
        }
      }
      p.obj.position.set(p.pos.x, p.y + Math.sin(this.game.time * 4 + p.pos.x) * 0.25, p.pos.z);
      p.obj.rotation.y += dt * 3;
      p.obj.visible = p.life > 3 || Math.floor(p.life * 8) % 2 === 0;
      if (p.life <= 0) this.group.remove(p.obj);
    }
    this.list = this.list.filter((p) => p.life > 0);
  }
}
