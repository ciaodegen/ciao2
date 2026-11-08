"""Synthesised suspense score + SFX for Zodiac Part 1, mixed under the narration.

Everything is generated here with numpy (no samples, no external assets).
Usage: python3 audio/zodiac_part1.py <voice.mp3> <out.wav>
Event times are in video frames (30 fps) and match src/zodiac/Part1.tsx.
"""
import subprocess
import sys
import wave

import numpy as np

SR = 48000
FPS = 30
DUR = 1650 / FPS
N = int(DUR * SR)
rng = np.random.default_rng(7)


def fr(f):  # frame -> sample index
    return int(round(f / FPS * SR))


def sec(t):
    return int(round(t * SR))


# ---------------- dsp helpers ----------------
def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):  # small buffers only
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def lp_fast(x, fc, order=2):
    """zero-phase-ish FFT low-pass (for long buffers)"""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    H = 1 / np.sqrt(1 + (f / fc) ** (2 * order))
    return np.fft.irfft(X * H, len(x))


def hp_fast(x, fc, order=2):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    f[0] = 1e-6
    H = 1 / np.sqrt(1 + (fc / f) ** (2 * order))
    return np.fft.irfft(X * H, len(x))


def bp_fast(x, lo, hi):
    return hp_fast(lp_fast(x, hi), lo)


def env_exp(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def noise(n):
    return rng.standard_normal(n)


def place(buf, sig, start, gain=1.0):
    if start >= len(buf):
        return
    end = min(len(buf), start + len(sig))
    buf[start:end] += gain * sig[: end - start]


def reverb(x, rt=1.4, mix=0.25, seed=3):
    r = np.random.default_rng(seed)
    n = int(rt * SR)
    ir = r.standard_normal(n) * np.exp(-np.arange(n) / (rt / 6.9 * SR))
    ir = lp_fast(ir, 5000)
    ir /= np.sqrt(np.sum(ir ** 2))
    L = 1 << int(np.ceil(np.log2(len(x) + n)))
    wet = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[: len(x)]
    return x * (1 - mix) + wet * mix


# ---------------- sounds ----------------
def boom(dur=1.6, f0=110, f1=34, gain=1.0):
    n = sec(dur)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.12)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.55)
    hit = lp_fast(noise(n), 900) * np.exp(-t / 0.05) * 0.8
    return gain * np.tanh(1.6 * (body + hit))


def thud(gain=1.0):
    n = sec(0.35)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (70 + 60 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.09)
    slap = bp_fast(noise(n), 300, 3500) * np.exp(-t / 0.012) * 0.7
    return gain * (body + slap)


def whoosh(dur=0.6, up=True, gain=1.0):
    n = sec(dur)
    t = np.linspace(0, 1, n)
    x = noise(n)
    out = np.zeros(n)
    seg = 8
    for i in range(seg):  # stepped band sweep
        a, b = i * n // seg, (i + 1) * n // seg
        k = (i + 0.5) / seg
        fc = 400 + (3600 if up else 1800) * (k if up else 1 - k)
        out[a:b] = bp_fast(x, fc * 0.5, fc * 1.6)[a:b]
    shape = np.sin(np.pi * t) ** 1.5
    return gain * out * shape / (np.max(np.abs(out)) + 1e-9)


def click(gain=1.0):
    n = sec(0.06)
    t = np.arange(n) / SR
    s = hp_fast(noise(n), 2500) * np.exp(-t / 0.004) + 0.4 * np.sin(2 * np.pi * 2300 * t) * np.exp(-t / 0.02)
    return gain * s


def bell_ring(dur=0.9, gain=1.0):
    """old electro-mechanical phone bell: inharmonic partials, hammered at ~20 Hz"""
    n = sec(dur)
    t = np.arange(n) / SR
    tone = sum(a * np.sin(2 * np.pi * f * t) for f, a in [(1180, 1), (1712, 0.6), (2650, 0.35), (1420, 0.5)])
    trem = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 20 * t))
    edge = np.minimum(1, t / 0.01) * np.minimum(1, (dur - t) / 0.05)
    return gain * tone * (0.35 + 0.65 * trem) * edge * 0.3


def beep(f=1000, dur=0.13, gain=1.0):
    n = sec(dur)
    t = np.arange(n) / SR
    return gain * np.sin(2 * np.pi * f * t) * np.minimum(1, t / 0.005) * np.minimum(1, (dur - t) / 0.01)


def blip(f0=900, f1=1500, dur=0.09, gain=1.0):
    n = sec(dur)
    t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(f0 + (f1 - f0) * t / dur) / SR
    return gain * np.sin(ph) * np.exp(-t / 0.04)


def ding(gain=1.0):
    n = sec(1.6)
    t = np.arange(n) / SR
    return gain * sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, a, d in [(1568, 1, 0.6), (3136, 0.4, 0.3), (4704, 0.2, 0.15)]) * 0.4


