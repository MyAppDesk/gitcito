---
title: Fetch, pull ve push
category: Eşitleme ve çoklu depo
order: 50
summary: Ayak uydurmak — ve canınızı yakan işlemlerin başına konmuş korumalar.
keywords: fetch pull push force zorla otomatik fetch prune uzak depo upstream korumalı dal birden fazla uzak fork mirror etiket tags all
---

# Fetch, pull ve push

## Pull

Açılır menüden seçilen üç kip: **varsayılan**, **yalnızca fast-forward** ya da
**rebase**. Yerel değişiklikler pull'un başında otomatik olarak stash'lenir ve
sonunda geri konur; böylece kirli bir ağaç sizi engellemez.

## Push

Force push'lar her zaman `--force-with-lease` kullanır — son baktığınızdan beri
uzak depo hareket ettiyse reddeden güvenli varyant. **Korumalı bir dala** force
ile push etmek onay ister (liste, depo ayarları dişlisinde).

![Korumalı bir dalın force push öncesinde istediği onay](../../screenshots/force-push-guard.webp)

### Birden fazla uzak depo

**Push** düğmesi dalın upstream'ini hedefler. Bir deponun birden fazla uzak
deposu olduğunda yanındaki ok şunları da sunar:

| | |
|---|---|
| **Tek bir uzak depoya push et** | Tek bir uzak depo seçin — bir fork, bir mirror, bir dağıtım hedefi |
| **N uzak deponun hepsine push et** | Uzak depo başına birer push, sırayla |
| **Tüm etiketleri şuraya push et** | `git push <remote> --tags`, tüm yerel etiketler bir kerede |

Aynı iki eylem, kenar çubuğunda her uzak deponun kendi satırında da durur — ki
bu soru aklınıza geldiğinde genelde zaten oradasınızdır.

**Bir ret, geri kalanı iptal etmez.** Bir fork'a ve onun upstream'ine push etmek,
tam olarak bir tarafın reddedip diğerinin yine de geçmesi gereken durumdur;
bu yüzden her uzak depo ayrı ayrı rapor verir: başarılar tek bir bildirimde
adlarıyla anılır, her başarısızlık ise git'in gerekçesiyle kendi bildirimini
alır.

Dalın upstream'ini yalnızca listedeki **ilk** uzak depo belirler. Bir dalın tek
bir upstream'i vardır ve en son push edilen uzak depo, onu izlemesini
istediğiniz depo olmak zorunda değildir.

Her iki yol da sıradan bir push ile aynı kontrolleri çalıştırır — korumalı dal
onayı ve [gizli bilgi koruması](security.md). İki uzak depoya yayımlamak, riskin
iki katı demektir; yarısı değil.

## Fetch

Her uzak depoda **Hepsini fetch et ve prune**, ayrıca belirlediğiniz aralıkta
arka planda **otomatik fetch** (Ayarlar → Genel) ve araç çubuğunda "X önce fetch
edildi" rozeti.

**Yeniden yazılmış geçmiş** bulan bir fetch bunu söyler: bir bildirim dalı
adıyla anar ve satırı, tam olarak eskiden gösterdiği commit'te
[o zamandan beri ne değişti](range-diff.md) ekranını açan bir işaret kazanır.

## Aynı anda birçok depo

- Bir grup sekmesi kendi alt ağacının tamamını **Hepsini fetch et / Hepsini
  pull et** yapabilir.
- [Görev merkezi](mission-control.md) bunu tüm çalışma alanında yapar ve
  *yalnızca* gerçekten geride olan depoları pull edebilir.

## Uzak depolar

Kenar çubuğundan tek tek uzak depo ekleyin, düzenleyin, kaldırın ve fetch edin.
Dal satırları uzak depo başına varlık rozetleri taşır; böylece hangi uzak
depolarda bir dalın kopyası olduğunu bir bakışta görürsünüz.

**Ayrıca bakınız:** [Görev merkezi](mission-control.md) · [Hosting ve pull request'ler](hosting.md)
