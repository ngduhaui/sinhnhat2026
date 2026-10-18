const MELODY: Array<[number, number]> = [
  [262, 0.28],
  [262, 0.14],
  [294, 0.46],
  [262, 0.46],
  [349, 0.46],
  [330, 0.86],
  [262, 0.28],
  [262, 0.14],
  [294, 0.46],
  [262, 0.46],
  [392, 0.46],
  [349, 0.86],
  [262, 0.28],
  [262, 0.14],
  [523, 0.46],
  [440, 0.46],
  [349, 0.46],
  [330, 0.46],
  [294, 0.86],
  [466, 0.28],
  [466, 0.14],
  [440, 0.46],
  [349, 0.46],
  [392, 0.46],
  [349, 1.15],
];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let limiter: DynamicsCompressorNode | null = null;
let timers: number[] = [];
let playing = false;
// Overall loudness of the lullaby. The melody used to sit at ~0.045 peak per
// note, which phones played almost inaudibly; 0.26 is roughly 6× louder and
// still keeps a single note under full scale, so a compressor on the master
// bus only has to catch the rare overlap.
const NOTE_PEAK = 0.26;
// Phone speakers roll off everything below ~500 Hz, so the triangle tone is
// lifted a little at the master and gently compressed instead of clipped.
const MASTER_GAIN = 1.35;

function tone(frequency: number, when: number, duration: number) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = "triangle";
  osc.frequency.value = frequency;
  filter.type = "lowpass";
  filter.frequency.value = 2200;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(NOTE_PEAK, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(duration, 0.08));
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  osc.start(when);
  osc.stop(when + duration + 0.05);
}

function schedule() {
  if (!playing || !ctx) return;
  const start = ctx.currentTime + 0.06;
  let cursor = 0;
  for (const [frequency, duration] of MELODY) {
    tone(frequency, start + cursor, Math.min(duration * 0.85, 0.7));
    cursor += duration;
  }
  timers.push(window.setTimeout(schedule, (cursor + 1.6) * 1000));
}

export function startMusic() {
  if (playing) return;
  playing = true;
  if (!ctx) {
    ctx = new AudioContext();
    // Chain: notes → master gain → limiter → speakers. The limiter keeps the
    // louder setting from clipping when two notes overlap.
    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(limiter);
    limiter.connect(ctx.destination);
  }
  void ctx.resume();
  schedule();
}

export function stopMusic() {
  playing = false;
  for (const timer of timers) window.clearTimeout(timer);
  timers = [];
  void ctx?.suspend();
}
