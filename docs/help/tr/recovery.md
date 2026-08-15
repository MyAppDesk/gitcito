---
title: Kurtarma ve reflog
category: Kurtarma ve emniyet
order: 60
summary: Geri alma ağı: reflog, WIP anlık görüntüleri ve bisect.
keywords: reflog kurtarma geri al kayıp commit anlık görüntü snapshot wip bisect bisect run betik çıkış kodu geri yükleme hard reset
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
onun anlık görüntüsünü alır: izlenen değişiklikleriniz artı hazırlanmış indeks,
`refs/gitcito/wip` altına sabitlenmiş bir `git stash create` commit'i olarak
yakalanır.

![WIP anlık görüntüleri](../../screenshots/snapshots.webp)

- **Çalışma dizininize asla dokunmaz** ve **stash listenizde asla görünmez** —
  bu bir stash değil, gizli bir ref'tir.
- Elle bir tane alın ya da her **5 / 15 / 30 dakikada** bir çalışmasına izin
  verin.
- Listedeki herhangi bir anlık görüntüyü geri yükleyin ya da silin.

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
