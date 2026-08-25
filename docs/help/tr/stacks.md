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

Gitcito yığını yukarıdan aşağıya, indiği ana dala kadar çizer. Her katman kendi
commit'lerini, **PR'ının neyi hedefleyeceğini** — altındaki katmanı, en alttaki
için ana dalı — ve gönderildikten sonra PR numarasını tıklanabilir bir rozet
olarak gösterir.

## Bir yığın kurmak

| Bunu yap | Şu olur |
|----------|---------|
| **Katman ekle** | Yaprağın üstünde bir dal oluşturup ona geçer. Bu `gh stack add`'dir, zorunlu argüman yerine bir seçiciyle. |
| Herhangi bir katmanda **Üstüne ekle** | Aynısı, ama yığının *ortasında*: o katmanın üstünde ne varsa yeni dala yönlendirilir, böylece zincir sırasını korur ve bir kat kazanır. Hiçbir şey yeniden oynatılmaz — yeni dal, ebeveyninin ucunda doğar. |
| **Var olan bir dalı ekle** | Zaten sahip olduğun bir dal, yaprağın üstünde yığına katılır. Sıradan başlayıp bunun bir yığın olduğunu sonradan fark ettiğinde işe yarar. |

Bütün dal alanları **yazdıkça süzen** alanlardır: süzmek için yaz, seçmek için
↑/↓ ve Enter; listede olmayan bir şey yazsan da geçerlidir — yani `origin/main`
gibi uzak bir referans da temel olur.

## Yeniden sıralama

Bir katmandaki **↑ / ↓** okları onu komşusuyla değiştirir. Bu bir üstveri
düzenlemesi değildir: zincir yeniden bağlanır ve oynatılır, böylece her katmanın
kendi commit'leri yeni temeline iner. Hareket geri alınabilir (<kbd>⌘Z</kbd>) —
geri alma eski sırayı yeniden oynatır, eski commit'leri diriltmez.

Yeniden sıralama bir dizi rebase olduğu için, tıpkı restack gibi **çakışabilir**.
Gitcito ilk çakışmada durur ve çakışma görünümünü sana verir; altındaki katmanlar
çoktan taşınmıştır.

## Başka bir yeri hedeflemek

Bir katmandaki **Ebeveyni ayarla** aynı seçiciyi açar: başka bir dal seç, o
katmanın bağı oraya kayar. En alttaki **temel** satırı bunu ana dal için yapar —
değiştir, bütün yığın yeni ana dala bağlanır ve oynatılır.

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

## Bağlantılar nerede yaşar

Ebeveyn bağlantıları **git config** içinde saklanır, dolayısıyla depoyla birlikte
yolculuk eder ve yeniden klonlamadan sağ çıkar. Hiçbir şey bir serviste yaşamaz.

**Ayrıca bakınız:** [Etkileşimli rebase](rebase.md) · [Sunucular ve pull request'ler](hosting.md)
