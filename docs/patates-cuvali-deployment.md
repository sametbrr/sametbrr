# Pato — çalıştırma ve bildirimler

## Yerel kullanım

`pnpm dev --hostname localhost` ile aç; `/pato` ve `/en/pato` sayfalarını kullan. Araç portföy altbilgisinden de bulunur. İlk oturumdan önce süreleri ve hızlı denemeyi ayarlayabilirsin. Hızlı denemede bir dakika bir saniyedir; Web Push zamanlanmaz.

Sayaç, ayarlar, günlük toplamlar ve seri bilgisi bu tarayıcının yerel depolamasında saklanır. Çalışma bittiğinde kullanıcı kalkmadan mola başlamaz. Seansın son molası tamamlanınca varış özeti çıkar. Masada esneme molaları yürüyüş toplamına eklenmez. Seansı sıfırlamak günlük toplamları silmez.

Destekleyen tarayıcılarda köşe penceresi, ekranı açık tutma ve izinli boşta algılama bulunur. Boşta algılama bu cihazda açık tutulur, 3 dakikalık hareketsizlikten sonra mola başlatır; fiziksel olarak yürüdüğünü kanıtlamaz.

## Tema ve ayarlar

Pato ana sitenin açık/koyu temasını ve kaydedilmiş tema tercihini kullanır. Üstteki ortak tema düğmesi tercihi site genelinde saklar. Sayfa ve sahne zemini `--color-void`, ayarlar penceresi `--color-surface-1` kullanır; ayrı sabit açık tema yoktur. Köşe penceresine tema başlangıçta aktarılır ve sonraki değişiklikler eşitlenir; gerçek PiP açılışı bu test ortamında doğrulanamamıştır.

Odak, mola, oturum sayısı, otomatik devam, ses seçimi ve sessiz saat ana ekrandaki Hızlı ayarlar alanından doğrudan kullanılabilir. Masaüstünde sayacın yanında, mobilde sayacın üstünde kompakt olarak yer alır. Daha ayrıntılı ayarlar her ekran boyutunda araç çubuğundan yerel modal olarak açılır. **Seans**, **Ses ve hareket**, **Telefon** sekmeleri kontrolleri ayırır; günlük toplamlar ana sahnenin altında kalır. Escape pencereyi kapatıp odağı ayarlar düğmesine döndürür. Kısa ekranlarda veya QR gibi genişleyen içerikte pencere içinde kaydırma olabilir; arka sayfa modal açıkken kaymaz. Bu değişiklik sunucu, worker veya dağıtım gereksinimlerini değiştirmez.

## Eşleşme

Geliştirmede SQLite `.data/patates.sqlite` dosyasında tutulur. Üretimde `PATATES_DB_PATH` verilmedikçe sunucu özellikleri kapalı kalır. Aynı yerel diskte çalışan tek uygulama örneği ve bildirim worker'ı için tasarlanmıştır; çok sunuculu dağıtım veya ağ dosya sistemi için tasarlanmamıştır.

1. “Telefonla eşleştir” ile bir oda oluştur.
2. QR kodunu kendi telefonunda aç veya gizli bağlantıyı kopyala.
3. İki cihaz aynı sunucu sürümünü okur. Açık cihazlar değişiklikleri `GET /api/patates?stream=1` akışından anında alır (yerelde ~10 ms ölçüldü). Akış beş dakikada bir kapanır ve istemci yeniden bağlanır; 30 saniyelik yoklama yedek olarak kalır. Anlık uyandırma aynı süreç içindedir; birden fazla web süreci çalışırsa diğerleri en geç 3 saniyede yakalar. Ters vekil bu yanıtı arabelleğe almamalıdır.
4. Eşzamanlı işlemler sürüm kontrolüyle çakışma yanıtı alır; diğer cihazın değişikliği yüklenir.
5. “Bu cihazın eşleşmesini ve bildirimlerini kapat” o cihazın aboneliğini kaldırır ve yerel kullanıma döner. Oda silinmişse yerel çıkış yine tamamlanır. Sunucu çevrimdışıysa çıkış engellenmez; iptal isteği bu cihazda saklanıp yeniden açılışta, bağlantı dönüşünde ve 30 saniyede bir tekrar denenir. İptal onaylanana kadar eski bildirimlerin gelebileceği açıklanır.

Bağlantı bir erişim anahtarıdır; paylaşan kişi seansı yönetebilir. Token URL fragment'indedir, sunucu URL loglarına gönderilmez ve açılışta adres çubuğundan temizlenir. Sunucuda hash'i saklanır. Oda son işlemden 30 gün sonra silinir. QR açıldıktan sonra ana ekrana ekleme yapılacaksa önce eşleşmenin yüklendiğini doğrula.

## Üretimde arka plan bildirimleri

