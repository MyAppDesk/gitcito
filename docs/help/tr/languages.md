---
title: Diller ve sağdan sola
category: Kendinize göre uyarlayın
order: 102
summary: Arayüz dilinizi bayrağı ve kendi adıyla seçin, Arapça ve İbranice için aynalanmış yerleşimle.
keywords: dil diller yerel ayar locale i18n uluslararasılaştırma çeviri rtl sağdan sola arapça ibranice aynalama yön bayrak ingilizce ispanyolca almanca fransızca portekizce italyanca felemenkçe lehçe türkçe rusça ukraynaca çince japonca korece
---

# Diller ve sağdan sola

Gitcito'nun arayüzü çevrilmiştir. Dil, işletim sisteminin değil Gitcito'nun bir
ayarıdır — İngilizce bir macOS kurulumundaki, Japonca okumayı tercih eden bir
geliştirici burayı ayarlar; İbranice bir sistemdeki, uygulamayı İngilizce
isteyen bir geliştiricinin tercihi de geçersiz kılınmaz.

**Ayarlar → Genel → Dil.**

![Dil seçici](../../screenshots/languages.webp)

## Kutudan çıkanlar

| | | | |
|---|---|---|---|
| English | Español | Deutsch | Français |
| Português (Brasil) | Italiano | Nederlands | Polski |
| Türkçe | Русский | Українська | 简体中文 |
| 日本語 | 한국어 | العربية | עברית |

Seçicideki her satır kendi dilinde yazılıdır. Korece arayan biri 한국어'yi
tarar; terk etmeye çalıştığı bir dildeki "Korean" kelimesini değil.

### Bayraklar hakkında

Bayrak bir ülkeyi adlandırır; yerel ayar bir dili. İkisi gerçekten de
örtüşmez — Arapça yirmiden fazla devlette resmî dildir, Portekizce ise iki
kıtadadır. Simgeler, her işletim sisteminin dil seçicisinin kullandığı aynı
uzlaşımı izler: yerel ayarın birincil bölgesi. Orada *bir bakışta tanınmak*
için bulunurlar, bir dilin kime ait olduğu konusunda iddia ortaya atmak için
değil.

Emoji yerine bilinçli olarak vektör çizim kullanılıyor. Windows hiç bayrak
emojisi barındırmaz — `🇩🇪` orada içinde "DE" harfleri olan bir kutu olarak
görünür.

## Sağdan sola

Arapça ve İbranice bütün arayüzü aynalar: kenar çubuğu sağa geçer, paneller ve
araç çubukları ters döner, bir yeri işaret eden simgeler öbür yönü gösterir.

Geçiş anında olur, yeniden başlatma gerektirmez.

![Yerleşimi aynalanmış hâliyle Arapça Gitcito](../../screenshots/rtl.webp)

### Bilinçli olarak aynalanmayanlar

Bazı içerikler hangi dili okuyor olursanız olun soldan sağadır. Bunları
aynalamak düpedüz yanlış olurdu, dolayısıyla oldukları gibi kalırlar:

| Soldan sağa kalan | Neden |
|-----------|-----|
| Commit grafiği | Şerit konumları piksel cinsinden hesaplanır; aynalanmış bir kapsayıcı çizilen çizgilerle çelişirdi |
| Diff'ler ve dosya içerikleri | Kod soldan sağadır ve aynalanmış bir diff okunmaz |
| Blame ve çakışma çıktısı | Aynı sebep — metin kaynak koddur, düzyazı değil |
| Tümleşik terminal | Kendi ızgarasını çizer; git'in çıktısı soldan sağadır |
| Yollar, SHA'lar, ref'ler ve komutlar | `refs/heads/main` yalnızca tek yönde okunur |

Bunların her biri yalıtılmıştır; böylece içlerinden birinde geçen bir Arapça
parça — bir dal adı, bir commit mesajı, bir dosya adı — çevresindeki metnin
sırasını bozamaz.

### Sınırlar

Bu özellik nerede durduğu konusunda dürüsttür:

- **Commit mesajlarının, dal adlarının ve dosya içeriklerinin yönü Gitcito
  tarafından asla değiştirilmez.** Yazarları nasıl yazdıysa öyle gösterilirler.
  Soldan sağa yalıtılmış bir listedeki İbranice bir commit mesajı İbranice
  olarak görünür, ama onu barındıran satır ona uymak için ters dönmez.
- **Üçüncü taraf yüzeyler kendi yönlerini korur** — terminal xterm'dir ve
  Markdown önizlemeleri belgeyi yazıldığı gibi işler.
- **Karışık yönlü dosya adları zordur.** İngilizce bir ağacın içindeki Arapça
  bir klasörü barındıran bir yol, yeniden sıralanmak yerine yalıtılır; bu
  doğrudur ama ilk seferinde yine de şaşırtabilir.

## Bu el kitabı da çevrildi

Yalnızca düğmeler değil. Okuduğunuz her sayfa, yukarıdaki listedeki her dilde
var — açıklamalar, her seçeneğin ne yaptığını gösteren tablolar, bir özelliğin neyi
yapmayı reddettiğini söyleyen bölümler. Arayüz dilini değiştirmek el kitabını da
birlikte değiştirir; hem uygulamada hem de web sitesinde.

Bir çevirinin eksik olmasına izin var. Bir sayfa henüz çevrilmediyse, eksik bir
sayfa yerine İngilizcesini alırsınız; kenar çubuğu da her dilde aynı biçimi
koruduğu için bir ekran görüntüsü ya da bir yönerge gördüğünüzle örtüşmeye devam
eder.

Web sitesinde her sayfa, sizi okumakta olduğunuz sayfada bırakan bir dil
değiştirici taşır; çünkü dil değiştirmek baştan başlamakla aynı şey değildir.

**Ne makine çevirisi, bunun bedeli ne.** İngilizce ile İspanyolca elle yazıldı.
Gerisini bir model, bir sözlükçeye bakarak çevirdi; sonra bir betik denetledi:
her sayfa, her bağlantı, her görsel yolu, her kod bloğu İngilizcesiyle bayt bayt
karşılaştırıldı. Bu, bozuk yapıyı yakalar. Doğru ama tahta gibi duran bir cümleyi
yakalamaz. Bir sayfa sizin dilinizde kötü okunuyorsa, bu bildirilmeye değer bir
hatadır.

## Dil eklemek

Sözlükler `src/renderer/src/i18n/` altında her yerel ayar için tek dosya
hâlindedir ve İngilizce dosya, diğer hepsinin karşısında tip denetiminden
geçtiği referanstır — eksik bir anahtar derleme hatasıdır, sessizce İngilizceye
düşme değil. Test paketi ayrıca bir metnin araya kattığı her `{placeholder}`
öğesinin çeviride hayatta kaldığını da denetler; böylece bir cümle başka bir
dile geçerken commit sha'sını kaybedemez.

El kitabı da aynı biçimde çalışır: `docs/help/` İngilizce sayfaları,
`docs/help/<locale>/` ise her çeviriyi tutar; sayfa başına tek dosya, aynı dosya
adıyla. `npm run lint:docs`, çevrilmiş her sayfanın bir İngilizce aslı olduğunu,
front matter'ının eksiksiz olduğunu ve bağlantılarıyla görsellerinin bir dizin
daha derinden çözüldüğünü denetler.

Katkılar memnuniyetle karşılanır — birer sayfa hâlinde gelmesi gayet iyidir ve
sakil bir çeviriyi düzeltmek, eksik olanı eklemek kadar değerlidir.

**Ayrıca bakınız:** [Temalar ve görünüm](themes.md) · [Profiller](profiles.md)
