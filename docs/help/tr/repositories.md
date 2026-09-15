---
title: Depolar
category: Eşitleme ve çoklu depo
order: 52
summary: Gitcito'nun bildiği her depo, açık olsun olmasın, tek aranabilir listede.
keywords: depolar kayıt tüm depolar favoriler yıldız son tarama klasör göz at bul aç yönet depo yönetimi renk bölüm ton vurgu çalışma alanları klasörlerden ağaç üret toplu içe aktarma repositories registry favourites starred recent scan folder workspaces
---

# Depolar

[Komuta merkezi](mission-control.md) "açık depolarımın hangisinin bana
ihtiyacı var?" sorusunu yanıtlar. Yalnızca etkin çalışma alanının sekmelerini
bilir. Depolar başka bir soruyu yanıtlar: **o depo nerede, ve herhangi bir
yerde açık mı?** Gitcito'nun hiç gördüğü her şeyi kapsar. Her çalışma alanı,
her sekme ve işaret ettiğiniz klasörleri tarayarak buldukları.

![Depolar sayfası: açık, favori, son ve çalışma alanı depoları için renkli
bölümler, her satırda ad, sahip, dal ve çalışma durumu](../../screenshots/repositories.webp)

## Bölümler

Bir depo **birden fazla bölümde** görünebilir. Bilerek: her bölüm kendi
sorusuna tam bir yanıttır, tek bir listenin dilimi değil.

| Bölüm | İçinde ne var |
|---|---|
| Açık depolar | Etkin çalışma alanındaki her sekme, şu anda |
| Favoriler | Yıldızlı depolar, her çalışma alanında |
| Son | Açtığınız her şey, en yenisi önce. **Tavansız**, başlatıcıdaki 8 girdilik listenin aksine |
| Kayıtlı her çalışma alanı için bir tane | O alanın sekmeleri, önce o alana geçmeden atlayabilmeniz için |
| Tüm depolar | Kaydın bildiği her depo, açık olsun olmasın |

Listenin üstündeki çubuk tek bir şerit: **Tümünü daralt** ve **Tümünü
genişlet**, sonra kalan genişliği alan bir arama alanı, sonra WIP özeti
anahtarı.

Arama her bölümdeki satırları birden süzgeçler ve **hiçbir şeyle
eşleşmeyen bölümleri gizler**, böylece sonuçlar boş başlık sütununun altına
gömülmez. Depo adı, takma adı, sahibi veya yolunun herhangi bir parçası
eşleşir. Hiçbir yerde hiçbir şey uymazsa sayfa boşalmak yerine bunu söyler.

Kutu boşken her bölüm, içinde bir şey olmasa da gösterilir: "Favoriler 0"
bölümün var olduğunu ve boş olduğunu söyler, bunu bilmek işe yarar. Yalnızca
zaten arıyorken gürültü olur.

### Bölüm renkleri

Bölümler **zaten renkli** gelir. Her başlık standart paletten kendi tonunu
alır, yeni bir çalışma alanı göründüğü anda dahil. Amaç yön bulmak, süs
değil: proje başına bir bölüm ve üstlerinde beş yerleşik bölüm varken uzun
bir liste artık nerede olduğunuzu söylemez, bir ton da bir başlığı
okumadan önce tanınır kılar.

Birini değiştirmek için başlığındaki **⋮** öğesini kullanın: **Rengi
değiştir…**, grup sekmeleri ve klasörlerdekiyle aynı [renk seçiciyi](workspaces.md)
açar, on hazır örnek artı serbest bir hex değeri. **Rengi sıfırla**, bir
bölümü ezdikten sonra görünür ve onu atanan varsayılana döndürür.

Bilmeye değer üç şey:

- Atama **kararlıdır, rastgele değildir**. Aynı bölümler her açılışta aynı
  renkleri alır ve bir çalışma alanı eklemek üsttekileri asla yeniden
  boyamaz. Yalnızca değiştirdiğiniz renkler saklanır.
- Renk **bu sayfaya özgüdür**. Burada bir çalışma alanının bölümünü boyamak
  Gitcito'nun geri kalanında o alan hakkında hiçbir şey söylemez. Sekme
  rengi ayrı bir ayardır.
