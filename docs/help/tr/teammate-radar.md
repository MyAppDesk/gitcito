---
title: Ekip arkadaşı radarı
category: Dallanma ve cerrahi
order: 45
summary: Upstream'de kim neyi oynattı — ve commit'lenmemiş çalışmanızın üstüne düşüyor mu.
keywords: ekip arkadaşı radarı uzak etkinlik upstream farkındalık örtüşme kirli dosyalar çarpışma kim dokundu çakışma fetch teammate radar remote activity upstream awareness overlap dirty files collision who touched conflict
---

# Ekip arkadaşı radarı

`api.ts` dosyasını düzenliyorsunuz. Bir başkası da öyle — henüz bakmadığınız bir
dalda. Bunu öğrenmenin alışılmış yolu gelecek hafta bir birleştirme çakışmasıdır;
radarın yolu ise bir liste, bugün.

Her şey **son fetch**'inizden hesaplanır — uzak izleme ref'leri, bellekte bir
`merge-tree`, başka hiçbir şey. Sunucu yok, ekip arkadaşlarınızın makinelerinde
ajan yok, zaten yaptığınız fetch'in ötesinde ağ trafiği yok.

![Ekip arkadaşı radarı](../../screenshots/teammate-radar.webp)

## Bir satır size ne söyler

`HEAD`'inizde olmayan commit'lere sahip her uzak dal için:

| Sütun | Anlamı |
|--------|---------|
| Kim ve ne zaman | O daldaki son commit'i yapan kişi ve ne kadar zaman önce |
| Commit / dosya | Ne kadarının geldiği ve kaç dosyaya dokunduğu |
| **Örtüşme** | Bu dosyalardan hangilerinin **şu anda çalışma dizininizde kirli** olduğu — kırmızı rozet |
| Risk | O dalı `HEAD`'e birleştirmenin çakışıp çakışmayacağı ([çakışma radarı](conflict-radar.md) ile aynı motor) |

Satırlar sizinle ne kadar çarpıştıklarına göre sıralanır: önce örtüşme, sonra
öngörülen çakışmalar, sonra tazelik. Tam dosya listeleri için bir satırı
genişletin; **Karşılaştır** tam dal karşılaştırmasını açar.

## Ne zaman ses çıkarır

Her fetch'ten sonra — elle ya da otomatik — radar sessizce tarar. Yalnızca
upstream commit'leri sizin değiştirdiğiniz dosyalara dokunduğunda **ve** bu küme
son taramadan bu yana gerçekten değiştiğinde bir bildirim gösterir. Kirli dosya
yoksa gürültü de yok: temiz bir çalışma dizini hiçbir şeyle çarpışamaz.

## Sınırlar

- Son fetch'in gördüğünü görür. Henüz push etmemiş bir ekip arkadaşı görünmezdir
  — bu araç ref okur, zihin değil.
- Örtüşme yol düzeyindedir, satır düzeyinde değil: aynı dosyaya dokunmak bir
  uyarıdır, çakışmanın kanıtı değil. **Risk** sütunu satır düzeyindeki yanıttır,
  ama yalnızca commit'lenmiş durumlar arasında.
- Yaklaşık 45 günden uzun süredir hareketsiz dallar atlanır ve yalnızca en son
  hareket eden 30 dal taranır.

**Ayrıca bakınız:** [Çakışma radarı](conflict-radar.md) · [Fetch, pull ve push](syncing.md) · [O günden beri ne değişti](range-diff.md)
