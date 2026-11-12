// Mimozai Reels — "GECE 03:17"
// Her kare renderFrame(t) ile deterministik çizilir; render.js kareleri ffmpeg'e aktarır.

const W = 1080, H = 1920, FPS = 30;
const T = { A: 0, ANSWER: 1.5, B: 3.0, C: 6.5, D: 9.3, E: 11.9, TAIL: 14.9, END: 15.3 };
window.DURATION = T.END;

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const YEL = '#FFD23F', RED = '#FF3B30';
const SANS = 'Inter, "DejaVu Sans", sans-serif';
const MONO = '"JetBrains Mono", "DejaVu Sans Mono", monospace';

// ---------- yardımcılar ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeInOut = k => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const backOut = k => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const prog = (t, s, d) => clamp((t - s) / d);
function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// ---------- efekt katmanları ----------
const noiseTiles = [];
(function () {
  const r = rng(7);
  for (let k = 0; k < 6; k++) {
    const c = mk(360, 640), g = c.getContext('2d'), im = g.createImageData(360, 640);
    for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255 | 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0); noiseTiles.push(c);
  }
})();
function grain(t, amt) {
  const f = Math.floor(t * FPS);
  ctx.save(); ctx.globalAlpha = amt; ctx.globalCompositeOperation = 'overlay';
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(noiseTiles[f % noiseTiles.length], 0, 0, W, H);
  ctx.restore();
}
const scan = mk(W, H);
(function () { const g = scan.getContext('2d'); g.fillStyle = 'rgba(0,0,0,0.16)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 2); })();
function vignette(a) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ---------- güvenlik kamerası odası (bir kez çizilir) ----------
const PX = 700, PY = 1110;           // masadaki telefon
const CLK = { x: 250, y: 500, r: 92 }; // duvar saati
const room = mk(W, H);
(function drawRoom() {
  const g = room.getContext('2d');
  let gr = g.createLinearGradient(0, 0, 0, 1060);
  gr.addColorStop(0, '#1a1a1c'); gr.addColorStop(1, '#2b2b2d');
  g.fillStyle = gr; g.fillRect(0, 0, W, 1060);
  gr = g.createLinearGradient(0, 1060, 0, H);
  gr.addColorStop(0, '#19191a'); gr.addColorStop(1, '#0b0b0c');
  g.fillStyle = gr; g.fillRect(0, 1060, W, H - 1060);
  g.fillStyle = '#0f0f10'; g.fillRect(0, 1046, W, 16);
  g.strokeStyle = 'rgba(255,255,255,0.035)'; g.lineWidth = 2;
  for (let i = -7; i <= 7; i++) { g.beginPath(); g.moveTo(540 + i * 110, 1062); g.lineTo(540 + i * 430, H); g.stroke(); }
  for (let k = 1; k < 9; k++) { const y = 1062 + Math.pow(k / 9, 1.8) * (H - 1062); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }

  // pencere + jaluzi (dışarıdan sokak lambası)
  const wx = 620, wy = 370, ww = 340, wh = 380;
  g.fillStyle = '#080809'; g.fillRect(wx - 16, wy - 16, ww + 32, wh + 32);
  gr = g.createRadialGradient(wx + ww * 0.8, wy + wh * 0.15, 10, wx + ww * 0.6, wy + wh * 0.35, ww * 1.1);
  gr.addColorStop(0, '#d0d0d0'); gr.addColorStop(1, '#3c3c3e');
  g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
  for (let y = wy; y < wy + wh; y += 24) { g.fillStyle = 'rgba(16,16,18,0.93)'; g.fillRect(wx, y, ww, 16); }
  g.fillStyle = '#080809'; g.fillRect(wx + ww / 2 - 5, wy, 10, wh);
  // jaluziden düşen ışık şeritleri
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 18; i++) {
    const y0 = wy + i * 24 + 16;
    g.fillStyle = 'rgba(255,255,255,0.03)';
    g.beginPath(); g.moveTo(wx, y0); g.lineTo(wx, y0 + 8);
    g.lineTo(wx - 520, y0 + 8 + 600); g.lineTo(wx - 520, y0 + 600 - 6); g.closePath(); g.fill();
  }
  g.restore();

  // duvar saati kadranı
  g.fillStyle = '#0c0c0d'; g.beginPath(); g.arc(CLK.x, CLK.y, CLK.r + 10, 0, 7); g.fill();
  gr = g.createRadialGradient(CLK.x - 20, CLK.y - 20, 5, CLK.x, CLK.y, CLK.r);
  gr.addColorStop(0, '#9a9a9a'); gr.addColorStop(1, '#6a6a6b');
  g.fillStyle = gr; g.beginPath(); g.arc(CLK.x, CLK.y, CLK.r, 0, 7); g.fill();
  g.strokeStyle = '#151515';
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2; g.lineWidth = i % 3 === 0 ? 7 : 3;
    g.beginPath(); g.moveTo(CLK.x + Math.cos(a) * (CLK.r - 8), CLK.y + Math.sin(a) * (CLK.r - 8));
    g.lineTo(CLK.x + Math.cos(a) * (CLK.r - 22), CLK.y + Math.sin(a) * (CLK.r - 22)); g.stroke();
  }

  // monitör (arkadan) + boş sandalye
  g.fillStyle = '#18181a'; rr(g, 520, 860, 190, 220, 34); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 3; rr(g, 520, 860, 190, 220, 34); g.stroke();
  g.fillStyle = '#111112'; rr(g, 170, 820, 290, 200, 8); g.fill();
  g.fillRect(295, 1015, 40, 40);

  // masa üstü (perspektif) + ön panel
  gr = g.createLinearGradient(0, 1010, 0, 1230);
  gr.addColorStop(0, '#2c2c2e'); gr.addColorStop(1, '#3a3a3c');
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(110, 1010); g.lineTo(970, 1010); g.lineTo(1050, 1230); g.lineTo(30, 1230); g.closePath(); g.fill();
  g.fillStyle = '#4a4a4c'; g.fillRect(30, 1226, 1020, 8);
  gr = g.createLinearGradient(0, 1234, 0, 1720);
  gr.addColorStop(0, '#232325'); gr.addColorStop(1, '#141415');
  g.fillStyle = gr; g.fillRect(30, 1234, 1020, 486);
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 4;
  for (let x = 30 + 204; x < 1050; x += 204) { g.beginPath(); g.moveTo(x, 1240); g.lineTo(x, 1720); g.stroke(); }
  // masa üstünde kalemlik ve not defteri
  g.fillStyle = '#1b1b1d'; rr(g, 230, 1080, 70, 90, 10); g.fill();
  g.fillStyle = '#5a5a5c';
  g.save(); g.translate(400, 1150); g.scale(1, 0.45); g.rotate(0.3); g.fillRect(-90, -120, 180, 240); g.restore();
})();

