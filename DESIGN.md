# DESIGN.md — sametbrr.com Tasarım Sistemi

> Bu dosya sitenin görsel ve hareket dilinin tek kaynağıdır. Token değerleri
> `src/app/globals.css` içindeki `@theme` bloğunda birebir karşılık bulur; ikisi
> ayrışırsa bu dosya doğrudur, CSS düzeltilir.

## 1. Konsept — "Canlı Sistem"

Site, çalışan bir sistemin sakin ve hassas kontrol paneli gibi hissettirmeli:
kıdemli mühendislik, danışmanlık güveni, AI tooling merakı.

| Kaynak | Aldıklarımız | Bilinçli olarak almadıklarımız |
|---|---|---|
| **keremcan.net** | Tam ekran "Sistem başlatılıyor" açılışı (oturumda bir kez), `01 / Bölüm` numaralandırma, sayaçlar, kelime kelime açılan manifesto, sabitlenip yatay kayan "Çalışmalar", numaralı hizmet listesi, zaman çizelgesi, "Çalışmaya hazır" ping noktası | Harf harf bölünmüş ve gecikmeli H1 (LCP için başlık ilk karede statik kalır) |
| **textmotion.dev (slot-text)** | Karakter hücrelerinde yuvarlanan metin: sayaçlar, dönen unvan, başlık çözülmesi, hover'da yuvarlanan etiketler | Renkli (chromatic) yuvarlanma |
| **mixdesign.dev/wrap/rayo** | Bento kart hiyerarşisi (8+4 / 4+4+4), büyük tipografi, ters yönlü çift marquee, `radius-l` kartlar, kart içi gradient ışıklar, `scale-in` kart girişi, Lenis yumuşak kaydırma, `/01` numaralı listeler | Özel imleç, yüzen dekoratif görseller, ağır GSAP zinciri |

Kurallar: **İçerik önce görünür, hareket sonra süsler.** Animasyon yalnızca
`transform` ve `opacity` üzerinde çalışır. Her animasyonun bir
`prefers-reduced-motion` karşılığı vardır.

## 2. Renk token'ları

### Zemin ve yüzeyler
| Token | Değer | Kullanım |
|---|---|---|
| `--color-void` | `#050505` | Sayfa zemini (Zero Black) |
| `--color-surface-1` | `#0D0D0D` | Bölüm zemini, kart zemini |
| `--color-surface-2` | `#141414` | Yükseltilmiş kart, input |
| `--color-surface-3` | `#1B1B1B` | Hover yüzeyi |
| `--color-line` | `rgb(255 255 255 / 0.08)` | Kenarlık, ayraç |
| `--color-line-strong` | `rgb(255 255 255 / 0.14)` | Hover kenarlık, input |

### Metin
| Token | Değer | `#050505` üzerinde kontrast | Kullanım |
|---|---|---|---|
| `--color-fg` | `#EDEDED` | ~17:1 | Başlık, gövde |
| `--color-fg-muted` | `#A1A1A1` | ~8:1 | İkincil metin |
| `--color-fg-subtle` | `#6B6B6B` | ~3.8:1 | **Yalnızca** ≥18px veya dekoratif (numara, ayraç) |

### Vurgu
| Token | Değer | Rol | Kural |
|---|---|---|---|
| `--color-ghost` | `#D7FFE0` | Ghost Green — birincil vurgu, mühendislik hissi | Metinde serbest (~19:1) |
| `--color-forest` | `#1F6F43` | Forest Code — kod/terminal dokunuşu, ince dolgu | Metin rengi olarak kullanılmaz |
| `--color-forest-deep` | `#0E2A1B` | Forest zemin tonu (rozet, kod bloğu) | — |
| `--color-quantum` | `#2457FF` | Quantum Blue — 3D sahne ve ortam ışığı | Gövde metni olarak **kullanılmaz** (~3.8:1). Buton zemininde beyaz metinle ~5.4:1 |
| `--color-quantum-hover` | `#3A6BFF` | Buton hover | — |
| `--color-ice` | `#DFF7FF` | Ice Glass — parlama, cam kenarı, 3D düğüm | — |

### 2.1 Aydınlık tema

Tema `<html data-theme>` ile belirlenir. İlk boyamadan önce çalışan satır içi script, önce kayıtlı tercihe, yoksa işletim sistemi tercihine bakar.
Nav'daki güneş/ay düğmesi seçimi `localStorage`'a yazar; seçim yapılmadıysa sistem değişikliği izlenir.
Bileşenler yalnızca token kullandığı için aydınlık tema sadece değişken değerlerini ezer:

