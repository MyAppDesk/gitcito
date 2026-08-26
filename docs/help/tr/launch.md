---
title: Çalıştırma ve hata ayıklama (launch.json)
category: Çalışma alanı araçları
order: 91
summary: VS Code launch yapılandırmalarınızı Gitcito'dan çıkmadan çalıştırın.
keywords: launch.json çalıştır run hata ayıklama debug vscode yapılandırma configs görevler tasks preLaunchTask input background compound compounds stopAll serverReadyAction paralel oturumlar hot reload hot restart device simulator emulator run target flutter metro expo vite nodemon vitest jest mocha ava wrangler dotnet watch adb simctl avd xcodebuild capacitor
---

# Çalıştırma ve hata ayıklama

Gitcito `.vscode/launch.json` dosyanızı okur — kök dizindekini ve iç içe
olanları, ayraçlarla gruplanmış hâlde — ve seçtiğiniz yapılandırmayı tümleşik
terminalde çalıştırır.

![Launch seçici ve yüzen araç çubuğu](../../screenshots/launch-configs.webp)

- VS Code **değişkenleri çözümlenir** (`${workspaceFolder}` ve arkadaşları).
- Bir yapılandırmanın **`preLaunchTask`** görevi önce çalışır.
- **`${input:…}`** değerleri çalıştırmadan önce etkileşimli olarak sorulur
  (`promptString` ve `pickString`).
  `pickString` seçeneklerini, varsayılanı önceden seçili gerçek bir seçici
  olarak gösterir; `password` işaretli `promptString` maskelenir.
- **`isBackground`** görevleri (izleyiciler, geliştirme sunucuları) ayrık
  çalışır, böylece çalıştırmayı asla engellemezler.
- **Compound**'lar her üyeyi **kendi paralel oturumu** olarak çalıştırır —
  compound'un adını taşıyan tek bir bölünmüş terminalde, üye başına bir bölme,
  tıpkı VS Code'un hata ayıklama oturumları gibi. `stopAll: true` ile bir üyeyi
  durdurmak hepsini durdurur.
  Birden çok üyenin paylaştığı görevler, üyeler başlamadan önce kendi
  bölmesinde **bir kez** çalışır — sürüm yükseltme sorusu üye başına değil, bir
  kez sorulur.
  Bu bölme başarıda kendini kapatır, hata durumunda açık kalır.
- **`serverReadyAction`** dikkate alınır: oturumun çıktısı yapılandırılan
  desenle eşleştiğinde, duyurulan URL tarayıcınızda açılır
  (`openExternally`; `debugWithChrome` / `debugWithEdge` de tarayıcıyı açar —
  Gitcito ona bir hata ayıklayıcı bağlayamaz).

![İki paralel oturum çalıştıran bir compound](../../screenshots/launch-compound.webp)

![Varsayılanı önceden seçili ${input} seçicisi](../../screenshots/launch-input.webp)

Yüzen bir araç çubuğu size **duraklat / sürdür, yeniden başlat, durdur**
düğmelerini verir ve çalışan oturumlar arasında geçiş yapar.

**Ayarlar → Genel → launch.json'ı etkinleştir** ile açın. **LAUNCH** düğmesi
Git / Dosyalar sekmelerinin yanında belirir.

Bir compound üyesi *compound › üye* olarak görünür ve yeniden başlatmak
yalnızca o üyeyi yeniden başlatır.
Araç çubuğu ihtiyacınız olan bir şeyi örtüyorsa, tutamacından kenara
sürükleyin — konum hatırlanır ve tutamaca çift tıklamak onu yeniden ortalar.

Gitcito'nun bilerek **yapmadığı** şey: programlarınızı gerçek terminallerde
çalıştırır ama bir hata ayıklayıcı değildir — kesme noktası yok, değişken
incelemesi yok, Debug Adapter Protocol yok. Yalnızca attach yapılandırmaları
bir `preLaunchTask` taşıdığında çalışır (iş, görevin kendisidir); saf bir
attach'in çalıştıracak bir şeyi yoktur.

