// Sound effects for the big screen, made with the Web Audio API so there are no files to load.
// Browsers keep audio silent until the page has had a click or key press; unlockAudio() is
// called from the first one. Everything here is a no-op when muted or unsupported.
const MUTE_KEY = 'collect7.muted';
const VOLUME = 0.22;

let ctx = null;
let master = null;
let noise = null;
let muted = false;
try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  // Storage unavailable: sound just starts on.
}

export const isMuted = () => muted;

export function setMuted(value) {
  muted = Boolean(value);
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Not remembered next time.
  }
}

// The shared audio context, started on first use.
function audio() {
  if (muted) return null;
  if (!ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    ctx = new AudioContextClass();
    master = ctx.createGain();
    master.gain.value = VOLUME;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function unlockAudio() {
  const c = audio();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

function noiseBuffer(c) {
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

// A burst of filtered noise that fades out: the swish of a card, the crash of a bust.
function burst(c, { at = 0, duration = 0.15, type = 'bandpass', frequency = 2500, q = 0.8, gain = 1 }) {
  const source = c.createBufferSource();
  source.buffer = noiseBuffer(c);
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = q;
  const envelope = c.createGain();
  const start = c.currentTime + at;
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter).connect(envelope).connect(master);
  source.start(start, Math.random() * 0.2);
  source.stop(start + duration + 0.05);
}

// A pitched note that can glide: { from, to } in Hz.
function tone(c, { at = 0, duration = 0.2, type = 'sine', from, to = from, gain = 0.8, lowpass = 0 }) {
  const osc = c.createOscillator();
  osc.type = type;
  const start = c.currentTime + at;
  osc.frequency.setValueAtTime(from, start);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, start + duration);
  const envelope = c.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.015);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  let node = osc;
  if (lowpass) {
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    node = osc.connect(filter);
  }
  node.connect(envelope).connect(master);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

// A card starts to turn over.
export function flip() {
  const c = audio();
  if (!c) return;
  burst(c, { duration: 0.16, frequency: 3200, q: 0.7, gain: 0.9 });
  burst(c, { at: 0.07, duration: 0.12, frequency: 1800, q: 0.9, gain: 0.5 });
}

// The card lands face-up.
export function land() {
  const c = audio();
  if (!c) return;
  tone(c, { duration: 0.09, from: 190, to: 110, gain: 0.9 });
  burst(c, { duration: 0.05, type: 'lowpass', frequency: 700, gain: 0.5 });
}

// A bust: a falling note and a thud.
export function bust() {
  const c = audio();
  if (!c) return;
  tone(c, { duration: 0.7, type: 'sawtooth', from: 260, to: 55, gain: 0.7, lowpass: 900 });
  tone(c, { at: 0.02, duration: 0.5, from: 90, to: 40, gain: 0.9 });
  burst(c, { duration: 0.35, type: 'lowpass', frequency: 1200, gain: 0.6 });
}

// Points banked: a bright two-note chime.
export function bank() {
  const c = audio();
  if (!c) return;
  tone(c, { duration: 0.35, type: 'triangle', from: 659, gain: 0.7 });
  tone(c, { at: 0.12, duration: 0.5, type: 'triangle', from: 988, gain: 0.7 });
}

// Frozen: a glassy, shimmering sweep.
export function freeze() {
  const c = audio();
  if (!c) return;
  tone(c, { duration: 0.7, type: 'sine', from: 2200, to: 1100, gain: 0.45 });
  tone(c, { at: 0.08, duration: 0.7, type: 'sine', from: 3300, to: 1650, gain: 0.3 });
  burst(c, { duration: 0.4, type: 'highpass', frequency: 5000, gain: 0.35 });
}

// Collect 7: a rising fanfare.
export function collect() {
  const c = audio();
  if (!c) return;
  [523, 659, 784, 1047].forEach((frequency, i) => tone(c, { at: i * 0.11, duration: 0.45, type: 'triangle', from: frequency, gain: 0.7 }));
  tone(c, { at: 0.44, duration: 0.9, type: 'sine', from: 1319, gain: 0.5 });
}
