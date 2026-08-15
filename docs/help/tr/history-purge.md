---
title: Bir dosyayı geçmişten kaldırma
category: Dallanma ve cerrahi
order: 48
summary: Sızmış bir kimlik bilgisini ya da devasa bir ikili dosyayı her commit'ten çıkarın — ve bunun bedelini tam olarak anlayın.
keywords: geçmiş temizleme yeniden yazma purge rewrite filter-branch bfg filter-repo sızmış gizli anahtar kimlik bilgisi token dosya kaldırma büyük blob depo küçültme yedek pre-purge anahtar değiştirme en büyük dosyalar
---

# Bir dosyayı geçmişten kaldırma

`git rm`, bir dosyanın *yeni* commit'lerde görünmesini durdurur. Hâlihazırda
yapılmış olanlara ise hiçbir etkisi yoktur: blob hâlâ nesne veritabanındadır,
hâlâ her klonun içindedir, hâlâ tek bir `git show` uzaklıktadır.

Bu iki durumda önem kazanır — dosya bir kimlik bilgisiyken ve 400 MB'lık bir
şeyken.

`⌘K` → **Dosyayı geçmişten kaldır**, ya da dosyaya sağ tıklayın — proje
ağacında, bir commit'in dosya listesinde veya commit besteci panelinde. Bir
dosyayı *silen* commit, genellikle birinin o dosyanın hâlâ geçmişte durduğunu
fark ettiği yerdir; bu yüzden çıkış yolu da o menüdedir.

## Yolu bulmak

İki giriş yolu var, çünkü farklı sorulara cevap veriyorlar.

**Yazın** — depoya göreli, başında eğik çizgi olmadan — ne kaldırmaya
geldiğinizi zaten biliyorsanız.

**Geçmişe göz atın** — bilmiyorsanız. Bu liste, şimdiye kadar commit'lenmiş her
yolu en ağırından başlayarak gösterir; her birinin kaç sürümü olduğunu ve hâlâ
izlenip izlenmediğini de. Silinmiş yollar böyle işaretlenir ve genellikle
aradığınız da onlardır: çalışma dizininde artık olmayan ama her klonda duran bir
dosya, sıradan bir dosya seçme penceresinin size gösteremeyeceği durumun ta
kendisidir — çünkü seçilecek dosya orada değildir.

Aynı liste, insanların buraya gelmesinin diğer nedenine de cevap verir — *bu
klon niye iki gigabayt* — çünkü her yolun blob'larının gerçekten kapladığı bayta
göre sıralanmıştır. Bir satır seçmek onu anında ölçer.

![Şimdiye kadar commit'lenmiş her yol, en ağırı üstte, silinmiş olanlar işaretli](../../screenshots/history-purge-browse.webp)

## Onaylamadan önce ölçün

**Ölç**'e basın (ya da bir satır seçin). Henüz hiçbir şey yazılmaz. Şunları
görürsünüz:

| | |
|---|---|
| **Yeniden yazılan commit'ler** | Dosyayı tutan ilk commit'ten itibaren her commit |
| **Dallar / etiketler** | Yeri değişecek referanslar |
| **Blob'larının tuttuğu yer** | Bu sürümlerin gerçekten kapladığı bayt |
| **İlk commit** | Yeniden yazmanın başladığı yer — ondan sonraki her şey yeni bir hash alır |

![Ölçüm: yeniden yazılan commit'ler, etkilenen referanslar, tutulan bayt ve gizli anahtarı yine de değiştirme uyarısı](../../screenshots/history-purge.webp)

Sayı sıfırsa yol yanlıştır. Bu genellikle bir yazım hatası ya da eksik bir dizin
öneki demektir, dosyanın yokluğu değil.

## Yeniden yazma aslında ne yapar

Gitcito her dalı ve etiketi `refs/gitcito/pre-purge/<timestamp>/…` altına
kopyalar, ardından şunu çalıştırır:

```sh
git filter-branch --force \
  --index-filter 'git rm --cached --ignore-unmatch -- <path>' \
  --prune-empty --tag-name-filter cat -- --branches --tags
```

`--index-filter`, her commit'i checkout etmek yerine doğrudan indeksi yeniden
yazar; dakikalar ile saatler arasındaki fark budur. `--all` yerine
`--branches --tags` kullanılması bilinçlidir: `--all` yedek referansları da
kapsardı ve yeniden yazma kendi emniyet ağını yiyip bitirirdi.

Kaldırılan dosyadan başka hiçbir şey içermeyen commit'ler düşürülür
(`--prune-empty`). Etiketler yeniden yazılmış commit'lerine yönlendirilir.

## Yedek ve alanın neden hemen geri gelmediği

Temizleme geri alınabilir ve bunun bedeli, **siz söyleyene kadar disk alanının
geri kazanılmamasıdır**. Yedek durdukça eski commit'lere hâlâ erişilebilir
olduğundan git onları toplamaz.

| Eylem | Etkisi |
|-------|--------|
| **Geri yükle** | Her dal ve etiket temizleme öncesi commit'ine döner; dosya da onlarla birlikte geri gelir |
| **Yedeği at** | Yedek referansları siler, reflog'u süresi dolmuş sayar, `git gc --prune=now` çalıştırır — alan geri gelir, temizleme artık kalıcıdır |

Tek adım yerine iki adım, çünkü ilki geri dönülebilir olan yarısıdır, ikincisi
değildir.

## Gizli anahtarı yine de değiştirin

**Bir kimlik bilgisi bir kez push edildiyse, geçmişinizi yeniden yazmak onu
sızmamış hâle getirmez.** Birileri onu fetch etmiş olabilir; sunucular
başvurulmayan nesneleri bir süre saklar; bir CI günlüğü onu ekrana basmış
olabilir. Yeniden yazma yayılmayı durdurur — ifşayı geri almaz.

Anahtarı değiştirin. Sonra temizleyin ki bir sonraki klonlayan onu bulmasın.

## Yapmayacağı şeyler

- **Push etmez.** Yeniden yazma yereldir. Sonucu yayımlamak, etkilenen her dala
  bir force push demektir ve herkesin yeniden klonlaması ya da hard reset
  yapması gerekir — bu kararın verildiği yer
  [force push koruması](syncing.md).
- **Kirli bir çalışma dizininde** ya da merge/rebase ortasında **reddeder.**
  Yeniden yazma HEAD'i defalarca oynatır ve bunu commit'lenmemiş işin etrafında
  yapmak, o işi kaybetmenin yoludur.
- **Yola göre yeniden yazar, içeriğe göre değil.** Kendi dosyasında yaşamak
  yerine bir kaynak dosyanın içine yapıştırılmış bir gizli anahtarı kaldırmak
  bir içerik filtresi gerektirir — orası `git filter-repo --replace-text`
  alanıdır ve Gitcito onu sarmalamaz.
- **`filter-branch` çok büyük geçmişlerde yavaştır.** Git ile her yerde birlikte
  gelen araç odur; Gitcito'nun onu kullanmasının nedeni de budur. On binlerce
  commit'i olan bir depoda [terminaldeki](terminal.md) `git filter-repo` daha
  hızlı araçtır.
- **Başkalarının klonları sizin deponuz değildir.** Onlar yeniden klonlayana
  kadar eski geçmişi taşımaya devam eder.
