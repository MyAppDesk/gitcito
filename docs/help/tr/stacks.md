---
title: Yığılmış dallar
category: Dallanma ve cerrahi
order: 43
summary: Birbirine bağımlı dal zincirleri — kademeli yeniden yığma ve tek tıkla zincirlenmiş PR'lar.
keywords: yığın stack yığılmış dallar stacked branches graphite restack bağımlı dependent zincir chain ebeveyn parent seviye başına PR gönderme submit otopilot autopilot yeniden hedefleme retarget
---

# Yığılmış dallar

Yığın, her birinin altındakinin üzerine kurulduğu bir dal zinciridir:
`main → api → ui`. Üç küçük PR incelemek, tek bir devasa PR incelemekten iyidir.

![Bir dal yığını](../../screenshots/branch-stack.webp)

Gitcito bunu bir **güzergâh** olarak çizer: en üstte bir başlangıç dalı, altında her
katman için bir durak. Her durağın PR'ı üstündeki durağı hedefler, ilk durak da
başlangıç dalına iner. Durak kendi commit'lerini, restack gerekip gerekmediğini ve
gönderildikten sonra PR numarasını gösterir.

## Güzergâhı düzenlemek

| Denetim | Ne yapar |
|---------|----------|
| **Başlangıç** alanı | Yığının indiği yer. Değiştir; bütün zincir yeni dala bağlanır ve yeniden oynatılır. |
| Bir **durağın** alanı | O konumu hangi dalın tuttuğunu değiştirir. Güzergâhtan çıkan dal yalnızca çözülür, asla silinmez. |
| **↑ / ↓** | Durağı bir sıra taşır. |
| **✕** | Durağı güzergâhtan çıkarır; komşuları birleşir. |
| **Durak ekle** | Zaten sahip olduğun bir dalı seç, güzergâhın tepesine katılsın — ya da henüz olmayan bir ad yaz: son durağın ucunda oluşturulur ve ona geçilir. |
| Ok düğmesi | O durağa geçer (checkout). |

Bütün alanlar yazdıkça süzer: süzmek için yaz, seçmek için ↑/↓ ve Enter; listede
olmayan bir şey yazsan da geçerlidir — yani `origin/main` gibi uzak bir referans
başlangıç dalı olabilir.

Altta bu düzenlemelerin hepsi *aynı* işlemdir: güzergâhın tamamı, tek seferde geri
verilir. Bu yüzden bir hareket tek bir geri alma (<kbd>⌘Z</kbd>) demektir; yarım
uygulanmış bağlantı izleri değil.

## Güzergâh değişikliğinin bedeli

Sırayı değiştiren her şey — takas, taşıma, başka bir başlangıç — zinciri **yeniden
oynatır**: her durağın kendi commit'leri yeni temeline rebase edilir. Yani tıpkı
restack gibi **çakışabilir**. Gitcito ilk çakışmada durur ve çakışma görünümünü
verir; öndeki duraklar çoktan taşınmıştır.

Geri alma önceki güzergâhı yeniden oynatır. Eski commit'leri diriltmez, çünkü
yenileri farklı ebeveynlerle aynı iştir.

## Hepsini gönder

**Hepsini gönder** her katmanı `--force-with-lease` ile iter ve orada durur —
hiçbir şey açmadan `gh stack push`. **Yığını PR olarak gönder** aynı push'u yapıp
ardından PR işini de yapar; dalları uzakta isteyip incelemeye henüz hazır
değilsen **Hepsini gönder**'i kullan.

## Yığını zincirlenmiş PR'lar olarak gönderme

**Yığını PR olarak gönder**, yığınlama araçlarının para aldığı işi tek tıkla yapar:

1. Her seviyeyi `--force-with-lease` ile push eder (taze dallar bunu tolere
   eder, yeniden yığılmış olanlarsa buna muhtaçtır).
2. PR'ı olmayan her seviye için bir PR açar — her biri `main`e değil **kendi
   ebeveyn dalına dayanır**, böylece her inceleme yalnızca kendi commit'lerini
   gösterir. Başlık ve açıklama, seviyenin kendi commit'lerinden gelir.
