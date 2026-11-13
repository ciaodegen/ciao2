"""Mimozai Reels "Günde 5 = Ayda 150" için ses miksajı (gece-0317/sound.py'den uyarlandı).
Efektler ve müzik tamamen sentezdir (telifsiz); seslendirme vo/ klasöründeki
ElevenLabs dosyalarından gelir. Zamanlamalar timeline.json'dan okunur
(önce `python3 timeline.py` çalıştırın).
Kullanım: python3 sound.py sound.wav
"""
import json
import os
import subprocess
import sys
import wave

import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.ndimage import minimum_filter1d
import pyloudnorm as pyln

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, 'timeline.json')))

SR = 48000
DUR = TL['END']
N = int(DUR * SR)
rng = np.random.default_rng(3)

# iki bus: müzik/efekt (sese göre kısılır) ve konuşma
ML, MR = np.zeros(N), np.zeros(N)
REV = np.zeros(N)
VOX = np.zeros(N)
VREV = np.zeros(N)


def tt(d):
    return np.arange(int(d * SR)) / SR


def filt(x, kind, f, order=2):
    return sosfilt(butter(order, f, btype=kind, fs=SR, output='sos'), x)


def env_ar(n, a=0.005, r=0.01):
    e = np.ones(n)
    na, nr = max(1, min(n, int(a * SR))), max(1, min(n, int(r * SR)))
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e


def place(sig, start, gain=1.0, pan=0.0, rev=0.0):
    i = int(round(start * SR))
    if i >= N or len(sig) == 0:
        return
    if i < 0:
        sig, i = sig[-i:], 0
    s = sig[: N - i] * gain
    a = (pan + 1) * np.pi / 4
    ML[i:i + len(s)] += s * np.cos(a) * np.sqrt(2)
    MR[i:i + len(s)] += s * np.sin(a) * np.sqrt(2)
    if rev:
        REV[i:i + len(s)] += s * rev


def fade(sig, fin=0.0, fout=0.0):
    s = sig.copy()
    a, b = int(fin * SR), int(fout * SR)
    if a:
        s[:a] *= np.linspace(0, 1, a)
    if b:
        s[-b:] *= np.linspace(1, 0, b)
    return s


# ---------------- ses kaynakları ----------------
def vibration(d):
    t = tt(d)
    f = 172
    s = np.sign(np.sin(2 * np.pi * f * t)) * 0.5 + 0.35 * np.sin(2 * np.pi * 2 * f * t)
    s *= 1 + 0.35 * np.sin(2 * np.pi * 43 * t)
    s = filt(s, 'lowpass', 1400)
    rattle = filt(rng.standard_normal(len(t)), 'bandpass', [180, 900]) * 0.5
    return (s + rattle * (0.5 + 0.5 * np.sin(2 * np.pi * f * t))) * env_ar(len(t), 0.01, 0.03)


def trill(d):
    t = tt(d)
    f = 1250 + 320 * (np.floor(t * 18) % 2)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = filt(np.sin(ph) + 0.25 * np.sin(2 * ph), 'bandpass', [600, 4500])
    return s * env_ar(len(t), 0.01, 0.04)


def click():
    n = int(0.012 * SR)
    s = filt(rng.standard_normal(n), 'highpass', 1500) * np.exp(-np.arange(n) / (0.002 * SR))
    t = tt(0.08)
    out = np.sin(2 * np.pi * 90 * t) * np.exp(-t / 0.02) * 0.6
    out[:n] += s
    return out


def kick(f0=150, f1=46, d=0.45, decay=0.16):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.035)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay)
    n = int(0.004 * SR)
    s[:n] += rng.standard_normal(n) * 0.3
    return s


def hat():
    t = tt(0.06)
    return filt(rng.standard_normal(len(t)), 'highpass', 7000) * np.exp(-t / 0.012)


def bell(f, d=0.9, decay=0.28):
    t = tt(d)
    s = (np.sin(2 * np.pi * f * t) + 0.45 * np.sin(2 * np.pi * 2.0 * f * t) * np.exp(-t / 0.08)
         + 0.18 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t / 0.05))
    return s * np.exp(-t / decay) * env_ar(len(t), 0.002, 0.02)


def pop(f0=420, f1=980):
    t = tt(0.12)
    f = f1 + (f0 - f1) * np.exp(-t / 0.015)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.035)


