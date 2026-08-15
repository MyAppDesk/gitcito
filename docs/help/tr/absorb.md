---
title: Absorb
category: Değişikliklerle çalışma
order: 33
summary: Hazırlanmış her düzeltmeyi, ilgili satırı getiren commit'e geri gönderin.
keywords: absorb emme fixup autosquash amend hazırlanmış hunk blame gözden geçirme düzeltmeleri staged review fixes
---

# Absorb

Üç dosyada, üç gözden geçirme yorumunu düzelttiniz. Dürüst olanı, doğru
ebeveynlere nişan almış üç `fixup!` commit'i almaktır. İnsanların gerçekte
yaptığı ise "review fixes" adında tek bir commit atmaktır.

Absorb, dürüst olanı sizin yerinize yapar.

![Absorb, hazırlanmış her hunk'ı onu getiren commit'e yönlendiriyor](../../screenshots/absorb.webp)

## Nasıl çalışır

1. Düzeltmeleri hazırlayın.
2. Araçlar → **Hazırlanmış değişiklikleri absorb et…** (ya da <kbd>⌘K</kbd>).
3. Gitcito, hazırlanmış her hunk'ın dokunduğu satırlara blame uygular,
   bunları **push edilmemiş commit'lerinizden** hangisinin getirdiğini bulur ve
   herhangi bir şey yapmadan önce planı size gösterir.

Plan, her hedef commit'i ve ona gidecek hunk'ları listeler; ayrıca bir **Henüz
hiçbir yere ait değil** grubu vardır — yepyeni bir dosyanın içine absorbe
edilecek bir geçmişi yoktur, dolayısıyla normal şekilde commit'lemeniz için
hazırlanmış olarak kalır.

| Düğme | Ne olur |
|---|---|
| **Fixup'ları oluştur** | Hedef başına bir `fixup!` commit'i. Hiçbir şey rebase edilmez. |
| **Fixup'ları oluştur ve rebase et** | Aynısı, ardından bir autosquash rebase'i bunları içeri katlar. |

## Uyduğu kurallar

- **Yalnızca push edilmemiş commit'ler adaydır.** Halihazırda yayımlanmış olan
  hiçbir şeyi yeniden yazmak bize düşmez. Her şey push edilmişse absorb bunu
  söyler ve hiçbir şey yapmaz.
- **Çalışma dizinine asla dokunulmaz.** Yalnızca index ve absorb'un kendi
  oluşturduğu commit'ler değişir.
- **Bir hata ortalığı dağıtmaz.** Herhangi bir adım başarısız olursa HEAD ve
  index tam olarak eski hâline geri konur.
- Bir merge ya da rebase sırasında çalışmayı reddeder — o index git'e aittir.

**Ayrıca bakınız:** [Etkileşimli rebase](rebase.md) · [Hazırlama](staging.md)