| Token | Karanlık | Aydınlık |
|---|---|---|
| `--color-void` | `#050505` | `#F6F6F2` (kâğıt) |
| `--color-surface-1/2/3` | `#0D0D0D` / `#141414` / `#1B1B1B` | `#FFFFFF` / `#F0F0EA` / `#E8E8E1` |
| `--color-line` / `-strong` | beyaz %8 / %14 | siyah %8 / %15 |
| `--color-fg` / `-muted` / `-subtle` | `#EDEDED` / `#A1A1A1` / `#6B6B6B` | `#0B0B0B` / `#54544E` / `#8A8A83` |
| `--color-ghost` (vurgu metni) | `#D7FFE0` | `#137A43` (~5:1) |
| `--color-ice` | `#DFF7FF` | `#0D4F73` |
| `--color-primary` / `-hover` / `on-` | Ghost / `#F0FFF3` / void | `#0F5C34` / `#137A43` / `#F4FFF7` |

Canvas sahneleri renklerini çalışma anında CSS token'larından okur. Tema değişince yeniden kurulur;
aydınlık temada additive ışık yerine normal karışım kullanılır (beyaz zemine ışık eklenemez).

### Birincil (aksiyon) rengi
| Token | Değer | Kullanım |
|---|---|---|
| `--color-primary` | `var(--color-ghost)` | Butonlar, odak halkası, form odağı, aktif vurgular |
| `--color-primary-hover` | `#F0FFF3` | Buton hover |
| `--color-on-primary` | `var(--color-void)` | Birincil zemin üstündeki metin (~19:1) |

Aksiyon rengi Ghost Green'dir. Quantum Blue yalnızca 3D sahne ve hero ortam ışığında kalır.
Maviye geri dönmek için bu üç token'ı `--color-quantum*` ve beyaz metne çevirmek yeterlidir.

### Cam ve ışık
| Token | Değer |
|---|---|
| `--glass-bg` | `rgb(223 247 255 / 0.035)` |
| `--glass-border` | `rgb(223 247 255 / 0.10)` |
| `--glass-blur` | `16px` (yalnızca nav ve modal; hareketli canvas üstünde kullanılmaz) |
| `--glow-quantum` | `radial-gradient(600px circle at var(--mx) var(--my), rgb(36 87 255 / 0.18), transparent 40%)` |
| `--glow-ghost` | `radial-gradient(400px circle at var(--mx) var(--my), rgb(215 255 224 / 0.10), transparent 40%)` |

## 3. Tipografi

- **Sans:** Geist (`latin-ext` zorunlu — ş, ğ, ı, İ). **Mono:** Geist Mono.
- Başlıklar sıkı aralıklı, gövde rahat; etiketler mono + büyük harf.

| Token | Boyut | Satır / aralık | Kullanım |
|---|---|---|---|
| `display` | `clamp(2.75rem, 7.2vw, 6.5rem)` | 0.95 / -0.045em | Hero H1 |
| `h2` | `clamp(2.25rem, 5vw, 4.25rem)` | 1.0 / -0.035em | Bölüm başlığı |
| `h3` | `clamp(1.25rem, 2vw, 1.625rem)` | 1.2 / -0.02em | Kart başlığı |
| `body-lg` | `1.125rem` | 1.6 | Giriş paragrafı |
| `body` | `1rem` | 1.6 | Gövde |
| `label` | `0.75rem` mono, uppercase | 1 / 0.14em | `01 / HİZMETLER`, rozet |

## 4. Boşluk, ızgara, köşe

- Taban birim 4px. Bölüm dikey boşluğu: `clamp(6rem, 12vw, 10rem)`.
- Konteyner: `max-width 1280px`, yan boşluk `1.25rem` → `2.5rem` (md+).
- Izgara: 12 kolon, `gap 1rem` (mobil) / `1.25rem` (md+).
- Bento kalıpları: `7+5` (büyük kart iki satır kaplar) ve tam genişlik yatay kart (`wide`). Mobilde tek kolon.
- Köşe: `sm 8px` · `md 14px` · `lg 24px` (kart) · `xl 32px` (büyük bento) · `full`.
- Gölge yok. Derinlik = yüzey tonu + 1px kenarlık + imleç ışığı.

## 5. Hareket token'ları

