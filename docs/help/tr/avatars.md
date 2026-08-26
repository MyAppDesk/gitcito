---
title: Yazar avatarları
category: Kendinize göre uyarlayın
order: 103
summary: Varsa Gravatar fotoğrafı, yoksa üretilmiş bir avatar — ve depoya tepki veren, başlık çubuğundaki bir yüz.
keywords: avatar avatarlar gravatar blobatar yazar fotoğraf resim identicon yüz çevrimdışı gizlilik e-posta hash ruh hali ifade animasyon hareket üzgün kızgın mutlu düşünen korkmuş kararsız hasta uykulu ayrık stash uykuda
---

# Yazar avatarları

Commit listesi bir isim duvarıdır ve isimler yavaş okunur. Her birinin yanındaki resim,
"bunu kim yazdı" sorusunu bir bakışta cevaplanan bir şeye dönüştürür. Gitcito
gösterdiği her yazara bir tane koyar: graftaki yazar sütununda, commit ayrıntılarında
yazarın ve her ortak yazarın yanında, yazarken açılan ortak yazar seçicisinde, profil
değiştiricide ve Ayarlar'daki her profilin yanında.

## Resim nereden gelir

İki kaynak, bu sırayla denenir:

| Kaynak | Ne zaman kullanılır |
|---|---|
| **Gravatar** | Commit e-postasının bir Gravatar hesabı var. HTTPS üzerinden, e-postanın küçük harfli hâlinin SHA-256 özetiyle alınır. |
| **Üretilmiş avatar** | Diğer her durum — Gravatar yok, ağ yok ya da sorgu kapalı. E-postadan yerel olarak çizilir, hiç indirilmez. |