def whoosh(d=0.35, lo=300, hi=3500, rise=0.6):
    t = tt(d)
    n = rng.standard_normal(len(t))
    a = filt(n, 'bandpass', [lo, lo * 3])
    b = filt(n, 'bandpass', [hi / 3, hi])
    k = np.clip(t / (d * rise), 0, 1)
    return (a * (1 - k) + b * k) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5


def riser(d=0.6):
    t = tt(d)
    n = filt(rng.standard_normal(len(t)), 'highpass', 1200)
    s = np.sin(2 * np.pi * np.cumsum(300 * (4 ** (t / d))) / SR) * 0.3
    return (n * 0.7 + s) * (t / d) ** 2.2


def pad(freqs, d, attack=0.15, release=0.04, cutoff=2200):
    t = tt(d)
    s = np.zeros(len(t))
    for f in freqs:
        for det in (-0.12, 0.0, 0.13):
            ph = 2 * np.pi * f * (1 + det / 100) * t + rng.uniform(0, 6.28)
            s += 2 / np.pi * np.arctan(3 * np.sin(ph))
    s = filt(s / (len(freqs) * 3), 'lowpass', cutoff)
    e = np.ones(len(t))
    na, nr = int(attack * SR), int(release * SR)
    e[:na] = np.linspace(0, 1, na) ** 2
    e[-nr:] *= np.linspace(1, 0, nr)
    return s * e


def drone(d):
    t = tt(d)
    s = (np.sin(2 * np.pi * 55 * t) + np.sin(2 * np.pi * 55.45 * t) + 0.45 * np.sin(2 * np.pi * 82.4 * t)
         + 0.25 * np.sin(2 * np.pi * 110.3 * t))
    s *= 0.8 + 0.2 * np.sin(2 * np.pi * 0.35 * t)
    return s / 2.7 + filt(rng.standard_normal(len(t)), 'lowpass', 220) * 0.6


def hiss(d):
    t = tt(d)
    hum = 0.25 * np.sin(2 * np.pi * 50 * t) + 0.12 * np.sin(2 * np.pi * 100 * t)
    return filt(rng.standard_normal(len(t)), 'bandpass', [400, 5000]) + hum


# ---------------- seslendirme ----------------
def load_vo(path, speed=1.0):
    af = ['-af', f'atempo={speed}'] if abs(speed - 1) > 1e-3 else []
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, *af, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, '<f4').astype(float)


METER = pyln.Meter(SR)


def lufs(x):
    try:
        v = METER.integrated_loudness(np.stack([x, x], 1))
        return v if np.isfinite(v) else None
    except ValueError:  # 0.4 sn'den kısa
        return None


def to_lufs(x, target):
    cur = lufs(x)
    if cur is None:
        r = np.sqrt(np.mean(x ** 2)) + 1e-9
        return x * (10 ** ((target - 3) / 20) / r)
    return x * 10 ** ((target - cur) / 20)


def compress(x, thr_db=-26, ratio=3.0, att=0.005, rel=0.12):
    """Basit RMS kompresör (konuşmayı tok ve öne çıkmış yapar)."""
    e = np.sqrt(filt(x ** 2, 'lowpass', 30, order=1).clip(1e-12))
    db = 20 * np.log10(e)
    over = np.maximum(0, db - thr_db)
    gr_db = -over * (1 - 1 / ratio)
    # atak/bırakma yumuşatma
    out = np.empty_like(gr_db)
    a, r = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR))
    g = 0.0
    step = 32
    for i in range(0, len(gr_db), step):
        tgt = gr_db[i:i + step].min()
        k = (a ** step) if tgt < g else (r ** step)
        g = k * g + (1 - k) * tgt
        out[i:i + step] = g
    return x * 10 ** (out / 20)


def presence(x):
    return x + 0.35 * filt(x, 'bandpass', [2500, 5500]) + 0.15 * filt(x, 'lowpass', 180)


WHISPER = set()  # bu videoda fısıltılı satır yok
VO_TARGET = {'narrator': -15.0, 'whisper': -15.5, 'customer': -17.0, 'assistant': -14.5}


