// TikTok LIVE bağlantısı. Resmi olmayan tiktok-live-connector kütüphanesini kullanır
// ve gelen olayları oyunun anladığı sade biçime çevirir.

/**
 * Kütüphanenin kullanıcı nesnesini sade biçime çevirir.
 */
export function normalizeUser(u) {
  if (!u) return null;
  const id = u.uniqueId || u.userId || u.nickname;
  if (!id) return null;
  const pic = u.profilePicture?.url?.[0] || u.profilePictureUrl || null;
  return { id: String(id), name: u.nickname || u.uniqueId || String(id), avatar: pic };
}

/**
 * Hediye serilerini (combo) doğru saymak için durum tutan çevirici.
 * TikTok, seri gönderilebilen hediyelerde (giftType 1) her tıklamada artan
 * repeatCount ile tekrar olay yollar ve seri bitince repeatEnd ile bir kez daha yollar.
 * Burada her olayda sadece aradaki farkı (yeni gönderilen adet) iletiyoruz;
 * böylece hediye anında etki eder ve iki kez sayılmaz.
 */
export class GiftCounter {
  constructor() {
    this.streaks = new Map();
  }

  /** @returns {{user, gift: {id, name, coins, count}} | null} */
  handle(data) {
    const user = normalizeUser(data.user);
    if (!user) return null;
    const details = data.giftDetails || {};
    const giftType = details.giftType ?? data.giftType;
    const giftId = String(data.giftId ?? details.id ?? 'gift');
    const coins = Number(details.diamondCount ?? data.diamondCount ?? data.extendedGiftInfo?.diamond_count ?? 1) || 1;
    const name = details.giftName || data.giftName || data.extendedGiftInfo?.name || 'Hediye';
    const repeat = Math.max(1, Number(data.repeatCount) || 1);
    const ended = Boolean(data.repeatEnd);

    let count;
    if (giftType === 1) {
      const key = `${user.id}:${giftId}:${data.groupId || ''}`;
      const prev = this.streaks.get(key)?.count || 0;
      count = Math.max(0, repeat - prev);
      if (ended) this.streaks.delete(key);
      else this.streaks.set(key, { count: Math.max(prev, repeat), at: Date.now() });
    } else {
      count = repeat;
    }
    this.cleanup();
    if (count <= 0) return null;
    return { user, gift: { id: giftId, name, coins, count } };
  }

  cleanup() {
    const cutoff = Date.now() - 60_000;
    for (const [key, s] of this.streaks) if (s.at < cutoff) this.streaks.delete(key);
  }
}

/**
 * TikTok canlı yayınına bağlanır, olayları emit(ev) ile iletir.
 * Yayın kapalıysa veya bağlantı koparsa belirli aralıklarla tekrar dener.
 */
export async function startTikTok({ username, signApiKey, emit, onStatus }) {
  let lib;
  try {
    lib = await import('tiktok-live-connector');
  } catch (err) {
    onStatus({ ok: false, label: 'tiktok-live-connector yüklenemedi. "npm install" çalıştırdın mı?' });
    throw err;
  }
  const { TikTokLiveConnection, WebcastEvent, ControlEvent } = lib;
  const gifts = new GiftCounter();
  let connection = null;
  let stopped = false;
  let retryTimer = null;

  const scheduleRetry = (seconds) => {
    if (stopped) return;
    clearTimeout(retryTimer);
    retryTimer = setTimeout(connect, seconds * 1000);
  };

  const connect = async () => {
    if (stopped) return;
    connection = new TikTokLiveConnection(username, signApiKey ? { signApiKey } : {});

    connection.on(WebcastEvent.CHAT, (d) => {
      const user = normalizeUser(d.user);
      if (user) emit({ type: 'chat', user, text: d.comment || '', ts: Date.now() });
    });
    connection.on(WebcastEvent.GIFT, (d) => {
      const g = gifts.handle(d);
      if (g) emit({ type: 'gift', ...g, ts: Date.now() });
    });
    connection.on(WebcastEvent.LIKE, (d) => {
      const user = normalizeUser(d.user);
      if (user) emit({ type: 'like', user, count: Number(d.likeCount) || 1, ts: Date.now() });
    });
    connection.on(WebcastEvent.FOLLOW, (d) => {
      const user = normalizeUser(d.user);
      if (user) emit({ type: 'follow', user, ts: Date.now() });
    });
    connection.on(WebcastEvent.SHARE, (d) => {
      const user = normalizeUser(d.user);
      if (user) emit({ type: 'share', user, ts: Date.now() });
    });
    connection.on(WebcastEvent.ROOM_USER, (d) => {
      if (d.viewerCount != null) emit({ type: 'viewers', count: Number(d.viewerCount), ts: Date.now() });
    });
    connection.on(WebcastEvent.STREAM_END, () => {
      onStatus({ ok: false, label: `@${username} yayını bitti. Tekrar açılınca bağlanacak.` });
      scheduleRetry(20);
    });
    connection.on(ControlEvent.DISCONNECTED, () => {
      onStatus({ ok: false, label: `@${username} bağlantısı koptu, tekrar deneniyor…` });
      scheduleRetry(10);
    });
    connection.on(ControlEvent.ERROR, (err) => {
      console.error('[tiktok] hata:', err?.message || err);
    });

    try {
      onStatus({ ok: false, label: `@${username} yayınına bağlanılıyor…` });
      const state = await connection.connect();
      onStatus({ ok: true, label: `TikTok: @${username} (oda ${state.roomId})` });
      console.log(`[tiktok] @${username} yayınına bağlandı. Oda: ${state.roomId}`);
    } catch (err) {
      const msg = err?.message || String(err);
      const offline = /offline|not live|UserOffline/i.test(msg) || err?.name === 'UserOfflineError';
      onStatus({ ok: false, label: offline ? `@${username} şu an canlı değil. 30 sn sonra tekrar denenecek.` : `Bağlanılamadı: ${msg}` });
      console.error(`[tiktok] bağlanılamadı: ${msg}`);
      scheduleRetry(offline ? 30 : 15);
    }
  };

  await connect();
  return {
    stop() {
      stopped = true;
      clearTimeout(retryTimer);
      connection?.disconnect().catch(() => {});
    },
  };
}
