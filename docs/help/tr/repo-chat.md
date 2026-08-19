---
title: Depo sohbeti
category: Yapay zekâ
order: 82
summary: Bu depo hakkında soru sorun; bağlam olarak sabitlediğiniz dosya ve commit’lerle — ve çalışmadan önce onayladığınız git eylemleri önermesine izin verin.
keywords: sohbet soru sor asistan bağlam sabitle ekle sürükle bırak commit dosya kanıt dayanaklı yapay zekâ panel eylem eylemler çalıştır onay onayla otomatik izin ver düzelt hata bildirim
---

# Depo sohbeti

Bazı soruları sormak, aramaktan hızlıdır. *Token yenileme aslında nerede
oluyor? Bu commit tek cümleyle neyi değiştirdi? Bu dosya neden var?* Depo
sohbeti bunları açık depo üzerinden yanıtlar ve dayandığı satırları gösterir.

Sağ sütunu **Ayrıntılar** ile paylaşır: üstteki sekmeler ikisi arasında geçiş
yapar, böylece bir şey sorduğunuzda grafik seçimini kaybetmez.

![Sabitlenmiş bağlamla depo sohbeti](../../screenshots/repo-chat.webp)

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

Bir ince ayrıntı: [eylem önerileri](#sohbetten-eylem-çalıştırma) açıkken
izlenmeyen dosyaların **adları** depo durumuna dahil edilir — "yeni dosyayı
hazırla" bunlara ihtiyaç duyar — ama içerikleri yine de asla okunmaz.

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
| **Sohbette git eylemleri önerilsin** | Kapalıyken sohbet yeniden salt okunur olur: eylem kartı da onay menüsü de yok |
| **Önerilen eylemler nasıl çalıştırılır** | Onay modu — bkz. [Onay modları](#onay-modları). Yıkıcı eylemler her durumda onay ister |

Yapay zekâ tümüyle kapalıysa sohbet de onunla birlikte kaybolur — kimsenin
yanıtlayamayacağı bir şeyi öneren panel kalmaz.

Sohbet modeli, panelin kendi başlığından da değiştirilebilir; sağlayıcı adının
yanındadır — aynı ayar, Ayarlar’ı açmadan.

Panel başlığının yanındaki sihirli değnek düğmesi **yapay zekâ yapılandırma
sihirbazını** açar — bu depo için asistan yapılandırma dosyaları (talimatlar,
ajanlar, hook’lar) üreten rehberli bir akış. Bkz.
[Yapay zekâ özellikleri](ai.md).

![Depo sohbeti ayarları](../../screenshots/settings-repo-chat.webp)

## Mesajlarla çalışma

Mesajlar sıradan metindir. Herhangi bir bölümünü seçip kopyalayın ya da bir
baloncuğa sağ tıklayın: **Kopyala** seçimi, **Mesajı kopyala** mesajın
tamamını alır — bir yanıt Markdown kaynağı olarak kopyalanır — ve tıklama bir
bağlantıya denk geldiyse **Bağlantıyı kopyala** adresini alır.

Bağlantılar her zaman varsayılan tarayıcınızda açılır, asla Gitcito içinde
değil — yanıtlardaki Markdown bağlantıları da kendi mesajlarınızdaki düz
`https://` adresleri de.

Bir mesaj bir görselden söz ettiğinde — `docs/logo.png` gibi bir depo yolu ya
da görsel uzantısıyla biten bir URL — imleci sözün üzerine getirmek küçük bir
önizleme gösterir. Depo yolları çalışma ağacınızdan okunur; okunabilir bir
görsele karşılık gelmeyen bir söz hiçbir şey göstermez.

![Üzerine gelince görsel önizlemesi](../../screenshots/repo-chat-image-hover.webp)

## Sohbetten eylem çalıştırma

Bir olgu yerine bir değişiklik isteyin — *markdown dosyalarını hazırla, bunu
düzeltme olarak commit’le, derleme çıktısını yoksayma listesine ekle* — ve
yanıt bir **eylem kartıyla** gelir. Boş bir konuşma, giriş metninin altında
birkaç örnek isteği çip olarak sunar; birine tıklamak yazma kutusunu doldurur,
göndermeden önce düzenleyebilirsiniz. Kart, asistanın atmak istediği somut
adımları listeler: her
eyleme bir satır, **Çalıştır** ve **Reddet** düğmeleriyle. Karttaki hiçbir şey
henüz olmuş değildir; model yalnızca önerebilir ve her öneri siz görmeden önce
çalışma ağacıyla karşılaştırılır — var olmayan bir dosyayı anan eylem
reddedilir, gösterilmez.

![Örnek isteklerle boş sohbet](../../screenshots/repo-chat-empty.webp)

![Sohbette önerilen eylemler](../../screenshots/repo-chat-actions.webp)

Depo sohbeti tam metin düzenlemeleri, dosya oluşturma veya bütünüyle değiştirme
ve dosya silme işlemlerini; ardından **Çalıştır** asistanının Git eylemlerini
önerebilir. Gitcito açılabilir diff’i yerel olarak hesaplar. Mevcut dosyalar
okunan kanıtlardan gelmelidir; güvensiz, gizli, yoksayılan, üretilmiş, ikili,
eskimiş, çok büyük veya symlink üzerinden erişilen hedefler reddedilir. Push,
pull, reset, rebase ve force işlemleri ilgili arayüzde kalır.

Dosya grubunun tamamı ilk yazmadan önce yeniden doğrulanır ve bir adım başarısız
olursa geri alınır. Commit öncesinde Gitcito stage’de değişiklik bulunduğunu da
denetler. Kart tamamlanan, başarısız ve atlanan her eylemi ve kısmi sonucu
gösterir. Ardından eylemsiz ayrı bir model çağrısı gerçek sonucu özetler.

### Onay modları

Yazma kutusunun altındaki kalkan menüsü (ayrıca **Ayarlar → Yapay zekâ → Depo
sohbeti** içinde) bir kartın nasıl çalışacağına karar verir:

| Mod | Çalıştırdığı |
|---|---|
| **Her zaman sor** | Kartta **Çalıştır**’a basana kadar hiçbir şey |
| **Güvenli eylemleri otomatik çalıştır** | Yalnızca geri alınabilir düzen işlerinden — stage, unstage, yoksayma, dal, etiket — oluşan öneriler gelir gelmez çalışır; gerisi düğmeyi bekler |
| **Tüm eylemleri otomatik çalıştır** | Her öneri gelir gelmez çalışır; yıkıcı olanlar hariç |

**İşlenmemiş değişiklikleri atacak bir öneri her modda önce sorar** ve onay
iletişim kutusu kaybolacak dosyaları adlarıyla sayar. Kart gerçekte olanı
bildirir — kaç eylemin çalıştığını ya da onları durduran hatayı — ve sonuç
asistana iletilir; böylece bir sonraki soru, planının çalıştırıldığını mı yoksa
reddedildiğini mi bilir.

### Hataları asistanla düzeltme

Bir git işlemi başarısız olduğunda ve yapay zekâ sohbeti kullanılabilirken hata
bildirimi bir parıltı düğmesi kazanır: sohbeti, hata metni yazma kutusuna
yapıştırılmış hâlde açar; "bu neden başarısız oldu, ne yapmalıyım" tek tıktır.
Taslak düzenlenebilir — Gönder’e basana kadar hiçbir şey gönderilmez.

## Neyi reddeder

- **Sır gibi görünen dosyalar hiçbir zaman okunmaz**, sabitlenmiş olsa bile: çip
  gerekçesiyle birlikte atlandı olarak döner. Sabitlemek
  [sır maskelemeyi](security.md) atlatmanın yolu değildir.
- **İkili dosyalar ve 512 KB’ı aşanlar**, depo dışından geldiklerinde aynı
  şekilde atlanır. Depo içinde her zamanki kurallar geçerlidir.
- **Kendi başına asla yazmaz.** Modelin aracı yok, yalnızca metni var: bir
  değişiklik öneri kartı olarak gelir, yalnızca
  [sizin onay kurallarınıza](#onay-modları) göre çalışır ve yıkıcı bir adım her
  zaman onay ister. **Sohbette git eylemleri önerilsin** kapalıyken önermez
  bile.
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
