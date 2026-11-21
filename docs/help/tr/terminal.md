---
title: Tümleşik terminal
category: Çalışma alanı araçları
order: 90
summary: Deponun altına yerleşen gerçek bir PTY, her depo için ayrı sekmelerle.
keywords: terminal kabuk shell pty xterm konsol sekmeler yerleşik docked
---

# Tümleşik terminal

Gerçek bir PTY (xterm + node-pty), komut çalıştırıcı değil. Sizin kabuğunuz,
sizin komut satırınız, sizin takma adlarınız.

![Tümleşik terminal](../../screenshots/terminal.webp)

- **Her depo için birden çok sekme**; her biri o deponun klasöründe başlar.
- Terminali grafiğin **altına** ya da bir **sağ sütun** olarak yerleştirin;
  panel boyutunu hatırlar.
- Terminalin görünürlüğü depo bazındadır: hiç terminal açılmamış bir sekmeye
  geçtiğinizde kapalı kalır.
- Sekmeler, içlerinde çalışan şeye göre kendilerini adlandırır.
- Terminal listesini katlamak onu bir **raya** indirger: terminal başına bir
  simge (bölünmüş terminaller küçük bir panel haritası gösterir), geçiş yapmak
  için tıklayın, olağan yeniden adlandır/böl/sonlandır menüsü için sağ tıklayın.
- Listede **bir terminali diğerinin üzerine sürükleyin** — bölünmüş bir grupta
  birleşirler. Her terminal adını bir bölme olarak korur; birleşen grup yeni
  bir numaralı ad alır.

![Tek bir terminal grubunda yan yana bölünmüş iki panel](../../screenshots/terminal-split.webp)

## Tuşlar

| Tuşlar | Ne yapar |
|---|---|
| <kbd>⌃`</kbd> | Terminali gösterir veya gizler — her platformda fiziksel Control tuşu |
| <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> | Terminal odaktayken yeni terminal |
| <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> | Odaktaki terminali kapatır; sonuncuyu kapatmak paneli gizler |
| <kbd>Ctrl+Shift+C</kbd> | Seçimi kopyalar; seçim varken yalın <kbd>Ctrl+C</kbd> de kopyalar, seçim yokken SIGINT olarak kalır |
| <kbd>Ctrl+V</kbd> / <kbd>Ctrl+Shift+V</kbd> / <kbd>Shift+Ins</kbd> | Panodan yapıştırır |
| Sağ tık | Seçimi kopyalar ya da hiçbir şey seçili değilse yapıştırır |

İlk ikisi bilerek yalnızca terminalde geçerlidir: terminal dışında hâlâ
[çalışma alanı sekmelerini](workspaces.md) açıp kapatırlar. macOS’ta Düzen
menüsündeki Kopyala/Yapıştır da aynı şekilde çalışır.

## Betik önerileri

`npm run ` (ya da `pnpm`, `yarn`, `bun run`) yazın; imlecin yanında projenin
betiklerinin listesi belirir ve siz yazdıkça süzülür: `npm run loc`,
`LOCAL_SERVER`’ı bulur. Her ad, çalıştırdığı komutu gösterir.

| Tuş | Ne yapar |
|-----|----------|
| **Tab** | Seçili betiği tamamlar |
| **↑ / ↓** | Başka birini seçer |
| **Esc** | Yeniden yazana kadar listeyi kapatır |

Diğer komutların da kendi listesi vardır:

| Yazılan | Listeler | Okunduğu yer |
|-------|--------|------------|
| `composer run ` | Composer betikleri | en yakın `composer.json` |
| `make ` | Makefile hedefleri, hedeften sonraki `## metin` açıklama olarak | geçerli dizinin `Makefile` dosyası, `make` nasıl okuyorsa |
| `git checkout `, `switch`, `merge`, `rebase` | Yerel dallar, ardından uzak dallar kısa adlarıyla | kabuğun içinde bulunduğu depo |

Değişkenlerden ya da bir desenden (`%.o`) oluşan bir Makefile hedefi listelenmez ve
`git checkout -b` liste almaz: yeni bir dala ad verir.

