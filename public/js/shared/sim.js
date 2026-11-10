// Sahte izleyici simülatörü. TikTok'a bağlanmadan oyunu test etmek için
// gerçek yayındaki olayların aynısını (yorum, beğeni, hediye, takip) üretir.
// Tarayıcıda ve Node'da çalışır.

const FIRST = [
  'elif', 'mert', 'zeynep', 'emir', 'ayse', 'yusuf', 'berfin', 'kerem', 'ecrin', 'efe',
  'selin', 'burak', 'derya', 'onur', 'melike', 'hakan', 'sude', 'baris', 'nisa', 'umut',
  'irem', 'can', 'beyza', 'tolga', 'esra', 'serkan', 'damla', 'arda', 'yaren', 'furkan',
  'hatice', 'osman', 'merve', 'kadir', 'gamze', 'ozan', 'busra', 'emre', 'ceren', 'samet',
];
const SUFFIX = ['', '_', '.', '_tr', '0', '1', 'x', '_official', '.k', '_7'];
const NICK_DECOR = ['', '', '', ' ✨', ' 🌸', ' 🦁', ' 🏎️', ' ⚡', ' 🖤', ' 🔥'];
const COMMENTS = [
  'hadi', 'gaz gaz', 'yarış başlasın', 'selam', 'süper', 'ben de geldim', 'katıl',
  'ooo', 'nitrooo', 'kazanacağım', 'hadi hadi', 'yaşasın', 'hızlı', 'çok iyi',
];
const PLATE_CHOICES = [34, 34, 6, 35, 61, 16, 1, 7, 42, 27, 21, 55, 33, 44, 25, 41, 52, 53, 63, 65, 38, 26];

function pick(arr, rnd) {
  return arr[Math.floor(rnd() * arr.length)];
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Simulator {
  /**
   * @param {(event: object) => void} emit normalize edilmiş olayı alan fonksiyon
   * @param {object} [opts]
   * @param {number} [opts.rate] saniyedeki ortalama olay sayısı
   * @param {() => string} [opts.getPhase] oyunun o anki aşaması (yarış sonu heyecanı için)
   * @param {number} [opts.seed]
   */
  constructor(emit, opts = {}) {
    this.emit = emit;
    this.rate = opts.rate ?? 3;
    this.getPhase = opts.getPhase || (() => 'race');
    this.rnd = mulberry32(opts.seed ?? Date.now());
    this.viewers = [];
    this.timer = null;
    this.running = false;
  }

  makeViewer() {
    const r = this.rnd;
    const first = pick(FIRST, r);
    const id = `${first}${pick(SUFFIX, r)}${Math.floor(r() * 900 + 10)}`;
    const nick = first.charAt(0).toLocaleUpperCase('tr') + first.slice(1) + pick(NICK_DECOR, r);
    const viewer = { id, name: nick, avatar: null, plate: r() < 0.75 ? pick(PLATE_CHOICES, r) : null };
    this.viewers.push(viewer);
    if (this.viewers.length > 160) this.viewers.shift();
    return viewer;
  }

  user(v) {
    return { id: v.id, name: v.name, avatar: v.avatar };
  }

  /** Yeni izleyici gelir ve yorum yazarak katılır. */
  join(count = 1) {
    for (let i = 0; i < count; i++) {
      const v = this.makeViewer();
      const text = v.plate ? (this.rnd() < 0.5 ? String(v.plate).padStart(2, '0') : `${v.plate} gücü`) : pick(COMMENTS, this.rnd);
      this.emit({ type: 'chat', user: this.user(v), text, ts: Date.now() });
    }
  }

  randomViewer() {
    if (this.viewers.length === 0 || this.rnd() < 0.08) return this.makeViewer();
    return pick(this.viewers, this.rnd);
  }

  gift(coins, count = 1, viewer = null) {
    const v = viewer || this.randomViewer();
    const names = { 1: 'Gül', 10: 'Parfüm', 30: 'Donut', 50: 'Konfeti', 100: 'Kalpler', 500: 'Aslan' };
    this.emit({
      type: 'gift',
      user: this.user(v),
      gift: { name: names[coins] || 'Hediye', coins, count },
      ts: Date.now(),
    });
  }

  like(count = 15) {
    const v = this.randomViewer();
    this.emit({ type: 'like', user: this.user(v), count, ts: Date.now() });
  }

  follow() {
    const v = this.randomViewer();
    this.emit({ type: 'follow', user: this.user(v), ts: Date.now() });
  }

  comment() {
    const v = this.randomViewer();
    this.emit({ type: 'chat', user: this.user(v), text: pick(COMMENTS, this.rnd), ts: Date.now() });
  }

  /** Rastgele tek bir olay üretir. Yarışın son anlarında hediye ihtimali artar. */
  step() {
    const r = this.rnd();
    const phase = this.getPhase();
    const hype = phase === 'race' ? 1.4 : phase === 'lobby' ? 0.9 : 0.7;
    if (this.viewers.length < 6 || r < 0.2) return this.join(1);
    if (r < 0.32) return this.comment();
    if (r < 0.52) return this.like(Math.floor(this.rnd() * 25) + 5);
    if (r < 0.56) return this.follow();
    if (this.rnd() > 0.55 * hype) return this.comment();
    const g = this.rnd();
    if (g < 0.68) return this.gift(1, Math.ceil(this.rnd() * this.rnd() * 12));
    if (g < 0.84) return this.gift(10, 1);
    if (g < 0.93) return this.gift(30, 1);
    if (g < 0.985) return this.gift(50, 1);
    return this.gift(100, 1);
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.step();
      // Üstel dağılımlı bekleme: gerçek yayın gibi düzensiz akış
      const wait = (-Math.log(1 - this.rnd()) / Math.max(0.1, this.rate)) * 1000;
      this.timer = setTimeout(loop, Math.min(4000, wait));
    };
    loop();
  }

  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
