// Oyun mantığı: yarış akışı, araçlar, hediye etkileri, pist sahibi, şehir puanları.
// DOM veya Three.js kullanmaz; hem tarayıcıda hem Node testlerinde çalışır.

import { actionForGift, displayName, censor } from '../shared/rules.js';
import { parsePlate, cityName, formatPlate } from '../shared/plates.js';

export const GARAGE_FEATURES = ['', 'Renkli jant', 'Spoiler', 'Neon', 'Yarış şeridi', 'Altın boya'];

class Emitter {
  constructor() {
    this.handlers = new Map();
  }
  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(fn);
    return () => {
      const list = this.handlers.get(type) || [];
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    };
  }
  emit(type, data) {
    for (const fn of this.handlers.get(type) || []) fn(data);
  }
}

export class Game extends Emitter {
  /**
   * @param {object} config public/config/game.json içeriği
   * @param {object} store profil deposu (get/put/addCityPoints)
   * @param {object} [opts]
   * @param {() => number} [opts.random]
   */
  constructor(config, store, opts = {}) {
    super();
    this.cfg = config;
    this.store = store;
    this.rnd = opts.random || Math.random;
    this.now = 0;
    this.mode = 'race';
    this.phase = 'lobby';
    this.phaseLeft = config.race.lobbySeconds;
    this.round = 0;
    this.racesSinceKonvoy = 0;
    this.forceKonvoyNext = false;
    this.players = new Map();
    this.cars = new Map();
    this.finishOrder = [];
    this.raceTime = 0;
    this.thirdFinishAt = null;
    this.truck = null;
    this.globalNitroUntil = 0;
    this.lastCountdown = null;
    this.lastResults = null;
    this.scheduled = [];
    this.session = {
      coins: new Map(),
      cities: new Map(),
      likes: 0,
      nextLikeGoal: config.likeGoal.every,
      owner: null,
    };
    this.startLobby();
  }

  // ---------------------------------------------------------------- oyuncular

  ensurePlayer(user) {
    const id = String(user.id || user.name || 'anon');
    let p = this.players.get(id);
    const name = displayName(censor(user.name || id));
    if (!p) {
      const profile = this.store.get(id) || {
        id,
        name,
        avatar: null,
        plate: null,
        garage: 0,
        wins: 0,
        podiums: 0,
        races: 0,
        coins: 0,
        firstSeen: Date.now(),
      };
      p = { id, profile, pending: [], joinedRound: -1 };
      this.players.set(id, p);
    }
    p.profile.name = name;
    if (user.avatar) p.profile.avatar = user.avatar;
    p.profile.lastSeen = Date.now();
    p.lastActive = this.now;
    return p;
  }

  playerView(p) {
    return {
      id: p.id,
      name: p.profile.name,
      avatar: p.profile.avatar,
      plate: p.profile.plate,
      city: p.profile.plate ? cityName(p.profile.plate) : '',
      garage: p.profile.garage,
    };
  }

  save(p) {
    this.store.put(p.profile);
  }

  sessionCoins(id) {
    return this.session.coins.get(id) || 0;
  }

  // ---------------------------------------------------------------- olaylar

  /** Normalize edilmiş canlı yayın olayını işler. */
  handle(ev) {
    if (!ev || !ev.type) return;
    if (ev.type === 'viewers') return this.emit('viewers', ev.count);
    if (!ev.user) return;
    const p = this.ensurePlayer(ev.user);
    const join = this.cfg.join;
    switch (ev.type) {
      case 'chat': {
        const plate = parsePlate(ev.text);
        if (plate && plate !== p.profile.plate) {
          p.profile.plate = plate;
          this.save(p);
          const car = this.cars.get(p.id);
          if (car) car.version++;
          this.emit('feed', { icon: '📍', text: `${p.profile.name} → ${formatPlate(plate)} ${cityName(plate)}` });
        }
        if (join.byComment) this.join(p);
        break;
      }
      case 'like': {
        if (join.byLike) this.join(p);
        this.addLikes(Math.max(1, ev.count | 0));
        break;
      }
      case 'follow': {
        if (join.byFollow) this.join(p);
        this.emit('feed', { icon: '➕', text: `${p.profile.name} takip etti` });
        break;
      }
      case 'share': {
        if (join.byShare) this.join(p);
        this.emit('feed', { icon: '↗️', text: `${p.profile.name} paylaştı` });
        break;
      }
      case 'gift':
        this.onGift(p, ev.gift || {});
        break;
      default:
        break;
    }
  }

