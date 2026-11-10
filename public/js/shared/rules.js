// Hediye -> aksiyon eşleştirmesi. Tarayıcıda ve Node'da çalışır.

/**
 * Bir hediyenin (birim başına jeton değeri ve adı) hangi aksiyonu tetiklediğini bulur.
 * Önce config.gifts.byName (hediye adına özel eşleşme), sonra jeton değerine göre kademe.
 */
export function actionForGift(giftsConfig, gift) {
  const byName = giftsConfig.byName || {};
  if (gift.name) {
    const direct = byName[gift.name] ?? byName[String(gift.name).toLowerCase()];
    if (direct) return direct;
  }
  const coins = Math.max(1, Math.round(gift.coins || 1));
  for (const tier of giftsConfig.tiers) {
    if (coins >= tier.min && coins <= tier.max) return tier.action;
  }
  return giftsConfig.tiers[0]?.action || 'nitro';
}

export function tierForAction(giftsConfig, action) {
  return giftsConfig.tiers.find((t) => t.action === action) || null;
}

// Basit, tekrarlanabilir hash (renk ve rastgele tohumlar için)
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Görünen isim için kısaltma ve temizlik
export function displayName(name, max = 14) {
  const clean = String(name || 'misafir').replace(/[\u0000-\u001f]/g, '').trim() || 'misafir';
  return clean.length > max ? clean.slice(0, max - 1) + '…' : clean;
}

// Yayında ekrana yazılacak isimler için çok temel bir küfür filtresi.
// Liste bilerek kısa tutuldu; config ile genişletilebilir.
const BAD_WORDS = ['amk', 'aq', 'orospu', 'piç', 'sik', 'yarrak', 'göt', 'oç', 'ananı', 'pezevenk'];

export function censor(text, extra = []) {
  let out = String(text || '');
  for (const w of [...BAD_WORDS, ...extra]) {
    const re = new RegExp(`(^|[^\\p{L}])(${escapeRe(w)})(?=$|[^\\p{L}])`, 'giu');
    out = out.replace(re, (_, pre, word) => pre + '*'.repeat(word.length));
  }
  return out;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
