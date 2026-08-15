---
title: Çalıştırma ve hata ayıklama (launch.json)
category: Çalışma alanı araçları
order: 91
summary: VS Code launch yapılandırmalarınızı Gitcito'dan çıkmadan çalıştırın.
keywords: launch.json çalıştır run hata ayıklama debug vscode yapılandırma configs görevler tasks preLaunchTask input background
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

Yüzen bir araç çubuğu size **duraklat / sürdür, yeniden başlat, durdur**
düğmelerini verir ve çalışan oturumlar arasında geçiş yapar.

**Ayarlar → Genel → launch.json'ı etkinleştir** ile açın. **LAUNCH** düğmesi
Git / Dosyalar sekmelerinin yanında belirir.

**Ayrıca bakınız:** [Tümleşik terminal](terminal.md)