Gerekli parçalar: HTTPS, paylaşılan kalıcı disk, uygulama servisi, ayrı ve sürekli çalışan worker ve VAPID anahtarları. Sadece Next.js uygulamasını dağıtmak bildirim worker'ını başlatmaz.

Anahtarları loga yazdırmadan özel bir dosyada üret:

```sh
node scripts/patates/keys.mjs /guvenli/konum/patates.env
```

Dosya yeni olmalı; komut mevcut dosyanın üzerine yazmaz, izinleri `0600` olarak oluşturur. İçeriği uygulama ve worker'ın ortam değişkenlerine gir; git'e ekleme. Public/private anahtarlar iki serviste aynı kalmalı. Değiştirirsen eski tarayıcı abonelikleri yeniden kurulmalı.

İki servise de aynı değerleri ver:

```dotenv
PATATES_DB_PATH=/app/data/patates.sqlite
PATATES_PUSH_ENABLED=true
PATATES_VAPID_PUBLIC_KEY=<üretilen public değer>
PATATES_VAPID_PRIVATE_KEY=<üretilen private değer>
PATATES_VAPID_SUBJECT=mailto:sametbrr@gmail.com
```

Docker/Dokploy:

- Web servisi: mevcut Dockerfile'ın varsayılan `runner` hedefi. Mevcut web dağıtım hedefi korunur.
- Worker servisi: aynı repo/Dockerfile, build target `patates-worker`. HTTP portu yoktur; process başlangıcı `node scripts/patates/worker.mjs`.
- İki servise aynı sunucudaki kalıcı dizini `/app/data` olarak bağla. Dizin container'daki `nextjs` kullanıcısına yazılabilir olmalı.
- Worker'a yeniden başlatma politikası tanımla. SQLite dosyası, `-wal` ve `-shm` dosyaları aynı kalıcı dizinde olmalı; yedekleme SQLite'ın çevrimiçi backup mekanizmasıyla yapılmalı.
- Worker heartbeat'i 30 saniyeden eskiyse API yeni bildirim aboneliğini hazır göstermez. `PATATES_PUSH_ENABLED` tek başına yeterli değildir.

Yerelde worker çalıştırmak için aynı ortam değişkenlerini yükleyip `node scripts/patates/worker.mjs` çalıştır. Worker gerekli yapılandırma yoksa başlamaz.

## Bildirim davranışı ve sınırları

- Kullanıcı düğmesi ve açık izin gerekir. iPhone/iPad için iOS/iPadOS 16.4+ ve ana ekrandan açılan web uygulaması gerekir.
- Worker, çalışma/mola bitiş görevini kalıcı kayıttan okur; erteleme ve sıfırlama eski sürümün görevini geçersiz kılar.
- Çalışma bitimine 30 saniye kala ön hatırlatma; bitişte ve gecikmenin 5, 10, 15, 20, 25, 30, 45, 60, 90, 120. dakikalarında tekrar gönderilir. Molada tek bitiş hatırlatması vardır. Sessiz saatteki görevler sessizlik sonuna ertelenir.
- Service worker yalnız bildirim içindir; sayfa ve dosyaları offline önbelleğe almaz. Uygulama kurulabilir; çevrimdışı ilk açılış garanti edilmez.
- İzin ve abonelik kaydı, gerçek cihaza teslim kanıtı değildir. Düğme cihazda yerel bir test bildirimi gösterir; gerçek Web Push teslimi ayrı cihaz testinde doğrulanmalıdır.
- Teslimat en az bir kez olabilir: worker tam gönderimden sonra çökerse aynı bildirim tekrar denenebilir; aynı tag görünür kopyaları birleştirir. Çoklu cihazlardan birinin geçici hatası, diğerine tekrar gönderime yol açabilir.
- Worker yeniden açıldığında 5 dakikadan eski görevleri göndermez. Yakın görevler tekrar alınır; eski bir çalışma görevinin sonraki geçerli hatırlatmaları geleceğe planlanır. Sunucu hatırlatma saati; işletim sistemi, ağ ve odak modu nedeniyle kesin alarm değildir.
- Bir bildirim push servisine aktarılmışsa sonraki sıfırlama onu geri çekemez. Henüz gönderilmemiş eski işler sürüm kontrolüyle iptal edilir.
- Varsayılan sunucu bildirimleri Türkçedir; sayfa Türkçe ve İngilizce sunulur.