## Sıcak eylemler — Yeniden başlat'ın yanındaki hızlı yol

![Hata ayıklama çubuğundan gönderilen bir sıcak yeniden yükleme](../../screenshots/launch-hot.webp)

Çoğu geliştirme çalışma zamanı zaten tek tuşla yeniden yükler: `flutter run`
**r** ile, Metro **r** ile, nodemon **rs ⏎** ile, Vitest ise takımı **a** ile
yeniden çalıştırır. Aynı sonucu almak için başlatma yapılandırmasını yeniden
başlatmak yavaş yoldur — süreci öldürür, her `preLaunchTask` adımını yeniden
çalıştırır ve uygulamanın durumunu çöpe atar.

Bu yüzden Gitcito bir yapılandırmanın gerçekten başlattığı komutu okur — bir
`npm run dev` izini `package.json` betiklerinize kadar sürer — ve o çalışma
zamanının tuşlarını hata ayıklama çubuğuna koyar. Bir tuşa basmak, o tuşu
oturumun standart girdisine yazar; tıpkı terminale kendiniz yazmışsınız gibi.

| Çalışma zamanı | Düğmeler | ⋯ altında |
|----------------|----------|-----------|
| Flutter (`flutter run`) | Sıcak yeniden yükleme `r`, sıcak yeniden başlatma `R` | debug paint, performans katmanı, platform değiştirme, DevTools |
| Expo | Yeniden yükle `r` | geliştirici menüsü, hata ayıklayıcı |
| Metro / React Native | Yeniden yükle `r` | geliştirici menüsü, hata ayıklayıcı |
| Vite (dev, serve, preview) | Sunucuyu yeniden başlat `r ⏎` | tarayıcıda aç, adresleri göster, konsolu temizle |
| nodemon | Yeniden başlat `rs ⏎` | — |
| Vitest (watch modu) | Tümünü yeniden `a`, başarısızları yeniden `f` | anlık görüntüleri güncelle |
| Jest (`--watch`) | Tümünü yeniden `a`, başarısızları yeniden `f` | yalnızca değişen dosyalar, anlık görüntüleri güncelle |
| Mocha (`--watch`) | Yeniden çalıştır `rs ⏎` | — |
| AVA (`--watch`) | Tümünü yeniden `r ⏎`, anlık görüntüleri güncelle `u ⏎` | — |
| `dotnet watch` | Yeniden başlatmayı zorla `Ctrl+R` | — |
| Wrangler (`wrangler dev`) | Tarayıcıda aç `b` | DevTools, yerel/uzak, konsolu temizle |

Kendi kendine yeniden yükleyen çalışma zamanları düğme almaz — `node --watch`,
`ng serve`, `tsc --watch`, `cargo watch`, `next dev`, webpack-dev-server.
Kimsenin okumadığı bir tuşu gönderen düğme, düğme olmamasından daha kötüdür;
çünkü işe yaramış gibi görünür.

**Sınırlar.** Algılama metinseldir: komut satırındaki program adını eşleştirir,
dolayısıyla geliştirme sunucunuzu Gitcito'nun okuyamadığı bir sarmalayıcı betik
üzerinden başlatan bir yapılandırma hiçbir şey almaz. Tuş vuruşu da
onaylanmaz — düğme yanıp söner, gerçek yanıt sürecin kendi çıktısıdır.
Duraklatılmış veya sonlanmış bir oturum girdi kabul etmez, o yüzden düğmeler
soluklaşır.

**Tahmin yanlışsa**, bunu yapılandırmanın kendisinde söyleyin:

```json
{
  "name": "API (watch)",
  "type": "node-terminal",
  "command": "./scripts/dev.sh",
  "gitcito": { "hotActions": [{ "label": "Reload", "send": "r", "icon": "reload" }] }
}
```

`send` harfi harfine yazılır — Enter bekleyen bir CLI için sonuna `\n` koyun.
`icon` isteğe bağlıdır: `reload`, `restart`, `rerun`, `failed`, `snapshot`, `menu`, `debugger`,
`browser`, `clear`, `paint`, `perf`, `platform`, `devtools`, `urls`.
Boş bir `hotActions` dizisi o yapılandırma için düğmeleri kapatır.

