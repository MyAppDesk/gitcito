---
title: Kurtarma ve reflog
category: Kurtarma ve emniyet
order: 60
summary: Geri alma ağı: reflog, WIP anlık görüntüleri ve bisect.
keywords: reflog kurtarma geri al kayıp commit anlık görüntü snapshot wip koruma izlenmeyen atma temizleme guard untracked discard clean bisect bisect run betik çıkış kodu geri yükleme hard reset
---

# Kurtarma ve reflog

Git nadiren bir şey kaybeder. Zor olan, onu yeniden bulmaktır.

## Reflog

`HEAD`'in — ve her dalın — her hareketi, buna neyin yol açtığıyla birlikte:
checkout, reset, rebase, amend, zorlanmış bir fetch. Geçmişteki herhangi bir
kayıttan onu **checkout edebilir**, **oradan dal açabilir** ya da **oraya hard
reset yapabilirsiniz**.

![Reflog görüntüleyici](../../screenshots/reflog.webp)

Bu, "az önce yanlış dalı resetledim" düğmesidir.

## WIP anlık görüntüleri

Commit'lenmemiş çalışma, reflog'un kurtaramadığı tek şeydir; bu yüzden Gitcito
onun anlık görüntüsünü alır: **çalışma dizininin tamamı — değiştirilmiş,
hazırlanmış ve izlenmeyen dosyalar** — kullanılıp atılan bir indeks üzerinden
commit'lenir ve `refs/gitcito/wip` altına sabitlenir. Ne gerçek indeksinize ne
de stash listenize dokunulur.

![WIP anlık görüntüleri](../../screenshots/snapshots.webp)

Üç şey bir tane alır:

| Tetikleyici | Ne zaman |
|---------|------|
| **Koruma** | Otomatik olarak, yıkıcı bir eylemin hemen öncesinde — atma, temizleme, hard reset, bir commit'ten geri yükleme. Varsayılan olarak açıktır; anlık görüntüler diyaloğundan açıp kapatabilirsiniz. |
| **Zamanlayıcı** | Depo açıkken her 5 / 15 / 30 dakikada bir. |
| **Elle** | **Şimdi anlık görüntü al** düğmesi. |

Asıl önemli olan korumadır: çalışmanın genelde sonsuza dek kaybolduğu an,
istemediğiniz bir atmanın hemen ardındaki saniyedir. Koruma açıkken o durum bir
anlık görüntüdür — listeyi açın, geri yükle'ye tıklayın, rahat bir nefes alın.

Bir anlık görüntüyü seçerek yakaladığı dosyaları görün, herhangi bir dosyanın
değişikliğini önizleyin ve **tek bir dosyayı** ya da dizinin tamamını geri
yükleyin. Geri yükleme, dosyaları anlık görüntüden mevcut kopyaların üzerine
kopyalar — önce bir koruma anlık görüntüsü alınır, dolayısıyla geri yüklemenin
kendisi de geri alınabilir.

**Bilmeye değer sınırlar.** Yeni bir şey bulamayan bir zamanlayıcı ya da koruma
tetiklemesi hiçbir şey kaydetmez. Geri yükleme dosyaların üzerine yazar ve
onları yeniden oluşturur, ama anlık görüntüden sonra oluşturduğunuz bir dosyayı
asla silmez. Yoksayılan dosyalar yakalanmaz. Anlık görüntüler yerel gizli
ref'lerdir: asla push'lanmaz, `git gc`'den etkilenmez, en yeni 50 tanesi
saklanır.

## Rehberli bisect

Commit'leri iyi ve kötü olarak işaretleyin, aralığın daraldığını izleyin, ilk
kötü commit'te karar kılın. Gitcito kaç adım kaldığını takip eder; böylece
cevaptan iki soru mu yoksa on soru mu uzakta olduğunuzu bilirsiniz.

![Rehberli bisect](../../screenshots/bisect.webp)

### Kararı bir komut versin

Aralık bir kez tohumlandıktan sonra **Kararı bir komut versin**, aramanın
tamamını `git bisect run` komutuna devreder. Git her adayı checkout eder,
komutunuzu çalıştırır ve çıkış kodunu okur:

| Çıkış kodu | Anlamı |
|-----------|-------|
| `0` | İyi — hata burada değil |
| `125` | Bu test edilemiyor; atla |
| başka herhangi bir şey | Kötü |

Bir test paketi zaten bu dili konuşur; `npm test` genelde bu yüzden tek başına
cevabın tamamıdır. Gitcito bu projenin kendi betiklerini tek tıkla doldurulacak
biçimde sunar, çalışırken çıktıyı akıtır ve siz tek bir soruya cevap vermeden
ilk kötü commit'te karar kılar.

![Aramayı bir test paketine devretmeye hazır komut kutusu](../../screenshots/bisect-run.webp)

**Nelere dikkat etmeli.** Komut, git'in test ettiği *her* commit'te çalışır;
yani dağıtım yapan, yayımlayan ya da deponun dışına yazan bir komut bunu birkaç
kez tekrarlar. Komutu yalnızca okuyup rapor eden bir şeye sınırlayın. **Durdur**
çalışmayı sonlandırır ama oturumu açık bırakır; böylece elle işaretlemeye devam
edebilirsiniz. **İptal** ise bisect'i tamamen bitirir.

Alakasız bir sebeple başarısız olan bir komut — diyelim ki geçmişin o noktasında
eksik olan bir bağımlılık — iyi bir commit'i kötü olarak işaretler ve aramayı
yanlış yere yönlendirir. Bir sarmalayıcı betikten `125` ile çıkmak, git'in bu
durumdan kaçış yoludur.

## Geri al / yinele

Çoğu işlem bir geri alma yığınına kayıt ekler; böylece <kbd>⌘Z</kbd>, git'in
izin verdiği yerlerde sonuncusunu geri alır.

**Ayrıca bakınız:** [O zamandan beri ne değişti](range-diff.md) · [Stash'ler](stashes.md)
