---
title: Çakışma radarı
category: Dallanma ve cerrahi
order: 44
summary: Hiçbirini birleştirmeden önce hangi dalların çakışacağını görün.
keywords: çakışma radarı birleştirme önizleme risk dallar conflict radar merge preview clash risk branches merge-tree
---

# Çakışma radarı

Bir dalın çakıştığını onu birleştirerek öğrenmek, bir soruyu sormanın pahalı bir
yoludur. Radar soruyu önceden yanıtlar.

Gitcito her dalı, seçtiğiniz bir tabana **nesne veritabanının içinde** birleştirir
(`git merge-tree --write-tree`). Checkout yok, index değişikliği yok, çalışma
dizini değişikliği yok, sonradan temizlenecek hiçbir şey yok. Tarama sürerken
commit'lenmemiş çalışmanız tam olduğu yerde kalabilir.

![Radar, dal başına bir hüküm](../../screenshots/conflict-radar.webp)

![Dal dal tarama, ardından çekişmeli dosyaların açılması](../../screenshots/clip-conflict-radar.webp)

## Kullanımı

Araçlar menüsünden, <kbd>⌘K</kbd> → *Çakışma radarı* ile açın ya da bir dala sağ
tıklayıp her şeyi **o** dala karşı taratın.

Açılır açılmaz, geçerli dalınızı taban alarak tarar.

| Hüküm | Anlamı |
|---|---|
| **Çakışacak** | Birleştirmek el emeği ister. Tam yollar listelenir. |
| **Temiz birleşiyor** | Kavga çıkarmadan uygulanır. |
| **Zaten içinde** | Taban onu zaten içeriyor — birleştirilecek bir şey yok. |
| **Başarısız** | Git reddetti: ilgisiz geçmişler, eksik ref. Nedeni gösterilir. |

Dallar en kötüsü üstte olacak şekilde sıralanır ve en kötünün en kötüsü — en çok
dosyaya dokunan — en tepeye çıkar.

## Çekişmeli dosyalar

Altta, **Çekişmeli dosyalar** bölümü yolları kaç dalın onları yeniden yazdığına
göre sıralar. Tek bir dosya üzerinde çekişen iki dal, şimdi yapılması gereken
bir konuşmadır; beş dal bir tasarım sorunudur.

## Taramadan sonra

Kenar çubuğundaki dal satırları renkli bir nokta takar: kırmızı çakışacak, yeşil
temiz, kehribar rengi git'in reddettiği bir dal. Tabanda zaten bulunan dallar
nokta almaz — zaten birleştirilmiş her şeyin üzerindeki gri nokta dizisi
yalnızca gürültüdür.

> Tarama hiçbir şeyi değiştirmez. `git status` temiz kalır ve HEAD yerinden
> oynamaz.

**Ayrıca bakınız:** [O zamandan beri ne değişti](range-diff.md) · [Birleştirme ve rebase](merging.md)