function clockHands(g, secs) {
  const hA = ((3 + 17 / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  const mA = ((17 + secs / 60) / 60) * Math.PI * 2 - Math.PI / 2;
  const sA = (secs / 60) * Math.PI * 2 - Math.PI / 2;
  g.save(); g.strokeStyle = '#111'; g.lineCap = 'round';
  g.lineWidth = 9; g.beginPath(); g.moveTo(CLK.x, CLK.y); g.lineTo(CLK.x + Math.cos(hA) * 48, CLK.y + Math.sin(hA) * 48); g.stroke();
  g.lineWidth = 6; g.beginPath(); g.moveTo(CLK.x, CLK.y); g.lineTo(CLK.x + Math.cos(mA) * 72, CLK.y + Math.sin(mA) * 72); g.stroke();
  g.strokeStyle = '#2a2a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(CLK.x, CLK.y); g.lineTo(CLK.x + Math.cos(sA) * 78, CLK.y + Math.sin(sA) * 78); g.stroke();
  g.restore();
}

const ringOn = rt => rt >= 0 && rt < T.ANSWER && (rt % 0.75) < 0.5;

function drawPhone(g, t, o) {
  const ring = o.state === 'ringing' && ringOn(o.rt);
  let jx = 0, jy = 0;
  if (ring) { const r = rng(Math.floor(t * 60) + 3); jx = (r() - .5) * 8; jy = (r() - .5) * 4; }
  const lit = o.state === 'ringing' ? (ring ? 1 : 0.8) : o.state === 'answered' ? 0.7 : 0;
  if (lit > 0) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const pulse = ring ? 0.85 + 0.15 * Math.sin(t * 40) : 1;
    g.translate(PX, PY); g.scale(1, 0.5);
    let gr = g.createRadialGradient(0, 0, 10, 0, 0, 360);
    gr.addColorStop(0, `rgba(255,255,255,${0.5 * lit * pulse})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 360, 0, 7); g.fill();
    g.restore();
    g.save(); g.globalCompositeOperation = 'lighter';
    let gr2 = g.createRadialGradient(PX, PY - 60, 20, PX, PY - 60, 700);
    gr2.addColorStop(0, `rgba(255,255,255,${0.12 * lit * pulse})`); gr2.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr2; g.fillRect(0, 0, W, H);
    g.restore();
  }
  g.save(); g.translate(PX + jx, PY + jy); g.scale(1, 0.46); g.rotate(-0.42);
  g.fillStyle = '#040404'; rr(g, -64, -128, 128, 256, 24); g.fill();
  if (lit > 0) {
    g.fillStyle = `rgba(240,240,240,${0.35 + 0.65 * lit})`; rr(g, -56, -119, 112, 238, 17); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.55)';
    if (o.state === 'ringing') { g.beginPath(); g.arc(-26, 80, 14, 0, 7); g.arc(26, 80, 14, 0, 7); g.fill(); }
    else { g.fillRect(-36, -40, 72, 10); g.fillRect(-26, -20, 52, 8); g.beginPath(); g.arc(0, 84, 15, 0, 7); g.fill(); }
  } else { g.fillStyle = '#0d0d0f'; rr(g, -56, -119, 112, 238, 17); g.fill(); }
  g.restore();
}

function hud(t, o) {
  ctx.save();
  ctx.font = `700 34px ${MONO}`; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 8;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('CAM 02 · RESEPSİYON', 76, 250);
  ctx.fillText(`13.11.2026  03:17:${String(o.secs).padStart(2, '0')}`, 76, 296);
  ctx.textAlign = 'right';
  ctx.fillText('REC', W - 76, 250);
  if (Math.floor(t * 2) % 2 === 0) {
    ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(W - 76 - ctx.measureText('REC').width - 26, 250, 13, 0, 7); ctx.fill();
  }
  if (o.zoomLabel) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillText(o.zoomLabel, W - 76, 296); }
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 5;
  const m = 44, L = 64, top = 196, bot = H - 196;
  [[m, top, 1, 1], [W - m, top, -1, 1], [m, bot, 1, -1], [W - m, bot, -1, -1]].forEach(([x, y, sx, sy]) => {
    ctx.beginPath(); ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y); ctx.stroke();
  });
  ctx.restore();
}

function drawCam(t, o) {
  ctx.save();
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.translate(PX, PY); ctx.scale(o.zoom, o.zoom); ctx.translate(-PX, -PY);
  if (o.blur) ctx.filter = `blur(${o.blur}px)`;
  ctx.drawImage(room, 0, 0);
  clockHands(ctx, o.secs + (t % 1));
  drawPhone(ctx, t, o);
  ctx.restore();
  if (o.dim) { ctx.fillStyle = `rgba(0,0,0,${o.dim})`; ctx.fillRect(0, 0, W, H); }
  // kayan parlak bant (eski kamera)
  const by = ((t * 380) % (H + 400)) - 200;
  const bg = ctx.createLinearGradient(0, by - 90, 0, by + 90);
  bg.addColorStop(0, 'rgba(255,255,255,0)'); bg.addColorStop(.5, 'rgba(255,255,255,0.035)'); bg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = bg; ctx.fillRect(0, by - 90, W, 180);
  ctx.drawImage(scan, 0, 0);
  vignette(0.8);
  grain(t, 0.24);
  hud(t, o);
}

// ---------- metin ----------
// lines: [[ [metin, renk], ... ], ...]
function caption(lines, cx, cy, o = {}) {
  const fs = o.size || 80, lh = fs * 1.34, padX = o.padX ?? 26;
  const a = o.alpha ?? 1, s = o.scale ?? 1;
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
  ctx.font = `${o.weight || 800} ${fs}px ${SANS}`;
  ctx.textBaseline = 'middle';
  const widths = lines.map(l => l.reduce((acc, [tx]) => acc + ctx.measureText(tx).width, 0));
  let y = cy - (lines.length * lh) / 2 + lh / 2;
  lines.forEach((l, i) => {
    const w = widths[i];
    let x = cx - w / 2;
    if (o.box) { ctx.fillStyle = o.box; rr(ctx, x - padX, y - fs * 0.64, w + padX * 2, fs * 1.28, 14); ctx.fill(); }
    if (o.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24; }
    for (const [tx, col] of l) { ctx.fillStyle = col; ctx.fillText(tx, x, y + fs * 0.04); x += ctx.measureText(tx).width; }
    ctx.shadowBlur = 0;
    y += lh;
  });
  ctx.restore();
}
const pop = (t, s, d = 0.18) => { const k = prog(t, s, d); return { alpha: clamp(k * 3), scale: lerp(0.86, 1, backOut(k)) }; };

// ---------- SAHNE A: kamera, telefon çalıyor (0 – 3.0) ----------
function sceneA(t) {
  const zoom = 1 + 0.07 * easeInOut(prog(t, 0, T.B));
  drawCam(t, { zoom, state: t < T.ANSWER ? 'ringing' : 'answered', rt: t, secs: 42 + Math.floor(t) });
  const BOX = 'rgba(0,0,0,0.78)';
  if (t < T.ANSWER) {
    ctx.save(); ctx.font = `800 46px ${MONO}`; ctx.letterSpacing = '6px';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lw = ctx.measureText('GECE 03:17').width;
    ctx.fillStyle = YEL; rr(ctx, 540 - lw / 2 - 22, 690 - 36, lw + 44, 72, 10); ctx.fill();
    ctx.fillStyle = '#000'; ctx.fillText('GECE 03:17', 540 + 3, 692);
    ctx.restore();
    caption([[['İş yerimde', '#fff']], [['kimse yoktu.', '#fff']]], 540, 840, { size: 92, box: BOX });
  } else {
    const p = pop(t, T.ANSWER, 0.2);
    caption([[['…ama ', '#fff'], ['biri', YEL]], [['telefonu açtı.', '#fff']]], 540, 800, { size: 92, box: BOX, ...p });
  }
}

// ---------- SAHNE B: yakınlaştırma + konuşma (3.0 – 6.5) ----------
function callCard(t, k) {
  const cx = 540, top = 380, w = 800, h = 560;
  ctx.save();
  ctx.globalAlpha = clamp(k * 2);
  ctx.translate(cx, top + h / 2); ctx.scale(lerp(0.88, 1, backOut(k)), lerp(0.88, 1, backOut(k))); ctx.translate(-cx, -(top + h / 2));
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 60;
  ctx.fillStyle = '#121214'; rr(ctx, cx - w / 2, top, w, h, 48); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2; rr(ctx, cx - w / 2, top, w, h, 48); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // durum
  ctx.font = `700 30px ${SANS}`; ctx.letterSpacing = '4px';
  const st = 'AKTİF GÖRÜŞME', sw = ctx.measureText(st).width;
  ctx.fillStyle = '#34C759'; ctx.beginPath(); ctx.arc(cx - sw / 2 - 22, top + 70, 9, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fillText(st, cx + 4, top + 71);
  ctx.letterSpacing = '0px';
  // avatar
  ctx.fillStyle = '#2a2a2e'; ctx.beginPath(); ctx.arc(cx, top + 175, 64, 0, 7); ctx.fill();
  ctx.fillStyle = '#6d6d73'; ctx.beginPath(); ctx.arc(cx, top + 158, 24, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, top + 214, 40, 26, 0, Math.PI, 0); ctx.fill();
  // numara + süre
  ctx.fillStyle = '#fff'; ctx.font = `700 52px ${SANS}`; ctx.fillText('+90 532 ••• •• 47', cx, top + 290);
  const el = Math.max(0, Math.floor(t - T.ANSWER));
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = `500 34px ${MONO}`; ctx.fillText(`00:${String(el).padStart(2, '0')}`, cx, top + 345);
  // ses dalgası
  const n = 31, bw = 12, gap = 9, total = n * bw + (n - 1) * gap;
  for (let i = 0; i < n; i++) {
    const ph = i * 0.55;
    const env = 0.55 + 0.45 * Math.sin(t * 3.1 + i * 0.21);
    const v = Math.abs(Math.sin(t * 9 + ph) * Math.sin(t * 5.3 + ph * 1.7)) * env;
    const bh = 10 + v * 74;
    ctx.fillStyle = YEL; rr(ctx, cx - total / 2 + i * (bw + gap), top + 430 - bh / 2, bw, bh, 6); ctx.fill();
  }
  ctx.font = `700 28px ${SANS}`; ctx.letterSpacing = '4px';
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillText('YANITLAYAN: ???', cx + 2, top + 512);
  ctx.restore();
}
function bubble(lines, side, y, k, o = {}) {
  if (k <= 0) return;
  const fs = 50, lh = 64, padX = 40, padY = 30;
  ctx.save();
  ctx.font = `${o.weight || 600} ${fs}px ${SANS}`;
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + padX * 2;
  const h = lines.length * lh + padY * 2 - (lh - fs) + 6;
  const x = side === 'L' ? 80 : W - 80 - w;
  const ox = side === 'L' ? x : x + w, oy = y + h;
  const s = lerp(0.5, 1, backOut(k));
  ctx.globalAlpha = clamp(k * 3);
  ctx.translate(ox, oy); ctx.scale(s, s); ctx.translate(-ox, -oy);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30;
  ctx.fillStyle = side === 'L' ? '#3a3a3e' : YEL;
  rr(ctx, x, y, w, h, 40); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = side === 'L' ? '#fff' : '#111';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, x + padX, y + padY + i * lh));
  ctx.font = `700 26px ${SANS}`; ctx.letterSpacing = '3px';
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.textAlign = side === 'L' ? 'left' : 'right';
  ctx.fillText(o.label || '', side === 'L' ? x + 8 : x + w - 8, y - 44);
  ctx.restore();
}
function typing(y, k, t) {
  if (k <= 0) return;
  const w = 170, h = 96, x = W - 80 - w;
  ctx.save(); ctx.globalAlpha = clamp(k * 3);
  ctx.fillStyle = YEL; rr(ctx, x, y, w, h, 40); ctx.fill();
  for (let i = 0; i < 3; i++) {
    const b = 0.5 + 0.5 * Math.sin(t * 14 - i * 0.9);
    ctx.fillStyle = `rgba(0,0,0,${0.35 + 0.5 * b})`; ctx.beginPath(); ctx.arc(x + 50 + i * 35, y + h / 2 - b * 6, 11, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function sceneB(t) {
  const lt = t - T.B;
  const zk = easeOut(prog(lt, 0, 0.22));
  drawCam(t, { zoom: lerp(1.07, 2.6, zk), blur: lerp(0, 16, zk), dim: lerp(0, 0.55, zk), state: 'answered', rt: t, secs: 42 + Math.floor(t), zoomLabel: 'ZOOM 4.0×' });
  callCard(t, prog(lt, 0.08, 0.3));
  bubble(['Dişim çok ağrıyor,', 'sabah yer var mı?'], 'L', 1060, prog(t, 3.35, 0.28), { label: 'ARAYAN' });
  const ty = prog(t, 4.05, 0.15) * (t < 4.6 ? 1 : 0);
  typing(1310, ty, t);
  bubble(['Geçmiş olsun.', '09:30\'a ayırdım ✓'], 'R', 1290, prog(t, 4.6, 0.28), { weight: 700, label: '???' });
}

// ---------- SAHNE C: sabah, bildirimler (6.5 – 9.3) ----------
const NOTIFS = [
  { at: 6.8, time: '03:17', title: 'Yeni randevu', body: 'Dr. Ayşe · bugün 09:30' },
  { at: 7.1, time: '04:02', title: 'Fiyat bilgisi verildi', body: 'İmplant fiyatı soruldu' },
  { at: 7.4, time: '05:48', title: 'Yeni randevu', body: 'Cuma · 14:00' },
  { at: 7.7, time: '06:31', title: 'Randevu ertelendi', body: 'Salı 11:00 → Çarşamba 15:00' },
];
function handset(g, cx, cy, s) {
  g.save(); g.translate(cx, cy); g.rotate(-Math.PI / 4); g.fillStyle = '#111';
  rr(g, -9 * s, -24 * s, 18 * s, 48 * s, 7 * s); g.fill();
  rr(g, -9 * s, -30 * s, 24 * s, 16 * s, 6 * s); g.fill();
  rr(g, -9 * s, 14 * s, 24 * s, 16 * s, 6 * s); g.fill();
  g.restore();
}
function sceneC(t) {
  const lt = t - T.C;
  let gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#1d1636'); gr.addColorStop(0.42, '#6b2f5e'); gr.addColorStop(0.78, '#e2724f'); gr.addColorStop(1, '#ffbb63');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  const sun = ctx.createRadialGradient(540, H + 120, 50, 540, H + 120, 1000 + lt * 40);
  sun.addColorStop(0, 'rgba(255,226,150,0.85)'); sun.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H);
  grain(t, 0.06);
  // kilit ekranı
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = `600 44px ${SANS}`;
  ctx.fillText('Cuma, 13 Kasım', 540, 270);
  ctx.fillStyle = '#fff'; ctx.font = `700 190px ${SANS}`;
  ctx.fillText('07:02', 540, 400);
  ctx.restore();
  // bildirimler
  NOTIFS.forEach((n, i) => {
    const k = easeOut(prog(t, n.at, 0.24));
    if (k <= 0) return;
    const x = 80, w = 920, h = 150, y = 540 + i * 168;
    ctx.save(); ctx.globalAlpha = k;
    ctx.translate(0, lerp(-50, 0, k));
    ctx.shadowColor = 'rgba(40,10,40,0.35)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 10;
    ctx.fillStyle = 'rgba(248,246,250,0.94)'; rr(ctx, x, y, w, h, 38); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = YEL; rr(ctx, x + 28, y + 31, 88, 88, 22); ctx.fill();
    handset(ctx, x + 72, y + 75, 1.25);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#7a7480'; ctx.font = `700 25px ${SANS}`; ctx.letterSpacing = '3px';
    ctx.fillText('ARAMA ASİSTANI', x + 148, y + 40);
    ctx.letterSpacing = '0px'; ctx.textAlign = 'right'; ctx.font = `600 28px ${SANS}`;
    ctx.fillText(n.time, x + w - 32, y + 40);
    ctx.textAlign = 'left'; ctx.fillStyle = '#111'; ctx.font = `800 40px ${SANS}`;
    ctx.fillText(n.title, x + 148, y + 82);
    ctx.fillStyle = '#3b3640'; ctx.font = `500 33px ${SANS}`;
    ctx.fillText(n.body, x + 148, y + 121);
    ctx.restore();
  });
  const p = pop(t, 8.3, 0.22);
  caption([[['Ben uyurken: ', '#fff'], ['4 müşteri', YEL]], [['0 cevapsız arama.', '#fff']]], 540, 1360, { size: 70, box: 'rgba(0,0,0,0.82)', ...p });
  // geçiş flaşı
  const fl = 1 - prog(lt, 0, 0.28);
  if (fl > 0) { ctx.fillStyle = `rgba(255,255,255,${fl})`; ctx.fillRect(0, 0, W, H); }
}

// ---------- SAHNE D: MAAŞ / SİGORTA / İZİN / UYKU (9.3 – 11.9) ----------
const WORDS = [
  { w: 'MAAŞ', at: 9.3, strike: 9.5 },
  { w: 'SİGORTA', at: 9.9, strike: 10.1 },
  { w: 'İZİN', at: 10.5, strike: 10.7 },
  { w: 'UYKU', at: 11.1, strike: 11.3 },
];
function sceneD(t) {
  ctx.fillStyle = '#0c0c0e'; ctx.fillRect(0, 0, W, H);
  let shake = 0;
  WORDS.forEach(o => { const d = t - o.strike; if (d >= 0 && d < 0.25) shake = Math.max(shake, (1 - d / 0.25) * 14); });
  const r = rng(Math.floor(t * FPS) + 11);
  ctx.save(); ctx.translate((r() - .5) * shake, (r() - .5) * shake);
  WORDS.forEach((o, i) => {
    const k = prog(t, o.at, 0.16);
    if (k <= 0) return;
    const y = 640 + i * 215;
    const sk = easeOut(prog(t, o.strike, 0.12));
    ctx.save();
    ctx.globalAlpha = clamp(k * 3);
    const s = lerp(1.25, 1, easeOut(k));
    ctx.translate(540, y); ctx.scale(s, s);
    ctx.font = `900 168px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = sk > 0 ? `rgb(${lerp(255, 92, sk)},${lerp(255, 92, sk)},${lerp(255, 96, sk)})` : '#fff';
    ctx.fillText(o.w, 0, 6);
    if (sk > 0) {
      const tw = ctx.measureText(o.w).width + 70;
      ctx.rotate(-0.06);
      ctx.fillStyle = RED; rr(ctx, -tw / 2, -12, tw * sk, 24, 12); ctx.fill();
    }
    ctx.restore();
  });
  ctx.restore();
  grain(t, 0.07);
}

// ---------- SAHNE E: Mimozai (düz yazı) + CTA (11.9 – 14.9) ----------
function sceneE(t) {
  const lt = t - T.E;
  ctx.fillStyle = '#0b0b0d'; ctx.fillRect(0, 0, W, H);
  const gk = easeOut(prog(lt, 0.2, 0.8));
  const glow = ctx.createRadialGradient(540, 860, 20, 540, 860, 760);
  glow.addColorStop(0, `rgba(255,210,63,${0.22 * gk})`); glow.addColorStop(1, 'rgba(255,210,63,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  grain(t, 0.07);
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let k = prog(t, 11.9, 0.2);
  ctx.globalAlpha = k; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = `600 52px ${SANS}`;
  ctx.fillText('Tanışın:', 540, 700 + (1 - easeOut(k)) * 20);
  k = prog(t, 12.2, 0.3);
  const s = lerp(0.8, 1, backOut(k));
  ctx.globalAlpha = clamp(k * 3);
  ctx.save(); ctx.translate(540, 850); ctx.scale(s, s);
  ctx.fillStyle = '#fff'; ctx.font = `900 196px ${SANS}`; ctx.letterSpacing = '-4px';
  ctx.fillText('Mimozai', 0, 0);
  ctx.restore();
  ctx.letterSpacing = '0px';
  k = prog(t, 12.5, 0.25);
  ctx.globalAlpha = k; ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = `600 54px ${SANS}`;
  const dy = (1 - easeOut(k)) * 24;
  ctx.fillText('Sen uyurken bile', 540, 1010 + dy);
  ctx.fillText('işletmen için çalışan biri.', 540, 1080 + dy);
  ctx.restore();
  // CTA
  const ck = prog(t, 13.1, 0.3);
  if (ck > 0) {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 58px ${SANS}`;
    const label = 'Yorumlara “GECE” yaz';
    const w = ctx.measureText(label).width + 100, h = 124;
    const cs = lerp(0.6, 1, backOut(ck));
    ctx.globalAlpha = clamp(ck * 3);
    ctx.translate(540, 1290); ctx.scale(cs, cs);
    const breathe = 1 + 0.025 * Math.sin((t - 13.4) * 7) * (t > 13.4 ? 1 : 0);
    ctx.scale(breathe, breathe);
    ctx.shadowColor = 'rgba(255,210,63,0.45)'; ctx.shadowBlur = 50;
    ctx.fillStyle = YEL; rr(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#111'; ctx.fillText(label, 0, 4);
    ctx.restore();
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = prog(t, 13.35, 0.25); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = `500 42px ${SANS}`;
    ctx.fillText('ücretsiz demo hattını kuralım', 540, 1420);
    ctx.restore();
  }
}

// ---------- KUYRUK: döngü için tekrar kamera (14.9 – 15.3) ----------
function sceneTail(t) {
  drawCam(t, { zoom: 1, state: 'idle', rt: -1, secs: 41 });
}

// ---------- ana ----------
window.renderFrame = function (t, fmt = 'image/jpeg', q = 0.93) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  if (t < T.B) sceneA(t);
  else if (t < T.C) sceneB(t);
  else if (t < T.D) sceneC(t);
  else if (t < T.E) sceneD(t);
  else if (t < T.TAIL) sceneE(t);
  else sceneTail(t);
  ctx.restore();
  return cv.toDataURL(fmt, q);
};
window.READY = true;
