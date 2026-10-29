# Derya & İpek — Karakter ve Sahne Kılavuzu

Referans görseller (sahne profilleri `araclar/sahne_rig.py` → `SAHNELER`):
- `ana_sahne` — `referans/ana_sahne.png`: ikisi de eli yanağında (Bölüm 1)
- `bolum02` — `referans/bolum02_sahne.png`: İpek cips paketinde, Derya telefonda; masada laptop, mum, kiraz, "Planlar" defteri, kişisel gelişim kitapları (Bölüm 2)
- Yeni görsel gelince: göz/ağız kutuları, baş elipsi, silüet, gövde sınırı, buhar noktaları için yeni profil eklenir

## DEĞİŞMEZ KURALLAR

- Karakterler **asla değiştirilmez**: yüz, saç, kıyafet, aksesuar, çizim stili aynı kalır.
- Referans görseldeki **hiçbir öğe bozulmaz, silinmez, yer değiştirmez**.
- Görsele yapılabilecek tek şey: üstüne efekt (ışık titremesi, zoom/kadraj, altyazı) eklemek.
- Tüm sohbetler **aspiratör ışığı altında**, bu mutfakta geçer.

## Karakterler

### İpek — SOLDAKİ
- Sarı/platin saç, dağınık topuz, siyah çiçekli toka (ortası sarı)
- Pembe, omzu açık kazak; altında siyah askılı
- Altın halka küpe
- Elini yanağına dayamış, sıkılmış/bezgin bakış
- Kişilik: meraklı, hafif alıngan, cilveli; sosyal medyadaki kızlarla kendini kıyaslar, laf sokmayı da bilir
- ElevenLabs sesi: **Gökçe Deniz** — `oPC5I9GKjMReiaM29gjY` (neşeli, cilveli, ince; İpek enerjik olan)

### Derya — SAĞDAKİ
- Uzun siyah saç, pembe/fuşya röfleler, topuz + pembe fiyonk toka
- Leopar desenli bluz, siyah choker kolye
- Altın halka küpe
- Elini yanağına dayamış, sıkılmış/bezgin bakış
- Kişilik: dobra, biraz sabırsız, kuru/alaycı komik; İpek'e akıl verir ama kendisi de aynı şeyleri yapar (ceket linki)
- ElevenLabs sesi: **Mel Ross** — `LDb18ybzyBBJNGLUnm0l` (tok, rahat, biraz alaycı; Derya bezgin olan)

## Sahne (Mutfak, Gece)

- Ortada aspiratör, altındaki sıcak sarı ışık sahnenin ana ışığı
- Yeşil-turuncu çiçek desenli fayanslar, ocakta çaydanlık
- Raflarda tencereler, kavanozlar
- Solda buzdolabı: kalp, kara kedi magnetleri, kartpostal, notlar
- Sağda pencere: gece, ışıkları yanan apartmanlar; sarı perde, saksı
- Masa: sarı kareli örtü, iki ince belli çay bardağı (buharlı), cips paketi + kalpli kasede cips,
  kırmızı oje, telefon, tarot kartları (güneş, ay, kalp, deste), boş küllük/kase
- Genel ton: sıcak, samimi, gece muhabbeti

## Video Formatı

- 9:16 dikey, Instagram Reels
- Seslendirme: ElevenLabs (her karaktere sabit ses)

## Ses Kuralları (her zaman)

- Model: **`eleven_v3`** — `eleven_multilingual_v2` robotik çıkıyor, kullanılmaz.
- Ayar: `stability: 0.5` (Natural)
- Replikler duygu etiketleriyle yazılır: `[sighs]`, `[bored]`, `[tired]`, `[laughs]`, `[giggles]`, `[excited]`, `[playfully]`, `[whispers]` vb.
- Metin konuşur gibi yazılır: "ya", "kız", "yani", üç nokta ile duraksama.
- Hesap limiti: aynı anda en fazla 3 istek.
- Tempo: ham v3 çıktısı yavaş (~4,5 hece/sn). Bölümde `TEMPO = {"ipek": 1.12, "derya": 1.28}` ile perde
  değişmeden hızlandırılır (~5,5–6,4 hece/sn), replik içi duraksama en fazla 0,35 sn, replik arası 0,2 sn.
- Ses denemeleri için: `araclar/ses_sayfasi.py` (dinlenebilir HTML sayfası üretir)
- Altyazı: beyaz, siyah kontur, Inter Display ExtraBold 62px, y=1440 merkez (Instagram alt arayüzünün üstünde)

## Animasyon Yöntemi

- Sabit referans görsel üzerinde kod tabanlı rig: `araclar/sahne_rig.py`
  - göz kırpma, bakış yönü (orijinal / asagi / merkez=kamera / yukari=göz devirme)
  - konuşurken ağız: kendi sesinin şiddeti + harf zamanlaması (sesli harfe göre ağız şekli)
  - karakterler silüet maskesiyle ayrı katman: baş (kayma/dönme) + gövde (eğilme/nefes); ARKA PLAN HİÇ OYNAMAZ
    (karakterlerin arkası `arka_plan_plakasi` ile doldurulur; baş en fazla ~4 px / 1,1°)
  - çaydanlık ve bardak buharı, aspiratör ışığında çok hafif nefes
- YAPILAMAYANLAR (görsel yeniden çizilmeden mümkün değil): el/kol hareketi, cips yeme, çay bardağı kaldırma
- Bölüm `yonetim.py` içinde `SAHNE = "..."` ile görsel seçilir; `EK_ALTYAZI` ile sessiz anlara altyazı (ör. "…"),
  `senaryo.json`da `seviye_egrisi` ile giderek kısılan ses
- Bölüm üretimi: `python3 araclar/seslendir.py bolumler/bolumXX` sonra `python3 araclar/bolum_motoru.py bolumler/bolumXX`
- Bölüm klasörü: `senaryo.json` (altyazı + tts metni) ve `yonetim.py` (bakış, jest, efekt zamanları)

## Senaryo Notları / İşleyen Konular

- Bölüm 1 — Ben Çok mu Çirkinim? (filtreli kızlar, FaceApp, ceket linki) — 49,2 sn
- Bölüm 2 — Herkes Bir Şeyler Yapıyor (yirmilerin ortası, tünaydın, Mehmet, düğün planları, engellenme) — 50,3 sn
- Süregelen şakalar: İpek ↔ Mehmet (İpek her şeyi planlamış, Mehmet cevap vermiyor/engelledi); İpek öğlen 2'de uyanır; Derya telefondan başını kaldırmadan laf sokar
