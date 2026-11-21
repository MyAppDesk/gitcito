---
title: Ortam denetimi
category: Buradan başlayın
order: 6
summary: Gitcito’nun kendi kurulumu dışında dayandığı şeyler — git, LFS, yerel terminal, git’in credential helper’ı, GitHub CLI ve dosya izleme — tek yerde denetlenir.
keywords: ortam environment doktor tanılama denetim git sürüm lfs node-pty terminal temel kabuk credential helper store gh github cli scopes workflow inotify max_user_watches
---

# Ortam denetimi

Bazı hatalar depoyla hiç ilgili değildir. Makineden gelirler: profil girişi için
fazla eski bir git, sessizce temel moda düşmüş bir terminal, workflow dosyalarını
push edemeyen bir GitHub CLI oturumu. Her biri daha sonra başka bir işin ortasında
belirsiz bir hata olarak ortaya çıkar. **Ayarlar → Ortam** (komut paletinde
*Settings: Environment*) bunları önceden denetler.

[Depo doktoru](repo-settings.md) başka bir soruyu yanıtlar: *bu depo*, kendi
`.gitcito.json` dosyasının istediklerine göre burada derlenebilir mi. Ortam
denetimi uygulamanın kendisiyle ilgilidir ve her depo için aynıdır.

![Ayarlar’daki ortam denetimleri](../../screenshots/settings-environment.webp)

## Neleri denetler

| Satır | Yeşil demek | Sarı ya da kırmızı demek |
|-------|-------------|--------------------------|
| **Git** | git 2.31 veya daha yenisi `PATH`’te | 2.31’den eski: bir [profilin](profiles.md) hesabı fetch ve push için oturum açamaz. Yok: git kurulana kadar hiçbir şey çalışmaz |
| **Git LFS** | `git lfs` kurulu | Kurulu değil. Yalnızca dosyaları LFS’te tutan depolar buna ihtiyaç duyar |
| **Terminal** | Yerel terminal yüklendi | [Terminal](terminal.md) temel modda çalışır: renk yok, yeniden boyutlandırma yok, tam ekran programlar yok |
| **Credential helper** | git’in HTTPS parolaları için bir helper’ı var — genel olarak ya da belirli sunucular için (`gh auth setup-git`’in kurduğu) | Helper yok, bu yüzden Gitcito dışındaki git her seferinde sorar. Ya da onları düz metin olarak tutan `store`. Bkz. [Credential helper](credentials.md) |
| **GitHub CLI** | `gh`, `workflow` kapsamıyla oturum açmış | Onsuz oturum açmış: GitHub, `.github/workflows` değiştiren her push’u reddeder |
| **Dosya izleme** (Linux) | inotify sınırı en az 65.536 | Daha düşük bir sınır birkaç büyük açık depoda tükenir ve yeni klasörler durumu yenilemeyi bırakır |

Geçerli olmayan bir satır gösterilmez: kurulu olmadığında ya da oturum açılmadığında
GitHub CLI, macOS ve Windows’ta dosya izleme.

## Bulduklarını düzeltmek

Bir düzeltme varsa, satır onu kopyala düğmeli bir komut olarak gösterir. Örneğin
`gh auth refresh -h github.com -s workflow` eksik kapsamı ekler, bir `sysctl`
satırı da inotify sınırını yükseltir. **Sayfa hiçbir zaman kendisi bir şey
çalıştırmaz.** Bazı düzeltmeler `sudo` gerektirir ya da genel yapılandırmayı
değiştirir; bunları çalıştırmadan önce okumak size kalır. Sonra **Yeniden
denetle**’ye basın.

## Sınırlar

- Uygulamanın kendi sürecinden gördüğünü denetler. `PATH`’i yalnızca
  terminalinizde değiştiren bir kabuk profili ikisinin farklı sonuç vermesine
  yol açabilir.
- GitHub CLI satırı, **Ayarlar → Entegrasyonlar**’da bağlı hesapları değil,
  `gh`’ın kendi oturumunu yansıtır. Bunlar ayrı kimlik bilgileridir. Orada eksik
  bir `workflow` kapsamı bunun yerine reddedilen bir push olarak görünür.
- Neyin kurulu olduğunu bildirir. Hiçbir şey kurmaz ya da güncellemez.
