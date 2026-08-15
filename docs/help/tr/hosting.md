---
title: Sunucular ve pull request'ler
category: Eşitleme ve çoklu depo
order: 56
summary: PR'ları her yerde oluşturun; GitHub'da inceleyip birleştirin.
keywords: pull request PR merge request birleştirme isteği inceleme onay issue konu GitHub GitLab Bitbucket Azure DevOps review approve merge issues
---

# Sunucular ve pull request'ler

## Oluşturma

Uygulamadan çıkmadan bir pull (ya da merge) request oluşturun: dal açılır
listeleri, dalın commit'lerinden önceden doldurulmuş başlık ve gövde, taslak
düğmesi ve — GitHub'da — oluştururken uygulanan inceleyiciler, etiketler ve
atananlar.

![Bir pull request oluşturma](../../screenshots/create-pr.webp)

**GitHub, GitLab, Bitbucket ve Azure DevOps** üzerinde çalışır. Dördünün de açık
PR/MR'ları kenar çubuğunda listelenir.

Dal karşılaştırmasından, grafikten, PR panelindeki `+` düğmesinden ya da bir
issue'dan başlatın (issue `Closes #N` satırını sizin için doldurur).

## İnceleme — GitHub

| | |
|---|---|
| **Konuşma** | Yorumlar ve inceleme durumu |
| **Kontroller** | Geçti/kaldı/beklemede durumlarıyla CI kontrol çalıştırmaları ve günlükleri görüntüleme bağlantıları |
| **Görülen dosyalar** | Dosya başına ✓ kontrol listesi ve ilerleme |
| **Satır içi başlıklar** | `file:line`'a göre gruplanmış satır yorumları, diff hunk'ları ve yanıtlarıyla birlikte |
| **Eylemler** | Yorum yapma, onaylama, değişiklik isteme ve merge / squash / rebase |

İncelemenin ortasında biri force push ederse, [o zamandan beri ne değişti](range-diff.md)
size tam olarak neyin kaydığını gösterir.

## Issue'lar, kilometre taşları, sürümler — GitHub

Issue'lara göz atın ve tam bir issue sekmesi açın: gövde, yorumlar, etiketler,
atananlar, kilometre taşı, Projects v2 alanları, kapatma/yeniden açma ve **bu
issue için bir dal oluşturma** (yapay zekâ adlandırmasıyla). Kilometre taşları
ilerlemelerini ve issue'larını gösterir. Sürümlere bir changelog sayfasıyla
göz atılabilir.

## Bildirimler — GitHub

Bütün gelen kutunuz — inceleme istekleri, bahsedilmeler, CI etkinliği — her
depoyu kapsayacak şekilde, okunmamış/tümü filtreleri ve okundu olarak işaretleme
ile birlikte. Araç çubuğundaki zil okunmamış rozetini taşır ve bir inceleme
istendiğinde ya da CI bittiğinde isteğe bağlı masaüstü bildirimleri düşer.

## Token'lar

Birden çok hesap veya kuruluş için profil başına token'lar, işletim sisteminizin
anahtar zincirinde saklanır. Gitcito ayrıca **git credential helper**'ınızın
zaten tuttuğu bilgileri ödünç alabilir; böylece hâlihazırda kimlik
doğruladığınız bir kuruluş çoğu zaman hiçbir kuruluma ihtiyaç duymaz.
[Güvenlik ve sırlar](security.md) sayfasına bakın.

**Ayrıca bakınız:** [Yığılmış dallar](stacks.md) · [Yapay zekâ özellikleri](ai.md)