3. Tabanı kaymış mevcut her PR'ı yeniden hedefler.
4. Her PR gövdesine bir **yığın gezinme bölümü** yazar; böylece herhangi bir
   seviyedeki inceleyici zincirin tamamını ve bu PR'ın zincirdeki yerini
   görebilir.

Eylem **idempotenttir**: her yeniden yığmadan, yeni seviyeden veya birleşen
PR'dan sonra basın, sonuç aynı noktaya yakınsar — hiçbir şey çoğaltılmaz,
yalnızca kaymış olana dokunulur.

En alttaki PR **birleştiğinde**, aynı düğme arkasını da temizler: birleşen
seviyenin çocuğu ana dala aktarılır, seviyenin izlemesi kaldırılır, yerel dalı
silinir (güvenlidir — ana dalın onu içerdiği kanıtlanabilir), zincir yeniden
yığılır ve kalan her PR yeniden hedeflenir. Aşağıdan yukarıya birleştirin,
Gönder'e basın, tekrarlayın.

## Yeniden yığma

Alttaki bir dal değiştiğinde — `api` üzerindeki inceleme yorumlarını
karşıladığınızda — onun üzerindeki her dal artık yanlış temelin üzerine kurulmuş
olur. **Yeniden yığ**, zincirin tamamını `rebase --onto` ile ardışık olarak rebase
eder; böylece bir ebeveynin yeniden yazılması commit'leri çocuklarına
kopyalamaz. Yeniden yığmadan sonra **Gönder**'e tekrar basın: yeniden yazılan
seviyeleri zorla push eder ve PR'lar yerinde güncellenir.

## Sınırlar

- Gönderme şimdilik **yalnızca GitHub** içindir (oluşturma dört barındırıcının
  hepsinde çalışır, ancak yeniden hedefleme ve gövde güncellemeleri GitHub
  API'sini gerektirir).
- Alt birleşme temizliği merge ve rebase birleştirmelerini soy ilişkisinden,
  **squash** birleştirmelerini ise dalın PR'ının birleşip birleşmediğini
  GitHub'a sorarak görür — yani bir GitHub token'ıyla her birleştirme stili
  temizlenir. Diğer barındırıcılarda veya token olmadan, squash ile birleşen
  bir seviyenin izlemesi yine elle kaldırılmalıdır. Ayrıca önce fetch yapın —
  soy denetimi ana dalı son fetch'inizdeki haliyle okur.
- PR gövdesindeki yığın bölümü gizli işaretçiler arasında tutulur — onun
  üzerindeki kendi açıklamanız korunur.
- Yeniden sıralama ve ana dal değiştirme, dokundukları her katmanda **geçmişi
  yeniden yazar**. Dallar senindir ve gönderilmemiş katmanların maliyeti yoktur,
  ama zaten incelemede olan bir katman bir sonraki göndermede force-push yer.
- Bir katman seferde tek sıra yer değiştirir. İki takas iki rebase demektir ve
  yarıda kalmak okunaklı bir durumdur; üç sıra öteye düşen bir sürükleme değil.
- Bir durak **rebase edilir**, dolayısıyla yığının indiği dal asla aynı zamanda
  durak olamaz; **korumalı** bir dal da olamaz (listeyi değiştirmedikçe `main` ve
  `master`). İkisi de sessizce ortak geçmişi yeniden yazmak yerine reddedilir.
- Gönderme, herhangi bir şey açmadan önce uzağa hangi dalların gerçekten
  ulaştığını sorar ve ulaşmayanları adıyla söyler. GitHub, eksik bir head'e kuru
  bir "Validation Failed" ile yanıt verir; kimsenin işine yaramaz.

## Bağlantılar nerede yaşar

Ebeveyn bağlantıları **git config** içinde saklanır, dolayısıyla depoyla birlikte
yolculuk eder ve yeniden klonlamadan sağ çıkar. Hiçbir şey bir serviste yaşamaz.

**Ayrıca bakınız:** [Etkileşimli rebase](rebase.md) · [Sunucular ve pull request'ler](hosting.md)
