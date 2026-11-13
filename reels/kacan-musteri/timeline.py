"""Mimozai Reels "Günde 5 = Ayda 150" — zaman çizelgesi.
Seslendirme sürelerinden ve kelime zamanlamalarından sahne/animasyon zamanlarını hesaplar.
Çıktılar: timeline.json (sound.py) ve timeline.js (scene.js).
Kullanım: python3 timeline.py
"""
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'common'))
from votiming import Line  # noqa: E402

VO = os.path.join(HERE, 'vo')
TEXT = {
    1: 'Günde sadece beş cevapsız arama…',
    2: '…ayda yüz elli kaçan müşteri demek.',
    3: 'Müşteri başı bin lira desek…',
    4: 'her ay yüz elli bin lira… rakibine gidiyor.',
    5: 'Mimoza ey-ay her aramayı açar. Gece, gündüz, bayramda bile.',
    6: 'Yorumlara “hesapla” yaz, kaybını birlikte hesaplayalım.',
}
SPEED = 1.04  # anlatıcı hafif hızlandırılır (atempo); tonlama korunur

# CTA satırı zaten hızlı okunmuş (0.055 sn/harf) → doğal hızında kalır
L = {n: Line(n, VO, TEXT[n], 'narrator', 1.0 if n == 6 else SPEED) for n in TEXT}
tl = {}
r = lambda x: round(float(x), 3)  # noqa: E731

# A — kanca: cevapsız arama bildirimleri düşüyor
L[1].start = 0.12
last = max(1.0, L[1].at('arama') - 0.1)
tl['notifs'] = [0.0] + [r(x) for x in np.linspace(0.3, last, 4)]

# B — takvim: 5 → 150
tl['B'] = r(L[1].end + 0.05)
L[2].start = tl['B'] + 0.15
tl['countStart'] = r(tl['B'] + 0.05)
tl['countEnd'] = r(max(tl['countStart'] + 0.7, L[2].at('yüz')))
if tl['countEnd'] > L[2].at('yüz'):  # sayaç bitmeden "yüz elli" söylenmesin
    L[2].start += tl['countEnd'] - L[2].at('yüz')
tl['kacan'] = L[2].at('kaçan')

# C — para: 150 müşteri × 1.000 ₺ = 150.000 ₺
tl['C'] = r(L[2].end + 0.15)
L[3].start = tl['C'] + 0.1
tl['eq'] = r(L[3].at('bin') - 0.08)
L[4].start = L[3].end + 0.1
tl['moneyStart'] = r(L[4].start + L[4].lead)
tl['moneyEnd'] = r(max(tl['moneyStart'] + 0.6, L[4].at('lira')))
tl['rakip'] = L[4].at('rakibine')

# D — çözüm + CTA
tl['D'] = r(L[4].end + 0.2)
L[5].start = tl['D'] + 0.1
tl['mimoza'] = L[5].at('Mimoza')
tl['her'] = L[5].at('her')
tl['chips'] = [L[5].at('Gece'), L[5].at('gündüz'), L[5].at('bayramda')]
L[6].start = L[5].end + 0.15
tl['cta'] = r(L[6].start + L[6].lead)
tl['END'] = r(L[6].end + 0.7)

tl['vo'] = [{'n': n, 'file': L[n].file, 'start': r(L[n].start), 'dur': r(L[n].dur),
             'speed': L[n].speed, 'role': 'narrator'} for n in TEXT]
tl['estimated'] = not all(L[n].real for n in TEXT)

json.dump(tl, open(os.path.join(HERE, 'timeline.json'), 'w'), ensure_ascii=False, indent=1)
with open(os.path.join(HERE, 'timeline.js'), 'w') as f:
    f.write('window.TL = ' + json.dumps(tl, ensure_ascii=False) + ';\n')

if __name__ == '__main__':
    print(f"{'TAHMİNİ' if tl['estimated'] else 'GERÇEK'} süreler — toplam {tl['END']:.2f} sn")
    for v in tl['vo']:
        print(f"  {v['n']:02d} {v['start']:6.2f} → {v['start'] + v['dur']:6.2f}  {TEXT[v['n']]}")
    print('  sahneler:', {k: tl[k] for k in ('B', 'C', 'D', 'END')})
