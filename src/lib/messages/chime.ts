/*
 * The studio chime: what a new message sounds like. A letter slides under the
 * door (a soft paper swish), then a little music-box tune plays in a warm
 * room. Every studio has its own tune, picked from the sender's handle, so
 * after a while you can tell who wrote by ear. All notes sit in D major
 * pentatonic, so any tune is sweet and they never clash.
 *
 * Synthesized with the Web Audio API: no sound files to download. Browsers
 * only let a page make sound after the person has interacted with it, so the
 * audio unlocks on the first click or key press (`armChime()`).
 */

const NOTE = {
  D5: 587.33,
  "F#5": 739.99,
  A5: 880,
  B5: 987.77,
  D6: 1174.66,
  E6: 1318.51,
  "F#6": 1479.98,
} as const;

type Note = keyof typeof NOTE;

const TUNES: Note[][] = [
  ["A5", "D6"],
  ["F#5", "A5", "D6"],
  ["D5", "F#5", "A5"],
  ["B5", "D6"],
  ["A5", "B5", "D6"],
  ["D6", "F#6"],
  ["F#5", "D6", "A5"],
  ["E6", "D6", "A5"],
];

const VOLUME = 0.32;
const ROOM = 0.26;
/** Several messages at once ring once. */
const QUIET_FOR_MS = 1500;

let context: AudioContext | null = null;
let room: ConvolverNode | null = null;
let lastRing = 0;
let armed = false;

function hash(text: string) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** The tune a studio rings with. */
export function tuneFor(handle: string) {
  return TUNES[hash(handle) % TUNES.length];
}

function audio() {
  if (context) return context;
  const Ctor = typeof window === "undefined" ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!Ctor) return null;
  context = new Ctor();
  room = context.createConvolver();
  room.buffer = roomEcho(context);
  const wet = context.createGain();
  wet.gain.value = ROOM;
  room.connect(wet).connect(context.destination);
  return context;
}

/** A small, soft room: decaying stereo noise as the reverb's impulse. */
function roomEcho(ctx: AudioContext, seconds = 1.6) {
  const length = Math.round(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3.2;
  }
  return buffer;
}

/** A music-box tine: a clean tone, a glassy overtone that fades fast, and a breath of warmth an octave up. */
function pluck(ctx: AudioContext, out: AudioNode, frequency: number, at: number, level: number) {
  const partials: [ratio: number, gain: number, decay: number, type: OscillatorType][] = [
    [1, level, 1.5, "sine"],
    [3.01, level * 0.18, 0.22, "sine"],
    [2, level * 0.07, 0.6, "triangle"],
  ];
  for (const [ratio, gain, decay, type] of partials) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency * ratio;
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(gain, at + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    osc.connect(envelope).connect(out);
    osc.start(at);
    osc.stop(at + decay + 0.05);
  }
}

/** Paper sliding under the door: filtered noise sweeping up, very quiet. */
function swish(ctx: AudioContext, out: AudioNode, at: number) {
  const seconds = 0.34;
  const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 0.9;
  band.frequency.setValueAtTime(700, at);
  band.frequency.exponentialRampToValueAtTime(2600, at + 0.26);
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, at);
  envelope.gain.linearRampToValueAtTime(0.06, at + 0.07);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  noise.connect(band).connect(envelope).connect(out);
  noise.start(at);
}

/** Rings the studio's tune. Quietly does nothing until the page may make sound. */
export function ringChime(handle: string) {
  const now = performance.now();
  if (now - lastRing < QUIET_FOR_MS) return;
  // A click anywhere on the page, even before the chime was armed, lets it play.
  const clicked = typeof navigator !== "undefined" && navigator.userActivation?.hasBeenActive;
  const ctx = context ?? (clicked ? audio() : null);
  if (!ctx || !room) return;
  if (ctx.state === "running") return play(ctx, room, handle, now);
  if (clicked) void ctx.resume().then(() => ctx.state === "running" && play(ctx, room!, handle, now));
}

function play(ctx: AudioContext, room: ConvolverNode, handle: string, now: number) {
  lastRing = now;

  const master = ctx.createGain();
  master.gain.value = VOLUME;
  master.connect(ctx.destination);
  const echo = ctx.createGain();
  echo.gain.value = VOLUME;
  echo.connect(room);

  const start = ctx.currentTime + 0.03;
  swish(ctx, master, start);
  tuneFor(handle).forEach((note, i) => {
    const at = start + 0.13 + i * 0.12;
    const level = 0.5 - i * 0.06;
    pluck(ctx, master, NOTE[note], at, level);
    pluck(ctx, echo, NOTE[note], at, level * 0.6);
  });
  // Once the room has rung out, let the nodes go.
  setTimeout(() => {
    master.disconnect();
    echo.disconnect();
  }, 3500);
}

/**
 * Lets the chime play: browsers start audio only from a click or key press,
 * so the first one on the page wakes the audio up (silently).
 */
export function armChime() {
  if (armed || typeof window === "undefined") return;
  armed = true;
  const wake = () => {
    const ctx = audio();
    if (!ctx) return;
    void ctx.resume().then(() => {
      if (ctx.state !== "running") return;
      window.removeEventListener("pointerdown", wake, true);
      window.removeEventListener("keydown", wake, true);
    });
  };
  window.addEventListener("pointerdown", wake, true);
  window.addEventListener("keydown", wake, true);
}

/** A sample, from a click (turning the sound on): wakes the audio and rings right away. */
export async function previewChime(handle: string) {
  const ctx = audio();
  if (!ctx) return;
  await ctx.resume();
  lastRing = -QUIET_FOR_MS;
  ringChime(handle);
}
