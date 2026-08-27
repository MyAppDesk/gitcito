---
title: Çakışmaları çözme
category: Değişikliklerle çalışma
order: 32
summary: Hangi tarafın hangisi olduğunu söyleyen üç panelli bir çakışma çözücü.
keywords: çakışma conflict çözücü resolver merge conflicts ours theirs bizimki onlarınki işaretçi marker üç yönlü three-way rerere kaydedilmiş çözüm hatırla tekrar oynat
---

# Çakışmaları çözme

Bir merge, rebase, cherry-pick ya da revert durduğunda bir bant **neyin**
durduğunu ve **neyle ne arasında** durduğunu söyler — sadece "çakışma" değil,
"`feature/x`, `main` içine birleştiriliyor".

![Çakışma çözücü](../../screenshots/conflict-resolver.webp)

## Bu neden çakışıyor

Başlıktaki **Bu neden çakışıyor**, dallar ayrıldığından beri bu dosyaya dokunan
commit'leri her taraf için ayrı ayrı listeler — `git log --merge` ile; git'in
yıllardır sunduğu ama kimsenin bulamadığı komut.

![Çakışan dosyaya dokunan, her iki taraftan gelen commit'ler](../../screenshots/conflict-why.webp)

İşaretçiler neyin çarpıştığını söyler. Bu ise kimin, neden değiştirdiğini söyler
ve çözümü asıl belirleyen genellikle budur. Orada hiçbir şey yoksa, hiçbir taraf
tam olarak bu yola bir değişiklik commit'lememiştir — çarpışma bir yeniden
adlandırmadan ya da taşımadan gelmiştir.

## Üç panel

| Panel | Nedir |
|---|---|
| Sol | **Bizimki** — üzerinde bulunduğunuz taraf, commit'iyle etiketli |
| Sağ | **Onlarınki** — gelen taraf, commit'iyle etiketli |
| Orta | **Çıktı**: düzenlenebilir, satır numaralı ve gerçekten hazırlanacak olan içerik |

Üç panel de yeniden boyutlandırılabilir ve çıktı başlığı iki görünüm anahtarı
taşır:

| Anahtar | Ne yapar |
|---|---|
| **Satır kaydır** | A ve B panellerindeki uzun satırları kaydırmak yerine alt satıra taşır. Çıktı paneli satır başına tek sıra tutar — yan işaretçileri buna dayanır — bu yüzden her zaman kayar |
| **Bağlı** | A'yı, B'yi ve çıktıyı birlikte kaydırır; dikeyde ve yatayda. Satır sayıları farklı olduğundan dikey konum oranla eşleştirilir |

Satır kaydır kapalı başlar, Bağlı açık başlar ve ikisi de durumunu hatırlar.

## Gezinmek

Bir dosyayı açmak sizi dosyanın başına değil, **ilk çakışmasına** götürür.
Çıktı başlığındaki ⌃ / ⌄ okları — ya da <kbd>Alt+↑</kbd> / <kbd>Alt+↓</kbd> —
kalanlar arasında adım adım ilerleyerek üç paneli de her birine kaydırır.

## Seçmek

**Satır** bazında, **öbek** bazında ya da bir seferde **tüm taraf** — ve yanıt
"ikisi de kalsın" olduğunda bir öbeğin her iki tarafını da alabilirsiniz.
Çakışmadan çakışmaya ilerleyen bir gezinme aracı kalanları tek tek dolaştırır,
böylece geride kazara bir işaretçi bırakamazsınız.

## Yapay zekâ desteği

Yapay zekâ etkinken **Yapay zekâ ile çöz**, çıktı paneline bir birleştirme
önerir. Kendi başına hiçbir şey uygulamaz: siz okur, düzenler ve hazırlarsınız.
Bkz. [Yapay zekâ özellikleri](ai.md).

## Xcode proje dosyaları

`project.pbxproj`, bir iOS deposundaki başka her dosyadan daha çok çakışır — ve
neredeyse hiçbir zaman biri karşı çıktığı için değil. 24 haneli onaltılık
kimliklerle anahtarlanmış tek ve düz bir nesne sözlüğüdür; dolayısıyla tek bir
dosya eklemek dört girdi yazar: bir `PBXBuildFile`, bir `PBXFileReference`,
sahibi olan grubun `children` listesinde bir satır ve hedefin derleme
aşamasında bir satır. Birer dosya ekleyen iki kişi, aynı birkaç satıra düşen
sekiz girdi yazar. Git bir çakışma görür; çözülecek bir şey yoktur.

Çakışan dosya bir `project.pbxproj` olduğunda, çözücü üç sürümü de metin yerine
proje olarak okur ve **yapıya göre birleştirmeyi** önerir: nesneleri kimliğe
göre eşleştir, iki taraftaki her eklemeyi al, `children` ve `files` dizilerini
birleştir ve gerçekten ayrışan yerde dur. Panellerin üstündeki şerit, her
tarafın ne eklediğini ve — varsa — sana ne kaldığını söyler.

Yapay zekâ önerisi gibi, çıktı paneline düşer ve hiçbir şeyi hazırlamaz.
Kaydetmeden önce okursun.

![Bir Xcode proje dosyasında, çakışma panellerinin üstündeki yapısal birleştirme şeridi](../../screenshots/conflict-pbxproj.webp)

### Yapmayı reddettikleri

**İkinizin de oynadığı bir ayarı asla tahmin etmez.** Sen
`MARKETING_VERSION`'ı `1.1`, onlar `2.0` yaptıysa bu bir karardır ve şeritte
adıyla yazar — ayar, senin değerin, onlarınki — arkandan çözülmek yerine.
Çözemediği bir nesne *senin* sürümünü olduğu gibi korur; böylece yarım
uygulanmış bir birleştirme asla diske ulaşmaz.

**Üç sürümden herhangi biri ayrıştırılamıyorsa dosyanın tamamını reddeder.**
Xcode'un açamadığı bir `project.pbxproj`, elle birleştirmekten pahalıya gelir;
bu yüzden kesin okuyamadığı her şey sıradan bir metin çakışması olarak kalır ve
bunu söyler.

**Farklı nesneler için üretilmiş iki kimliği saptamaz.** Xcode kimlikleri
rastgele seçtiği için nadirdir — ama olduğunda taraflardan birini almak birinin
dosyasını sessizce düşürürdü; bu yüzden birleştirilmek yerine bildirilir.

### `merge=union` değil

Bunun için dolaşan çare `.gitattributes` içinde
[`*.pbxproj merge=union`](attributes.md)'dır. Kullanma. Union, tek değişiklikler
bağımsız eklemeler olduğu sürece işe yarar; iki kişi aynı derleme ayarını
düzenlediği anda iki satırı da yazar ve Xcode'un açmayı reddettiği bir dosya
üretir — hem de diff'i en dikkatsiz okuduğun anda. Yapısal birleştirme aynı
kolaylığı bu arıza olmadan verir.

## Kilit dosyaları

`Podfile.lock`, `Package.resolved`, `yarn.lock` ve kuzenleri, birinin çözücüsünün
çoktan çözdüğü bir bağımlılık grafiğini kaydeder. Bir çözümün yarısını
diğerinin yarısına dikmek, kimsenin çözmediği bir grafik verir: kurulmayabilir,
kurulursa da iki dalın da denemediği bir şeyi kurar.

Bu yüzden çakışan dosya bir kilit dosyasıysa, şerit ona sahip olan aracı adıyla
söyler, **Bizimkini tut** ile **Onlarınkini tut** düğmelerini oracıkta sunar ve
sonrasında onu yeniden üreten komutu verir. Burada bir tarafı seçmek bir uzlaşma
değil — yöntemin tamamı; doğru kılan da yeniden üretmektir.

![Çakışma panellerinin üstündeki kilit dosyası şeridi](../../screenshots/conflict-lockfile.webp)

Üç panel yerinde kalır, çünkü arada bir neyin değiştiğini gerçekten okumak
istersin: tanıdığın bir sağlama, beklediğin bir sürüm. Bu iş, seni onları elle
düzenlemekten caydırmaya çalışıyor.

## Baştan çakışmaya düşmemek

[Çakışma radarı](conflict-radar.md), herhangi birini birleştirmeden önce hangi
dalların çakışacağını söyler.

## git'in hatırlamasına izin vermek (rerere)

Uzun ömürlü bir dalı rebase edin, aynı çakışmayla her seferinde karşılaşırsınız.
`rerere` — *reuse recorded resolution*, yani kaydedilmiş çözümün yeniden
kullanımı — git'in buna yanıtıdır: bir çakışmayı nasıl çözdüğünüzü ezberler ve
aynısı bir daha ortaya çıktığında o yanıtı tekrar oynatır.

**Ayarlar → Genel → Çakışma çözümlerini hatırla.** Bu, genel git yapılandırmanıza
`rerere.enabled` yazar; böylece komut satırı da aynı şekilde davranır.

git sizin yerinize yanıt verdiğinde, çözücü boş bir "çakışma işaretçisi yok"
ekranı göstermek yerine durumu bildirir ve **Bu çözümü unut** seçeneğini sunar —
bu, hafızayı siler *ve* çakışmayı geri getirir, böylece işi farklı
sonuçlandırabilirsiniz.

Bilmeye değer iki şey:

- **Tekrar oynatılan bir çözüm hazırlanmaz**, *Tekrar oynatılan bir çözümü
  otomatik hazırla* seçeneğini açmadıkça. Onu kapalı bırakın: duraklamanın tüm
  anlamı, ezberlenmiş bir yanıtın bu belirli birleştirme için yanlış olabilmesi;
  bakmadan hazırlamak da onun bir commit'e ulaşma yoludur.

  Tekrar oynatılan bir dosyanın **Çakışan dosyalar** listesinde kalmasının nedeni
  budur: git içeriği yazmıştır ama index onu hâlâ birleştirilmemiş olarak tutar
  ve bunu yalnızca hazırlamak çözer. Çözücüdeki **Olduğu gibi hazırla** ya da
  listedeki **Tümünü çözüldü işaretle** onu yerinden oynatan şeydir.
- **rerere her çakışmayı anlamaz.** Ekle/ekle ve sil/değiştir çakışmalarının
  ön görüntüsü (preimage) olmaz, dolayısıyla hep ham hâlde geri gelirler.
  Ayarlar'daki sayı gerçekten tuttuğu kayıt sayısıdır ve **Tümünü unut** onu
  boşaltır.

**Ayrıca bakınız:** [Çakışma radarı](conflict-radar.md) · [Birleştirme ve rebase](merging.md)
