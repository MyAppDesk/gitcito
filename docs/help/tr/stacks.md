---
title: Yığılmış dallar
category: Dallanma ve cerrahi
order: 43
summary: Birbirine bağımlı dal zincirleri ve zincir boyunca yeniden yığma.
keywords: yığın stack yığılmış dallar stacked branches graphite restack bağımlı dependent zincir chain ebeveyn parent seviye başına PR
---

# Yığılmış dallar

Yığın, her birinin altındakinin üzerine kurulduğu bir dal zinciridir:
`main → api → ui`. Üç küçük PR incelemek, tek bir devasa PR incelemekten iyidir.

![Bir dal yığını](../../screenshots/branch-stack.webp)

Gitcito yığını alttan üste doğru, her seviyedeki commit sayısıyla birlikte gösterir
ve **her seviye için ayrı bir PR açmanıza** izin verir; her biri `main` yerine
kendi ebeveynini hedefler.

## Yeniden yığma

Alttaki bir dal değiştiğinde — `api` üzerindeki inceleme yorumlarını
karşıladığınızda — onun üzerindeki her dal artık yanlış temelin üzerine kurulmuş
olur. **Yeniden yığ**, zincirin tamamını `rebase --onto` ile ardışık olarak rebase
eder; böylece bir ebeveynin yeniden yazılması commit'leri çocuklarına
kopyalamaz.

## Bağlantılar nerede yaşar

Ebeveyn bağlantıları **git config** içinde saklanır, dolayısıyla depoyla birlikte
yolculuk eder ve yeniden klonlamadan sağ çıkar. Hiçbir şey bir serviste yaşamaz.

**Ayrıca bakınız:** [Etkileşimli rebase](rebase.md) · [Hosting ve pull request'ler](hosting.md)