| Token | Değer |
|---|---|
| `--dur-instant` | `120ms` — basma, toggle |
| `--dur-fast` | `200ms` — hover renk/kenarlık |
| `--dur-base` | `400ms` — küçük giriş |
| `--dur-slow` | `700ms` — kart/başlık girişi |
| `--dur-reveal` | `900ms` — boot sayacı, büyük reveal |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` (out-expo, varsayılan) |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` |
| `spring` | `stiffness 300, damping 30` (manyetik buton) |
| Stagger | kelime `40ms` · kart `80ms` · liste satırı `60ms` |
| Giriş mesafesi | `y: 24px` (metin) · `scale: 0.96` (kart) |
| Tetik | Görünür alana %20 girince, **bir kez** |

## 6. Animasyon haritası — nerede, ne

| # | Yer | Animasyon | Tetik | Süre / eğri | Reduced motion |
|---|---|---|---|---|---|
| G1 | Tüm sayfa | Lenis yumuşak kaydırma (`lerp 0.1`) | — | — | Kapalı, native scroll |
| G2 | Sayfa üstü | 1px Ghost Green kaydırma ilerleme çubuğu (`scaleX`) | Scroll | Anlık | Gizli |
| G3 | Nav | Cam hap; 80px sonra belirir, aşağı kaydırınca gizlenir, yukarı kaydırınca gelir; aktif bölüm göstergesi kayar | Scroll | `fast` / `ease-out` | Sabit, göstergesiz |
| B1 | Açılış ekranı | Tam ekran: `000 → 100%` yuvarlanan sayaç (140 ms ritim, %75 doğrusal + %25 ease-in-out), bölüm sırasıyla 5 satır boot log (profil → hizmetler → projeler → kariyer → hazır) (0–100% arasına eşit dağılır, `✓ sistem hazır` tam 100%'de), ilerleme çizgisi; ardından panel yukarı kalkar (900 ms) ve `site:booted` olayı yayınlanır | İlk ziyaret (oturum başına bir kez), ses seçiminden sonra | 2,7 sn + 0,4 sn bekleme + 0,9 sn | Hiç gösterilmez (`<head>` script'i boyamadan önce atlar); JS çalışmazsa CSS 5 sn sonra kaldırır |
| H2 | Hero — H1 | **İlk karede tam görünür (LCP).** Beyaz kısım: harf harf ilerleyen dalga (−0,09em kalkış + Ghost Green flaş, 22 ms/harf); gradyan kısım: üzerinden geçen ışık bandı + yavaş gradyan kayması. Hover'da dalga tekrar oynar | Açılış bitince · hover | 900 ms + 22 ms/harf · parlama 1,6 sn | Statik gradyan |
| H3 | Hero — alt başlık + CTA | Fade-up (`y 24 → 0`) | Mount | `slow`, 120ms gecikme | Anında görünür |
| H4 | Hero — durum çipi | "Yeni projelere açık" + yeşil ping noktası | Sürekli | 2s | Statik nokta |
| H5 | Hero — portre | Çekirdekten portreye toplanma → tarama çizgisiyle gerçek fotoğrafa dönüş → imleç merceği (bkz. §7) | Yüklemeden sonra idle | ~4,5 sn intro | Statik fotoğraf |
| T1 | 02 / Hizmetler başlığı | **Decode:** rastgele harflerden kelime kelime çözülme (slot-text) | Görünür olunca, bir kez | 16 ms/karakter | Statik metin |
| T5 | 04 / Süreç başlığı | **Daktilo:** harf harf yazılır, blok imleç yanıp söner; yazılmamış kısım yer tutar (kayma yok) | Görünür olunca | 42 ms/harf | Statik metin |
| T6 | 05 / Açık Kaynak başlığı | **Flip:** harfler X ekseninde −95° → 0° dönerek oturur | Görünür olunca | 700 ms, 25 ms/harf | Statik metin |
| T7 | 06 / Deneyim başlığı | **Focus:** harf aralığı 0,32em → normal, blur 12px → 0 (objektif odaklanması) | Görünür olunca | 1,1 sn | Statik metin |
| T8 | 06.1 / Eğitim başlığı | **Blur words:** kelime kelime bulanıktan netleşip yükselme | Görünür olunca | 800 ms, 120 ms/kelime | Statik metin |
| T9 | 07 / İletişim başlığı | **Pop:** harfler küçük ve yeşil çıkar, yaylı büyüyüp metin rengine döner | Görünür olunca | yay + 30 ms/harf | Statik metin |
| C1 | 03 / Çalışmalar başlığı | **Rise:** kelimeler maskeden yükselir | Görünür olunca | `slow` | Statik metin |
| T2 | Sayaçlar (hero, Hakkımda, vaka) | Odometre: 0 → değer, ~8 adımda; yalnız değişen haneler yuvarlanır | Hero: açılış bitince · diğerleri: görünür olunca | 110 ms/adım | Son değer |
| T3 | Hero — unvan satırı | Unvanlar arasında karakter karakter dönüş | Açılış bitince, 2,6 sn'de bir | 22 ms stagger | İlk unvan |
| T4 | Nav linkleri, CTA'lar | Hover/focus'ta etiket kendi üstünden yuvarlanır | Hover/focus | 260 ms | Kapalı |
| H6 | Hero — "Kaydır" | Dikey çizgi içinde akan nokta | Sürekli | 1.8s | Gizli |
| H7 | Birincil CTA | Manyetik çekim (±6px) + hover'da ok sağa kayar | Pointer | `spring` | Sadece renk |
| M1 | Marquee (teknoloji + ürünler) | İki satır, ters yön, sonsuz `translateX`; hover'da durur; kenarlarda maske solması | Sürekli | 40s / 50s | Durur, statik liste |
| A1 | 01 / Hakkımda — manifesto | Kelime kelime `opacity 0.15 → 1`, scroll'a bağlı | Scroll ilerlemesi | — | Tam opak |
| A3 | 01 / Hakkımda — model çekirdeği | AI çekirdeği + araç yörüngesi, istek/yanıt akışı (bkz. §7.2) | Görünür olunca çalışır | Sürekli | SVG poster |
| A2 | 01 / Hakkımda — sayaçlar | `0 → N` count-up (5 yıl, ürün, OSS, paket) | Görünür olunca | 1.2s `ease-out` | Son değer |
| S1 | 02 / Hizmetler — bento | Kartlar `scale 0.96 + opacity` ile, 80ms stagger | Görünür olunca | `slow` | Anında |
| S2 | 02 / Hizmetler — kart | İmleci takip eden kenarlık ışığı (`--glow-quantum`, CSS değişkeni) | Pointer | Anlık | Kapalı |
| S3 | 02 / Hizmetler — AI kartı | Mini terminal: MCP akışı satır satır yazılır, imleç yanıp söner | Görünür olunca, döngü | 40ms/karakter | Tam metin statik |
| W1 | 03 / Çalışmalar (md+) | Bölüm sabitlenir, kartlar dikey scroll ile yatay kayar; `00 / 05` sayaç + ilerleme çubuğu | Scroll | Scroll'a bağlı | Dikey liste |
| W2 | 03 / Çalışmalar — kart | Hover: görsel alanı `scale 1.03`, mimari mini diyagramın çizgileri çizilir (`pathLength 0 → 1`), ok kayar | Hover/focus | `slow` | Çizgiler hazır |
| P1 | 04 / Süreç | Adımları bağlayan çizgi scroll ile dolar; aktif adım numarası Ghost Green olur | Scroll | Scroll'a bağlı | Dolu çizgi |
| O1 | 05 / Açık kaynak — liste | Satır hover'da zemin soldan dolar (`scaleX`), ok çapraz kayar, `/01` numarası renk alır | Hover/focus | `base` | Sadece renk |
| E1 | 06 / Deneyim + 06.1 / Eğitim | Aynı zaman çizelgesi: çizgi scroll ile dolar; her kayıt çizgi üstünde logo kutucuğu (mono logo tema rengiyle maskelenir, renkli logo olduğu gibi, yoksa monogram); güncel kayıtta nabız halkası | Scroll + görünür olunca | `slow` | Dolu çizgi, statik |
| C2 | İletişim — e-posta kopyala | İkon `copy → check` morph, etiket "Kopyalandı" | Tık | `fast` | Sadece etiket |
| C3 | İletişim — form | Odakta kenarlık Quantum ışığı; gönderim: `idle → spinner → ✓ çizimi` | Etkileşim | `base` | Sadece metin durumları |
| F1 | Footer | İstanbul yerel saati canlı (mono), "Başa dön" | Sürekli | 1s | — |
| D1 | Vaka detay | Mimari diyagram düğümleri sırayla belirir, etki metrikleri count-up | Görünür olunca | `slow` | Anında |

