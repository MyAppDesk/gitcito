---
title: İzlenmeyen dosyaları kaldırma
category: Değişikliklerle çalışma
order: 35
summary: git clean'in kuru provası — her izlenmeyen yol, boyutuyla, yok sayılan dosyalar ayrı ve varsayılan hedef Çöp Kutusu.
keywords: temizlik clean git clean izlenmeyen untracked kaldır sil delete çöp junk derleme çıktısı build output yok sayılan ignored gitignore kuru prova dry run çöp kutusu trash node_modules dist toparlama
---

# İzlenmeyen dosyaları kaldırma

Bir çalışma dizini, git'in hiç kopyasını almadığı dosyalar biriktirir: bir karalama
notu, bir `debug-output.txt`, başarısız bir derlemeden kalma bir `dist/`, geçen ay
bıraktığınız bir daldan kalma bir `node_modules`. Git'in bunun için tek bir komutu
var — `git clean` — ve bu, **arkasında hiçbir şey olmayan** tek git işlemidir.
İçerik hiçbir zaman bir commit'te bulunmadı; dolayısıyla ne bir reflog kaydı, ne
bir stash, ne bir geri alma, ne de onu geri getirecek bir `git` büyüsü var.

İnsanların terminalde çalıştırıp pişman olduğu işlem olmasının sebebi budur.
Gitcito'nun sürümü, hiçbir şey olmadan önce listenin tamamını gösterir.

`⌘K` → **İzlenmeyen dosyaları kaldır**.

![İzlenmeyen ve yok sayılan yollar ayrı ayrı, her biri boyutuyla, hiçbir şey kaldırılmadan önce](../../screenshots/clean.webp)

## Liste ne anlama geliyor

Her girdi, `git clean`'in erişebileceği, diskteki boyutuyla verilmiş bir yoldur;
iki grup hâlinde:

| Grup | Nedir | Varsayılan olarak seçili |
|-------|-----------|---------------------|
| **İzlenmeyen** | Hiç commit'lenmemiş, `.gitignore` ile eşleşmiyor | Evet |
| **Yok sayılan** | `.gitignore` ile eşleşiyor — derleme çıktısı, önbellekler, `.env` | **Hayır** |

Asıl mesele bu ayrım. Yok sayılan yollar genellikle değersizdir ve ara sıra önemli
bir şeyin tek kopyasıdır: yerel bir `.env`, bir veritabanı dökümü, indirilmiş bir
fixture. `.gitignore` ile eşleşen hiçbir şey sizin adınıza seçilmez.

Tamamen izlenmeyen bir **dizin tek bir satırdır**, dosya başına bir satır değil —
`tmp/`, `dist/`, `node_modules/` — çünkü git onları bu ayrıntı düzeyinde kaldırır
ve 40.000 dosyalık bir liste kimsenin okumadığı bir listedir. Boyutu, içerdiklerinin
toplamıdır.

**kendi deposu** olarak işaretlenmiş bir klasörün kendi `.git`'i vardır: bunun
içine bıraktığınız bir klon ya da hiç bağlamadığınız bir deneme. Git bunları
kaldırmayı reddeder (`-ff` ister, ki Gitcito bu bayrağı sunmaz) — onları Çöp
Kutusu alır.

## Çöp kutusu ya da silme

**Çöp Kutusu'na taşı** varsayılan olarak açıktır ve git'ten hiç geçmez: yollar
sistem Çöp Kutunuza gider, oradan geri koyabilirsiniz. İç içe bir depoyu kaldıran
tek yol budur ve yanlış bir onay kutusundan sağ çıkan da tek yol budur.

Onu kapatmak, tam olarak seçili yollar üzerinde gerçek bir `git clean -f -d -x`
demektir ve sayı ile toplam boyut gözünüzün önündeyken onaylamanızı ister.
Bundan hiçbir şey kurtarılamaz.

## Bilmeye değer sınırlar

- **Yalnızca izlenmeyen dosyalar.** Değiştirilmiş, izlenen bir dosya burada
  değildir — o [Vazgeç](staging.md) işidir; onu index'ten ya da HEAD'den geri
  getirir.
- **Liste ilk 400 yolla sınırlıdır.** Bir depoda daha fazlası varsa listelenenleri
  kaldırın ve gerisi için **Yeniden tara**'ya basın.
- **Dizin boyutları çok büyük ağaçlarda yaklaşıktır**: tarama 20.000 dosyadan
  sonra durur, dolayısıyla devasa bir `node_modules` olduğundan küçük görünebilir.
  Asla olduğundan büyük görünmez.
- **Tarama bir anlık görüntüdür.** Pencere açıkken bir derleme dosya yazıyorsa,
  bir şey kaldırmadan önce **Yeniden tara**'ya basın.
- Hiçbir şeye dokunulmadan önce yollar git'in kendi kaldırılabilir dosya listesine
  karşı denetlenir; böylece bu pencere üzerinden izlenen hiçbir şey adıyla bile
  kaldırılamaz.

Ayrıca bakınız: [Hazırlama ve vazgeçme](staging.md) · [Dosyaları yok sayma](hooks.md) ·
[Bir dosyayı geçmişten kaldırma](history-purge.md)
