---
title: Bundle'lar ve arşivler
category: Eşitleme ve çoklu depo
order: 58
summary: Git'in klonlayabileceği tek dosyalık bir depo ya da açmak için git'e ihtiyaç duyulmayan bir zip.
keywords: bundle git bundle arşiv archive zip tarball tar gz dışa aktarma export hava boşluğu air gap çevrimdışı offline usb e-posta aktarım export-ignore gitattributes dosyadan klonlama clone from file aralık range
---

# Bundle'lar ve arşivler

Bir depoyu tek bir dosyaya koymanın iki yolu. Birbirinin yerine geçebilirmiş
gibi görünürler, geçmezler; bu sayfanın var olma sebebi de yanlış olanı
seçmektir.

| | Bir **bundle** | Bir **arşiv** |
|---|---|---|
| İçerdiği | Geçmiş: commit'ler, dallar, etiketler | Tek bir commit'teki dosyalar |
| Açan | `git clone` / `git fetch` — kendisi bir uzak depodur | Herhangi bir arşiv açma aracı |
| Sonrası | Ondan tekrar fetch edebilir, birleştirebilir, çalışmayı sürdürebilirsiniz | Hiçbir şey. O bir anlık görüntüdür |
| Şunun için | Ağı olmayan bir makineye iş taşımak | "Bana v2.1'deki kaynağı gönder" |

`⌘K` → **Depoyu bundle'la** ya da **Arşiv olarak dışa aktar**.

![Bir depoyu tek dosyaya bundle'lama, aralık seçeneği hazır halde](../../screenshots/export.webp)

## Bundle'lar

Bundle, git'in hiçbir ağın kapatamadığı bir boşluğa verdiği yanıttır: hava
boşluklu bir makine, bir USB bellek, bir e-posta eki, uçaktaki bir dizüstü.
Alan taraf `git clone work.bundle myrepo` çalıştırır ve sizin geçmişiniz ve
dallarınızla birlikte, o dosyadan sanki bir sunucuymuş gibi fetch eden gerçek
bir depo elde eder.

Üç kapsam:

| Kapsam | Ne taşınır | Boyut |
|-------|--------------|-------|
| **Her şey** | Her dal ve etiket, geçmişin tamamı | Deponun tamamı |
| **Tek bir dal veya etiket** | O ref ve eriştiği her şey | Genellikle çoğu |
| **Bir commit aralığı** | Yalnızca iki uç arasında kalan | Küçük |

**Aralık bundle'ı bir geçmiş yamasıdır, bir depo değil.** Uzak ucu bir
*önkoşul* olarak kaydeder: git, o commit'e zaten sahip olmayan bir depoda onu
açmayı reddeder, çünkü yeni commit'leri iliştirecek bir şey olmaz. Bu doğru
davranıştır ve ilk seferinde sürpriz olur. Karşı taraf çalışmanızın belli bir
noktaya kadarına zaten sahipse aralık kullanın — en son aldıkları etiket, ikinizin
birlikte dallandığı commit.

### Bir bundle almak

**Bundle içe aktar…** dosyayı okur, içindekileri listeler ve bu deponun onu
kullanıp kullanamayacağını en baştan söyler — önkoşullar eksikse, sonradan
git'in kendi diliyle hata vermek yerine kaç tane eksik olduğunu bildirir.

İçe aktarılan ref'ler uzak izleme ad alanında, **`bundle/…`** altına iner.
Yerelde hiçbir şey kımıldamaz: hiçbir dal fast-forward edilmez, hiçbir çalışmanın
üzerine yazılmaz. Ardından `bundle/main`'i kendi şartlarınızla, başka herhangi
bir uzak depodan gelen bir dalla yapacağınız gibi birleştirir, rebase eder ya da
checkout edersiniz.

Bunun yerine bir bundle'dan *yeni* bir depo başlatmak için terminalden dosyayı
klonlayın: `git clone work.bundle myrepo`. Gitcito açık bir depoya içe aktarır;
bir dosyadan klonlama yapmaz.

## Arşivler

`git archive` tek bir commit'teki ağacı zip ya da tarball olarak yazar. `.git`
yok, geçmiş yok, ondan fetch etmenin yolu yok — alıcının bir depo değil kaynak
kodu alması gerektiğinde asıl mesele de tam olarak budur.

| Seçenek | Ne yapar |
|--------|-------------|
| Referans | Dışa aktarılacak dal, etiket veya commit. Genelde doğru yanıt bir etikettir |
| Biçim | `zip`, `tar.gz` veya `tar` |
| Bir dizine sar | Üst düzey bir klasör ekler, böylece açmak dosyaları ortalığa saçmaz |
| Yalnızca bu yol | Tüm ağaç yerine tek bir alt dizini dışa aktarır |

### Bunu kullanmanın asıl sebebi export-ignore

Bir depo `.gitattributes` içinde yolları işaretleyebilir:

```
.github/     export-ignore
test/        export-ignore
*.psd        export-ignore
```

Bu yollar depoda kalmayı sürdürürken **her arşivin dışında bırakılır**. Bir
projenin, CI yapılandırması, fixture'ları ve 200 MB'lık tasarım dosyaları
olmadan bir yayın tarball'ı göndermesinin yolu budur — hem de kural birinin
yayın betiğinde değil, deponun kendisinde yaşar.

## Bilmeye değer sınırlar

- **Bundle, aralık kullanmadıkça tam bir kopyadır.** 2 GB'lık bir depoyu
  bundle'lamak 2 GB'lık bir dosya yazar ve bir klon kadar sürer.
- **Boş bundle'ları Gitcito değil git reddeder**: uçları arasında hiçbir şey
  olmayan bir aralık, işe yaramaz bir dosya yerine hata üretir.
- **İçe aktarma birleştirme yapmaz.** Ref'ler `bundle/…` altına gelir ve siz
  onlarla bir şey yapana kadar orada kalır.
- **Arşivin geçmişi yoktur**, dolayısıyla tekrar bir depoya dönüştürülemez.
  Alıcının commit atması gerekecekse bundle gönderin.
- **`export-ignore` yalnızca arşivleri etkiler.** Bir klondan, bir bundle'dan ya
  da geçmişten hiçbir şey gizlemez — onun için
  [bir dosyayı geçmişten kaldırma](history-purge.md) sayfasına bakın.

Ayrıca bakınız: [Eşitleme](syncing.md) · [Güvenli paylaşım](secure-share.md) ·
[Bir dosyayı geçmişten kaldırma](history-purge.md)
