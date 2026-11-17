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
    uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
uniform sampler2D tDiffuse; uniform float uTime; uniform float uAberration; uniform float uImpact; uniform float uHurt; uniform float uDark;
uniform vec3 uHurtColor; uniform vec2 uRes; varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main(){
  vec2 c = vUv - 0.5;
  float d = length(c);
  vec2 off = c * (0.004 + uAberration * 0.03) * d * 2.0;
  vec3 col;
  col.r = texture2D(tDiffuse, vUv + off).r;
  col.g = texture2D(tDiffuse, vUv).g;
  col.b = texture2D(tDiffuse, vUv - off).b;
  float lum = dot(col, vec3(0.299,0.587,0.114));
  col = mix(vec3(lum), col, 1.12);
  float vig = smoothstep(0.85, 0.25, d);
  col *= mix(0.55, 1.0, vig);
  col = mix(col, col * 0.18, uDark * smoothstep(0.15, 0.7, d));
  col += uHurtColor * uHurt * smoothstep(0.3, 0.8, d) * 0.9;
  float g = hash(vUv * uRes + fract(uTime * 7.0)) - 0.5;
  col += g * 0.035;
  if (uImpact > 0.5) col = vec3(1.0) - clamp(col, 0.0, 1.0) * vec3(0.9, 1.0, 1.0);
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

  constructor(container: HTMLElement, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
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
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
