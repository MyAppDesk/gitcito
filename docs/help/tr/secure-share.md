---
title: Güvenli paylaşım
category: Güvenlik
order: 72
summary: Gizli bilgileri, notları ya da bütün bir çalışma alanını makineler — ya da takım arkadaşları — arasında tek bir şifreli dosya olarak taşıyın.
keywords: güvenli paylaşım secure share dışa aktarma içe aktarma export import bundle paket şifreli encrypted çalışma alanı aktarım makine takım notlar yapı sunucu yok no backend
---

# Güvenli paylaşım

Yeni bir makineyi — ya da yeni bir takım arkadaşını — hazırlamak genellikle her
şeyi baştan girmek demektir. Güvenli paylaşım bunun yerine hepsini tek bir
şifreli `.gitcito` dosyasına koyar: Gitcito'nun takım özelliklerinin **sunucusu
yoktur**, dolayısıyla taşıma aracı dosyanın *kendisidir*. Onu dosyaları zaten
nasıl gönderiyorsanız öyle gönderin; parola ayrı yoldan gider.

![Tek bir deponun ayarlarını şifreli bir paket olarak dışa aktarma](../../screenshots/secure-share.webp)

![Aynı dışa aktarmanın bütün bir çalışma alanı için hâli](../../screenshots/secure-workspace.webp)

## Pakete neler girebilir

| Bölüm | İçerik |
|---|---|
| **Kasa** | Genel kasanın gizli bilgileri (depo bazlı kasa kayıtları yerinde kalır) |
| **Depo dosyaları** | İzlenmeyen yapılandırma ve gizli dosyalar; içe aktarmada aynı göreli yollarda yeniden oluşturulur |
| **Çalışma alanı yapısı** | Sekme düzeninin kendisi — gruplar, renkler, sıra —; depolara yerel yollarınızla değil, her zaman uzak URL ile başvurulur |
| **Commit notları** | Bir deponun `refs/notes/commits` ref'i; içe aktarmada hiçbir uzak depoya yazma erişimi gerekmeden uygulanır |

Gizli bilgiler yalnızca **kutuyu işaretlediğinizde** pakete girer. O işaret
konmadan oluşturulmuş bir paket hiçbir kimlik bilgisi içermez. Uygulama ayarları
pakette taşınmaz — onların Ayarlar'da kendilerine ait düz JSON dışa aktarması
vardır.

## İçe aktarma

İçe aktarma ekranı, herhangi bir şey uygulanmadan **önce** paketin içinde ne
olduğunu bölüm bölüm gösterir; depolar ise zaten sahip olduklarınızla
eşleştirilir — önce uzak depo URL'sine, sonra klasöre göre — böylece içe aktarma
her şeyi baştan klonlamaz.

Bir **çalışma alanı yapısı** bölümü, çalışma alanını zaten sahip olduğunuz
depolarla yeniden kurar; sahip olmadıklarınız uzak adresleriyle listelenir,
böylece önce onları klonlayıp yeniden içe aktarabilirsiniz — Gitcito burada
sizin adınıza asla klonlama yapmaz. Bir **commit notları** bölümü neyin
ineceğini önizler — yeni, birebir aynı, farklılaşan ya da sizde olmayan
commit'lere bağlı — ve farklılaşan notlar yalnızca **üzerine yaz** kutusunu
işaretlediğinizde değiştirilir; ayrışan notlar birleştirilmez.

**Ayrıca bakınız:** [Kasa](vault.md) · [Güvenlik ve sırlar](security.md) ·
[Commit notları](notes.md) · [Çalışma alanları](workspaces.md)
