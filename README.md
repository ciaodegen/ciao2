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

## A) Bilgisayarsız: iPad + telefon

iPad oyunu gösterir ve TikTok'ta **Oyun (ekran paylaşımı)** moduyla yayına verir. Telefon kontrol paneli ve yorumlar içindir. TikTok'a bağlanan sunucu ücretsiz bir bulut hizmetinde (Render) çalışır.

### A1. Sunucuyu kur (bir kez, telefondan ~10 dakika)

Repo herkese açık olduğu için **GitHub hesabı gerekmez**. Render'a kendi e-postan veya Google hesabınla kaydolman yeterli.

1. **render.com** → *Get Started* → kendi **e-postan veya Google** hesabınla kaydol.
2. **New → Web Service** → **Public Git Repository** sekmesi → şu adresi yapıştır → *Connect*:
   `https://github.com/ciaodegen/ciao2`
3. Ayarları şöyle doldur:

   | Alan | Değer |
   |---|---|
   | Name | `plaka-yarisi` |
   | Region | Frankfurt |
   | Branch | `claude/practical-lovelace-5dgfne` |
   | Language | Node |
   | Build Command | `npm ci` |
   | Start Command | `node server/index.js` |
   | Instance Type | **Free** |

4. **Environment Variables** bölümüne ekle:

   | Ad | Değer |
   |---|---|
   | `TIKTOK_USER` | TikTok kullanıcı adın (@ olmadan) |
   | `ADMIN_TOKEN` | kendi belirlediğin şifre (en az 10 karakter, kimseyle paylaşma) |
   | `STORAGE` | `client` |
   | `NODE_VERSION` | `22` |

5. **Deploy Web Service**. Birkaç dakika sonra sayfanın üstünde sunucunun adresi çıkar, ör. `https://plaka-yarisi-xxxx.onrender.com`.

> Ücretsiz planda sunucu 15 dakika kullanılmazsa uyur; ilk açılış ~1 dakika sürebilir. Yayından birkaç dakika önce aç.
>
> Kodda bir güncelleme olduğunda Render kendiliğinden almaz: Render'da servise gir → **Manual Deploy → Deploy latest commit**.
>
> Repoya GitHub ile erişimin varsa `render.yaml` sayesinde **New → Blueprint** ile de kurabilirsin; ayarlar otomatik dolar.

### A2. iPad'i hazırla (bir kez)

1. iPad'de **Safari** ile sunucu adresini aç.
2. **Paylaş → Ana Ekrana Ekle → Ekle**. Ana ekrana gelen "Plaka Yarışı" simgesi oyunu adres çubuğu olmadan tam ekran açar.
3. **Ayarlar → Ekran ve Parlaklık → Otomatik Kilit → Asla.**
4. Ana ekrandaki simgeden aç ve şifreyi gir (bir kez sorar).

### A3. Telefonu hazırla

- Safari'de `https://SUNUCU-ADRESI/?panel=only` aç ve şifreyi gir. Bu sayfayı **yer işaretine** ekle, ana ekrana ekleme (ana ekrandan açılan sürüm her zaman yayın ekranı olur).
- Yorumları görmek için telefonda TikTok'ta başka bir hesapla yayınını izleyebilirsin. Oyun da gelen yorum ve hediyeleri ekranda gösterir.

### A4. Yayına çık

1. iPad'i şarja tak, **Rahatsız Etmeyin** odağını aç (bildirimler yayına düşmesin).
2. iPad'de **Plaka Yarışı**'nı aç → **▶ YAYINI BAŞLAT**'a dokun (ses açılır, ekran kararmaz).
3. iPad'de **TikTok → + → CANLI → Oyun** → başlığı yaz → yayını başlat → ekran yayınını onayla.
4. **Plaka Yarışı**'na geri dön. Artık iPad ekranı yayında.
5. Telefondaki panelde nokta **yeşil** ve `TikTok: @kullanici (oda …)` yazıyorsa bağlantı tamam. Kırmızıysa yazan mesaja bak.
6. Gerçek yayında **sahte izleyicileri başlatma**. Panelde sadece *Konvoy* ve *Sonraki aşama* gibi düğmeleri kullan.

Yayını bitirmek için TikTok'a dönüp yayını kapat.

