import * as THREE from 'three';

const DIR = new THREE.Vector3(1, 1.25, 1).normalize();

export class CameraRig {
  camera: THREE.PerspectiveCamera;
  target = new THREE.Vector3();
  private focus = new THREE.Vector3();
  baseDist = 40;
  dist = 40;
  // build-up tension 0..1: the camera slowly closes in
  tension = 0;
  private punch = 0;
  trauma = 0;
  shakeEnabled = true;
  private t = 0;
  lookAhead = new THREE.Vector3();
  private roll = 0;
  addRoll(v: number) { this.roll += v; }
  private kickShake = 0;
  private kickSign = 1;
  // Musical kick: a short, sharp jolt (stronger and twisting on main kicks).
  kick(k: number, main: boolean) {
    this.kickShake = Math.max(this.kickShake, k * (main ? 1 : 0.55));
    if (main && this.shakeEnabled) { this.kickSign *= -1; this.roll += this.kickSign * 0.035 * k; }
  }

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(38, aspect, 0.5, 900);
    this.camera.position.copy(DIR).multiplyScalar(this.dist);
    this.camera.lookAt(0, 0, 0);
  }

  addTrauma(v: number) { this.trauma = Math.min(1, this.trauma + v); }
  addPunch(v: number) { this.punch = Math.max(this.punch, v); }

  update(dt: number) {
    this.t += dt;
    const k = 1 - Math.pow(0.0015, dt);
    this.focus.lerp(new THREE.Vector3().copy(this.target).add(this.lookAhead), k);
    this.punch *= Math.pow(0.02, dt);
    const d = this.dist * (1 - this.punch * 0.12 - this.tension * 0.1);
    this.camera.position.copy(DIR).multiplyScalar(d).add(this.focus);
    const look = this.focus.clone();
    look.y += 1.5;
    if (this.shakeEnabled && this.trauma > 0) {
      const s = this.trauma * this.trauma;
      const n = (o: number) => Math.sin(this.t * 61 + o) * 0.6 + Math.sin(this.t * 97 + o * 3) * 0.4;
      this.camera.position.x += n(1) * s * 1.6;
      this.camera.position.y += n(2) * s * 1.2;
      this.camera.position.z += n(3) * s * 1.6;
      this.camera.lookAt(look);
      this.camera.rotateZ(n(4) * s * 0.05);
    } else {
      this.camera.lookAt(look);
    }
    if (this.shakeEnabled && this.kickShake > 0.01) {
      const s = this.kickShake * this.kickShake;
      this.camera.position.x += (Math.random() - 0.5) * s * 1.4;
      this.camera.position.y += (Math.random() - 0.5) * s * 1.1 - s * 0.5;
      this.camera.position.z += (Math.random() - 0.5) * s * 1.4;
    }
    this.kickShake *= Math.exp(-dt * 13);
    if (this.shakeEnabled && Math.abs(this.roll) > 0.001) this.camera.rotateZ(this.roll);
    this.roll *= Math.pow(0.004, dt);
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
  }

  snap() {
    this.focus.copy(this.target);
    this.update(0);
  }
}
