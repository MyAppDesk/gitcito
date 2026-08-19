---
title: Commit grafiği
category: Depo ve geçmiş
order: 10
summary: Geçmişi okumak: şeritler, ref'ler, sütunlar, filtreler ve çoklu seçim.
keywords: grafik geçmiş commit'ler şeritler dallar birleştirmeler sütunlar filtre doğrusal graph history commits lanes branches merges columns filter linear first-parent
---

# Commit grafiği

Dallar, merge'ler ve ahtapot merge'leri açık ya da koyu temada düzgün biçimde
çizilir. Çizim pencerelenmiştir; yüz bin commit'lik bir depo, yüz commit'lik bir
depo gibi kayar.

| | |
|---|---|
| ![Commit grafiği, açık tema](../../screenshots/graph-light.webp) | ![Commit grafiği, koyu tema](../../screenshots/graph-dark.webp) |

## Gezinme

- <kbd>↑</kbd> <kbd>↓</kbd> (veya <kbd>j</kbd> <kbd>k</kbd>) seçimi ilerletir.
- <kbd>⌘</kbd>/<kbd>Ctrl</kbd> ile tıklamak bir commit'i **çoklu seçime** ekler
  ya da çıkarır; <kbd>⇧</kbd> ile tıklamak bir aralık alır. Birkaçı seçiliyken
  sağ tıklayarak onları geçerli dala cherry-pick edebilir, bitişik bir diziyi
  squash edebilir, tek bir birleşik yama dışa aktarabilir veya SHA'larını
  kopyalayabilirsiniz.
- **Son fetch ya da pull** işleminizle gelen commit'ler yeni olarak işaretlenir.

## İstediğinizi göstermesi

- **Doğrusal görünüm** (first-parent) birleştirilmiş olan her şeyi gizler,
  geriye ana gövdeyi bırakır.
- **Yola göre filtreleme**: bir dosyaya ya da klasöre sağ tıklayın → *Grafiği bu
  yola göre filtrele*, yalnızca ona dokunmuş commit'ler ışıklı kalsın.

![Tek bir yola indirgenmiş grafik](../../screenshots/graph-path-filter.webp)

- **Sütunlar**: dal, mesaj, yazar, tarih, SHA, imza ve dağıtım sütunlarını
  gösterin, gizleyin, yeniden boyutlandırın ve sıralayın.
- **Biçem**: Ayarlar → Temalar → **Grafik** — şerit paleti (8 hazır, özel veya
  yapay zekâ üretimi), köşe biçemi, satır yoğunluğu ve çizgi kalınlığı, canlı
  mini grafik önizlemesiyle.

![Canlı önizlemeli grafik biçemi ayarları](../../screenshots/settings-graph.webp)

## Commit ayrıntıları

Bir commit'i seçmek değişen dosyalarını (ağaç ya da düz), yazarını, SHA'sını,
ortak yazarlarını ve imzasını gösterir. `#123` referansları ve `@mentions`
sunucunuza otomatik bağlanır.

Dosya listesi alışıldık hareketlerle çoklu seçilir
(<kbd>⌘</kbd>/<kbd>Ctrl</kbd> ile tıklama, <kbd>⇧</kbd> ile tıklama,
<kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd>). Seçime sağ tıklayın → *{n} dosyayı
çalışma ağacına geri yükle* o dosyaları tam bu commit'teki hâlleriyle alır: tek
bir onaydan sonra çalışma kopyalarının üzerine yazar; HEAD'e de indekse de
dokunmaz.

![Commit ayrıntılarında gezinme](../../screenshots/clip-commit-details.webp)

**Ayrıca bakınız:** [Blame ve dosya geçmişi](blame.md) · [Arama](search.md) · [Zaman makinesi](time-machine.md)