  addLikes(count) {
    const s = this.session;
    s.likes += count;
    while (s.likes >= s.nextLikeGoal) {
      s.nextLikeGoal += this.cfg.likeGoal.every;
      const secs = this.cfg.effects.globalNitroSeconds;
      if (this.phase === 'race') {
        this.globalNitroUntil = this.now + secs;
      } else {
        for (const car of this.cars.values()) car.startBoost = Math.min(this.cfg.effects.nitroMaxSeconds, car.startBoost + secs);
      }
      this.emit('banner', { kind: 'big', icon: '❤️', text: `${s.nextLikeGoal - this.cfg.likeGoal.every} BEĞENİ!`, sub: 'HERKESE NİTRO' });
      this.emit('sound', 'nitroAll');
    }
  }

  onGift(p, gift) {
    const count = Math.max(1, Math.floor(gift.count || 1));
    const unit = Math.max(1, Math.round(gift.coins || 1));
    const total = unit * count;
    this.session.coins.set(p.id, this.sessionCoins(p.id) + total);
    p.profile.coins = (p.profile.coins || 0) + total;
    this.save(p);
    this.join(p, { quiet: true });

    const action = actionForGift(this.cfg.gifts, { ...gift, coins: unit });
    this.applyAction(p, action, count);
    this.updateOwner(p);
    this.emit('gift', { player: this.playerView(p), action, count, coins: total });
  }

  updateOwner(p) {
    const s = this.session;
    const coins = this.sessionCoins(p.id);
    if (!s.owner) {
      s.owner = { id: p.id, coins };
      this.announceOwner(p);
      return;
    }
    if (s.owner.id === p.id) {
      s.owner.coins = coins;
      return;
    }
    if (coins > s.owner.coins) {
      s.owner = { id: p.id, coins };
      this.announceOwner(p);
    }
  }

  announceOwner(p) {
    const title = this.mode === 'konvoy' ? 'YENİ DAMAT' : 'YENİ PİST SAHİBİ';
    this.emit('banner', { kind: 'owner', icon: this.mode === 'konvoy' ? '🤵' : '👑', text: p.profile.name, sub: title });
    this.emit('sound', 'owner');
    for (const car of this.cars.values()) car.version++;
  }

  owner() {
    const o = this.session.owner;
    if (!o) return null;
    const p = this.players.get(o.id);
    return p ? { ...this.playerView(p), coins: o.coins } : null;
  }

  // ---------------------------------------------------------------- katılım

  join(p, { quiet = false } = {}) {
    if (this.cars.has(p.id)) return;
    const max = this.cfg.race.maxRacers;
    if (this.cars.size >= max) return; // sıradaki yarışa kalır (lobide seçilir)
    let car;
    if (this.phase === 'lobby' || this.phase === 'countdown') {
      car = this.makeCar(p);
      this.placeOnGrid(car, this.cars.size);
    } else if (this.phase === 'race') {
      car = this.makeCar(p);
      let min = Infinity;
      for (const c of this.cars.values()) if (!c.finished) min = Math.min(min, c.progress);
      car.progress = (Number.isFinite(min) ? min : 0) - 10 - this.rnd() * 6;
      car.lane = car.laneTarget = Math.floor(this.rnd() * this.cfg.race.lanes);
      car.speed = this.cfg.race.baseSpeed * 0.8;
      car.lateJoin = true;
    } else if (this.phase === 'konvoy') {
      car = this.makeCar(p);
      this.placeInKonvoy(car, this.cars.size);
      let min = Infinity;
      for (const c of this.cars.values()) min = Math.min(min, c.progress);
      car.progress = (Number.isFinite(min) ? min : 0) - 9;
      car.speed = this.cfg.konvoy.speed;
    } else {
      return; // podyumda: bir sonraki lobiye otomatik alınır
    }
    this.cars.set(p.id, car);
    if (!quiet) {
      const plate = p.profile.plate ? ` (${formatPlate(p.profile.plate)} ${cityName(p.profile.plate)})` : '';
      this.emit('feed', { icon: '🏎️', text: `${p.profile.name} yarışa katıldı${plate}` });
    }
  }

