// Playback for the music studio: loop-aware transport, listening speed, metronome and kick clicks
// scheduled sample-accurately on the AudioContext clock.

export interface ClickSource {
  // Calls back every click to schedule between file times [f0, f1).
  clicks(f0: number, f1: number, emit: (fileTime: number, kind: 'bar' | 'beat' | 'kick', vel: number) => void): void;
}

export class Engine {
  ctx: AudioContext;
  private music: GainNode;
  private clickBus: GainNode;
  buffer: AudioBuffer | null = null;
  private src: AudioBufferSourceNode | null = null;
  playing = false;
  // bumps on every jump of the play position (play, seek, rate / loop change)
  jumpId = 0;
  rate = 1;
  private offset = 0;
  private startCtx = 0;
  loopOn = false;
  loopStart = 0;
  loopEnd = 0;
  private activeLoop = false;
  private schedU = 0;
  private timer = 0;
  metronome = false;
  kickClick = false;
  source: ClickSource | null = null;
  // extra audio -> visual delay in seconds (positive = what you hear is later than reported by the browser)
  fxOffset = 0;

  constructor() {
    this.ctx = new AudioContext({ latencyHint: 'interactive' });
    this.music = this.ctx.createGain();
    this.music.gain.value = 0.9;
    this.music.connect(this.ctx.destination);
    this.clickBus = this.ctx.createGain();
    this.clickBus.gain.value = 0.55;
    this.clickBus.connect(this.ctx.destination);
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  decode(data: ArrayBuffer) { return this.ctx.decodeAudioData(data); }

  setBuffer(b: AudioBuffer | null) {
    this.stopSrc();
    this.playing = false;
    this.buffer = b;
    this.offset = 0;
  }

  get duration() { return this.buffer?.duration ?? 0; }
  setVolume(v: number) { this.music.gain.value = v; }

  latency() {
    const c = this.ctx as AudioContext & { outputLatency?: number };
    return c.outputLatency || c.baseLatency || 0;
  }

  // Unwrapped file time (ignores the loop), at a given context time.
  private unwrappedAt(ctxTime: number) {
    if (!this.playing) return this.offset;
    return this.offset + Math.max(0, ctxTime - this.startCtx) * this.rate;
  }

  private wrap(u: number) {
    if (!this.activeLoop || u < this.loopEnd) return u;
    const L = this.loopEnd - this.loopStart;
    return this.loopStart + ((u - this.loopEnd) % L);
  }

  // Audible position in the file (latency compensated, loop aware).
  position() {
    if (!this.playing) return this.offset;
    const p = this.wrap(this.unwrappedAt(this.ctx.currentTime - this.latency() - this.fxOffset));
    return Math.min(p, this.duration);
  }

  play(from = this.position()) {
    if (!this.buffer) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.stopSrc();
    from = Math.max(0, Math.min(from, this.duration - 0.01));
    const s = this.ctx.createBufferSource();
    s.buffer = this.buffer;
    s.playbackRate.value = this.rate;
    this.activeLoop = this.loopOn && this.loopEnd - this.loopStart > 0.2 && from < this.loopEnd;
    if (this.activeLoop) { s.loop = true; s.loopStart = this.loopStart; s.loopEnd = this.loopEnd; }
    s.connect(this.music);
    this.startCtx = this.ctx.currentTime + 0.03;
    s.start(this.startCtx, from);
    s.onended = () => { if (this.src === s) { this.playing = false; this.offset = 0; this.src = null; } };
    this.src = s;
    this.offset = from;
    this.schedU = from;
    this.playing = true;
    this.jumpId++;
  }

  pause() {
    if (!this.playing) return;
    this.offset = this.position();
    this.stopSrc();
    this.playing = false;
  }

  toggle() { if (this.playing) this.pause(); else this.play(); }

  seek(t: number) {
    t = Math.max(0, Math.min(t, this.duration));
    if (this.playing) this.play(t);
    else this.offset = t;
  }

  setRate(r: number) {
    const p = this.position();
    this.rate = r;
    if (this.playing) this.play(p);
  }

  setLoop(on: boolean, start: number, end: number) {
    const changed = on !== this.loopOn || Math.abs(start - this.loopStart) > 1e-4 || Math.abs(end - this.loopEnd) > 1e-4;
    this.loopOn = on; this.loopStart = start; this.loopEnd = end;
    if (changed && this.playing) this.play(this.position());
  }

  private stopSrc() {
    if (this.src) {
      this.src.onended = null;
      try { this.src.stop(); } catch { /* not started */ }
      this.src.disconnect();
      this.src = null;
    }
  }

  // Map an unwrapped range to file spans (splits at the loop seam).
  private spans(u0: number, u1: number, cb: (f0: number, f1: number, uAtF0: number) => void) {
    let u = u0;
    let guard = 0;
    while (u < u1 - 1e-9 && guard++ < 8) {
      const f = this.wrap(u);
      let end = u1;
      if (this.activeLoop) end = u < this.loopEnd ? Math.min(u1, this.loopEnd) : Math.min(u1, u + (this.loopEnd - f));
      cb(f, f + (end - u), u);
      u = end;
    }
  }

  private schedule() {
    if (!this.playing || !this.source || (!this.metronome && !this.kickClick)) {
      if (this.playing) this.schedU = this.unwrappedAt(this.ctx.currentTime);
      return;
    }
    const now = this.ctx.currentTime;
    const uEnd = this.unwrappedAt(now + 0.12);
    const u0 = Math.max(this.schedU, this.unwrappedAt(now));
    if (uEnd <= u0) return;
    this.spans(u0, uEnd, (f0, f1, uAtF0) => {
      this.source!.clicks(f0, f1, (ft, kind, vel) => {
        if (kind === 'kick' ? !this.kickClick : !this.metronome) return;
        const at = this.startCtx + (uAtF0 + (ft - f0) - this.offset) / this.rate;
        if (at >= now - 0.005) this.click(at, kind, vel);
      });
    });
    this.schedU = uEnd;
  }

  private click(at: number, kind: 'bar' | 'beat' | 'kick', vel: number) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    if (kind === 'kick') {
      o.type = 'sine';
      o.frequency.setValueAtTime(160, at);
      o.frequency.exponentialRampToValueAtTime(48, at + 0.07);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(0.9 * vel, at + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.11);
    } else {
      o.type = 'square';
      o.frequency.value = kind === 'bar' ? 1760 : 1175;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(kind === 'bar' ? 0.32 : 0.2, at + 0.001);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.035);
    }
    o.connect(g).connect(this.clickBus);
    o.start(at);
    o.stop(at + 0.15);
  }

  dispose() {
    clearInterval(this.timer);
    this.stopSrc();
    this.ctx.close();
  }
}
