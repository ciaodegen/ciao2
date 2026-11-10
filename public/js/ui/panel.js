// Kontrol paneli: sahte izleyicileri açıp kapatma, kendi adınla hediye atma,
// konvoy moduna geçme, aşama atlama, ses. Yayına (OBS) görünmez: ?obs=1 ile gizlenir.

import { escapeHtml } from '../render/labels.js';

export class Panel {
  /**
   * @param {HTMLElement} root
   * @param {object} api
   * @param {(ev: object) => void} api.send olay gönder (oyuna ve varsa sunucuya)
   * @param {(name: string) => void} api.command yönetim komutu
   * @param {object} api.sim Simulator
   * @param {object} api.sounds Sounds
   * @param {string} api.sourceLabel "Simülasyon" veya "TikTok: @kullanici"
   * @param {boolean} [api.startOpen]
   */
  constructor(root, api) {
    this.api = api;
    this.root = root;
    this.open = !!api.startOpen;
    root.className = 'panel';
    root.innerHTML = `
      <button class="toggle" type="button" id="panel-toggle" aria-expanded="false">🎮 Kontrol</button>
      <div class="body" id="panel-body">
        <div class="src"><span class="dot"></span><span id="panel-source">${escapeHtml(api.sourceLabel)}</span></div>
        <section>
          <h4>Sahte izleyiciler</h4>
          <div class="row">
            <button type="button" data-act="sim" id="panel-sim">⏸ Durdur</button>
            <select id="panel-rate" aria-label="Yoğunluk">
              <option value="1">Sakin</option>
              <option value="3" selected>Normal</option>
              <option value="7">Kalabalık</option>
            </select>
            <button type="button" data-act="crowd">+5 izleyici</button>
            <button type="button" data-act="likes">❤️ +100 beğeni</button>
          </div>
        </section>
        <section>
          <h4>Sen de oyna</h4>
          <div class="row">
            <input id="panel-name" type="text" maxlength="16" value="Sen" aria-label="Adın">
            <input id="panel-plate" type="text" maxlength="12" value="34" aria-label="Plakan" class="short">
            <button type="button" data-act="join">Katıl</button>
          </div>
          <div class="row gift-row">
            <button type="button" data-gift="1" data-count="1">🌹 Gül</button>
            <button type="button" data-gift="1" data-count="10">🌹 x10</button>
            <button type="button" data-gift="10" data-count="1">🛢️ 10</button>
            <button type="button" data-gift="30" data-count="1">💨 30</button>
            <button type="button" data-gift="50" data-count="1">🔧 50</button>
            <button type="button" data-gift="100" data-count="1">🚛 100</button>
          </div>
        </section>
        <section>
          <h4>Yayın</h4>
          <div class="row">
            <button type="button" data-act="konvoy">💍 Konvoy</button>
            <button type="button" data-act="skip">⏭ Sonraki aşama</button>
            <button type="button" data-act="sound" id="panel-sound">🔇 Ses kapalı</button>
          </div>
        </section>
      </div>`;

    this.body = root.querySelector('#panel-body');
    this.toggleBtn = root.querySelector('#panel-toggle');
    this.toggleBtn.addEventListener('click', () => this.setOpen(!this.open));
    this.setOpen(this.open);

    root.querySelector('#panel-rate').addEventListener('change', (e) => {
      api.sim.rate = Number(e.target.value);
    });

    root.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn || btn === this.toggleBtn) return;
      if (btn.dataset.gift) {
        this.me();
        api.send({ type: 'gift', user: this.meUser(), gift: { name: 'Panel', coins: Number(btn.dataset.gift), count: Number(btn.dataset.count) }, ts: Date.now() });
        return;
      }
      switch (btn.dataset.act) {
        case 'sim':
          if (api.sim.running) api.sim.stop();
          else api.sim.start();
          this.refresh();
          break;
        case 'crowd':
          api.sim.join(5);
          break;
        case 'likes':
          api.sim.like(100);
          break;
        case 'join':
          this.me();
          break;
        case 'konvoy':
          api.command('konvoy');
          break;
        case 'skip':
          api.command('skip');
          break;
        case 'sound':
          if (api.sounds.enabled) api.sounds.disable();
          else api.sounds.enable();
          this.refresh();
          break;
        default:
          break;
      }
    });
    this.refresh();
  }

  meUser() {
    const name = this.root.querySelector('#panel-name').value.trim() || 'Sen';
    return { id: `panel_${name.toLocaleLowerCase('tr')}`, name, avatar: null };
  }

  /** Paneldeki kişi olarak yorum yazar: yarışa katılır ve plakasını ayarlar. */
  me() {
    const plate = this.root.querySelector('#panel-plate').value.trim();
    this.api.send({ type: 'chat', user: this.meUser(), text: plate || 'katıl', ts: Date.now() });
  }

  setOpen(open) {
    this.open = open;
    this.root.classList.toggle('open', open);
    this.toggleBtn.setAttribute('aria-expanded', String(open));
    this.toggleBtn.textContent = open ? '✕ Kapat' : '🎮 Kontrol';
  }

  setSource(label, ok = true) {
    this.root.querySelector('#panel-source').textContent = label;
    this.root.querySelector('.src').classList.toggle('bad', !ok);
  }

  refresh() {
    this.root.querySelector('#panel-sim').textContent = this.api.sim.running ? '⏸ Durdur' : '▶ Başlat';
    this.root.querySelector('#panel-sound').textContent = this.api.sounds.enabled ? '🔊 Ses açık' : '🔇 Ses kapalı';
  }
}
