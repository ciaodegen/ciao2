import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from '../public/js/game/race.js';
import { MemoryStore } from '../public/js/game/store.js';
import { parsePlate } from '../public/js/shared/plates.js';
import { actionForGift } from '../public/js/shared/rules.js';

const config = JSON.parse(readFileSync(new URL('../public/config/game.json', import.meta.url)));

function seeded(seed = 1) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

function newGame() {
  return new Game(config, new MemoryStore(), { random: seeded(42) });
}

function run(game, seconds, step = 1 / 30) {
  for (let t = 0; t < seconds; t += step) game.update(step);
}

const user = (id, name = id) => ({ id, name, avatar: null });

test('yorumdan plaka okunur', () => {
  assert.equal(parsePlate('34'), 34);
  assert.equal(parsePlate('61 trabzon gücü'), 61);
  assert.equal(parsePlate('TRABZON'), 61);
  assert.equal(parsePlate('İstanbul'), 34);
  assert.equal(parsePlate('plaka 06'), 6);
  assert.equal(parsePlate('urfa'), 63);
  assert.equal(parsePlate('hadi gaz'), null);
  assert.equal(parsePlate('99'), null);
  assert.equal(parsePlate('bugün 2 kere kazandım'), null);
});

test('hediye jeton değerine göre aksiyon seçer', () => {
  assert.equal(actionForGift(config.gifts, { coins: 1 }), 'nitro');
  assert.equal(actionForGift(config.gifts, { coins: 10 }), 'oil');
  assert.equal(actionForGift(config.gifts, { coins: 30 }), 'drift');
  assert.equal(actionForGift(config.gifts, { coins: 50 }), 'garage');
  assert.equal(actionForGift(config.gifts, { coins: 500 }), 'truck');
  const custom = { ...config.gifts, byName: { Rose: 'truck' } };
  assert.equal(actionForGift(custom, { name: 'Rose', coins: 1 }), 'truck');
});

test('yorum yazan yarışa katılır ve plakası kaydedilir', () => {
  const g = newGame();
  g.handle({ type: 'chat', user: user('ali'), text: '61' });
  assert.equal(g.cars.size, 1);
  assert.equal(g.players.get('ali').profile.plate, 61);
  assert.equal(g.store.get('ali').plate, 61);
});

test('tam bir yarış biter, podyum ve şehir puanı verilir', () => {
  const g = newGame();
  ['a', 'b', 'c', 'd'].forEach((id, i) => g.handle({ type: 'chat', user: user(id), text: String([34, 61, 6, 34][i]) }));
  run(g, config.race.lobbySeconds + config.race.countdownSeconds + 0.5);
  assert.equal(g.phase, 'race');
  let t = 0;
  while (g.phase === 'race' && t < config.race.maxRaceSeconds + 1) {
    g.update(1 / 30);
    t += 1 / 30;
  }
  assert.equal(g.phase, 'podium');
  assert.ok(t > 40 && t < config.race.maxRaceSeconds, `yarış süresi makul olmalı: ${t.toFixed(1)} sn`);
  assert.equal(g.lastResults.top.length, 3);
  const total = [...g.session.cities.values()].reduce((s, v) => s + v, 0);
  assert.ok(total >= 10 + 6 + 4, 'ilk üçün şehirleri puan almalı');
  const winner = g.lastResults.top[0].player.id;
  assert.equal(g.store.get(winner).wins, 1);
});

test('nitro hediyesi yarışta öne geçirir', () => {
  const g = newGame();
  g.handle({ type: 'chat', user: user('yavas'), text: 'selam' });
  g.handle({ type: 'chat', user: user('roketci'), text: 'selam' });
  run(g, config.race.lobbySeconds + config.race.countdownSeconds + 0.2);
  for (let i = 0; i < 6; i++) {
    g.handle({ type: 'gift', user: user('roketci'), gift: { coins: 1, count: 5 } });
    run(g, 5);
  }
  const lead = g.standings()[0].id;
  assert.equal(lead, 'roketci');
});

test('en çok jeton atan pist sahibi olur, geçilince koltuk el değiştirir', () => {
  const g = newGame();
  g.handle({ type: 'gift', user: user('ayse'), gift: { coins: 10, count: 3 } });
  assert.equal(g.owner().id, 'ayse');
  g.handle({ type: 'gift', user: user('mehmet'), gift: { coins: 30, count: 1 } });
  assert.equal(g.owner().id, 'ayse', 'eşit jeton koltuğu almaz');
  g.handle({ type: 'gift', user: user('mehmet'), gift: { coins: 1, count: 1 } });
  assert.equal(g.owner().id, 'mehmet');
  assert.equal(g.owner().coins, 31);
});

test('modifiye hediyesi garaj seviyesini kalıcı artırır, 5te durur', () => {
  const g = newGame();
  g.handle({ type: 'gift', user: user('can'), gift: { coins: 50, count: 2 } });
  assert.equal(g.store.get('can').garage, 2);
  g.handle({ type: 'gift', user: user('can'), gift: { coins: 50, count: 9 } });
  assert.equal(g.store.get('can').garage, 5);
});

test('beğeni hedefi dolunca herkese nitro verilir', () => {
  const g = newGame();
  const banners = [];
  g.on('banner', (b) => banners.push(`${b.text} ${b.sub || ''}`));
  g.handle({ type: 'like', user: user('x'), count: config.likeGoal.every });
  assert.ok(banners.some((t) => t.includes('HERKESE NİTRO')));
});

test('lobide atılan yağ yarış başlayınca uygulanır', () => {
  const g = newGame();
  g.handle({ type: 'chat', user: user('a'), text: 'selam' });
  g.handle({ type: 'chat', user: user('b'), text: 'selam' });
  g.handle({ type: 'gift', user: user('b'), gift: { coins: 10, count: 1 } });
  assert.equal(g.players.get('b').pending.length, 1);
  run(g, config.race.lobbySeconds + config.race.countdownSeconds + 2.5);
  assert.equal(g.players.get('b').pending.length, 0);
  assert.ok([...g.cars.values()].some((c) => c.oilLeft > 0 || c.oilTotal > 0));
});

test('her N yarışta bir düğün konvoyu gelir', () => {
  const g = newGame();
  g.handle({ type: 'chat', user: user('a'), text: '34' });
  g.handle({ type: 'gift', user: user('a'), gift: { coins: 1, count: 1 } });
  for (let i = 0; i < config.konvoy.everyNthRound; i++) {
    while (g.phase !== 'podium') g.update(1 / 20);
    while (g.phase === 'podium') g.update(1 / 20);
  }
  assert.equal(g.phase, 'konvoy');
  run(g, config.konvoy.seconds + 0.5);
  assert.equal(g.phase, 'lobby');
});

test('yarış dolunca yeni gelen bir sonraki yarışa kalır', () => {
  const cfg = { ...config, race: { ...config.race, maxRacers: 2 } };
  const g = new Game(cfg, new MemoryStore(), { random: seeded(3) });
  for (const id of ['a', 'b', 'c']) g.handle({ type: 'chat', user: user(id), text: 'hey' });
  assert.equal(g.cars.size, 2);
  assert.equal(g.players.size, 3);
});
