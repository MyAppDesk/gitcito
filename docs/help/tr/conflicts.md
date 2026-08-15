---
title: Çakışmaları çözme
category: Değişikliklerle çalışma
order: 32
summary: Hangi tarafın hangisi olduğunu söyleyen üç panelli bir çakışma çözücü.
keywords: çakışma conflict çözücü resolver merge conflicts ours theirs bizimki onlarınki işaretçi marker üç yönlü three-way rerere kaydedilmiş çözüm hatırla tekrar oynat
---

# Çakışmaları çözme

Bir merge, rebase, cherry-pick ya da revert durduğunda bir bant **neyin**
durduğunu ve **neyle ne arasında** durduğunu söyler — sadece "çakışma" değil,
"`feature/x`, `main` içine birleştiriliyor".

![Çakışma çözücü](../../screenshots/conflict-resolver.webp)

## Bu neden çakışıyor

Başlıktaki **Bu neden çakışıyor**, dallar ayrıldığından beri bu dosyaya dokunan
commit'leri her taraf için ayrı ayrı listeler — `git log --merge` ile; git'in
yıllardır sunduğu ama kimsenin bulamadığı komut.

![Çakışan dosyaya dokunan, her iki taraftan gelen commit'ler](../../screenshots/conflict-why.webp)

İşaretçiler neyin çarpıştığını söyler. Bu ise kimin, neden değiştirdiğini söyler
ve çözümü asıl belirleyen genellikle budur. Orada hiçbir şey yoksa, hiçbir taraf
tam olarak bu yola bir değişiklik commit'lememiştir — çarpışma bir yeniden
adlandırmadan ya da taşımadan gelmiştir.

## Üç panel

| Panel | Nedir |
|---|---|
| Sol | **Bizimki** — üzerinde bulunduğunuz taraf, commit'iyle etiketli |
| Sağ | **Onlarınki** — gelen taraf, commit'iyle etiketli |
| Orta | **Çıktı**: düzenlenebilir, satır numaralı ve gerçekten hazırlanacak olan içerik |

Üç panel de yeniden boyutlandırılabilir.

## Seçmek

**Satır** bazında, **öbek** bazında ya da bir seferde **tüm taraf** — ve yanıt
"ikisi de kalsın" olduğunda bir öbeğin her iki tarafını da alabilirsiniz.
Çakışmadan çakışmaya ilerleyen bir gezinme aracı kalanları tek tek dolaştırır,
böylece geride kazara bir işaretçi bırakamazsınız.

## Yapay zekâ desteği

Yapay zekâ etkinken **Yapay zekâ ile çöz**, çıktı paneline bir birleştirme
önerir. Kendi başına hiçbir şey uygulamaz: siz okur, düzenler ve hazırlarsınız.
Bkz. [Yapay zekâ özellikleri](ai.md).

## Baştan çakışmaya düşmemek

[Çakışma radarı](conflict-radar.md), herhangi birini birleştirmeden önce hangi
dalların çakışacağını söyler.

## git'in hatırlamasına izin vermek (rerere)

Uzun ömürlü bir dalı rebase edin, aynı çakışmayla her seferinde karşılaşırsınız.
`rerere` — *reuse recorded resolution*, yani kaydedilmiş çözümün yeniden
kullanımı — git'in buna yanıtıdır: bir çakışmayı nasıl çözdüğünüzü ezberler ve
aynısı bir daha ortaya çıktığında o yanıtı tekrar oynatır.

**Ayarlar → Genel → Çakışma çözümlerini hatırla.** Bu, genel git yapılandırmanıza
`rerere.enabled` yazar; böylece komut satırı da aynı şekilde davranır.

git sizin yerinize yanıt verdiğinde, çözücü boş bir "çakışma işaretçisi yok"
ekranı göstermek yerine durumu bildirir ve **Bu çözümü unut** seçeneğini sunar —
bu, hafızayı siler *ve* çakışmayı geri getirir, böylece işi farklı
sonuçlandırabilirsiniz.

Bilmeye değer iki şey:

- **Tekrar oynatılan bir çözüm hazırlanmaz**, *Tekrar oynatılan bir çözümü
  otomatik hazırla* seçeneğini açmadıkça. Onu kapalı bırakın: duraklamanın tüm
  anlamı, ezberlenmiş bir yanıtın bu belirli birleştirme için yanlış olabilmesi;
  bakmadan hazırlamak da onun bir commit'e ulaşma yoludur.

  Tekrar oynatılan bir dosyanın **Çakışan dosyalar** listesinde kalmasının nedeni
  budur: git içeriği yazmıştır ama index onu hâlâ birleştirilmemiş olarak tutar
  ve bunu yalnızca hazırlamak çözer. Çözücüdeki **Olduğu gibi hazırla** ya da
  listedeki **Tümünü çözüldü işaretle** onu yerinden oynatan şeydir.
- **rerere her çakışmayı anlamaz.** Ekle/ekle ve sil/değiştir çakışmalarının
  ön görüntüsü (preimage) olmaz, dolayısıyla hep ham hâlde geri gelirler.
  Ayarlar'daki sayı gerçekten tuttuğu kayıt sayısıdır ve **Tümünü unut** onu
  boşaltır.

**Ayrıca bakınız:** [Çakışma radarı](conflict-radar.md) · [Birleştirme ve rebase](merging.md)
