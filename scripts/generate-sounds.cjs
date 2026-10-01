// Oyun ses efektlerini sentezleyip assets/sounds altına WAV olarak yazar.
// Çalıştırma: node scripts/generate-sounds.cjs
const fs = require('fs');
const path = require('path');

const RATE = 22050;
const out = path.resolve(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(out, { recursive: true });

const waves = {
  sine: p => Math.sin(2 * Math.PI * p),
  triangle: p => 1 - 4 * Math.abs(Math.round(p - 0.25) - (p - 0.25)),
  square: p => (p % 1 < 0.5 ? 1 : -1) * 0.6,
};

// note: { at, dur, freq, wave, gain, decay, slide } — saniye ve Hz cinsinden.
function render(notes, length) {
  const buf = new Float32Array(Math.ceil(length * RATE));
  for (const n of notes) {
    const start = Math.floor(n.at * RATE);
    const count = Math.floor(n.dur * RATE);
    let phase = 0;
    for (let i = 0; i < count && start + i < buf.length; i++) {
      const t = i / RATE;
      const freq = n.freq * (n.slide ? Math.pow(n.slide, t / n.dur) : 1);
      phase += freq / RATE;
      const attack = Math.min(1, t / 0.004);
      const release = Math.min(1, (n.dur - t) / 0.012);
      const env = attack * release * Math.exp(-t * (n.decay ?? 6));
      let sample = waves[n.wave ?? 'sine'](phase);
      if (n.bell) sample = 0.6 * sample + 0.25 * waves.sine(phase * 2.76) + 0.15 * waves.sine(phase * 5.4);
      buf[start + i] += sample * env * (n.gain ?? 0.3);
    }
  }
  return buf;
}

function writeWav(name, samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(out, name), Buffer.concat([header, data]));
  console.log(`${name}  ${(44 + data.length) / 1024 | 0} KB`);
}

const C5 = 523.25, E5 = 659.25, G5 = 783.99, B5 = 987.77, C6 = 1046.5, D6 = 1174.66, E6 = 1318.51, G6 = 1567.98, C7 = 2093;

// Sekme dokunuşu: kısa, yumuşak tık.
writeWav('tap.wav', render([{ at: 0, dur: 0.05, freq: 1400, slide: 0.6, wave: 'sine', gain: 0.25, decay: 60 }], 0.06));

// XP: klasik iki notalı jeton sesi.
writeWav('xp.wav', render([
  { at: 0, dur: 0.07, freq: B5, wave: 'square', gain: 0.16, decay: 4 },
  { at: 0.07, dur: 0.3, freq: E6, wave: 'square', gain: 0.16, decay: 9 },
], 0.38));

// Görev bonusu: hızlı yükselen parıltı arpeji.
writeWav('quest.wav', render([C6, E6, G6, C7].map((freq, i) => (
  { at: i * 0.06, dur: 0.22, freq, wave: 'triangle', gain: 0.22, decay: 10 }
)), 0.45));

// Rozet: iki vuruşlu çan.
writeWav('badge.wav', render([
  { at: 0, dur: 0.9, freq: G5, bell: true, gain: 0.3, decay: 4 },
  { at: 0.14, dur: 1.0, freq: D6, bell: true, gain: 0.28, decay: 3.5 },
], 1.15));

// Seviye atlama: yükselen fanfar ve uzun akor.
writeWav('levelup.wav', render([
  ...[C5, E5, G5].map((freq, i) => ({ at: i * 0.11, dur: 0.14, freq, wave: 'square', gain: 0.13, decay: 3 })),
  ...[C6, E6, G6].map(freq => ({ at: 0.33, dur: 0.85, freq, wave: 'triangle', gain: 0.2, decay: 2.2 })),
  { at: 0.33, dur: 0.85, freq: C5, wave: 'square', gain: 0.07, decay: 2.5 },
], 1.25));
