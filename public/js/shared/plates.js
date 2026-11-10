// Türkiye il plaka kodları (01-81) ve yorumdan plaka çözme.

export const CITIES = {
  1: 'Adana', 2: 'Adıyaman', 3: 'Afyonkarahisar', 4: 'Ağrı', 5: 'Amasya',
  6: 'Ankara', 7: 'Antalya', 8: 'Artvin', 9: 'Aydın', 10: 'Balıkesir',
  11: 'Bilecik', 12: 'Bingöl', 13: 'Bitlis', 14: 'Bolu', 15: 'Burdur',
  16: 'Bursa', 17: 'Çanakkale', 18: 'Çankırı', 19: 'Çorum', 20: 'Denizli',
  21: 'Diyarbakır', 22: 'Edirne', 23: 'Elazığ', 24: 'Erzincan', 25: 'Erzurum',
  26: 'Eskişehir', 27: 'Gaziantep', 28: 'Giresun', 29: 'Gümüşhane', 30: 'Hakkari',
  31: 'Hatay', 32: 'Isparta', 33: 'Mersin', 34: 'İstanbul', 35: 'İzmir',
  36: 'Kars', 37: 'Kastamonu', 38: 'Kayseri', 39: 'Kırklareli', 40: 'Kırşehir',
  41: 'Kocaeli', 42: 'Konya', 43: 'Kütahya', 44: 'Malatya', 45: 'Manisa',
  46: 'Kahramanmaraş', 47: 'Mardin', 48: 'Muğla', 49: 'Muş', 50: 'Nevşehir',
  51: 'Niğde', 52: 'Ordu', 53: 'Rize', 54: 'Sakarya', 55: 'Samsun',
  56: 'Siirt', 57: 'Sinop', 58: 'Sivas', 59: 'Tekirdağ', 60: 'Tokat',
  61: 'Trabzon', 62: 'Tunceli', 63: 'Şanlıurfa', 64: 'Uşak', 65: 'Van',
  66: 'Yozgat', 67: 'Zonguldak', 68: 'Aksaray', 69: 'Bayburt', 70: 'Karaman',
  71: 'Kırıkkale', 72: 'Batman', 73: 'Şırnak', 74: 'Bartın', 75: 'Ardahan',
  76: 'Iğdır', 77: 'Yalova', 78: 'Karabük', 79: 'Kilis', 80: 'Osmaniye',
  81: 'Düzce',
};

// Türkçe karakterleri sadeleştirip küçük harfe çevirir: "İSTANBUL" -> "istanbul"
export function fold(text) {
  return String(text)
    .replace(/İ/g, 'i').replace(/I/g, 'ı')
    .toLocaleLowerCase('tr')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u');
}

const NAME_TO_CODE = new Map();
for (const [code, name] of Object.entries(CITIES)) {
  NAME_TO_CODE.set(fold(name), Number(code));
}
// Sık kullanılan kısaltmalar / takma adlar
NAME_TO_CODE.set('ist', 34);
NAME_TO_CODE.set('antep', 27);
NAME_TO_CODE.set('maras', 46);
NAME_TO_CODE.set('urfa', 63);
NAME_TO_CODE.set('afyon', 3);
NAME_TO_CODE.set('icel', 33);
NAME_TO_CODE.set('izmit', 41);
NAME_TO_CODE.set('adapazari', 54);
NAME_TO_CODE.set('dersim', 62);

export function cityName(code) {
  return CITIES[code] || '';
}

export function formatPlate(code) {
  return String(code).padStart(2, '0');
}

/**
 * Yorumdan plaka kodu çıkarır. Bulamazsa null döner.
 * Kabul edilenler: "34", "plaka 61", "06 ankara", "trabzon", "61 trabzon gücü"
 * Yanlış pozitifleri azaltmak için sayı ancak yorumun başında, "plaka"dan sonra
 * ya da yorum sadece sayıdan oluşuyorsa kabul edilir.
 */
export function parsePlate(text) {
  if (!text) return null;
  const folded = fold(text).trim();
  if (!folded) return null;

  const valid = (n) => Number.isInteger(n) && n >= 1 && n <= 81 ? n : null;

  let m = folded.match(/^(\d{1,2})(?!\d)/);
  if (m) {
    const n = valid(Number(m[1]));
    if (n) return n;
  }
  m = folded.match(/plaka\s*:?\s*(\d{1,2})(?!\d)/);
  if (m) {
    const n = valid(Number(m[1]));
    if (n) return n;
  }

  const words = folded.split(/[^a-z0-9]+/).filter(Boolean);
  for (const w of words) {
    if (NAME_TO_CODE.has(w)) return NAME_TO_CODE.get(w);
  }
  return null;
}
