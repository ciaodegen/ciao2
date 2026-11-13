// Mimozai Reels — "Günde 5 cevapsız arama = ayda 150 kaçan müşteri"
// Her kare renderFrame(t) ile deterministik çizilir; zamanlar timeline.js'ten (seslendirmeden) gelir.

const W = 1080, H = 1920, FPS = 30;
const TL = window.TL;
window.DURATION = TL.END;

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const YEL = '#FFD23F', RED = '#FF453A', GREEN = '#34C759';
const SANS = 'Inter, "DejaVu Sans", sans-serif';

// ---------- yardımcılar ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeInOut = k => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const backOut = k => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const prog = (t, s, d) => clamp((t - s) / Math.max(d, 1e-3));
function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
const fmt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

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
  ctx.save(); ctx.globalAlpha = amt; ctx.globalCompositeOperation = 'overlay'; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(noiseTiles[Math.floor(t * FPS) % noiseTiles.length], 0, 0, W, H); ctx.restore();
}
function background(t, color, strength, cy = 700) {
  ctx.fillStyle = '#0b0b0d'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(540, cy, 30, 540, cy, 1100);
  g.addColorStop(0, color.replace('A', strength)); g.addColorStop(1, color.replace('A', 0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  grain(t, 0.07);
}
// tek satır, parçaları farklı renk/opaklıkta: [[metin, renk, alpha]]
function line(parts, cx, cy, size, weight = 800, shadow = true) {
  ctx.save();
  const base = ctx.globalAlpha;
  ctx.font = `${weight} ${size}px ${SANS}`; ctx.textBaseline = 'middle';
  const w = parts.reduce((s, [tx]) => s + ctx.measureText(tx).width, 0);
  let x = cx - w / 2;
  if (shadow) { ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 30; }
  for (const [tx, col, a = 1] of parts) {
    ctx.globalAlpha = base * clamp(a); ctx.fillStyle = col; ctx.fillText(tx, x, cy); x += ctx.measureText(tx).width;
  }
  ctx.restore();
}
function tag(text, cx, cy, bg = YEL, fg = '#111', size = 40, a = 1) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = `800 ${size}px ${SANS}`; ctx.letterSpacing = '5px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 44;
  ctx.fillStyle = bg; rr(ctx, cx - w / 2, cy - size * 0.85, w, size * 1.7, 12); ctx.fill();
  ctx.fillStyle = fg; ctx.fillText(text, cx + 3, cy + 2);
  ctx.restore();
}
function popScale(t, at, d = 0.25) { const k = prog(t, at, d); return { a: clamp(k * 3), s: lerp(0.7, 1, backOut(k)), k }; }
function handset(g, cx, cy, s, color) {
  g.save(); g.translate(cx, cy); g.rotate(-Math.PI / 4); g.fillStyle = color;
  rr(g, -8 * s, -22 * s, 16 * s, 44 * s, 6 * s); g.fill();
  rr(g, -8 * s, -28 * s, 22 * s, 15 * s, 6 * s); g.fill();
  rr(g, -8 * s, 13 * s, 22 * s, 15 * s, 6 * s); g.fill();
  g.restore();
}

// ---------- SAHNE A: günde 5 cevapsız arama ----------
const MISSED = [
  { time: '09:12', why: 'Yoğun saat · hat meşguldü' },
  { time: '12:47', why: 'Öğle arası' },
  { time: '15:05', why: 'Müşteriyle ilgileniyordun' },
  { time: '18:40', why: 'Mesai bitmişti' },
  { time: '21:15', why: 'İş yeri kapalı' },
];
function sceneA(t) {
  background(t, 'rgba(255,69,58,A)', 0.16, 420);
  // kanca: ilk karede tam görünür
  tag('GÜNDE SADECE', 540, 300, YEL, '#111', 40);
  line([['5', RED], [' cevapsız', '#fff']], 540, 440, 128, 900);
  line([['arama…', '#fff']], 540, 580, 128, 900);
  MISSED.forEach((m, i) => {
    const at = TL.notifs[i];
    const k = at <= 0 ? 1 : easeOut(prog(t, at, 0.22));
    if (k <= 0) return;
    const x = 90, w = 900, h = 132, y = 720 + i * 146;
    const sh = at > 0 ? Math.max(0, 1 - (t - at) / 0.3) : 0;
    const r = rng(Math.floor(t * 60) + i);
    ctx.save(); ctx.globalAlpha = k;
    ctx.translate((r() - .5) * 10 * sh, lerp(-60, 0, k));
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 36; ctx.shadowOffsetY = 8;
    ctx.fillStyle = 'rgba(246,245,248,0.96)'; rr(ctx, x, y, w, h, 34); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(x + 70, y + h / 2, 40, 0, 7); ctx.fill();
    handset(ctx, x + 70, y + h / 2, 1.05, '#fff');
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#111'; ctx.font = `800 40px ${SANS}`; ctx.fillText('Cevapsız arama', x + 134, y + 48);
    ctx.fillStyle = '#5e5866'; ctx.font = `500 32px ${SANS}`; ctx.fillText(m.why, x + 134, y + 92);
    ctx.textAlign = 'right'; ctx.fillStyle = RED; ctx.font = `700 32px ${SANS}`; ctx.fillText(m.time, x + w - 36, y + 48);
    ctx.restore();
  });
}

// ---------- SAHNE B: takvim, 5 → 150 ----------
function sceneB(t) {
  background(t, 'rgba(255,69,58,A)', 0.18, 560);
  const k = easeInOut(prog(t, TL.countStart, TL.countEnd - TL.countStart));
  const val = Math.max(5, Math.round(lerp(5, 150, k) / 5) * 5);
  const done = t >= TL.countEnd;
  tag('1 AY = 30 GÜN', 540, 290, 'rgba(255,255,255,0.12)', '#fff', 36);
  const pulse = done ? 1 + 0.08 * Math.exp(-(t - TL.countEnd) * 6) : 1;
  ctx.save(); ctx.translate(540, 500); ctx.scale(pulse, pulse);
  line([[String(val), done ? RED : '#fff']], 0, 0, 280, 900);
  ctx.restore();
  const lk = prog(t, Math.min(TL.kacan, TL.countEnd + 0.15), 0.2);
  line([['kaçan müşteri', RED, lk]], 540, 680, 74, 800);
  // takvim ızgarası
  const cols = 6, cw = 128, ch = 100, gap = 14, x0 = (W - (cols * cw + (cols - 1) * gap)) / 2, y0 = 800;
  const filled = val / 5;
  for (let d = 0; d < 30; d++) {
    const cx = x0 + (d % cols) * (cw + gap), cy = y0 + Math.floor(d / cols) * (ch + gap);
    const on = d < filled;
    ctx.save();
    if (on) {
      const fk = clamp((filled - d) * 1.5);
      ctx.fillStyle = `rgba(255,69,58,${0.25 + 0.6 * fk})`; rr(ctx, cx, cy, cw, ch, 18); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 3; rr(ctx, cx, cy, cw, ch, 18); ctx.stroke();
    }
    ctx.textBaseline = 'top'; ctx.font = `600 24px ${SANS}`; ctx.fillStyle = on ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)';
    ctx.fillText(String(d + 1), cx + 14, cy + 10);
    if (on) { ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.font = `900 40px ${SANS}`; ctx.fillStyle = '#fff'; ctx.fillText('+5', cx + cw - 14, cy + ch - 8); }
    ctx.restore();
  }
}