def process(x, role, n):
    x = filt(x, 'highpass', 85)
    if role == 'customer':      # telefon hattı
        x = filt(x, 'bandpass', [320, 3400], order=4)
        x = np.tanh(x * 2.5) / 2.5
        x = compress(x, -28, 3.0)
        return to_lufs(x, VO_TARGET['customer'])
    x = compress(presence(x), -28 if n in WHISPER else -26, 3.5 if n in WHISPER else 3.0)
    if role == 'assistant':     # ürünün sesi: temiz ve yakın
        return to_lufs(x, VO_TARGET['assistant'])
    return to_lufs(x, VO_TARGET['whisper' if n in WHISPER else 'narrator'])


for v in TL['vo']:
    if not v['file']:
        continue
    x = load_vo(v['file'], v.get('speed', 1.0))[: int(v['dur'] * SR)]
    x = process(fade(x, 0.0, 0.03), v['role'], v['n'])
    i = int(round(v['start'] * SR))
    x = x[: N - i]
    VOX[i:i + len(x)] += x
    VREV[i:i + len(x)] += x * (0.35 if v['n'] in WHISPER else 0.08)


# ---------------- efektler (timeline'a göre) ----------------
B, C, D, END = TL['B'], TL['C'], TL['D'], TL['END']


def ease_in_out(k):
    return 4 * k ** 3 if k < .5 else 1 - (-2 * k + 2) ** 3 / 2


def ease_out(k):
    return 1 - (1 - k) ** 3


def missed_tone():
    a = bell(988.0, 0.22, 0.05)
    b = bell(784.0, 0.35, 0.08)
    out = np.zeros(len(b) + int(0.12 * SR))
    out[:len(a)] += a
    out[int(0.12 * SR):] += b
    return out


# A — gerilim zemini, her cevapsız aramada titreşim + uyarı sesi
place(fade(drone(D), 0.0, 0.05), 0, 0.22)
for i, at in enumerate(TL['notifs']):
    place(vibration(0.26), at, 0.22)
    place(missed_tone(), at + 0.03, 0.09, pan=-0.15 + 0.075 * i, rev=0.3)

# B — takvim dolarken sayaç tıkları, sonunda vuruş
place(whoosh(0.3, 250, 3000), B - 0.1, 0.22)
cs, ce = TL['countStart'], TL['countEnd']
prev = 5
for tt_ in np.arange(cs, ce + 1e-3, 1 / 200):
    k = ease_in_out(min(1, max(0, (tt_ - cs) / (ce - cs))))
    val = max(5, round((5 + 145 * k) / 5) * 5)
    if val != prev:
        f = 900 + 900 * (val / 150)
        place(pop(f, f * 1.25)[: int(0.035 * SR)], tt_, 0.07, pan=0.2 * np.sin(val))
        prev = val
place(riser(max(0.3, ce - cs)), cs, 0.10)
place(kick(150, 38, 0.9, 0.3), ce, 0.6)
place(bell(523.25, 1.0, 0.35), ce, 0.07, rev=0.4)

# C — para sayacı, kasa sesi, rakibe uçuş
place(whoosh(0.3, 250, 3000), C - 0.1, 0.2)
place(pop(500, 1100), TL['eq'], 0.2, rev=0.2)
ms, me = TL['moneyStart'], TL['moneyEnd']
for tt_ in np.arange(ms, me, 0.045):
    k = ease_out((tt_ - ms) / (me - ms))
    f = 1200 + 1200 * k
    place(pop(f, f * 1.2)[: int(0.03 * SR)], tt_, 0.05)
cash = bell(2637.0, 0.9, 0.25) + 0.7 * bell(3136.0, 0.9, 0.22)
place(cash, me, 0.12, rev=0.35)
n_ = int(0.06 * SR)
place(filt(rng.standard_normal(n_), 'bandpass', [2000, 7000]) * np.exp(-np.arange(n_) / (0.015 * SR)), me, 0.12)
place(whoosh(0.55, 300, 6000, 0.7), TL['rakip'] - 0.05, 0.3, pan=0.4)
place(kick(90, 30, 1.2, 0.45), TL['rakip'], 0.5)

