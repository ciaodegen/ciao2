"""Mimozai Reels "GECE 03:17" için ses miksajı.
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


def norm_rms(x, db):
    r = np.sqrt(np.mean(x[np.abs(x) > 0.01] ** 2)) if np.any(np.abs(x) > 0.01) else 1
    return x * (10 ** (db / 20) / (r + 1e-9))


def process(x, role, n):
    x = filt(x, 'highpass', 85)
    if role == 'customer':      # telefon hattı
        x = filt(x, 'bandpass', [320, 3300], order=4)
        x = np.tanh(x * 3.0) / 3.0
        x = x + filt(rng.standard_normal(len(x)), 'bandpass', [500, 3000]) * 0.0025
        return norm_rms(x, -21.5)
    if role == 'assistant':     # ürünün sesi: temiz ve yakın
        return norm_rms(x, -19.5)
    return norm_rms(x, -21 if n in (1, 2) else -19.5)


for v in TL['vo']:
    if not v['file']:
        continue
    x = load_vo(v['file'], v.get('speed', 1.0))[: int(v['dur'] * SR)]
    x = process(fade(x, 0.0, 0.03), v['role'], v['n'])
    i = int(round(v['start'] * SR))
    x = x[: N - i]
    VOX[i:i + len(x)] += x
    VREV[i:i + len(x)] += x * (0.35 if v['n'] in (1, 2) else 0.08)

# ---------------- efektler (timeline'a göre) ----------------
A_, ANSWER, B, C, D, E, TAIL = 0, TL['ANSWER'], TL['B'], TL['C'], TL['D'], TL['E'], TL['TAIL']

place(fade(drone(C), 0.0, 0.03), 0, 0.30)
place(fade(hiss(C), 0.0, 0.03), 0, 0.012)

s0 = 0.0
while s0 < ANSWER - 0.05:
    dd = min(0.5, ANSWER - s0)
    place(vibration(dd), s0, 0.20)
    place(trill(dd), s0, 0.08, rev=0.5)
    s0 += 0.75
place(click(), ANSWER, 0.5)
place(bell(880, 0.25, 0.06), ANSWER + 0.06, 0.06, rev=0.3)

place(whoosh(0.32, 200, 2500), B - 0.08, 0.25)
place(kick(120, 40, 0.5, 0.2), B, 0.45)

hb = B + 0.25
while hb < TL['bubble2'] - 0.3:
    place(kick(80, 40, 0.3, 0.09), hb, 0.5)
    place(kick(80, 40, 0.3, 0.07), hb + 0.17, 0.3)
    hb += 0.8

place(pop(380, 820), TL['bubble1'], 0.25, rev=0.15)
for i in range(3):
    place(pop(1500, 1800)[: int(0.03 * SR)], TL['typing'] + i * 0.12, 0.05)
place(pop(500, 1100), TL['bubble2'], 0.25, rev=0.2)
place(bell(1318.5, 0.8, 0.22), TL['bubble2'] + 0.02, 0.08, rev=0.3)
place(bell(1975.5, 0.8, 0.22), TL['bubble2'] + 0.10, 0.06, rev=0.3)

place(riser(0.6), C - 0.6, 0.18)
place(bell(1046.5, 1.4, 0.5), C, 0.14, rev=0.4)
place(bell(1568.0, 1.4, 0.5), C, 0.10, rev=0.4)
place(pad([261.63, 329.63, 392.0, 493.88, 587.33], D - C, 0.12, 0.03), C, 0.22)
for at, f in zip(TL['notifs'], (1046.5, 1318.5, 1568.0, 2093.0)):
    place(bell(f, 0.7, 0.18), at, 0.13, pan=0.15, rev=0.35)
place(bell(784.0, 0.9, 0.3), TL['punch'], 0.10, rev=0.3)
place(bell(1174.7, 0.9, 0.3), TL['punch'] + 0.08, 0.08, rev=0.3)
for b in np.arange(C, D - 0.05, 0.6):
    place(kick(), b, 0.28)
    place(hat(), b + 0.3, 0.05, pan=0.2)

for w in TL['words']:
    place(whoosh(0.18, 600, 5000, 0.8), w['at'] - 0.05, 0.10)
    place(whoosh(0.12, 1500, 9000, 0.3), w['strike'] - 0.04, 0.22)
    place(kick(160, 38, 0.6, 0.22), w['strike'], 0.6)
place(kick(60, 30, 1.2, 0.5), TL['words'][-1]['strike'], 0.5)

place(riser(0.4), E - 0.4, 0.12)
place(kick(140, 32, 1.2, 0.45), E, 0.7)
place(pad([174.61, 220.0, 261.63, 329.63, 392.0], TAIL - E, 0.25, 0.04, 2600), E, 0.34)
for i, f in enumerate((1046.5, 1318.5, 1568.0, 2093.0)):
    place(bell(f, 0.9, 0.3), TL['mimozai'] + i * 0.07, 0.07, pan=-0.3 + i * 0.2, rev=0.5)
for b in np.arange(E + 0.6, TAIL - 0.05, 0.6):
    place(kick(), b, 0.28)
    place(hat(), b + 0.3, 0.05, pan=0.2)
place(pop(450, 1050), TL['cta'], 0.25, rev=0.2)
place(bell(1568.0, 0.8, 0.25), TL['cta'] + 0.02, 0.08, rev=0.3)

place(fade(drone(DUR - TAIL), 0.25, 0.0), TAIL, 0.30)
place(fade(hiss(DUR - TAIL), 0.05, 0.0), TAIL, 0.012)

# ---------------- reverb, ducking, master ----------------
ir_t = tt(1.1)
ir = filt(rng.standard_normal(len(ir_t)) * np.exp(-ir_t / 0.25), 'lowpass', 5000)
ir /= np.sqrt(np.sum(ir ** 2))
wet = fftconvolve(REV, ir)[:N] * 0.35
ML += wet
MR += wet
VOX += fftconvolve(VREV, ir)[:N] * 0.3

# konuşma varken müzik/efekt ~8 dB kısılır
lvl = np.abs(VOX)
k_att, k_rel = np.exp(-1 / (0.01 * SR)), np.exp(-1 / (0.35 * SR))
envv = np.zeros(N)
acc = 0.0
step = 48  # hız için örnekleme adımı
for i in range(0, N, step):
    x = lvl[i:i + step].max()
    k = k_att ** step if x > acc else k_rel ** step
    acc = k * acc + (1 - k) * x
    envv[i:i + step] = acc
duck = 1 - 0.6 * np.clip(envv / 0.05, 0, 1)

L = ML * duck + VOX
R = MR * duck + VOX
mix = np.stack([L, R])
mix = filt(mix, 'highpass', 28)
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
mix *= 0.89 / np.max(np.abs(mix))

out = sys.argv[1] if len(sys.argv) > 1 else 'sound.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype('<i2').tobytes())
print('yazıldı:', out, f'{DUR:.2f} sn', '(seslendirme YOK — tahmini zamanlama)' if TL['estimated'] else '')