  makeCar(p) {
    return {
      id: p.id,
      player: p,
      progress: 0,
      lane: 0,
      laneTarget: 0,
      speed: 0,
      personal: 0.97 + this.rnd() * 0.06,
      wobbleFreq: 0.6 + this.rnd() * 0.8,
      wobblePhase: this.rnd() * Math.PI * 2,
      nitroLeft: 0,
      oilLeft: 0,
      driftLeft: 0,
      startBoost: 0,
      spin: 0,
      finished: false,
      finishTime: 0,
      honk: 0,
      lateJoin: false,
      version: 0, // görünüm değişince (plaka, modifiye, damat) artar
    };
  }

  placeOnGrid(car, index) {
    const lanes = this.cfg.race.lanes;
    const row = Math.floor(index / lanes);
    car.lane = car.laneTarget = index % lanes;
    car.progress = -4 - row * 5.6;
    car.speed = 0;
  }

  placeInKonvoy(car, index) {
    const cols = 4;
    const row = Math.floor(index / cols);
    car.lane = car.laneTarget = 1 + (index % cols);
    car.progress = -row * 8;
    car.speed = this.cfg.konvoy.speed;
  }

  selectRacers() {
    const cutoff = this.now - this.cfg.race.inactiveMinutes * 60;
    for (const [id, p] of this.players) {
      if (p.lastActive < cutoff && !this.session.coins.has(id)) this.players.delete(id);
    }
    const list = [...this.players.values()];
    list.sort((a, b) => this.sessionCoins(b.id) - this.sessionCoins(a.id) || b.lastActive - a.lastActive);
    return list.slice(0, this.cfg.race.maxRacers);
  }

  // ---------------------------------------------------------------- aşamalar

  setPhase(phase, seconds) {
    this.phase = phase;
    this.phaseLeft = seconds;
    this.emit('phase', phase);
  }

  startLobby() {
    this.mode = 'race';
    this.cars = new Map();
    this.finishOrder = [];
    this.truck = null;
    this.scheduled = [];
    this.globalNitroUntil = 0;
    const racers = this.selectRacers();
    racers.forEach((p, i) => {
      const car = this.makeCar(p);
      this.placeOnGrid(car, i);
      this.cars.set(p.id, car);
    });
    this.setPhase('lobby', this.cfg.race.lobbySeconds);
  }

  startCountdown() {
    this.lastCountdown = null;
    this.setPhase('countdown', this.cfg.race.countdownSeconds);
  }

  startRace() {
    this.round++;
    this.racesSinceKonvoy++;
    this.raceTime = 0;
    this.thirdFinishAt = null;
    this.finishOrder = [];
    for (const car of this.cars.values()) {
      if (car.startBoost > 0) {
        car.nitroLeft = car.startBoost;
        car.startBoost = 0;
      }
    }
    this.setPhase('race', this.cfg.race.maxRaceSeconds);
    this.emit('banner', { kind: 'big', icon: '🏁', text: 'BAŞLA!' });
    this.emit('sound', 'go');
    // Lobide atılan yağ / drift / tır hediyeleri yarış başlayınca sırayla patlar
    let delay = 1.2;
    for (const p of this.players.values()) {
      for (const job of p.pending.splice(0)) {
        this.schedule(delay, () => this.applyAction(p, job.action, job.count));
        delay += 0.7;
      }
    }
  }

  schedule(seconds, fn) {
    this.scheduled.push({ at: this.now + seconds, fn });
  }

  runScheduled() {
    if (this.scheduled.length === 0) return;
    const due = this.scheduled.filter((job) => job.at <= this.now);
    this.scheduled = this.scheduled.filter((job) => job.at > this.now);
    for (const job of due) job.fn();
  }

