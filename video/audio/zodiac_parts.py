"""Score + SFX for Zodiac Parts 2 and 3 (same sound family as Part 1).

Usage: python3 audio/zodiac_parts.py <2|3> <voice.mp3> <out.wav>
Event times are in video frames (30 fps) and match src/zodiac/Part2.tsx / Part3.tsx.
"""
import sys
import wave

import numpy as np

import zodiac_part1 as z
from zodiac_part1 import (SR, FPS, beep, bell_ring, blip, boom, click, ding, footstep, heartbeat, murmur, note, paper, place,
                          pluck, reverb, sec, siren, thud, whoosh, wind, lp_fast, bp_fast, noise)

FRAMES = 1620
N = int(FRAMES / FPS * SR)


def fr(f):
    return int(round(f / FPS * SR))


def score(start_f, stop_f, bpm, chords, bass, tick=True):
    music = np.zeros(N)
    t = np.arange(N) / SR
    stop = fr(stop_f)
    drone = np.zeros(N)
    root = note(bass[0]) * 2
    for f, a in [(root, 1.0), (root * 1.007, 0.8), (root * 1.5, 0.5), (root * 2, 0.25)]:
        drone += a * (2 * ((f * t) % 1.0) - 1)
    drone = lp_fast(drone, 240) * (0.55 + 0.25 * np.sin(2 * np.pi * 0.07 * t))
    drone[stop:] *= np.exp(-np.arange(N - stop) / (0.08 * SR))
    music += 0.22 * drone
    if tick:
        for k in range(int(start_f / FPS / 0.5)):
            place(music, click(0.35), sec(0.5 * k))
    eighth = 60 / bpm / 2
    cache = {}
    i = 0
    while True:
        tt = start_f / FPS + i * eighth
        if tt >= stop_f / FPS:
            break
        bar = i // 8
        nm = chords[(bar // 2) % len(chords)][i % 8]
        if nm not in cache:
            cache[nm] = pluck(note(nm), 0.5, 0.45)
        acc = 1.0 if i % 8 == 0 else 0.7 if i % 2 == 0 else 0.55
        place(music, cache[nm], sec(tt), 0.32 * acc)
        if i % 8 == 0:
            bn = bass[(bar // 2) % len(bass)]
            if bn not in cache:
                cache[bn] = pluck(note(bn), 1.2, 0.2)
            place(music, cache[bn], sec(tt), 0.55)
        i += 1
    return reverb(music, 1.6, 0.22)


def marker(dur=0.5, gain=1.0):
    n = sec(dur)
    t = np.arange(n) / SR
    f = 2600 + 900 * np.sin(2 * np.pi * 7 * t)
    s = bp_fast(noise(n), 1800, 5200) * (0.6 + 0.4 * np.sin(2 * np.pi * np.cumsum(f) / SR))
    s *= np.minimum(1, t / 0.02) * np.minimum(1, (dur - t) / 0.05)
    return gain * s / (np.max(np.abs(s)) + 1e-9)


def dial_tone(dur, gain=1.0):
    n = sec(dur)
    t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * 350 * t) + np.sin(2 * np.pi * 440 * t)) * 0.5
    return gain * s * np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.2)


def engine_pass(dur, peak, gain=1.0):
    n = sec(dur)
    t = np.arange(n) / SR
    pitch = 70 + 30 * np.tanh((peak - t) * 3)
    s = np.sign(np.sin(2 * np.pi * np.cumsum(pitch) / SR)) * 0.5 + lp_fast(noise(n), 900) * 0.6
    s = lp_fast(s, 1200)
    amp = np.exp(-((t - peak) ** 2) / (2 * 0.5 ** 2))
    return gain * s * amp / (np.max(np.abs(s * amp)) + 1e-9)


def idle(dur, gain=1.0):
    n = sec(dur)
    t = np.arange(n) / SR
    s = lp_fast(np.sign(np.sin(2 * np.pi * 32 * t)) + 0.5 * noise(n), 300)
    s *= np.minimum(1, t / 0.2) * np.minimum(1, (dur - t) / 0.2)
    return gain * s / (np.max(np.abs(s)) + 1e-9)


def city(dur, gain=1.0):
    n = sec(dur)
    t = np.arange(n) / SR
    s = lp_fast(noise(n), 700) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.13 * t))
    s *= np.minimum(1, t / 0.5) * np.minimum(1, (dur - t) / 0.5)
    return gain * s / (np.max(np.abs(s)) + 1e-9)


def ticks(f0, f1, step, gain=0.3):
    out = []
    f = f0
    while f < f1:
        out.append((click(gain), int(f)))
        f += step
    return out


