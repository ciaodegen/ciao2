// Kalıcı oyuncu profilleri (garaj seviyesi, plaka, galibiyetler) ve şehir puanları.
// MemoryStore: testler için. LocalStore: sunucusuz demo (tarayıcı hafızası).
// ServerStore: yerel sunucu (data/store.json dosyasına yazar).

export class MemoryStore {
  constructor(data = {}) {
    this.profiles = new Map(Object.entries(data.profiles || {}));
    this.cities = { ...(data.cities || {}) };
    this.dirty = new Set();
    this.citiesDirty = false;
  }

  get(id) {
    return this.profiles.get(id) || null;
  }

  put(profile) {
    this.profiles.set(profile.id, profile);
    this.dirty.add(profile.id);
    this.scheduleSave();
  }

  addCityPoints(plate, points) {
    this.cities[plate] = (this.cities[plate] || 0) + points;
    this.citiesDirty = true;
    this.scheduleSave();
  }

  scheduleSave() {}

  snapshot() {
    return { profiles: Object.fromEntries(this.profiles), cities: this.cities };
  }
}

const LOCAL_KEY = 'plaka-yarisi:v1';

export class LocalStore extends MemoryStore {
  constructor() {
    let data = {};
    try {
      data = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    } catch {
      data = {};
    }
    super(data);
    this.timer = null;
  }

  scheduleSave() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      try {
        // Demo: sadece en son görülen 500 profili tut
        const all = [...this.profiles.values()].sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0)).slice(0, 500);
        localStorage.setItem(LOCAL_KEY, JSON.stringify({ profiles: Object.fromEntries(all.map((p) => [p.id, p])), cities: this.cities }));
      } catch {
        // Depolama kapalıysa (gizli sekme vb.) sessizce devam et
      }
    }, 1500);
  }
}

export class ServerStore extends MemoryStore {
  static async load(key = '') {
    const res = await fetch('api/state', { headers: key ? { 'x-admin-key': key } : {} });
    if (!res.ok) throw new Error(`api/state ${res.status}`);
    return new ServerStore(await res.json(), key);
  }

  constructor(data, key = '') {
    super(data);
    this.key = key;
    this.timer = null;
  }

  scheduleSave() {
    if (this.timer) return;
    this.timer = setTimeout(() => this.flush(), 2000);
  }

  async flush() {
    this.timer = null;
    const profiles = [...this.dirty].map((id) => this.profiles.get(id)).filter(Boolean);
    this.dirty.clear();
    const body = { profiles };
    if (this.citiesDirty) {
      body.cities = this.cities;
      this.citiesDirty = false;
    }
    if (profiles.length === 0 && !body.cities) return;
    try {
      await fetch('api/state', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(this.key ? { 'x-admin-key': this.key } : {}) },
        body: JSON.stringify(body),
      });
    } catch {
      // Sunucuya ulaşılamazsa bir sonraki kayıtta tekrar dene
      for (const p of profiles) this.dirty.add(p.id);
      if (body.cities) this.citiesDirty = true;
    }
  }
}
