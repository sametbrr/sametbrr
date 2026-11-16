# Patates odak arkadaşı — araştırma ve uygulama kapsamı

Araştırma: 16 Kasım 2026. Referans: https://barisozcan.com/pofi/

Durum: Referans sayfa tarayıcıda açıldı; başlangıç, çalışma ve ayarlar ekranları incelendi. Sayfanın istemci kodundan diğer akışlar doğrulandı. Telefon eşleşmesi, gerçek bildirim teslimi ve köşe penceresi cihazda denenmedi. Pato uygulandı; güncel çalıştırma ve kapsam farkları için patates-cuvali-deployment.md dosyasına bak.

## Ürün

Mevcut portföy içinde ayrı bir odak aracı. Sünger yerine özgün patates karakteri; denize dönüş yerine molalarla tarlaya dönüş. Çalışma süresi dolunca otomatik olarak mola yapmış sayılmaz: kullanıcının kalkma veya masada esneme eylemi gerekir. Karakter beklerken filizlenir; molada yürür, seans sonunda tarlaya ulaşır.

Kullanıcının onayladığı isim: **Pato**. Adres: `/pato`; mevcut portföy adresleri korunur.

## Referansta doğrulanan özellikler

| Alan | Davranış |
| --- | --- |
| Başlangıç | Hikâye, oturum hedefi, tahmini toplam süre |
| Süreler | Varsayılan 4 oturum; 25 dk çalışma, 5 dk mola, her 4 oturumda 15 dk uzun mola |
| Ayarlar | Hedef 1–12; çalışma 5–90 dk; mola 1–20 dk; uzun mola 5–30 dk; otomatik devam |
| Sayaç | Mutlak zaman damgasından hesaplama; sekme değişince ve yeniden açılınca devam |
| Mola | Erken kalkma, yürüme veya masada esneme, hareket önerileri |
| Erteleme | Oturum başına bir kez 5 dk |
| Karakter | Dokunmaya tepki; peş peşe dokunmaya farklı tepki; bekledikçe görünüm değişimi |
| Gecikme | Süre dolunca bekleme; 5 dk sonra kuruma, 35 dk sonra saksı, 95 dk sonra taşlaşma |
| Yolculuk | Mola sırasında ilerleme; hedef sonunda varış ve yeni seans |
| Ses | Kalimba, ahşap, kabarcık, kapalı; ilk kullanıcı etkileşiminde ses kilidini açma |
| Sessiz süre | 60 dk toplantı/sessizlik; bildirim ve ses bastırma |
| İstatistik | Günlük oturum, odak ve yürüyüş; seri; toplam oturum ve kilometre taşları |
| Özet | Seans özeti; paylaşılabilir PNG; dosya paylaşımı desteklenmezse indirme |
| Masaüstü | Destekleyen tarayıcılarda Document Picture-in-Picture köşe penceresi |
| Boşta algılama | Destek/izin varsa 3 dk uzakta kalmayı mola olarak değerlendirme |
| Telefon | Gizli eşleşme bağlantısının QR kodu; WebSocket ile iki cihaz arasında durum aktarımı |
| Bildirim | Masaüstü yerel bildirim; telefonda service worker ve sunucudan Web Push |
| Mobil | Ana ekrana ekleme açıklaması; destek varsa ekranı açık tutma |
| Erişilebilirlik | Hareket azaltma; klavye Space/Escape; kontrol adları |
| Deneme | Bir dakikayı bir saniyeye indiren hızlı mod |

Referansın çizimleri, sesleri, metinleri, kaynak kodu ve eşleşme servisi uygulamaya kopyalanmamalı. İşlevler bağımsız kodla, patatese özgü görseller ve metinlerle yeniden üretilmeli.

## Bildirim nasıl çalışmalı?

