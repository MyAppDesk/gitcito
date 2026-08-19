---
title: Herhangi bir commit'i düzenleyin
category: Dallanma ve cerrahi
order: 46
summary: Geçmiş bir commit'in dosyalarını veya mesajını yerinde yeniden yazın — zincirleme etki önce önizlenir.
keywords: commit düzenleme geçmişi yeniden yazma eski commit mesaj düzeltme yazım hatası zincirleme yeniden oynatma yerinde rebase cerrahi edit commit rewrite history amend past reword fix typo cascade replay rebase in place surgery
---

# Herhangi bir commit'i düzenleyin

Yazım hatası üç hafta önceki bir commit'te. Alışıldık çözüm etkileşimli bir
rebase'tir: commit'te dur, düzenle, devam et, dua et. Gitcito'nun çözümü ise
şu: commit'e sağ tıklayın, **Bu commit'i düzenle**, metni değiştirin, bitti.
Commit ayrıntıları panelindeki kalem düğmesi de aynı düzenleyiciyi açar.

![Geçmiş bir commit'i düzenleme](../../screenshots/commit-edit.webp)

## Ne yapar

`HEAD`'e doğrusal bir yol üzerindeki herhangi bir commit'i seçin. Pencere
dosyalarını ve mesajını gösterir; ikisinden birini düzenleyin. Oradan itibaren
iki şey olur:

1. **Zincirleme önizleme**, düzenlenen commit'in üzerindeki her commit'i
   *bellekte* yeniden oynatır (`merge-tree` cherry-pick'lerinden oluşan bir
   zincir — checkout yok, çalışma ağacı yok, ref yok). Her ardıl yeşil ya da
   kırmızı görünür; böylece düzenlemenin temiz yayılıp yayılmadığını veya
   sonraki bir değişiklikle çarpışıp çarpışmadığını **daha hiçbir şey
   kımıldamadan** bilirsiniz.
2. **Geçmişi yeniden yaz** bunu gerçekten yapar: aynı zincir plumbing
   komutlarıyla kurulur, ardından dal `reset --keep` ile taşınır —
   commit'lenmemiş değişiklikleriniz beraberinde taşınır ya da reset iptal
   edilir ve hiçbir şey olmamış olur. Önce bir
   [koruma anlık görüntüsü](recovery.md) alınır ve geri al eski zinciri geri
   getirir.

Yeniden oynatılan her commit'in yazarı ve tarihleri korunur; yalnızca
hash'ler değişir — geçmişi yeniden yazmak zaten budur.

## Zincir çakıştığında

Sonraki bir commit, düzenlediğiniz satırlara dokunmuş. Önizleme o commit'i
çakışan dosyalarla birlikte kırmızıyla işaretler ve yeniden yazma çalışmayı
reddeder — hiçbir şey asla yarım uygulanmaz. Ya farklı düzenleyin ya da
çakışmayı [etkileşimli rebase](rebase.md) ile göğüsleyin.

## Sınırlar

- **Yalnızca doğrusal geçmiş.** Commit ile `HEAD` arasında bir merge olması
  düzenlemeyi devre dışı bırakır — merge'leri yeniden oynatmak apayrı ve daha
  zor bir problemdir.
- İkili dosyalar ve 2 MB'ın üzerindeki dosyalar gösterilir ama düzenlenemez.
- Zaten bir uzak depoda olan bir commit düzenlenebilir, ancak bir sonraki
  push'unuz bir **force push** olmak zorundadır — pencere buna karar vermeden
  önce sizi uyarır.
- Commit'te silinmiş dosyalar düzenlenemez (düzenlenecek içerik yoktur).

**Ayrıca bkz.:** [Etkileşimli rebase](rebase.md) · [Kurtarma ve reflog](recovery.md) · [Absorb](absorb.md)
