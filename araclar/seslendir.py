"""Bir bölümün repliklerini ElevenLabs ile zaman damgalı olarak seslendirir.

Kullanım: python3 seslendir.py bolumler/bolum01
Çıktı: <bolum>/ses/replik_XX.mp3 ve replik_XX.json (karakter zamanlaması)
Var olan dosyaları yeniden üretmez; yeniden üretmek için dosyayı silin.
"""
import base64, json, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

ANAHTAR = os.environ["ELEVENLABS_API_KEY"]


def uret(bolum, s, r):
    mp3 = f"{bolum}/ses/replik_{r['id']}.mp3"
    if os.path.exists(mp3):
        return f"{r['id']} var, atlandı"
    vid = s["sesler"][r["karakter"]]["voice_id"]
    govde = json.dumps({"text": r["tts"], "model_id": s["model"], "language_code": "tr",
                        "voice_settings": s["ayar"]}).encode()
    for deneme in range(4):
        istek = urllib.request.Request(
            f"https://api.elevenlabs.io/v1/text-to-speech/{vid}/with-timestamps?output_format=mp3_44100_128",
            data=govde, headers={"xi-api-key": ANAHTAR, "Content-Type": "application/json"})
        try:
            d = json.load(urllib.request.urlopen(istek, timeout=120))
            break
        except urllib.error.HTTPError as e:
            if e.code == 429 and deneme < 3:
                time.sleep(3 * (deneme + 1))
                continue
            raise
    open(mp3, "wb").write(base64.b64decode(d["audio_base64"]))
    json.dump({"karakter": r["karakter"], "tts": r["tts"], "alignment": d["alignment"]},
              open(mp3[:-4] + ".json", "w"), ensure_ascii=False)
    return f"{r['id']} üretildi"


def main(bolum):
    s = json.load(open(f"{bolum}/senaryo.json"))
    os.makedirs(f"{bolum}/ses", exist_ok=True)
    with ThreadPoolExecutor(3) as ex:  # hesap limiti: aynı anda 3 istek
        for sonuc in ex.map(lambda r: uret(bolum, s, r), s["replikler"]):
            print(sonuc)


if __name__ == "__main__":
    main(sys.argv[1])
