"""Bölüm 2 — Herkes Bir Şeyler Yapıyor yönetim dosyası.

Sahne: referans/bolum02_sahne.png (İpek cips paketinde, Derya telefonda).
Bakış: orijinal (karşılıklı yan bakış), asagi (Derya: telefona / İpek: masaya), merkez (kameraya),
yukari (düşünme / göz devirme).
Jest: (zaman, karakter, atak, tut, bırak, baş x, baş y, baş açı, gövde x, gövde y).
"""

SAHNE = "bolum02"
GIRIS = 2.0
ARA = 0.2
OZEL_ARA = {"10": 1.6}           # Derya'nın "…" sessizliği
KAPANIS = 1.4
TEMPO = {"ipek": 1.12, "derya": 1.28}
MAKS_SESSIZLIK = 0.35

PAN = {"ipek": -0.2, "derya": 0.2}
AGIZ_MAX = {"ipek": 11.0, "derya": 10.0}
ALTYAZI_Y = 1440
ORTAM = ["ortam_a.mp3", "ortam_b.mp3"]
ORTAM_DB = -34

BAKISLAR, JESTLER, OZEL_KIRPMA, EFEKTLER, EK_ALTYAZI = [], [], [], [], []


def hazirla(b):
    r = b.r
    k = b.kelime
    var_zamanlari = [s for w, s, e in r("01")["kelime_zaman"] if w.lower().startswith("var")]
    sessizlik = (r("09")["son"], r("10")["bas"])

    BAKISLAR[:] = [
        (0.00, "ipek", "orijinal"),
        (0.00, "derya", "asagi"),                                   # Derya telefonda
        # 01 İpek sayarken düşünür
        (k("01", "Arkadaş") - 0.1, "ipek", "yukari"), (k("01", "üniversiteye"), "ipek", "orijinal"),
        # 02 Derya telefondan başını kaldırmadan konuşur, "Yatağını"da bakar
        (k("02", "Yatağını") - 0.1, "derya", "orijinal"), (r("03")["bas"] + 0.6, "derya", "asagi"),
        # 04 "İpek..." telefondan kafayı kaldırır
        (r("04")["bas"] - 0.05, "derya", "orijinal"),
        # 06 Derya kameraya
        (k("06", "4") - 0.1, "derya", "merkez"), (r("06")["son"] + 0.3, "derya", "asagi"),
        # 07 İpek hayallere dalar, "planladım"da gururla bakar
        (k("07", "Ben") - 0.1, "ipek", "yukari"), (k("07", "Bunların") - 0.1, "ipek", "orijinal"),
        # 08 Derya şüpheyle bakar
        (r("08")["bas"] - 0.1, "derya", "orijinal"),
        # 09 İpek utançla gözünü kaçırır
        (k("09", "Üstüne") - 0.15, "ipek", "asagi"),
        # sessizlik: Derya önce İpek'e, sonra kameraya bakar
        (sessizlik[0] + 0.75, "derya", "merkez"),
        # 10 İpek birden toparlanır; Derya pes edip telefona döner
        (r("10")["bas"] - 0.08, "ipek", "orijinal"),
        (r("10")["bas"] + 0.3, "derya", "orijinal"), (r("10")["son"] + 0.35, "derya", "asagi"),
    ]
    JESTLER[:] = [
        # İpek: her "var"da küçük baş sallama
        *[(t - 0.05, "ipek", 0.1, 0.1, 0.25, 1.5 * (-1) ** i, 1.5, 0.4 * (-1) ** i, 0.0, 0.0)
          for i, t in enumerate(var_zamanlari)],
        (k("01", "Arkadaş") - 0.2, "ipek", 0.4, k("01", "üniversiteye") - k("01", "Arkadaş"), 0.4,
         0.0, -1.5, 0.8, 0.0, -0.8),                                                    # düşünürken baş yukarı
        (r("03")["bas"] - 0.05, "ipek", 0.15, 0.6, 0.4, -2.0, -2.0, -0.8, -1.5, -1.5),  # alınır
        (k("03", "Ben") - 0.05, "ipek", 0.2, 1.2, 0.4, 0.0, -2.0, 0.6, 0.0, -2.0),     # gururla dikleşir
        (r("05")["bas"], "ipek", 0.12, 0.35, 0.35, 0.0, -1.0, 0.7, 0.0, -2.5),           # omuz silker
        (k("07", "Ben") - 0.2, "ipek", 0.5, k("07", "Bunların") - k("07", "Ben"), 0.4,
         0.0, -1.0, 1.0, 1.0, 0.0),                                                      # hayalci baş eğme
        (k("07", "planladım") - 0.1, "ipek", 0.2, 1.4, 0.4, 0.0, -2.5, 0.0, 0.0, -2.5),
        (k("09", "Üstüne") - 0.2, "ipek", 0.6, sessizlik[1] - k("09", "Üstüne"), 0.2,
         0.0, 3.0, -0.5, 0.0, 2.5),                                                      # küçülür
        (r("10")["bas"] - 0.08, "ipek", 0.12, r("10")["sure"] + KAPANIS, 0.2, 1.0, -3.0, 0.9, 1.5, -2.0),
        # Derya
        (k("02", "Yatağını") - 0.1, "derya", 0.2, 1.2, 0.4, 0.0, -1.0, -0.7, 0.0, 0.0),
        (k("04", "tünaydın") - 0.05, "derya", 0.1, 0.12, 0.3, 0.0, 2.5, 0.0, -1.5, 0.5),
        (k("06", "4") - 0.15, "derya", 0.25, r("06")["son"] - k("06", "4"), 0.3, 1.2, -1.0, 0.5, 0.0, 0.0),
        (r("08")["bas"] - 0.1, "derya", 0.3, r("08")["sure"], 0.3, -1.0, 0.0, -0.6, -2.0, 0.0),  # öne eğilir
        (sessizlik[0] + 0.1, "derya", 0.3, sessizlik[1] - sessizlik[0] - 0.2, 0.3, 0.0, 0.0, 0.0, 1.5, 0.0),
    ]
    OZEL_KIRPMA[:] = [
        (sessizlik[0] + 0.3, "derya", 0.45),     # sessizlikte yavaş, manalı göz kırpma
    ]
    EFEKTLER[:] = [
        (0.35, "cips_poset.mp3", -17, -0.35),     # İpek'in eli cips paketinde
        (r("05")["son"] + 0.05, "cips_poset.mp3", -22, -0.35),
    ]
    EK_ALTYAZI[:] = [
        (sessizlik[0] + 0.25, sessizlik[1] - 0.1, "…"),
    ]
