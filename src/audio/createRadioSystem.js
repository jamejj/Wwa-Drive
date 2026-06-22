const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;

const stations = [
  {
    id: "wawa-fm",
    station: "WAWA FM",
    show: "NOCNA ZMIANA",
    track: "Bloki po zmroku — instrumental",
    bpm: 92,
    style: "trap",
  },
  {
    id: "wisla-rock",
    station: "WISŁA ROCK",
    show: "MOSTY I ŚWIATŁA",
    track: "Asfalt ’06 — instrumental",
    bpm: 126,
    style: "rock",
  },
  {
    id: "radio-off",
    station: "RADIO OFF",
    show: "CISZA W ETERZE",
    track: "Naciśnij Q, aby zmienić stację",
    bpm: 90,
    style: "off",
  },
];

export function createRadioSystem({ onStationChange }) {
  let context;
  let master;
  let noiseBuffer;
  let scheduler;
  let nextStepTime = 0;
  let step = 0;
  let driving = false;
  let stationIndex = 0;

  function createNoiseBuffer() {
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  function ensureContext() {
    if (!AudioContextClass) return false;
    if (!context) {
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = 0;
      master.connect(context.destination);
      noiseBuffer = createNoiseBuffer();
    }
    if (context.state === "suspended") context.resume();
    return true;
  }

  function envelope(gain, time, attack, level, duration) {
    gain.gain.cancelScheduledValues(time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  }

  function playKick(time, level = 0.22) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(135, time);
    oscillator.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    envelope(gain, time, 0.004, level, 0.18);
    oscillator.connect(gain).connect(master);
    oscillator.start(time);
    oscillator.stop(time + 0.2);
  }

  function playNoise(time, duration, level, highpass) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noiseBuffer;
    filter.type = "highpass";
    filter.frequency.value = highpass;
    envelope(gain, time, 0.002, level, duration);
    source.connect(filter).connect(gain).connect(master);
    source.start(time);
    source.stop(time + duration + 0.02);
  }

  function playTone(time, frequency, duration, level, type = "sine") {
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    filter.type = "lowpass";
    filter.frequency.value = type === "sawtooth" ? 780 : 340;
    envelope(gain, time, 0.012, level, duration);
    oscillator.connect(filter).connect(gain).connect(master);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.03);
  }

  function scheduleStep(time) {
    const station = stations[stationIndex];
    if (station.style === "off") return;
    const beatStep = step % 16;

    if (station.style === "trap") {
      if ([0, 6, 10].includes(beatStep)) playKick(time);
      if ([4, 12].includes(beatStep)) playNoise(time, 0.11, 0.065, 1100);
      if (beatStep % 2 === 0) playNoise(time, 0.035, 0.018, 5200);
      if (beatStep % 4 === 0) {
        const bass = [55, 55, 65.41, 49][beatStep / 4];
        playTone(time, bass, 0.28, 0.085, "sine");
      }
    } else {
      if ([0, 8, 10].includes(beatStep)) playKick(time, 0.19);
      if ([4, 12].includes(beatStep)) playNoise(time, 0.12, 0.075, 900);
      if (beatStep % 2 === 0) playNoise(time, 0.045, 0.016, 4200);
      if (beatStep % 4 === 0) {
        const root = [82.41, 98, 110, 73.42][beatStep / 4];
        playTone(time, root, 0.18, 0.032, "sawtooth");
        playTone(time, root * 1.5, 0.18, 0.02, "square");
      }
    }
  }

  function tick() {
    if (!context || !driving) return;
    const station = stations[stationIndex];
    const stepDuration = 60 / station.bpm / 4;
    while (nextStepTime < context.currentTime + 0.12) {
      scheduleStep(nextStepTime);
      nextStepTime += stepDuration;
      step += 1;
    }
  }

  function startScheduler() {
    if (!ensureContext()) return;
    clearInterval(scheduler);
    if (stations[stationIndex].style === "off") return;
    nextStepTime = context.currentTime + 0.04;
    step = 0;
    scheduler = setInterval(tick, 45);
  }

  function applyVolume() {
    if (!context || !master) return;
    const audible = driving && stations[stationIndex].style !== "off";
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setValueAtTime(master.gain.value, context.currentTime);
    master.gain.linearRampToValueAtTime(
      audible ? 0.2 : 0,
      context.currentTime + 0.12,
    );
  }

  function setDriving(value) {
    driving = value;
    if (driving) startScheduler();
    else clearInterval(scheduler);
    applyVolume();
  }

  function nextStation() {
    stationIndex = (stationIndex + 1) % stations.length;
    if (driving) {
      clearInterval(scheduler);
      startScheduler();
    }
    applyVolume();
    onStationChange(stations[stationIndex]);
    return stations[stationIndex];
  }

  onStationChange(stations[stationIndex]);
  return {
    setDriving,
    nextStation,
    getStation: () => stations[stationIndex],
  };
}
