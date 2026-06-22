const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;

export function createHornSystem() {
  let context;
  let compressor;
  let lastHornAt = -Infinity;

  function ensureContext() {
    if (!AudioContextClass) return false;
    if (!context) {
      context = new AudioContextClass();
      compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.ratio.value = 8;
      compressor.connect(context.destination);
    }
    if (context.state === "suspended") context.resume();
    return true;
  }

  function play() {
    const now = performance.now();
    if (now - lastHornAt < 380 || !ensureContext()) return;
    lastHornAt = now;

    const start = context.currentTime;
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1250;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.13, start + 0.025);
    gain.gain.setValueAtTime(0.13, start + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.38);
    filter.connect(gain).connect(compressor);

    for (const [frequency, level] of [
      [370, 1],
      [466, 0.72],
    ]) {
      const oscillator = context.createOscillator();
      const voiceGain = context.createGain();
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.linearRampToValueAtTime(frequency * 0.985, start + 0.35);
      voiceGain.gain.value = level;
      oscillator.connect(voiceGain).connect(filter);
      oscillator.start(start);
      oscillator.stop(start + 0.4);
    }
  }

  return { play };
}