  endRace() {
    const standings = this.standings();
    const top = standings.slice(0, 3);
    const pts = this.cfg.cityPoints;
    const cityAwards = new Map();
    const addCity = (plate, value) => {
      if (!plate || !value) return;
      cityAwards.set(plate, (cityAwards.get(plate) || 0) + value);
    };
    top.forEach((car, i) => addCity(car.player.profile.plate, pts[i] || 0));
    for (const car of standings) if (car.finished) addCity(car.player.profile.plate, this.cfg.finishPoint);
    for (const [plate, value] of cityAwards) {
      this.session.cities.set(plate, (this.session.cities.get(plate) || 0) + value);
      this.store.addCityPoints?.(plate, value);
    }
    for (const car of this.cars.values()) {
      car.player.profile.races = (car.player.profile.races || 0) + 1;
    }
    top.forEach((car, i) => {
      const prof = car.player.profile;
      prof.podiums = (prof.podiums || 0) + 1;
      if (i === 0) prof.wins = (prof.wins || 0) + 1;
    });
    for (const car of this.cars.values()) this.save(car.player);

    this.lastResults = {
      round: this.round,
      top: top.map((car, i) => ({
        place: i + 1,
        player: this.playerView(car.player),
        cityPoints: pts[i] || 0,
        wins: car.player.profile.wins,
      })),
      cityAwards: [...cityAwards.entries()].sort((a, b) => b[1] - a[1]).map(([plate, value]) => ({ plate, city: cityName(plate), value })),
    };
    this.setPhase('podium', this.cfg.race.podiumSeconds);
    this.emit('podium', this.lastResults);
    this.emit('sound', 'finish');
  }

  startKonvoy() {
    this.mode = 'konvoy';
    this.racesSinceKonvoy = 0;
    this.forceKonvoyNext = false;
    this.cars = new Map();
    this.truck = null;
    const racers = this.selectRacers();
    const ownerId = this.session.owner?.id;
    racers.sort((a, b) => (b.id === ownerId) - (a.id === ownerId));
    racers.forEach((p, i) => {
      const car = this.makeCar(p);
      this.placeInKonvoy(car, i);
      if (p.id === ownerId) {
        car.lane = car.laneTarget = 2.5;
        car.progress = 10;
      }
      this.cars.set(p.id, car);
    });
    this.setPhase('konvoy', this.cfg.konvoy.seconds);
    this.emit('banner', { kind: 'big', icon: '💍', text: 'DÜĞÜN KONVOYU', sub: 'En çok jeton atan DAMAT olur' });
    this.emit('sound', 'horn');
  }

  /** Yönetim paneli: bir sonraki tur konvoy olsun / hemen geç. */
  toggleKonvoy() {
    if (this.phase === 'konvoy') {
      this.startLobby();
    } else if (this.phase === 'lobby') {
      this.startKonvoy();
    } else {
      this.forceKonvoyNext = !this.forceKonvoyNext;
    }
  }

  skipPhase() {
    if (this.phase === 'lobby') this.startCountdown();
    else if (this.phase === 'countdown') this.startRace();
    else if (this.phase === 'race') this.endRace();
    else if (this.phase === 'podium') this.afterPodium();
    else if (this.phase === 'konvoy') this.startLobby();
  }

  afterPodium() {
    const every = this.cfg.konvoy.everyNthRound;
    if (this.forceKonvoyNext || (every > 0 && this.racesSinceKonvoy >= every)) this.startKonvoy();
    else this.startLobby();
  }

  // ---------------------------------------------------------------- aksiyonlar

