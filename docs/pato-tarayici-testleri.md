# Pato tarayıcı kontrolü

16 Kasım 2026 — yerel geliştirme sürümü, Chromium tabanlı paylaşılan tarayıcı. Canlı site ve fiziksel telefon testi değildir.

## Önceki işlev turu

Aşağıdaki erişim ve işlev sonuçları tema/ayar düzeni değişikliğinden önceki turdan korunmuştur. Tam işlev matrisi yeni yerleşim için yeniden çalıştırılmış sayılmaz; güncel kapsamlı olmayan kontroller aşağıda ayrı kaydedilmiştir.

## Siteden erişim

Ana sayfa → sayfanın altındaki **Pato** bağlantısı → `/pato`. Bu geçiş gerçek tıklamayla doğrulandı. Pato başlığının üstündeki sametbrr.com bağlantısı ana sayfaya dönüyor. Üst ana menüde Pato bağlantısı bulunmuyor. Canlı dağıtım yapılmadığından bu bağlantı henüz yayınlanmış sürüm için doğrulanmış değildir.

## İşlev sonuçları

| Kontrol | Sonuç |
| --- | --- |
| Oturum artır/azalt | 1–12 sınırları ve devre dışı düğmeler geçti |
| Odak artır/azalt | 5–90 dk sınırları geçti |
| Mola artır/azalt | 1–20 dk sınırları geçti |
| Uzun mola artır/azalt | 5–30 dk sınırları geçti |
| Ses aç/kapat | Tercih ve aria-pressed durumu geçti; işitilebilirlik ölçülmedi |
| Ahşap/Kalimba/Kabarcık/Kapalı seçimi | Dört seçeneğin kaydı geçti |
| Patatese dokunma | Normal tepki ve beş hızlı dokunuşta farklı tepki geçti |
| Hikâye aç/kapat | Geçti; dış Pofi bağlantısının hedefi kaynakta doğrulandı |
| Sessiz saat aç/kapat | quietUntil durum değişimleri geçti |
| Hızlı deneme | 1 dakika = 1 saniye modu ve açıklaması geçti |
| Odaklanmaya başla | Odak başladı, süre ayarları kilitlendi |
| Bir kez 5 dk ertele | Süre eklendi, ikinci erteleme kaldırıldı |
| Kalk, biraz yürü | Mola başladı, yürüyüş süresi eklendi |
| Masada esneyeceğim | Mola başladı, yürüyüş toplamına eklenmedi |
| Otomatik devam | İki oturumluk denemede ilk moladan sonra ikinci odak başladı |
| Seansı sıfırla | Günlük toplamları koruyan sıfırlama ve vazgeçme yolu denendi |
| Varış ve yeni çuval | Özet oluştu, yeni seans turu sıfırlandı, günlük toplam korundu |
| Özeti paylaş | Gerçek PNG indirmesi tamamlandı; 1080×1350 görsel açılıp incelendi |
| Telefonla eşleştir | 220 px QR ve gizli bağlantı oluştu |
| Bağlantıyı kopyala | Gerçek tıklamayla panoya kopyalama başarılı |
| Cihaz eşleşmesi | Depolamaları ayrı Default/Incognito profilleriyle iki yönde seans/mola aktarımı geçti |
| Eşleşmeyi kapat | İki profilde yerel kullanıma dönüş geçti |
| TR/EN | `/pato` ↔ `/en/pato`, başlık ve içerik geçişleri geçti |
| Önceki mobil ayarlar | Eski inline panelin açılması/kapanması geçti; bu yerleşim artık kullanılmıyor |
| Klavye | Etkileşimli alan dışında Space ile seans başlatma geçti |

## Ortam nedeniyle tamamlanamayan kontroller

- **Köşe penceresi:** gerçek API çağrısı `InvalidStateError: ... Internal error: no window` döndürdü. Sayfanın hata açıklaması ve ana pencerede devam etme yolu çalıştı. Açılmış PiP içindeki “Ana pencereye dön” ve ana sayfadaki “Buraya geri al” dalları bu ortamda sınanamadı.
- **Boşta algılama:** izin verilmedi/başlatılamadı; onay kutusu kapalı kaldı ve açıklama gösterildi. İzin verilmiş 3 dk boşta kalma davranışı fiziksel cihazda denenmeli.
- **Web Push:** sunucu VAPID/worker yapılandırması etkin değil; düğmenin devre dışı olması doğrulandı. Tarayıcının bildirim izni de denied durumundaydı. Gerçek abonelik ve kilit ekranı teslimi denenmedi.
- **Ekranı açık tutma ve sistem paylaşım menüsü:** fiziksel cihaz kabulü yapılmadı. Bu tarayıcıda paylaşımın PNG indirme yedeği sınandı.

Bu dallar için simüle edilmiş başarı gerçek cihaz testi olarak sayılmadı.

## Önceki tasarım ve erişilebilirlik kanıtı

