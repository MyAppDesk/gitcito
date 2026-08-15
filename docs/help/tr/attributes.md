---
title: Dosya öznitelikleri
category: Çalışma alanı araçları
order: 96
summary: Arayüzü olan bir .gitattributes — satır sonları, ikili dosyalar, union ile birleştirilen changelog'lar, export-ignore ve Word ile PDF için okunabilir diff'ler.
keywords: gitattributes öznitelik öznitelikler satır sonu diff sürücüsü textconv merge union ikili dosya export-ignore eol crlf lf text auto filter clean smudge lfs linguist check-attr
---

# Dosya öznitelikleri

`.gitattributes`, git'te neredeyse kimsenin yazmadığı ama en çok değer üreten
dosyadır. Bir deponun **git'e kendi içeriğini öğretme** yoludur: hangi dosyalar
ikilidir, hangileri çakışmak yerine uç uca eklenmelidir, hangileri bir arşive
hiç girmemelidir, herkes hangi satır sonlarını alacaktır.

Asıl önemli kısım: bu dosya commit'lenir. Eklediğiniz bir kural, depoyu
klonlayan herkes için, her işletim sisteminde, kalıcı olarak sorunu çözer —
kendi yapılandırmanızdaki bir ayarın aksine; o yalnızca sizi kurtarır ve
meslektaşlarınızı aynı sorunu zor yoldan keşfetmeye bırakır.

`⌘K` → **Dosya öznitelikleri**.

![Deponun hâlihazırda taşıdığı kurallar, hazır ayarlar, yol denetleyicisi ve diff sürücüleri](../../screenshots/attributes.webp)

## Kurallar ne işe yarar

| Öznitelik | Neyi düzeltir |
|-----------|---------------|
| `text=auto eol=lf` | Dosyayı kimin checkout ettiğine göre değişip duran satır sonları |
| `binary` | Git'in bir PSD'yi, bir DOCX'i ya da derlenmiş bir varlığı diff'lemeye veya üç yönlü birleştirmeye çalışması |
| `merge=union` | Herkesin sonuna ekleme yaptığı ve herkesin çakıştığı bir changelog |
| `-merge` | Üç yönlü birleştirmenin saçmalık ürettiği dosyalar — kilit dosyaları, üretilmiş kod |
| `export-ignore` | Bir sürüm arşivinin içine giren CI yapılandırması ve test verileri |
| `diff=<driver>` | Bir dönüştürücü verildiğinde aslında *okunabilir* olan biçimlerin okunaksız diff'leri |
| `filter=lfs` | [LFS](lfs-sparse.md) üzerinden saklanan büyük dosyalar |
| `linguist-vendored` | Dil istatistiklerinde sizin sayılan, dışarıdan alınmış kod |

`binary`, `-diff -merge -text` kısaltmasıdır; yani "bu dosya hakkında tahmin
yürütmeyi bırak" cevabının üçünü birden tek kelimede verir.

## Düzenleme

Hazır ayarlar bir desen ile özniteliklerini doldurur; eklemeden önce deseni
düzenleyin — `CHANGELOG.md` bir öneridir, projeniz hakkında bir kural değil.

**Düzenlemeler cerrahidir.** Zaten kuralı olan bir desen için kural eklemek, o
satırı bulunduğu yerde yeniden yazar; sonradan geldiği için kazanan ikinci bir
kural eklemez. Dosyadaki yorumlar olduğu gibi kalır, çünkü bir kuralın yanındaki
"neden" genellikle kuralın kendisinden daha değerlidir.

Her kaydetme sıradan bir Gitcito eylemidir: bildirim çıkar ve **Geri al**
dosyayı tam olarak eski hâline döndürür.

**Bir depoda birden fazla öznitelik dosyası olabilir.** Kök dizinde bir tane,
herhangi bir alt dizinde bir tane ve hiçbir zaman commit'lenmeyen, yalnızca
sizin makinenizde geçerli olan özel bir `.git/info/attributes` — projeyle değil
sizinle ilgili bir kuralın doğru yeri. Gitcito hepsini listeler ve hangisinin ne
olduğunu söyler.

## Bir yola ne uygulanıyor?