## Çalıştırma hedefi — yapılandırma hangi cihazda başlar

![LAUNCH sekmesinin yanında hedef seçimi](../../screenshots/launch-device.webp)

Mobil uygulama derleyen bir yapılandırmaya nerede çalışacağı söylenmelidir. Bu
seçim yalnızca Flutter’ın değil — React Native, Expo, Capacitor ve xcodebuild de
bir hedef alır ve her biri farklı yazar. Bu yüzden Gitcito bir kez sorar, tam
**LAUNCH** sekmesinin yanında, ve yanıtı o yapılandırmanın çalışma zamanının
okuduğu biçimde yazar. Seçici, yalnızca depodaki bir yapılandırma gerçekten bir
cihaz alabiliyorsa görünür.

**Liste nereden gelir** — makinede bulunan SDK araçlarından, paralel sorularak:

| Araç | Katkısı | Ne zaman sorulur |
|------|---------|------------------|
| `flutter devices` / `flutter emulators` | her şey, hâlihazırda normalleştirilmiş | klasörde `pubspec.yaml` varsa |
| `xcrun simctl` | iOS simülatörleri, çalışan ve soğuk | macOS’ta |
| `adb devices` | Android telefonlar ve açılmış emülatörler | her zaman |
| `emulator -list-avds` | hâlâ soğuk Android emülatörleri | her zaman |

Aynı simülatörü bunlardan üçe kadarı bildirir; girdiler platform ve ada göre
birleştirilir, eşitlikte Flutter kazanır çünkü `flutter run -d` onun kimliğini
bekler. Kurulu olmayan araçlar menünün altında adlarıyla yazılır — kısa bir
liste kendini açıklamalıdır.

**Seçim ne yapar:**

| Aile | Nasıl yazılır |
|------|---------------|
| Flutter | `-d <id>` |
| React Native iOS | `--udid <id>` |
| React Native Android | `--deviceId=<id>` |
| Expo `run:ios` / `run:android` | `--device <id>` |
| Capacitor / Ionic | `--target <id>` |
| xcodebuild | `-destination id=<id>` |
| diğer her şey | yalnızca ortam değişkeni |

Başlatılan her yapılandırma ayrıca ortamında `GITCITO_DEVICE_ID`,
`GITCITO_DEVICE_NAME` ve `GITCITO_DEVICE_PLATFORM` alır; hedef gerçek bir Android
cihazsa `ANDROID_SERIAL` de eklenir. Bir sarmalayıcı betiğin, bir Gradle görevinin
ya da yalın bir `adb`nin aynı telefona ulaşmasını sağlayan da budur — Gitcito
hiçbir şeyi yeniden yazmadan.

**Soğuk bir cihazı başlatmak.** *Çalışmıyor* altındaki her şey seçildiğinde
açılır: `flutter emulators --launch`, `xcrun simctl boot` (ve Simulator penceresi)
veya ayrık `emulator -avd` — böylece Gitcito’dan çıkmak Android emülatörünü
beraberinde götürmez.

**Sınırlar.** Zaten bir cihaz adı taşıyan bir yapılandırma — açık bir `-d`, bir
`--simulator`, Dart-Code’un `deviceId` alanı — olduğu gibi bırakılır: seçici
yazarın yazdığını asla ezmez. Kabuk tırnağı gerektirecek bir kimlik, bozuk bir
komut satırı riskine girmek yerine ortam değişkenine düşer. Menü,
yapılandırmalarınızın erişebildiğine göre süzülür; yalnızca Android olan bir depo
size hiçbir zaman iPhone önermez. Ve liste bir anlık görüntüdür: telefonu takın
ve **Cihazları yenile**’ye basın.

Seçim depo başına hatırlanır ve o cihaz ortadan kalktığında unutulur.

**Ayrıca bakınız:** [Tümleşik terminal](terminal.md)
