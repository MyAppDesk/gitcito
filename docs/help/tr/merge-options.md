---
title: Birleştirme seçenekleri
category: Dallanma ve cerrahi
order: 45
summary: Her seferinde aynı şekilde ters giden birleştirmeler için git merge anahtarları — -X ours, boşluk, squash, subtree.
keywords: birleştirme seçenekleri strateji merge options strategy -X ours theirs ignore-space-change boşluk whitespace squash no-ff ff-only no-commit subtree resolve ort recursive log --merge neden çakışma conflict
---

# Birleştirme seçenekleri

Sıradan bir birleştirme tek bir düğmedir ve çoğu zaman hikâyenin tamamı budur.
Bu sayfa geri kalan zamanlar için: her birleştirmede çakışan lock dosyası,
birinin girintilerini baştan düzenlediği dosya, yolları bir türlü tutmayan
vendor'lanmış proje. Git'in bu üçü için de yıllardır anahtarları var; sadece
çakışmanın ortasında kimsenin açmadığı bir kılavuz sayfasına gömülüler.

Bir dala sağ tıklayın → **Seçeneklerle birleştir…** — kenar çubuğundaki dal ve
uzak depo satırlarında *ve* grafikteki renkli ref rozetlerinde, ki bunlar tek
bir menü bloğunu paylaşır — ya da `⌘K` → **Seçeneklerle birleştir**.

![Birleştirme seçenekleri, altında tam git komutu yazılı halde](../../screenshots/merge-options.webp)

Komut siz kurdukça yazdırılır. Orada olmasının sebebi kılavuza karşı kontrol
edilebilmesi — ve bir dahaki sefere bu pencere olmadan bir terminalden
çalıştırılabilmesidir.

## Bir hunk çakıştığında

| Seçim | Bayrak | Anlamı |
|--------|------|-------|
| Dur ve bana sor | — | Varsayılan. Çözümü siz yaparsınız |
| Bu dalın tarafını koru | `-X ours` | Çakışan hunk'lar zaten checkout edilmiş olana göre çözülür |
| Gelen tarafı al | `-X theirs` | Çakışan hunk'lar gelen dala göre çözülür |

**`-X ours`, `-s ours` değildir.** Buradaki anahtar yalnızca gerçekten çakışan
hunk'lara karar verir; diğer dalın geri kalan tüm değişiklikleri normal şekilde
birleşir. Gitcito'nun sunmadığı `ours` *stratejisi* ise sizin ağacınızı olduğu
gibi alır ve karşı tarafı çöpe atar; ortaya içermediği bir çalışmayı içeriyormuş
gibi görünen bir merge commit'i çıkar. Bu ayrım, git birleştirmeleri hakkında
en çok yanlış anlaşılan tek şeydir.

**Her şeye karar veremez.** Bir değiştir/sil çakışması — bir taraf dosyayı
düzenlemiş, diğeri silmiş — içerik hunk'ı değildir ve `-X` onu size bırakır.
Bu doğrudur: silinmiş bir dosyanın geri gelip gelmemesi gerektiğini yanıtlayan
bir "bizimkini tercih et" sürümü yoktur.

## Boşluk karakterleri

| Seçim | Bayrak |
|--------|------|
| Mevcut boşluklardaki değişiklikleri yok say | `-X ignore-space-change` |
| Boşlukları tamamen yok say | `-X ignore-space-at-eol`, `-X ignore-all-space` |

Bunun var olma sebebi şu durum: bir dal bir dosyanın girintilerini yeniden
düzenlemiş (ya da bir formatlayıcı düzenlemiş), diğeri aynı satırları
düzenlemiş. Git bir satıra iki düzenleme görüp durur. Boşluklar yok
sayıldığında yeniden girintileme tartılacak bir değişiklik olmaktan çıkar ve
asıl düzenleme sorunsuz birleşir.

Sonuç, dokunduğu satırlarda *karşı* tarafın boşluklarını korur; dolayısıyla
ardından bir formatlayıcı çalıştırmak kötü bir fikir değildir.

## Neyin kaydedileceği

