---
title: Git flow
category: Dallanma ve cerrahi
order: 46
summary: Özellikleri, sürümleri ve acil düzeltmeleri, hangi dalın nereye birleştiğini ezberlemeden başlatıp bitirin.
keywords: gitflow git flow özellik feature sürüm release hotfix acil düzeltme develop main master önek versiontag dallanma modeli başlat bitir etiket tag
---

# Git flow

[git-flow dallanma modeli](https://nvie.com/posts/a-successful-git-branching-model/)
beş kural ve bir yığın defter tutma işidir. Kurallar kolaydır; insanların sürüm
gününde akşam altıda yanlış yaptığı şey defter tutmadır — bir hotfix'i `main`'e
birleştirip `develop`'ı unutmak ya da yanlış dalı etiketlemek gibi.

`⌘K` → **Git flow** defteri sizin yerinize tutar.

![Bir release dalı üzerinde git flow penceresi: üstte dal başlatma, altta bitirme](../../screenshots/gitflow.webp)

## Yerleşim

| Dal | İçeriği |
|--------|-------|
| **Yayınlanan dal** (`main`) | Üretimde olan. Her sürüm burada etiketlenir. |
| **Entegrasyon dalı** (`develop`) | Biten işlerin sürümler arasında biriktiği yer. |
| `feature/*` | Tek bir iş birimi, develop'tan dallanır. |
| `release/*` | Kararlı hâle getirilen bir sürüm, develop'tan dallanır. |
| `hotfix/*` | Acil bir düzeltme, **main**'den dallanır — üretim develop'ı bekleyemez. |

Gitcito, `git flow` komut satırı aracının kullandığı `gitflow.*` git
yapılandırma anahtarlarının aynısını okur ve yazar (`gitflow.branch.master`,
`gitflow.prefix.feature`, …). Birinin daha önce `git flow init` çalıştırdığı bir
depo anında tanınır ve burada kurulan bir depo sonrasında komut satırıyla da
çalışır. Gitcito baştan sona düz git komutları çalıştırır — aracın kurulu olması
gerekmez.

**Kur**, bu anahtarları yazar ve entegrasyon dalı henüz yoksa onu yayınlanan
daldan oluşturur. Başka hiçbir şeye dokunulmaz. Herhangi bir adı ya da öneki
sonradan **Yerleşimi düzenle** üzerinden değiştirebilirsiniz.

## Başlatma

Bir tür seçin, bir ad yazın, **Başlat**'a basın. Pencere, siz onay vermeden
önce oluşturacağı dalı ve hangi daldan oluşturulacağını gösterir:

```
feature/search   from develop
hotfix/1.0.1     from main
```

Ad sizin yazdığınızdır; önek yerleşimden gelir.

## Bitirme

**Bitir**, otomatikleştirmeye değen kısımdır, çünkü hepsi eksiksiz gerçekleşmesi
gereken birkaç adımdan oluşur:

| Tür | Gitcito ne yapar |
|------|-------------------|
| Özellik | `--no-ff` ile develop'a birleştirir, dalı siler, sizi develop'ta bırakır |
| Sürüm | main'e birleştirir, etiketler, develop'a birleştirir, dalı siler, sizi develop'ta bırakır |
| Acil düzeltme | main'e birleştirir, etiketler, develop'a birleştirir, dalı siler, sizi **main**'de bırakır |

`--no-ff` bilinçli bir tercihtir: dalı sonradan [grafikte](graph.md) görünür
kılan şey o birleştirme commit'idir. O olmadan kısa bir özellik düz bir çizginin
içinde kaybolur ve model var oluş sebebini yitirir.

Etiket `<sürüm etiketi öneki><ad>` biçimindedir — varsayılan önekle
`release/1.1.0`, `v1.1.0` olur. Atlamak için **Sürümü etiketle** kutusunun
işaretini kaldırın; varsayılandan fazlasını istiyorsanız bir etiket mesajı yazın.

### Yapmayı reddettiği şeyler

- **Kirli bir çalışma dizini onu durdurur.** Önce commit'leyin ya da
  [stash](stashes.md)'leyin; bitirme işlemi iki dalı birleştirir ve HEAD'i iki
  kez oynatır, bunu commit'lenmemiş işin etrafında yapmak da insanların o işi
  kaybetme biçimidir.
- **Çakışan bir birleştirme her şeyi geri alır.** main'e birleştirme başarılı
  olup develop'a birleştirme çakışırsa, aksi hâlde yarım kalmış bir sürümle baş
  başa kalırdınız. Gitcito her dalı bulunduğu yere geri döndürür ve çakışmayı
  bildirir. O dalı elle birleştirin, [çakışma çözücüde](conflicts.md) çözün ve
  akışı elinizle bitirmek size kalsın.
- **Asla push yapmaz.** Bitirme yereldir. Hazır olduğunuzda main'i, develop'ı ve
  yeni etiketi push edin — bkz. [eşitleme](syncing.md).

### Geri alma

Tek bir **Geri al** her şeyi eski hâline getirir: iki dal da önceki
commit'lerine döner, etiket silinir ve biten dal eski ucunda yeniden oluşturulur.
Bitirmeyi denemeyi güvenli kılan şey tam olarak budur.

## Ne zaman kullanmamalı

Git flow, sürümlenmiş yayınları ve desteklenen bir üretim dalı olan yazılıma
uyar. Günde birkaç kez `main`'den dağıtım yapıyorsanız, release ve hotfix
dalları kullanmayacağınız birer merasimden ibarettir — o durumda
[yığılmış dallar](stacks.md) ya da `main`'den çıkan düz, kısa ömürlü dallar daha
iyi oturur. Modelin özellik yarısı yine de tek başına gayet iyi çalışır.
