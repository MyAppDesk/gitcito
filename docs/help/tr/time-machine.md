---
title: Zaman makinesi
category: Depo ve geçmiş
order: 13
summary: Bir kaydırıcıyı sürükleyin ve deponun kendisini commit commit değişirken izleyin.
keywords: zaman makinesi time machine geçmiş kaydırıcı slider geçmişe gitme ağaç eski sürüm gözatma
---

# Zaman makinesi

Eski bir commit'i okumak genellikle onu checkout etmek, yani yaptığınız işi
stash'lemek demektir. Burada öyle değil.

Kaydırıcıyı sürükleyin, **dosya ağacı her commit için yeniden çizilsin**:
klasörler belirir, dosyalar aralarında yer değiştirir, silinmiş dosyalar geri
gelir. Bir dosya seçin ve onu tam o commit'teki hâliyle okuyun.

Her şey nesne veritabanından okunur (`git ls-tree`, `git show`). **Checkout yok,
HEAD hiç kıpırdamaz, commit'lenmemiş çalışmanıza dokunulmaz** — bir değişikliğin
tam ortasında bir yıllık geçmişin içinde gezinebilirsiniz.

![Daha eski bir commit'teki ağaç, yanında açık bir dosyayla](../../screenshots/time-machine.webp)

![Kaydırıcıda gezinme: ağaç kendini commit commit yeniden kuruyor](../../screenshots/clip-time-machine.webp)

## Kontroller

| Tuş | Eylem |
|---|---|
| <kbd>←</kbd> <kbd>→</kbd> | Bir commit |
| <kbd>⇧</kbd> + <kbd>←</kbd> <kbd>→</kbd> | On commit |
| <kbd>Home</kbd> / <kbd>End</kbd> | En eski / en yeni |

Kaydırıcının iki yanındaki oklar da aynı işi yapar. Geçerli commit'in dokunduğu
dosyalar ağaçta vurgulanır, başlıkta da sayısı görünür.

## Seçim zamana dayanır

Bir dosya seçin ve onu oluşturan commit'in gerisine kadar geri gidin: panel
burada böyle bir dosya olmadığını söyler ama **seçiminizi korur**. İleri gidin,
dosya eski içeriğiyle geri gelir. Mesele tam da bu — imlecinizi değil, deponun
kendisini hareket ettiriyorsunuz.

**Bu sürümü aç**, dosyayı o commit'teki hâliyle normal dosya görünümüne devreder.

**Ayrıca bakınız:** [Timelapse](timelapse.md) · [Blame ve geçmiş](blame.md)
