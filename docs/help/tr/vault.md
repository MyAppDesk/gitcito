---
title: Kasa
category: Güvenlik
order: 71
summary: Bir deponun ihtiyaç duyduğu sırlar için yerel ve şifreli bir depo — asla commit'lenmez.
keywords: kasa vault sır secrets env anahtar zinciri keychain şifreli yerel depo başına global kopyala
---

# Kasa

Bir projenin ihtiyaç duyduğu `.env` değerlerinin bir yerde durması gerekir. Kasa,
o yerdir — hem de değerler depoya girmeden.

![Kasa](../../screenshots/vault.webp)

- **Beklerken şifreli**, işletim sisteminizin anahtar zinciriyle.
- **İki kapsam**: bir depoya bağlı girdiler ve her yerden başvurabileceğiniz
  **genel** bir küme.
- **Bir dosya değildir ve `.env` dosyanızla ilgisi yoktur.** Girdiler bir depoyla
  *ilişkilendirilir* ama asla onun içine yazılmaz, asla commit'lenmez, asla
  push'lanmaz.
- **Hiçbir şey makinenizden çıkmaz.** Eşitleme yok, bulut yok.

## Kullanımı

<kbd>⌘⇧V</kbd> ile, araçlar menüsünden, Ayarlar'dan ya da komut paletinden açın.
Bilinen depolar arasında geçiş yapın, bir değeri görünür kılın veya kopyalayın ya
da bütün bir kümeyi **.env olarak kopyala** ile doğrudan panoya alın.

## Makineler arasında taşımak

[Güvenli paylaşım](secure-share.md) kasayı şifreli bir bundle'a paketleyebilir —
ve bunu yalnızca sırların dahil edilmesini açıkça istediğinizde yapar.

**Ayrıca bakınız:** [Güvenlik ve sırlar](security.md) · [Güvenli paylaşım](secure-share.md)
