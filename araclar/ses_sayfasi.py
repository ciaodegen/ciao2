"""Ses denemelerini dinlenebilir tek bir HTML sayfasına gömer.

Kullanım: python3 ses_sayfasi.py ayar.json cikti.html
ayar.json: {"baslik","aciklama","cumle_html","karakter":"derya|ipek","klasor","sesler":[[no,ad,voice_id,tanim,etiket,dosya],...]}
"""
import base64, html, io, json, os, sys
from PIL import Image

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BURADA = os.path.dirname(os.path.abspath(__file__))
KIRPMA = {"derya": (470, 500, 941, 1110), "ipek": (0, 480, 480, 1100)}
ALT = {"derya": "Derya: siyah saçlı, pembe röfleli, leopar bluzlu",
       "ipek": "İpek: sarı topuzlu, pembe kazaklı"}


def veri_uri(yol, tur):
    return f"data:{tur};base64," + base64.b64encode(open(yol, "rb").read()).decode()


def main(ayar_yolu, cikti):
    a = json.load(open(ayar_yolu))
    img = Image.open(f"{KOK}/referans/ana_sahne.png").convert("RGB").crop(KIRPMA[a["karakter"]])
    img.thumbnail((360, 480))
    b = io.BytesIO(); img.save(b, "JPEG", quality=82)
    foto = "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()
    kartlar = []
    for no, ad, vid, tanim, etiket, dosya in a["sesler"]:
        ses = veri_uri(f"{KOK}/{a['klasor']}/{dosya}.mp3", "audio/mpeg")
        t = f'<span class="tag">{html.escape(etiket)}</span>' if etiket else ""
        kartlar.append(f'''<li class="voice">
  <div class="head"><span class="num">{no}</span><h2>{html.escape(ad)}</h2>{t}</div>
  <p class="desc">{html.escape(tanim)}</p>
  <audio id="a{no}" controls preload="none" src="{ses}"></audio>
  <div class="idrow"><code>{vid}</code><button type="button" class="copy" data-id="{vid}">ID'yi kopyala</button></div>
</li>''')
    css = open(f"{BURADA}/_ses_sayfasi_stil.css").read()
    js = open(f"{BURADA}/_ses_sayfasi.js").read()
    sayfa = f'''<title>{html.escape(a["sayfa_adi"])}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Young+Serif&family=Figtree:wght@400;600&family=JetBrains+Mono:wght@400&display=swap">
<style>{css}</style>
<div class="wrap">
<header>
  <img src="{foto}" alt="{ALT[a["karakter"]]}">
  <div>
    <h1>{html.escape(a["baslik"])}</h1>
    <p class="lede">{html.escape(a["aciklama"])}</p>
  </div>
</header>
<blockquote><small>Deneme cümlesi · v3 duygu modeli</small>{a["cumle_html"]}</blockquote>
<ol>
{chr(10).join(kartlar)}
</ol>
<footer>Bir ses çalmaya başlayınca diğeri durur. Hiçbiri olmadıysa tarif et; yeni seslerle tekrar deneme yaparım.</footer>
</div>
<script>{js}</script>
'''
    open(cikti, "w").write(sayfa)
    print(cikti, os.path.getsize(cikti) // 1024, "KB")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
