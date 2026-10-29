"""Bölüm 1 — Ben Çok mu Çirkinim? yönetim dosyası.

Zamanlar, seslendirmedeki gerçek kelime zamanlarına bağlıdır (b.kelime / b.r).
Bakış hedefleri: orijinal (referans görseldeki bakış: karşılıklı yan bakış), asagi (masaya /
telefona), merkez (kameraya), yukari (göz devirme).
Jest: (zaman, karakter, atak, tut, bırak, baş x, baş y, baş açı, gövde x, gövde y).
"""

GIRIS = 2.0                      # diyalog öncesi sessiz giriş
ARA = 0.2                        # replikler arası varsayılan boşluk (sohbet temposu)
OZEL_ARA = {"02": 0.25,          # Derya'nın üşengeç "Hıh"ı
            "10": 0.75,          # ceket sorusundan sonra yakalanma duraksaması
            "11": 0.3}
KAPANIS = 1.6                    # son replikten sonra bakışma, sonra kesme
TEMPO = {"ipek": 1.12, "derya": 1.28}   # perdeyi değiştirmeden hızlandırma
MAKS_SESSIZLIK = 0.35            # replik içi en uzun duraksama

PAN = {"ipek": -0.2, "derya": 0.2}   # İpek solda, Derya sağda
AGIZ_MAX = {"ipek": 12.0, "derya": 13.0}
ALTYAZI_Y = 1440
ORTAM = ["ortam_a.mp3", "ortam_b.mp3"]
ORTAM_DB = -34

BAKISLAR, JESTLER, OZEL_KIRPMA, EFEKTLER = [], [], [], []


def hazirla(b):
    r = b.r
    k = b.kelime
    BAKISLAR[:] = [
        # --- giriş
        (0.00, "ipek", "orijinal"), (0.85, "ipek", "asagi"),        # İpek telefonuna döner
        (0.00, "derya", "asagi"),                                    # Derya cipse bakar
        (2.30, "derya", "orijinal"), (3.50, "derya", "asagi"),      # İpek konuşunca kısa bir bakış
        # --- 03 "çok mu çirkinim?" -> Derya bakar
        (k("03", "çok") - 0.1, "derya", "orijinal"),
        # --- 04 "Allah aşkına!" göz devirme
        (k("04", "Allah"), "derya", "yukari"), (k("04", "aşkına") + 0.45, "derya", "orijinal"),
        # --- 05 "burnu yok resmen!" İpek başını kaldırıp bakar, sonra telefona döner
        (k("05", "Ya") - 0.12, "ipek", "orijinal"), (r("05")["son"] + 0.5, "ipek", "asagi"),
        # --- 06 "Ne yapalım..." Derya kameraya
        (k("06", "Ne") - 0.25, "derya", "merkez"), (r("06")["son"] + 0.1, "derya", "orijinal"),
        # --- 07 alınır, sonra yine telefona
        (k("07", "Dalga") - 0.15, "ipek", "orijinal"), (k("07", "Kızın") - 0.1, "ipek", "asagi"),
        # --- 08 "şu telefonu bırak" -> İpek başını kaldırır, sonuna kadar bakar
        (k("08", "telefonu"), "ipek", "orijinal"),
        # --- 09 ceket sorusu: Derya gözünü kaçırır, 10'da kendinden emin geri döner
        (k("09", "istemedin"), "derya", "asagi"), (r("10")["bas"] - 0.1, "derya", "orijinal"),
    ]
    # (zaman, karakter, atak, tut, bırak, baş x, baş y, baş açı, gövde x, gövde y)
    JESTLER[:] = [
        # İpek
        (0.6, "ipek", 0.4, 0.8, 0.5, 0.0, 1.5, -0.4, 0.0, 1.0),                        # telefona eğilir
        (k("05", "Ya") - 0.15, "ipek", 0.2, r("05")["sure"] - 0.2, 0.35, 0.8, -3.5, 0.7, 2.0, -1.0),
        (k("07", "Dalga") - 0.1, "ipek", 0.12, 0.5, 0.4, -2.0, -2.0, -0.9, -1.5, -1.5),  # alınır, geri çekilir
        (r("08")["bas"] + 1.0, "ipek", 0.6, 2.5, 0.6, 0.0, 0.0, -0.6, 0.0, 0.8),
        (k("08", "telefonu"), "ipek", 0.25, 0.6, 0.5, 0.0, -2.0, 0.0, -1.0, -1.0),         # başını kaldırır
        (r("09")["bas"] - 0.1, "ipek", 0.35, r("09")["sure"], 0.5, 1.2, -1.5, 0.9, 2.5, -1.0),
        (r("11")["bas"], "ipek", 0.3, r("11")["sure"] + KAPANIS, 0.3, 1.2, -1.5, 1.0, 1.5, -1.5),
        # Derya
        (k("04", "Allah") - 0.05, "derya", 0.25, 0.4, 0.4, 0.8, -3.0, -0.8, 1.5, -1.0),   # başını geri atar
        (k("06", "Ne") - 0.25, "derya", 0.25, r("06")["son"] - k("06", "Ne"), 0.3, 1.5, 0.0, 0.5, 1.0, 0.0),
        (k("08", "bırak"), "derya", 0.1, 0.08, 0.25, 0.0, 3.0, 0.0, -1.0, 1.0),
        (k("08", "Resmen") - 0.1, "derya", 0.25, 1.4, 0.4, 0.0, 0.0, 0.0, -2.5, 0.0),     # vurgu için öne eğilir
        (k("08", "Resmen"), "derya", 0.1, 0.08, 0.22, 0.0, 3.5, 0.5, 0.0, 1.0),
        (k("08", "yönetiliyorsunuz"), "derya", 0.1, 0.1, 0.25, 0.0, 3.5, -0.5, 0.0, 1.0),
        (k("08", "yönetiliyorsunuz") + 0.55, "derya", 0.1, 0.1, 0.3, 0.0, 3.0, 0.4, 0.0, 0.8),
        (k("09", "istemedin"), "derya", 0.2, r("10")["bas"] - k("09", "istemedin"), 0.2, 0.0, 2.0, 0.0, 1.0, 2.0),  # büzülür
        (r("10")["bas"] - 0.05, "derya", 0.25, r("10")["sure"], 0.4, 0.0, -3.5, 0.9, 0.0, -2.5),  # dikleşir
        (r("11")["son"] + 0.15, "derya", 0.4, 3.0, 0.1, -2.0, 0.0, -0.8, -1.5, 0.0),     # son bakışma
    ]
    OZEL_KIRPMA[:] = [
        (r("11")["son"] + 0.55, "derya", 0.42),   # son bakışmada yavaş, manalı göz kırpma
    ]
    # (zaman, dosya, tepe dB, pan) — sadece girişte, diyaloğu bastırmayacak seviyede
    EFEKTLER[:] = [
        (0.30, "cips_poset.mp3", -17, 0.35),
        (0.95, "cips.mp3", -14, 0.30),
        (1.25, "yudum.mp3", -19, -0.30),
        (1.75, "bardak.mp3", -17, -0.30),
    ]