| Seçim | Bayrak | Elinizde kalan |
|--------|------|-----------------|
| Mümkünse fast-forward | — | Yalnızca geçmiş ayrıldıysa bir merge commit'i |
| Her zaman merge commit'i oluştur | `--no-ff` | Fast-forward için bile bir merge commit'i, böylece dal grafikte sonsuza dek görünür |
| Yalnızca fast-forward, yoksa reddet | `--ff-only` | Gerçek bir birleştirme gerekirse hiçbir şey. Bir kontrol olarak faydalı |
| Squash | `--squash` | Değişiklikler hazırlanmış, kaydedilmiş bir merge yok, commit'i siz yazacaksınız |
| Birleştir ama commit'leme | `--no-commit` | Birleştirme hazırlanmış ve sürüyor, böylece önce inceleyebilir ya da değiştirebilirsiniz |

**Squash ile `--no-commit` aynı şey değildir.** Squash bir birleştirmenin
yaşandığını tamamen unutur: git ikinci bir ebeveyn kaydetmez ve dal bir dahaki
sefere birleştirilmemiş görünür. `--no-commit` ise sizi bekleyen, sürmekte olan
bir birleştirmedir — `MERGE_HEAD` ayarlanmıştır ve commit'lemek onu normal
şekilde bitirir.

**`--ff-only` sessizce başarısız olmaz.** Bir merge commit'i gerekecekse git
reddeder ve hiçbir şey kımıldamaz; betiğe bağlanmış bir birleştirmeden önce onu
iyi bir sağlık kontrolü yapan da tam olarak budur.

## Strateji

| Strateji | Ne için |
|----------|-----|
| Varsayılan (`ort`) | Her şey. Git'in modern üç yollu birleştirmesi |
| `subtree` | İki taraf farklı yollarda yaşıyor — bu projenin bir alt dizinine vendor'lanmış bir proje |
| `resolve` | Eski üç yollu birleştirme. Çapraz geçişli bir geçmişte `ort` pes ettiğinde ara sıra başarılı olur |

Akılda tutmaya değer olan `-s subtree`. `vendor/parser/` içinde duran bir
projeden gelen güncellemeleri birleştirmek, aksi hâlde "her dosya silindi, her
dosya eklendi" gibi okunurdu; subtree stratejisi önce yol kaymasını çözer. Tüm
iş akışı için [alt ağaçlar](subtree.md) sayfasına bakın.

## Bu neden çakışıyor

[Çakışma çözücünün](conflicts.md) içinde bir **Bu neden çakışıyor** düğmesi
vardır. Önünüzdeki dosya için `git log --merge` çalıştırır ve dallar
ayrıldığından beri o dosyaya dokunan commit'leri taraf taraf listeler.

![Çakışan dosyaya dokunan, her iki taraftan commit'ler](../../screenshots/conflict-why.webp)

Çakışma işaretleri *neyin* çakıştığını söyler. Bu ise *kimin, ne zaman ve neden
değiştirdiğini* söyler — ki çözümü asıl belirleyen soru genellikle budur ve
taraf seçmeden önce gidip birine sormanın sebebi de budur.

Hiçbir şey göstermiyorsa, hiçbir taraf tam olarak bu dosyaya bir değişiklik
commit'lememiştir: çakışma daha yukarıdaki bir yeniden adlandırmadan ya da
dizin taşımasından geliyordur.

## Bilmeye değer sınırlar

- **Seçenekler tek bir birleştirme için geçerlidir.** Hatırlanmazlar ve sıradan
  **Geçerli dala birleştir** girdisini ya da sürükle-bırak menüsünü değiştirmezler.
- **Geri alma yine çalışır**: seçeneklerle çalıştırılan bir birleştirme aynı geri
  alma girdisini kaydeder ve `ORIG_HEAD`'e sıfırlar.
- **Ahtapot birleştirmeler** (aynı anda ikiden fazla dal) burada sunulmaz.
- **Commit menüsündeki ref başına "X'i Y'ye birleştir" girdileri** sade
  birleştirme olarak kalır. Seçenekleri istediğinizde ref rozetinin kendisini
  kullanın.
- **`-X` sessizce karar verir.** Hangi hunk'ların otomatik çözüldüğünü hiçbir şey
  işaretlemez; bu yüzden önemli bir birleştirmede çakışma yokluğuna güvenmek
  yerine sonrasında diff'i okuyun.

Ayrıca bakınız: [Birleştirme ve rebase](merging.md) · [Çakışmalar](conflicts.md) ·
[Alt ağaçlar](subtree.md) · [Çakışma radarı](conflict-radar.md)
