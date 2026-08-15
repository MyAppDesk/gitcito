---
title: Harici diff ve merge araçları
category: Dallanma ve cerrahi
order: 43
summary: Bir dosyayı Kaleidoscope, Beyond Compare, Meld ya da zaten kullandığınız araca devredin — Gitcito git'in kendi araç listesini okur.
keywords: difftool mergetool harici diff merge birleştirme kaleidoscope beyond compare meld kdiff3 p4merge araxis opendiff filemerge vimdiff winmerge diff.tool merge.tool orig yedek
---

# Harici diff ve merge araçları

Gitcito'nun [diff görüntüleyicisi](diffs.md) ve [üç panelli çakışma
çözücüsü](conflicts.md) çoğu günü kurtarır. Bazı günler kurtarmaz: 4.000 satırlık
üretilmiş bir dosya, aynı anda dört sütun görmeniz gereken bir birleştirme ya da
sadece on yıldır kullandığınız ve her yeni araçtan daha hızlı okuduğunuz alet.

**Ayarlar → Genel → Harici diff ve merge araçları.**

## Liste bizim değil, git'in

Gitcito kendine ait bir tablo tutmaz. Açılır listeler `git difftool --tool-help`
ve `git mergetool --tool-help` çıktısıdır; bu yüzden:

- git'in makinenizde zaten bulduğu araçlar önce listelenir; bildiği ama
  bulamadıkları *kurulu değil* işaretiyle sonra gelir.
- **Özel bir araç ek destek gerektirmeden çalışır.** Elinizde

  ```sh
  git config --global difftool.mine.cmd 'mycompare "$LOCAL" "$REMOTE"'
  ```

  varsa, `mine` açılır listede yerleşik bir araç gibi görünür.
- Seçimleriniz **genel git yapılandırmanızdaki `diff.tool` ve `merge.tool`**
  anahtarlarına yazılır — terminalinizin okuduğu anahtarların ta kendisi. Burada
  ayarlayın, komut satırındaki `git difftool` aynı şekilde davransın. Orada
  ayarlayın, Gitcito onu alsın.

git kutudan çıktığı hâliyle aşağı yukarı otuz aracı tanır; aralarında
Kaleidoscope, Beyond Compare, Meld, KDiff3, P4Merge, Araxis, DiffMerge, WinMerge,
FileMerge, VS Code ve vim ailesi vardır.

## Eylemlerin göründüğü yerler

| Yüzey | Eylem |
|---------|--------|
| [Commit düzenleyicisindeki](committing.md) değişmiş bir dosya | **\<araç\> ile diff** — çalışma dizini index'e karşı |
| [Çakışma çözücü](conflicts.md) | **\<araç\> ile birleştir** — tam üç yönlü birleştirme |

Her iki giriş de yalnızca gerçekten yapılandırılmış bir araç varken görünür;
yapılandırılmamış bir `git difftool` yalnızca hata verirdi ve işlevsiz bir düğme
hiç düğme olmamasından kötüdür.

## Araç açıkken ne olur

Gitcito aracın kapanmasını bekler. Bu bilinçlidir — `git mergetool` çözülen
dosyayı ancak araç çıktıktan *sonra* hazırlar, yani ortada bildirilecek gerçek
bir sonuç olur — ve düğmenin hemen dönmek yerine dönen bir gösterge sunmasının
nedeni de budur.

Uygulamanın geri kalanı yanıt vermeye devam eder: bunlar normal git işlemlerini
sıraya sokan depo başına kilidin dışında çalışır, dolayısıyla öğle yemeği boyunca
açık bırakılmış bir merge aracı arkasındaki sekmeyi dondurmaz.

Harici bir birleştirme başarılı olduğunda dosyayı git kendisi hazırlar, Gitcito da
çözücüyü kapatıp yeniler. Aracı kaydetmeden kapatırsanız git bunu söyler ve
hiçbir şey değişmez.

## `.orig` dosyası

`git mergetool` varsayılan olarak çözülen dosyanın yanına bir `<file>.orig`
yedeği bırakır — bu git'in davranışıdır, Gitcito'nun değil. Ayarlar'daki anahtar
`mergetool.keepBackup` değerini yazar; kapatın, çözülen dosya geride hiçbir şey
bırakmasın.

## Sınırlar

- **Yalnızca çalışma dizini diff'leri.** Düzenleyicideki giriş, şu anda elinizde
  olanı index ile karşılaştırır. İki tarihsel commit'i harici olarak
  karşılaştırmak bağlanmış değildir — bunun için yerleşik [diff
  görüntüleyicisini](diffs.md) ya da [karşılaştırmayı](merging.md) kullanın.
- **Bir seferde tek dosya.** "Değişen her dosyayı diff'le" gibi bir tarama yoktur.
- **Gitcito hiçbir şey kurmaz.** *Kurulu değil* olarak işaretlenmiş bir araç
  seçilebilir kalır, çünkü siz kurduktan sonra git onu yine de bulabilir — ama
  kurana kadar başarısız olacaktır.
