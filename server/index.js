// Sunucu: oyunu tarayıcıya / OBS'e / iPad'e sunar, TikTok olaylarını WebSocket ile iletir,
// profilleri data/store.json'a kaydeder. Bilgisayarda veya bulutta (Render vb.) çalışır.
//
//   npm run sim                          -> sahte izleyicilerle test
//   npm start -- --user kullaniciadi     -> gerçek TikTok yayınına bağlan
//
// Ortam değişkenleri:
//   TIKTOK_USER   yayın yapan TikTok kullanıcı adı
//   ADMIN_TOKEN   şifre. Verilirse oyun ekranı ve kontrol paneli şifre ister
//                 (sunucu internete açıksa mutlaka ver)
//   STORAGE       "file" (varsayılan, data/store.json) veya "client" (profiller
//                 oyun ekranının tarayıcısında tutulur; diski kalıcı olmayan bulut için)
//   SIGN_API_KEY  Euler Stream API anahtarı (gerekirse)
//   PORT          dinlenecek port (varsayılan 3000)

import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { FileStore } from './store.js';
import { startTikTok } from './tiktok.js';
import { Simulator } from '../public/js/shared/sim.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PUBLIC = join(ROOT, 'public');
const THREE_FILE = join(ROOT, 'node_modules', 'three', 'build', 'three.module.js');

function parseArgs(argv) {
  const out = { sim: false, user: process.env.TIKTOK_USER || '', port: Number(process.env.PORT) || 3000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--sim') out.sim = true;
    else if (a === '--user') out.user = argv[++i] || '';
    else if (a.startsWith('--user=')) out.user = a.slice(7);
    else if (a === '--port') out.port = Number(argv[++i]) || out.port;
  }
  out.user = out.user.replace(/^@/, '').trim();
  return out;
}

const args = parseArgs(process.argv.slice(2));
const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || '').trim();
const STORAGE = process.env.STORAGE === 'client' ? 'client' : 'file';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const store = STORAGE === 'file' ? await new FileStore(join(ROOT, 'data', 'store.json')).load() : null;
const source = args.user ? 'tiktok' : args.sim ? 'sim' : 'idle';
let status = {
  ok: true,
  label: args.user ? `TikTok: @${args.user} (oyun ekranı açılınca bağlanır)` : args.sim ? 'Sunucu: sahte izleyiciler' : 'Sunucu hazır (olay kaynağı yok)',
};

// ---------------------------------------------------------------- şifre

function keyMatches(given) {
  if (!ADMIN_TOKEN) return true;
  if (typeof given !== 'string' || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(ADMIN_TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

function authorized(req, url) {
  return keyMatches(req.headers['x-admin-key'] || url.searchParams.get('key'));
}

// ---------------------------------------------------------------- HTTP

async function sendFile(res, file) {
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not file');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Bulunamadı');
  }
}

function readJson(req, limit = 2_000_000) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('çok büyük'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function json(res, code, body) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = decodeURIComponent(url.pathname);

  if (path === '/api/health') {
    return json(res, 200, { ok: true, source, user: args.user || null, status, authRequired: Boolean(ADMIN_TOKEN), storage: STORAGE });
  }
  if (path === '/api/auth') {
    return authorized(req, url) ? json(res, 200, { ok: true }) : json(res, 401, { ok: false });
  }
  if (path === '/api/state') {
    if (!authorized(req, url)) return json(res, 401, { ok: false });
    if (!store) return json(res, 200, { profiles: {}, cities: {} });
    if (req.method === 'GET') return json(res, 200, store.data);
    if (req.method === 'POST') {
      try {
        store.merge(await readJson(req));
        res.writeHead(204);
        return res.end();
      } catch {
        return json(res, 400, { ok: false });
      }
    }
  }
  if (path === '/vendor/three.module.js') return sendFile(res, THREE_FILE);

  const target = normalize(join(PUBLIC, path === '/' ? 'index.html' : path));
  if (!target.startsWith(PUBLIC + sep) && target !== PUBLIC) {
    res.writeHead(403);
    return res.end();
  }
  return sendFile(res, target);
});

// ---------------------------------------------------------------- WebSocket

const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(msg, except = null) {
  const data = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client !== except && client.readyState === 1) client.send(data);
  }
}

const emit = (event) => broadcast({ kind: 'event', event });
const setStatus = (s) => {
  status = s;
  broadcast({ kind: 'status', ...status });
};

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  if (!authorized(req, url)) {
    ws.close(4001, 'sifre');
    return;
  }
  ws.send(JSON.stringify({ kind: 'status', ...status }));
  ensureTikTok();

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    // Kontrol panelinden gelen olay/komutları diğer ekranlara ilet
    if (msg.kind === 'event' && msg.event && typeof msg.event.type === 'string') broadcast({ kind: 'event', event: msg.event }, ws);
    if (msg.kind === 'command' && (msg.name === 'konvoy' || msg.name === 'skip')) broadcast({ kind: 'command', name: msg.name }, ws);
  });
  ws.on('close', () => {
    if (wss.clients.size === 0) scheduleTikTokStop();
  });
});

// ---------------------------------------------------------------- TikTok bağlantısı
// Bağlantı sadece bir ekran (oyun veya panel) açıkken kurulur. Böylece bulutta
// 7/24 boşuna bağlanmaya çalışılmaz ve bağlantı servisinin kotası harcanmaz.

let tiktok = null;
let stopTimer = null;

function ensureTikTok() {
  clearTimeout(stopTimer);
  if (!args.user || tiktok) return;
  tiktok = startTikTok({ username: args.user, signApiKey: process.env.SIGN_API_KEY, emit, onStatus: setStatus }).catch((err) => {
    console.error('[tiktok] başlatılamadı:', err.message);
    tiktok = null;
    return null;
  });
}

function scheduleTikTokStop() {
  clearTimeout(stopTimer);
  stopTimer = setTimeout(async () => {
    if (wss.clients.size > 0 || !tiktok) return;
    const conn = await tiktok;
    tiktok = null;
    conn?.stop();
    status = { ok: true, label: `TikTok: @${args.user} (oyun ekranı açılınca bağlanır)` };
    console.log('[tiktok] açık ekran kalmadı, bağlantı kapatıldı');
  }, 5 * 60 * 1000);
}

if (args.sim) {
  const sim = new Simulator(emit, { rate: 3 });
  sim.join(8);
  sim.start();
}

server.listen(args.port, () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const key = ADMIN_TOKEN ? '&key=ŞİFRE' : '';
  console.log(`\n  ${pkg.description}`);
  console.log(`  Oyun:                   http://localhost:${args.port}/`);
  console.log(`  OBS / LIVE Studio için: http://localhost:${args.port}/?obs=1${key}  (1080x1920)`);
  console.log(`  Ayrı kontrol paneli:    http://localhost:${args.port}/?panel=only${key}`);
  console.log(`  Olay kaynağı:  ${status.label}`);
  console.log(`  Şifre: ${ADMIN_TOKEN ? 'açık' : 'kapalı'} · Kayıt: ${STORAGE === 'file' ? 'data/store.json' : 'oyun ekranının tarayıcısı'}\n`);
});
