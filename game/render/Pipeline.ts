import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uAberration: { value: 0 },
    uImpact: { value: 0 },
    uHurt: { value: 0 },
    uDark: { value: 0 },
    uHurtColor: { value: new THREE.Color('#ff5a1a') },
    uCarnage: { value: 0 },
    uDesat: { value: 0 },
    uBeat: { value: 0 },
    uKick: { value: 0 },
    uTension: { value: 0 },
    uWarp: { value: 0 },
    uWarpRot: { value: 0 },
    uKickColor: { value: new THREE.Color('#00ffd5') },
    uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
uniform sampler2D tDiffuse; uniform float uTime; uniform float uAberration; uniform float uImpact; uniform float uHurt; uniform float uDark;
uniform vec3 uHurtColor; uniform vec2 uRes; uniform float uCarnage; uniform float uDesat; uniform float uBeat; uniform float uKick; uniform vec3 uKickColor; uniform float uWarp; uniform float uWarpRot; uniform float uTension; varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main(){
  vec2 c0 = vUv - 0.5;
  // kick warp: punch-in zoom, vertical squash, barrel bulge and a small twist around the center
  float cs = cos(uWarpRot), sn = sin(uWarpRot);
  vec2 cw = vec2(c0.x * cs - c0.y * sn, c0.x * sn + c0.y * cs);
  float r2 = dot(cw, cw);
  cw *= (1.0 - uWarp * 0.075) * (1.0 - uWarp * 0.22 * r2);
  cw.y *= 1.0 + uWarp * 0.06;
  cw.x *= 1.0 - uWarp * 0.02;
  vec2 uv = clamp(cw + 0.5, 0.001, 0.999);
  vec2 c = uv - 0.5;
  float d = length(c0);
  vec2 off = c * (0.004 + uAberration * 0.03 + uKick * 0.012 + uWarp * 0.02 + uTension * 0.012) * d * 2.0;
  vec3 col;
  col.r = texture2D(tDiffuse, uv + off).r;
  col.g = texture2D(tDiffuse, uv).g;
  col.b = texture2D(tDiffuse, uv - off).b;
  float lum = dot(col, vec3(0.299,0.587,0.114));
  col = mix(vec3(lum), col, 1.12 + uCarnage * 0.25 + uTension * 0.4);
  col = mix(col, vec3(dot(col, vec3(0.299,0.587,0.114))), clamp(uDesat, 0.0, 1.0) * 0.85);
  float vig = smoothstep(0.85 - uKick * 0.08, 0.25, d);
  col *= mix(0.32, 1.0, vig);
  col *= 1.0 + uKick * 0.38;
  col += uKickColor * uKick * smoothstep(0.38, 0.95, d) * 1.1;
  col += vec3(1.0) * uWarp * 0.06;
  // build-up: the frame closes in and the edges throb pink on the beat
  col *= mix(1.0, smoothstep(0.9, 0.2, d) * 0.75 + 0.25, uTension * 0.7);
  col += vec3(1.0, 0.24, 0.55) * uTension * smoothstep(0.42, 0.95, d) * (0.25 + 0.75 * uBeat);
  col = mix(col, col * 0.18, uDark * smoothstep(0.15, 0.7, d));
  col += uHurtColor * uHurt * smoothstep(0.3, 0.8, d) * 0.9;
  col += vec3(1.0, 0.24, 0.55) * uCarnage * smoothstep(0.35, 0.85, d) * (0.45 + 0.55 * uBeat);
  float g = hash(vUv * uRes + fract(uTime * 7.0)) - 0.5;
  col += g * 0.035;
  if (uImpact > 0.5) {
    float L = dot(clamp(col, 0.0, 1.0), vec3(0.299, 0.587, 0.114));
    col = mix(vec3(0.015, 0.0, 0.004), vec3(1.5, 0.06, 0.05), smoothstep(0.04, 0.55, L));
  }
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`,
};

export class Pipeline {
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  final: ShaderPass;
  renderPass: RenderPass;
  private size = new THREE.Vector2();
  contextLost = false;

  constructor(container: HTMLElement, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.contextLost = true; console.warn('[pipeline] WebGL context lost'); });
    this.renderer.domElement.addEventListener('webglcontextrestored', () => { this.contextLost = false; console.warn('[pipeline] WebGL context restored'); });
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.9, 0.55, 1.15);
    this.composer.addPass(this.bloom);
    if (new URLSearchParams(location.search).get('bloom') === '0') this.bloom.enabled = false;
    this.final = new ShaderPass(FinalShader);
    this.composer.addPass(this.final);
    this.composer.addPass(new OutputPass());
    this.resize(container.clientWidth, container.clientHeight);
  }

  resize(w: number, h: number) {
    w = Math.max(1, w); h = Math.max(1, h);
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.renderer.getDrawingBufferSize(this.size);
    this.final.uniforms.uRes.value.copy(this.size);
  }

  render(time: number) {
    this.final.uniforms.uTime.value = time;
    this.composer.render();
  }

  dispose() {
    this.composer.dispose();
    this.renderer.dispose();
    // no forceContextLoss: it can take down sibling contexts on some drivers
    this.renderer.domElement.remove();
  }
}
