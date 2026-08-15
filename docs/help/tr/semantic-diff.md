---
title: Anlamsal diff
category: Değişiklikleri okuma
order: 21
summary: Neyin değiştiği, sembol sembol — yeniden adlandırmalar, imza değişiklikleri, taşımalar.
keywords: anlamsal diff sembol yeniden adlandırma imza taşındı semantic diff ast tree-sitter rename signature moved symbols
---

# Anlamsal diff

Yalnızca ad değiştiren bir sembol, satır bazlı diff'te bir dosyanın tamamen
silinmesi ve bir dosyanın tamamen eklenmesi olarak görünür. Teknik olarak
doğrudur ve tamamen işe yaramazdır.

Gitcito her dosya diff'inin üstünde bir **Ne değişti** şeridi gösterir:
dosyanın her iki sürümü de **tree-sitter** ile ayrıştırılır — düzenli ifadeler
değil, gerçek sözdizimi ağaçları — ve bildirimleri birbiriyle eşleştirilir.

![Ne-değişti şeridi: sembol sembol yeniden adlandırmalar ve imza değişiklikleri](../../screenshots/semantic-diff.webp)

| Karar | Örnek |
|---|---|
| **Yeniden adlandırıldı** | `startServer` → `bootServer` |
| **İmza** | `open(path)` → `open(path, mode)` |
| **Eklendi** / **Kaldırıldı** | yeni bir fonksiyon; silinmiş bir fonksiyon |
| **Taşındı** | aynı kod, 40 satır aşağıda |
| **Değişti** | aynı ad ve imza, farklı gövde |

Yeniden adlandırmalar ve imza değişiklikleri en başa sıralanır — bir
gözden geçirenin kaçırmaması gereken şeyler bunlardır. Bir satıra tıklayarak
diff içinde o sembole atlayın.

## Neleri ayrıştırabilir

TypeScript, TSX, JavaScript, Python, Go, Rust, Java, C, C++, C#, Ruby, PHP,
Swift, Kotlin, Scala, Lua, Bash ve Zig.

Dili için dilbilgisi bulunmayan bir dosya normal satır diff'iyle kalır — şerit
hiç görünmez. 400 KB'ı aşan dosyalar için de aynısı geçerlidir.

## Dürüst sınırlar

- Gövdesi de değişmiş bir yeniden adlandırma, yeniden adlandırma olarak
  bildirilir **ve** bunu ayrıca belirtir.
- Birbirine benzeyen iki tek satırlık fonksiyon *eşleştirilmez*: belirli bir
  boyutun altında eşleşmenin neredeyse birebir olması gerekir; böylece uydurma
  bir yeniden adlandırma yerine temiz bir kaldırma + ekleme görürsünüz.
- Üstlerindeki bir şey büyüdüğü için birkaç satır kayan semboller "taşındı"
  diye bildirilmez — bu, gerçek taşımaları gömerdi.

**Ayrıca bakınız:** [Diff görüntüleyici](diffs.md) · [O günden beri ne değişti](range-diff.md)
