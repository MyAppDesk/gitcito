---
title: Yapılacaklar
category: Çalışma alanı araçları
order: 97
summary: Her depo için özel bir kontrol listesi; kenar çubuğundan ve durum çubuğundan görünür.
keywords: todo görev görevler yapılacaklar liste kontrol listesi not notlar hatırlatma öncelik
---

# Yapılacaklar

Yazılım yazarken alınan notların yarısı tek satırdır ve bir öğleden sonra
yaşar: *PR’dan önce şu değişkeni yeniden adlandır*, *fixture yolu yanlış*,
*yeniden deneme limitini sor*. Bunlar için bir issue takipçisi fazla ağır,
karalama dosyası kazara commit’lenir, yapışkan not ise depo değiştirdiğin anda
yok olur.

Yapılacaklar tam da bu liste — içinde durduğun depoya iliştirilmiş.

![Bir maddesi açık hâlde yapılacaklar listesi: notları ve önceliği](../../screenshots/todos.webp)

## Nerede duruyorlar

Deponun hiçbir yerinde değil. Bir görev, Gitcito’nun kendi ayarlarıyla birlikte,
deponun yoluna göre saklanır. Bunun bilmeye değer üç sonucu var:

- **Hiçbir şey commit’lenmez.** `git status` içinde dosya belirmez, yani bir
  görev asla bir commit’e ya da diff’e karışamaz.
- **Başkası görmez.** Bu kendine bıraktığın not, paylaşılan bir backlog değil.
  İş ekibe aitse yeri bir issue’dur.
- **Dalı değil klasörü izler.** Aynı klonu iki sekmede aç, tek liste görürsün.
  Aynı projeyi diskte başka bir yere klonla, ayrı bir liste alırsın.

Yazdığın sırada üzerinde olduğun dal, görevin *bağlamı* olarak kaydedilir ve
ayrıntı görünümünde durur. Nerede olduğunun hatırlatıcısıdır, süzgeç değil:
başka bir şeye geçtiğinde görevler kaybolmaz.

## Bir tane yazmak

Listeyi aç — **Yapılacaklar** bölüm başlığındaki ↗ düğmesi, durum çubuğundaki
rozet ya da komut paletinde **Yapılacaklar** —, satırı yaz ve <kbd>Enter</kbd>’a
bas. Kenar çubuğundaki bölüm okunup işaretlenen bir liste olarak kalır; yazma
tek bir yerde olur.

Sıralama senin için yapılır: önce açık olanlar — yüksek öncelik normalin,
normal düşüğün üstünde — ve aynı öncelik içinde en eskisi başta, çünkü en uzun
süre görmezden gelinen şey görülmeyi hak eder. Tamamlananlar alta iner, en son
işaretlenen en üstte; böylece yanlış tık tek hamlede geri alınır.

## Kendi sıranıza koymak

Varsayılan sıralamanın bir görüşü var ve bazen yanılıyor: bu öğleden sonra
gerçekten yapmayı düşündüğünüz üç iş, illa en gürültülü üçü değil. Bir satırı
tutamacından sürükleyin ya da satırdaki ▲ / ▼ düğmelerine basın — <kbd>Alt</kbd>
ile ok tuşları klavyeden aynısını yapar — liste verdiğiniz sırayı korur.

İlk sürükleme **Elle sıralama**yı sizin için açar; listeyi yeniden öncelik
sıralamasına bırakmak için filtre satırındaki kutunun işaretini kaldırın; o
sıralama tam bıraktığınız gibi hatırlanır. Bilmeye değer iki sınır:

- **Yalnızca açık görevler kımıldar.** Tamamlananlar hangi kipte olursanız olun
  aşağıdaki yığında, en son işaretlenen üstte kalır.
- **Filtre kutusunda metin varken yeniden sıralama kenara çekilir**, çünkü
  göremediğiniz komşuların ötesine taşınan bir satır beklemediğiniz yere düşer.

Öncelik yine görünür: her satırın yanında sinyal çubukları — düşük için bir
çubuk, yüksek için üç — ve durum çubuğundaki sarı işareti hâlâ o belirler.

## Bakmadan görmek

![Kenar çubuğundaki bölüm ve durum çubuğundaki rozet, tek pencerede](../../screenshots/todos-markers.webp)

| İşaret | Nerede | Anlamı |
|---|---|---|
| <kbd>☑ 3</kbd> rozeti | Durum çubuğu, dal adının solunda | Kaç tanesi açık; biri yüksek öncelikliyse sarı |
| Sayaç | Kenar çubuğundaki bölüm başlığı | Aynı sayı, listenin yanında |

İkisi de sıfırda kaybolur. Kalıcı bir “0 görev” mobilyadır ve insanın görmeyi
bıraktığı şey tam olarak mobilyadır.

## Ayrıntı görünümü

Bir göreve tıkla — kenar çubuğunda, durum çubuğundaki rozette ya da komut
paletindeki **Yapılacaklar** ile — ve tam listeyi ayrıntı paneliyle aç.

| Alan | Ne işe yarar |
|---|---|
| **Başlık** | Tek satır. Yerinde düzenlenir; kaydet düğmesi yok. |
| **Notlar** | Başlığa sığmayan her şey: neden önemli, hangi dosyalar, ne zaman bitmiş sayılır. |
| **Öncelik** | Düşük, normal ya da yüksek. Sıralamayı ve rozetin rengini belirler. |
| **Oluşturuldu / Tamamlandı** | Ne zaman yazdığın ve ne zaman işaretlediğin. |
| **Yazıldığı dal** | O sırada checkout edilmiş olan dal. |

Aynı görünüm süzgeç kutusunu, **Tamamlananları göster** anahtarını ve
**Tamamlananları temizle**’yi taşır; sonuncusu işaretlileri kalıcı olarak siler
ve önce sorar.

Bu anahtar, **Ayarlar → Görünüm → Tamamlanan görevleri gizle** ile aynı anahtardır: kapattığınızda işaretli görevler hem bu listeden hem de kenar çubuğu bölümünden kaybolur. Hiçbir şey silinmez ve sayaçlar onları saymaya devam eder.

## Bilerek yapmadıkları

- **Son tarih yok, hatırlatma yok, bildirim yok.** Dırdır eden bir görev listesi
  takvimdir; bu, sen bakana kadar bekler.
- **Eşitleme ve paylaşım yok.** Makinenden çıkmaz ve çalışma alanı dışa
  aktarımının parçası değildir.
- **Issue veya commit bağlantısı yok.** Bir not bu kadar yapıyı hak ediyorsa bu
  listeyi aşmıştır — bir [issue](hosting.md) aç.
- **Silmek kesindir.** Silinen bir görev için geri alma girdisi yoktur; çünkü
  git onu hiç kaydetmemişti.

**Ayrıca bakınız:** [Depo başına ayarlar](repo-settings.md) ·
[Komuta merkezi](mission-control.md)
