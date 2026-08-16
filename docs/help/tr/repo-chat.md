---
title: Depo sohbeti
category: Yapay zekâ
order: 82
summary: Bu depo hakkında soru sorun; bağlam olarak sabitlediğiniz dosya ve commit’lerle.
keywords: sohbet soru sor asistan bağlam sabitle ekle sürükle bırak commit dosya kanıt dayanaklı yapay zekâ panel
---

# Depo sohbeti

Bazı soruları sormak, aramaktan hızlıdır. *Token yenileme aslında nerede
oluyor? Bu commit tek cümleyle neyi değiştirdi? Bu dosya neden var?* Depo
sohbeti bunları açık depo üzerinden yanıtlar ve dayandığı satırları gösterir.

Sağ sütunu **Ayrıntılar** ile paylaşır: üstteki sekmeler ikisi arasında geçiş
yapar, böylece bir şey sorduğunuzda grafik seçimini kaybetmez.

## Ne okur

Her yanıt iki geçişte kurulur. İlki, deponun kendi izlenen dosya listesinden
küçük bir yol ve düz metin araması kümesi seçer. İkincisi yalnızca gelen
alıntılarla yanıtlar ve yalnızca onlara kaynak gösterebilir: uydurulmuş bir
dosya ya da satır, makul görünen bir yanıt değil, bir doğrulama hatasıdır.

| Dahil | Hariç |
|---|---|
| İzlenen dosyalar, çalışma ağacındaki hâlleriyle | İzlenmeyen dosyalar |
| İzlenen dosyaların hazırlanmış ve hazırlanmamış diff’leri | Bir yoksayma kuralına uyan her şey, izleniyor olsa bile |
| Dal, ileri/geri sayısı ve değişen yollar listesi | [Sır gibi görünen dosyalar](security.md), ikili dosyalar, üretilmiş yollar |

Çalışma ağacını okuması, işlenmemiş düzenlemeleri konuşabilmeniz demektir. Aynı
zamanda o düzenlemelerin soru sorarken makineden çıkması demektir:
[Yapay zekâ özellikleri](ai.md) altında ayarladığınız sağlayıcı onları alır.

## Bağlam sabitleme

Neyin okunacağına model karar verir. Sabitleme, bunu geçersiz kılmanın yoludur:
sabitlenen **önce** okunur ve bağlam bütçesinin büyük payını alır.

Dört yol, hepsi mesaj kutusunun üstündeki aynı çip sırasına gider:

| Şunu yapın | Şunu alırsınız |
|---|---|
| Önerilen bir çipe tıklayın | Görüntüleyicide açık dosya ya da grafikte seçili commit |
| **Dosyalar** sekmesinden bir satır sürükleyin | O dosya |
| **Commit grafiğinden** bir satır sürükleyin | O commit — iletisi ve diff’i parça parça |
| **+** → *Dosya seç…* ya da Finder/Dosya Gezgini’nden sürükleyin | Diskteki herhangi bir dosya, deponun dışı dahil |

Çipler sonraki sorular için sabit kalır; `×` birini kaldırır, konuşmayı temizlemek
hepsini. Sınır sekiz.

Sabitlenen bir commit, iletisini ve en fazla on iki diff parçasını katar. Hariç
tutulan bir yola dokunan parçalar o diff’ten düşer, commit’in tamamı değil.

## Ayarlar

**Ayarlar → Yapay zekâ → Depo sohbeti**:

| Ayar | Ne yapar |
|---|---|
| **Depo hakkında soru sorun** | Kapalıyken sekmeyi, araç çubuğu düğmesini ve kısayol hedefini kaldırır. Diğer yapay zekâ özellikleri çalışmaya devam eder |
| **Sohbet modeli** | Yalnızca sohbete özel model. Boşsa profilinki kullanılır — soru sormak incelemeden ucuzdur, küçüğü çoğu zaman yeter |
| **Yalnızca işlenmiş içerik** | Çalışma ağacı yerine son commit üzerinden yanıtlar: işlenmemiş düzenlemeler makineden hiç çıkmaz |

Yapay zekâ tümüyle kapalıysa sohbet de onunla birlikte kaybolur — kimsenin
yanıtlayamayacağı bir şeyi öneren panel kalmaz.

## Neyi reddeder

- **Sır gibi görünen dosyalar hiçbir zaman okunmaz**, sabitlenmiş olsa bile: çip
  gerekçesiyle birlikte atlandı olarak döner. Sabitlemek
  [sır maskelemeyi](security.md) atlatmanın yolu değildir.
- **İkili dosyalar ve 512 KB’ı aşanlar**, depo dışından geldiklerinde aynı
  şekilde atlanır. Depo içinde her zamanki kurallar geçerlidir.
- **Asla yazmaz.** Hazırlama yok, commit yok, dal değişikliği yok — aracı yok,
  yalnızca metni var. Bir şey yaptığını söyleyen yanıt anlatıyordur, bildirmiyor.
- **Konuşmalar yalnızca bellekte yaşar.** Her depo kendi başlığını tutar;
  Gitcito’dan çıkınca silinirler.

## Nasıl açılır

| Tuşlar | Ne yapar |
|---|---|
| Araç çubuğundaki konuşma balonu düğmesi | Sohbet sekmesini açıp kapatır |
| <kbd>⌘⌥B</kbd> / <kbd>Ctrl+Alt+B</kbd> | Sağ panelin tamamını açıp kapatır |
| <kbd>⌘⏎</kbd> / <kbd>Ctrl+Enter</kbd> | Mesajı gönderir |

Panel anahtarlarının yeniden atanması dahil geri kalanı için
[Klavye ve kısayollar](keyboard.md) sayfasına bakın.

**Ayrıca bakın:** [Yapay zekâ özellikleri](ai.md) · [Güvenlik ve sırlar](security.md) ·
[Depo wiki’si](repo-wiki.md)
