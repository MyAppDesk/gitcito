---
title: Commit almak
category: Değişikliklerle çalışma
order: 31
summary: Mesaj biçemleri, şablonlar, ortak yazarlar ve linter.
keywords: commit mesaj besteci conventional gitmoji ticket amend şablon ortak yazar linter template co-author geri al sıfırla undo reset
---

# Commit almak

## Mesaj biçemleri

Ayarlar'dan birini seçin; besteci paneli ona uyum sağlar.

| Biçem | Nasıl görünür |
|---|---|
| **Conventional** | `feat(api)!: add rate limiting` — tür açılır listesiyle |
| **Gitmoji** | `✨ add rate limiting` — emoji seçiciyle |
| **Ticket** | `ABC-123: add rate limiting` — dal adından türetilir |
| **Düz** · **Otomatik** | Ne yazarsanız o; Otomatik'te biçime yapay zekâ karar verir |
| **Mağara adamı** · **Haiku** | Tam olarak kulağa geldikleri gibi |

![Bir commit şablonundan önceden doldurulmuş besteci paneli](../../screenshots/commit-template.webp)

## Besteci panelinin sizin için yaptıkları

- <kbd>↑</kbd> <kbd>↓</kbd> **son mesajlarınızı** geri çağırır.
- Bir **ortak yazar seçici**, deponun kendi katkıcılarından
  `Co-authored-by:` alt bilgileri ekler.
- `commit.template` / `.gitmessage` mesajı **önceden doldurur**, yorum
  satırları ayıklanmış olarak.
- Bir merge, cherry-pick ya da revert sırasında mesaj, git'in yapacağı gibi
  **önceden doldurulur**.
- Taslaklar depo başına **kalıcıdır**, böylece sekme değiştirmek bir mesajı
  asla kaybettirmez.

## Linter

Canlı, engellemeyen bir denetim: konu satırının uzunluğu (karakter sayacıyla),
sondaki nokta, emir kipinde olmayan ya da küçük harfle başlayan konu, aşırı
geniş gövde satırları. Bunlar ipucudur, kapı değil — commit almanızı
engellemez.

## Amend

Amend, son commit'i hazırlanmış olan neyse onunla yeniden yazar. Gitcito size
önce mevcut mesajı gösterir; böylece baştan yazmak yerine düzenlemiş olursunuz.

**Commit’i düzelt…** grafikteki bir satırda HEAD için aynı şeyi yapar: mesajın
tamamını yükler, besteci panelini amend kipine alır ve ona odaklanır. Zaten
push edilmiş bir HEAD yine de düzeltilebilir; ama Gitcito, uzak depoyu
güncellemenin bir force push gerektireceği konusunda uyarır.

**Commit’i geri al…** ise push edilmemiş bir HEAD için olan kardeşidir: üst
commit'e mixed reset, çalışma ağacındaki değişiklikler korunur, mesaj besteci
paneline geri gelir. İlk commit'in, dosyaları yok etmek yerine geride doğmamış
bir dal bırakan kendine özgü bir yolu vardır.

**Ayrıca bakınız:** [Hazırlama](staging.md) · [Absorb](absorb.md) · [Changelog üreteci](changelog.md)