- Renk, tam güçle uygulanmak yerine yüzeyin düşük bir yüzdesine **karıştırılır**,
  böylece doygun bir seçim açık ve koyu temalarda okunabilir bir arka plan
  kalır. Çok soluk bir renk bu yüzden neredeyse nötr görünür.

On bölümden fazlasında palet tekrarlanır, iki başlık aynı tonu paylaşabilir.

## Bir depoyu ne tanınır kılar

Burada bir satır, Gitcito onu bir noktada **açtığında** veya bir **tarama
klasörünün** altında bulduğunda vardır. Diskte, Gitcito'ya hiç söylemediğiniz
bir yerde durduğu için hiçbir şey dizine alınmaz.

Bu sayfayı açmak, şu anda **bir sekmede açık** olanı da dizinler, böylece
başlangıçta geri yüklenen depolar, yeniden açmadan bir satır alır. Yalnızca
açık sekmeleri kapsar ve her oturumun ilk ziyaretinde olur, bir kez değil.
**Forget** yaptığınız bir depo, yeniden açmadığınız sürece unutulmuş kalır.

Tarama klasörleri Ayarlar'da yapılandırılır:

- **Derinlik**, taramanın kökün altına kaç dizin düzeyi indiğidir (varsayılan
  3, tavan 10).
- Tarama **bir depoda durur**. Bir deponun içindeki paketlenmiş bir checkout
  veya bir alt modül kendi satırı olarak dizine alınmaz.
- Nokta ile başlayan dizinlere asla girmez, `node_modules` ve benzeri
  bağımlılık klasörlerini atlar.
- **Yalnızca klasör adlarını okur**: bir `.git` dizini bulmak, bir şeyi
  burada depo yapar. Ad, sahip ve dal `.git` içindeki dosyalardan gelir
  (`HEAD`, yapılandırma), asla `git` çalıştırarak değil.

## Satırlar

