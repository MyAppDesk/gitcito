---
title: Timelapse
category: Depo ve geçmiş
order: 14
summary: Deponun bütün yaşamını bir animasyon olarak oynatın ve dışa aktarın.
keywords: timelapse hızlandırılmış video animasyon geçmiş tekrar oynatma gource dışa aktarma webm film yılın özeti
---

# Timelapse

Deponun büyüyüşünü izleyin.

Her dosya bir noktadır ve en üst düzey klasörüne göre yerleştirilir: eklendiğinde
doğar, bir commit ona dokunduğunda titreşir, tekrar tekrar düzenlendikçe
büyür, silindiğinde söner. Tarih, yazar, konu ve işleyen commit/dosya/yazar
sayaçları üstte, ilerleme çubuğu ise altta yer alır.

![Oynatmanın ortasındaki timelapse](../../screenshots/timelapse.webp)

![Bir deponun bütün yaşamı, yeniden oynatılıyor](../../screenshots/clip-timelapse.webp)

## Kontroller

- **Oynat / duraklat**, **4× ile 32×** arası hızlar ve yeniden başlatma.
- Kaydırıcı, aranan noktaya **baştan yeniden oynatarak** gider; böylece geriye
  gezindiğinizde yaklaşık bir tahmine değil, tam olarak doğru duruma varırsınız.

## Videoyu dışa aktarma

**Videoyu dışa aktar**, tuvali baştan sona kaydeder ve `.webm` dosyasını nereye
kaydedeceğinizi sorar.

Kayıt sayfanın kendi içinde yapılır (`MediaRecorder`) — kurulacak bir kodlayıcı
yok, ffmpeg yok ve hiçbir şey hiçbir yere yüklenmiyor. Siz bir yol seçene kadar
diske hiçbir şey yazılmaz.

> Gerçek bir biçimi olan depo, derli toplu olandan daha iyi bir film çıkarır.
> Yeniden adlandırmalar, silmeler ve birdenbire patlayan bir klasör, izlemeye
> değer kılan şeylerdir.

**Ayrıca bakınız:** [Zaman makinesi](time-machine.md) · [İçgörüler](insights.md)
