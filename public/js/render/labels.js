// Arabaların üstünde duran isim etiketleri (profil fotoğrafı + isim + plaka).
// DOM ile çizilir; TikTok profil fotoğrafları <img> olarak sorunsuz yüklenir.

import { hashString } from '../shared/rules.js';
import { formatPlate } from '../shared/plates.js';

// Menülerin kapladığı bölgeler (1080x1920 sahnede). Buraya düşen etiketler gizlenir.
function behindHud(x, y) {
  if (y < 425) return true; // başlık
  if (y < 935 && (x < 380 || x > 690)) return true; // sol ve sağ sütun
  return false;
}
const AVATAR_COLORS = ['#ff4d6d', '#3a86ff', '#06d6a0', '#ffb703', '#8338ec', '#fb5607', '#00b4d8', '#e63946'];

export function avatarHtml(player, cls = 'ava') {
  const initial = (player.name || '?').trim().charAt(0).toLocaleUpperCase('tr') || '?';
  const bg = AVATAR_COLORS[hashString(player.id) % AVATAR_COLORS.length];
  if (player.avatar) {
    return `<span class="${cls}" style="background:${bg}"><img src="${escapeAttr(player.avatar)}" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.remove()"><b>${escapeHtml(initial)}</b></span>`;
  }
  return `<span class="${cls}" style="background:${bg}"><b>${escapeHtml(initial)}</b></span>`;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function escapeAttr(s) {
  return escapeHtml(s);
}

export class Labels {
  constructor(container, world) {
    this.container = container;
    this.world = world;
    this.items = new Map();
    this.tmp = { x: 0, y: 0, visible: false, dist: 0 };
  }

  update(game) {
    const ownerId = game.session.owner?.id;
    const konvoy = game.mode === 'konvoy';
    const seen = new Set();
    for (const car of game.cars.values()) {
      seen.add(car.id);
      let item = this.items.get(car.id);
      if (!item) {
        const el = document.createElement('div');
        el.className = 'tag';
        this.container.appendChild(el);
        item = { el, key: '' };
        this.items.set(car.id, item);
      }
      const prof = car.player.profile;
      const isOwner = car.id === ownerId;
      const nitro = car.nitroLeft > 0;
      const key = `${prof.name}|${prof.avatar}|${prof.plate}|${prof.garage}|${isOwner}|${konvoy}|${nitro}`;
      if (key !== item.key) {
        item.key = key;
        const crown = isOwner ? `<i class="crown">${konvoy ? '🤵' : '👑'}</i>` : '';
        const stars = prof.garage ? `<i class="lvl">★${prof.garage}</i>` : '';
        const fire = nitro ? '<i class="fire">🔥</i>' : '';
        const plate = prof.plate ? `<span class="pl"><em>TR</em>${formatPlate(prof.plate)}</span>` : '';
        item.el.innerHTML = `${crown}${avatarHtml({ id: car.id, name: prof.name, avatar: prof.avatar })}<span class="nm">${escapeHtml(prof.name)}${stars}${fire}</span>${plate}`;
        item.el.classList.toggle('owner', isOwner);
      }
      const p = this.world.project(this.world.laneX(car.lane), 2.6, -car.progress, this.tmp);
      // Üstteki menülerin arkasında kalan (çok uzaktaki) etiketleri gösterme
      if (!p.visible || p.dist > 190 || behindHud(p.x - this.world.hudX, p.y - 30 - this.world.hudY)) {
        if (item.shown !== false) {
          item.el.style.display = 'none';
          item.shown = false;
        }
        continue;
      }
      if (item.shown !== true) {
        item.el.style.display = '';
        item.shown = true;
      }
      const scale = Math.max(0.4, Math.min(0.85, 34 / p.dist));
      item.el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -100%) scale(${scale.toFixed(3)})`;
      item.el.style.zIndex = String(Math.round(10000 - p.dist * 10) + (isOwner ? 5000 : 0));
    }
    for (const [id, item] of this.items) {
      if (!seen.has(id)) {
        item.el.remove();
        this.items.delete(id);
      }
    }
  }
}
