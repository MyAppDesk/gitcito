---
title: Yer imleri
category: Çalışma alanı araçları
order: 94
summary: Koddaki hatırlanan yerler — dosya altlarından değişse bile hayatta kalırlar.
keywords: yer imi yer imleri işaretle satır not yer kod gezinme kenar çubuğu taşındı kayboldu parça
---

# Yer imleri

Geri dönmek istediğin bir yer: hatanın oturduğu satır, adını yarı yolda
değiştirdiğin fonksiyon, refactor gelince silinecek şey. Dosya görüntüleyicide
bir satıra sağ tıkla ve **Bu satıra yer imi koy** de; kenar çubuğunda belirir,
tıklayınca da seni oraya götürür.

![Kenar çubuğundaki yer imleri](../../screenshots/bookmarks.webp)

Yer imleri bu makineye ve bu depoya özeldir. Depoya hiçbir şey yazılmaz: ne
commit edilebilir, ne push edilebilir, ne de başkası görebilir — tıpkı
[yapılacaklar](todos.md) gibi.

## Satır kayar. Bütün mesele bu.

Biri üstüne bir satır ekler eklemez `cart.ts:42` çürür ve sessizce yanlış satırı
açan bir yer imi, hiç yer imi olmamasından kötüdür. Bu yüzden satırın **metni**
numarasının yanında saklanır ve açılışta yeniden bulunur:

1. hatırlanan satır, hâlâ o metni taşıyorsa;
2. yoksa aynı metne sahip en yakın satır — en yakın, çünkü dosya boyunca
   tekrarlanan bir satır eski yerine en yakın kopyada çözülmeli;
3. yoksa boşlukları yok sayarak eşleşen en yakın satır; bu, yeniden girintileme
   veya biçimlendiriciden sağ çıkar;
4. o da yoksa **satırın kaybolduğunu** söyler ve tahmin yürütmek yerine eskiden
   bulunduğu yeri açar.

Satır kaydığında yer imi kendini onarır: yeni numara saklanır, bir sonraki açılış
gerçekten olduğu yerden başlar. Bağlam menüsünden bir **not** eklenebilir — not
yoksa etiket satırın kendi metnidir.

## Sınırlar

- **Yer imi çalışma ağacını gösterir**, bir commit’i değil. Düzenlemelerini
  izler; geçmişte geriye doğru yolculuk etmez.
- **Yeniden yazılmış dosya yer imlerini kaybeder.** Ne tam metin ne de boşluksuz
  hâli birkaç yüz satır içinde bulunamıyorsa, gösterilecek dürüst bir şey kalmaz.
- **Dosyayı yeniden adlandırmak yer imlerini kırar.** Anahtar yoldur; git bir
  diff içinde yeniden adlandırmayı görebilir ama yer imi diff’in parçası değildir.
- **Boş satırın aranacak metni yoktur**; yer imi yalnızca numaraya asılıdır.

**Ayrıca bakınız:** [Yapılacaklar](todos.md) · [Sorunlar](problems.md)
