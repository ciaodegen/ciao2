"""Seslendirme dosyalarının sürelerinden ve kelime zamanlamalarından videonun
zaman çizelgesini hesaplar. Çıktılar: timeline.json (sound.py) ve timeline.js (scene.js).

vo/NN.mp3 + vo/NN.json (ElevenLabs with-timestamps hizalaması) yoksa tahmini
sürelerle çalışır; böylece sesler gelmeden de video önizlenebilir.
Kullanım: python3 timeline.py
"""
import json
import os
import re
import subprocess

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
VO = os.path.join(HERE, 'vo')

TEXT = {
    1: 'Gece üç on yedi. İş yerimde kimse yoktu…',
    2: '…ama biri telefonu açtı.',
    3: 'Dişim çok ağrıyor, sabah yer var mı?',
    4: 'Geçmiş olsun. Sabah dokuz buçuğa ayırdım.',
    5: 'Ben uyurken dört müşteri aradı. Tek bir arama bile kaçmadı.',
    6: 'Maaş istemiyor. Sigorta istemiyor. İzin istemiyor. Ve asla uyumuyor.',
    7: 'Tanışın: Mimozai. Sen uyurken bile işletmen için çalışan biri.',
    8: 'Yorumlara gece yaz, ücretsiz demo hattını kuralım.',
}
# Konuşma hızı (atempo). Ürünün sesi olan asistan doğal hızında bırakılır.
SPEED = {'narrator': 1.07, 'customer': 1.05, 'assistant': 1.0}
ROLE = {3: 'customer', 4: 'assistant'}


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
    def __init__(self, n):
        self.n = n
        self.role = ROLE.get(n, 'narrator')
        self.speed = SPEED[self.role]
        mp3 = os.path.join(VO, f'{n:02d}.mp3')
        js = os.path.join(VO, f'{n:02d}.json')
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
            self.chars = TEXT[n]
            self.raw_dur = 0.065 * len(TEXT[n]) + 0.25
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


L = {n: Line(n) for n in TEXT}
tl = {}

# A: telefon çalıyor, anlatıcı fısıldıyor
L[1].start = 0.15
tl['ANSWER'] = round(max(1.5, L[1].end + 0.05), 3)
L[2].start = tl['ANSWER'] + 0.05
# B: görüşme
tl['B'] = round(L[2].end + 0.12, 3)
L[3].start = tl['B'] + 0.3
tl['bubble1'] = round(L[3].start, 3)
tl['typing'] = round(L[3].end + 0.02, 3)
L[4].start = L[3].end + 0.3
tl['bubble2'] = round(L[4].start, 3)
# C: sabah
tl['C'] = round(L[4].end + 0.22, 3)
tl['notifs'] = [round(tl['C'] + 0.3 + i * 0.3, 3) for i in range(4)]
L[5].start = tl['C'] + 0.15
tl['punch'] = round(max(tl['notifs'][-1] + 0.25, L[5].at('Tek') - 0.1), 3)
# D: MAAŞ / SİGORTA / İZİN / UYKU
tl['D'] = round(L[5].end + 0.15, 3)
L[6].start = tl['D'] + 0.1
tl['words'] = [
    {'w': 'MAAŞ', 'at': L[6].at('Maaş') - 0.05, 'strike': L[6].at('istemiyor', 0)},
    {'w': 'SİGORTA', 'at': L[6].at('Sigorta') - 0.05, 'strike': L[6].at('istemiyor', 1)},
    {'w': 'İZİN', 'at': L[6].at('İzin') - 0.05, 'strike': L[6].at('istemiyor', 2)},
    {'w': 'UYKU', 'at': L[6].at('Ve') - 0.05, 'strike': L[6].at('uyumuyor')},
]
for w in tl['words']:
    w['at'] = round(max(tl['D'], w['at']), 3)
# E: Mimozai + CTA
tl['E'] = round(L[6].end + 0.25, 3)
L[7].start = tl['E'] + 0.05
tl['tanisin'] = round(L[7].start + L[7].lead, 3)
tl['mimozai'] = L[7].at('Mimozai')
tl['tagline'] = L[7].at('Sen')
L[8].start = L[7].end + 0.15
tl['cta'] = round(L[8].start + L[8].lead, 3)
tl['TAIL'] = round(L[8].end + 0.5, 3)
tl['END'] = round(tl['TAIL'] + 0.35, 3)

tl['vo'] = [{'n': n, 'file': L[n].file, 'start': round(L[n].start, 3), 'dur': round(L[n].dur, 3),
             'speed': L[n].speed, 'role': L[n].role} for n in TEXT]
tl['estimated'] = not all(L[n].real for n in TEXT)

json.dump(tl, open(os.path.join(HERE, 'timeline.json'), 'w'), ensure_ascii=False, indent=1)
with open(os.path.join(HERE, 'timeline.js'), 'w') as f:
    f.write('window.TL = ' + json.dumps(tl, ensure_ascii=False) + ';\n')

print(f"{'TAHMİNİ' if tl['estimated'] else 'GERÇEK'} süreler — toplam {tl['END']:.2f} sn")
for v in tl['vo']:
    print(f"  {v['n']:02d} {v['role']:9s} {v['start']:6.2f} → {v['start'] + v['dur']:6.2f}")
print('  sahneler:', {k: tl[k] for k in ('ANSWER', 'B', 'C', 'D', 'E', 'TAIL', 'END')})
