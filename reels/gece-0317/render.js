// Kullanım:
//   node render.js --stills 0,1.6,3.5   -> stills/ klasörüne PNG kareler
//   node render.js --video sound.wav out.mp4
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  const args = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.waitForFunction(() => window.READY === true);
  await page.evaluate(async () => {
    await Promise.all(['400', '500', '600', '700', '800', '900'].map(w => document.fonts.load(`${w} 40px Inter`)));
    await document.fonts.load('700 40px "JetBrains Mono"');
  });

  if (args[0] === '--stills') {
    const dir = path.join(__dirname, 'stills');
    fs.mkdirSync(dir, { recursive: true });
    for (const s of args[1].split(',').map(Number)) {
      const url = await page.evaluate(t => window.renderFrame(t, 'image/png'), s);
      fs.writeFileSync(path.join(dir, `t${s.toFixed(2)}.png`), Buffer.from(url.split(',')[1], 'base64'));
    }
  } else if (args[0] === '--video') {
    const [, audio, out] = args;
    const fps = 30;
    const dur = await page.evaluate(() => window.DURATION);
    const n = Math.round(dur * fps);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-i', audio,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '18', '-profile:v', 'high',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
      '-t', String(dur), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      const url = await page.evaluate(t => window.renderFrame(t), i / fps);
      const buf = Buffer.from(url.split(',')[1], 'base64');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 60 === 0) console.log(`kare ${i}/${n}  (${((Date.now() - t0) / 1000).toFixed(1)} sn)`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log('bitti:', out);
  }
  await browser.close();
})();
