---
title: İmzalı commit'ler
category: Kurtarma ve emniyet
order: 61
summary: GPG, SSH veya X.509 ile imzalama ve her commit için bir doğrulama rozeti.
keywords: imza imzalama sign signing gpg ssh x509 doğrulanmış verified rozet güven
---

# İmzalı commit'ler

İmzalamayı depo bazında açın (**Ayarlar → depo dişlisi**): GPG, SSH veya X.509,
seçtiğiniz anahtarla. Gitcito o depo için `commit.gpgsign`, `gpg.format` ve
`user.signingkey` değerlerini yazar — başka her aracın okuduğu aynı yapılandırma.

| | |
|---|---|
| ![İmza sütunu, açık tema](../../screenshots/signed-commits-light.webp) | ![İmza sütunu, koyu tema](../../screenshots/signed-commits-dark.webp) |

Çizge, sırası değiştirilebilen özel bir **imza sütunu** kazanır:

| Rozet | Anlamı |
|---|---|
| **Doğrulanmış** | Git'in güvendiği bir anahtardan gelen geçerli imza |
| **Doğrulanmamış** | İmzalı, ama anahtar bilinmiyor ya da doğrulanmamış |
| **Süresi dolmuş** | İmzanın veya anahtarının süresi dolmuş |
| *(hiçbiri)* | İmzasız |

Etiketler de imzalanabilir — bkz. [Etiketler](tags.md).

**Ayrıca bakınız:** [Güvenlik ve gizli bilgiler](security.md)
