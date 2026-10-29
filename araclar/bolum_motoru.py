"""Aspiratör Işığı bölüm motoru: ses montajı, altyazı, karakter performansı ve MP4 çıktısı.

Bölüm klasöründe şunlar beklenir:
  senaryo.json            replikler (altyazi + tts metni)
  ses/replik_XX.mp3/.json ElevenLabs çıktıları (araclar/seslendir.py)
  yonetim.py              zamanlama, bakışlar, jestler, efekt sesleri

Kullanım: python3 bolum_motoru.py bolumler/bolum01 [--prototip SANIYE]
"""
import importlib.util, json, os, subprocess, sys
from concurrent.futures import ProcessPoolExecutor
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sahne_rig import Sahne, W, H  # noqa: E402

FPS = 30
SR = 48000
KARAKTERLER = ("ipek", "derya")
YAZI_TIPI = "/usr/share/fonts/opentype/inter/InterDisplay-ExtraBold.otf"


# ---------------------------------------------------------------- ses yardımcıları
def ses_oku(yol, kanal=1):
    ham = subprocess.run(["ffmpeg", "-v", "error", "-i", yol, "-f", "f32le", "-ac", str(kanal), "-ar", str(SR), "-"],
                         check=True, capture_output=True).stdout
    x = np.frombuffer(ham, np.float32)
    return x.reshape(-1, kanal) if kanal > 1 else x


def wav_yaz(yol, x):
    x = np.atleast_2d(x.T).T if x.ndim == 1 else x
    ham = np.clip(x, -1, 1).astype(np.float32).tobytes()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ac", str(x.shape[1]), "-ar", str(SR), "-i", "-",
                    "-c:a", "pcm_s16le", yol], input=ham, check=True)


