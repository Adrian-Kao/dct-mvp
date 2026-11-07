/** "環境音抽成低頻吸入聲": a short synthesized whoosh that sweeps down into a low hum. */
export function playInhaleSound(durationSeconds = 1.2): void {
  const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    const context = new AudioContextClass();
    const now = context.currentTime;
    const end = now + durationSeconds;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.5, now + durationSeconds * 0.55);
    master.gain.exponentialRampToValueAtTime(0.0001, end);
    master.connect(context.destination);

    const noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * durationSeconds), context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const noise = context.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(70, end);
    noise.connect(filter).connect(master);

    const hum = context.createOscillator();
    hum.type = "sine";
    hum.frequency.setValueAtTime(180, now);
    hum.frequency.exponentialRampToValueAtTime(38, end);
    const humGain = context.createGain();
    humGain.gain.value = 0.6;
    hum.connect(humGain).connect(master);

    noise.start(now);
    hum.start(now);
    noise.stop(end);
    hum.stop(end);
    window.setTimeout(() => void context.close(), (durationSeconds + 0.3) * 1000);
  } catch {
    // Sound is decoration; the experience continues silently if audio is blocked.
  }
}