  applyAction(p, action, count) {
    const e = this.cfg.effects;
    const car = this.cars.get(p.id);
    const name = p.profile.name;
    const racing = this.phase === 'race' && car && !car.finished;

    if (action === 'garage') {
      const before = p.profile.garage || 0;
      const after = Math.min(5, before + count);
      if (after > before) {
        p.profile.garage = after;
        this.save(p);
        if (car) car.version++;
        this.emit('banner', { kind: 'info', icon: '🔧', text: `${name}: ${GARAGE_FEATURES[after]}` });
        this.emit('sound', 'garage');
        return;
      }
      action = 'nitro';
      count *= 3;
    }

    if (this.phase === 'konvoy' && car) {
      car.honk = 1.2;
      if (action === 'drift' || action === 'oil') car.driftLeft = e.driftSeconds;
      if (action === 'nitro') car.konvoyPush = (car.konvoyPush || 0) + count * 2.5;
      if (action === 'truck') this.startTruck(p, count);
      this.emit('sound', 'horn');
      if (count >= 5 || action !== 'nitro') this.emit('banner', { kind: 'info', icon: '📯', text: `${name} kornaya bastı!` });
      return;
    }

    if (action === 'nitro') {
      if (!car) return;
      const add = count * e.nitroSecondsPerUnit;
      if (racing) car.nitroLeft = Math.min(e.nitroMaxSeconds, car.nitroLeft + add);
      else car.startBoost = Math.min(e.nitroMaxSeconds, car.startBoost + add);
      if (count >= 5) this.emit('banner', { kind: 'info', icon: '🔥', text: `${name} nitro x${count}!` });
      this.emit('sound', 'nitro');
      return;
    }

    if (!racing) {
      if (this.phase === 'lobby' || this.phase === 'countdown') {
        p.pending.push({ action, count });
        this.emit('feed', { icon: '⏳', text: `${name}: ${labelOf(this.cfg, action)} yarış başlayınca!` });
      }
      return;
    }

    if (action === 'oil') {
      const order = this.standings().filter((c) => !c.finished);
      const idx = order.indexOf(car);
      const target = idx > 0 ? order[idx - 1] : order[1];
      if (!target) return;
      target.oilLeft = target.oilTotal = e.oilSeconds * (count > 1 ? 1.5 : 1);
      this.emit('banner', { kind: 'info', icon: '🛢️', text: `${name} → ${target.player.profile.name} kaydı!` });
      this.emit('oil', { by: car.id, target: target.id });
      this.emit('sound', 'skid');
    } else if (action === 'drift') {
      car.driftLeft = e.driftSeconds * Math.min(3, count);
      this.emit('banner', { kind: 'info', icon: '💨', text: `${name} drift şov!` });
      this.emit('sound', 'skid');
    } else if (action === 'truck') {
      this.startTruck(p, count);
    }
  }

  startTruck(p, count) {
    const e = this.cfg.effects;
    this.truck = { by: p.id, name: p.profile.name, until: this.now + e.truckSeconds * Math.min(3, count), started: this.now };
    this.emit('banner', { kind: 'hazard', icon: '🚛', text: 'TIR YOLU KESTİ!', sub: `${p.profile.name} hariç herkes yavaşladı` });
    this.emit('truck', this.truck);
    this.emit('sound', 'truck');
  }

  // ---------------------------------------------------------------- güncelleme

