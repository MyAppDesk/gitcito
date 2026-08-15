---
title: Stash'ler
category: Eşitleme ve çoklu depo
order: 52
summary: Kısmi stash'ler, dosya bazında uygulama ve stash'ten dala geçiş.
keywords: stash stashes kısmi keep-index apply pop drop izlenmeyen untracked dal branch
---

# Stash'ler

Gitcito'da stash'leme ya hep ya hiç değildir.

| Eylem | Ne yapar |
|---|---|
| **Stash** | İsterseniz izlenmeyen dosyalar da dahil her şeyi, bir mesajla birlikte |
| **Kısmi stash** | Yalnızca istediğiniz dosyaları işaretleyin; isteğe bağlı olarak `--keep-index` |
| **Uygula / Pop** | Stash'in tamamı ya da **yalnızca bazı dosyaları** |
| **Stash → dal** | `git stash branch` — bir stash temiz uygulanmadığında acil çıkış kapısı |

Bir stash'i seçmek, tıpkı bir commit'te olduğu gibi dosyalarını ve diff'lerini
gösterir.

![Kısmi bir stash: yalnızca girmesi gereken dosyaları işaretleyin](../../screenshots/stash-partial.webp)

## Bir stash uygulanmadığında

Bir stash'i uygulamak izlenmeyen dosyaların üzerine yazacaksa git durur. Gitcito,
sizi doğru büyülü sözü bulmaya bırakmak yerine bunların üzerine yazıp yeniden
denemeyi önerir.

Ağaç fazla ilerlemişse **stash → dal**, stash'in alındığı dalı yeniden oluşturur,
stash'i orada temiz biçimde uygular ve stash'i listeden düşürür.

## Anlık görüntülerle karıştırmayın

[WIP anlık görüntüleri](recovery.md) otomatiktir ve gizlidir; stash'ler ise
bilinçlidir ve listelenir. Anlık görüntüler stash listenize hiç dokunmaz.

**Ayrıca bakınız:** [Kurtarma](recovery.md) · [Hazırlama](staging.md)
