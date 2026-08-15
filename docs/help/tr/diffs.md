---
title: Diff'ler ve önizlemeler
category: Değişiklikleri okuma
order: 20
summary: Bölünmüş görünüm, sözcük düzeyinde vurgulama, görsel diff'leri ve dosya önizlemeleri.
keywords: diff bölünmüş yan yana sözcük düzeyi boşluk görsel önizleme split side-by-side whitespace image preview markdown docx pdf
---

# Diff'ler ve önizlemeler

## Bir diff'i okumak

| Anahtar | Ne yapar |
|---|---|
| **Birleşik ↔ bölünmüş** | Karşılaştırmak istediğinizde yan yana, okumak istediğinizde alt alta |
| **Sözcük düzeyi** | Düzenlenmiş bir satırın içinde yalnızca değişen belirteçleri vurgular — eskisinde kırmızı, yenisinde yeşil |
| **Boşlukları yok say** | Yeniden girintilemeyi gizler, böylece gerçek değişiklik öne çıkar |
| <kbd>⌘F</kbd> | Diff içinde arama, sonraki/önceki adımlamasıyla |

![Sözcük düzeyinde vurgulamalı bölünmüş diff](../../screenshots/split-diff.webp)

Her diff'in üstünde [anlamsal özet](semantic-diff.md) yer alır — satır satır
değil, sembol sembol neyin değiştiği.

## Görsel diff'leri

Değişen görseller gerçek bir karşılaştırma alır: yan yana ya da öncesi ile
sonrası arasında sürükleyebileceğiniz bir kaydırma tutamağı.

![Görsel diff'i](../../screenshots/image-diff.webp)

## Her şeyi önizleyin

**Önizleme** modu dosyanın kaynağını göstermek yerine dosyayı işler: Markdown,
Word (`.docx`), Excel (`.xlsx`), PDF, video, ses, görseller ve geri kalan her
şey için sözdizimi vurgulu kod.

![Markdown önizlemesi](../../screenshots/markdown-preview.webp)

## Dosyalar sekmesi

Sol kenar çubuğundaki **Dosyalar** sekmesi çalışma dizininin kendisine göz
atmanızı sağlar; klasörlerde, içlerindekini toplayan durum rozetleri
(eklendi / değiştirildi / silindi) bulunur.

![Önizlemeli dosyalar sekmesi](../../screenshots/file-tree.webp)

![Her klasörün içinde neyin değiştiğini toplayan klasör rozetleri](../../screenshots/tree-badges.webp)

**Ayrıca bakınız:** [Anlamsal diff](semantic-diff.md) · [Hazırlama](staging.md)
