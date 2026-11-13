"""Seslendirme satırlarının süresi ve kelime zamanlamaları (ElevenLabs with-timestamps).
Her reels klasöründeki timeline.py bunu kullanır. Dosya yoksa tahmini sürelerle çalışır.
"""
import json
import os
import re
import subprocess

import numpy as np


def duration(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                          '-of', 'default=nw=1:nk=1', path], capture_output=True, text=True)
    return float(out.stdout.strip())


def energy_db(path, hop=0.01):
    """10 ms'lik pencerelerde ses seviyesi (dB)."""
    sr = 16000
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, '<f4')
    fr = int(sr * hop)
    n = len(x) // fr
    e = np.sqrt(np.mean(x[: n * fr].reshape(n, fr) ** 2, axis=1))
    return 20 * np.log10(e + 1e-9)


class Line:
    def __init__(self, n, vo_dir, text, role='narrator', speed=1.0):
        self.n = n
        self.role = role
        self.speed = speed
        mp3 = os.path.join(vo_dir, f'{n:02d}.mp3')
        js = os.path.join(vo_dir, f'{n:02d}.json')
        self.real = os.path.exists(mp3)
        if self.real:
            self.file = mp3
            meta = json.load(open(js)) if os.path.exists(js) else {}
            al = meta.get('alignment') or meta.get('normalized_alignment') or {}
            self.chars = ''.join(al.get('characters', []))
            self.starts = list(al.get('character_start_times_seconds', []))
            self.db = energy_db(mp3)
            loud = self.db > self.db.max() - 35
            on = int(np.argmax(loud))
            off = len(loud) - int(np.argmax(loud[::-1]))
            # ham dosyadaki konuşma başı/sonu (sn) — sondaki sessizlik kırpılır
            self.raw_lead = on * 0.01
            self.raw_dur = min(duration(mp3), off * 0.01 + 0.06)
        else:
            self.file = None
            self.chars = text
            self.raw_dur = 0.065 * len(text) + 0.25
            self.starts = [0.1 + i * (self.raw_dur - 0.25) / len(self.chars) for i in range(len(self.chars))]
            self.db = None
            self.raw_lead = 0.1
        self.dur = self.raw_dur / self.speed
        self.lead = self.raw_lead / self.speed
        self.start = None

    def _snap(self, t):
        """Hizalama zamanını, yakınındaki gerçek ses başlangıcına (sessizlikten sonra) oturt."""
        if self.db is None:
            return t
        db, best = self.db, None
        lo, hi = max(5, int((t - 0.25) * 100)), min(len(db) - 1, int((t + 0.3) * 100))
        quiet = db.max() - 32
        for i in range(lo, hi):
            if db[i] > quiet and np.all(db[i - 5:i] <= quiet):
                if best is None or abs(i / 100 - t) < abs(best - t):
                    best = i / 100
        return best if best is not None else t

    def onset(self, word, nth=0, snap=True):
        """Kelimenin satır içindeki başlangıcı (sn, hızlandırma sonrası)."""
        idx = -1
        for _ in range(nth + 1):
            idx = self.chars.find(word, idx + 1)
            if idx < 0:
                break
        if idx < 0 or idx >= len(self.starts):
            plain = re.sub(r'\[[^\]]*\]\s*', '', self.chars)
            k = plain.find(word)
            raw = self.raw_lead + ((k / max(1, len(plain))) if k >= 0 else 0) * (self.raw_dur - self.raw_lead)
        else:
            raw = self.starts[idx]
            if snap:
                raw = self._snap(raw)
        return raw / self.speed

    def at(self, word, nth=0, snap=True):
        return round(self.start + self.onset(word, nth, snap), 3)

    @property
    def end(self):
        return self.start + self.dur
