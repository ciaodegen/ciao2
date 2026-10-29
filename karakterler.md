# Derya & İpek — Karakter ve Sahne Kılavuzu

Ana referans görsel: `referans/ana_sahne.png` (941x1672, dikey 9:16)

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
- Ses denemeleri için: `araclar/ses_sayfasi.py` (dinlenebilir HTML sayfası üretir)
- Altyazı: beyaz, siyah kontur, Inter Display ExtraBold 62px, y=1440 merkez (Instagram alt arayüzünün üstünde)

## Animasyon Yöntemi

- Sabit referans görsel üzerinde kod tabanlı rig: `araclar/sahne_rig.py`
  - göz kırpma, bakış yönü (orijinal / asagi / merkez=kamera / yukari=göz devirme)
  - konuşurken ağız: kendi sesinin şiddeti + harf zamanlaması (sesli harfe göre ağız şekli)
  - küçük baş hareketleri (en fazla ~3 px / 1°; fazlası arka plan fayanslarını büker)
  - çaydanlık ve bardak buharı, aspiratör ışığında çok hafif nefes
- YAPILAMAYANLAR (görsel yeniden çizilmeden mümkün değil): el/kol hareketi, cips yeme, çay bardağı kaldırma
- Bölüm üretimi: `python3 araclar/seslendir.py bolumler/bolumXX` sonra `python3 araclar/bolum_motoru.py bolumler/bolumXX`
- Bölüm klasörü: `senaryo.json` (altyazı + tts metni) ve `yonetim.py` (bakış, jest, efekt zamanları)

## Senaryo Notları / İşleyen Konular

- Bölüm 1 — Ben Çok mu Çirkinim? (filtreli kızlar, FaceApp, ceket linki) — 61,5 sn