Önceki turda 320, 390, 768, 899, 900, 1024, 1280 ve 1920 px genişliklerde yatay taşma görülmedi. Bu ölçüm eski yan sütun/inline ayar düzenine aittir; güncel modal düzen için aynı genişlik matrisinin tamamı yeniden koşulmadı. İsimsiz ana sayfa düğmesi bulunmadı.

Önceki ses kapalı simgesi düzeltmesinde opaklık yerine muted renk kullanılmış, **5,20:1** ve opacity=1 ölçülmüştü. Bu tarihsel kontrast sonucu yeni açık/koyu paletin tüm durumları için yeniden ölçüm sayılmaz.

## Güncel tema ve modal düzen kontrolü

16 Kasım 2026 — aynı yerel Chromium ortamında, kullanıcının ana siteyle aynı tema/zemin ve ayarlara daha az kaydırarak erişim isteğine yönelik dar kapsamlı tekrar kontrolü:

- Açık/koyu tema ve kaydedilmiş tercihle ana site/Pato geçişi doğrulandı. Hesaplanan sayfa zemini açıkta **#f6f6f2**, koyuda **#050505**; ayarlar `--color-surface-1` kullanıyor. Ortak tema düğmesi mevcut site tercihini saklıyor.
- Ana sahne kısaltıldı; günlük toplamlar sahne altında. İncelenen masaüstü görünümünde ana eylemin alt sınırı yaklaşık **531px**, mobilde **550px**; mobil toplamlar yaklaşık **700px** seviyesinde.
- **1280×800** ve **390×844** boyutlarında Seans, Ses ve hareket, Telefon panellerinin üçü de iç kaydırma gerektirmedi. Bu, eşleşme QR içeriğinin genişlemiş durumunu kapsamaz.
- **320×568** Seans modalı görünüm alanında kaldı; yalnız **8px** iç kaydırma gerekti, arka sayfa kaydırması **0** kaldı. İngilizce 320px görünümde yatay taşma görülmedi.
- Sekme ok tuşları, Escape ile kapatma ve odağın ayarlar düğmesine dönüşü; stepper değişikliği ve test değerlerinin geri yüklenmesi doğrulandı.
- PiP tema aktarımı ve `useTheme` ile sonraki değişikliklerin eşitlenmesi kaynakta doğrulandı. Yukarıdaki gerçek PiP açılış engeli sürüyor; açılmış PiP içinde tema kontrolü yapılmış sayılmaz.

Bağımsız inceleme kaynak ve mevcut beş görüntü üzerinden **ship** kararı verdi; maddi bulgu, düzeltme veya yeniden görüntü alma gereği bulmadı. Görüntüler tüm sayaç evreleri, büyütülmüş yazı, genişlemiş QR içeriği veya fiziksel cihaz davranışını kanıtlamaz. Tasarım dedektörü sonucu `[]` idi.

Güncel doğrulamada lint **0 hata** verdi; mevcut `home-sections.tsx` içindeki kullanılmayan `PartChip` uyarısı sürüyor. TypeScript kontrolü, üretim derlemesi ve diff kontrolü geçti. Test tercihleri geri yüklendi. Önceki işlev turunun bildirim/cihaz sınırları geçerlidir. Commit, push ve canlı dağıtım yapılmadı.

## Hızlı erişim düzeni

Son kullanıcı düzeltmesiyle odak/mola/oturum seçimi, otomatik devam, ses ve sessiz saat modal dışında da görünür yapıldı. 1280×800 masaüstünde sayaç yanında, 390×844 mobilde sayaç üstünde doğrulandı; yatay taşma yok. Mobilde ana başlatma düğmesinin altı 757 px, hızlı ayarlar alanının altı 399 px olarak ölçüldü. Hızlı odak seçiminin modala, modalda süre değişiminin hızlı seçime yansıması; otomatik devam ve sesin ortak durumu; sessiz saatin açılıp kapanması denendi. Aktif seans sırasında süre ve otomatik devam kilitli, ses ve sessiz saat erişilebilir kaldı. Test kaydı ve ses tercihi önceki kayda döndürüldü. Lint/tip kontrolü ve üretim derlemesi geçti.

## Pofi eşitliği turu

Başsız Chromium ile hızlı denemede 1280×800 ve 390×844: tanıtım penceresi ve tahmini süre; erken mola (oturum 0, odak dakikası eklendi); erken dönüşte kısmi yolculuk; tek erteleme; sayılan mola; mola bitince bekleme ve bildirim sorusu; varış. Konsol hatası ve yatay taşma yok. İki ayrı tarayıcı bağlamı eşleştirildi: başlat, mola ve dönüş diğer cihaza anında yansıdı. IdleDetector taklit edilerek uzaklaşınca otomatik mola, dönünce devam ve elle başlatılan molanın korunması doğrulandı. Gerçek IdleDetector izni, gerçek telefon ve Web Push denenmedi. Durum, zamanlayıcı ve kurtarma testleri, lint, tip kontrolü ve üretim derlemesi geçti.
