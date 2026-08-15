---
title: Replace ve graft
category: Depo ve geçmiş
order: 17
summary: Bir klonun geçmişini yeniden yazmadan kısaltın — git replace, graft'lar ve geçmişi geri koymanın yolu.
keywords: replace git replace graft refs/replace shallow sığ geçmiş kısaltma truncate arşiv archive ebeveyn parents yeniden yazma rewrite filter-branch daha küçük klon smaller clone useReplaceRefs no-replace-objects
---

# Replace ve graft

`git replace` git'e şunu söyler: *A nesnesini okumak üzere olduğun her yerde
onun yerine B'yi oku*. Hiçbir şey yeniden yazılmaz. Hiçbir sha değişmez. Her
commit tam olarak olduğu yerde kalır — git yalnızca yolunun üzerinde başka bir
yere bakar.

Daha küçük bir klon isteyene kadar bu kulağa bir merak konusu gibi gelir. O
noktada geçmişi yeniden yazmanın dürüst alternatifidir: **bir commit'i hiçbir
ebeveyne graft'layın**, ondan öncesi log'dan, grafikten ve oradan yapılan her
klondan düşer — üstelik hâlâ saklanır, hâlâ fetch edilebilir ve geri gelmesi
silinmiş tek bir ref uzaklıktadır.

`⌘K` → **Replace ve graft**.

![Mevcut değiştirmeler ve altlarındaki graft formu](../../screenshots/replace.webp)

## Graft'lama

| Ona verdiğiniz | Elde ettiğiniz |
|---------|-------------|
| Bir commit, **ebeveyn yok** | O commit geçmişin başlangıcı olur |
| Bir commit, **bir veya daha fazla ebeveyn** | Gerçekte durduğu yer yerine oraya bağlanır |

İlginç olan ikinci biçim. Tam geçmişi bir arşiv deposunda tutun, çalıştığınız
depoyu kısaltın ve arşivin ucuna işaret eden bir graft ikisini yeniden
birleştirsin — GitHub'ın, yine de derinleştirilebilen bir sığ klon sunmak için
kullandığı numaranın aynısı.

**Hiçbir ebeveyne graft'lamak önce sorar**, çünkü "geçmiş gitti" ile "geçmiş
gizlendi" log'dan bakınca birebir aynı görünür ve hiç de aynı şey değildir.
Nesneler bir `gc` onları budayana kadar hayatta kalır; bkz.
[bakım](maintenance.md).

## Onunla yaşamak

**Değiştirmeler ref'tir**, `refs/replace/` altında. Bunun bilmeye değer üç
sonucu var:

- **Push edilene kadar yereldir**: `git push origin "refs/replace/*"` onları
  paylaşır ve onlarsız klonlayan herkes dokunulmamış geçmişi görür.
- **Geri alma çalışır** — ref'i düşürmek gerçek soy ağacını anında geri getirir
  ve Gitcito graft'ı da her şey gibi geri alınabilir bir eylem olarak kaydeder.
- `core.useReplaceRefs=false` git'in hepsini birden yok saymasını sağlar. Buradaki
  anahtar tam olarak bunu yazar ve kapalıyken pencere bunu söyler, çünkü kendi
  değiştirmelerini sessizce yok sayan bir depo kafa karıştırıcı bir yerdir.

Komut satırından `git --no-replace-objects log` hiçbir ayarı değiştirmeden gerçek
geçmişi gösterir.

## Yeniden yazma yerine ne zaman buna uzanmalı

| Amaç | Araç |
|------|------|
| Klon çok büyük, geçmişte sorun yok | **Graft** — hiçbir şey yeniden yazılmaz, geri alınabilir |
| Bir sır ya da devasa bir blob *yok olmalı* | [Bir dosyayı geçmişten kaldırma](history-purge.md) — gerçek bir yeniden yazma |
| Sadece bir kerelik daha az indirmek | `git clone --depth` — sığ, yönetilecek ref yok |

Graft hiçbir şeyi kaldırmaz. Eski commit'leri istemenizin sebebi hiç
commit'lenmemesi gereken bir şey içermeleriyse, burası yanlış sayfa: nesneler
hâlâ orada, hâlâ sha ile fetch edilebilir ve mevcut her klonun içinde.

## Bilmeye değer sınırlar

- **Gördüğünüz şey saklananla örtüşmeyi bırakır.** Özellik de budur, tehlike de.
  Değiştirmeler içeren bir klonda hata ayıklayan herkesin bunların varlığını
  bilmesi gerekir.
- **Değiştirmeler varsayılan olarak yolculuk etmez**, dolayısıyla bir meslektaşınızın
  `git log` çıktısıyla sizinki haklı olarak birbirini tutmayabilir.
- **Bir değiştirme, bir commit'i araçlardan gizleyebilir, git'ten gizleyemez.**
  `git cat-file` ve [nesne gezgini](objects.md) orijinali sha ile hâlâ açar.
- **Gitcito `git replace --edit` sunmaz** (bir nesnenin içeriğini elle yeniden
  yazmak). O, ham bir nesne üzerinde bir metin editörünün işidir ve etrafına
  arayüz konmuş bir ayak kurşunlama aracıdır.

Ayrıca bakınız: [Nesne gezgini](objects.md) ·
[Bir dosyayı geçmişten kaldırma](history-purge.md) ·
[Depo bakımı](maintenance.md)
