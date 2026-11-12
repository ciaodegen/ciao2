"""Mimozai Reels "GECE 03:17" için ses tasarımı (tamamen sentez, telifsiz).
Kullanım: python3 sound.py sound.wav
Zamanlamalar scene.js içindeki T sabitleriyle aynıdır.
"""
import sys
import wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
DUR = 15.3
N = int(DUR * SR)
rng = np.random.default_rng(3)

L = np.zeros(N)
R = np.zeros(N)
REV = np.zeros(N)  # reverb gönderimi (mono)


def tt(d):
    return np.arange(int(d * SR)) / SR


def filt(x, kind, f, order=2):
    sos = butter(order, f, btype=kind, fs=SR, output='sos')
    return sosfilt(sos, x)


def env_ar(n, a=0.005, r=0.01):
    e = np.ones(n)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e


def place(sig, start, gain=1.0, pan=0.0, rev=0.0):
    i = int(round(start * SR))
    if i >= N:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    s = sig[: N - i] * gain
    a = (pan + 1) * np.pi / 4
    L[i:i + len(s)] += s * np.cos(a) * np.sqrt(2)
    R[i:i + len(s)] += s * np.sin(a) * np.sqrt(2)
    if rev:
        REV[i:i + len(s)] += s * rev


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
    sw = (np.floor(t * 18) % 2).astype(float)
    f = 1250 + 320 * sw
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + 0.25 * np.sin(2 * ph)
    s = filt(s, 'bandpass', [600, 4500])
    return s * env_ar(len(t), 0.01, 0.04)


def click():
    n = int(0.012 * SR)
    s = filt(rng.standard_normal(n), 'highpass', 1500) * np.exp(-np.arange(n) / (0.002 * SR))
    t = tt(0.08)
    s2 = np.sin(2 * np.pi * 90 * t) * np.exp(-t / 0.02)
    out = np.zeros(len(t))
    out[:n] += s
    return out + s2 * 0.6


def kick(f0=150, f1=46, d=0.45, decay=0.16):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t / decay)
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
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.035)


def whoosh(d=0.35, lo=300, hi=3500, rise=0.6):
    t = tt(d)
    n = rng.standard_normal(len(t))
    # tarama: düşük ve yüksek bant karışımını zamanla değiştir
    a = filt(n, 'bandpass', [lo, lo * 3])
    b = filt(n, 'bandpass', [hi / 3, hi])
    k = np.clip(t / (d * rise), 0, 1)
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    return (a * (1 - k) + b * k) * e


def riser(d=0.6):
    t = tt(d)
    n = filt(rng.standard_normal(len(t)), 'highpass', 1200)
    f = 300 * (4 ** (t / d))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3
    e = (t / d) ** 2.2
    return (n * 0.7 + s) * e


def pad(freqs, d, attack=0.15, release=0.04, cutoff=2200):
    t = tt(d)
    s = np.zeros(len(t))
    for f in freqs:
        for det in (-0.12, 0.0, 0.13):
            ff = f * (1 + det / 100)
            ph = 2 * np.pi * ff * t + rng.uniform(0, 6.28)
            s += 2 / np.pi * np.arctan(3 * np.sin(ph))  # yumuşak testere/kare
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
    nz = filt(rng.standard_normal(len(t)), 'lowpass', 220) * 0.6
    return (s / 2.7 + nz)


def hiss(d):
    t = tt(d)
    hum = 0.25 * np.sin(2 * np.pi * 50 * t) + 0.12 * np.sin(2 * np.pi * 100 * t)
    return filt(rng.standard_normal(len(t)), 'bandpass', [400, 5000]) + hum


def fade(sig, fin=0.0, fout=0.0):
    s = sig.copy()
    a, b = int(fin * SR), int(fout * SR)
    if a:
        s[:a] *= np.linspace(0, 1, a)
    if b:
        s[-b:] *= np.linspace(1, 0, b)
    return s


# ---------------- zaman çizelgesi ----------------
ANSWER, B, C, D, E, TAIL = 1.5, 3.0, 6.5, 9.3, 11.9, 14.9

# A+B: gerilim zemini
place(fade(drone(C), 0.0, 0.03), 0, 0.30)
place(fade(hiss(C), 0.0, 0.03), 0, 0.012)

# telefon titreşimi + zil (cevaplanınca kesilir)
for s0 in (0.0, 0.75):
    dd = min(0.5, ANSWER - s0)
    place(vibration(dd), s0, 0.20)
    place(trill(dd), s0, 0.09, rev=0.5)