**Notlar**
- Ücretsiz planda sunucunun diski kalıcı değil; bu yüzden profiller (garaj, galibiyet, şehir puanları) **iPad'in hafızasında** tutulur. Uygulamayı ana ekrandan silersen sıfırlanır.
- iPad ekranı TikTok'un dikey formatından daha geniş. Önemli her şey ortada durur, yanlara sadece binalar düşer. İlk yayında telefondan izleyip nasıl göründüğüne bak.
- iPad ısınırsa adresin sonuna `?q=0.5` ekleyerek grafik kalitesini düşürebilirsin.
- TikTok bağlantısı bulutta sürekli hata verirse, bağlantıyı imzalayan Euler Stream servisinden API anahtarı alıp Render'da **Environment → SIGN_API_KEY** alanına gir.

## B) Bilgisayarla

### B1. Kurulum (bir kez)

1. [Node.js](https://nodejs.org) indir ve kur (LTS sürümü, 20 veya üstü).
2. Bu klasörde bir terminal aç ve çalıştır:

```bash
npm install
```

### B2. Sahte izleyicilerle dene

```bash
npm run sim
```

Tarayıcıda **http://localhost:3000** adresini aç. Sahte izleyiciler katılır, hediye atar, yarışlar kendiliğinden döner.

Sağ alttaki **🎮 Kontrol** panelinden:
- sahte izleyicileri durdurup başlatabilir, yoğunluğunu değiştirebilirsin,
- **kendi adınla** katılıp hediye atabilirsin,
- konvoya geçebilir, sonraki aşamaya atlayabilir, sesi açabilirsin.

### B3. Gerçek TikTok yayınına bağlan

Önce TikTok'ta canlı yayını başlat, sonra:

```bash
npm start -- --user tiktok_kullanici_adin
```

Sunucu, oyun ekranı açıldığında yayına bağlanır ve gelen yorum/hediye/beğenileri oyuna iletir. Yayın kapalıysa 30 saniyede bir tekrar dener.

> TikTok'un canlı yayın olayları için **resmi bir API'si yok**. Bağlantı, resmi olmayan [tiktok-live-connector](https://www.npmjs.com/package/tiktok-live-connector) kütüphanesiyle yapılır. TikTok bir şey değiştirirse bağlantı bozulabilir; `npm update tiktok-live-connector` genelde düzeltir. Bağlantı imzalama servisi (Euler Stream) sınır koyarsa API anahtarını `SIGN_API_KEY` ortam değişkeniyle verebilirsin.

### B4. Yayına ekleme

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

## Ayarlar

Tüm ayarlar `public/config/game.json` dosyasında:

- `race`: lobi süresi, yarış uzunluğu, hız, en fazla kaç araç (`maxRacers`)
- `gifts.tiers`: hangi jeton aralığı hangi etkiyi yapar, menüde ne yazar
- `gifts.byName`: belirli bir hediyeye özel etki, ör. `{ "Rose": "nitro", "Galaxy": "truck" }`
- `konvoy.everyNthRound`: kaç yarışta bir konvoy (0 = hiç)
- `likeGoal.every`: kaç beğenide bir herkese nitro
- `effects`: nitro/yağ/drift/tır süreleri ve güçleri

Kalıcı veriler bilgisayarda `data/store.json` dosyasında, Render'da ise iPad'in hafızasında tutulur.

Sunucu ortam değişkenleri: `TIKTOK_USER` (kullanıcı adı), `ADMIN_TOKEN` (şifre; sunucu internete açıksa mutlaka ver), `STORAGE` (`file` veya `client`), `SIGN_API_KEY`, `PORT`.

## Notlar

- Sesler kodla üretilir, telifli müzik yoktur. Yayına müzik eklersen telifsiz olsun.
- Araçlar markasız, low-poly modellerdir. Gerçek araba markası veya logosu kullanma.
- Ekranda görünen isimlere temel bir küfür filtresi uygulanır (`public/js/shared/rules.js`).
- TikTok'un üst (profil) ve alt (yorumlar) alanlarına önemli bilgi konmadı.

## Dosyalar

```
server/index.js        sunucu: WebSocket, şifre, kayıt
render.yaml            bulut (Render) kurulum ayarı
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
