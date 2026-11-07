/** Station 1 sound effects, synthesized so nothing has to be downloaded. Silent if audio is blocked. */
let shared: AudioContext | null = null;

function audio(): AudioContext | null {
  const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  try {
    shared ??= new AudioContextClass();
    if (shared.state === "suspended") void shared.resume();
    return shared;
  } catch {
    return null;
  }
}

function noiseBurst(context: AudioContext, seconds: number): AudioBufferSourceNode {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * seconds), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  source.buffer = buffer;
  return source;
}

/** 劈空聲: an airy swish that sweeps upward. */
export function playSwish(): void {
  const context = audio();
  if (!context) return;
  try {
    const now = context.currentTime;
    const noise = noiseBurst(context, 0.28);
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.4;
    filter.frequency.setValueAtTime(700, now);
    filter.frequency.exponentialRampToValueAtTime(3800, now + 0.22);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.35, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    noise.connect(filter).connect(gain).connect(context.destination);
    noise.start(now);
    noise.stop(now + 0.3);
  } catch {
    // decoration only
  }
}

/** 碎裂音: a sharp crack with a short wooden thump underneath. */
export function playCrack(): void {
  const context = audio();
  if (!context) return;
  try {
    const now = context.currentTime;
    const noise = noiseBurst(context, 0.18);
    const high = context.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = 1800;
    const crackGain = context.createGain();
    crackGain.gain.setValueAtTime(0.6, now);
    crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    noise.connect(high).connect(crackGain).connect(context.destination);
    const thump = context.createOscillator();
    thump.type = "triangle";
    thump.frequency.setValueAtTime(220, now);
    thump.frequency.exponentialRampToValueAtTime(70, now + 0.14);
    const thumpGain = context.createGain();
    thumpGain.gain.setValueAtTime(0.5, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    thump.connect(thumpGain).connect(context.destination);
    noise.start(now);
    thump.start(now);
    noise.stop(now + 0.2);
    thump.stop(now + 0.2);
  } catch {
    // decoration only
  }
}

/** 彈開: a metallic clank when the blade hits a spot the tokenizer won't split. */
export function playClank(): void {
  const context = audio();
  if (!context) return;
  try {
    const now = context.currentTime;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    gain.connect(context.destination);
    for (const frequency of [1240, 1860, 2730]) {
      const tone = context.createOscillator();
      tone.type = "square";
      tone.frequency.setValueAtTime(frequency, now);
      tone.frequency.exponentialRampToValueAtTime(frequency * 0.94, now + 0.3);
      const partial = context.createGain();
      partial.gain.value = 0.18;
      tone.connect(partial).connect(gain);
      tone.start(now);
      tone.stop(now + 0.36);
    }
  } catch {
    // decoration only
  }
}
