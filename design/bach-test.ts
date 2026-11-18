import { bach, BACH_TRACKS, BachTrackId } from '../game/audio/bach';

const LEVELS = ['0 · clavecin seul', '1 · + hook, basse arpégée, sub', '2 · + kick 4/4, clap, pump, nappes', '3 · + guitares, risers', '4 · + orgue, lead saw', '5 · + chœur, double kick', '6 · CARNAGE'];

const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
const tracksEl = $<HTMLDivElement>('#tracks');
const intEl = $<HTMLInputElement>('#int');
const volEl = $<HTMLInputElement>('#vol');
const lvlEl = $<HTMLSpanElement>('#lvl');

function refresh() {
  const cur = bach.isPlaying() ? bach.current() : null;
  tracksEl.querySelectorAll<HTMLButtonElement>('.track').forEach((b) => b.classList.toggle('on', b.dataset.id === cur));
  lvlEl.textContent = LEVELS[+intEl.value];
}

for (const t of BACH_TRACKS) {
  const b = document.createElement('button');
  b.className = 'track';
  b.dataset.id = t.id;
  b.innerHTML = `<b>${t.title}</b><i>${t.bwv} · ${t.bpm} BPM</i><small>${t.subtitle}</small>`;
  b.addEventListener('click', () => {
    bach.init();
    bach.setVolume(+volEl.value);
    bach.play(t.id as BachTrackId, +intEl.value);
    refresh();
  });
  tracksEl.appendChild(b);
}

intEl.addEventListener('input', () => {
  bach.setIntensity(+intEl.value);
  refresh();
});
volEl.addEventListener('input', () => bach.setVolume(+volEl.value));
$<HTMLButtonElement>('#stop').addEventListener('click', () => {
  bach.stop(0.6);
  setTimeout(refresh, 50);
});
document.querySelectorAll<HTMLButtonElement>('[data-sting]').forEach((b) =>
  b.addEventListener('click', () => {
    bach.init();
    bach.sting(b.dataset.sting as 'finale' | 'boss' | 'death' | 'carnage');
  }),
);

const dots = Array.from(document.querySelectorAll<HTMLSpanElement>('#beat span'));
bach.onBeat((beat, bar) => {
  $('#bar').textContent = String(bar + 1);
  dots.forEach((d, i) => d.classList.toggle('on', i === beat % 4));
});

const cv = $<HTMLCanvasElement>('#scope');
const g = cv.getContext('2d') as CanvasRenderingContext2D;
let buf: Float32Array<ArrayBuffer> | null = null;
let freq: Uint8Array<ArrayBuffer> | null = null;
let clips = 0;
let peakHold = 0;

function draw() {
  requestAnimationFrame(draw);
  const an = bach.analyser();
  const W = cv.width;
  const H = cv.height;
  g.fillStyle = '#05040a';
  g.fillRect(0, 0, W, H);
  if (!an) return;
  if (!buf || buf.length !== an.fftSize) buf = new Float32Array(an.fftSize);
  if (!freq || freq.length !== an.frequencyBinCount) freq = new Uint8Array(an.frequencyBinCount);
  an.getFloatTimeDomainData(buf);
  an.getByteFrequencyData(freq);

  const bins = 160;
  const bw = W / bins;
  for (let i = 0; i < bins; i++) {
    const idx = Math.floor(Math.pow(i / bins, 2) * freq.length);
    const v = freq[idx] / 255;
    g.fillStyle = `rgba(255,45,111,${0.15 + v * 0.5})`;
    g.fillRect(i * bw, H - v * H, bw - 1, v * H);
  }

  let start = 0;
  for (let i = 1; i < buf.length / 2; i++) {
    if (buf[i - 1] < 0 && buf[i] >= 0) {
      start = i;
      break;
    }
  }
  const n = Math.min(1024, buf.length - start);
  g.strokeStyle = '#00ffd5';
  g.lineWidth = 3;
  g.beginPath();
  let pk = 0;
  let sq = 0;
  for (let i = 0; i < buf.length; i++) {
    const a = Math.abs(buf[i]);
    if (a > pk) pk = a;
    sq += buf[i] * buf[i];
  }
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * W;
    const y = H / 2 - buf[start + i] * (H / 2) * 0.95;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.stroke();

  if (pk >= 0.999) clips++;
  peakHold = Math.max(pk, peakHold * 0.97);
  const db = (v: number) => (v > 0 ? (20 * Math.log10(v)).toFixed(1) + ' dB' : '-∞');
  $('#peak').textContent = db(peakHold);
  $('#rms').textContent = db(Math.sqrt(sq / buf.length));
  $('#clip').textContent = String(clips);
}

refresh();
draw();
