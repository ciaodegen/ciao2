// Ekran arayüzü: başlık, hediye menüsü, şehir tablosu, pist sahibi, beğeni hedefi,
// duyuru bantları, geri sayım ve podyum.

import { avatarHtml, escapeHtml } from '../render/labels.js';
import { formatPlate, cityName } from '../shared/plates.js';

function el(tag, cls, html = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

function mmss(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export class Hud {
  constructor(root, cfg) {
    this.cfg = cfg;
    this.root = root;
    this.cache = {};

    this.header = el('header', 'hud-top');
    this.header.innerHTML = `
      <div class="brand plate"><em>TR</em><span>${escapeHtml(cfg.title)}</span></div>
      <div class="status"><b class="phase"></b><span class="time"></span></div>
      <div class="track"><i></i></div>
      <p class="howto"></p>`;
    root.appendChild(this.header);

    this.cities = el('aside', 'cities');
    root.appendChild(this.cities);

    this.ownerCard = el('div', 'owner-card');
    root.appendChild(this.ownerCard);

    this.gifts = el('aside', 'gifts');
    root.appendChild(this.gifts);

    this.center = el('div', 'center');
    root.appendChild(this.center);

    this.feed = el('ul', 'feed');
    root.appendChild(this.feed);

    this.likeGoal = el('div', 'likegoal', '<div class="bar"><i></i></div><span></span>');
    root.appendChild(this.likeGoal);

    this.banners = el('div', 'banners');
    root.appendChild(this.banners);

    this.count = el('div', 'count');
    root.appendChild(this.count);

    this.podium = el('section', 'podium');
    this.podium.hidden = true;
    root.appendChild(this.podium);

    this.bannerQueue = [];
    this.activeBig = null;
    this.renderGifts('race');
  }

  // ---------------------------------------------------------------- statik

  renderGifts(mode) {
    const konvoy = mode === 'konvoy';
    let tiers = this.cfg.gifts.tiers;
    if (konvoy) {
      // Konvoyda yağ ve drift aynı işi yapar (drift şov), nitro kornaya döner
      const oil = tiers.find((t) => t.action === 'oil');
      tiers = tiers
        .filter((t) => t.action !== 'drift')
        .map((t) => {
          if (t.action === 'nitro') return { ...t, icon: '📯', label: 'KORNA ÇAL' };
          if (t.action === 'oil') return { ...t, icon: '💨', label: 'DRİFT ŞOV', price: oil.price };
          return t;
        });
    }
    const rows = tiers.map((t) => `
      <li class="plate gift">
        <em>${t.icon}</em>
        <span class="act">${t.label}</span>
        <span class="coin">${t.price}<small>jeton</small></span>
      </li>`).join('');
    this.gifts.innerHTML = `
      <h3>HEDİYE AT</h3>
      <ul>
        <li class="plate gift free"><em>💬</em><span class="act">KATIL</span><span class="coin">BEDAVA<small>yorum · beğeni</small></span></li>
        ${rows}
        <li class="plate gift crown"><em>${konvoy ? '🤵' : '👑'}</em><span class="act">${konvoy ? 'DAMAT OL' : 'PİST SAHİBİ'}</span><span class="coin">EN ÇOK<small>jeton</small></span></li>
      </ul>`;
  }

  // ---------------------------------------------------------------- olaylar

  banner(b) {
    if (b.kind === 'big' || b.kind === 'hazard' || b.kind === 'owner' || b.kind === 'win') {
      this.bannerQueue.push(b);
      this.pumpBig();
    } else {
      this.toast(b);
    }
  }

  pumpBig() {
    if (this.activeBig || this.bannerQueue.length === 0) return;
    // Sıra uzarsa eskileri atla, ekran hep güncel kalsın
    if (this.bannerQueue.length > 3) this.bannerQueue.splice(0, this.bannerQueue.length - 3);
    const b = this.bannerQueue.shift();
    const sub = b.sub ? `<small>${escapeHtml(b.sub)}</small>` : '';
    const node = el('div', `banner big ${b.kind}`, `<span class="ic">${b.icon || ''}</span><span class="tx">${escapeHtml(b.text)}${sub}</span>`);
    this.banners.appendChild(node);
    this.activeBig = node;
    const ms = b.kind === 'hazard' ? 2600 : 1900;
    setTimeout(() => {
      node.classList.add('out');
      setTimeout(() => {
        node.remove();
        this.activeBig = null;
        this.pumpBig();
      }, 260);
    }, ms);
  }

  toast(b) {
    const node = el('div', 'banner toast', `<span class="ic">${b.icon || ''}</span><span class="tx">${escapeHtml(b.text)}</span>`);
    this.banners.appendChild(node);
    const toasts = this.banners.querySelectorAll('.toast');
    if (toasts.length > 2) toasts[0].remove();
    setTimeout(() => {
      node.classList.add('out');
      setTimeout(() => node.remove(), 260);
    }, 2200);
  }

  addFeed(item) {
    const li = el('li', '', `<span>${item.icon || ''}</span> ${escapeHtml(item.text)}`);
    this.feed.prepend(li);
    while (this.feed.children.length > 5) this.feed.lastChild.remove();
  }

  showCountdown(n) {
    this.count.innerHTML = `<b>${n}</b>`;
    this.count.classList.remove('pop');
    void this.count.offsetWidth;
    this.count.classList.add('pop');
    clearTimeout(this.countTimer);
    this.countTimer = setTimeout(() => (this.count.innerHTML = ''), 950);
  }

  showPodium(results) {
    const order = [results.top[1], results.top[0], results.top[2]];
    const cols = order.map((r, i) => {
      if (!r) return '<div class="step empty"></div>';
      const place = r.place;
      const p = r.player;
      return `
        <div class="step p${place}" style="--d:${i * 120}ms">
          <div class="medal">${['🥇', '🥈', '🥉'][place - 1]}</div>
          ${avatarHtml(p, 'ava big')}
          <div class="who">${escapeHtml(p.name)}</div>
          ${p.plate ? `<div class="plate mini"><em>TR</em><span>${formatPlate(p.plate)} ${escapeHtml(cityName(p.plate).toLocaleUpperCase('tr'))}</span></div>` : '<div class="plate mini ghost"><span>PLAKASIZ</span></div>'}
          <div class="block"><span>${place}</span>${r.cityPoints ? `<small>+${r.cityPoints} puan</small>` : ''}</div>
        </div>`;
    }).join('');
    const awards = results.cityAwards.slice(0, 4).map((a) => `<li class="plate mini"><em>TR</em><span>${formatPlate(a.plate)} ${escapeHtml(a.city.toLocaleUpperCase('tr'))}</span><b>+${a.value}</b></li>`).join('');
    this.podium.innerHTML = `
      <h2>TUR #${results.round} SONUÇ</h2>
      <div class="steps">${cols}</div>
      ${awards ? `<ul class="awards">${awards}</ul>` : ''}`;
    this.podium.hidden = false;
    this.root.classList.add('podium-on');
  }

  hidePodium() {
    this.podium.hidden = true;
    this.root.classList.remove('podium-on');
  }

  // ---------------------------------------------------------------- her kare

  update(s) {
    const c = this.cache;
    const konvoy = s.mode === 'konvoy';

    let phaseText = '';
    if (s.phase === 'lobby') phaseText = 'YENİ YARIŞ';
    else if (s.phase === 'countdown') phaseText = 'HAZIR OL';
    else if (s.phase === 'race') phaseText = `TUR #${s.round}`;
    else if (s.phase === 'podium') phaseText = `TUR #${s.round} BİTTİ`;
    else if (s.phase === 'konvoy') phaseText = '💍 DÜĞÜN KONVOYU';
    const timeText = s.phase === 'podium' || s.phase === 'countdown' ? '' : mmss(s.phaseLeft);
    const statusKey = `${phaseText}|${timeText}`;
    if (c.status !== statusKey) {
      c.status = statusKey;
      this.header.querySelector('.phase').textContent = phaseText;
      this.header.querySelector('.time').textContent = timeText;
    }

    const howto = konvoy
      ? 'Hediye at → korna çal · En çok jeton atan <b>DAMAT</b> olur'
      : '💬 Yorum yaz → yarışa katıl · Plakanı yaz: <b>34</b> <b>61</b> <b>06</b>…';
    if (c.howto !== howto) {
      c.howto = howto;
      this.header.querySelector('.howto').innerHTML = howto;
    }

    const trackPct = s.phase === 'race' ? Math.min(100, (s.leaderProgress / s.trackLength) * 100) : s.phase === 'podium' ? 100 : 0;
    this.header.querySelector('.track i').style.width = `${trackPct.toFixed(1)}%`;

    if (c.mode !== s.mode) {
      c.mode = s.mode;
      this.renderGifts(s.mode);
      this.root.classList.toggle('konvoy', konvoy);
    }

    const citiesKey = JSON.stringify(s.cities);
    if (c.cities !== citiesKey) {
      c.cities = citiesKey;
      const rows = s.cities.length
        ? s.cities.map((x, i) => `<li class="plate city"><em>${i + 1}</em><span class="code">${formatPlate(x.plate)}</span><span class="nm">${escapeHtml(x.city.toLocaleUpperCase('tr'))}</span><b>${x.points}</b></li>`).join('')
        : '<li class="hint">Plakanı yaz, şehrin için puan topla!</li>';
      this.cities.innerHTML = `<h3>ŞEHİRLER</h3><ul>${rows}</ul>`;
    }

    const o = s.owner;
    const ownerKey = o ? `${o.id}|${o.coins}|${o.name}|${o.avatar}|${konvoy}` : `none|${konvoy}`;
    if (c.owner !== ownerKey) {
      c.owner = ownerKey;
      const title = konvoy ? '🤵 DAMAT' : '👑 PİST SAHİBİ';
      this.ownerCard.innerHTML = o
        ? `<h3>${title}</h3><div class="row">${avatarHtml(o, 'ava')}<div><b>${escapeHtml(o.name)}</b><span>${o.coins} jeton</span></div></div><p>Kapmak için <b>${o.coins + 1}+</b> jeton</p>`
        : `<h3>${title}</h3><p class="empty">Koltuk boş!<br>İlk hediyeyi atan oturur.</p>`;
      if (o && c.ownerId && c.ownerId !== o.id) {
        this.ownerCard.classList.remove('flash');
        void this.ownerCard.offsetWidth;
        this.ownerCard.classList.add('flash');
      }
      c.ownerId = o?.id;
    }

    const into = s.likes - (s.nextLikeGoal - s.likeEvery);
    const likeKey = `${into}|${s.likeEvery}`;
    if (c.like !== likeKey) {
      c.like = likeKey;
      this.likeGoal.querySelector('i').style.width = `${Math.min(100, (into / s.likeEvery) * 100)}%`;
      this.likeGoal.querySelector('span').innerHTML = `❤️ <b>${into}</b> / ${s.likeEvery} BEĞENİ → HERKESE NİTRO`;
    }

    let center = '';
    if (s.phase === 'lobby') {
      center = `<div class="call"><small>YENİ YARIŞ</small><b>${Math.ceil(s.phaseLeft)}</b><span>${s.racers ? `${s.racers} araç hazır` : 'Yorum yaz, ilk sen katıl!'}</span></div>`;
    } else if (s.phase === 'race' || s.phase === 'konvoy') {
      center = `<ol class="leaders">${s.top.map((p, i) => `<li><i>${i + 1}</i>${avatarHtml(p, 'ava')}<span>${escapeHtml(p.name)}</span></li>`).join('')}</ol>`;
      if (s.phase === 'konvoy') center = '';
    }
    if (c.center !== center) {
      c.center = center;
      this.center.innerHTML = center;
    }
  }
}
