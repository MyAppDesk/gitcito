---
title: Nesne gezgini
category: Depo ve geçmiş
order: 16
summary: Grafiğin altındaki katmanda dolaşın — commit'ler, ağaçlar, blob'lar, etiketler ve onlara işaret eden ref'ler. Burada hiçbir şey bir şeyi değiştirmez.
keywords: nesneler objects nesne gezgini object explorer blob tree ağaç commit tag etiket ref plumbing cat-file ls-tree sha1 iç yapı internals veritabanı rev-parse HEAD^{tree} loose packed
---

# Nesne gezgini

Git'in karmaşık olduğu yönünde bir ünü vardır. Bunun neredeyse tamamı modeli hiç
görmemekten gelir: **dört tür nesne ve işaretçiler**. Bir commit'e tıklayıp
ağacına indiğinizde ve dosyanızın aslında bir ağaç tarafından ad verilmiş bir
blob *olduğunu* gördüğünüzde, üst düzey komutlar sihir olmaktan çıkar.

`⌘K` → **Nesne gezgini**. Bu sayfadaki hiçbir şey tek bir bayt değiştiremez —
arkasındaki her çağrı bir okumadır.

![Bir commit'in alanları, ağacı ve ebeveynleri bağlantı olarak, ref listesinin yanında](../../screenshots/objects.webp)

## Dört nesne

| Nesne | Nedir | Ne bilir |
|--------|----|-------|
| **blob** | Bir dosyanın *içeriği* | Hiçbir şey. Ne adını, ne yolunu, ne geçmişini |
| **tree** | Bir dizin listesi | Adlar, modlar ve her alt blob ya da ağacın sha'sı |
| **commit** | Tek bir anlık görüntü | Ağacı, ebeveynleri, yazar, commit'leyen, mesaj |
| **tag** | Açıklamalı bir etiket | İşaret ettiği nesne, etiketleyen, bir mesaj |

Çoğu kişi için sürpriz olan ilk satırdır. **Bir blob'un adı yoktur.** Geçmişinizin
herhangi bir yerinde içeriği aynı olan iki dosya, bir kez saklanan aynı blob'dur.
Ad, ona işaret eden ağaçta yaşar — git'in dosyaları değil içeriği izlemesinin ve
yeniden adlandırmaların kaydedilmek yerine tespit edilmesinin sebebi budur.

Bir **ref** — `refs/heads/main`, `refs/tags/v1.0`, `HEAD` — bir sha içeren bir
dosyadan ibarettir. "Dallanma ucuzdur" cümlesinin tamamı budur.

## Dolaşmak

Sol sütun, depodaki her ref'i git'in grupladığı şekilde gruplayarak listeler.
Birine tıklayın, adlandırdığı nesneye inin.

Oradan sonra her şey bir bağlantıdır:

- Bir **commit** kendi `tree`'sini ve her `parent`'ını gösterir — anlık görüntüye
  geçin ya da geçmişte commit commit geriye doğru yürüyün.
- Bir **tree** girdilerini mod, tür, sha ve boyutla listeler. O alt öğeyi açmak
  için bir ada tıklayın.
- Bir **blob** metnini gösterir (büyük olanlarda baş kısmını) ya da ikili olduğunu
  açıkça söyler.
- Bir **açıklamalı etiket** neye işaret ettiğini gösterir — commit'e geçmek için
  tıklayın.

**Geri** adımlarınızı geri sarar.

## Bir revizyon yazmak

Kutu, `git rev-parse` kabul eden her şeyi alır; işte bu, onu bir gezgin olmaktan
çıkarıp öğrenme aracına dönüştüren yerdir:

| Şunu yazın | Şunu alın |
|-----------|--------|
| `HEAD` | Geçerli commit |
| `HEAD~3` | Üç commit geri |
| `HEAD^{tree}` | O commit'in ağacı, soyulmuş hâlde |
| `HEAD:src/app.ts` | O yola ait blob, doğrudan |
| `v1.0^{}` | Etiket nesnesi yerine açıklamalı bir etiketin işaret ettiği şey |
| `a1b2c3d` | Sha ile herhangi bir nesne — kısaltmalar çalışır |

Bir ağaç listesindeki mod rakamlarını bilmek işe yarar: `100644` bir dosya,
`100755` çalıştırılabilir, `040000` bir alt ağaç, `120000` bir sembolik bağ,
`160000` bir alt modül gitlink'i — ki bu sonuncusu, bir alt modülün sakladığı
şeyin tamamıdır.

## Bilmeye değer sınırlar

- **Bilerek salt okunur.** Burada yazacak bir şey yok. Elle nesne üretmek bir
  `git hash-object` alıştırmasıdır ve yeri terminaldir.
- **Büyük blob'lar** ilk 200 KB'den sonra kesilir — ne olduğunu görmeye yetecek
  kadar, pencereyi kilitlemeyecek kadar.
- **Boyutlar, `git cat-file -s` bildirdiği hâliyle nesnenin içerik boyutudur**;
  paketlendikten sonra diskte tuttuğu yer değil. Onun için
  [bakım](maintenance.md) sayfasına bakın.
- **Erişilemeyen nesneler de nesnedir.** Bir `git fsck` sarkan nesne raporundan
  bir sha yapıştırın, açılır; kaybolan bir commit'in ne içerdiğini kurtarmaya
  karar vermeden önce görmenin en hızlı yolu genellikle budur.

Ayrıca bakınız: [Grafik](graph.md) · [Depo bakımı](maintenance.md) ·
[Kurtarma](recovery.md)