def footstep(gain=1.0, grit=0.5):
    n = sec(0.18)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * 85 * t) * np.exp(-t / 0.03) + grit * bp_fast(noise(n), 800, 5000) * np.exp(-t / 0.025)
    return gain * s


def paper(dur=0.35, gain=1.0):
    n = sec(dur)
    t = np.linspace(0, 1, n)
    crackle = (rng.random(n) < 0.02) * noise(n) * 3
    s = bp_fast(noise(n) + crackle, 1500, 7000) * np.sin(np.pi * t) ** 0.7
    return gain * s / (np.max(np.abs(s)) + 1e-9)


def heartbeat(gain=1.0):
    n = sec(0.7)
    out = np.zeros(n)
    for off, a in [(0, 1.0), (0.22, 0.7)]:
        m = sec(0.2)
        t = np.arange(m) / SR
        place(out, a * np.sin(2 * np.pi * 52 * t) * np.exp(-t / 0.05), sec(off))
    return gain * out


def murmur(dur, gain=1.0):
    n = sec(dur)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for v in range(6):
        syl = 3 + rng.random() * 3
        am = np.clip(np.sin(2 * np.pi * syl * t + rng.random() * 6) + 0.2 * noise(n) * 0.1, 0, None) ** 2
        out += bp_fast(noise(n), 250 + 60 * v, 1800 + 200 * v) * am
    out *= np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.4)
    return gain * out / (np.max(np.abs(out)) + 1e-9)


def wind(dur, gain=1.0):
    n = sec(dur)
    t = np.arange(n) / SR
    s = lp_fast(noise(n), 500) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.23 * t))
    s *= np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.4)
    return gain * s / (np.max(np.abs(s)) + 1e-9)


def siren(dur, gain=1.0):
    n = sec(dur)
    t = np.arange(n) / SR
    f = 700 + 250 * (np.sin(2 * np.pi * 0.9 * t) > 0)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    s = lp_fast(s, 1800) * np.minimum(1, t / 0.3) * np.minimum(1, (dur - t) / 0.3)
    return gain * s * 0.5


# ---------------- music ----------------
def pluck(freq, dur=0.6, bright=0.5):
    """Karplus-Strong pizzicato"""
    n = sec(dur)
    p = max(2, int(SR / freq))
    buf = rng.uniform(-1, 1, p)
    buf = lowpass(buf, 2000 + 6000 * bright)
    out = np.empty(n)
    idx = 0
    for i in range(n):
        out[i] = buf[idx]
        nxt = (idx + 1) % p
        buf[idx] = 0.497 * (buf[idx] + buf[nxt])
        idx = nxt
    return out * np.exp(-np.arange(n) / (0.35 * SR))


def note(name):
    names = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4, "F#": -3, "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[pitch] + 12 * (octave - 4)) / 12)


