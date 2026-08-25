---
title: Menü çubuğu
category: Buradan başlayın
order: 5
summary: Gitcito'nun macOS menülerinde ne var ve Windows ile Linux'ta neden menü çubuğu yok.
keywords: menü çubuğu menü uygulama dosya düzen görünüm pencere yardım depo macos yerel hakkında çık
---

# Menü çubuğu

Menü çubuğu, başka hiçbir yüzeyin iyi yanıtlamadığı bir soruyu yanıtlar: *bu
uygulama neler yapabiliyor?* [Komut paleti](search.md) ne aradığınızı
bildiğinizde daha hızlıdır, [kopya kâğıdı](keyboard.md) da tuşları listeler —
ama ikisi de göz gezdirilecek yerler değil. Menüler öyle.

İçlerindeki her şeye pencerenin içinden de ulaşılır. Hiçbir şey yalnızca menüde
değildir ve bu kasıtlıdır: yalnızca menüde yaşayan bir özellik, Windows ve Linux
kullananların sahip olmadığı bir özelliktir.

## Ne nerede

| Menü | İçeriği |
|---|---|
| **Gitcito** | Hakkında, güncelleme denetimi, [Ayarlar](repo-settings.md), standart gizleme ve çıkış öğeleri |
| **Dosya** | Yeni sekme, depo açma veya [klonlama](cloning.md), son kullanılanları açma, sekme kapatma ve geri açma |
| **Düzen** | Kes, kopyala, yapıştır, geri al — klavyenizin zaten yaptığı metin düzenleme — artı [kodda arama](search.md) |
| **Görünüm** | Komut paleti, kenar çubuğu ve panel anahtarları, [terminal](terminal.md), [mission control](mission-control.md), [kasa](vault.md), yakınlaştırma |
| **Depo** | Fetch, pull, push, commit, stash, yeni dal, [pull request](hosting.md), geri al, Finder'da göster, depo ayarları |
| **Pencere** | Simge durumuna küçült, yakınlaştır, tümünü öne getir |
| **Yardım** | Bu el kitabı, kopya kâğıdı, yenilikler, lisanslar, sorun bildirme |

Etkin sekme bir git deposu değilse Depo menüsü tümüyle soluklaşır, geri alınacak
bir şey yoksa **Geri al** soluklaşır — menü, uygulamanın şu anda neye izin
verdiğinin okunabilir bir özetidir.

## Gösterilen, el konulmayan kısayollar

Her öğenin yanındaki tuşlar, gerçekten atadığınız tuşlardır. Ayarlar'da
<kbd>⌘K</kbd> tuşunu yeniden atayın, Görünüm menüsü bunu söyler.

Bu, menünün o birleşimleri sahiplenmeden *göstermesi* sayesinde çalışır:
klavyeyi hâlâ Gitcito'nun kendi işleyişi yönetir; bir kısayolun imlecin
bulunduğu yere göre farklı davranabilmesi de bundandır. Bu yolla
gösterilemeyecek tek şey Gitcito'ya ait olmayan bir kısayoldur — <kbd>⌘F</kbd>
okuduğunuz dosyaya veya diff'e aittir, bu yüzden hiçbir menü öğesi onu
sahiplenmez.

## Sınırlar

- **Yalnızca macOS.** Windows ve Linux'ta pencere çerçevesizdir — başlık
  çubuğunu Gitcito çizer ve menü çubuğuna yer kalmaz. O platformlarda aynı
  komutlar [komut paleti](search.md) ve [klavye kısayolları](keyboard.md)
  üzerinden gelir.
- **Yeniden yükle ve Geliştirici araçları yalnızca geliştirme
  derlemelerinde görünür.** Yeniden yüklemek açık her sekmenin durumunu atar; bu
  da yayınlanmış bir sürümün Yakınlaştır'ın yanında sunacağı bir şey değildir.
- **Son kullanılanları aç en fazla on depo listeler**, en yeniden başlayarak, ve
  [karşılama ekranının](getting-started.md) gösterdiği listeyi izler.
- **Kapatılan sekmeyi geri aç asla soluklaşmaz.** Kapatılan sekme yığını yalnızca
  oturum boyunca yaşar ve menü onu göremez; geri açılacak bir şey yokken seçmek
  hiçbir şey yapmaz.
