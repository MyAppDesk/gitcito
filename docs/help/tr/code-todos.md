---
title: Koddaki TODO'lar
category: Çalışma alanı araçları
order: 93
summary: Kaynak kodun taşıdığı her TODO, FIXME ve HACK — etikete, sorumluya ya da klasöre göre gruplanmış.
keywords: todo fixme hack xxx note işaret işaretler yorum yorumlar ağaç etiket sorumlu atanmış cgm teknik borç grep tarama
---

# Koddaki TODO'lar

TODO, birinin kendine verdiği ve sonra kaybettiği bir sözdür. Sorunun olduğu
yere yazılır; yani tam olarak kimsenin bir daha bakmadığı yere. Önem kazandığı
gün onu yazan kişi çoktan başka bir ekiptedir. Grep hepsini bulur, ama bin
satırlık grep çıktısı hiç bulmamakla aynı şeydir.

Analiz panelinin **TODO** sekmesi hepsini okur ve ardından grep'in yapamadığını
yapar: gruplar. Paneli durum çubuğundan ya da komut paletinden (`Koddaki
TODO'lar`) açın ve ikinci sekmeye geçin.

Durum çubuğu, işaretleri çözümleyicilerin hataları ve uyarılarının yanında
sayar; o sayaca tıklamak bu sekmeyi açar.

![TODO sekmesi, sorumluya göre gruplanmış](../../screenshots/code-todos.webp)

## Ne işaret sayılır

Bir etiket, bir yorumun içinde, Git'in izlediği ya da izleyeceği bir dosyada:

| Yazılan | Şöyle okunur |
|---------|--------------|
| `// TODO: bunu yayına al` | etiket `TODO`, sorumlusuz |
| `//todo bunu yayına al` | aynısı — iki nokta ve boşluk isteğe bağlı |
| `# todo bunu yayına al` | aynısı — ne büyük/küçük harf ne de dil önemli |
| `/* TODO(cgm): bunu yayına al */` | etiket `TODO`, sorumlu `cgm` |
| `-- TODO (CGM) bunu yayına al` | aynı sorumlu: `cgm`, `(CGM)` ve `[cgm]` tek kişidir |
| `<!-- TODO: @cgm bunu yayına al -->` | yine aynısı |

Etiketler: `TODO`, `FIXME`, `BUG`, `HACK`, `XXX`, `NOTE`, `OPTIMIZE`, `REVIEW`,
`REFACTOR`, `DEPRECATED`, `QUESTION`, `IDEA`, `WIP` ve `TEMP`. İlk dördü renkli,
çünkü "bu bozuk" ile "bu aklıma gelen bir fikir" bir listede aynı görünmemeli.

Etiket bir yorum başlangıcının ardından gelmeli — `//`, `#`, `--`, `;`, `%`,
`/*`, `*`, `<!--`, `"""`. Başka hiçbir şey sayılmaz: `todo = [l for l in lines]`
koddur ve bir değişken atamasını borç diye listeleyen panele ikinci kez
güvenilmez. Aynı kural `reviewNotes` adlı bir fonksiyonu da listeden uzak
tutar.

## Asıl özellik gruplamadır

Dört eksen, her biri tek tık:

| Şuna göre grupla | Şunu yanıtlar |
|------------------|---------------|
| **Etiket** | Bu depo ne tür bir borç taşıyor? |
| **Sorumlu** | Herkes arkasında ne bıraktı — ve sahipsiz yığında ne var? |
| **Klasör** | Ağacın hangi köşesi çürüyor? |
| **Dosya** | Nereye gittiğinizi zaten biliyorsanız, sade liste. |

**Sahipsiz** gerçek bir gruptur, artık değil: kimsenin adını koymadığı işaretler
hiç kimsenin sahiplenmediği işaretlerdir ve onları sayılmış görmek işin bütün
amacıdır.

Üstteki etiket rozetleri listeyi süzer; bir satırdaki sorumlu rozetine tıklamak
da, mesajı, dosyayı, etiketi ve sorumluyu eşleştiren arama kutusu da öyle.
**Yalnızca değişenler**, düzenleyip henüz işlemediğiniz dosyalara daraltır —
push'tan önceki son kontrol; bir saat önce bıraktığınız `// FIXME` kalıcı olmak
üzeredir.

Bir satıra tıklamak dosyayı o satırda açar.

## Yapmadıkları

- **Okur, asla yazmaz.** "Tamamlandı" işareti yoktur: bir TODO'yu kapatmanın yolu
  satırı silip bunu işlemektir. Gitcito'nun sizin için tuttuğu liste için
  [todos](todos.md) sayfasına bakın; o bambaşka bir şeydir: kaynakta değil,
  uygulamada yaşayan özel notlar.
- **Yok sayılan dosyalar atlanır**, `node_modules` ile birlikte, içindeki
  etiketler ne derse desin. İzlenmeyen dosyalar ise dahildir: beş dakika önce
  yazılmış bir işaret, görülmeye en değer olanıdır.
- **Yorumu dizgeden ayırt edemez.** `const banner = "// TODO"` satırı tarama
  açısından bir işarettir. Kırk dilin ayrıştırıcısına sahip değildir ve sahipmiş
  gibi de yapmaz.
- **Tarama bir anlık görüntüdür.** Bir dosyayı düzenlediğinizde panel, yeniden
  tarayana dek eski sayılarını korur; yenile düğmesi hikâyenin tamamıdır.
- **5.000 işarette durur.** Bunu aşan bir deponun, hiçbir panelin çözemeyeceği
  bir borç sorunu vardır.

## Nerede çalışır

Çalışma ağacı üzerinde tek bir `git grep`; [Problemler](problems.md) sekmesinin
saniyeler harcadığı yerde milisaniye sürmesinin nedeni budur: hiçbir şey
derlenmez, hiçbir araç zinciri devreye girmez ve arama, ikili dosyaları ve yok
sayılan yolları atlar — çünkü Git bunların hangileri olduğunu zaten bilir.
