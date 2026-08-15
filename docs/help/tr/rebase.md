---
title: Etkileşimli rebase
category: Dallanma ve cerrahi
order: 42
summary: Sürükleyerek yeniden sıralayın, squash'layın, fixup edin, mesajı değiştirin, düzenleyin ya da atın.
keywords: etkileşimli rebase interactive squash fixup reword drop edit autosquash todo
---

# Etkileşimli rebase

`git rebase -i` yapılacaklar listesi, sürükleyebileceğiniz bir liste olarak.

![Etkileşimli rebase düzenleyicisi](../../screenshots/interactive-rebase.webp)

| Eylem | Anlamı |
|---|---|
| **pick** | Olduğu gibi bırak |
| **reword** | Değişikliği koru, mesajı düzenle |
| **squash** | Üstteki commit'e katla, iki mesajı birleştir |
| **fixup** | Üstteki commit'e katla, bu mesajı at |
| **edit** | Burada dur ki amend yapabilesiniz |
| **drop** | Commit'i çöpe at |

Sıralamayı değiştirmek için satırları sürükleyin. Düzenleyici asla bir terminalde
açılmaz — todo dosyasını sizin yerinize Gitcito yazar.

## Tek tıkla autosquash

- **Hazırlanmış değişiklikleri bu commit'e fixup'la**, `fixup!` commit'ini sizin
  için oluşturur.
- **Buradan itibaren autosquash**, her `fixup!` / `squash!` commit'ini hedefine
  katlar.

Elinizde tek bir düzeltme değil de bir yığın inceleme düzeltmesi varsa,
[absorb](absorb.md) her hunk'ın hangi commit'e ait olduğunu kendisi bulur;
siz uğraşmazsınız.

> Rebase geçmişi yeniden yazar. Halihazırda push'lanmış olan her şey için
> force-push gerekecektir ve incelemeyi yapan kişi
> [o zamandan beri ne değişti](range-diff.md) bilgisini isteyecektir.

**Ayrıca bakınız:** [Absorb](absorb.md) · [O zamandan beri ne değişti](range-diff.md) · [Kurtarma](recovery.md)