## 7. Hero — Nöral Portre

Hikâye: **model → insan.** Sayfa açılınca AI çekirdeği bir portreye dönüşür, sonra gerçek fotoğrafa çözülür.

| Zaman | Ne olur |
|---|---|
| 0–0,2 sn | Parçacıklar küçük bir çekirdek kürede toplanmış halde belirir |
| 0,2–2,2 sn | ~16 bin parçacık rastgele gecikmelerle portredeki piksellerine uçar (girdaplı geçiş) |
| 2,6–4,2 sn | Tarama çizgisi yukarıdan aşağı iner; geçtiği yerde parçacıklar çözülür, **gerçek fotoğraf** açığa çıkar |
| sonrası | İmleç fotoğrafın üzerindeyken 0,15 birimlik bir **mercek** o bölgeyi yeniden parçacığa çevirir |

- **Kaynak:** Fotoğraf macOS Vision ile arka plandan ayrıldı; maske 2,5px daraltılıp 1,2px yumuşatıldı (yeşil hale kalmasın).
  Parçacıklar 190×190 ızgarada örneklenir; renkleri tema tonuyla fotoğrafın kendi renginin karışımıdır,
  böylece fotoğrafa geçiş dikişsiz olur.
- **LCP güvenliği:** Açığa çıkan fotoğraf HTML `<img>` değil, aynı WebGL sahnesinde doku olarak çizilir;
  geç açılan büyük bir görsel LCP'yi 4 sn'ye taşımaz. LCP hero başlığında kalır.