def score():
    music = np.zeros(N)
    # low drone with a slow swell, all the way to the freeze
    t = np.arange(N) / SR
    stop = fr(1597)
    drone = np.zeros(N)
    for f, a in [(55, 1.0), (55.4, 0.8), (82.4, 0.5), (110.3, 0.25)]:
        ph = (f * t) % 1.0
        drone += a * (2 * ph - 1)
    drone = lp_fast(drone, 240) * (0.55 + 0.25 * np.sin(2 * np.pi * 0.07 * t))
    drone[stop:] *= np.exp(-np.arange(N - stop) / (0.08 * SR))
    music += 0.22 * drone
    # clock tick in the hook
    for k in range(6):
        place(music, click(0.35), fr(0) + sec(0.5 * k))
    # pizzicato ostinato from the reveal onward (A minor -> F -> D minor -> E), 112 bpm eighths
    bpm = 112
    eighth = 60 / bpm / 2
    chords = [
        ["A3", "E4", "C4", "E4", "B3", "E4", "C4", "E4"],
        ["F3", "C4", "A3", "C4", "G3", "C4", "A3", "C4"],
        ["D3", "A3", "F3", "A3", "E3", "A3", "F3", "A3"],
        ["E3", "B3", "G#3", "B3", "D4", "B3", "G#3", "B3"],
    ]
    bass = ["A1", "F1", "D2", "E1"]
    cache = {}
    start = 87 / FPS
    i = 0
    while True:
        tt = start + i * eighth
        if tt >= 1597 / FPS:
            break
        bar = i // 8
        nm = chords[(bar // 2) % 4][i % 8]
        if nm not in cache:
            cache[nm] = pluck(note(nm), 0.5, 0.45)
        acc = 1.0 if i % 8 == 0 else 0.7 if i % 2 == 0 else 0.55
        place(music, cache[nm], sec(tt), 0.32 * acc)
        if i % 8 == 0:
            bn = bass[(bar // 2) % 4]
            if bn not in cache:
                cache[bn] = pluck(note(bn), 1.2, 0.2)
            place(music, cache[bn], sec(tt), 0.55)
        i += 1
    return reverb(music, 1.6, 0.22)


# ---------------- sfx timeline (frames) ----------------
def sfx():
    s = np.zeros(N)
    P = lambda sig, f, g=1.0: place(s, sig, fr(f), g)
    P(boom(1.8), 9, 0.9)
    P(thud(), 12, 0.8)
    P(thud(), 40, 0.6)
    P(whoosh(0.5, True), 80, 0.5)
    P(boom(2.0, 90, 30), 138, 1.0)
    P(whoosh(0.35, False), 188, 0.4)
    P(thud(), 195, 0.7)
    P(thud(), 213, 0.8)
    P(boom(1.2, 70, 30), 282, 0.6)
    P(thud(), 337, 0.8)
    P(boom(0.6, 200, 60), 361, 0.6)
    for k in range(2):
        P(heartbeat(0.9), 376 + k * 20)
    P(siren(2.6), 405, 0.12)
    for k in range(3):
        P(beep(), 454 + k * 14, 0.35)
    for k in range(2):
        P(bell_ring(0.4), 486 + k * 14, 0.55)
    P(click(0.8), 512)
    P(boom(0.9, 160, 50), 530, 0.6)
    P(thud(0.5), 569)
    for k in range(5):
        P(footstep(0.35), 578 + k * 10)
    for k, f in enumerate([650, 658, 674]):
        P(whoosh(0.3, True), f - 9, 0.35)
        P(paper(0.18), f, 0.45)
    for k in range(3):
        P(paper(0.3), 712 + k * 6, 0.35)
    P(thud(), 755, 0.7)
    for k in range(int((861 - 816) / 2.2)):
        P(click(0.45), int(816 + k * 2.2))
    P(thud(0.6), 819)
    P(boom(1.4, 120, 40), 887, 0.8)
    P(whoosh(0.4, False), 936, 0.4)
    P(thud(), 944, 0.8)
    P(paper(0.5), 951, 0.4)
    for k in range(int((1032 - 984) / 1.8)):
        P(click(0.45), int(984 + k * 1.8))
    P(boom(1.8, 110, 32), 1007, 1.0)
    P(whoosh(0.45, True), 1050, 0.6)
    P(thud(), 1062, 0.8)
    P(boom(1.0, 90, 40), 1073, 0.5)
    P(murmur(3.8), 1098, 0.18)
    for k in range(7):
        P(blip(700 + 60 * k, 1300 + 60 * k), 1104 + k * 4, 0.25)
    P(whoosh(0.5, True), 1180, 0.35)
    for k in range(6):
        P(paper(0.08), 1278 + k * 3, 0.3)
    P(thud(), 1294, 0.8)
    P(ding(), 1296, 0.5)
    P(boom(1.0, 100, 40), 1354, 0.35)
    P(thud(), 1394, 0.9)
    P(whoosh(0.6, False), 1437, 0.3)
    for k in range(18):
        P(blip(500 + 40 * k, 700 + 40 * k, 0.05), int(1449 + k * 1.5), 0.2)
    P(boom(1.6, 120, 35), 1505, 0.9)
    P(wind(4.0), 1530, 0.18)
    for k in range(4):
        P(footstep(0.4, 0.9), 1555 + k * 10)
    P(whoosh(0.3, False), 1590, 0.4)
    P(boom(2.0, 140, 28), 1597, 1.1)
    P(thud(), 1600, 0.9)
    return s


def read_voice(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    v = np.frombuffer(raw, np.float32).astype(np.float64)
    out = np.zeros(N)
    out[: min(N, len(v))] = v[:N]
    return out


def duck_gain(voice, depth=0.6):
    win = sec(0.05)
    e = np.sqrt(np.convolve(voice ** 2, np.ones(win) / win, mode="same"))
    e = e / (np.percentile(e[e > 1e-4], 90) + 1e-9)
    g = 1 - depth * np.clip(e * 1.5, 0, 1)
    # smooth: fast attack, slow release
    out = np.empty_like(g)
    acc = 1.0
    att, rel = np.exp(-1 / (0.02 * SR)), np.exp(-1 / (0.35 * SR))
    for i in range(0, len(g), 48):  # control rate 1 kHz
        target = g[i]
        a = att if target < acc else rel
        acc = target + (acc - target) * a ** 48
        out[i:i + 48] = acc
    return out


def main():
    voice_path, out_path = sys.argv[1], sys.argv[2]
    v = read_voice(voice_path)
    m = score()
    fx = sfx()
    g = duck_gain(v)
    fx = np.tanh(fx * 0.9) / 0.9
    mix = v * 1.0 + m * g * 0.62 + fx * 0.33
    mix /= max(1.0, np.max(np.abs(mix)) / 0.95)
    data = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
    with wave.open(out_path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print("wrote", out_path, f"{len(data) / SR:.2f}s")


if __name__ == "__main__":
    main()
