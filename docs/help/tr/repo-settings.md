---
title: Depo başına ayarlar
category: Çalışma alanı araçları
order: 94
summary: Korumalı dallar, bilgi, analitik, geçmiş ve işlem günlüğü.
keywords: depo ayarları repo settings korumalı dallar protected branches analitik analytics işlem günlüğü operation log geçmiş history bilgi info dişli gear
---

# Depo başına ayarlar

Araç çubuğundaki araçların yanındaki dişli, uygulamaya değil **bu** depoya ait
ayarları açar.

![Depo başına ayarlar](../../screenshots/repo-settings.webp)

| Sekme | Neler var |
|---|---|
| **Genel** | Korumalı dallar (git config'te saklanan çoklu dal seçimi), imzalama |
| **Config** | Bu deponun `.gitcito.json` içinde taşıdığı [kurallar](repo-config.md) ve onları denetleyen doctor |
| **Bilgi** | Bu depo hakkında serbest biçimli notlar ve alanlar, yerelde tutulur |
| **Kasa** | Bu deponun [kasa](vault.md) girdileri |
| **İçgörüler** | [Geçmiş panosu](insights.md) |
| **Analitik** | Bu depoda ne yaptığınız, yerelde sayılmış hâliyle |
| **Geçmiş** · **Günlükler** | İşlem günlüğü: Gitcito'nun çalıştırdığı her git komutu, çıktısıyla |

Dürüst olanı işlem günlüğüdür: bir şey tuhaf davrandığında tam komutu ve tam
hatayı gösterir, böylece bir hata raporu sıfat yerine olgu taşıyabilir.

**Ayrıca bakınız:** [Güvenlik ve sırlar](security.md) · [İçgörüler](insights.md)