Satırlar sütunlara dizilir: yıldız, ad (yeniden adlandırdıysanız takma adı
dikkate alır), sahip (origin uzak URL'sinden okunur), dal çipi, WIP özeti
ve eylemler. Sütunlar **tüm sayfa tarafından paylaşılır**, bölüm başına
boyutlanmaz, böylece son bölümdeki bir ad ilktekilerin altına hizalanır ve
liste bir yığın değil bir tablo gibi okunur.

Sondaki eylemler dururken görünür, üzerine gelince değil: **sekmede aç**,
ve sağ tıkla aynı [depo bağlam menüsünü](repo-menu.md) açan bir **⋮**. Bu,
Gitcito'nun her yerinde kullanılan menüdür, bu sayfaya özel iki girdiyle
genişletilmiştir:

| Eylem | Ne yapar |
|---|---|
| Yıldız / yıldızı kaldır | Depoyu Favoriler'e ekler veya çıkarır |
| Locate… | Taşınmış veya yeniden adlandırılmış bir klasörü yeniden işaretler. Takma ad, profil ve yıldız kalır. Hedefte zaten kendi ayarları varsa **hedef kazanır** |
| Forget | Girdiyi bu listeden kaldırır. **Diskteki klasöre asla dokunmaz** |

Klasörü artık yok olan bir depo **eksik** görünür, alışılmış satır
eylemlerinin yerine satır içi **Locate…** ve **Forget** ile.

Yıldız bir favori anahtarıdır, toplu seçim kutusu değil. Toplu iş burada
seçime göre değil bölüme göredir. Aşağıya bakın.

## Bir klasör ağacını çalışma alanlarına çevirmek

Kod klasörünüz istediğiniz gruplamayı zaten kodlar. `~/Code` içinde
`client-a`, `client-b` ve `personal` varsa, bunlar arasında geçiş yaptığınız
bağlamlardır ve bir [çalışma alanı](workspaces.md) tam olarak budur, kendi
sekme şeridiyle.

**Tarama klasörü ekle…** bunları kurmayı önerir. Tarama dizine aldıktan
sonra bir iletişim kutusu, seçtiğinizin **hemen içindeki** klasörleri, her
birinin kaç deposu olduğunu listeler. İstediklerinizi işaretleyin. Her biri
**depo başına bir sekme** tutan bir çalışma alanı olur.

| Satır | Anlamı |
|---|---|
| Bir klasör adı ve bir sayı | Varsayılan olarak işaretli. Bir çalışma alanı olur |
| "{n} yeni, … içine birleşir" | Bu klasör için bir çalışma alanı zaten var. Yalnızca yeni depolar eklenir |
| "Zaten bir çalışma alanında" | Yapılacak bir şey yok, gizlenmek yerine soluk |
| Kökün kendi adı | Seçtiğiniz klasörde, bir alt klasörde değil, gevşek duran depolar. Varsayılan olarak işaretsiz |

Bir depo, ne kadar derin olursa olsun **kökün altındaki ilk klasöre**
dosyalanır: `~/Code/client-a/nested/app` `client-a` içine gider. Depo
tutmayan klasörler sunulmaz.

**Onaylayana kadar hiçbir şey oluşturulmaz**, iptal etmek taramanın
dizinlemesini yerinde bırakır. Depolar her durumda bilinir, bu düğmenin
daha önce yaptığı da buydu.

### Daha sonra yeniden taramak

Tekrarlamak güvenlidir. İkinci bir tarama **ekler ve asla silmez**:

- Yeni depolar eşleşen çalışma alanına eklenir.
- Elle taşıdığınız, yeniden adlandırdığınız veya çıkardığınız depolar
  bıraktığınız gibi kalır.
- **Yeniden adlandırdığınız** bir çalışma alanı yine tanınır. Gitcito
  geldiği klasörü hatırlar, bu yüzden kopya yaratmak yerine birleştirir.
- Diskten silinen bir depo sekmesini tutar ve eksik görünür.

Üretilen çalışma alanları sıradan alanlardır. Herhangi biri gibi yeniden
adlandırın, yeniden sıralayın, yeniden boyayın veya silin. Onlarda özel
kalan bir şey yoktur.

## Açık olan her şeyi kapatmak

**Açık depolar** başlığı bir kapatma düğmesi taşır. Biri açıkken **Depoyu
kapat**, birkaçı açıkken **Tüm sekmeleri kapat**. Hiçbir şey açık değilken
devre dışıdır.

Depo tutan sekmeleri kapatır ve **sayfa sekmelerine dokunmaz**, böylece
üzerinde durduğunuz Depolar sayfası kendini kapatmaz. Diskte hiçbir şeye
dokunulmaz, hiçbir şey commit edilmez, stash edilmez veya atılmaz. Bir
sekme yalnızca bir görünümdür.

Birkaçını kapatmak önce sorar ve kaç tane olduğunu söyler. Tekini kapatmak
sormaz: ucuz bir hatadır, kapatılan sekmeyi yeniden açmanın olağan
kısayoluyla geri alınır. Kapatılan sekmeler, tek bir kapatmanın kullandığı
aynı onluk yığına gider ve şeritte durdukları sırayla açılır. Bir seferde
ondan fazlasının hepsi geri getirilemez.

## Bir bölümün tamamına fetch ve pull

Her bölüm başlığı bir **fetch** düğmesi ve bölünmüş bir **pull** düğmesi
taşır. O bölümdeki her depoda çalışırlar, klasörü **eksik** olanları atlar.
Depoların açık olması gerekmez. Bu oturumda hiç açmadığınız depoların
bölümü aynı şekilde çalışır.

İkisi de **sırayla** çalışır, paralel değil, böylece kırk depoluk bir bölüm
bir anda kırk git süreci doğurmaz. Durum çubuğu hangi deponun işlendiğini
ve koşunun ne kadar ilerlediğini gösterir, tüm yığın depo başına bir değil
**tek** bir bildirimle biter. Bazıları başarısız olursa bildirim kaçı
başardı, kaçı başaramadı der. Koşu ilk hatada durmaz.

**pull** yanındaki ok, pull'un ne anlama geldiğini seçer:

| Kip | Ne yapar |
|---|---|
| Pull (mümkünse fast-forward) | Git'in varsayılanı. Yapabilirse fast-forward, yapamazsa merge |
| Pull (yalnızca fast-forward) | Bir merge commit oluşturmak yerine reddeder |
| Pull (rebase) | Yerel commit'lerinizi upstream'in üzerine yeniden oynatır |

Bu seçim **tek bir genel tercihtir**, bölüm başına değil: nasıl pull
yaptığınızı anlatır ve bir bölümün okundan ayarlamak her yerde değiştirir.
Her **çoklu depo** pull buna uyar. Buradaki bölüm düğmeleri, bir [grup
sekmesindeki](workspaces.md) fetch/pull ve [komuta merkezinin](mission-control.md)
toplu pull'u. Araç çubuğundan **tek** bir depoya pull yapmak etkilenmez,
çünkü o menü zaten hangi tür pull istediğinizi sorar.

## Eylem çubuğu

**Klasör aç…**, **Klonla…** ve **Tarama klasörü ekle…**. Bir depoyu
Gitcito'nun kaydına getirmenin üç yolu, zaten orada olanı aradığınız aynı
sayfadan.

## WIP özeti

İsteğe bağlı bir kutu. Açıkken her **genişletilmiş** satır gerçek bir `git
status` çalıştırır ve commit'lenmemiş iş ile eşitleme durumunu gösterir.
Kapalıyken satırlar `.git` içindeki dosyaları okumaktan fazlasına mal
olmaz.

İsteğe bağlı olması bilinçlidir: bir özet depo başına kabaca beş git süreci
tutar, sekizlik yığınlarla, büyük bir kayıt arayüzü durdurmasın diye.
Açmak, kalıcı bir maliyet değil, "şu anda görebildiğim her şeye bak"
kararıdır.

## Sınırlar

- **Bu sayfada hiçbir şey zamanlayıcıyla yenilenmez.** Geçerli durumu görmek
  için sayfayı yeniden açın veya WIP özetini kapatıp açın.
- **WIP özeti yalnızca genişletilmiş bölümleri kapsar.** Daraltılmış bir
  bölüm, kutu işaretli olsa da olmasa da hiç durum göstermez.
- **Bir depo ancak onu açtığınızda veya onu içeren bir klasörü taradığınızda
  bilinir.** Buradan dosya sisteminde arama yapılamaz.
- **Çalışma alanı kurmak tek adımda geri alınamaz.** İletişim kutusunu
  iptal etmek hiçbir şey oluşturmaz, ama onaylayıp sonra pişman olduğunuz
  bir plan, çalışma alanlarını elle silerek çözülür.
- **Yalnızca bir düzey derin.** İlk düzeyin altındaki klasörler çalışma
  alanının sekme şeridine yassıltılır. `client-a/nested/app`, `client-a`
  içinde bir sekme olur, içinde bir klasör değil.
- **Ayarlar'daki "Şimdi tara" bunu sunmaz.** Yapılandırılmış her kökü bir
  anda yeniden tarar, klasör başına bir iletişim kutusu anlamsızdır ve
  yalnızca dizinler.
- **Tümünü kapat sekmeleri tek tek, en fazla on tane yeniden açar.** Bir
  seferde ondan fazla depoyu kapatmak, en eskilerin yığından geri
  getirilemeyeceği anlamına gelir, hepsi hâlâ **Son** içindedir.
- **Pull, geride kalanlara göre süzülmez.** Bölümdeki her depoya pull yapar,
  çünkü hangilerinin geride olduğunu bilmek önce fetch demektir. Güncel bir
  depoya pull yapmak bir no-op'tur, bu zaman harcar, güvenlik değil.
- **Bir bölüm fetch veya pull'u geri alma yığınından geri alınamaz.** Fetch,
  elinizde olanı değiştirmez. Merge veya rebase yapan bir pull, buradan
  değil o deponun kendi geçmişinden depo başına geri alınır.
- **Bölüm renkleri kozmetiktir.** Hiçbir yerde süzgeçlemez, sıralamaz,
  gruplamaz veya eşitlemez, bir çalışma alanının bölümüne konan renk o
  alanın rengi değildir.
- **Forget girdiyi listeden kaldırır, diskten asla.** Klasör hâlâ oradaysa,
  aynı kökü taramak (veya yeniden açmak) onu hemen geri getirir.

**Ayrıca bakınız:** [Komuta merkezi](mission-control.md) · [Çalışma alanları, sekmeler ve gruplar](workspaces.md)
