---
title: Çalıştırma ve hata ayıklama (launch.json)
category: Çalışma alanı araçları
order: 91
summary: VS Code launch yapılandırmalarınızı Gitcito'dan çıkmadan çalıştırın.
keywords: launch.json çalıştır run hata ayıklama debug vscode yapılandırma configs görevler tasks preLaunchTask input background compound compounds stopAll serverReadyAction paralel oturumlar
---

# Çalıştırma ve hata ayıklama

Gitcito `.vscode/launch.json` dosyanızı okur — kök dizindekini ve iç içe
olanları, ayraçlarla gruplanmış hâlde — ve seçtiğiniz yapılandırmayı tümleşik
terminalde çalıştırır.

![Launch seçici ve yüzen araç çubuğu](../../screenshots/launch-configs.webp)

- VS Code **değişkenleri çözümlenir** (`${workspaceFolder}` ve arkadaşları).
- Bir yapılandırmanın **`preLaunchTask`** görevi önce çalışır.
- **`${input:…}`** değerleri çalıştırmadan önce etkileşimli olarak sorulur
  (`promptString` ve `pickString`).
- **`isBackground`** görevleri (izleyiciler, geliştirme sunucuları) ayrık
  çalışır, böylece çalıştırmayı asla engellemezler.
- **Compound**'lar her üyeyi **kendi paralel oturumu** olarak çalıştırır —
  compound'un adını taşıyan tek bir bölünmüş terminalde, üye başına bir bölme,
  tıpkı VS Code'un hata ayıklama oturumları gibi. `stopAll: true` ile bir üyeyi
  durdurmak hepsini durdurur.
  Birden çok üyenin paylaştığı görevler, üyeler başlamadan önce kendi
  bölmesinde **bir kez** çalışır — sürüm yükseltme sorusu üye başına değil, bir
  kez sorulur.
  Bu bölme başarıda kendini kapatır, hata durumunda açık kalır.
- **`serverReadyAction`** dikkate alınır: oturumun çıktısı yapılandırılan
  desenle eşleştiğinde, duyurulan URL tarayıcınızda açılır
  (`openExternally`; `debugWithChrome` / `debugWithEdge` de tarayıcıyı açar —
  Gitcito ona bir hata ayıklayıcı bağlayamaz).

![İki paralel oturum çalıştıran bir compound](../../screenshots/launch-compound.webp)

Yüzen bir araç çubuğu size **duraklat / sürdür, yeniden başlat, durdur**
düğmelerini verir ve çalışan oturumlar arasında geçiş yapar.

**Ayarlar → Genel → launch.json'ı etkinleştir** ile açın. **LAUNCH** düğmesi
Git / Dosyalar sekmelerinin yanında belirir.

Bir compound üyesi *compound › üye* olarak görünür ve yeniden başlatmak
yalnızca o üyeyi yeniden başlatır.

Gitcito'nun bilerek **yapmadığı** şey: programlarınızı gerçek terminallerde
çalıştırır ama bir hata ayıklayıcı değildir — kesme noktası yok, değişken
incelemesi yok, Debug Adapter Protocol yok. Yalnızca attach yapılandırmaları
bir `preLaunchTask` taşıdığında çalışır (iş, görevin kendisidir); saf bir
attach'in çalıştıracak bir şeyi yoktur.

**Ayrıca bakınız:** [Tümleşik terminal](terminal.md)
