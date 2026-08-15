---
title: Harici düzenleyici
category: Çalışma alanı araçları
order: 95
summary: Bir depoyu, bir dosyayı ya da tek bir kod satırını gerçekten yazdığınız düzenleyiciye gönderin.
keywords: düzenleyici editör editor vscode code cursor windsurf zed sublime jetbrains intellij webstorm xcode düzenleyicide aç satır sütun özel komut argv
---

# Harici düzenleyici

Bir Git istemcisi kodu okuduğunuz yerdir; düzelttiğiniz yer nadiren orasıdır.
Bir diff'te sorunu fark etmekle imlecin düzenleyicinizde o satırda olması
arasındaki mesafe bir dosya araması ve bir kaydırmadır — her seferinde.

Gitcito'yu bir kez düzenleyicinize yönlendirin, o mesafe kapansın: dosya ya da
blame görünümünde bir satıra sağ tıklayın, düzenleyici tam o satırda açılsın.

## Birini seçmek

**Ayarlar → Genel → Harici düzenleyici.** Açılır liste, Gitcito'nun bu makinede
bulabildiği düzenleyicileri gösterir — önce her düzenleyicinin komutunu, sonra
macOS'ta `/Applications` ve `~/Applications` içindeki uygulama paketini arar.
Tarama, Ayarlar'ı her açtığınızda yeniden çalışır; yani beş dakika önce
kurduğunuz bir düzenleyici, yeniden başlatmaya gerek kalmadan listeye gelir.

Kutudan çıktığı gibi tanınanlar:

| Düzenleyici | Aradığı komut |
|--------|----------------------|
| Visual Studio Code | `code`, `code-insiders` |
| Cursor | `cursor` |
| Windsurf | `windsurf` |
| Zed | `zed` |
| Sublime Text | `subl` |
| JetBrains IDE'leri | `idea`, `webstorm`, `pycharm`, `rustrover`, `goland`, `clion`, `rider`, `phpstorm` |
| Xcode | `xed` |

## Bilmeye değer sınır

**Bir satıra atlamak için düzenleyicinin komutu gerekir, simgesi değil.** macOS
`.app` paketi `open` üzerinden başlatılır; `open` ise bir yol dışında hiçbir şey
kabul etmez — yani yalnızca paket olarak bulunan bir düzenleyici dosyayı en
baştan açar ve Gitcito da bunu, aksini varmış gibi göstermek yerine açılır
listenin altında söyler.

Çözüm düzenleyici tarafındadır: VS Code'un *Shell Command: Install 'code' command
in PATH* komutu, Sublime'ın `subl` sembolik bağlantısı, JetBrains'in
*Toolbox → Settings → Shell scripts* bölümü. Komut bir kez var olduğunda
düzenleyiciyi yeniden seçin, satıra atlama çalışacaktır.

## Eylemlerin göründüğü yerler

| Yüzey | Neyi açar |
|---------|---------------|
| Depo sekmesi, kenar çubuğundaki depo, durum çubuğu | Depo klasörünü |
| Dosya ağacı, commit dosyaları, stash dosyaları, commit besteci | O dosyayı |
| Dosya ağacında satır sonundaki simge | O dosyayı, tek tıkla |
| **Dosya** görünümünde bir satıra sağ tıklama | Dosyayı, o satırda |
| **Blame** görünümünde bir satıra sağ tıklama | Dosyayı, o satırda |

Satır eylemleri yalnızca satır numarasının hâlâ bir anlamı olduğu yerlerde
görünür: eski bir commit'te gösterilen bir dosyanın ya da daha eski bir sürüme
geri sarılmış bir blame'in satırları diskte olanla artık örtüşmez; bu yüzden
Gitcito sizi yanlış yere göndermektense orada hiç atlama sunmaz.

## Kendi komutunuz

Tablodaki hiçbir şeye uymayan bir durum için **Özel komut**'u seçin — bir sarmalayıcı
betik, uzaktan geliştirme başlatıcısı, kendi ara katmanınızla açılan bir terminal
düzenleyicisi.

| Alan | Anlamı |
|-------|---------|
| Komut | Çalıştırılacak çalıştırılabilir dosya. Kabuk yok; yani `&&`, boru ya da joker yok. |
| Ad | Menü girdilerinin ona verdiği ad. |
| Dosya için argümanlar | argv şablonu, örn. `-g {path}:{line}:{col}` |
| Klasör için argümanlar | argv şablonu, genellikle yalnızca `{path}` |

Şablonlar boşluklardan bölünür ve her belirteç bir kez yerine konur — boşluk
içeren bir yol tek bir argüman olarak kalır ve sonrasında hiçbir şey yeniden
ayrıştırılmaz; böylece bir dosya adı asla söz dizimine dönüşemez. Dört yer
tutucu: `{path}`, `{line}`, `{col}`, `{repo}`.

Değeri olmayan bir yer tutucu, kendi bayrağını da yanında götürür: satır
verilmeden çalıştırılan `--line {line} {path}` sadece yola dönüşür, dosya adını
argüman diye yutacak boşta bir `--line` asla kalmaz. İçinde `{line}` bulunmayan
bir şablon ise yalnızca şu anlama gelir: Gitcito o düzenleyici için satır
hassasiyetli eylemler sunmayacaktır.

## Bu ne değildir

Bu, sistem seçicisini gösteren ve *herhangi bir şeyi* — bir görseli, bir PDF'i,
Finder'da bir klasörü — açmak için tek bir uygulamayı hatırlayan
["Birlikte aç" uygulaması](repo-settings.md) ayarı değildir. Düzenleyici ikisi
arasında daha özel olanıdır; bu yüzden ikisi de ayarlıysa dosya ağacındaki satır
sonu simgesinde düzenleyici kazanır, ama ikisi de sağ tık menüsünde listelenmeye
devam eder.

Gitcito düzenleyicinizi kendiliğinden asla başlatmaz ve Gitcito'yu kapatmak onu
da kapatmaz: düzenleyici, kendi başına bir süreç olarak ayrık başlatılır.
