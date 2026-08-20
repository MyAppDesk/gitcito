---
title: Erişilebilirlik
category: Kendinize göre uyarlayın
order: 78
summary: Ekran okuyucu ve klavye desteği — neler kapsanıyor, neler henüz değil.
keywords: erişilebilirlik accessibility a11y ekran okuyucu VoiceOver NVDA klavye gezinme odak aria kontrast azaltılmış hareket
---

# Erişilebilirlik

Gitcito, fare olmadan kullanılabilir ve bir ekran okuyucu için okunabilir
olmayı hedefler. Bu sayfa bunun somut olarak ne anlama geldiğini — ve
sınırların nerede olduğunu — söyler.

## Klavye

- **Sekmeler, kenar çubuğu satırları, dosya listeleri ve araç çubuğu
  menüleri** odaklanabilir ve Enter ya da Space ile etkinleşir. Bölünmüş
  düğmeler (pull/push/stash) açılır menü okunu ayrı bir odaklanabilir
  denetim olarak sunar.
- **Commit grafiği** tek bir odak durağıdır: odaklayın ve geçmişte
  yukarı/aşağı (ya da j/k) ile gezinin. Seçili commit; konusu, yazarı ve
  konumuyla duyurulur. Shift+F10 (ya da menü tuşu) seçili commit'in bağlam
  menüsünü açar.
- **Bağlam menüleri** odaklanmış olarak açılır: ok tuşları hareket ettirir,
  Enter etkinleştirir, ArrowRight/ArrowLeft alt menülere girer ve çıkar,
  Escape kapatır.
- **İletişim kutuları** Tab'ı içeride tutar, kapanırken odağı bulunduğunuz
  yere geri verir ve Escape ile kapanır.
- **Komut paleti** (Cmd/Ctrl+K) bir combobox'tır: sonuçlar siz yazarken ve
  ok tuşlarıyla gezinirken duyurulur.

## Ekran okuyucular

- Her iletişim kutusu başlığıyla duyurulur. Toast'lar — uygulamanın geri
  bildirim kanalı — canlı bölgelerdir: başarılar kibarca duyurulur, hatalar
  sözü keser.
- İlerleme (klonlama, güncelleme indirme) yüzdeli bir ilerleme çubuğu olarak
  sunulur ve meşgul durumları ("Getiriliyor…") kendini duyurur.
- Dosya durumu seslendirilir ("Eklendi", "Değiştirildi", "Çakışmalı");
  yalnızca renkli bir işaret olarak gösterilmez.
- Pencere landmark'larla yapılandırılmıştır (banner, main, kenar çubuğu,
  durum çubuğu); dolayısıyla landmark gezinmesi çalışır.

## Sınırlar, açıkça

- **Terminal** xterm.js'tir ve onun zayıf olan ekran okuyucu hikâyesini
  devralır. Onu gören kullanıcılara yönelik bir yüzey olarak görün; sunduğu
  her git işlemi bir arayüz eylemi olarak da vardır.
- **Cosmos (3B geçmiş), commit grafiğinin şeritleri ve görsel diff'leri**
  doğası gereği görseldir. Arkalarındaki veri — commit listesi, dosya
  listeleri — erişilebilirdir; resmin kendisi değildir.
- **Sürükle-bırak** (etkileşimli rebase adımlarını yeniden sıralamak, merge
  için dalları sürüklemek) belirtilen yerlerde yalnızca işaretçiyledir; her
  sürükleme eyleminin bir menü ya da düğme karşılığı vardır.
- Bu sayfanın arkasındaki denetim macOS'te VoiceOver ile yapıldı. Windows'ta
  NVDA/JAWS aynı şekilde davranmalıdır ama sahada denenmedi — bildirimler
  [issues](https://github.com/MyAppDesk/gitcito/issues) olarak memnuniyetle
  karşılanır.

## İlgili ayarlar

**Azaltılmış hareket** işletim sistemi ayarından alınır — animasyonlar anlık
geçişlere iner. Tema kontrastı [Ayarlar → Görünüm](themes.md) içinde tema
bazında ayarlanabilir.
