import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GiftCounter, normalizeUser } from '../server/tiktok.js';

const user = { uniqueId: 'ayse_61', nickname: 'Ayşe', profilePicture: { url: ['https://example.com/a.jpg'] } };
const rose = { giftType: 1, diamondCount: 1, giftName: 'Rose', id: '5655' };

test('kullanıcı sade biçime çevrilir', () => {
  assert.deepEqual(normalizeUser(user), { id: 'ayse_61', name: 'Ayşe', avatar: 'https://example.com/a.jpg' });
  assert.equal(normalizeUser(null), null);
});

test('seri hediyeler iki kez sayılmaz, her tıklama anında iletilir', () => {
  const c = new GiftCounter();
  const ev = (repeatCount, repeatEnd) => ({ user, giftId: 5655, giftDetails: rose, repeatCount, repeatEnd, groupId: 'g1' });
  assert.equal(c.handle(ev(1, 0)).gift.count, 1);
  assert.equal(c.handle(ev(3, 0)).gift.count, 2);
  assert.equal(c.handle(ev(5, 0)).gift.count, 2);
  assert.equal(c.handle(ev(5, 1)), null, 'seri sonu olayı tekrar saymamalı');
  // Yeni seri baştan sayılır
  assert.equal(c.handle({ ...ev(2, 0), groupId: 'g2' }).gift.count, 2);
});

test('seri olmayan hediye adediyle sayılır', () => {
  const c = new GiftCounter();
  const r = c.handle({ user, giftId: 1, giftDetails: { giftType: 2, diamondCount: 100, giftName: 'Hearts' }, repeatCount: 1, repeatEnd: 1 });
  assert.deepEqual(r.gift, { id: '1', name: 'Hearts', coins: 100, count: 1 });
});
