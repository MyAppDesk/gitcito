---
title: Açık kaynak lisansları
category: Kendinize göre uyarlayın
order: 104
summary: Gitcito’nun bu sürümüyle gelen her üçüncü taraf paketin lisansını okuyun.
keywords: lisanslar licenses atıf bildirimler açık kaynak open source MIT Apache BSD üçüncü taraf bağımlılıklar teşekkürler hakkında
---

# Açık kaynak lisansları

Gitcito doksan küsur açık kaynak paket üzerine kuruludur ve neredeyse hepsi
karşılığında aynı şeyi ister: bildirimlerinin programla birlikte gitmesini. MIT,
BSD ve Apache bunu metnin kendisinde söyler. Bu sayfa o bildirimin yaşadığı
yerdir; böylece yükümlülüğü birinin kopyalamayı hatırlaması gereken bir dosya
değil, uygulama yerine getirir.

Aynı zamanda “makinemde gerçekte ne çalışıyor” sorusunun dürüst yanıtıdır.

## Açmak

Durum çubuğundaki **sürüm numarasına** tıklayın — bu **Yenilikler**’i açar —
ardından başlığındaki **Lisanslar**’a. Ya da komut paletini açıp *Açık kaynak
lisansları* arayın. Yenilikler gibi kendi sekmesinde açılır.

![Lisanslar sekmesi](../../screenshots/licenses.webp)

| Sütun | Nedir |
|-------|-------|
| Ad | Paketin npm’de yayımlandığı adı |
| Sürüm | Bu derlemenin çözdüğü kesin sürüm |
| Rozet | Paket bildiriminden SPDX tanımlayıcısı |

Paketin getirdiği tam lisans metnini okumak için bir satır seçin. Bağlantı
simgesi proje sayfasını tarayıcıda açar. Süzgeç kutusu hem paket adında hem
lisans tanımlayıcısında arar; `Apache` yazmak listeyi Apache lisanslı paketlere
daraltır.

## Neyi kapsar, neyi kapsamaz

Liste derleme sırasında **üretim bağımlılık ağacından** oluşturulur — paketlenmiş
uygulamanın içine giren her şey, hiç doğrudan istemediğiniz geçişli bağımlılıklar
dahil — artı Electron’un kendisi. Hiç dağıtılmayan derleme araçları bilerek
dışarıda bırakılır.

Bilinmesi gereken iki sınır:

- **Birkaç paket lisans dosyası getirmez.** Bildirimlerinde bir tanımlayıcı
  belirtirler, başka bir şey değil. Bu satırlar bir metin uydurmak yerine bunu
  söyler; çünkü okuyamadığınız bir lisans, güvenebileceğiniz bir lisans değildir.
- **Tanımlayıcı, paketin iddia ettiğidir.** Gitcito onu bildirir; denetlemez. Bir
  paketin bildirimi yanlışsa, bu sayfa da onunla birlikte yanlıştır.

Gitcito’nun kendi lisansı MIT’dir ve sağ üst köşedeki rozet onu GitHub’da açar.

**Ayrıca bakınız:** [Diller ve sağdan sola](languages.md) · [Temalar ve görünüm](themes.md)
