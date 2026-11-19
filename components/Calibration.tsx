import React, { useEffect, useRef, useState } from 'react';
import { music } from '../game/audio/music';

// Rhythm calibration: tap on the clicks you hear. The median error minus the latency the browser already
// reports is the extra delay of the audio output (Bluetooth, sound card). Stored in localStorage
// ('ch-fx-offset-ms'), shared by the game, the music studio and the bible bench.
const KEY = 'ch-fx-offset-ms';
const TAPS = 12;
const BPM = 110;

export const readSyncOffset = (): number | null => {
  try { const v = localStorage.getItem(KEY); return v === null ? null : parseFloat(v) || 0; } catch { return null; }
};
const writeSyncOffset = (ms: number) => {
  try { localStorage.setItem(KEY, String(Math.round(ms))); } catch { /* private mode */ }
  music.refreshSync();
};

export const CalibrationScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [phase, setPhase] = useState<'intro' | 'run' | 'done'>('intro');
  const [taps, setTaps] = useState<number[]>([]);
  const [offset, setOffset] = useState<number>(() => readSyncOffset() ?? 0);
  const [result, setResult] = useState<{ ms: number; spread: number } | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const clicks = useRef<number[]>([]);
  const timer = useRef(0);
  const [beat, setBeat] = useState(-1);

  const stopClicks = () => { clearInterval(timer.current); };

  const start = () => {
    const c = ctx.current ?? new AudioContext({ latencyHint: 'interactive' });
    ctx.current = c;
    if (c.state === 'suspended') c.resume();
    stopClicks();
    clicks.current = [];
    setTaps([]);
    setResult(null);
    setPhase('run');
    const t0 = c.currentTime + 0.5;
    const B = 60 / BPM;
    let n = 0;
    timer.current = window.setInterval(() => {
      while (t0 + n * B < c.currentTime + 0.15 && n < TAPS + 8) {
        const at = t0 + n * B;
        clicks.current.push(at);
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'square'; o.frequency.value = n % 4 === 0 ? 1760 : 1175;
        g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(n % 4 === 0 ? 0.4 : 0.26, at + 0.001); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
        o.connect(g).connect(c.destination); o.start(at); o.stop(at + 0.07);
        n++;
      }
      // beat counter for the visual metronome (scheduled time, not heard time: tap on the SOUND)
      const k = Math.floor((c.currentTime - t0) / B);
      setBeat(k);
    }, 20);
  };

  const finish = (all: number[]) => {
    stopClicks();
    const c = ctx.current!;
    const errs = all.slice(2).sort((a, b) => a - b);
    const med = errs[Math.floor(errs.length / 2)];
    const spread = errs[errs.length - 2] - errs[1];
    const lat = (c as AudioContext & { outputLatency?: number }).outputLatency || c.baseLatency || 0;
    const ms = Math.round((med - lat) * 1000);
    setOffset(ms);
    writeSyncOffset(ms);
    setResult({ ms, spread: Math.round(spread * 1000) });
    setPhase('done');
  };

  const tap = (eventTime: number) => {
    const c = ctx.current;
    if (phase !== 'run' || !c || !clicks.current.length) return;
    const t = c.currentTime - Math.max(0, performance.now() - eventTime) / 1000;
    let best = Infinity;
    for (const k of clicks.current) if (Math.abs(t - k) < Math.abs(best)) best = t - k;
    if (Math.abs(best) > 0.4) return;
    setTaps((prev) => {
      const next = [...prev, best];
      if (next.length >= TAPS) setTimeout(() => finish(next), 0);
      return next;
    });
  };

  useEffect(() => {
    music.duck(1, 3600);
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); return; }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault(); e.stopPropagation();
        if (phase === 'run') tap(e.timeStamp || performance.now());
        else if (phase === 'intro') start();
        else if (e.key === 'Enter') onClose();
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    let raf = 0, prev = false;
    const pad = () => {
      raf = requestAnimationFrame(pad);
      const p = navigator.getGamepads ? Array.from(navigator.getGamepads()).find(Boolean) : null;
      const a = !!p?.buttons[0]?.pressed;
      if (a && !prev) { if (phase === 'run') tap(performance.now()); else if (phase === 'intro') start(); }
      prev = a;
    };
    raf = requestAnimationFrame(pad);
    return () => { window.removeEventListener('keydown', onKey, { capture: true }); cancelAnimationFrame(raf); };
  }, [phase]);

  useEffect(() => () => { stopClicks(); music.duck(0, 0.01); ctx.current?.close(); }, []);

  const nudge = (d: number) => { const v = offset + d; setOffset(v); writeSyncOffset(v); };

  return (
    <div className="modal-back fadein">
      <div className="panel calib">
        <h2 className="shout">CALAGE DU RYTHME</h2>
        {phase === 'intro' && (
          <>
            <p>Ton casque ou tes enceintes ajoutent un petit retard au son (surtout en <b>Bluetooth</b>). Sans calage, tes frappes en rythme tombent à côté.</p>
            <p>Tu vas entendre des clics. <b>Tape ESPACE pile sur chaque clic que tu entends</b> ({TAPS} fois). Écoute le son, pas l'écran.</p>
            <p className="calib-now">Calage actuel : <b>{readSyncOffset() === null ? 'jamais fait' : `${offset > 0 ? '+' : ''}${offset} ms`}</b></p>
          </>
        )}
        {phase === 'run' && (
          <div className="calib-run">
            <div className={`calib-dot ${beat >= 0 && beat % 4 === 0 ? 'bar' : ''}`} key={beat} />
            <div className="calib-count">{taps.length} / {TAPS}</div>
            <div className="calib-dots">{Array.from({ length: TAPS }, (_, i) => <i key={i} className={i < taps.length ? 'on' : ''} />)}</div>
            <p>Tape <b>ESPACE</b> sur chaque clic.</p>
          </div>
        )}
        {phase === 'done' && result && (
          <div className="calib-done">
            <div className="calib-ms">{result.ms > 0 ? '+' : ''}{result.ms} ms</div>
            <p>{Math.abs(result.ms) < 20 ? 'Ta sortie audio est quasiment sans retard.' : `Ta sortie audio ajoute environ ${Math.abs(result.ms)} ms. C'est corrigé dans tout le jeu.`}</p>
            {result.spread > 110 && <p className="calib-warn">Frappes assez irrégulières : refais le calage pour confirmer.</p>}
          </div>
        )}
        {phase !== 'run' && (
          <div className="calib-fine">
            <span>Ajuster à l'oreille</span>
            <button className="toggle" onClick={() => nudge(-5)}>−5 ms</button>
            <b>{offset > 0 ? '+' : ''}{offset} ms</b>
            <button className="toggle" onClick={() => nudge(5)}>+5 ms</button>
            <button className="toggle" onClick={() => { setOffset(0); writeSyncOffset(0); }}>0</button>
          </div>
        )}
        <div className="result-actions" style={{ marginTop: 22 }}>
          {phase !== 'run' && <button className="btn" onClick={start}><span>{phase === 'done' ? 'REFAIRE' : 'COMMENCER'}</span></button>}
          <button className="btn sec" onClick={onClose}><span>{phase === 'done' ? 'TERMINÉ' : 'RETOUR'}</span></button>
        </div>
      </div>
    </div>
  );
};
