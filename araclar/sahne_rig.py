"""Aspiratör Işığı sahnesinin animasyon rig'i.

Referans görsel (referans/ana_sahne.png) hiç yeniden çizilmez. Her kare, görselin
kendisinden üretilir:
  - göz: göz akı alanı aynı renkle yeniden boyanır, göz bebeği kaydırılır, göz kırpma için
    göz kapağı (cilt rengi + kapak çizgisi) çizilir
  - ağız: kapalı dudak orijinal kalır; konuşurken üstüne açık ağız şekli çizilir
  - baş: yüz bölgesi katı (deforme olmadan) birkaç piksel kaydırılır/döndürülür; geçiş
    bölgesi yumuşak bir alanda saç/omuz kenarına dağıtılır
  - ortam: çaydanlık ve bardak buharı, aspiratör ışığında çok hafif nefes alma
Koordinatlar 1080x1920 çözünürlüğe göredir.
"""
import hashlib
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1080, 1920
SS = 4  # küçük çizimler için süper örnekleme

# --- Sabit sahne ölçüleri (ana_sahne.png -> 1080x1920) ---
GOZ_KUTULARI = {
    "ipek": [(255, 850, 350, 905), (370, 820, 440, 880)],
    "derya": [(715, 835, 790, 895), (805, 870, 890, 925)],
}
AGIZ_KUTULARI = {"ipek": (350, 915, 415, 955), "derya": (735, 935, 800, 975)}
# baş bölgesi: (merkez x, y, iç yarıçap x, y, dönme pivotu x, y)
BAS = {
    "ipek": dict(c=(290, 790), r=(205, 245), pivot=(345, 1010)),
    "derya": dict(c=(812, 800), r=(205, 245), pivot=(800, 1030)),
}
YUMUSAK_KAT = 1.38  # iç elipsten bu katsayıya kadar yumuşak geçiş
# karakter silüetleri (baş, saç, omuzlar; masadaki kollar sabit kaldığı için kaba kapatılır)
SILUET = {
    "ipek": [(45, 1060), (50, 1020), (60, 990), (78, 965), (100, 950), (104, 920), (100, 890), (98, 860),
             (100, 830), (106, 800), (104, 770), (100, 745), (92, 720), (86, 695), (88, 670), (92, 648),
             (100, 630), (112, 612), (128, 598), (140, 590), (148, 578), (162, 568), (185, 563), (210, 563),
             (232, 567), (250, 575), (264, 588), (280, 605), (290, 625), (300, 640), (330, 648), (355, 656),
             (375, 668), (392, 684), (405, 700), (418, 718), (430, 738), (440, 758), (450, 780), (460, 805),
             (468, 830), (478, 850), (480, 880), (475, 910), (472, 940), (462, 962), (480, 985), (494, 1010),
             (500, 1035), (505, 1060), (515, 1090), (540, 1130), (550, 1260), (0, 1260), (0, 1130), (15, 1110),
             (30, 1085)],
    "derya": [(570, 1260), (580, 1100), (590, 1070), (600, 1040), (618, 1000), (632, 960), (628, 920),
              (630, 880), (642, 852), (652, 838), (680, 810), (710, 772), (745, 732), (780, 697), (815, 682),
              (832, 652), (840, 630), (860, 614), (872, 600), (885, 588), (910, 579), (940, 579), (975, 586),
              (1000, 590), (1025, 615), (1042, 640), (1050, 680), (1052, 710), (1055, 770), (1054, 800), (1052, 850), (1048, 900), (1050, 950), (1058, 1000),
              (1068, 1040), (1080, 1070), (1080, 1260)],
}
CAYDANLIK_BUHAR = [(519, 612), (571, 596)]
BARDAK_BUHAR = [(419, 1188), (935, 1244)]
ASPIRATOR_ISIK = (654, 372)


def _hull(pts):
    pts = sorted(set(map(tuple, pts)))
    if len(pts) < 3:
        return pts
    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def _yumusak_maske(poligon, ox, oy, w, h):
    """Poligonu süper örneklemeyle kenarları yumuşak bir alfa maskesine çevirir."""
    im = Image.new("L", (w * SS, h * SS), 0)
    ImageDraw.Draw(im).polygon([((x - ox + 0.5) * SS, (y - oy + 0.5) * SS) for x, y in poligon], fill=255)
    return np.asarray(im.resize((w, h), Image.BOX)).astype(np.float32) / 255.0