  standings() {
    return [...this.cars.values()].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progress - a.progress;
    });
  }

  update(dt) {
    dt = Math.min(dt, 0.1);
    this.now += dt;
    this.phaseLeft -= dt;
    this.runScheduled();

    switch (this.phase) {
      case 'lobby':
        this.updateIdle(dt);
        if (this.phaseLeft <= 0) {
          if (this.cars.size === 0) this.phaseLeft = this.cfg.race.lobbySeconds;
          else this.startCountdown();
        }
        break;
      case 'countdown': {
        this.updateIdle(dt);
        const n = Math.ceil(this.phaseLeft);
        if (n !== this.lastCountdown && n > 0) {
          this.lastCountdown = n;
          this.emit('countdown', n);
          this.emit('sound', 'beep');
        }
        if (this.phaseLeft <= 0) this.startRace();
        break;
      }
      case 'race':
        this.raceTime += dt;
        this.updateRace(dt);
        if (this.shouldEndRace()) this.endRace();
        break;
      case 'podium':
        this.updateCoast(dt);
        if (this.phaseLeft <= 0) this.afterPodium();
        break;
      case 'konvoy':
        this.updateKonvoy(dt);
        if (this.phaseLeft <= 0) this.startLobby();
        break;
      default:
        break;
    }
    this.updateVisuals(dt);
  }

  shouldEndRace() {
    const r = this.cfg.race;
    if (this.raceTime >= r.maxRaceSeconds) return true;
    const needed = Math.min(3, this.cars.size);
    if (needed > 0 && this.finishOrder.length >= needed) {
      if (this.thirdFinishAt === null) this.thirdFinishAt = this.raceTime;
      if (this.raceTime - this.thirdFinishAt >= r.finishGraceSeconds) return true;
    }
    let allDone = this.cars.size > 0;
    for (const c of this.cars.values()) if (!c.finished) allDone = false;
    return allDone && this.raceTime - (this.thirdFinishAt ?? this.raceTime) >= 1.5;
  }

  updateIdle(dt) {
    for (const car of this.cars.values()) {
      car.speed = 0;
      car.honk = Math.max(0, car.honk - dt);
    }
  }

  updateRace(dt) {
    const r = this.cfg.race;
    const e = this.cfg.effects;
    const base = r.baseSpeed;
    const t = this.now;
    const truckActive = this.truck && t < this.truck.until;
    const globalNitro = t < this.globalNitroUntil;
    let lead = -Infinity;
    for (const car of this.cars.values()) if (!car.finished) lead = Math.max(lead, car.progress);

    for (const car of this.cars.values()) {
      if (car.finished) {
        car.speed *= Math.pow(0.6, dt);
        car.progress += car.speed * dt;
        continue;
      }
      const garage = car.player.profile.garage || 0;
      let mult = car.personal * (1 + e.garageSpeedBonusPerLevel * garage);
      mult *= 1 + 0.07 * Math.sin(t * car.wobbleFreq + car.wobblePhase) + 0.035 * Math.sin(t * car.wobbleFreq * 2.3 + car.wobblePhase * 1.7);
      if (car.nitroLeft > 0 || globalNitro) mult *= e.nitroMultiplier;
      if (car.driftLeft > 0) mult *= e.driftMultiplier;
      if (car.oilLeft > 0) mult *= e.oilMultiplier;
      if (truckActive && this.truck.by !== car.id) mult *= e.truckMultiplier;
      // Geride kalan yetişsin: grup birlikte kalır, sona kadar her şey mümkün olur
      mult *= 1 + Math.min(e.catchUpMax ?? 0.35, Math.max(0, (lead - car.progress - 6) / 70));
      const target = base * mult;
      const k = Math.min(1, dt * (target > car.speed ? 2.2 : 3.5));
      car.speed += (target - car.speed) * k;
      car.progress += car.speed * dt;

      car.nitroLeft = Math.max(0, car.nitroLeft - dt);
      car.driftLeft = Math.max(0, car.driftLeft - dt);
      car.oilLeft = Math.max(0, car.oilLeft - dt);

      if (car.progress >= r.trackLength) {
        car.finished = true;
        car.finishTime = this.raceTime;
        this.finishOrder.push(car.id);
        const place = this.finishOrder.length;
        if (place === 1) {
          this.emit('banner', { kind: 'win', icon: '🏆', text: car.player.profile.name, sub: 'KAZANDI!' });
          this.emit('sound', 'win');
        }
      }
    }
    if (this.truck && !truckActive) this.truck = null;
    this.updateLanes(dt);
  }

  updateCoast(dt) {
    for (const car of this.cars.values()) {
      car.speed *= Math.pow(0.5, dt);
      car.progress += car.speed * dt;
      car.nitroLeft = Math.max(0, car.nitroLeft - dt);
      car.driftLeft = Math.max(0, car.driftLeft - dt);
      car.oilLeft = Math.max(0, car.oilLeft - dt);
    }
  }

  updateKonvoy(dt) {
    const k = this.cfg.konvoy;
    const ownerId = this.session.owner?.id;
    let front = -Infinity;
    for (const car of this.cars.values()) if (car.id !== ownerId) front = Math.max(front, car.progress);
    for (const car of this.cars.values()) {
      let speed = k.speed * (1 + 0.05 * Math.sin(this.now * car.wobbleFreq + car.wobblePhase));
      if (car.id === ownerId && Number.isFinite(front) && car.progress < front + 9) speed *= 1.8;
      if (car.konvoyPush > 0) {
        const push = Math.min(car.konvoyPush, dt * 6);
        car.konvoyPush -= push;
        car.progress += push;
      }
      car.speed += (speed - car.speed) * Math.min(1, dt * 2);
      car.progress += car.speed * dt;
      car.driftLeft = Math.max(0, car.driftLeft - dt);
      car.honk = Math.max(0, car.honk - dt);
      if (car.id === ownerId) car.laneTarget = 2.5;
    }
    this.updateLanes(dt);
  }

  updateLanes(dt) {
    const lanes = this.cfg.race.lanes;
    const list = [...this.cars.values()].sort((a, b) => b.progress - a.progress);
    for (let i = 0; i < list.length; i++) {
      const car = list[i];
      if (car.finished || car.oilLeft > 0) {
        car.lane += (car.laneTarget - car.lane) * Math.min(1, dt * 1.5);
        continue;
      }
      if (this.mode === 'race' && Number.isInteger(car.laneTarget)) {
        let blocked = false;
        for (let j = i - 1; j >= 0; j--) {
          const other = list[j];
          const gap = other.progress - car.progress;
          if (gap > 7) break;
          if (gap >= 0 && Math.abs(other.lane - car.laneTarget) < 0.7 && other.speed < car.speed) {
            blocked = true;
            break;
          }
        }
        if (blocked) {
          const options = [car.laneTarget - 1, car.laneTarget + 1].filter((l) => l >= 0 && l < lanes);
          if (this.rnd() < 0.5) options.reverse();
          for (const lane of options) {
            const free = list.every((o) => o === car || Math.abs(o.lane - lane) > 0.7 || o.progress - car.progress > 8 || car.progress - o.progress > 4);
            if (free) {
              car.laneTarget = lane;
              break;
            }
          }
        }
      }
      const diff = car.laneTarget - car.lane;
      car.lane += Math.sign(diff) * Math.min(Math.abs(diff), dt * 2.2);
    }
  }

  updateVisuals(dt) {
    const e = this.cfg.effects;
    for (const car of this.cars.values()) {
      if (car.oilLeft > 0) {
        car.spin = (1 - car.oilLeft / (car.oilTotal || e.oilSeconds)) * Math.PI * 2;
      } else if (car.driftLeft > 0) {
        car.spin = Math.sin(this.now * 6 + car.wobblePhase) * 0.5;
      } else {
        car.spin += (0 - normalizeAngle(car.spin)) * Math.min(1, dt * 6);
        car.spin = normalizeAngle(car.spin);
      }
    }
  }

  // ---------------------------------------------------------------- ekran bilgisi

  topCities(n = 4) {
    return [...this.session.cities.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([plate, points]) => ({ plate, city: cityName(plate), points }));
  }

  hudState() {
    const standings = this.standings();
    return {
      mode: this.mode,
      phase: this.phase,
      phaseLeft: Math.max(0, this.phaseLeft),
      round: this.round,
      raceTime: this.raceTime,
      racers: this.cars.size,
      players: this.players.size,
      leaderProgress: standings[0] ? Math.max(0, standings[0].progress) : 0,
      trackLength: this.cfg.race.trackLength,
      top: standings.slice(0, 3).map((c) => this.playerView(c.player)),
      owner: this.owner(),
      cities: this.topCities(4),
      likes: this.session.likes,
      nextLikeGoal: this.session.nextLikeGoal,
      likeEvery: this.cfg.likeGoal.every,
      forceKonvoyNext: this.forceKonvoyNext,
      truck: this.truck,
    };
  }
}

function labelOf(cfg, action) {
  const tier = cfg.gifts.tiers.find((t) => t.action === action);
  return tier ? tier.label : action;
}

function normalizeAngle(a) {
  const TWO_PI = Math.PI * 2;
  a = a % TWO_PI;
  if (a > Math.PI) a -= TWO_PI;
  if (a < -Math.PI) a += TWO_PI;
  return a;
}