Kaynaklar: [WebKit Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API), [Node SQLite](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html), [web-push](https://github.com/web-push-libs/web-push).

## Doğrulama

```sh
node scripts/patates/state-test.mts
node scripts/patates/scheduler-test.mjs
node scripts/patates/recovery-test.mts
pnpm lint
pnpm build
```

Gerçek iPhone/Android'de ekran kilitliyken teslim ve iki fiziksel cihazda eşleşme, HTTPS üretim/deneme ortamında ayrıca denenmeli. Bu çalışma commit, push veya canlı dağıtım yapmaz.

## Pofi ile davranış eşitliği (16 Kasım 2026)

- **Erken mola:** Odak süresinin %60'ından azı çalışıldıysa oturum sayılmaz; çalışılan dakikalar yine odak toplamına eklenir. Seri, sayılan ilk oturumda güncellenir.
- **Moladan dönüş:** Mola her an bitirilebilir. Yürüyüş ve yolculuk, alınan mola payı kadar ilerler. Mola bitince sayaç kullanıcıyı bekler; yalnız otomatik devam açıksa veya yolculuk tamamlandıysa kendiliğinden ilerler.
- **Uzaklaşma:** Boşta algılama açıkken 3 dk uzaklaşmak veya ekranı kilitlemek molayı geriye dönük başlatır, geri gelmek odağa döndürür. Elle başlatılan mola kendiliğinden bitmez. Tercih kaydedilir. Algılama yoksa köşe penceresinin 3 dk gizli kalması aynı sayılır.
- **Tanıtım:** İlk ziyarette hikâye, oturum sayısı ve tahmini toplam süre. "Pato kim?" bağlantısıyla yeniden açılır.
- **Konuşmalar:** Sabah, akşam, gece, pazartesi sabahı, cuma öğleden sonrası; 10/50/100 oturum, 7 günlük seri ve ilk varış bir kez söylenir.
- **Diğer:** Mola sırasında masada/yürüyüş geçişi, sekme başlığında sayaç, telefonda titreşim, ilk mola bitiminde bağlam içinde bildirim izni sorusu, beklerken kademeli solma, zıplama/takla/esneme hareketleri.

Pofi'den bilinçli farklar: masada geçen mola yürüyüş dakikası saymaz; kalan oturum yukarı yuvarlanır; ayarlar seans sırasında kilitlidir. Web Push hâlâ sunucuda etkin değil ve gerçek telefonda doğrulanmadı.

## Düzen (16 Kasım 2026)

Sayfa oyun sayfalarıyla aynı çerçeveyi kullanır: site menüsü, "Tüm oyunlar" bağlantısı, başlık, sayaç kartı. Ayar modalı ve ayrı Hızlı ayarlar paneli kaldırıldı; ayarlar sayaç yanında (dar ekranda altında) açılır-kapanır tek tabloda durur. Açıklama ve "Diğer oyunlar" listesi altta açık görünür.

## Ses ve otomatik mola (16 Kasım 2026)

Pato artık sitenin ortak seslerini ve üst menüdeki ses anahtarını kullanır; kendi ses seçimi, ses düğmesi ve "1 saat sessiz" kaldırıldı (`data-own-audio` istisnası da geri alındı). "Kalktığımı kendin anla" her tarayıcıda açılır: IdleDetector izni varsa klavye/fare ve ekran kilidi izlenir; yoksa (Safari, Firefox, Brave) yalnız bilgisayarın uykuya geçmesi sayaç duraksamasından anlaşılır ve mola geriye dönük işlenir. Satır hangi kipte çalıştığını yazar.

"Otomatik mola" (boşta algılama, uyku algılama ve köşe penceresi yedeği) kullanıcı isteğiyle tamamen kaldırıldı; mola yalnızca elle başlar.

## Bildirim kurulumu — güncel durum (16 Kasım 2026, önceki "Üretimde arka plan bildirimleri" bölümünün yerine geçer)

Elle anahtar girmek gerekmez. Worker ilk açılışta VAPID anahtarlarını üretir ve kalıcı veritabanındaki `config` tablosuna yazar; web uygulaması public anahtarı oradan okur. Web servisi için `PATATES_DB_PATH` imajda tanımlıdır (`/app/data/patates.sqlite`). Bildirim, worker heartbeat'i taze ve public anahtar yayımlanmışsa hazır sayılır; `PATATES_PUSH_ENABLED=false` kapatır. `PATATES_VAPID_*` değişkenleri verilirse onlar kullanılır. Veritabanı diski silinirse anahtarlar yenilenir ve mevcut abonelikler yeniden kurulmalıdır.

Dokploy (proje `sametbrr.com`, ortam `production`):

- `sametbrr-web`: `/app/data` yoluna `sametbrr-pato-data` adlı volume eklendi; bir sonraki dağıtımda bağlanır.
- `sametbrr-pato-worker` (appName `sametbrr-pato-worker-zmujl0`): aynı depo, `main`, Dockerfile hedefi `patates-worker`, aynı volume `/app/data`, otomatik dağıtım kapalı, ortam değişkeni yok. Kod `main`e gönderilene kadar dağıtılmadı.

Sıra: kodu gönder → `sametbrr-web` dağıt → `sametbrr-pato-worker` dağıt → gerçek telefonda dene.

Düzeltilen hata: `web-push` 4 varsayılan dışa aktarım sunmuyor; worker ve `keys.mjs` içe aktarımı düzeltilene kadar başlamıyordu.