class Goz:
    def __init__(self, base, kutu):
        x0, y0, x1, y1 = kutu
        sub = base[y0:y1, x0:x1].astype(np.int32)
        beyaz = (sub[..., 1] > 160) & (sub[..., 2] > 120) & (sub[..., 0] > 200)
        ys, xs = np.nonzero(beyaz)
        poligon = [(x + x0, y + y0) for x, y in _hull(np.stack([xs, ys], 1))]
        self.ox, self.oy = x0, y0
        self.w, self.h = x1 - x0, y1 - y0
        self.alfa = _yumusak_maske(poligon, x0, y0, self.w, self.h)
        ic = self.alfa > 0.5
        # göz akı rengi: satır bazında orijinal beyaz piksellerin ortalaması
        renk = np.zeros((self.h, 3), np.float32)
        genel = sub[beyaz].mean(0)
        for y in range(self.h):
            m = beyaz[y]
            renk[y] = sub[y][m].mean(0) if m.sum() >= 3 else genel
        self.ak = np.repeat(renk[:, None, :], self.w, 1)
        # göz bebeği: kapağın altında kısmen gizli olduğu için iç alandaki koyu piksellere
        # en iyi oturan çember aranır (merkez kapağın üstünde de olabilir)
        koyu = (ic & (sub.sum(2) < 200)).astype(np.float32)
        py, px = np.nonzero(koyu)
        yy, xx = np.mgrid[0:self.h, 0:self.w].astype(np.float32)
        en_iyi = (-1, 0, 0, 0)
        for r in np.arange(7, 16, 0.5):
            for cy in np.arange(py.min() - r, py.max() + 1, 0.5):
                for cx in np.arange(px.min() - 2, px.max() + 3, 0.5):
                    daire = (((xx - cx) ** 2 + (yy - cy) ** 2) <= r * r) & ic
                    kesisim = (daire * koyu).sum()
                    iou = kesisim / (daire.sum() + koyu.sum() - kesisim + 1e-6)
                    if iou > en_iyi[0]:
                        en_iyi = (iou, cx, cy, r)
        self.bebek = (en_iyi[1] + x0, en_iyi[2] + y0)
        self.bebek_r = float(en_iyi[3])
        self.bebek_uyum = float(en_iyi[0])
        # kapak için sütun bazında iç alanın üst/alt sınırı (pürüzsüz eğri)
        sutun = ic.any(0)
        xs_s = np.nonzero(sutun)[0]
        ust_ham = ic.argmax(0)[xs_s].astype(np.float32)
        alt_ham = (self.h - 1 - ic[::-1].argmax(0))[xs_s].astype(np.float32)
        xi = np.arange(self.w, dtype=np.float32)
        self.ust = np.polyval(np.polyfit(xs_s, ust_ham, 4), xi).astype(np.float32)
        self.alt = np.polyval(np.polyfit(xs_s, alt_ham, 4), xi).astype(np.float32)
        self.sutun = sutun.astype(np.float32)
        # üst kapak çizgisi kalınlığı: iç alanın hemen üstündeki koyu bant
        kalin = []
        for x in xs_s:
            y = int(ust_ham[list(xs_s).index(x)]) - 1
            n = 0
            while y - n >= 0 and sub[y - n, x].sum() < 300 and n < 14:
                n += 1
            kalin.append(n)
        self.kalinlik = float(np.clip(np.median(kalin), 3, 9))
        # kapak cildi: üst kapak çizgisinin üstündeki cilt
        cilt = []
        for x in xs_s[len(xs_s) // 4: 3 * len(xs_s) // 4]:
            y = int(self.ust[x] - self.kalinlik - 5)
            if y >= 0:
                p = base[y0 + y - 3:y0 + y + 1, x0 + x].astype(np.float32)
                cilt.extend([q for q in p if q.sum() > 300])
        if not cilt:
            raise ValueError(f"göz kutusu {kutu}: kapak cildi örneklenemedi")
        self.cilt = np.median(np.array(cilt), 0).astype(np.float32)
        ic_y, ic_x = np.nonzero(ic)
        self.merkez = (ic_x.mean() + x0, ic_y.mean() + y0)

    def ciz(self, kare, bebek_dx=0.0, bebek_dy=0.0, kirpma=0.0):
        """kare: float32 HxWx3 (yerinde değişir). kirpma 0=açık, 1=kapalı."""
        y0, x0, h, w = self.oy, self.ox, self.h, self.w
        parca = kare[y0:y0 + h, x0:x0 + w]
        a = self.alfa[..., None]
        # göz akını temizle ve göz bebeğini yeni konumuna çiz
        yeni = self.ak.copy()
        bx, by = self.bebek[0] + bebek_dx - x0, self.bebek[1] + bebek_dy - y0
        im = Image.new("L", (w * SS, h * SS), 0)
        r = self.bebek_r
        ImageDraw.Draw(im).ellipse(((bx - r + .5) * SS, (by - r + .5) * SS, (bx + r + .5) * SS, (by + r + .5) * SS), fill=255)
        b_alfa = (np.asarray(im.resize((w, h), Image.BOX)).astype(np.float32) / 255.0)[..., None]
        yeni = yeni * (1 - b_alfa) + np.array([16, 10, 8], np.float32) * b_alfa
        parca[:] = parca * (1 - a) + yeni * a
        if kirpma > 0.02:
            # üst kapak (kalın siyah çizgisiyle birlikte) aşağı iner
            yy = np.arange(h, dtype=np.float32)[:, None]
            T = max(self.kalinlik, 4.5)
            ust = self.ust[None, :]
            alt = self.alt[None, :] + 0.5
            kapak = ust + kirpma * (alt - ust)          # kapak çizgisinin alt kenarı
            sut = self.sutun[None, :]
            # orijinal kalın çizgi + kapağın altında kalan göz alanı cilt rengine boyanır
            ortu = np.clip(kapak - yy + 0.5, 0, 1) * np.clip(yy - (ust - T - 3.5) + 0.5, 0, 1) * sut
            parca[:] = parca * (1 - ortu[..., None]) + self.cilt * ortu[..., None]
            # kalın kapak çizgisi yeni konumunda
            cizgi = np.clip(kapak - yy + 0.5, 0, 1) * np.clip(yy - (kapak - T) + 0.5, 0, 1) * sut
            parca[:] = parca * (1 - cizgi[..., None]) + np.array([16, 10, 8], np.float32) * cizgi[..., None]


class Agiz:
    def __init__(self, base, kutu):
        x0, y0, x1, y1 = kutu
        sub = base[y0:y1, x0:x1].astype(np.float32)
        dudaklik = sub[..., 2] - 0.6 * sub[..., 1]
        esik = np.median(dudaklik) + 6
        ys, xs = np.nonzero(dudaklik > esik)
        xs, ys = xs + x0, ys + y0
        self.merkez = (xs.mean(), ys.mean())
        # dudak çizgisinin açısı (en küçük kareler)
        egim = np.polyfit(xs, ys, 1)[0]
        self.aci = float(np.degrees(np.arctan(egim)))
        self.genislik = float(np.hypot(xs.max() - xs.min(), (xs.max() - xs.min()) * egim))
        dudak = sub[dudaklik > esik]
        self.dudak = dudak[np.argsort(dudak.sum(1))[len(dudak) // 3]]  # orta tonlu dudak rengi

    def ciz(self, kare, acik, en=1.0):
        """acik: piksel cinsinden ağız açıklığı; en: genişlik çarpanı (o/u için dar)."""
        if acik < 1.2:
            return
        gen = self.genislik * 0.78 * en
        P = int(max(gen, acik * 2) + 16)
        im = Image.new("RGBA", (P * SS, P * SS), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        c = P * SS / 2
        u = np.linspace(-1, 1, 40)
        yuv = np.power(1 - u ** 2, 0.55 if en < 0.85 else 0.85)
        ust = [(c + x * gen / 2 * SS, c - acik * 0.30 * k * SS) for x, k in zip(u, yuv)]
        alt = [(c + x * gen / 2 * SS, c + acik * 0.70 * k * SS) for x, k in zip(u[::-1], yuv[::-1])]
        sekil = ust + alt
        dudak = tuple(int(v) for v in self.dudak)
        koyu = (int(self.dudak[0] * 0.55), int(self.dudak[1] * 0.45), int(self.dudak[2] * 0.45), 255)
        d.polygon(sekil, fill=(58, 18, 22, 255))
        maske = Image.new("L", im.size, 0)
        ImageDraw.Draw(maske).polygon(sekil, fill=255)
        ic = Image.new("RGBA", im.size, (0, 0, 0, 0))
        di = ImageDraw.Draw(ic)
        # dil
        di.ellipse((c - gen * 0.32 * SS, c + acik * 0.25 * SS, c + gen * 0.32 * SS, c + acik * 1.1 * SS), fill=(178, 78, 82, 255))
        # üst dişler
        if acik > 7:
            di.rectangle((c - gen * 0.5 * SS, c - acik * 0.4 * SS, c + gen * 0.5 * SS, c - acik * 0.30 * SS + min(3.2, acik * 0.22) * SS), fill=(244, 236, 226, 255))
        im.paste(ic, (0, 0), Image.composite(ic, Image.new("RGBA", im.size), maske).split()[3])
        d.line(sekil + [sekil[0]], fill=koyu, width=int(1.6 * SS), joint="curve")
        # alt dudak dolgunluğu
        alt_dudak = [(c + x * gen / 2 * 0.8 * SS, c + (acik * 0.70 * k + 1.6) * SS) for x, k in zip(u, yuv)]
        d.line(alt_dudak, fill=dudak + (200,), width=int(2.2 * SS), joint="curve")
        im = im.rotate(-self.aci, resample=Image.BICUBIC, center=(c, c)).resize((P, P), Image.LANCZOS)
        a = np.asarray(im).astype(np.float32) / 255.0
        x0 = int(round(self.merkez[0] - P / 2)); y0 = int(round(self.merkez[1] - P / 2 + acik * 0.18))
        parca = kare[y0:y0 + P, x0:x0 + P]
        parca[:] = parca * (1 - a[..., 3:]) + a[..., :3] * 255.0 * a[..., 3:]


GOVDE_Y = (1000, 1170)  # bu y'nin üstü gövdeyle birlikte tam hareket eder, altı (masa/kollar) sabit


class KarakterKatmani:
    """Karakteri silüet maskesiyle ayrı bir katman olarak hareket ettirir; arka plan hiç oynamaz.

    Baş (saç, yüz, yanaktaki el) pivot etrafında kaydırılıp döndürülür; gövde (omuzlar) eğilip nefes
    alır. Hareket masaya doğru sıfıra iner. Açılan boşluklar arka plan plakasından gelir.
    """

    def __init__(self, ad):
        b = BAS[ad]
        self.cx, self.cy = b["c"]
        self.rx, self.ry = b["r"]
        self.px, self.py = b["pivot"]
        xs, ys = zip(*SILUET[ad])
        self.x0, self.x1 = max(0, min(xs) - 24), min(W, max(xs) + 25)
        self.y0, self.y1 = max(0, min(ys) - 24), min(H, max(ys) + 1)
        yy, xx = np.mgrid[self.y0:self.y1, self.x0:self.x1].astype(np.float32)
        e = np.sqrt(((xx - self.cx) / self.rx) ** 2 + ((yy - self.cy) / self.ry) ** 2)
        s = np.clip((YUMUSAK_KAT - e) / (YUMUSAK_KAT - 1), 0, 1)
        self.w_bas = s * s * (3 - 2 * s)
        g = np.clip((GOVDE_Y[1] - yy) / (GOVDE_Y[1] - GOVDE_Y[0]), 0, 1)
        self.w_govde = g * g * (3 - 2 * g)
        self.xx, self.yy = xx, yy
        im = Image.new("L", (W * 2, H * 2), 0)
        ImageDraw.Draw(im).polygon([(x * 2, y * 2) for x, y in SILUET[ad]], fill=255)
        self.maske = np.asarray(im.resize((W, H), Image.BOX).filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32) / 255.0
        # hareket edebilen bölge (plaka sadece burada doldurulur)
        self.hareketli = np.zeros((H, W), bool)
        self.hareketli[self.y0:self.y1, self.x0:self.x1] = np.maximum(self.w_bas, self.w_govde) > 0.003

    def uygula(self, kaynak, cikti, tx, ty, aci, gx, gy):
        t = np.radians(aci)
        c, s = np.cos(t), np.sin(t)
        dx, dy = self.xx - self.px - gx - tx, self.yy - self.py - gy - ty
        # başın ters eşlemesi (gövde kayması da dahil)
        bx = self.px + c * dx + s * dy
        by = self.py - s * dx + c * dy
        gx_k, gy_k = self.xx - gx, self.yy - gy  # sadece gövde
        wg, wb = self.w_govde, self.w_bas
        # kaynak = nokta + gövde kayması + (başın gövdeye göre hareketi)
        sx = self.xx + wg * (gx_k - self.xx) + wb * (bx - gx_k)
        sy = self.yy + wg * (gy_k - self.yy) + wb * (by - gy_k)
        renk = _bilinear(kaynak, sx, sy)
        a = _bilinear(self.maske[..., None], sx, sy)
        p = cikti[self.y0:self.y1, self.x0:self.x1]
        p[:] = renk * a + p * (1 - a)


def arka_plan_plakasi(base, katmanlar, derinlik=34):
    """Karakterlerin arkasını, dışarıdaki arka plandan içeri doğru katman katman doldurur."""
    bolge = np.zeros(base.shape[:2], bool)
    for k in katmanlar:
        bolge |= (k.maske > 0.02) & k.hareketli
    ys, xs = np.nonzero(bolge)
    y0, y1, x0, x1 = max(0, ys.min() - 2), min(H, ys.max() + 3), max(0, xs.min() - 2), min(W, xs.max() + 3)
    V = base[y0:y1, x0:x1].copy()
    R = bolge[y0:y1, x0:x1]
    K = ~R
    for _ in range(derinlik):
        Kf = K.astype(np.float32)
        Vp = np.pad(V * Kf[..., None], ((1, 1), (1, 1), (0, 0)))
        Kp = np.pad(Kf, 1)
        S = np.zeros_like(V); C = np.zeros_like(Kf)
        for oy in (0, 1, 2):
            for ox in (0, 1, 2):
                if oy == 1 and ox == 1:
                    continue
                S += Vp[oy:oy + V.shape[0], ox:ox + V.shape[1]]
                C += Kp[oy:oy + V.shape[0], ox:ox + V.shape[1]]
        yeni = (C > 0) & ~K
        V[yeni] = S[yeni] / C[yeni][:, None]
        K = K | yeni
    # doldurulan şeritlerdeki çizgilenmeyi hafifçe yumuşat
    dolu = R & K
    yum = np.asarray(Image.fromarray(np.clip(V, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))).astype(np.float32)
    V[dolu] = yum[dolu]
    plaka = base.copy()
    plaka[y0:y1, x0:x1] = V
    return plaka


def _bilinear(img, sx, sy):
    sx = np.clip(sx, 0, W - 1.001); sy = np.clip(sy, 0, H - 1.001)
    x0 = sx.astype(np.int32); y0 = sy.astype(np.int32)
    fx = (sx - x0)[..., None]; fy = (sy - y0)[..., None]
    a = img[y0, x0]; b = img[y0, x0 + 1]; c = img[y0 + 1, x0]; d = img[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


class Buhar:
    """Zamana bağlı, tekrar üretilebilir yumuşak buhar parçacıkları."""

    def __init__(self, kaynaklar, aralik, omur, yukselme, alfa, r0, r1, tohum):
        rng = np.random.default_rng(tohum)
        self.parcaciklar = []
        for k, (x, y) in enumerate(kaynaklar):
            t = -omur
            while t < 200:
                self.parcaciklar.append((t, x + rng.normal(0, 1.5), y, rng.uniform(0.6, 1.4), rng.uniform(0, 6.28), rng.uniform(0.7, 1.2)))
                t += aralik * rng.uniform(0.6, 1.4)
        self.omur, self.yukselme, self.alfa, self.r0, self.r1 = omur, yukselme, alfa, r0, r1
        self._sprite = {}

    def _spr(self, r):
        r = int(round(r))
        if r not in self._sprite:
            yy, xx = np.mgrid[-2 * r:2 * r + 1, -2 * r:2 * r + 1]
            self._sprite[r] = np.exp(-(xx ** 2) / (2 * (r * 0.55) ** 2) - (yy ** 2) / (2 * (r * 0.95) ** 2)).astype(np.float32)
        return self._sprite[r]

    def ciz(self, kare, t):
        for t0, x, y, hiz, faz, guc in self.parcaciklar:
            a = t - t0
            if a < 0 or a > self.omur:
                continue
            f = a / self.omur
            px = x + np.sin(faz + a * 1.7) * 6 * f + 10 * f * np.sin(faz)
            py = y - self.yukselme * hiz * a
            r = self.r0 + (self.r1 - self.r0) * f
            al = self.alfa * guc * np.sin(np.pi * f) ** 1.3
            s = self._spr(r) * al
            n = s.shape[0] // 2
            xi, yi = int(px), int(py)
            ya, yb, xa, xb = yi - n, yi + n + 1, xi - n, xi + n + 1
            if ya < 0 or xa < 0 or yb > H or xb > W:
                continue
            p = kare[ya:yb, xa:xb]
            p[:] = p * (1 - s[..., None]) + np.array([255, 246, 232], np.float32) * s[..., None]


class Sahne:
    def __init__(self):
        img = Image.open(f"{KOK}/referans/ana_sahne.png").convert("RGB").resize((W, H), Image.LANCZOS)
        self.base = np.asarray(img).astype(np.float32)
        b8 = np.asarray(img)
        self.gozler = {k: [Goz(b8, kt) for kt in v] for k, v in GOZ_KUTULARI.items()}
        self.agizlar = {k: Agiz(b8, v) for k, v in AGIZ_KUTULARI.items()}
        self.katmanlar = {k: KarakterKatmani(k) for k in SILUET}
        anahtar = hashlib.md5(repr(SILUET).encode()).hexdigest()[:10]
        onbellek = f"{KOK}/referans/.plaka_{anahtar}.npy"
        if os.path.exists(onbellek):
            self.plaka = np.load(onbellek)
        else:
            self.plaka = arka_plan_plakasi(self.base, self.katmanlar.values())
            np.save(onbellek, self.plaka)
        self.caydanlik = Buhar(CAYDANLIK_BUHAR, 0.16, 3.2, 36, 0.30, 5, 17, 1)
        self.bardak = Buhar(BARDAK_BUHAR, 0.3, 2.4, 24, 0.22, 4, 12, 2)
        # aspiratör ışığı için radyal ağırlık
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        d = np.sqrt((xx - ASPIRATOR_ISIK[0]) ** 2 + ((yy - ASPIRATOR_ISIK[1]) * 1.3) ** 2)
        self.isik = np.clip(1 - d / 420, 0, 1) ** 2
        ys, xs = np.nonzero(self.isik > 0.001)
        self.isik_kutu = (ys.min(), ys.max() + 1, xs.min(), xs.max() + 1)

    def kare(self, t, durum):
        """durum[karakter] = dict(tx, ty, aci, gx, gy, bebek=[(dx,dy)...], kirpma, agiz=(acik, en))"""
        k = self.base.copy()
        for ad, d in durum.items():
            bebek = d["bebek"]
            if not isinstance(bebek[0], (tuple, list)):  # tek ofset -> iki göze aynı
                bebek = [bebek] * len(self.gozler[ad])
            for g, (bx, by) in zip(self.gozler[ad], bebek):
                g.ciz(k, bx, by, d["kirpma"])
            self.agizlar[ad].ciz(k, *d["agiz"])
        cikti = self.plaka.copy()
        for ad, d in durum.items():
            self.katmanlar[ad].uygula(k, cikti, d["tx"], d["ty"], d["aci"], d.get("gx", 0.0), d.get("gy", 0.0))
        y0, y1, x0, x1 = self.isik_kutu
        kazanc = 1 + 0.018 * np.sin(2 * np.pi * 0.31 * t) + 0.006 * np.sin(2 * np.pi * 1.7 * t)
        cikti[y0:y1, x0:x1] *= (1 + (kazanc - 1) * self.isik[y0:y1, x0:x1])[..., None]
        self.caydanlik.ciz(cikti, t)
        self.bardak.ciz(cikti, t)
        return np.clip(cikti, 0, 255)
