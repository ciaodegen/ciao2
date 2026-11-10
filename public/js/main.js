// Başlangıç: ayarları yükle, sunucu var mı bak, oyunu ve ekranı kur, döngüyü başlat.

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
const OBS = params.has('obs');
const PANEL_ONLY = params.get('panel') === 'only';

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

function fitStage(stage) {
  const s = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  return s;
}

function pickRenderScale(stageScale) {
  const q = Number(params.get('q'));
  if (q > 0) return Math.min(1, Math.max(0.3, q));
  if (OBS) return 1;
  const touch = matchMedia('(pointer: coarse)').matches;
  const ideal = stageScale * (window.devicePixelRatio || 1);
  return Math.min(touch ? 0.7 : 1, Math.max(0.5, ideal));
}

function connectSocket(onMessage, onState) {
  let ws = null;
  let retry = 1000;
  const open = () => {
    ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
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
    ws.onclose = () => {
      onState(false);
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

async function boot() {
  const cfg = await loadConfig();
  const server = await detectServer();
  const stage = document.getElementById('stage');
  const loading = document.getElementById('loading');

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
      (msg) => {
        if (msg.kind === 'event' && game) game.handle(msg.event);
        else if (msg.kind === 'command') applyCommand(msg.name);
        else if (msg.kind === 'status' && panel) panel.setSource(msg.label, msg.ok);
      },
      (ok) => panel && panel.setSource(ok ? 'Sunucuya bağlı' : 'Sunucu bağlantısı koptu, tekrar deneniyor…', ok),
    );
  }

  if (!PANEL_ONLY) {
    const store = server ? await ServerStore.load().catch(() => new LocalStore()) : new LocalStore();
    game = new Game(cfg, store);
    const stageScale = fitStage(stage);
    const world = new World(document.getElementById('scene'), cfg, { renderScale: pickRenderScale(stageScale) });
    const labels = new Labels(document.getElementById('labels'), world);
    const hud = new Hud(document.getElementById('hud'), cfg);
    window.addEventListener('resize', () => fitStage(stage));

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

    let last = performance.now();
    const frame = (t) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      game.update(dt);
      world.sync(game, dt, t / 1000);
      labels.update(game);
      hud.update(game.hudState());
      world.render();
      requestAnimationFrame(frame);
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
    sounds.enable();
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