Betikler, kabuğun **geçerli** dizinine en yakın `package.json` dosyasından gelir;
yani `cd frontend` sonrasında frontend’in betiklerini görürsünüz. Yazdığınızla
başlayan adlar önce, onu içerenler sonra gelir.

Liste yalnızca son Enter’dan beri yazdığınız tuşları bilir. ↑ ile bir komutu geri
çağırmak, imleci taşımak ya da kabuğun kendi Tab tamamlamasını kullanmak satırı
onun göremeyeceği şekilde değiştirir; bu yüzden yanlış bir şeyi tamamlamak yerine
bir sonraki Enter’a kadar sessiz kalır. Windows’ta geçerli dizin okunamadığından
liste, terminalin açıldığı klasörü izler.

## PATH'iniz

Kabuk, Terminal.app veya iTerm'deki gibi bir **oturum açma kabuğu (login
shell)** olarak başlar; yani `~/.zprofile`, `~/.zlogin` ve `~/.bash_profile`
çalışır. Bu önemli, çünkü sürüm yöneticileri ve `brew shellenv` kendilerini
genellikle oraya yazar — terminalinizde çalışan `fvm`, `nvm` veya `pyenv` gibi
bir araç burada da çalışır.

Gitcito ayrıca açılışta oturum açma kabuğunuza gerçek `PATH` değerini sorar ve
başlattığı her şeye karıştırır; çünkü Dock'tan açılan bir arayüz uygulaması
neredeyse hiçbir şey devralmaz. Bir komut yine de bulunamıyorsa, onun yalnızca
etkileşimli bir kabuğun değil, oturum açma kabuğunun `PATH`'inde olduğundan emin
olun.

Burada çalıştırdığınız hiçbir şey Gitcito'nun kendi kilitleme mekanizmasına
görünmez; dolayısıyla elle yazılmış uzun bir `git rebase` ile arayüzdeki bir
tıklama yine de çakışabilir — terminal bir şeyi değiştirdiğinde uygulama
durumunu diskten tazeler.

## Kabuk, tema ve Oh My Posh

Windows’ta Ayarlar → Düzen, her yeni terminalin başlatacağı kabuğu seçer —
PowerShell, PowerShell Core (`pwsh`), `cmd`, Git Bash, WSL ya da özel bir
çalıştırılabilir dosya. Terminalin görünümü (tema, yazı tipi boyutu ve ailesi)
Ayarlar → Temalar → Terminal teması altındadır ve tüm oturumlara anında uygulanır.

[Oh My Posh](https://ohmyposh.dev) kuruluysa bu bölüm, `%POSH_THEMES_PATH%`
altındaki her `*.omp.json` dosyasını canlı önizlemeyle listeler — birini seçmek
onu yeni terminallere `POSH_THEME` olarak verir, böylece profilinizdeki yalın bir
`oh-my-posh init pwsh` onu kullanır. Özel bir `.omp.json` yolu da çalışır; alanı
Varsayılan’da bırakmak, kabuğunuzun/profilinizin ya da genel `POSH_THEME`’in
zaten ayarladığını korur. Açık oturumlar kendi temalarını korur — yenisini
uygulamak için bir terminali kapatıp yeniden açın. İstem simgeleri, terminalin
yazı tipi ailesinde bir Nerd Font gerektirir (ör. `CaskaydiaMono Nerd Font`);
yoksa simgeler kutu olarak görünür.

Hız üzerine: Oh My Posh her istemde programını bir kez çalıştırır — Windows’ta
yaklaşık 100–200 ms, büyük bir depoda git bölümü olan temalarda daha fazla — ve bu
Gitcito’nun yavaşlığı olarak değil, her istemden önce kısa bir duraklama olarak
hissedilir. Git bölümü olmayan temalar en hızlısıdır. PowerShell’in tahmin stili
de önemlidir: `-PredictionViewStyle InlineView` her tuşta küçük bir alanı yeniden
çizer, `ListView` ise bütün bir bloğu.

**Ayrıca bakınız:** [Çalıştır ve hata ayıkla](launch.md) · [Hook'lar](hooks.md)
