---
title: Depo başına ayarlar
category: Çalışma alanı araçları
order: 94
summary: Korumalı dallar, bilgi, analitik, geçmiş ve işlem günlüğü.
keywords: depo ayarları repo settings korumalı dallar protected branches analitik analytics işlem günlüğü operation log geçmiş history bilgi info dişli gear sekme görseli tab image simge logo
---

# Depo başına ayarlar

Araç çubuğundaki araçların yanındaki dişli, uygulamaya değil **bu** depoya ait
ayarları açar.

![Depo başına ayarlar](../../screenshots/repo-settings.webp)

| Sekme | Neler var |
|---|---|
| **Genel** | Korumalı dallar (git config'te saklanan çoklu dal seçimi), imzalama, sekme görseli |
| **Config** | Bu deponun `.gitcito.json` içinde taşıdığı [kurallar](repo-config.md) ve onları denetleyen doctor |
| **Bilgi** | Bu depo hakkında serbest biçimli notlar ve alanlar, yerelde tutulur |
| **Kasa** | Bu deponun [kasa](vault.md) girdileri |
| **İçgörüler** | [Geçmiş panosu](insights.md) |
| **Analitik** | Bu depoda ne yaptığınız, yerelde sayılmış hâliyle |
| **Geçmiş** · **Günlükler** | İşlem günlüğü: Gitcito'nun çalıştırdığı her git komutu, çıktısıyla |

Dürüst olanı işlem günlüğüdür: bir şey tuhaf davrandığında tam komutu ve tam
hatayı gösterir, böylece bir hata raporu sıfat yerine olgu taşıyabilir.

## Sekme görseli

On sekme açıkken aynı biçimde başlayan adları — `api`, `api-gateway`,
`api-docs` — ayırt etmek zordur. Sekmedeki küçük bir resim, metinden daha
çabuk bulunur.

**Genel** bölümünde görsel alanına tıklayın. Deponun kendi görsellerini
listeler — PNG, JPEG, GIF, WebP, SVG, ICO, BMP ve AVIF —, her birinin küçük
önizlemesiyle; adı logo ya da simge gibi olan dosyalar önce gelir. Daraltmak
için yazın (`logo dark`, `assets/logo-dark.png` dosyasını bulur), ok
tuşlarıyla gezinin ve seçmek için Enter’a basın; ya da yolu elle yazın. Yol
**depo köküne göre** saklanır, böylece görsel, klasörü nerede olursa olsun
depoyla birlikte gider.

Sekmenin ne gösterdiği uygulama genelinde bir seçimdir: **Ayarlar → Genel →
Depo sekmelerinde gösterilen**:

| Seçenek | Sekme şunu gösterir |
|---|---|
| **Görsel ve ad** (varsayılan) | Klasör simgesi yerine görsel, ardından ad |
| **Yalnızca ad** | Klasör simgesi ve ad, sanki görsel yokmuş gibi |
| **Yalnızca görsel** | Yalnızca görsel; ad ipucuna taşınır |

Bilinmesi gereken sınırlar:

- Liste, git’in gördüğü dosyaları içerir — izlenen ve izlenmeyen, ama yok
  sayılanları değil — ve bir seferde en fazla 40 tane; geri kalanına ulaşmak
  için yazın. Yok sayılan bir görsel yine de elle yazılabilir.
- 1 MB’tan büyük ya da okunamayan görseller soluk görünür ve seçilemez:
  20 piksellik bir simgenin daha fazlasına ihtiyacı yok.
- Görseli **olmayan** bir depo, hangi seçenek seçilirse seçilsin her zaman
  adını gösterir — boş bir sekme tanınamazdı.
- Yol **bozuksa** — dosya silinmiş, yeniden adlandırılmış, görsel değil ya da
  çok büyük —, sekme sessizce ada döner ve bu ayarlar sekmesi yolun altında bir
  uyarı gösterir. Başka hiçbir şey şikâyet etmez.
- Görsel oturum başına bir kez okunur. Dosyayı aynı adla değiştirirseniz,
  yeniden yüklemek için bu ayarlar sekmesini tekrar açın.
- Ayar, bu makinedeki Gitcito ayarlarında durur, depoda değil; bu yüzden ekip
  arkadaşlarınıza geçmez.

**Ayrıca bakınız:** [Güvenlik ve sırlar](security.md) · [İçgörüler](insights.md)
