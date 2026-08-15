---
title: SSH anahtarları
category: Eşitleme ve çoklu depo
order: 57
summary: Belirtecinizin bir git@ uzak deposu için neden hiçbir işe yaramadığı ve hangi anahtarın başarısız olduğunu nasıl göreceğiniz.
keywords: ssh anahtar anahtarları key keys agent ajan ssh-add ssh-keygen ed25519 publickey permission denied izin reddedildi parmak izi fingerprint passphrase yükleme upload github known_hosts
---

# SSH anahtarları

**Ayarlar → Güvenlik → SSH anahtarları.**

## Bu neden belirteçlerin yanında duruyor

Gitcito iki farklı şeyin kimliğini doğrular ve insanlar haklı olarak bunları tek
bir şey sanır:

| | Kimliği şununla doğrulanır |
|---|---|
| **Sunucu API'si** — depolar, PR'lar, issue'lar, CI kontrolleri | [Belirteciniz](hosting.md) |
| `https://` üzerinden git aktarımı | URL'ye enjekte edilen belirteciniz |
| **`git@…`** üzerinden git aktarımı | **Sistem ssh'i aracılığıyla SSH anahtarınız** |

`git@github.com:me/api.git` gibi bir uzak depo belirtece hiç dokunmaz. Git
bağlantıyı `ssh`'e devreder ve `ssh` kişisel erişim belirtecini hayatında
duymamıştır. Bu bir uç durum değildir — depoyu bir meslektaşınız kurduğunda, bir
`.gitmodules` `git@` adresleri kullandığında, şirketiniz HTTPS kimlik
doğrulamasını kapattığında ya da sunucu kendi yönettiğiniz bir GitLab olduğunda
karşınıza çıkan şey budur.

İşler ters gittiğinde ssh `Permission denied (publickey)` der ve başka bir şey
demez. Teknik olarak doğru, öğüt olarak işe yaramaz.

![~/.ssh içindeki her anahtar; türü, parmak izi ve ajanın onu tutup tutmadığı](../../screenshots/ssh-keys.webp)

## Bu bölümün size söyledikleri

`~/.ssh` içinde bulunan her anahtar türünü, boyutunu, parmak izini ve yorumunu
gösterir; buna ani başarısızlıkların çoğunu açıklayan tek gerçek de eklenir:

**ajanda** / **ajanda değil.** Ajanın tutmadığı bir anahtar hiçbir şeyin kimliğini
doğrulayamaz ve işletim sistemine aksi söylenmedikçe ajan yeniden başlatmada
içeriğini unutur. "Dün çalışıyordu" genellikle budur.

## Burada yapabilecekleriniz

| Eylem | Ne çalıştırır |
|--------|--------------|
| **Açık anahtarı kopyala** | `.pub` satırını panoya koyar, herhangi bir sunucuya yapıştırmaya hazır |
| **Ajana ekle** | `ssh-add` (macOS'ta `--apple-use-keychain` ile, böylece yeniden başlatmadan sağ çıkar) |
| **GitHub'a yükle** | Bu profilin belirteciyle `POST /user/keys` |
| **Anahtar üret** | `ssh-keygen -t ed25519`, git e-postanızla yorumlanmış hâlde |
| **Bağlantıyı test et** | `ssh -T git@<host>`, bir cümleye çevrilmiş hâlde |

**Bağlantıyı test et** var, çünkü ssh'in kendi yanıtı yanıltıcıdır: GitHub
kimliğinizi başarıyla doğrular ve *ardından* bir hata koduyla çıkar, çünkü kabuk
sunmaz. Gitcito çıkış kodu yerine mesajı okur ve okumasını denetleyebilmeniz için
ham çıktıyı altında gösterir.

## Sınırlar, açıkça söylenmiş hâliyle

- **Yükleme yalnızca GitHub içindir.** GitLab, Bitbucket ve Azure DevOps için
  *Açık anahtarı kopyala* ve doğrudan anahtar ayarları sayfalarına bir bağlantı
  vardır. Diğer üçünde anahtar kaydı uygulanmadı ve düğme aksini iddia etmiyor.
- **Üretme asla üzerine yazmaz.** `~/.ssh` içinde zaten bulunan bir ad reddedilir.
  Bir özel anahtarın üzerine yazmak, ona güvenen her şeye erişiminizi sessizce
  iptal eder ve hiçbir onay penceresi bunu geri getirilebilir kılmaz.
- **Parola cümleleri Gitcito tarafından saklanmaz.** Üretirken ya da ajana
  eklerken birini yazarsınız; `ssh-keygen`/`ssh-add`'e iletilir ve düşürülür.
  Yeniden başlatmalar arasında kalıcı kılmak, `ssh-add` aracılığıyla işletim
  sistemi anahtarlığının işidir.
- **`~/.ssh/config` düzenlemesi yok**, sunucu takma adı yok, depo başına anahtar
  seçimi yok. Bunlar sizin ssh yapılandırmanızda yaşar ve Gitcito o dosyaya
  dokunmaz.

## Makinenizden asla çıkmayan şey

**Gitcito hiçbir zaman bir özel anahtarı okumaz, göstermez ya da iletmez.** Bölüm
yalnızca açık yarıları ve parmak izlerini listeler. Herhangi bir yere gönderilen
tek şey, açıkça **Yükle**'ye bastığınız açık anahtardır — o da kendi belirteciniz
altında, parmak izini adıyla anan bir onaydan sonra GitHub'a gider.

Ayrıca bakınız: [Güvenlik ve sırlar](security.md) · [Hosting ve pull request'ler](hosting.md)
