// Synthesized sound, no audio files: engine hum, sirens, gunshots, pickup chimes,
// explosions, and a two-station radio loop — a bassline and arpeggio sequenced live
// with the Web Audio API, a different tempo and feel per station. Everything is
// guarded: audio only starts after a user gesture, and a missing AudioContext is
// silence, not an error.
import { RADIO } from './config.js';

// Minor-pentatonic steps for GAMELAN FM, major-ish steps for RADIO WILWATIKTA.
const SCALES = [[0, 3, 5, 7, 10, 12, 15], [0, 2, 4, 7, 9, 12, 14]];
const PATTERNS = [
  [0, -1, 2, -1, 4, -1, 3, 5, 0, -1, 2, 6, 4, 3, 2, 1],
  [0, 2, -1, 4, -1, 3, 2, -1, 0, 4, -1, 5, 3, -1, 2, 1],
];

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenTimer = 0;
  let sirenHigh = false;
  let nextNote = 0;
  let noteStep = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, gainValue, slideTo, when) {
    if (!ctx) return;
    try {
      const t0 = when ?? ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(gainValue, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur);
    } catch {
      // Audio is best-effort.
    }
  }

  function noise(dur, gainValue, lowpass) {
    if (!ctx) return;
    try {
      const length = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(gainValue, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      if (lowpass) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = lowpass;
        source.connect(filter).connect(gain).connect(ctx.destination);
      } else {
        source.connect(gain).connect(ctx.destination);
      }
      source.start();
    } catch {
      // Audio is best-effort.
    }
  }

  function startEngine() {
    if (!ctx || engineOsc) return;
    try {
      engineOsc = ctx.createOscillator();
      engineGain = ctx.createGain();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain).connect(ctx.destination);
      engineOsc.start();
    } catch {
      engineOsc = null;
    }
  }

  /** Call on the first user gesture; returns whether audio is live. */
  function unlock() {
    if (!ensure()) return false;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    startEngine();
    nextNote = ctx.currentTime + 0.1;
    return true;
  }

  /** Schedule the radio loop a little ahead of the playhead. */
  function radio(world) {
    if (!ctx || world.muted) return;
    const station = RADIO[world.station] ?? RADIO[0];
    const stepDur = 60 / station.bpm / 2;
    const scale = SCALES[world.station] ?? SCALES[0];
    const pattern = PATTERNS[world.station] ?? PATTERNS[0];
    while (nextNote < ctx.currentTime + 0.25) {
      const idx = pattern[noteStep % pattern.length];
      if (idx >= 0) {
        const freq = station.root * 2 * Math.pow(2, scale[idx % scale.length] / 12);
        tone(freq, stepDur * 0.9, 'triangle', 0.035, null, nextNote);
      }
      if (noteStep % 4 === 0) tone(station.root, stepDur * 1.8, 'sine', 0.05, null, nextNote);
      nextNote += stepDur;
      noteStep += 1;
    }
  }

  /** Per-frame audio: engine pitch follows speed, sirens wail while wanted, radio plays. */
  function step(world, dt) {
    if (!ctx) return;
    if (world.muted) {
      if (engineGain) engineGain.gain.value = 0;
      return;
    }
    radio(world);
    const player = world.player;
    if (engineGain) {
      const target = !player.onFoot && player.car ? 0.05 + (Math.abs(player.speed) / 560) * 0.06 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      if (engineOsc) engineOsc.frequency.setTargetAtTime(55 + Math.abs(player.speed) * 0.16, ctx.currentTime, 0.1);
    }
    if (world.siren) {
      sirenTimer -= dt;
      if (sirenTimer <= 0) {
        sirenTimer = 0.42;
        sirenHigh = !sirenHigh;
        tone(sirenHigh ? 880 : 660, 0.4, 'sine', 0.045);
      }
    }
    if (world.gunshot) {
      noise(0.12, 0.25, 3000);
      world.gunshot = false;
    }
    if (world.explosion) {
      noise(0.7, 0.4, 800);
      world.explosion = false;
    }
    if (world.punchHit) {
      noise(0.08, 0.2, 1200);
      world.punchHit = false;
    }
    if (world.horn) {
      tone(370, 0.25, 'square', 0.05);
      world.horn = false;
    }
  }

  function chime() {
    tone(880, 0.12, 'sine', 0.08);
    setTimeout(() => tone(1318, 0.18, 'sine', 0.08), 110);
  }

  return { unlock, step, chime, tone };
}
