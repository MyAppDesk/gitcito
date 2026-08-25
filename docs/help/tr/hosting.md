---
title: Sunucular ve pull request'ler
category: Eşitleme ve çoklu depo
order: 56
summary: PR'ları her yerde oluşturun; GitHub ve GitLab'da inceleyip birleştirin.
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

## Listedeki yığınlar

Birbirinin üstünde duran pull request'ler tek bir satıra katlanır: yığın
simgesi, zincirin indiği dal ve kaç tane olduğu. Açtığında zinciri okuma
sırasıyla görürsün — yapraktan tabana — ve her satırın altında neye merge
olduğunu söyleyen küçük bir ok olur; yön ekranda durur, dört temele bakıp
çıkarılmaz.

O grubu iki şey oluşturur: pull request'ler bir [yerel yığına](stacks.md) aitse
GitHub'ın kendi yığın numarası; değilse ref'lerin kendisi — temeli bir başkasının
ucu olan pull request onun üstünde durur. İkinci kural, bunun GitLab, Bitbucket
ve Azure DevOps'ta da çalışmasının sebebidir.

## İnceleme — GitHub ve GitLab

| | |
|---|---|
| **Konuşma** | Yorumlar ve inceleme durumu |
| **Kontroller** | Geçti/kaldı/beklemede durumlarıyla CI kontrol çalıştırmaları (GitHub) ya da pipeline işleri (GitLab) ve günlükleri görüntüleme bağlantıları |
| **Görülen dosyalar** | Dosya başına ✓ kontrol listesi ve ilerleme |
| **Satır içi başlıklar** | `file:line`'a göre gruplanmış satır yorumları ve yanıtları |
| **Eylemler** | Yorum yapma, onaylama, değişiklik isteme ve merge / squash |

İncelemenin ortasında biri force push ederse, [o zamandan beri ne değişti](range-diff.md)
size tam olarak neyin kaydığını gösterir.

GitLab farkları, açıkça söylersek: GitLab'da tek bir "incelemeyi gönder"
çağrısı yok; bu yüzden **onaylama** onun onay uç noktasını kullanır,
**değişiklik isteme** ise onayınızı kaldırıp yorumunuzu gönderir.
**Rebase-merge** sunulmaz — GitLab, merge commit mi fast-forward mü olacağına
projenin ayarlarından karar verir; bu yüzden merge menüsünde yalnızca merge ve
squash görünür. Satır içi başlıklar dosyayı ve satırı gösterir ama çevresindeki
diff hunk'ını göstermez; GitLab'ın API'si bunu döndürmez. İnceleme/birleştirme,
**gitlab.com** üzerindeki projeler için çalışır; kendi sunucunuzda barındırılan
örnekler henüz desteklenmiyor. Bitbucket ve Azure DevOps inceleme için hâlâ
tarayıcıda açılır.

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
