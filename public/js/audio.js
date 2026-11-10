// Telifsiz, tamamen kodla üretilen ses efektleri (Web Audio).
// Tarayıcılar sesi ancak bir tıklamadan sonra açar; OBS'te otomatik çalışır.

export class Sounds {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.last = new Map();
  }

  enable() {
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.master = this.master || this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      this.enabled = true;
    } catch {
      this.enabled = false;
    }
    return this.enabled;
  }

  disable() {
    this.enabled = false;
  }

  tone(freq, start, dur, type = 'square', gain = 0.3, slideTo = null) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(this.master);
    o.start(start);
    o.stop(start + dur + 0.02);
  }

  noise(start, dur, gain = 0.25, freq = 1200) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filter).connect(g).connect(this.master);
    src.start(start);
  }

  play(name) {
    if (!this.enabled || !this.ctx) return;
    // Aynı sesin üst üste binmesini sınırla
    const nowMs = performance.now();
    const gap = name === 'nitro' ? 120 : 60;
    if (nowMs - (this.last.get(name) || 0) < gap) return;
    this.last.set(name, nowMs);
    const t = this.ctx.currentTime;
    switch (name) {
      case 'beep':
        this.tone(660, t, 0.18, 'square', 0.25);
        break;
      case 'go':
        this.tone(990, t, 0.45, 'square', 0.3);
        break;
      case 'nitro':
        this.noise(t, 0.35, 0.3, 900);
        this.tone(180, t, 0.3, 'sawtooth', 0.12, 520);
        break;
      case 'nitroAll':
        this.noise(t, 0.7, 0.35, 700);
        this.tone(120, t, 0.7, 'sawtooth', 0.15, 600);
        break;
      case 'skid':
        this.noise(t, 0.5, 0.25, 2600);
        break;
      case 'horn':
        this.tone(415, t, 0.35, 'square', 0.18);
        this.tone(523, t, 0.35, 'square', 0.14);
        this.tone(415, t + 0.42, 0.25, 'square', 0.18);
        this.tone(523, t + 0.42, 0.25, 'square', 0.14);
        break;
      case 'truck':
        this.tone(110, t, 0.9, 'sawtooth', 0.22);
        this.tone(138, t, 0.9, 'sawtooth', 0.18);
        break;
      case 'garage':
        [523, 659, 784].forEach((f, i) => this.tone(f, t + i * 0.08, 0.18, 'triangle', 0.25));
        break;
      case 'owner':
        [392, 523, 659, 784].forEach((f, i) => this.tone(f, t + i * 0.09, 0.22, 'triangle', 0.25));
        break;
      case 'win':
      case 'finish':
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, t + i * 0.12, 0.3, 'square', 0.2));
        break;
      default:
        break;
    }
  }
}
