// Başlangıç: ayarları yükle, sunucu var mı bak, şifreyi al, oyunu ve ekranı kur, döngüyü başlat.

import { Game } from './game/race.js';
import { LocalStore, ServerStore } from './game/store.js';
import { World, STAGE_W, STAGE_H } from './render/scene.js';
import { Labels } from './render/labels.js';
import { Hud } from './ui/hud.js';
import { Panel } from './ui/panel.js';
import { Simulator } from './shared/sim.js';
import { Sounds } from './audio.js';
import { tierForAction } from './shared/rules.js';

const params = new URLSearchParams(location.search);
const STANDALONE = navigator.standalone === true || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
// Ana ekrandan açılan uygulama (iPad) her zaman yayın ekranıdır
const OBS = params.has('obs') || STANDALONE;
const PANEL_ONLY = params.get('panel') === 'only';
const TOUCH = matchMedia('(pointer: coarse)').matches;
const KEY_STORE = 'plaka-yarisi:key';

async function loadConfig() {
  const res = await fetch('config/game.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('config/game.json okunamadı');
  return res.json();
}

async function detectServer() {
  try {
    const res = await fetch('api/health', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.ok ? data : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- şifre

function savedKey() {
  const fromUrl = params.get('key');
  if (fromUrl) {
    try {
      localStorage.setItem(KEY_STORE, fromUrl);
    } catch {
      // depolama kapalı olabilir
    }
    return fromUrl;
  }
  try {
    return localStorage.getItem(KEY_STORE) || '';
  } catch {
    return '';
  }
}

async function keyWorks(key) {
  try {
    const res = await fetch('api/auth', { headers: { 'x-admin-key': key }, cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

function askKey(wrong) {
  return new Promise((resolve) => {
    const box = document.createElement('form');
    box.className = 'gate';
    box.innerHTML = `
      <div class="gate-card">
        <div class="plate brand-mini"><em>TR</em><span>PLAKA YARIŞI</span></div>
        <label for="gate-key">Şifre</label>
        <input id="gate-key" type="password" autocomplete="current-password" required>
        ${wrong ? '<p class="err">Şifre yanlış, tekrar dene.</p>' : '<p>Sunucuyu kurarken belirlediğin şifreyi gir.</p>'}
        <button type="submit">Giriş</button>
      </div>`;
    document.body.appendChild(box);
    box.querySelector('input').focus();
    box.addEventListener('submit', (e) => {
      e.preventDefault();
      const key = box.querySelector('input').value.trim();
      try {
        localStorage.setItem(KEY_STORE, key);
      } catch {
        // depolama kapalı olabilir
      }
      box.remove();
      resolve(key);
    });
  });
}

async function obtainKey() {
  let key = savedKey();
  let wrong = false;
  for (;;) {
    if (key && (await keyWorks(key))) return key;
    if (key) wrong = true;
    key = await askKey(wrong);
  }
}

// ---------------------------------------------------------------- ekran boyutu

/**
 * Sahne boyutunu ekrana göre seçer. Arayüz hep 1080x1920'lik orta kutuda kalır;
 * iPad gibi daha geniş ekranlarda 3D sahne yanlara, iPhone gibi daha uzun
 * ekranlarda yukarı-aşağı genişler, böylece siyah boşluk kalmaz.
 */
function stageSize() {
  const a = window.innerWidth / window.innerHeight;
  if (a > 0.8 || a <= 0) return { w: STAGE_W, h: STAGE_H }; // masaüstü: 9:16 önizleme
  const aspect = Math.max(0.45, a);
  if (aspect >= STAGE_W / STAGE_H) return { w: Math.round(STAGE_H * aspect), h: STAGE_H };
  return { w: STAGE_W, h: Math.round(STAGE_W / aspect) };
}

function layoutStage(stage, hudBox, world) {
  const { w, h } = stageSize();
  stage.style.width = `${w}px`;
  stage.style.height = `${h}px`;
  const s = Math.min(window.innerWidth / w, window.innerHeight / h);
  stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  hudBox.style.left = `${(w - STAGE_W) / 2}px`;
  hudBox.style.top = `${(h - STAGE_H) / 2}px`;
  if (world && (world.width !== w || world.height !== h)) world.setSize(w, h);
  return s;
}

function pickRenderScale(stageScale) {
  const q = Number(params.get('q'));
  if (q > 0) return Math.min(1, Math.max(0.3, q));
  if (OBS && !TOUCH) return 1;
  const ideal = stageScale * (window.devicePixelRatio || 1);
  // Dokunmatik cihazda (iPad/iPhone) ısınmayı azaltmak için daha düşük çözünürlük
  return Math.min(TOUCH ? 0.7 : 1, Math.max(0.5, ideal));
}

// ---------------------------------------------------------------- ekranı açık tut

let wakeWanted = false;
async function keepAwake() {
  wakeWanted = true;
  try {
    await navigator.wakeLock?.request('screen');
  } catch {
    // desteklenmiyorsa iPad ayarlarından Otomatik Kilit: Asla yapılmalı
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wakeWanted) keepAwake();
});

function startOverlay(onStart) {
  const box = document.createElement('button');
  box.type = 'button';
  box.className = 'start-gate';
  box.innerHTML = '<span class="plate brand-mini"><em>TR</em><span>PLAKA YARIŞI</span></span><b>▶ YAYINI BAŞLAT</b><small>Dokun: ses açılır, ekran kararmaz</small>';
  document.body.appendChild(box);
  box.addEventListener('click', () => {
    onStart();
    box.remove();
  });
}

// ---------------------------------------------------------------- WebSocket

function connectSocket(key, onMessage, onState) {
  let ws = null;
  let retry = 1000;
  const open = () => {
    const q = key ? `?key=${encodeURIComponent(key)}` : '';
    ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws${q}`);
    ws.onopen = () => {
      retry = 1000;
      onState(true);
    };
    ws.onmessage = (e) => {
      try {
        onMessage(JSON.parse(e.data));
      } catch {
        // bozuk mesajı yok say
      }
    };
    ws.onclose = (e) => {
      onState(false, e.code === 4001 ? 'Şifre yanlış. Sayfayı yenileyip tekrar gir.' : null);
      if (e.code === 4001) {
        try {
          localStorage.removeItem(KEY_STORE);
        } catch {
          // depolama kapalı olabilir
        }
        return;
      }
      setTimeout(open, retry);
      retry = Math.min(10000, retry * 2);
    };
  };
  open();
  return {
    send(msg) {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    },
  };
}

// ---------------------------------------------------------------- açılış

async function boot() {
  const cfg = await loadConfig();
  const server = await detectServer();
  const stage = document.getElementById('stage');
  const loading = document.getElementById('loading');
  const key = server?.authRequired ? await obtainKey() : '';

  const sounds = new Sounds();
  let game = null;
  let socket = null;
  let panel = null;

  const applyCommand = (name) => {
    if (!game) return;
    if (name === 'konvoy') game.toggleKonvoy();
    if (name === 'skip') game.skipPhase();
  };

  // Olayları oyuna ve (varsa) sunucu üzerinden diğer ekranlara gönder
  const send = (ev) => {
    if (game) game.handle(ev);
    if (socket) socket.send({ kind: 'event', event: ev });
  };
  const command = (name) => {
    applyCommand(name);
    if (socket) socket.send({ kind: 'command', name });
  };

  const sim = new Simulator(send, { rate: 3, getPhase: () => game?.phase || 'race' });

  if (server) {
    socket = connectSocket(
      key,
      (msg) => {
        if (msg.kind === 'event' && game) game.handle(msg.event);
        else if (msg.kind === 'command') applyCommand(msg.name);
        else if (msg.kind === 'status' && panel) panel.setSource(msg.label, msg.ok);
      },
      (ok, reason) => panel && panel.setSource(reason || (ok ? 'Sunucuya bağlı' : 'Sunucu bağlantısı koptu, tekrar deneniyor…'), ok),
    );
  }

  if (!PANEL_ONLY) {
    let store;
    if (server && server.storage !== 'client') store = await ServerStore.load(key).catch(() => new LocalStore());
    else store = new LocalStore();
    game = new Game(cfg, store);

    const hudBox = document.getElementById('hud');
    const stageScale = layoutStage(stage, hudBox, null);
    const world = new World(document.getElementById('scene'), cfg, { renderScale: pickRenderScale(stageScale) });
    layoutStage(stage, hudBox, world);
    const labels = new Labels(document.getElementById('labels'), world);
    const hud = new Hud(hudBox, cfg);
    window.addEventListener('resize', () => layoutStage(stage, hudBox, world));

    game.on('banner', (b) => hud.banner(b));
    game.on('feed', (f) => hud.addFeed(f));
    game.on('countdown', (n) => hud.showCountdown(n));
    game.on('podium', (r) => hud.showPodium(r));
    game.on('phase', (p) => {
      if (p !== 'podium') hud.hidePodium();
    });
    game.on('sound', (name) => sounds.play(name));
    game.on('oil', (d) => world.onOil(d, game));
    game.on('truck', () => world.onTruck());
    game.on('gift', ({ player, action, count }) => {
      const tier = tierForAction(cfg.gifts, action);
      hud.addFeed({ icon: tier?.icon || '🎁', text: `${player.name} → ${tier?.label || action}${count > 1 ? ` x${count}` : ''}` });
    });

    // Dokunmatik cihazda 30 fps yeterli; pil ve ısı için kare sınırı
    const fps = Number(params.get('fps')) || (TOUCH ? 30 : 0);
    const minFrame = fps ? 1000 / fps - 2 : 0;
    let last = performance.now();
    const frame = (t) => {
      requestAnimationFrame(frame);
      if (minFrame && t - last < minFrame) return;
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      game.update(dt);
      world.sync(game, dt, t / 1000);
      labels.update(game);
      hud.update(game.hudState());
      world.render();
    };
    requestAnimationFrame(frame);
    stage.hidden = false;
  }

  const panelRoot = document.getElementById('panel');
  if (!OBS) {
    const sourceLabel = server ? server.status?.label || 'Sunucuya bağlı' : 'Demo: sahte izleyiciler';
    panel = new Panel(panelRoot, { send, command, sim, sounds, sourceLabel, startOpen: PANEL_ONLY });
    if (PANEL_ONLY) document.body.classList.add('panel-only');
  } else {
    panelRoot.remove();
    if (TOUCH) {
      // iPad/iPhone: ses ve ekranı açık tutma bir dokunuş ister
      startOverlay(() => {
        sounds.enable();
        keepAwake();
      });
    } else {
      sounds.enable();
    }
  }

  // Sunucu yoksa (demo) sahte izleyicileri hemen başlat
  if (!server && game) {
    sim.join(8);
    sim.start();
    panel?.refresh();
  }

  window.addEventListener('keydown', (e) => {
    if (e.target.closest('input, select, textarea')) return;
    const k = e.key.toLowerCase();
    if (k === 'k') command('konvoy');
    else if (k === 'n') command('skip');
    else if (k === 's') {
      if (sim.running) sim.stop();
      else sim.start();
      panel?.refresh();
    } else if (k === 'p' && panel) panel.setOpen(!panel.open);
    else if (k === 'm') {
      if (sounds.enabled) sounds.disable();
      else sounds.enable();
      panel?.refresh();
    }
  });

  loading.remove();
}

boot().catch((err) => {
  const loading = document.getElementById('loading');
  if (loading) loading.textContent = `Başlatılamadı: ${err.message}`;
  console.error(err);
});
