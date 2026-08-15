---
title: Kimlik bilgisi yardımcısı
category: Güvenlik
order: 73
summary: Git'in kendi parola deposu — üçüncüsü — ve https neden size sürekli yeniden soruyor.
keywords: kimlik bilgisi yardımcısı credential helper parola https tekrar soruyor osxkeychain wincred manager libsecret store cache git-credentials düz metin unut iptal edilmiş token 401
---

# Kimlik bilgisi yardımcısı

Gitcito üç ayrı türde gizli bilgi tutar ve insanlar bunların tek bir şey
olduğunu varsaymakta haksız da değiller:

| | Kimde durur |
|---|---|
| Servis API token'ları — pull request'ler, issue'lar, CI kontrolleri | Gitcito, [işletim sistemi anahtar zincirinizde](security.md) |
| `git@…` taşıması | [SSH anahtarınız](ssh-keys.md), sistemin ssh ajanı üzerinden |
| **`https://` taşıması** | **Git'in kendi kimlik bilgisi yardımcısı** |

Üçüncüsü, ters gidene kadar kimsenin özellik saydığı bir şey değildir; ters
gittiğindeyse git'in en sık duyulan iki şikâyetini üretir: *neden bana yine
soruyor?* ve *iptal ettiğim token'ı neden hâlâ gönderiyor?*

`⌘K` → **Kimlik bilgisi yardımcısı**.

![Yapılandırılmış yardımcı, sunucu bazlı kurallar ve düz metin dosyası uyarısı](../../screenshots/credentials.webp)

## Baktığınız şey

Yapılandırılmış her `credential.helper`, geldiği kapsamla birlikte — `system`,
`global`, ardından bu depo. **Yardımcılar üst üste yığılır**: git her birine
sırayla sorar ve depo düzeyindeki bir yardımcı, genel olanın yerini almaz.

Her biri makinenize karşı denetlenir:

| İşaret | Anlamı |
|------|-------|
| **hazır** | Yardımcı program mevcut ve çalışacak |
| **kurulu değil** | Yapılandırılmış ama program yok — her sorgu, parolayı elle yazmaya düşer |
| **parolalar düz bir dosyada** | `store` yardımcısı (aşağıya bakın) |

**Belirli sunucular için kurallar** bölümü `credential.<url>.*` bloklarını
listeler. Bunlar, eşleştikleri URL'ler için düz ayarı geçersiz kılar ve genelde
"bu tek sunucu neden farklı davranıyor" sorusunun cevabıdır.

## Birini seçmek

| Yardımcı | Parolanın gittiği yer |
|--------|------------------------|
| `osxkeychain` | macOS Keychain — şifreli, kullanıcı bazlı |
| `manager` | Git Credential Manager (Windows, çapraz platform) |
| `wincred` | Windows Credential Manager |
| `libsecret` | Linux gizli bilgi servisi (GNOME Keyring, KWallet) |
| `cache` | Bellek, 15 dakikalığına. Diske hiçbir şey yazılmaz |
| `store` | **Ev dizininizde düz bir dosya. Şifresiz** |

Gitcito bu makinede gerçekten kurulu olanları önerir, işletim sisteminize
uyanı işaretler ve geri kalanını soluklaştırır.

**Kapsam önemlidir.** *Her depo için* seçeneği genel yapılandırmanıza yazar ki
neredeyse her zaman istediğiniz budur; *yalnızca bu depo için* ise başka bir
yere karşı kimlik doğrulayan tuhaf depo içindir.

## `store` yardımcısı ve `~/.git-credentials`

`store`, `~/.git-credentials` dosyasına `https://kullanıcı:parola@sunucu`
satırlarını düz metin olarak, hiçbir şifreleme olmadan yazar. Sizin adınıza
çalışan her şey bunu okuyabilir: bir betik, bir bağımlılığın postinstall'ı,
her şey.

O dosya varsa bu sayfa bunu söyler ve kayıtları sayar. İçeriğini asla
göstermez — sayı zaten meselenin tamamıdır ve içeriği göstermek için okumak da
aynı hatanın kendisi olurdu.

Böyle bir dosya bulduysanız ve niyetiniz bu değildiyse: buradan gerçek bir
yardımcı seçin, sonra dosyayı silin ve bir kez yeniden kimlik doğrulayın.

## Saklanan bir kimlik bilgisini unutturmak

Bir token iptal edildiğinde ya da yenilendiğinde yardımcı eskisini uzatmayı
sürdürür ve her push, hiçbir şeyin adını vermeyen bir 401 ile başarısız olur.
**Unut**, yapılandırılmış yardımcıdan o sunucuya ait kaydı silmesini ister —
git'in kendi belgelenmiş yolu olan `git credential reject`.

Bu yolda hiçbir şey okunmaz: Gitcito, canlı bir parolayı standart çıktıya
yazdıracak olan `git credential fill` komutunu asla çağırmaz.

Sonraki push size bir kez sorar, yardımcı da yeni cevabı saklar.

## Bilmeye değer sınırlar

- **Burası git'in deposu, Gitcito'nunki değil.** Burayı değiştirmek
  terminalinizin davranışını da değiştirir — zaten mesele bu, ama
  değiştirmeden önce bilmekte fayda var.
- **Sistem düzeyindeki yardımcılar gösterilir, düzenlenemez.** Yalnızca bir
  yöneticinin yazabileceği bir yapılandırmada dururlar.
- **Gitcito bir yardımcının neler tuttuğunu listeleyemez.** Hiçbir kimlik
  bilgisi API'si bunu gizli bilgileri teslim etmeden açığa vurmaz; bu yüzden
  pencere yalnızca yapılandırmayı bildirir ve istendiğinde siler, başka bir şey
  yapmaz.
- **Gitcito'ya verdiğiniz bir token ayrıdır.** Birini iptal etmek diğerine
  dokunmaz; anahtar zinciri tarafı için [güvenlik](security.md) sayfasına bakın.

Ayrıca bakınız: [Güvenlik](security.md) · [SSH anahtarları](ssh-keys.md) ·
[Eşitleme](syncing.md)
