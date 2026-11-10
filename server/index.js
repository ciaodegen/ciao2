// Yerel sunucu: oyunu tarayıcıya/OBS'e sunar, TikTok olaylarını WebSocket ile iletir,
// profilleri data/store.json'a kaydeder.
//
//   npm run sim                          -> sahte izleyicilerle test
//   npm start -- --user kullaniciadi     -> gerçek TikTok yayınına bağlan
//
// Ayarlar ortam değişkeniyle de verilebilir: TIKTOK_USER, SIGN_API_KEY, PORT

import http from 'node:http';
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
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const store = await new FileStore(join(ROOT, 'data', 'store.json')).load();
let status = { ok: true, label: args.user ? `TikTok: @${args.user}` : args.sim ? 'Sunucu: sahte izleyiciler' : 'Sunucu hazır (olay kaynağı yok)' };
const source = args.user ? 'tiktok' : args.sim ? 'sim' : 'idle';

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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = decodeURIComponent(url.pathname);

  if (path === '/api/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, source, user: args.user || null, status }));
  }
  if (path === '/api/state' && req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(store.data));
  }
  if (path === '/api/state' && req.method === 'POST') {
    try {
      store.merge(await readJson(req));
      res.writeHead(204);
      return res.end();
    } catch {
      res.writeHead(400);
      return res.end();
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

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ kind: 'status', ...status }));
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    // Kontrol panelinden gelen olay/komutları diğer ekranlara (OBS) ilet
    if (msg.kind === 'event' && msg.event && typeof msg.event.type === 'string') broadcast({ kind: 'event', event: msg.event }, ws);
    if (msg.kind === 'command' && (msg.name === 'konvoy' || msg.name === 'skip')) broadcast({ kind: 'command', name: msg.name }, ws);
  });
});

const emit = (event) => broadcast({ kind: 'event', event });
const setStatus = (s) => {
  status = s;
  broadcast({ kind: 'status', ...status });
};

// ---------------------------------------------------------------- olay kaynağı

if (args.user) {
  startTikTok({ username: args.user, signApiKey: process.env.SIGN_API_KEY, emit, onStatus: setStatus }).catch((err) => {
    console.error('[tiktok] başlatılamadı:', err.message);
  });
} else if (args.sim) {
  const sim = new Simulator(emit, { rate: 3 });
  sim.join(8);
  sim.start();
}

server.listen(args.port, () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  console.log(`\n  ${pkg.description}`);
  console.log(`  Oyun:          http://localhost:${args.port}/`);
  console.log(`  OBS / LIVE Studio için: http://localhost:${args.port}/?obs=1  (1080x1920)`);
  console.log(`  Ayrı kontrol paneli:    http://localhost:${args.port}/?panel=only`);
  console.log(`  Olay kaynağı:  ${status.label}\n`);
});
