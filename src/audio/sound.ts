// All sounds are synthesised with WebAudio, so there are no audio files to load.
// Each hit is layered: a sharp transient for the click, a pitched body for the weight, and a
// low thump you feel more than hear. A short synthetic reverb puts it all in a room.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let dry: GainNode | null = null;
let wet: GainNode | null = null;
let noise: AudioBuffer | null = null;
let rollGain: GainNode | null = null;
let volume = 0.8;

function ac(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = volume;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);

  dry = ctx.createGain();
  dry.connect(master);
  wet = ctx.createGain();
  wet.gain.value = 0.22;
  const verb = ctx.createConvolver();
  verb.buffer = impulse(ctx, 1.4);
  wet.connect(verb).connect(master);

  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  // A quiet looping rumble whose level follows how fast the balls are rolling.
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 260;
  rollGain = ctx.createGain();
  rollGain.gain.value = 0;
  src.connect(lp).connect(rollGain).connect(dry);
  src.start();
  return ctx;
}

function impulse(c: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  return buf;
}

/** Browsers only allow audio after a user gesture. Call from any click. */
export function unlockAudio() {
  const c = ac();
  if (c && c.state === 'suspended') void c.resume();
}

export function setVolume(v: number) {
  volume = v;
  if (master) master.gain.value = v;
}

function out(reverb: number): AudioNode[] {
  const nodes: AudioNode[] = [dry!];
  if (reverb > 0) nodes.push(wet!);
  return nodes;
}

function burst(o: { freq: number; q: number; gain: number; decay: number; type?: BiquadFilterType; delay?: number; reverb?: number }) {
  const c = ac();
  if (!c || !noise || volume === 0) return;
  const t = c.currentTime + (o.delay ?? 0);
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.frequency.value = o.freq;
  f.Q.value = o.q;
  const g = c.createGain();
  g.gain.setValueAtTime(o.gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.decay);
  src.connect(f).connect(g);
  for (const n of out(o.reverb ?? 0.3)) g.connect(n);
  src.start(t, Math.random() * 0.5);
  src.stop(t + o.decay + 0.02);
}

function tone(o: { freq: number; to?: number; gain: number; decay: number; delay?: number; type?: OscillatorType; reverb?: number }) {
  const c = ac();
  if (!c || volume === 0) return;
  const t = c.currentTime + (o.delay ?? 0);
  const osc = c.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.decay);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.gain, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.decay);
  osc.connect(g);
  for (const n of out(o.reverb ?? 0.3)) g.connect(n);
  osc.start(t);
  osc.stop(t + o.decay + 0.02);
}

function buzz(ms: number) {
  try { navigator.vibrate?.(ms); } catch { /* not supported */ }
}

let lastClick = 0;

export const sfx = {
  ball(speed: number) {
    const now = performance.now();
    if (now - lastClick < 10) return;
    lastClick = now;
    const v = Math.min(1, speed / 3000);
    if (v < 0.008) return;
    const g = Math.pow(v, 0.7);
    // Phenolic resin balls ring briefly at a couple of high partials.
    tone({ freq: 2750 + v * 500, gain: 0.1 + g * 0.55, decay: 0.045 });
    tone({ freq: 4600 + v * 700, gain: 0.05 + g * 0.3, decay: 0.025 });
    burst({ freq: 5200, q: 1.2, gain: 0.08 + g * 0.6, decay: 0.018 });
    // Body.
    tone({ freq: 950, to: 700, gain: 0.05 + g * 0.35, decay: 0.05, type: 'triangle' });
    if (v > 0.55) {
      burst({ freq: 140, q: 0.8, gain: v * 0.7, decay: 0.12, type: 'lowpass' });
      buzz(12);
    }
  },
  cushion(speed: number) {
    const v = Math.min(1, speed / 3000);
    if (v < 0.02) return;
    burst({ freq: 200, q: 1, gain: 0.2 + v * 0.8, decay: 0.14, type: 'lowpass' });
    tone({ freq: 110, to: 70, gain: 0.1 + v * 0.5, decay: 0.12 });
  },
  pot(speed: number) {
    const v = Math.min(1, speed / 2200);
    // The drop: a soft knock on the leather, then the ball landing in the pocket.
    burst({ freq: 420, q: 1, gain: 0.3 + v * 0.3, decay: 0.08, type: 'lowpass' });
    tone({ freq: 90, to: 48, gain: 0.55 + v * 0.35, decay: 0.32, delay: 0.05 });
    burst({ freq: 900, q: 3, gain: 0.22, decay: 0.06, delay: 0.12 });
    burst({ freq: 700, q: 3, gain: 0.16, decay: 0.06, delay: 0.2 });
    burst({ freq: 120, q: 1, gain: 0.45, decay: 0.3, type: 'lowpass', delay: 0.24 });
    buzz(22);
  },
  strike(power: number) {
    const p = Math.min(1, Math.max(0, power));
    // Leather tip on resin: crisp click plus a deep "thock" that grows with power.
    burst({ freq: 3400, q: 1.4, gain: 0.25 + p * 0.55, decay: 0.03 });
    tone({ freq: 240, to: 95, gain: 0.25 + p * 0.6, decay: 0.09 + p * 0.05 });
    tone({ freq: 1500, to: 1100, gain: 0.08 + p * 0.25, decay: 0.04, type: 'triangle' });
    burst({ freq: 110, q: 0.7, gain: p * 0.9, decay: 0.16, type: 'lowpass' });
    buzz(Math.round(8 + p * 35));
  },
  /** Total rolling speed of everything on the table (mm/s). */
  roll(total: number) {
    if (!rollGain || !ctx) return;
    const target = Math.min(0.22, total / 30000);
    rollGain.gain.setTargetAtTime(target, ctx.currentTime, 0.05);
  },
  turn() {
    tone({ freq: 784, gain: 0.12, decay: 0.25, reverb: 0.5 });
    tone({ freq: 1175, gain: 0.1, decay: 0.35, delay: 0.09, reverb: 0.5 });
  },
  foul() {
    tone({ freq: 330, gain: 0.12, decay: 0.3, type: 'triangle' });
    tone({ freq: 247, gain: 0.12, decay: 0.4, delay: 0.12, type: 'triangle' });
  },
  pop() {
    tone({ freq: 660, gain: 0.08, decay: 0.12, type: 'triangle' });
  },
};