def sfx2():
    s = np.zeros(N)
    P = lambda sig, f, g=1.0: place(s, sig, fr(f), g)
    P(thud(), 2, 0.6)
    P(boom(1.8, 110, 32), 61, 0.9)
    P(whoosh(0.4, True), 104, 0.4)
    P(wind(8.5), 108, 0.15)
    P(thud(), 134, 0.8)
    for k in range(4):
        P(footstep(0.4, 0.9), 258 + k * 9)
    P(click(0.9), 278)
    P(boom(0.7, 180, 70), 278, 0.4)
    P(whoosh(0.35, False), 296, 0.4)
    P(boom(1.8, 120, 30), 336, 1.0)
    P(heartbeat(0.9), 342)
    P(heartbeat(0.8), 362)
    for k in range(5):
        P(beep(900), 382 + k * 22, 0.25)
    P(blip(600, 1000, 0.12), 435, 0.3)
    P(marker(1.2), 501, 0.35)
    P(thud(0.7), 531)
    P(marker(1.3), 558, 0.3)
    P(thud(0.5), 609)
    P(dial_tone(2.4), 615, 0.12)
    P(whoosh(0.4, True), 686, 0.5)
    P(thud(), 693, 0.8)
    P(city(6.0), 690, 0.15)
    P(boom(0.8, 90, 40), 727, 0.4)
    P(idle(1.6), 783, 0.25)
    P(thud(0.6), 810)
    P(boom(1.6, 140, 30), 836, 1.0)
    P(click(0.6), 933)
    P(bell_ring(0.3), 940, 0.3)
    for k in range(16):
        P(footstep(0.3), 984 + k * 10)
    P(engine_pass(3.0, 1.4), 999, 0.5)
    P(boom(0.9, 90, 40), 1100, 0.45)
    P(whoosh(0.35, False), 1149, 0.4)
    P(thud(), 1157, 0.8)
    P(paper(0.5), 1180, 0.4)
    P(paper(0.6), 1200, 0.3)
    P(thud(0.7), 1238)
    P(blip(700, 1200), 1305, 0.3)
    P(blip(800, 1300), 1328, 0.3)
    P(thud(), 1350, 0.9)
    P(whoosh(0.35, False), 1395, 0.4)
    P(thud(), 1403, 0.8)
    for sig, f in ticks(1419, 1476, 2, 0.35):
        P(sig, f)
    P(boom(1.0, 120, 50), 1446, 0.6)
    P(boom(2.0, 120, 30), 1543, 1.0)
    P(thud(), 1572, 0.9)
    return s


def sfx3():
    s = np.zeros(N)
    P = lambda sig, f, g=1.0: place(s, sig, fr(f), g)
    P(thud(0.6), 1)
    P(boom(1.8, 110, 32), 49, 0.9)
    for f in [84, 129, 165]:
        P(whoosh(0.3, True), f - 6, 0.4)
        P(thud(0.6), f)
    P(murmur(1.6), 165, 0.15)
    P(thud(), 237, 0.8)
    P(ding(), 304, 0.5)
    P(boom(1.0, 100, 40), 304, 0.6)
    for f in [345, 362, 385]:
        P(blip(800, 1500), f, 0.35)
    P(whoosh(0.4, True), 420, 0.4)
    for k in range(12):
        P(blip(500 + 50 * k, 800 + 50 * k, 0.05), 481 + k * 2, 0.2)
    P(boom(0.9, 180, 60), 515, 0.6)
    for sig, f in ticks(596, 672, 2.1, 0.4):
        P(sig, f)
    P(thud(), 740, 0.9)
    P(whoosh(0.4, False), 762, 0.4)
    P(thud(0.6), 833)
    P(paper(0.3), 888, 0.4)
    P(paper(0.3), 909, 0.4)
    P(boom(1.2, 120, 40), 936, 0.8)
    P(thud(), 981, 0.8)
    P(thud(), 1015, 0.9)
    P(thud(), 1063, 0.8)
    P(whoosh(0.5, False), 1110, 0.5)
    for k in range(10):
        P(click(0.5), 1137 + k)
    P(boom(1.0, 100, 40), 1143, 0.7)
    P(ding(), 1205, 0.4)
    for k in range(13):
        P(blip(600 + 30 * k, 900 + 30 * k, 0.06), int(1298 + k * 2.2), 0.25)
    P(boom(1.0, 120, 40), 1309, 0.5)
    P(boom(1.4, 110, 32), 1381, 0.7)
    P(thud(), 1418, 0.8)
    P(thud(), 1484, 0.9)
    P(whoosh(1.2, True), 1508, 0.35)
    P(ding(), 1560, 0.5)
    return s


def main():
    part, voice_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
    z.N = N  # read_voice pads/crops to the part length
    v = z.read_voice(voice_path)
    if part == "2":
        m = score(108, 1543, 116, [["D3", "A3", "F3", "A3", "E3", "A3", "F3", "A3"], ["A#2", "F3", "D3", "F3", "C3", "F3", "D3", "F3"],
                                   ["G2", "D3", "A#2", "D3", "A2", "D3", "A#2", "D3"], ["A2", "E3", "C#3", "E3", "G3", "E3", "C#3", "E3"]],
                  ["D1", "A#1", "G1", "A1"], tick=False)
        fx = sfx2()
    else:
        m = score(84, 1590, 104, [["E3", "B3", "G3", "B3", "F#3", "B3", "G3", "B3"], ["C3", "G3", "E3", "G3", "D3", "G3", "E3", "G3"],
                                  ["A2", "E3", "C3", "E3", "B2", "E3", "C3", "E3"], ["B2", "F#3", "D#3", "F#3", "A3", "F#3", "D#3", "F#3"]],
                  ["E1", "C2", "A1", "B1"], tick=True)
        fx = sfx3()
    g = z.duck_gain(v)
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