Üretilmiş avatar renkli bir kare değil, küçük bir yaratıktır: aynı e-posta her zaman
aynı biçimi ve aynı renkleri üretir, böylece bir yazar depolar ve yeniden başlatmalar
arasında tanınabilir kalır. İki farklı e-posta pratikte hiç çakışmaz. Onu
[blobatar](https://github.com/Alain00/blobatar) (MIT) çizer ve hiç ağ gerektirmez —
Gravatar'ı olmayan yazarlarla dolu bir depo bile ilk çizimde, çevrimdışı olarak, tam bir
ayırt edilebilir yüz takımı alır.

Tohum **commit e-postası** olduğu için, iki adresle commit'leyen bir yazar iki avatar
alır. Bu bilinçli — graftaki yazar sütununun verdiği sinyalin aynısıdır ve genellikle bir
makine hesabını ya da yanlış ayarlanmış bir `user.email`'i böyle fark edersiniz. İki
adres gerçekten aynı kişiyse [yazar öznitelikleri](attributes.md) ile düzeltin.

## Başlık çubuğundaki yüz

Profil adınızın yanındaki avatar, Gitcito'da **sizi, bu depoda, şu anda** temsil eden tek
avatardır — dolayısıyla deponun durumuna tepki veren tek avatar. Bir şey olduğunda yüzünü
değiştirir, geri kalan zamanda nötr kalır.

![Başlık çubuğundaki avatar, kızgın yüzüyle](../../screenshots/avatar-mood.webp)

Neye tepki verir, en kötüden başlayarak: çakışmalı bırakılmış dosyalar; git'e nasıl
biteceği hiç söylenmemiş bir birleştirme, yeniden temellendirme, cherry-pick ya da
geri alma; ayrık bir HEAD — altında işlenmemiş çalışma varsa telaşlı, yoksa yalnızca
kararsız; gönderilmeden ya da uzaktan alınmadan biriken commit'ler; işlenmeden
biriken değişiklikler; kimsenin açmadığı bir stash çekmecesi; ve bir aydır hiçbir
şeyin inmediği bir depo.

En kötüsü kazanır: çakışmaları *ve* kırk gönderilmemiş commit'i olan bir depo
çakışmaları takar. Avatarın üzerine gelin; ipucu yüze tam olarak neyin yol açtığını
söyler — belirtilmemiş bir nedenle değişen bir resim bilmecedir, sinyal değil.
Okunacak olan ipucudur; yüz yalnızca bakmanızı sağlar.

Eşikler bilinçli olarak yüksek. Tek bir gönderilmemiş commit'te endişelenen bir yüz
kalıcı olarak endişelidir ve kalıcı bir sinyal, okumamayı öğrendiğiniz bir
sinyaldir. Upstream'i olmayan bir dal hoşnut değil nötr kalır: "senkron", kimsenin
göndermediği bir dal hakkında yapılabilecek bir iddia değildir.

**Bu süslemedir, ölçüm değil.** Gerçek sayıları durum çubuğu taşır ve güvenilecek olan
odur. Yüz yalnızca *bir şey var* der, bir bakışta.

### Hareket

Başlık çubuğundaki avatar kendiliğinden nefes alır ve göz kırpar. Şuradan kapatın:
**Ayarlar → Temalar → Graf → Profil avatarını canlandır** — ifade yine depoyu izler,
yalnızca hareket etmeyi bırakır. Sisteminiz azaltılmış hareket istediğinde hareket
otomatik olarak da atlanır.

Yalnızca bu avatar canlanır. Canlandırılmış bir avatarın önbelleğe alınmış görüntü yerine
canlı SVG olarak çizilmesi gerekir; bu bir tane için uygun, kaydırılan bir grafın çizdiği
birkaç yüz tane için ise savurganlıktır.

## Sorguyu kapatmak

**Ayarlar → Temalar → Graf → Avatarları göster.**

Kapalı şu anlama gelir:

- `gravatar.com`'a hiçbir istek gitmez — ne ertelenmiş, ne önbelleğe alınıp yeniden
  denenmiş;
- avatarlar yine görünür, hepsi yerel olarak üretilmiş.

Yani bu bir gizlilik anahtarıdır, "resimleri gizle" değil. Avatarları tamamen kaldıran
bir ayar yoktur.

## Sınırlar

- **Bir Gravatar sorgusu, gravatar.com'a bu e-postaya bakıldığını söyler.** Özet gizli
  değildir: aday bir e-postası olan herkes onu özetleyip karşılaştırabilir. Bir deponun
  yazar listesi, üçüncü bir tarafa vermek istemeyeceğiniz bir şeyse, açmadan önce sorguyu
  kapatın.
- **Yalnızca Gravatar.** GitHub, GitLab veya Bitbucket'a yüklediğiniz avatarlar okunmaz —
  yazar başına kimlik doğrulamalı bir sunucu API çağrısı gerekir ki bir süs için çok fazla
  ağ demektir.
- **Geçersiz kılma yok.** Bir yazara seçtiğiniz bir resmi sabitleyemez, üretilmiş stili
  değiştiremezsiniz. Avatar, e-postanın bir fonksiyonudur, başka hiçbir şeyin değil.
- **Gravatar fotoğrafının ifadesi olmaz.** Profil e-postanızın bir fotoğrafı varsa başlık
  çubuğu fotoğrafı gösterir, yüzü göstermez — bir fotoğraf size surat yapamaz. İfadeli
  blobu yeğliyorsanız sorguyu kapatın.
- **Yüz yalnızca etkin depoyu izler.** Depo olmayan bir sekmede tepki verilecek bir şey
  yoktur, bu yüzden nötr kalır.
- **Bir seferde tek okuma.** Yüz, bulduğu en kötü tek şeyi gösterir; yani bir depo
  birkaç açıdan dağınık olup yine de tek bir ifade takınabilir. Bir durum listesi
  değildir — o iş durum çubuğunun ve ipucunun işidir.
- **Küçük küçüktür.** Graftaki yazar sütununda avatar 16px'tir; rengi ve siluetini taşır,
  ayrıntıyı taşımaz. Commit ayrıntıları yazarı 38px çizer ve yüzü gerçekten orada
  görürsünüz.

**Ayrıca bkz.:** [Temalar ve görünüm](themes.md) · [Commit grafı](graph.md) ·
[Yazar öznitelikleri](attributes.md) · [Profiller](profiles.md)
