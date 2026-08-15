---
title: Klonlama
category: Buradan başlayın
order: 2
summary: Bir URL'den ya da doğrudan barındırma servisinizden klonlayın — depo devasaysa gelen veriyi daraltın.
keywords: klonlama klon clone shallow sığ depth partial kısmi filter blob none single branch tek dal submodule alt modül recursive ls-remote dal seçici unshallow monorepo
---

# Klonlama

**Yeni depo → Klonla** ya da `⌘K` → *Klonla*. Bir URL yapıştırın veya GitHub,
GitLab, Bitbucket ya da Azure DevOps hesabınıza giriş yapıp kendi depolarınızdan
birini seçin — seçtiğiniz [profilin](profiles.md) belirteci yalnızca klonlama
için kullanılır, sonra bırakılır; hiçbir zaman `.git/config` içine yazılmaz.

Bir üst klasör ve bir ad seçin; alanların altındaki satır deponun tam olarak
nereye ineceğini gösterir. Halihazırda var olan bir klasör içine karıştırılmaz,
reddedilir.

## Gelişmiş — klonu daraltmak

**Gelişmiş** altındaki her şey varsayılan olarak kapalıdır: dokunmazsanız
sıradan, eksiksiz bir klon alırsınız. Bu bölüm, "eksiksiz"in yirmi dakika ve
birkaç gigabayt anlamına geldiği depolarda hakkını verir.

![Gelişmiş bölümü açık klonlama penceresi: kısmi, sığ, tek dal, alt modüller ve bir dal seçici](../../screenshots/clone-advanced.webp)

| Seçenek | git ne yapar | Bedeli nedir |
|--------|---------------|---------------|
| **Kısmi klon** | `--filter=blob:none` | Tüm geçmiş gelir, dosya içerikleri gelmez. Blob'lar istendikçe indirilir, yani eski bir dosyayı açmak ağ bağlantısı ister. |
| **Sığ klon** | `--depth=N` | Yalnızca en yeni N commit vardır. Blame, log, bisect ve range-diff kesim noktasında durur. |
| **Yalnızca tek dal** | `--single-branch` | Diğer dallar siz onları fetch edene kadar uzak depoda kalır. |
| **Alt modülleri klonla** | `--recurse-submodules` | Her alt modül de checkout edilir — şimdi daha uzun sürer, sonra eksik dizin olmaz. |
| **Checkout edilecek dal** | `--branch <name>` | Uzak deponun varsayılan dalı yerine o dalda başlar. |

**Sığ değil, önce kısmi.** Kısmi klon her commit'i saklar — geçmiş aranabilir
kalır, yalnızca dosya içerikleri tembel biçimde indirilir. Sığ klon ise geçmişi
gerçekten atar: `git log` kesim noktasında biter ve blame ötesini göremez. Bir
monorepo'yu içinde çalışmak için klonluyorsanız, genellikle istediğiniz seçenek
kısmi klondur.

Sığ klon geri alınabilir: [terminalde](terminal.md) `git fetch --unshallow`
geçmişi yeniden doldurur.

### Dalı seçmek

Bir dal adı yazın ya da **Dalları listele**'ye basarak uzak depoda ne olduğunu
sorun (`git ls-remote --heads`) ve açılır listeden seçin. Bu tek bir ağ gidiş
dönüşüdür ve yalnızca düğmeye bastığınızda yapılır — siz yazarken hiçbir sorgu
gönderilmez.

Listeleme başarısız olursa — henüz belirteci olmayan özel bir URL, bir yazım
hatası, ağın olmaması — alan düz bir metin kutusu olarak kalır ve gerçek hatayı
klonlamanın kendisi bildirir.

### Bayraklarla ilgili iki not

- **`--depth`, `--single-branch` anlamına gelir.** Sığ bir klonda *Yalnızca tek
  dal* seçeneğini işaretsiz bırakmak, diğer dalları geri istemek demektir
  (`--no-single-branch`); altındaki ipucunun değişmesinin nedeni budur.
- **Yerel bir klasörü klonlarken** git normalde `--depth`'i tamamen yok sayar,
  çünkü nesne deposunu indirmek yerine sabit bağla (hardlink) paylaşır. Yerel bir
  deponun sığ bir kopyasını istediğinizde Gitcito `file://` URL'si üzerinden
  klonlar, böylece istediğiniz derinlik gerçekten elinize geçer.

## İlerleme

Çubuk, git ne bildiriyorsa onu bildirir: sayma, sıkıştırma, alma, çözümleme,
checkout. Toplam bildiremeyen bir aşama, sahte bir yüzde yerine belirsiz bir
çubuk gösterir.

Yeni depo bir sekmede açılır ve klonlarken kullandığınız profile sabitlenir.
