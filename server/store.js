// Oyuncu profillerini ve şehir puanlarını data/store.json dosyasında saklar.

import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export class FileStore {
  constructor(path) {
    this.path = path;
    this.data = { profiles: {}, cities: {} };
    this.timer = null;
  }

  async load() {
    try {
      const raw = await readFile(this.path, 'utf8');
      const parsed = JSON.parse(raw);
      this.data = { profiles: parsed.profiles || {}, cities: parsed.cities || {} };
    } catch (err) {
      if (err.code !== 'ENOENT') console.error('[store] okunamadı, boş başlıyor:', err.message);
    }
    return this;
  }

  /** İstemciden gelen güncellemeleri birleştirir. */
  merge({ profiles = [], cities } = {}) {
    for (const p of profiles) {
      if (p && typeof p.id === 'string' && p.id.length < 200) this.data.profiles[p.id] = sanitizeProfile(p);
    }
    if (cities && typeof cities === 'object') {
      for (const [plate, points] of Object.entries(cities)) {
        const n = Number(points);
        if (/^\d{1,2}$/.test(plate) && Number.isFinite(n)) this.data.cities[plate] = n;
      }
    }
    this.scheduleSave();
  }

  scheduleSave() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.save().catch((err) => console.error('[store] kaydedilemedi:', err.message));
    }, 1500);
  }

  async save() {
    await mkdir(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    await writeFile(tmp, JSON.stringify(this.data, null, 1));
    await rename(tmp, this.path);
  }
}

function sanitizeProfile(p) {
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return {
    id: String(p.id),
    name: String(p.name || '').slice(0, 40),
    avatar: typeof p.avatar === 'string' && /^https:\/\//.test(p.avatar) ? p.avatar.slice(0, 600) : null,
    plate: Number.isInteger(p.plate) && p.plate >= 1 && p.plate <= 81 ? p.plate : null,
    garage: Math.max(0, Math.min(5, num(p.garage))),
    wins: num(p.wins),
    podiums: num(p.podiums),
    races: num(p.races),
    coins: num(p.coins),
    firstSeen: num(p.firstSeen),
    lastSeen: num(p.lastSeen),
  };
}