def rms_zarf(x, pencere=0.03):
    """Kare başına (FPS) RMS zarfı."""
    n = int(len(x) / SR * FPS) + 1
    w = int(SR * pencere)
    out = np.zeros(n, np.float32)
    for i in range(n):
        c = int(i / FPS * SR)
        p = x[max(0, c - w // 2):c + w // 2]
        out[i] = np.sqrt((p ** 2).mean()) if len(p) else 0
    return out


def seslendirilmis_aralik(x, esik_oran=0.06):
    hop = 480
    rms = np.sqrt(np.convolve(x ** 2, np.ones(hop) / hop, "same"))[::hop]
    akt = np.nonzero(rms > max(0.01, rms.max() * esik_oran))[0]
    return akt[0] * hop / SR, akt[-1] * hop / SR


def pan(x, p):
    """p: -1 sol, +1 sağ (sabit güç)."""
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1)


# ---------------------------------------------------------------- metin/zaman yardımcıları
def harfler(alignment):
    """[etiket] içindeki karakterleri atarak (harf, başlangıç, bitiş) listesi."""
    out, ic = [], False
    for c, s, e in zip(alignment["characters"], alignment["character_start_times_seconds"],
                       alignment["character_end_times_seconds"]):
        if c == "[":
            ic = True
            continue
        if c == "]":
            ic = False
            continue
        if not ic:
            out.append((c, s, e))
    return out


def kelimeler(hs):
    out, cur = [], []
    for c, s, e in hs + [(" ", 0, 0)]:
        if c.isspace():
            if cur:
                out.append(("".join(x[0] for x in cur), cur[0][1], cur[-1][2]))
                cur = []
        else:
            cur.append((c, s, e))
    return out


def _sade(w):
    return "".join(ch for ch in w.lower() if ch.isalnum())


def eslestir(altyazi, tts_kelime):
    """Altyazı kelimelerine TTS kelime zamanlarını ata. TTS'te fazladan bölünen kelimeler
    (ör. FaceApp -> "Feys Ep") birleştirilir."""
    alt = altyazi.split()
    out, j = [], 0
    for i, w in enumerate(alt):
        a, t = _sade(w), _sade(tts_kelime[j][0])
        bas, son = tts_kelime[j][1], tts_kelime[j][2]
        uyumlu = a[:3] == t[:3] or a.startswith(t) or t.startswith(a)
        while not uyumlu and len(tts_kelime) - (j + 1) > len(alt) - (i + 1):
            j += 1
            son = tts_kelime[j][2]
            uyumlu = True
        out.append((w, bas, son))
        j += 1
    if j != len(tts_kelime):
        raise ValueError(f"altyazı/TTS kelime sayısı uyuşmuyor: {altyazi!r}")
    return out


def sessizlik_kisalt(x, hs, maks=0.5, esik_oran=0.05):
    """Replik içindeki maks'tan uzun sessizlikleri maks'a indirir; harf zamanlarını kaydırır."""
    hop = 480
    rms = np.sqrt(np.convolve(x ** 2, np.ones(hop) / hop, "same"))[::hop]
    sessiz = rms < max(0.006, rms.max() * esik_oran)
    kesimler, i = [], 0
    while i < len(sessiz):
        if sessiz[i]:
            j = i
            while j < len(sessiz) and sessiz[j]:
                j += 1
            bas, son = i * hop / SR, j * hop / SR
            if son - bas > maks and i > 0 and j < len(sessiz):
                kesimler.append((bas + maks / 2, son - maks / 2))
            i = j
        else:
            i += 1
    if not kesimler:
        return x, hs
    parcalar, onceki = [], 0
    for a, b in kesimler:
        parcalar.append(x[int(onceki * SR):int(a * SR)].copy())
        onceki = b
    parcalar.append(x[int(onceki * SR):].copy())
    # kesim noktalarında tık olmaması için kısa çapraz geçiş yerine 5 ms yumuşatma
    r = int(0.005 * SR)
    for p in parcalar:
        if len(p) > 2 * r:
            p[:r] *= np.linspace(0, 1, r)
            p[-r:] *= np.linspace(1, 0, r)
    def esle(t):
        kayma = 0.0
        for a, b in kesimler:
            if t >= b:
                kayma += b - a
            elif t > a:
                return a - kayma
        return t - kayma
    return np.concatenate(parcalar), [(c, esle(a), esle(b)) for c, a, b in hs]


# ---------------------------------------------------------------- bölüm verisi
def tempo_degistir(x, oran):
    """Perdeyi değiştirmeden konuşmayı hızlandırır (ffmpeg atempo)."""
    if abs(oran - 1) < 1e-3:
        return x
    ham = subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ac", "1", "-ar", str(SR), "-i", "-",
                          "-af", f"atempo={oran}", "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         input=x.astype(np.float32).tobytes(), check=True, capture_output=True).stdout
    return np.frombuffer(ham, np.float32).copy()


class Bolum:
    def __init__(self, klasor, tempo=None, maks_sessizlik=0.5):
        self.klasor = klasor
        self.senaryo = json.load(open(f"{klasor}/senaryo.json"))
        self.replikler = []
        for r in self.senaryo["replikler"]:
            x = ses_oku(f"{klasor}/ses/replik_{r['id']}.mp3")
            al = json.load(open(f"{klasor}/ses/replik_{r['id']}.json"))["alignment"]
            s, e = seslendirilmis_aralik(x)
            kes_bas = max(0.0, s - 0.05)
            kes_son = min(len(x) / SR, e + 0.15)
            x = x[int(kes_bas * SR):int(kes_son * SR)]
            hs = [(c, a - kes_bas, b - kes_bas) for c, a, b in harfler(al)]
            x, hs = sessizlik_kisalt(x, hs, maks=maks_sessizlik)
            oran = (tempo or {}).get(r["karakter"], 1.0)
            x = tempo_degistir(x, oran)
            hs = [(c, a / oran, b / oran) for c, a, b in hs]
            self.replikler.append(dict(r, ses=x, kes=0.0, sure=len(x) / SR, harfler=hs))

    def zamanla(self, giris, ara, ozel_ara, kapanis):
        t = giris
        for i, r in enumerate(self.replikler):
            if i:
                t += ozel_ara.get(r["id"], ara)
            r["bas"], r["son"] = t, t + r["sure"]
            r["harf_zaman"] = [(c, t + s - r["kes"], t + e - r["kes"]) for c, s, e in r["harfler"]]
            r["kelime_zaman"] = eslestir(r["altyazi"], kelimeler(r["harf_zaman"]))
            t = r["son"]
        self.sure = t + kapanis

    def r(self, rid):
        return next(x for x in self.replikler if x["id"] == rid)

    def kelime(self, rid, sira):
        """sira: kelime indeksi (int) veya kelimenin başı (str)."""
        kz = self.r(rid)["kelime_zaman"]
        if isinstance(sira, str):
            return next(b for w, b, e in kz if _sade(w).startswith(_sade(sira)))
        return kz[sira][1]


# ---------------------------------------------------------------- ses montajı
def ses_montaji(b, yon, cikti_klasor):
    n = int(b.sure * SR) + 1
    katmanlar = {}
    for ad in KARAKTERLER:
        k = np.zeros(n, np.float32)
        for r in b.replikler:
            if r["karakter"] != ad:
                continue
            x = r["ses"]
            s, e = seslendirilmis_aralik(x)
            seviye = np.sqrt((x[int(s * SR):int(e * SR)] ** 2).mean())
            x = x * (0.1 / seviye)  # -20 dBFS RMS'e eşitle
            if "seviye_egrisi" in r:  # [[göreli zaman 0-1, kazanç], ...] ör. giderek kısılan ses
                nokta = np.array(r["seviye_egrisi"], np.float32)
                x = x * np.interp(np.linspace(0, 1, len(x)), nokta[:, 0], nokta[:, 1]).astype(np.float32)
            i = int(r["bas"] * SR)
            k[i:i + len(x)] += x[:n - i]
        katmanlar[f"konusma_{ad}"] = k
    # efektler
    ef = np.zeros((n, 2), np.float32)
    for t, dosya, db, p in yon.EFEKTLER:
        x = ses_oku(f"{b.klasor}/ses_efekt/{dosya}")
        x = x / (np.abs(x).max() + 1e-9) * 10 ** (db / 20)
        i = int(t * SR)
        ef[i:i + len(x)] += pan(x, p)[:n - i]
    # ortam: iki kaydı çapraz geçişle birleştirip döngüle
    a, c = [ses_oku(f"{b.klasor}/ses_efekt/{f}") for f in yon.ORTAM]
    xf = SR
    rampa = np.linspace(0, 1, xf, dtype=np.float32)
    dongu = np.concatenate([a[:-xf], a[-xf:] * (1 - rampa) + c[:xf] * rampa, c[xf:]])
    ortam = np.tile(dongu, n // len(dongu) + 1)[:n]
    ortam = ortam / (np.sqrt((ortam ** 2).mean()) + 1e-9) * 10 ** (yon.ORTAM_DB / 20)
    ortam[:int(0.25 * SR)] *= np.linspace(0, 1, int(0.25 * SR))
    katmanlar["efekt"] = ef
    katmanlar["ortam"] = np.stack([ortam, ortam], 1)
    os.makedirs(f"{cikti_klasor}/ses_katmanlari", exist_ok=True)
    karisim = np.zeros((n, 2), np.float32)
    for ad, x in katmanlar.items():
        st = pan(x, yon.PAN[ad.split("_")[1]]) if ad.startswith("konusma") else x
        wav_yaz(f"{cikti_klasor}/ses_katmanlari/{ad}.wav", st)
        karisim += st
    karisim[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))[:, None]
    wav_yaz(f"{cikti_klasor}/ses_katmanlari/_karisim_ham.wav", karisim)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{cikti_klasor}/ses_katmanlari/_karisim_ham.wav",
                    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", str(SR), f"{cikti_klasor}/karisim.wav"], check=True)
    return {ad: rms_zarf(x) for ad, x in katmanlar.items() if ad.startswith("konusma")}


# ---------------------------------------------------------------- performans
def yumusak(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def tumsek(t, bas, atak, tut, birak):
    if t < bas or t > bas + atak + tut + birak:
        return 0.0
    if t < bas + atak:
        return yumusak((t - bas) / atak)
    if t < bas + atak + tut:
        return 1.0
    return 1 - yumusak((t - bas - atak - tut) / birak)


VISEM = {}
for h in "aâ":
    VISEM[h] = (1.0, 1.0)
for h in "e":
    VISEM[h] = (0.7, 1.08)
for h in "ıiî":
    VISEM[h] = (0.45, 1.05)
for h in "oö":
    VISEM[h] = (0.8, 0.66)
for h in "uüû":
    VISEM[h] = (0.5, 0.6)
for h in "mbp":
    VISEM[h] = (0.0, 1.0)
for h in "fv":
    VISEM[h] = (0.18, 1.0)


def agiz_izi(b, ad, zarf, kare_sayisi, hmax):
    """Kare başına (açıklık px, genişlik) — kendi sesi ve kendi harf zamanlaması ile."""
    hedef_h = np.zeros(kare_sayisi, np.float32)
    hedef_w = np.ones(kare_sayisi, np.float32)
    for r in b.replikler:
        if r["karakter"] != ad:
            continue
        for c, s, e in r["harf_zaman"]:
            if c.isspace() or not c.isalpha():
                continue
            v = VISEM.get(c.lower(), (0.32, 0.92))
            for f in range(int(s * FPS), min(kare_sayisi, int(np.ceil(e * FPS)) + 1)):
                if v[0] >= hedef_h[f] or v[0] == 0:
                    hedef_h[f], hedef_w[f] = v
    z = zarf[:kare_sayisi] if len(zarf) >= kare_sayisi else np.pad(zarf, (0, kare_sayisi - len(zarf)))
    seslenen = z[z > 0.01]
    ref = np.percentile(seslenen, 90) if len(seslenen) else 1
    kapi = np.clip(z / ref * 1.4, 0, 1) ** 0.7
    kapi[z < ref * 0.08] = 0
    h = hedef_h * kapi
    out_h = np.zeros_like(h)
    out_w = np.ones_like(h)
    for i in range(kare_sayisi):  # açılma hızlı, kapanma biraz yumuşak
        p = out_h[i - 1] if i else 0
        out_h[i] = p + (h[i] - p) * (0.75 if h[i] > p else 0.5)
        pw = out_w[i - 1] if i else 1
        out_w[i] = pw + (hedef_w[i] - pw) * 0.6
    return out_h * hmax, out_w


def bakis_ofsetleri(goz, hedef):
    bx, by = goz.bebek
    mx, my = goz.merkez
    r = goz.bebek_r
    if hedef == "orijinal":
        return 0.0, 0.0
    if hedef == "asagi":
        dx = (mx - bx) * 0.5
        xl = int(np.clip(bx + dx - goz.ox, 0, goz.w - 1))
        return dx, goz.oy + goz.alt[xl] - r + 1.5 - by
    if hedef == "merkez":
        return (mx - bx) * 0.85, (my - by) * 0.85
    if hedef == "yukari":
        return (mx - bx) * 0.6, -r * 0.9
    raise ValueError(hedef)


class Performans:
    def __init__(self, b, yon, sahne, zarflar):
        self.b, self.yon, self.sahne = b, yon, sahne
        self.n = int(round(b.sure * FPS))
        self.agiz = {ad: agiz_izi(b, ad, zarflar[f"konusma_{ad}"], self.n, yon.AGIZ_MAX[ad]) for ad in KARAKTERLER}
        self.zarf = {ad: zarflar[f"konusma_{ad}"] for ad in KARAKTERLER}
        self.bakis = {ad: sorted([(t, h) for t, a, h in yon.BAKISLAR if a == ad]) for ad in KARAKTERLER}
        # göz kırpma zamanları: rastgele aralıklar + her bakış değişiminde
        rng = np.random.default_rng(7)
        self.kirpma = {}
        for ad in KARAKTERLER:
            zamanlar, t = [], rng.uniform(0.6, 1.6)
            while t < b.sure - 0.4:
                zamanlar.append((t, 0.17))
                t += rng.uniform(2.3, 4.6)
            for tb, h in self.bakis[ad][1:]:
                if rng.random() < 0.55 and h != "yukari":
                    zamanlar.append((tb - 0.03, 0.15))
            zamanlar += [(t, s) for t, a, s in yon.OZEL_KIRPMA if a == ad]
            zamanlar.sort()
            temiz = []
            for z in zamanlar:  # birbirine çok yakın kırpmaları ele
                if not temiz or z[0] - temiz[-1][0] > 0.5:
                    temiz.append(z)
            self.kirpma[ad] = [z for z in temiz if z[0] < b.sure - 0.35]
        self.faz = {ad: rng.uniform(0, 6.28, 6) for ad in KARAKTERLER}

    def _bakis(self, ad, t):
        liste = self.bakis[ad]
        onceki, simdiki, tb = "orijinal", "orijinal", -10
        for zt, h in liste:
            if zt <= t:
                onceki, simdiki, tb = simdiki, h, zt
        f = yumusak((t - tb) / 0.14)
        out = []
        for g in self.sahne.gozler[ad]:
            a = np.array(bakis_ofsetleri(g, onceki)); c = np.array(bakis_ofsetleri(g, simdiki))
            out.append(tuple(a + (c - a) * f))
        return out, simdiki

    def _kirp(self, ad, t):
        v = 0.0
        for tb, s in self.kirpma[ad]:
            if tb <= t <= tb + s:
                u = (t - tb) / s
                v = max(v, np.sin(np.pi * u) ** 0.6)
        return float(v)

    def durum(self, i):
        t = i / FPS
        out = {}
        for ad in KARAKTERLER:
            ph = self.faz[ad]
            yon_isareti = 1.0 if ad == "ipek" else -1.0  # karşıdakine doğru
            # boşta: hafif baş salınımı + nefes
            tx = 1.6 * np.sin(2 * np.pi * 0.11 * t + ph[0]) + 0.6 * np.sin(2 * np.pi * 0.23 * t + ph[1])
            ty = 0.8 * np.sin(2 * np.pi * 0.17 * t + ph[2])
            aci = 0.4 * np.sin(2 * np.pi * 0.07 * t + ph[3]) + 0.15 * np.sin(2 * np.pi * 0.19 * t + ph[4])
            gx = 1.0 * np.sin(2 * np.pi * 0.06 * t + ph[5])
            gy = 1.1 * np.sin(2 * np.pi * 0.24 * t + ph[2] * 0.5)
            z = self.zarf[ad]
            if i < len(z):
                hizli = z[max(0, i - 2):i + 1].mean()
                yavas = z[max(0, i - 12):i + 1].mean()
                vurgu = np.clip((hizli - yavas) / (z.max() + 1e-6) * 6, 0, 1)
                ty += 2.4 * vurgu
                aci += 0.45 * vurgu * np.sin(ph[5] + 1.3 * t)
                # konuşurken karşıdakine doğru hafifçe eğilir
                konusma = np.clip(z[max(0, i - 20):i + 1].mean() / (z.max() + 1e-6) * 5, 0, 1)
                gx += 1.8 * konusma * yon_isareti
            bebek, hedef = self._bakis(ad, t)
            if hedef == "asagi":
                ty += 1.8
            for jest in self.yon.JESTLER:
                jt, ja, atak, tut, birak, jx, jy, jaci = jest[:8]
                jgx, jgy = (jest[8], jest[9]) if len(jest) > 8 else (0.0, 0.0)
                if ja == ad:
                    k = tumsek(t, jt, atak, tut, birak)
                    tx, ty, aci, gx, gy = tx + jx * k, ty + jy * k, aci + jaci * k, gx + jgx * k, gy + jgy * k
            h, w = self.agiz[ad]
            out[ad] = dict(tx=float(np.clip(tx, -4, 4)), ty=float(np.clip(ty, -4, 4)),
                           aci=float(np.clip(aci, -1.1, 1.1)), gx=float(np.clip(gx, -3.5, 3.5)),
                           gy=float(np.clip(gy, -3, 3)), bebek=bebek, kirpma=self._kirp(ad, t),
                           agiz=(float(h[i]), float(w[i])))
        return out


# ---------------------------------------------------------------- altyazı
def _bol(kelime, maks):
    """Kelimeleri önce noktalama yerlerinden, sonra dengeli uzunlukta parçalara böler."""
    uzun = lambda ks: len(" ".join(x[0] for x in ks))
    if uzun(kelime) <= maks:
        return [kelime]
    cumleler, cur = [], []
    for w in kelime:
        cur.append(w)
        if w[0][-1] in ".,!?":
            cumleler.append(cur)
            cur = []
    if cur:
        cumleler.append(cur)
    birlesik = []
    for c in cumleler:  # kısa cümleleri birleştir
        if birlesik and uzun(birlesik[-1] + c) <= maks:
            birlesik[-1] = birlesik[-1] + c
        else:
            birlesik.append(c)
    out = []
    for c in birlesik:
        if uzun(c) <= maks:
            out.append(c)
            continue
        n = int(np.ceil(uzun(c) / maks))
        hedef = uzun(c) / n
        cur = []
        for w in c:
            cur.append(w)
            if uzun(cur) >= hedef and len(out) < 99 and c.index(w) < len(c) - 1:
                out.append(cur)
                cur = []
        if cur:
            out.append(cur)
    temiz = []
    for c in out:  # tek başına kalan kısa parçaları öncekine kat
        if temiz and (uzun(c) < 10) and uzun(temiz[-1] + c) <= maks + 10:
            temiz[-1] = temiz[-1] + c
        else:
            temiz.append(c)
    if len(temiz) > 1 and uzun(temiz[0]) < 10:  # baştaki kısa parçayı sonrakine kat
        temiz[1] = temiz[0] + temiz[1]
        temiz.pop(0)
    return temiz


def altyazi_parcalari(b, maks=44):
    parcalar = []
    for r in b.replikler:
        for kel in _bol(r["kelime_zaman"], maks):
            parcalar.append([kel, r])
    out = []
    for i, (kel, r) in enumerate(parcalar):
        bas = kel[0][1] - 0.05
        if i + 1 < len(parcalar) and parcalar[i + 1][1] is r:
            son = parcalar[i + 1][0][0][1] - 0.05
        else:
            son = r["son"] + 0.15
        son = max(son, bas + 0.6)
        if i + 1 < len(parcalar):
            son = min(son, parcalar[i + 1][0][0][1] - 0.05)
        out.append((bas, son, " ".join(x[0] for x in kel)))
    return out


def altyazi_gorseli(metin, boyut=62, maks_gen=840):
    font = ImageFont.truetype(YAZI_TIPI, boyut)
    satirlar, cur = [], ""
    for w in metin.split():
        dene = (cur + " " + w).strip()
        if font.getlength(dene) <= maks_gen or not cur:
            cur = dene
        else:
            satirlar.append(cur)
            cur = w
    satirlar.append(cur)
    satir_h = int(boyut * 1.18)
    gen = int(max(font.getlength(s) for s in satirlar)) + 40
    yuk = satir_h * len(satirlar) + 30
    im = Image.new("RGBA", (gen, yuk), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    golge = Image.new("RGBA", im.size, (0, 0, 0, 0))
    dg = ImageDraw.Draw(golge)
    for k, s in enumerate(satirlar):
        x = (gen - font.getlength(s)) / 2
        y = 12 + k * satir_h
        dg.text((x, y + 4), s, font=font, fill=(0, 0, 0, 170), stroke_width=9, stroke_fill=(0, 0, 0, 170))
        d.text((x, y), s, font=font, fill=(255, 255, 255, 255), stroke_width=6, stroke_fill=(12, 8, 6, 255))
    golge = golge.filter(ImageFilter.GaussianBlur(6))
    return Image.alpha_composite(golge, im)


# ---------------------------------------------------------------- çizim
_SAHNE = None


def _isci_baslat(sahne_adi):
    global _SAHNE
    _SAHNE = Sahne(sahne_adi)


def _parca_ciz(args):
    perf_veri, altyazilar, bas, son, yol, alt_y = args
    durumlar = perf_veri
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "17",
                          "-pix_fmt", "yuv420p", "-g", str(FPS * 2), yol], stdin=subprocess.PIPE)
    gorseller = {}
    for i in range(bas, son):
        t = i / FPS
        k = _SAHNE.kare(t, durumlar[i - bas])
        for (ab, ason, metin) in altyazilar:
            if ab <= t < ason:
                if metin not in gorseller:
                    g = altyazi_gorseli(metin)
                    gorseller[metin] = (np.asarray(g).astype(np.float32) / 255.0, g.size)
                a, (gw, gh) = gorseller[metin]
                x0, y0 = (W - gw) // 2, alt_y - gh // 2
                parca = k[y0:y0 + gh, x0:x0 + gw]
                parca[:] = parca * (1 - a[..., 3:]) + a[..., :3] * 255 * a[..., 3:]
        p.stdin.write(k.astype(np.uint8).tobytes())
    p.stdin.close()
    p.wait()
    return yol


def uret(klasor, prototip=None):
    spec = importlib.util.spec_from_file_location("yonetim", f"{klasor}/yonetim.py")
    yon = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(yon)
    b = Bolum(klasor, tempo=yon.TEMPO, maks_sessizlik=yon.MAKS_SESSIZLIK)
    b.zamanla(giris=yon.GIRIS, ara=yon.ARA, ozel_ara=yon.OZEL_ARA, kapanis=yon.KAPANIS)
    yon.hazirla(b)
    cikti = f"{klasor}/cikti"
    os.makedirs(cikti, exist_ok=True)
    zarflar = ses_montaji(b, yon, cikti)
    sahne_adi = getattr(yon, "SAHNE", "ana_sahne")
    sahne = Sahne(sahne_adi)
    perf = Performans(b, yon, sahne, zarflar)
    n = perf.n if prototip is None else int(prototip * FPS)
    durumlar = [perf.durum(i) for i in range(n)]
    altyazilar = sorted(altyazi_parcalari(b) + list(getattr(yon, "EK_ALTYAZI", [])))
    json.dump(dict(sure=b.sure, replikler=[dict(id=r["id"], karakter=r["karakter"], bas=round(r["bas"], 3),
                                                  son=round(r["son"], 3)) for r in b.replikler],
                   altyazi=[(round(a, 3), round(c, 3), m) for a, c, m in altyazilar]),
              open(f"{cikti}/zaman_cizelgesi.json", "w"), ensure_ascii=False, indent=1)
    isci = 4
    sinirlar = np.linspace(0, n, isci + 1).astype(int)
    isler = [(durumlar[sinirlar[k]:sinirlar[k + 1]], altyazilar, int(sinirlar[k]), int(sinirlar[k + 1]),
              f"{cikti}/_parca{k}.mp4", yon.ALTYAZI_Y) for k in range(isci)]
    with ProcessPoolExecutor(isci, initializer=_isci_baslat, initargs=(sahne_adi,)) as ex:
        parcalar = list(ex.map(_parca_ciz, isler))
    with open(f"{cikti}/_liste.txt", "w") as f:
        f.writelines(f"file '{os.path.abspath(p)}'\n" for p in parcalar)
    ad = "prototip_10sn.mp4" if prototip else "bolum.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{cikti}/_liste.txt",
                    "-i", f"{cikti}/karisim.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac",
                    "-b:a", "192k", "-t", f"{n / FPS:.3f}", "-movflags", "+faststart", f"{cikti}/{ad}"], check=True)
    for p in parcalar:
        os.remove(p)
    os.remove(f"{cikti}/_liste.txt")
    print(f"{cikti}/{ad}", f"{n / FPS:.2f} sn")
    return b, perf


if __name__ == "__main__":
    k = sys.argv[1]
    pr = float(sys.argv[sys.argv.index("--prototip") + 1]) if "--prototip" in sys.argv else None
    uret(k, pr)
