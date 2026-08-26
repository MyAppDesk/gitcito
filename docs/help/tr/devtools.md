---
title: Flutter DevTools
category: Çalışma alanı araçları
order: 93
summary: Ağ görünümü, zaman çizelgesi, inspector ve bellek profilleyici — bir Gitcito sekmesinde.
keywords: devtools flutter dart ağ network zaman çizelgesi inspector bellek profil webview gömülü panel vm service
---

# Flutter DevTools

DevTools’ta ağ görünümü, zaman çizelgesi, widget inspector’ı ve bellek
profilleyici zaten var — üstelik kendi makinende sunulan bir Flutter web
uygulaması. Dolayısıyla Gitcito bunların hiçbirini yeniden yazmaz ve Dart VM
Service ile kendisi konuşmaz: adresi fark eder ve gömer.

![Gitcito sekmesinde açık DevTools](../../screenshots/devtools.webp)

VM servisi ayağa kalkar kalkmaz `flutter run` şu satırı basar:

```
The Flutter DevTools debugger and profiler on iPhone 16 Pro is available at:
http://127.0.0.1:9100?uri=http://127.0.0.1:53412/uJ8k=/
```

Başlatma oturumu bu satır için kendi çıktısını izler ve hata ayıklama çubuğunda
bir düğme belirir. Tıklayınca DevTools kendi sekmesinde açılır, oturum başına bir
tane — aynı anda çalışan iki uygulama, iki DevTools demektir.

**Sıcak yeniden başlatma yeni bir adres yayınlar** ve oturumu yaşadığı sürece
sekme onu izler. Oturum bittiğinde sekme elindeki son adresi tutar, ki o adres
genelde ölüdür: sekmeyi kapat ve DevTools’u yeni çalıştırmadan aç.

## Neye izni var

Gömülü görünüm kısa tasmayla gezer, çünkü bu uygulama kimlik bilgileri tutuyor:

- **Yalnızca loopback.** `127.0.0.1`, `localhost`, `::1`. Başka bir adresle
  iliştirme reddedilir; oraya yönlendirme de.
- **Preload yok, node integration yok, bağlam yalıtımı açık.** Sayfanın Gitcito’ya
  uzanan hiçbir köprüsü yok.
- **Bağlantılar gerçek tarayıcında açılır**, normal bir pencerede, panelin içinde
  değil.

## Sınırlar

- **Bu DevTools, bizim işimiz değil.** O sürüm ne yapabiliyorsa panel de onu
  yapar; yapamadığını biz de yapamayız. Gitcito lezzetinde bir ağ görünümü yok.
- **Yalnızca Flutter kendini böyle duyurur.** Sade bir Dart programı VM servis
  URL’si basar ama DevTools adresi basmaz; o yüzden düğme çıkmaz.
- **Boş panel, uygulamanın durduğu anlamına gelir.** DevTools’u *çalışan uygulama*
  sunar; uygulama çıkınca adresi yanıt vermeyi bırakır.

**Ayrıca bakınız:** [Çalıştırma ve hata ayıklama](launch.md)
