import * as THREE from 'three';

const DIR = new THREE.Vector3(1, 1.25, 1).normalize();

export class CameraRig {
  camera: THREE.PerspectiveCamera;
  target = new THREE.Vector3();
  private focus = new THREE.Vector3();
  baseDist = 40;
  dist = 40;
  private punch = 0;
  trauma = 0;
  shakeEnabled = true;
  private t = 0;
  lookAhead = new THREE.Vector3();

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
    const d = this.dist * (1 - this.punch * 0.12);
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
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
  }

  snap() {
    this.focus.copy(this.target);
    this.update(0);
  }
}