// ---------- SAHNE C: 150 × 1.000 ₺ = 150.000 ₺ → rakibe ----------
function sceneC(t) {
  const lossK = prog(t, TL.moneyStart, 1.2);
  background(t, 'rgba(255,40,30,A)', 0.14 + 0.14 * lossK, 900);
  const e1 = prog(t, TL.C, 0.2), e2 = prog(t, TL.eq, 0.2);
  line([['150 müşteri', '#fff', e1], ['  ×  ', 'rgba(255,255,255,0.6)', e2], ['1.000 ₺', YEL, e2]], 540, 560, 78, 800);
  if (t >= TL.moneyStart) {
    const mk_ = easeOut(prog(t, TL.moneyStart, TL.moneyEnd - TL.moneyStart));
    const v = Math.round(lerp(0, 150000, mk_) / 1000) * 1000;
    const fly = easeInOut(prog(t, TL.rakip, 0.55));
    const done = t >= TL.moneyEnd;
    const pulse = done ? 1 + 0.07 * Math.exp(-(t - TL.moneyEnd) * 6) : 1;
    tag('HER AY', 540, 730, 'rgba(255,255,255,0.12)', '#fff', 36);
    // geride kalan soluk iz
    if (fly > 0) {
      ctx.save(); ctx.globalAlpha = 0.5 * clamp((fly - 0.65) / 0.35); line([[`${fmt(150000)} ₺`, 'rgba(255,255,255,0.18)']], 540, 900, 176, 900, false); ctx.restore();
    }
    // sağa uçup giden para
    ctx.save(); ctx.globalAlpha = 1 - fly;
    ctx.translate(540 + fly * 1000, 900 - fly * 40); ctx.rotate(fly * 0.12); ctx.scale(pulse * (1 - 0.3 * fly), pulse * (1 - 0.3 * fly));
    line([[`${fmt(v)} ₺`, RED]], 0, 0, 176, 900);
    ctx.restore();
  }
  const p = popScale(t, TL.rakip, 0.28);
  if (p.a > 0) {
    ctx.save(); ctx.globalAlpha = p.a; ctx.translate(540, 1130); ctx.scale(p.s, p.s);
    ctx.font = `900 92px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const txt = 'rakibine gidiyor', w = ctx.measureText(txt).width + 70;
    ctx.fillStyle = RED; rr(ctx, -w / 2, -66, w, 132, 22); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(txt, 0, 4);
    ctx.restore();
    // ok
    ctx.save(); ctx.globalAlpha = p.a; ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    const ax = 540 + lerp(-40, 40, easeOut(prog(t, TL.rakip, 0.6)));
    ctx.beginPath(); ctx.moveTo(ax - 70, 1290); ctx.lineTo(ax + 70, 1290); ctx.lineTo(ax + 40, 1260); ctx.moveTo(ax + 70, 1290); ctx.lineTo(ax + 40, 1320); ctx.stroke();
    ctx.restore();
  }
}

// ---------- SAHNE D: Mimozai (düz yazı) + çözüm + CTA ----------
function sceneD(t) {
  const lt = t - TL.D;
  ctx.fillStyle = '#0b0b0d'; ctx.fillRect(0, 0, W, H);
  const gk = easeOut(prog(lt, 0, 0.8));
  const glow = ctx.createRadialGradient(540, 760, 20, 540, 760, 820);
  glow.addColorStop(0, `rgba(255,210,63,${0.22 * gk})`); glow.addColorStop(1, 'rgba(255,210,63,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  grain(t, 0.07);
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let p = popScale(t, TL.mimoza - 0.05, 0.3);
  ctx.globalAlpha = p.a; ctx.translate(540, 600); ctx.scale(p.s, p.s);
  ctx.fillStyle = '#fff'; ctx.font = `900 190px ${SANS}`; ctx.letterSpacing = '-4px'; ctx.fillText('Mimozai', 0, 0);
  ctx.restore();
  // ✓ her aramayı açar
  p = popScale(t, TL.her - 0.05, 0.28);
  if (p.a > 0) {
    ctx.save(); ctx.globalAlpha = p.a; ctx.translate(540, 790); ctx.scale(p.s, p.s);
    ctx.font = `800 58px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const txt = '✓  her aramayı açar', w = ctx.measureText(txt).width + 80;
    ctx.fillStyle = 'rgba(52,199,89,0.16)'; rr(ctx, -w / 2, -54, w, 108, 54); ctx.fill();
    ctx.strokeStyle = GREEN; ctx.lineWidth = 4; rr(ctx, -w / 2, -54, w, 108, 54); ctx.stroke();
    ctx.fillStyle = GREEN; ctx.fillText(txt, 0, 3);
    ctx.restore();
  }
  // Gece / Gündüz / Bayramda bile
  const chips = ['Gece', 'Gündüz', 'Bayramda bile'];
  ctx.save(); ctx.font = `800 50px ${SANS}`;
  const ws = chips.map(c => ctx.measureText(c).width + 64), gap = 22;
  let x = 540 - (ws.reduce((a, b) => a + b, 0) + gap * (chips.length - 1)) / 2;
  ctx.restore();
  chips.forEach((c, i) => {
    const q = popScale(t, TL.chips[i] - 0.03, 0.25);
    const cx = x + ws[i] / 2; x += ws[i] + gap;
    if (q.a <= 0) return;
    ctx.save(); ctx.globalAlpha = q.a; ctx.translate(cx, 940); ctx.scale(q.s, q.s);
    ctx.font = `800 50px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = YEL; ctx.lineWidth = 4; rr(ctx, -ws[i] / 2, -46, ws[i], 92, 46); ctx.stroke();
    ctx.fillStyle = YEL; ctx.fillText(c, 0, 3);
    ctx.restore();
  });
  // CTA
  const ck = prog(t, TL.cta, 0.3);
  if (ck > 0) {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 60px ${SANS}`;
    const label = 'Yorumlara “HESAPLA” yaz';
    const w = ctx.measureText(label).width + 100, h = 128;
    const cs = lerp(0.6, 1, backOut(ck));
    const br = t > TL.cta + 0.3 ? 1 + 0.025 * Math.sin((t - TL.cta - 0.3) * 7) : 1;
    ctx.globalAlpha = clamp(ck * 3);
    ctx.translate(540, 1190); ctx.scale(cs * br, cs * br);
    ctx.shadowColor = 'rgba(255,210,63,0.45)'; ctx.shadowBlur = 50;
    ctx.fillStyle = YEL; rr(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#111'; ctx.fillText(label, 0, 4);
    ctx.restore();
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = prog(t, TL.cta + 0.25, 0.25); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = `500 44px ${SANS}`;
    ctx.fillText('kaybını birlikte hesaplayalım', 540, 1330);
    ctx.restore();
  }
}

window.renderFrame = function (t, fmt_ = 'image/jpeg', q = 0.93) {
  ctx.save(); ctx.clearRect(0, 0, W, H);
  if (t < TL.B) sceneA(t);
  else if (t < TL.C) sceneB(t);
  else if (t < TL.D) sceneC(t);
  else sceneD(t);
  ctx.restore();
  return cv.toDataURL(fmt_, q);
};
window.READY = true;