# D — çözüm: sıcak pad, Mimozai parıltısı, ritim, CTA
place(riser(0.45), D - 0.45, 0.12)
place(pad([261.63, 329.63, 392.0, 493.88, 587.33], END - D, 0.25, 0.3, 2600), D, 0.30)
place(kick(140, 32, 1.2, 0.45), TL['mimoza'], 0.55)
for i, f in enumerate((1046.5, 1318.5, 1568.0, 2093.0)):
    place(bell(f, 0.9, 0.3), TL['mimoza'] + i * 0.07, 0.06, pan=-0.3 + i * 0.2, rev=0.5)
place(pop(500, 1100), TL['her'], 0.22, rev=0.2)
place(bell(1318.5, 0.8, 0.22), TL['her'] + 0.02, 0.07, rev=0.3)
place(bell(1975.5, 0.8, 0.22), TL['her'] + 0.10, 0.05, rev=0.3)
for i, at in enumerate(TL['chips']):
    place(pop(450 + 80 * i, 1000 + 120 * i), at, 0.18, rev=0.15)
for b in np.arange(TL['mimoza'] + 0.6, END - 0.4, 0.6):
    place(kick(), b, 0.26)
    place(hat(), b + 0.3, 0.05, pan=0.2)
place(pop(450, 1050), TL['cta'], 0.25, rev=0.2)
place(bell(1568.0, 0.8, 0.25), TL['cta'] + 0.02, 0.08, rev=0.3)

# ---------------- reverb, ducking, master ----------------
ir_t = tt(1.1)
ir = filt(rng.standard_normal(len(ir_t)) * np.exp(-ir_t / 0.25), 'lowpass', 5000)
ir /= np.sqrt(np.sum(ir ** 2))
wet = fftconvolve(REV, ir)[:N] * 0.35
ML += wet
MR += wet
VOX += fftconvolve(VREV, ir)[:N] * 0.3

# konuşma varken müzik/efekt ~12 dB kısılır
lvl = np.abs(VOX)
k_att, k_rel = np.exp(-1 / (0.01 * SR)), np.exp(-1 / (0.35 * SR))
envv = np.zeros(N)
acc = 0.0
step = 48
for i in range(0, N, step):
    x = lvl[i:i + step].max()
    k = k_att ** step if x > acc else k_rel ** step
    acc = k * acc + (1 - k) * x
    envv[i:i + step] = acc
duck = 1 - 0.75 * np.clip(envv / 0.04, 0, 1)
MUS_GAIN = 0.75


def limiter(st, ceiling_db=-1.0, look=0.005, rel=0.08):
    """İleriye bakan tepe sınırlayıcı (stereo)."""
    c = 10 ** (ceiling_db / 20)
    peak = np.abs(st).max(axis=0)
    g = np.minimum(1.0, c / np.maximum(peak, 1e-9))
    g = minimum_filter1d(g, int(look * SR) * 2 + 1)
    out = np.empty_like(g)
    r = np.exp(-1 / (rel * SR))
    cur = 1.0
    stp = 16
    for i in range(0, len(g), stp):
        tgt = g[i:i + stp].min()
        cur = tgt if tgt < cur else r ** stp * cur + (1 - r ** stp) * tgt
        out[i:i + stp] = cur
    d = int(look * SR)
    out = np.concatenate([out[d:], np.full(d, out[-1])])  # gecikmeyi telafi et
    return st * np.minimum(out, g)


mix = np.stack([ML * duck * MUS_GAIN + VOX, MR * duck * MUS_GAIN + VOX])
mix = filt(mix, 'highpass', 28)
mix = limiter(mix, -1.5)
for _ in range(2):  # -14 LUFS hedefi (Instagram/Reels)
    cur = METER.integrated_loudness(mix.T)
    mix = limiter(mix * 10 ** ((-14.0 - cur) / 20), -1.2)
final_lufs = METER.integrated_loudness(mix.T)
vox_l = METER.integrated_loudness(np.stack([VOX, VOX], 1))
bg_l = METER.integrated_loudness(np.stack([ML * duck * MUS_GAIN, MR * duck * MUS_GAIN], 1))

out = sys.argv[1] if len(sys.argv) > 1 else 'sound.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((np.clip(mix.T, -1, 1) * 32767).astype('<i2').tobytes())
print('yazıldı:', out, f'{DUR:.2f} sn | final {final_lufs:.1f} LUFS | konuşma-arka plan farkı {vox_l - bg_l:.1f} dB',
      '(seslendirme YOK — tahmini zamanlama)' if TL['estimated'] else '')
