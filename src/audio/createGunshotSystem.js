const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;

export function createGunshotSystem() {
  let context;
  let compressor;
  let noiseBuffer;

  function ensureContext() {
    if (!AudioContextClass) return false;
    if (!context) {
      context = new AudioContextClass();
      compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.knee.value = 10;
      compressor.ratio.value = 10;
      compressor.connect(context.destination);

      noiseBuffer = context.createBuffer(
        1,
        Math.round(context.sampleRate * 0.18),
        context.sampleRate,
      );
      const data = noiseBuffer.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) {
        data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
      }
    }
    if (context.state === "suspended") context.resume();
    return true;
  }

  function play() {
    if (!ensureContext()) return;
    const start = context.currentTime;

    const noise = context.createBufferSource();
    const noiseFilter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    noise.buffer = noiseBuffer;
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 1450;
    noiseFilter.Q.value = 0.7;
    noiseGain.gain.setValueAtTime(0.3, start);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
    noise.connect(noiseFilter).connect(noiseGain).connect(compressor);
    noise.start(start);

    const punch = context.createOscillator();
    const punchGain = context.createGain();
    punch.type = "triangle";
    punch.frequency.setValueAtTime(180, start);
    punch.frequency.exponentialRampToValueAtTime(58, start + 0.08);
    punchGain.gain.setValueAtTime(0.2, start);
    punchGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.1);
    punch.connect(punchGain).connect(compressor);
    punch.start(start);
    punch.stop(start + 0.11);
  }

  return { play };
}
