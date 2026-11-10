# Plaka Yarışı

TikTok canlı yayını için izleyicilerin **yorum yazarak katıldığı**, **hediye atarak yönettiği** interaktif araba yarışı.

- 💬 Yorum, beğeni, takip veya paylaşım yapan izleyici yarışa katılır. Arabasının üstünde adı ve profil fotoğrafı görünür.
- 🚗 Yoruma plaka kodu (`34`, `61`, `06`…) ya da şehir adı (`trabzon`) yazan, o plakayla yarışır ve şehrine puan toplar.
- 🎁 Hediyeler jeton değerine göre etki eder (ayarlanabilir):

| Jeton | Etki |
|---|---|
| 1-9 | 🌹 **Nitro**: kısa hızlanma, üst üste atılabilir |
| 10-29 | 🛢️ **Yağ dök**: öndeki araba kayar |
| 30-49 | 💨 **Drift şov**: drift atarak öne geçer |
| 50-99 | 🔧 **Modifiye**: kalıcı garaj seviyesi (renkli jant, spoiler, neon, şerit, altın boya) |
| 100+ | 🚛 **Tır çağır**: gönderen hariç herkes yavaşlar |

- 👑 **Pist sahibi**: Yayında en çok jeton atan kişi. Adı bitiş takında yazar. Koltuğu kapmak için ondan fazla jeton atmak gerekir.
- ❤️ **Beğeni hedefi**: Her 300 beğenide herkese nitro.
- 💍 **Düğün konvoyu**: Her 4 yarışta bir konvoy turu. En çok jeton atan **damat** olur, süslü araba en önde gider.
- 🏆 Her yarış ~1 dakika, ardından podyum ve şehir puanları.

Profiller kalıcıdır: garaj seviyesi, plaka, galibiyetler ve şehir puanları sonraki yayınlarda da durur.

---

## 1. Kurulum (bir kez)

1. [Node.js](https://nodejs.org) indir ve kur (LTS sürümü, 20 veya üstü).
2. Bu klasörde bir terminal aç ve çalıştır:

```bash
npm install
```

## 2. Sahte izleyicilerle dene

```bash
npm run sim
```

Tarayıcıda **http://localhost:3000** adresini aç. Sahte izleyiciler katılır, hediye atar, yarışlar kendiliğinden döner.

Sağ alttaki **🎮 Kontrol** panelinden:
- sahte izleyicileri durdurup başlatabilir, yoğunluğunu değiştirebilirsin,
- **kendi adınla** katılıp hediye atabilirsin,
- konvoya geçebilir, sonraki aşamaya atlayabilir, sesi açabilirsin.

## 3. Gerçek TikTok yayınına bağlan

Önce TikTok'ta canlı yayını başlat, sonra:

```bash
npm start -- --user tiktok_kullanici_adin
```

Sunucu yayına bağlanır, gelen yorum/hediye/beğenileri oyuna iletir. Yayın kapalıysa 30 saniyede bir tekrar dener.

> TikTok'un canlı yayın olayları için **resmi bir API'si yok**. Bağlantı, resmi olmayan [tiktok-live-connector](https://www.npmjs.com/package/tiktok-live-connector) kütüphanesiyle yapılır. TikTok bir şey değiştirirse bağlantı bozulabilir; `npm update tiktok-live-connector` genelde düzeltir. Bağlantı imzalama servisi (Euler Stream) sınır koyarsa API anahtarını `SIGN_API_KEY` ortam değişkeniyle verebilirsin.

## 4. Yayına ekleme

Oyun ekranı **1080x1920 (dikey)** tasarlandı. Yayında görünecek adres:

```
http://localhost:3000/?obs=1
```

`?obs=1` kontrol panelini gizler ve sesi otomatik açar.

- **TikTok LIVE Studio:** Oyunu Chrome'da `?obs=1` adresiyle açıp tam ekran yap (F11). LIVE Studio'da dikey sahneye ekran ya da pencere yakalama kaynağı ekleyip bu pencereyi seç. Menü adları sürüme göre değişebilir.
- **OBS (stream key varsa):** Kaynak ekle → *Tarayıcı (Browser)* → URL `http://localhost:3000/?obs=1`, genişlik 1080, yükseklik 1920.

Oyunu yayında yönetmek için ayrı bir pencerede kontrol panelini aç:

```
http://localhost:3000/?panel=only
```

Bu paneldeki düğmeler yayın ekranına anında yansır. Yayın penceresi seçiliyken klavye kısayolları da çalışır:

| Tuş | İş |
|---|---|
| `N` | Sonraki aşama (lobiyi atla, yarışı bitir…) |
| `K` | Konvoy moduna geç / sonraki tur konvoy olsun |
| `S` | Sahte izleyicileri aç/kapat |
| `P` | Kontrol panelini aç/kapat |
| `M` | Sesi aç/kapat |

> Yayın ekranı tek olmalı. Oyun mantığı tarayıcıda çalışır; aynı anda iki oyun penceresi açarsan ikisinde farklı kazananlar çıkar. Yönetim için `?panel=only` kullan.

## 5. Ayarlar

Tüm ayarlar `public/config/game.json` dosyasında:

- `race`: lobi süresi, yarış uzunluğu, hız, en fazla kaç araç (`maxRacers`)
- `gifts.tiers`: hangi jeton aralığı hangi etkiyi yapar, menüde ne yazar
- `gifts.byName`: belirli bir hediyeye özel etki, ör. `{ "Rose": "nitro", "Galaxy": "truck" }`
- `konvoy.everyNthRound`: kaç yarışta bir konvoy (0 = hiç)
- `likeGoal.every`: kaç beğenide bir herkese nitro
- `effects`: nitro/yağ/drift/tır süreleri ve güçleri

Kalıcı veriler `data/store.json` dosyasında tutulur. Silersen her şey sıfırlanır.

## 6. Notlar

- Sesler kodla üretilir, telifli müzik yoktur. Yayına müzik eklersen telifsiz olsun.
- Araçlar markasız, low-poly modellerdir. Gerçek araba markası veya logosu kullanma.
- Ekranda görünen isimlere temel bir küfür filtresi uygulanır (`public/js/shared/rules.js`).
- TikTok'un üst (profil) ve alt (yorumlar) alanlarına önemli bilgi konmadı.

## Dosyalar

```
server/index.js        yerel sunucu, WebSocket, kayıt
server/tiktok.js       TikTok bağlantısı ve hediye serisi sayımı
server/store.js        data/store.json kaydı
public/index.html      oyun sayfası
public/config/game.json  ayarlar
public/js/game/race.js   oyun mantığı (yarış, hediyeler, pist sahibi, konvoy)
public/js/render/      3D sahne, arabalar, isim etiketleri
public/js/ui/          ekran arayüzü ve kontrol paneli
public/js/shared/      plakalar, hediye kuralları, simülatör
test/                  testler (npm test)
```