place(click(), ANSWER, 0.5)
place(bell(880, 0.25, 0.06), ANSWER + 0.06, 0.06, rev=0.3)

# A→B yakınlaştırma
place(whoosh(0.32, 200, 2500), B - 0.08, 0.25)
place(kick(120, 40, 0.5, 0.2), B, 0.45)

# kalp atışı (gerilim) — cevap gelene kadar
for hb in (3.25, 3.95):
    place(kick(80, 40, 0.3, 0.09), hb, 0.55)
    place(kick(80, 40, 0.3, 0.07), hb + 0.17, 0.32)

# baloncuklar
place(pop(380, 820), 3.35, 0.28, rev=0.15)
for i in range(3):
    place(pop(1500, 1800)[: int(0.03 * SR)], 4.05 + i * 0.15, 0.05)
place(pop(500, 1100), 4.6, 0.3, rev=0.2)
place(bell(1318.5, 0.8, 0.22), 4.62, 0.10, rev=0.3)
place(bell(1975.5, 0.8, 0.22), 4.70, 0.08, rev=0.3)

# sabaha geçiş
place(riser(0.6), C - 0.6, 0.18)
place(bell(1046.5, 1.4, 0.5), C, 0.14, rev=0.4)
place(bell(1568.0, 1.4, 0.5), C, 0.10, rev=0.4)
place(pad([261.63, 329.63, 392.0, 493.88, 587.33], D - C, 0.12, 0.03), C, 0.22)

# bildirim sesleri (yükselen)
for at, f in zip((6.8, 7.1, 7.4, 7.7), (1046.5, 1318.5, 1568.0, 2093.0)):
    place(bell(f, 0.7, 0.18), at, 0.16, pan=0.15, rev=0.35)
place(bell(784.0, 0.9, 0.3), 8.3, 0.12, rev=0.3)
place(bell(1174.7, 0.9, 0.3), 8.38, 0.10, rev=0.3)

# hafif ritim (100 BPM = 0.6 sn)
for b in np.arange(C, D - 0.05, 0.6):
    place(kick(), b, 0.30)
    place(hat(), b + 0.3, 0.06, pan=0.2)

# MAAŞ / SİGORTA / İZİN / UYKU
for at, st in ((9.3, 9.5), (9.9, 10.1), (10.5, 10.7), (11.1, 11.3)):
    place(whoosh(0.18, 600, 5000, 0.8), at - 0.05, 0.10)
    place(whoosh(0.12, 1500, 9000, 0.3), st - 0.04, 0.22)
    place(kick(160, 38, 0.6, 0.22), st, 0.6)
place(kick(60, 30, 1.2, 0.5), 11.3, 0.5)

# Mimozai açılışı
place(riser(0.4), E - 0.4, 0.12)
place(kick(140, 32, 1.2, 0.45), E, 0.7)
place(pad([174.61, 220.0, 261.63, 329.63, 392.0], TAIL - E, 0.25, 0.04, 2600), E, 0.34)
for i, f in enumerate((1046.5, 1318.5, 1568.0, 2093.0)):
    place(bell(f, 0.9, 0.3), 12.2 + i * 0.07, 0.07, pan=-0.3 + i * 0.2, rev=0.5)
for b in np.arange(E + 0.6, TAIL - 0.05, 0.6):
    place(kick(), b, 0.30)
    place(hat(), b + 0.3, 0.06, pan=0.2)
place(pop(450, 1050), 13.1, 0.3, rev=0.2)
place(bell(1568.0, 0.8, 0.25), 13.12, 0.09, rev=0.3)

# kuyruk: başa dönmek için oda sesi + drone
place(fade(drone(DUR - TAIL), 0.25, 0.0), TAIL, 0.30)
place(fade(hiss(DUR - TAIL), 0.05, 0.0), TAIL, 0.012)

# ---------------- reverb + master ----------------
ir_t = tt(1.1)
ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t / 0.25)
ir = filt(ir, 'lowpass', 5000)
ir /= np.sqrt(np.sum(ir ** 2))
wet = fftconvolve(REV, ir)[:N] * 0.35
L += wet
R += wet

mix = np.stack([L, R], axis=1)
mix = filt(mix.T, 'highpass', 28).T
mix = np.tanh(mix * 1.3) / np.tanh(1.3)
mix *= 0.89 / np.max(np.abs(mix))

out = sys.argv[1] if len(sys.argv) > 1 else 'sound.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('yazıldı:', out, f'{DUR} sn')
