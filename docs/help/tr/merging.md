---
title: Birleştirme ve rebase
category: Dallanma ve cerrahi
order: 41
summary: Merge, rebase, ref karşılaştırma ve kenar çubuğunda ya da grafikte bir ref'i diğerinin üzerine sürükleme.
keywords: birleştirme merge rebase fast-forward karşılaştırma ref sürükle bırak dal grafik rozet etiket uzak revert reset cherry-pick amend geri al undo github
---

# Birleştirme ve rebase

## Kenar çubuğundan

Bir dala sağ tıklayıp **Geçerli dala birleştir** ya da **Şunun üzerine rebase
et** deyin — ya da düz birleştirme sürekli ters gidiyorsa **Seçeneklerle
birleştir…** kullanın; bkz. [birleştirme seçenekleri](merge-options.md).

## Bir ref'i diğerinin üzerine sürükleme

Uygulamadaki en hızlı hareket: bir dalı kaldırıp bir başkasının üzerine
bırakın. Gitcito o bırakmanın ne anlama gelebileceğini gösteren küçük bir menü
açar ve siz seçene kadar hiçbir şey yapmaz.

![Bir dalı diğerinin üzerine sürüklemek, bırakmanın ne anlama gelebileceğini gösteren menüyü açar](../../screenshots/clip-branch-drop.webp)

Bu, ref'lerin gösterildiği **her iki** yerde de çalışır — kenar çubuğundaki dal,
uzak depo ve etiket satırlarında ve grafiğin kendisindeki renkli **ref
rozetlerinde**. Aralarında istediğiniz kombinasyonda sürükleyin; üzerine
geldiğinizde bırakma hedefi vurgulanır.

| Bırakma | Anlamı |
|------|-------|
| **{kaynak} → {hedef} birleştir** | Hedefi checkout eder ve kaynağı onun içine birleştirir |
| **{kaynak}'ı {hedef} üzerine rebase et** | Kaynağın commit'lerini hedefin üzerinde yeniden oynatır |
| **Karşılaştır** | [Karşılaştırmayı](#herhangi-iki-refi-karşılaştırma) açar — hiçbir şeyi değiştirmez |

**Menü yalnızca git'in yapabildiklerini önerir.** Birleştirme hedefin üzerine
commit attığı için hedefin yerel bir dal olması gerekir — bir etiketin ya da
uzak izleme ref'inin içine birleştiremezsiniz. Rebase kaynağı yeniden yazdığı
için kaynağın yerel bir dal olması gerekir. Bir etiketi uzak bir dalın üzerine
bırakırsanız size yalnızca *Karşılaştır* önerilir, çünkü gerçekten de olan
tek şey budur.

Rebase önce onay ister: yeniden oynatılan her commit'e yeni bir hash verir, bu
da dal zaten yayımlanmışsa force push demektir. Birleştirme sormaz — yalnızca
ekler. Her iki durumda da tek bir **Geri al** sizi eski hâlinize döndürür.

## Birleştirme

Mümkün olduğunda fast-forward yapın ya da topolojinin kayda geçmesini
istediğinizde bir merge commit'i zorlayın. Çakışma çıkarsa
[çözümleyicide](conflicts.md) sonlanırsınız.

## Herhangi iki ref'i karşılaştırma

Bir temel ve bir karşılaştırma ref'i seçin — dal, etiket ya da ham SHA, yer
değiştirme düğmesiyle birlikte — karşılığında önde/geride sayıları, her tarafa
özgü commit'ler, tam birleşik diff ve tek tıkla **PR açma**ya devir alırsınız.

![İki dalın karşılaştırılması: her tarafa özgü olan ve birleşik diff](../../screenshots/branch-compare.webp)

Kenar çubuğundan (geçerli dalla karşılaştır), Araçlar menüsünden ya da
<kbd>⌘K</kbd> ile erişilebilir.

## Cherry-pick, revert, reset

Cherry-pick ve revert her zamanki gibi grafiğin bağlam menüsünde durur.
**Reset** ise birbirini yalanlayan üç ham soft/mixed/hard öğe yerine tek bir
girdidir — **Commit’e sıfırla…**.

Amend, geri alma ve sıfırlama tek commit menüsünün en üstünde durur ve
**güvenli olmadıklarında da görünür kalır**: devre dışı kalırlar ve nedenini
söyleyen bir ipucu taşırlar. Geri alma yalnızca push edilmemiş bir HEAD
içindir; amend yayımlanmış bir HEAD'de de yapılabilir ama bir force push
gerekeceği konusunda uyarır. Sıfırlama yalnızca yerel atalara ve ilk
yayımlanmış commit'e uzanır — keyfî eski geçmişe değil.

Sıfırlama iletişim kutusu kipi açıkça ortaya koyar:

![Üç kipin açıkça yazıldığı Commit’e sıfırla iletişim kutusu](../../screenshots/reset-to-commit.webp)

| Kip | Sonuç |
|------|--------|
| **Soft** | Değişiklikleri staged tutar |
| **Mixed** | Değişiklikleri unstaged tutar |
| **Hard** | Commit'leri ve değişikliklerini atar |

Hard asla önceden seçili gelmez. Kirli bir çalışma ağacı fazladan bir uyarı
alır, çünkü sıfırlama sürmekte olan çalışmanın üzerine yazabilir ya da onunla
çakışabilir. **GitHub’da görüntüle** kopyalama eylemlerinin yanında durur ve
yalnızca github.com uzak deposundaki yayımlanmış commit'ler için açılır.

Önce birden fazla commit seçerseniz cherry-pick seçimin tamamını sırayla
uygular.

## Bir şeyi birleştirmeden önce

[Çakışma radarı](conflict-radar.md) her dalı bir temele karşı tarar ve hiçbir
şeyi checkout etmeden hangilerinin kavga çıkaracağını söyler.

**Ayrıca bakınız:** [Etkileşimli rebase](rebase.md) · [Yığılmış dallar](stacks.md) · [Çakışma radarı](conflict-radar.md)