- **Tema:** Karanlıkta hologram (additive), aydınlıkta noktalama baskı (normal blending). Tema değişince intro tekrar oynamaz.
- **Yedek:** Reduced-motion / GPU yok / yavaş cihaz / JS yok → aynı kadrajda statik fotoğraf.

### 7.2 Model Çekirdeği + Araç Yörüngesi (01 / Hakkımda)

Bir AI ajanının MCP üzerinden araçları çağırmasını görselleştirir; konumlandırmanın (AI tooling + yazılım mimarisi) birebir karşılığıdır.

- **Model çekirdeği:** Fibonacci küresi üzerinde 2.200 parçacık. 3D simplex noise ile "nefes alır";
  rastgele nöronlar kısa süre parlayıp söner. Renk: `ice` → `ghost`, arka yüz sönük.
- **Araç yörüngeleri:** Üç eğik halka (`rgb(255 255 255 / 0.09)`), üzerinde 12 araç uydusu (API, DB, Git, Docs…) farklı hızlarda döner.
- **Araç çağrısı:** ~0.35–1 sn aralıkla çekirdekten bir uyduya kuyruklu bir **istek** (Quantum Blue) gider,
  uydu Ghost Green parlar, **yanıt** (Ghost Green) çekirdeğe döner. Aynı anda en fazla 6 çağrı.
