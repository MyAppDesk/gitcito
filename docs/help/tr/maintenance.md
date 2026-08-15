---
title: Depo bakımı
category: Depo ve geçmiş
order: 15
summary: Deponun diskte neye mal olduğu, bunun ne kadarının geri kazanılabilir olduğu ve her git işinin gerçekte ne yapacağı.
keywords: bakım gc çöp toplama repack prune fsck count-objects gevşek paketlenmiş nesneler disk alanı boyut iyileştirme commit-graph git maintenance zamanlama sarkan dangling
---

# Depo bakımı

Git bir deponun size neye mal olduğunu asla söylemez. Nesne veritabanı hangi
hâlde olursa olsun çalışmayı sürdürür; bu yüzden ilk sorun belirtisi genellikle
sürünen bir klon ya da diski dolmuş bir dizüstü bilgisayardır — tek bir komutun
işi çözeceği andan çok sonra.

Bu panel, eksik olan göstergedir: alanın nereye gittiği, ne kadarının geri
kazanılabileceği ve her işin çalıştırmadan önce ne yaptığı.

`⌘K` → **Depo bakımı**.

![Paketlenmiş, gevşek ve erişilemez olarak ayrılmış disk kullanımı, altında bakım işleri](../../screenshots/maintenance.webp)

## Sayıları okumak

Her şey `git count-objects -v` ve gerçek bir erişilebilirlik taramasından gelir
— hiçbir şey tahmin edilmez.

| Satır | Nedir | Neden büyür |
|-------|-------|-------------|
| **Paketlenmiş** | Paket dosyalarının içindeki, sıkıştırılmış ve delta'lanmış nesneler | Sağlıklı hâl budur |
| **Gevşek** | Nesne başına bir dosya, neredeyse hiç sıkıştırılmamış | Her commit, her fetch bunları yazar |
| **Erişilemez** | Artık hiçbir şeyin işaret etmediği nesneler | Atılmış commit'ler, düzeltilmiş mesajlar, terk edilmiş rebase'ler |

**Gevşek**'in yanındaki sayı — *"n nesne, m tanesi zaten paketlenmiş"* — asıl
izlenmeye değer olandır. O `m` tane nesne iki kez saklanıyordur: bir kez gevşek,
bir kez paketin içinde. Saf tekrardır ve onları bir araya toplayan şey
`git gc`'dir.

**Erişilemez olan henüz çöp değildir.** O nesneler, reset ile uzaklaştırdığınız
bir commit'i `git reflog`'un geri getirmesini sağlayan şeydir. Git onları
bilerek iki hafta saklar.

## İşler

| Düğme | Çalıştırdığı | Bedeli |
|-------|--------------|--------|
| **İyileştir** | `git gc` | Saniyeler ile bir dakika. Neredeyse her zaman doğru cevap |
| **Sıfırdan yeniden paketle** | `git gc --aggressive` | Büyük bir depoda dakikalar. Her delta'yı yeniden hesaplar |
| **Commit çizgesini yeniden kur** | `git commit-graph write --reachable` | Hızlı. Log ve çizge taramalarını hissedilir ölçüde hızlandırır |
| **Bütünlüğü denetle** | `git fsck --dangling` | Büyük depoda yavaş, hiçbir şeyi değiştirmez |
| **Erişilemezleri şimdi at** | `git gc --prune=now` | Reflog'un emniyet ağını yok eder |

Uzanılacak seçenek **İyileştir**'dir. Gevşek nesneleri paketler, iki haftadan
uzun süredir erişilemez olanları düşürür ve yakın geçmişi kurtarılabilir bırakır.

**Sıfırdan yeniden paketle** hak ettiğinden fazla övülüyor. Mevcut her delta'yı
atıp sıfırdan hesaplar; bu dakikalar sürer ve düz bir gc'ye kıyasla genellikle
yüzde birkaç kazandırır. Devasa bir geçmişi içe aktardıktan sonra bir kez yapmak
değerlidir; rutin olarak yapmak değil.

**Erişilemezleri şimdi at** önce sorar ve onay metni kaç nesne ile ne kadar alan
söz konusu olduğunu söyler. Bundan sonra bir saat önce reset ile
uzaklaştırdığınız bir commit kurtarılamaz — reflog kaydı hâlâ listelenebilir ama
arkasındaki nesne gitmiştir.

## Bütünlüğü denetle

`git fsck`, başka bir nesne tarafından başvurulan her nesnenin gerçekten var
olduğunu ve kendi içinde tutarlı olduğunu doğrular.

- **Sarkan nesneler normaldir.** Bunlar erişilemez olanlardır ve adlarıyla
  listelenirler. Bir rebase'in ardından yüzlercesine sahip bir depo sağlıklıdır.
- **Eksik nesneler hasardır** — yarım kalmış bir yazma, bozuk bir disk, kesilmiş
  bir aktarım. Herhangi biri çıkarsa yeniden paketleme yapmayın: hasarlı bir
  veritabanını yeniden paketlemek kurtarılabilir bir sorunu kalıcı bir soruna
  dönüştürebilir. Uzak deponuzdan sağlam bir kopya klonlayın ve push
  edilmemiş dallarınızı bir [bundle](export.md) ile taşıyın.

## Arka planda bakım

Onay kutusu, depoyu **`git maintenance`** ile kaydeder; bu da işletim
sisteminizin çalıştırdığı bir zamanlamayla (launchd, systemd veya Görev
Zamanlayıcı) paketleme ve ön getirme yapar.

Buradaki hiçbir şey Gitcito'ya özgü değildir: aynı zamanlama terminalinize de
hizmet eder ve `git maintenance unregister` onu her yerden geri alır. Kutunun
işaretini kaldırmak tam olarak bunu yapar, kayıtlı başka depolar için
zamanlamayı yerinde bırakır.

## Bilinmeye değer sınırlar

- **Erişilemez sayısı tam bir erişilebilirlik taraması gerektirir**, bu yüzden
  çok büyük bir depoda paneli açmak biraz zaman alır. Bu, tahmin değil dürüst
  sayıdır.
- **Boyutlar diskin verdiği yerdir**, içeriğin uzunluğu değil. 400 baytlık gevşek
  bir nesne yine de 4 KB'lık bir blok kaplar; bin tanesinin megabaytlara mal
  olmasının — ve onları paketlemenin neden değdiğinin — nedeni budur.
- **Bir çalışma ağacının veya alt modülün kendi `.git`'i vardır**, dolayısıyla
  gösterilen boyut yalnızca bu depoya aittir.
- **Bakım geçmişi küçültemez.** 400 MB'lık bir blob bir commit'in içindeyse ona
  erişilebilir demektir ve gc onu sonsuza dek saklar — bu,
  [bir dosyayı geçmişten kaldırma](history-purge.md) konusudur; farklı ve çok
  daha yıkıcı bir işlem.
- **Gitcito arkanızdan asla gc çalıştırmaz.** Git'in kendi `gc --auto`'su, her
  zaman olduğu gibi, çalıştırabilir; biri başarısız olursa `.git/gc.log` içine
  bir not bırakır ve bu panel onu gün yüzüne çıkarır.

Ayrıca bakınız: [Bir dosyayı geçmişten kaldırma](history-purge.md) ·
[Bundle'lar ve arşivler](export.md) · [Kurtarma](recovery.md)