1. Kullanıcı “Bildirimleri aç” düğmesine basar. İlk sayfa ziyaretinde izin istenmez.
2. iPhone/iPad için ana ekrana ekleme açıklanır. iOS/iPadOS 16.4 ve sonrasında ana ekrandan açılan web uygulaması Web Push alabilir.
3. Bu araca özel manifest, ikonlar ve kapsamı dar bir service worker sunulur.
4. Tarayıcı Push API üzerinden VAPID anahtarıyla abone olur. Abonelik sunucuda ilgili anonim cihaz/eşleşme kaydına bağlanır.
5. Çalışma veya mola bitiş zamanı sunucuya kaydedilir. Kalıcı görev yürütücüsü vadesi gelen hatırlatmayı gönderir; sayfanın açık kalmasına güvenilmez.
6. Erteleme, sıfırlama, cihazdan ayrılma ve seans değişimi eski görevi iptal eder veya sürümle geçersiz kılar. Eski bildirim yeni seansa düşmez.
7. Service worker bildirimi gösterir. Bildirime dokunmak mevcut uygulama penceresine odaklanır veya doğru sayfayı açar.

Web Push tam zamanında alarm garantisi vermez. Ağ, işletim sistemi, odak modu ve kullanıcının bildirim tercihleri teslimi geciktirebilir. Bu nedenle uygulama yeniden açıldığında sayaç sunucudaki/kalıcı bitiş zamanından yeniden hesaplanmalı.

Kaynaklar:

- https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- https://developer.mozilla.org/en-US/docs/Web/API/Push_API

## Mevcut projeye entegrasyon

- Next.js 16.4.3, React 19.3.1; Türkçe kökte, İngilizce `/en` altında.
- Yeni sayfa mevcut `src/app/[lang]` düzenine uymalı. Meta verileri, dil bağlantıları ve sitemap eklenmeli.
- Portföyün mevcut sayfaları korunmalı. Aracın tam ekran sahnesi, genel açılış/ses davranışıyla çakışmamalı.
- İstemci tarafında saf durum makinesi: hazır → çalışma → mola → hazır/varış. Süre dolmasıyla mola başlaması ayrı olaylar olmalı.
- Yerel durum sürümlü ve doğrulanmış saklanmalı; bozuk kayıt kurtarılmalı. Çoklu sekmede bildirim/istatistik iki kez işlenmemeli.
- Paylaşılan oda durumunda sunucu sürüm numarası ve çakışma kontrolü kullanılmalı. İstemci saati tek otorite olmamalı.
- Eşleşme gizlisi tahmin edilemez olmalı; URL fragment üzerinden alınmalı, sonra adres çubuğundan temizlenmeli. Oda ömrü, bağlantıyı kesme ve cihaz sınırları bulunmalı.
- Bildirim abonelikleri ve eşleşme odaları için kalıcı depolama gerekli. Başlangıçta hazır bir veritabanı veya görev kuyruğu bulunamadı; bu çalışma SQLite ve ayrı worker ekledi.
- Mevcut Docker/Dokploy dağıtımına kalıcı depolama ve ayrı görev yürütücüsü eklenmeli. Süreç içi `setTimeout` ve bellekte Map üretim çözümü sayılmamalı.
- VAPID özel anahtarı yalnız sunucuda tutulmalı. Abonelik endpointleri doğrulanmalı; istek boyutu, oran sınırı ve aynı kaynak kontrolleri uygulanmalı.
- Üretim yapılandırması olmadan bildirim “aktif” gösterilmemeli; gerçek teslim doğrulanmadan mobil test geçti denmemeli.

## Kabul kontrolleri

- Hızlı denemede tam seans, uzun mola, erken mola, tek erteleme, varış, yeni seans.
- Yenileme/arka plan/uyku sonrası doğru kalan süre; çoklu sekmede tek istatistik yazımı.
- Reddedilen bildirim izni, desteklenmeyen PiP/IdleDetector, ses kapalı ve hareket azaltma.
- Masaüstü ve dar mobil görünüm, klavye kullanımı ve ayarlardan odağa dönüş.
- İki gerçek cihazda eşleşme, eşleşmeyi kesme ve eski durum çatışması.
- Gerçek iPhone ana ekran uygulamasında ve Android'de ekran kilitliyken push; erteleme/sıfırlama sonrası eski bildirimin gelmemesi.
- Sunucu yeniden başladıktan sonra görevlerin ve aboneliklerin korunması.
- Lint, tip kontrolü ve üretim derlemesi. Canlıya alma ayrı adım; commit/push kullanıcı açıkça istemedikçe yapılmaz.