Kurallar birden çok dosyadan gelir, daha özgül olan kazanır ve cevabı bulmak
için hepsini okumak tahminden ibarettir. **Bir yola ne uygulanıyor?**,
`git check-attr` çalıştırır ve git'in kendi vardığı sonucu gösterir — geçerli
olan tek cevap.

## Diff sürücüleri: bir Word belgesini okunabilir kılmak

Bir `.docx` aslında bir zip'tir. Bir `.pdf` sıkıştırılmış bir nesne çizgesidir.
Git bunları ne iseler öyle diff'ler — yani gürültü olarak — ve böylece belge
okunabilir olduğu hâlde geçmişi okunmaz olur.

Bir **diff sürücüsü** bunu `textconv` ile çözer: dosyayı *yalnızca diff için*
metne çeviren bir komut. Çalışma dizinindeki dosyaya dokunulmaz; git sadece
dönüştürülmüş metni karşılaştırır.

İki yarısı vardır ve ikisi de gereklidir:

1. Git yapılandırmasında `diff.<name>.textconv` — dönüştürücü komutu.
2. `.gitattributes` içinde `*.docx diff=<name>` — hangi dosyalara uygulanacağı.

Buradaki düğmeler ikisini birden yapar. Gitcito **bu dönüştürücülerin hiçbirini
paketinde getirmez** ve bunu gizlemez: PATH'inizi denetler, yalnızca gerçekten
kurulu olanları sunar, kalanları ihtiyaç duydukları ikili dosyanın adıyla
birlikte soluklaştırır.

| Sürücü | Gereksinimi | Size verdiği |
|--------|-------------|--------------|
| `word` | `pandoc` | `.docx` dosyalarının düzyazı diff'leri |
| `pdf` | `pdftotext` (poppler) | `.pdf` dosyalarının metin diff'leri |
| `excel` | `xlsx2csv` | Hesap tablolarının satır bazlı diff'leri |
| `exif` | `exiftool` | Pikseller anlaşılmaz olduğunda bir görselde neyin değiştiği |
| `json` | `jq` | Anahtara göre sıralanmış, kararlı JSON diff'leri |

Dönüştürücü yarısı **sizin** yapılandırmanızda yaşar, depoda değil — git, bir
klonun size uzattığı komutları çalıştırmaz ve bu, korunmaya değer bir güvenlik
özelliğidir. Dolayısıyla depoyu klonlayan bir ekip arkadaşınız `diff=word`
kuralını alır ama pandoc'u kurana kadar yine eski okunaksız diff'i görür. Bunu
README'nizde belirtin.

## Bilinmeye değer sınırlar

- **Clean/smudge filtreleri burada sunulmaz.** `filter=<name>` kuralları elle
  yazılabilir, ama Gitcito komutları yapılandırmaz: bir filtre eşleşen her
  dosyanın her checkout'unda çalışır ve yanlış bir filtre çalışma dizininizi
  sessizce bozar.
- **`text=auto` neyin commit'lendiğini değiştirir**, satır sonlarını girişte
  normalleştirir. Mevcut bir depoda önce ekleyin, sonra bilinçli olarak
  `git add --renormalize .` çalıştırın — kendine ait tek bir commit içinde.
- **Öznitelikler geriye dönük işlemez.** Bir dosyayı bugün `binary` olarak
  işaretlemek geçmiş diff'lerinin nasıl saklandığını değiştirmez; yalnızca
  git'in bundan sonra ona nasıl davranacağını değiştirir.
- **Kurallar yalnızca dosyanın göründüğü yerde geçerlidir.**
  `design/.gitattributes` içindeki bir kural `src/` hakkında hiçbir şey
  söylemez.
- Gitcito dosyaların tamamını yazar; bu yüzden elle biçimlendirilmiş bir dosya
  biçimiyle birlikte geri gelir — ama Gitcito'nun yeniden yazdığı bir kural,
  git'in kanonik `pattern attr attr` aralığına göre yeniden biçimlendirilir.

Ayrıca bakınız: [LFS ve seyrek checkout](lfs-sparse.md) ·
[Bundle'lar ve arşivler](export.md) · [Merge seçenekleri](merge-options.md) ·
[Hook'lar](hooks.md)