- **Token akışı:** 260 parçacık çekirdekten eğik bir disk üzerinde sarmal çizerek dışarı akar ve söner (tamamı GPU'da).
- **Etkileşim:** İmleçle ±8° parallax; imleç hareketi çekirdeğin "düşünme" enerjisini (dalga genliği ve hızı) artırır,
  durunca sakinleşir. Hakkımda kartında scroll'a bağlı geri çekilme kapalıdır (`scrollPull: false`).
- **Teknik:** saf three.js, üç `Points` katmanı (çekirdek, token, dinamik uydu+çağrı) + `LineLoop` halkalar; ek blending.
  Poster aynı geometriden SVG olarak sunucuda üretilir (`core-layout.ts` ortak).
- **Bütçe:** DPR ≤ 1.5; ekran dışında veya sekme gizliyken render durur; GPU'suz (yazılım) renderer'da hiç başlamaz;
  ilk 30 karenin ortalaması 45 ms'yi aşarsa kendini kapatır; `deviceMemory < 4` / `hardwareConcurrency < 4` /
  reduced-motion → yalnızca SVG poster.

## 8. Ses efektleri

Kısa, belirgin dijital terminal tonları. Açılış ve onaylar orta seviyede; hover ve başlıklar daha düşük. Müzik veya uzun ses yok; her efekt ≤ 300 ms.
Hepsi Web Audio ile kodda sentezlenir (`src/lib/sound.ts`), ses dosyası yok.

- **Varsayılan açık**, tercih `localStorage.sound`'da. Nav'daki EQ düğmesi veya `M` tuşu açar/kapatır.
- Tarayıcılar sesi ilk tıklama/tuştan önce başlatmaz ve sitenin isteyebileceği bir "ses izni" yoktur;
  o ana kadar istenen sesler **atılır, sıraya alınmaz**.
- **Açılışta ses sorusu:** Asıl ses anı açılış olduğu için açılış ekranı `000%`'da durup sorar:
  *"Bu deneyim sesli tasarlandı."* → **Sesli başlat** (odaklı; Enter) / **Sessiz devam** (Esc).
  Bu tıklama tarayıcının ses kilidini açar; sayaç ancak seçimden sonra döner ve sesli seçilirse en baştan duyulur.
  "Sessiz devam" kalıcıdır (sonraki oturumlarda sorulmaz, nav düğmesiyle geri açılır).
  6 sn cevap gelmezse açılış sessiz devam eder; sekme oturumuna geçici susturma yazılır, kalıcı tercih değiştirilmez. Ses düğmesinden yeniden açılabilir. JS açılınca 5 sn'lik CSS yedeği devre dışı kalır.
- Mouse hover: hafif `hover` bipi (150 ms sınır); tıklama: ayrı `tap` onayı. Dokunmatik cihazlarda hover sesi yok. Sayfadaki odometreler ve harfler ayrı ayrı ses üretmez. Aynı ses en az 80 ms aralıkla çalar. Başlık grubu 250 ms aralıkla, başlık başına yalnız ilk görünüşte çalar; bekleyen ses kuyruğu yok. Ses tercihi hareket tercihinden bağımsızdır.

| An | Ses |
|---|---|
| Açılış sayacı her artışta | `tick` — perdesi ilerlemeyle yükselir |
| Açılış sayacı 100% | `ting` — çift terminal onayı |
| Açılış paneli kalkar | `whoosh` — kısa tonal geçiş |
| Portrede tarama çizgisi başlar | `scan` — tonal "zip" |
| Bölüm başlığı (decode / rise / type / flip / focus·blur / pop) | `decode` · `rise` · `type` · `flip` · `swell` · `pop` — başlık başına bir kez, aynı anda görünen başlıklar çakışmadan |
| Link / düğme / proje kartı üzerine gelme | `hover` — düşük seviyede |
| Nav linkleri, CTA'lar, form gönder | `tap` — tıklamada (`data-sound`) |
| Tema / ses düğmesi | `toggle` |
| E-posta kopyala, form başarılı | `success` |

## 9. Bileşen envanteri

`Container` · `Section` (numaralı başlıklı) · `Label` · `Button` (primary/ghost, manyetik) ·
`GlowCard` (imleç ışığı) · `BentoGrid` · `Marquee` · `Counter` · `WordReveal` ·
`Reveal` (genel giriş) · `RollReveal` / `RollCounter` / `RollCycle` / `RollLabel` (slot-text) · `BootScreen` · `TimelineRail` + `LogoTile` · `CopyButton` · `StatusChip` · `ScrollProgress` · `Nav` ·
`HeroScene` + `CorePoster` (3D) · `NeuralPortrait` · `ThemeToggle` · `SoundToggle` · `ArchDiagram` (SVG) · `CaseCard` · `ContactForm` · `LocalClock`.

## 10. Erişilebilirlik ve performans kuralları

- Tüm etkileşimli öğelerde görünür odak halkası: `2px ghost`, `offset 2px`.
- Dekoratif hareketli öğeler `aria-hidden`; `WordReveal` metni tek parça okunur (`aria-label`).
- Lighthouse hedefi: performance ≥ 90 (mobil), accessibility ≥ 95.
- İlk JS (3D chunk hariç) ≤ 170 KB gz. Cal.com embed'i yalnızca tıklamayla yüklenir.
- Fontlar `next/font` ile self-host, `display: swap`.

### 8.1 Onaylanan hareket davranışı (8 Ekim 2026)

Sayaçlı açılış sekme oturumunda bir kez: 2700 ms sayaç, 380 ms bekleme, 900 ms çıkış. Boot tamamlandı olayı ancak çıkış bitince yayınlanır. Yatay sabitlenen projeler, teknik başlık efektleri ve kart dönüşleri korunur. Hareketi azalt tercihi açıkken sayaç ve 3D çalışmaz, projeler ızgara olur, başlıklar 160 ms solmayla okunur ve kart yüzleri dönüş yerine 160 ms solmayla değişir. Tercih değişiklikleri yeniden yükleme istemez.
