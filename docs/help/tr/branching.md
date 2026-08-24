---
title: Dallar, uzak depolar ve kenar çubuğu
category: Dallanma ve cerrahi
order: 40
summary: Sol kenar çubuğunun yaptığı her şey ve sabitlenmiş dallar.
keywords: dal dallar oluşturma checkout yeniden adlandırma silme uzak sabitlenmiş kenar çubuğu branch branches remote pinned sidebar presence
---

# Dallar, uzak depolar ve kenar çubuğu

Yeniden sıralanabilir, aranabilir tek bir kenar çubuğu **dalları, uzak
depoları, etiketleri, stash'leri, çalışma ağaçlarını ve alt modülleri** barındırır.
Her bölüm gizlenebilir ya da yeniden sıralanabilir (Ayarlar → Düzen) ve filtre
kutusu hepsine birden uygulanır.
Hangi bölümleri ve klasörleri açık ya da kapalı bıraktığınız depo başına
hatırlanır; yeniden başlatınca da korunur.

![Sabitlenmiş dalların en üstte tutulduğu kenar çubuğu](../../screenshots/pinned-branches.webp)

## Dallar

Yerel ve uzak dalları oluşturun, checkout edin, yeniden adlandırın ve silin.
Dal satırları şunları gösterir:

- upstream'lerine göre **↑önde / ↓geride** durumu,
- **uzak depo başına varlık rozetleri** (bu dal hangi uzak depolarda var),
- bir [çakışma radarı](conflict-radar.md) taramasından sonra bir **risk noktası**,
- uzak depo [geçmişi yeniden yazdığında](range-diff.md) bir **⟳ işareti**.

Adında `/` bulunan dallar otomatik olarak katlanabilir klasörlere toplanır.
Bir klasör başlığına sağ tıklamak tüm grup üzerinde çalışır: *`feature`
altındaki tüm dalları sil (4 dal)*, tam olarak hangi dalların gideceğini
listeleyen tek bir onaydan sonra içindeki her şeyi kaldırır — üzerinde
olduğunuz dal hariç tutulur. Aynı menü uzak dal klasörlerinde de vardır; orada
silme uzak depodan yapılır.

Araç çubuğundaki dal açılır menüsü yerel ve uzak dalları listeler. Bu
menüdeki herhangi bir dala sağ tıklayarak yerel bir dalı yeniden
adlandırabilir, adını kopyalayabilir, yeni bir worktree içinde açabilir,
etkin dala birleştirebilir veya silebilirsiniz. Uzak dallarda yeniden
adlandırma yoktur; onay sonrasında uzak depodan silinirler. Gitcito, seçilen
referans zaten etkin dalın içindeyse birleştirmeyi gizler ve o dal zaten
çekilmişse worktree oluşturmayı devre dışı bırakır.

![Araç çubuğu açılır menüsünde yerel dal eylemleri](../../screenshots/branch-dropdown-local-context-menu.webp)

![Araç çubuğu açılır menüsünde uzak dal eylemleri](../../screenshots/branch-dropdown-remote-context-menu.webp)

Satırlar dosyalar gibi çoklu seçilir: <kbd>⌘/Ctrl</kbd> ile tıklamak bir satırı
açıp kapatır, <kbd>Shift</kbd> ile tıklamak bir aralık seçer,
<kbd>Shift</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> ise seçimi en son tıkladığınız
satırdan genişletir. Toplu menü için seçime sağ tıklayın — *4 dalı sil* — tam
listeyle onay ister. Aynı hareketler uzak dallarda, etiketlerde ve stash'lerde
de çalışır.

![Eğik çizgiyle ayrılmış dal adlarının ağaca katlanmış hâli](../../screenshots/branch-grouping.webp)

## Bir dalı yeniden adlandırmak

Üç gün önce `fix` diye adlandırdığın dal, bugün kimsenin yerini kestiremediği
bir daldır. Sorunu nerede fark ettiysen orada adını değiştir:

| Nerede | Nasıl |
|--------|-------|
| Kenar çubuğu | Dala sağ tıkla → *Yeniden adlandır…* |
| Araç çubuğundaki dal listesi | Dala sağ tıkla → *Yeniden adlandır…* |
| Commit grafiği | Bir commit'teki dal rozetine sağ tıkla → *Yeniden adlandır…* |
| Komut paleti | <kbd>⌘/Ctrl</kbd>+<kbd>K</kbd> → *Dalı yeniden adlandır* (etkin dal üzerinde çalışır) |

Yerel yeniden adlandırma `git branch -m` demektir: anında olur ve **⌘Z ile geri
alınır** — geri alma girdisi eski adı iade eder. Üzerinde bulunduğun dalın adını
değiştirmek seni o dalda bırakır.

Dal bir uzak dalı izliyorsa menü ayrıca *Yeniden adlandır (uzak dahil)…* sunar:
yerelde adı değiştirir, yeni adı push eder, eskisini uzakta siler. Bu **geri
alınamaz** — eski uzak dal yok olur ve onu checkout etmiş olan herkesin yeniden
yönlenmesi gerekir. Graf rozetinde bu seçenek yalnızca dal tam olarak bir uzağı
izliyorsa görünür; birden fazlaysa upstream belirsiz kalmasın diye dalı kenar
çubuğundan seç.

**Sınırlar:** Gitcito eski ada başvuran hiçbir şeyi yeniden yazmaz — açık pull
request'ler hâlâ açıldıkları dalı gösterir ve dal desenine göre eşleşen CI
kuralları eşleşmeyi bırakır. Başka bir [worktree](worktrees.md) içinde checkout
edilmiş bir dalı yeniden adlandırmak başarısız olur, git de bunu söyler.

## Sabitlenmiş dallar

Sürekli döndüğünüz dalları yıldızlayın — satırın üzerine gelip ★ simgesine
tıklayın ya da sağ tıklayıp *Dalı sabitle* deyin. Bu dallar Yerel bölümünün en
üstündeki bir **Sabitlenmiş** grubunda belirir, depo başına hatırlanır ve
aşağıdaki normal yerlerinde de durmaya devam eder.

## Uzak bir dalı checkout etmek

Uzak bir dala çift tıklayarak onu izleyen yerel dalı oluşturun. Aynı adda bir
yerel dal zaten varsa ve **ayrışmışsa**, Gitcito bunu nasıl uzlaştıracağınızı
sorar — rebase, merge ya da reset — ve önce dalı yedeklemeyi önerir.

![Ayrışmış dal sorusu: rebase, merge veya reset, yedekleme seçeneğiyle](../../screenshots/diverged-checkout.webp)

### Yerel dalınız gerideyken

Checkout sırasında uzak ucuna ileri sarılır (fast-forward). Kirli bir çalışma
ağacı önce adlandırılmış bir stash'e alınır ve sonra geri konur, böylece yerel
düzenlemeleriniz güncellemeyi iptal etmez.

### Yerel dalınız ilerideyken

Yerel dal ilerideyse ve uzakta yeni bir şey yoksa, checkout *uzak* dal isteğine
sizin push edilmemiş çalışmanızla cevap verirdi — bu yüzden hangi tarafı
kastettiğinizi söyleyene kadar hiçbir şey checkout edilmez:

| Seçim | Ne olur |
|-------|---------|
| Yereli checkout et | Yerel dala geçer, commit'ler olduğu gibi kalır. Diğer istemcilerin sessizce yaptığı şey. |
| Sıfırla (soft) | Dalı uzak ucuna geri alır; commit'lerin değişiklikleri **hazırlıkta** kalır, yeniden commit'lenmeye hazırdır. |
| Sıfırla (mixed) | Aynı hareket, değişiklikler çalışma ağacında **hazırlık dışında** kalır. |
| Sıfırla (hard) | Commit'leri *ve* değişikliklerini atar. |

![İleride olan dal penceresi: yereli checkout et ya da soft, mixed, hard sıfırla](../../screenshots/ahead-checkout.webp)

*Önce yedek dal oluştur* seçili kalsın; yerel uç, hiçbir şey kıpırdamadan önce
`backup/<dal>-<zaman-damgası>` olarak saklanır, böylece hard sıfırlama bile bir
checkout uzaklıkta geri alınabilir. Sıfırlama ayrıca geri alma yığınına (⌘Z)
girer — ama yalnızca depoyu kapatana kadar; yedek dal daha uzun yaşar.

**Sınırlar:** pencere dalı yalnızca az önce alınan izleme referansıyla
karşılaştırır; fetch'i reddeden bir uzak sunucu (çevrimdışı, hatalı kimlik
bilgileri) son bilinen uçla karşılaştırılır. Commit'lerinizin *iyi* olup
olmadığını söylemez — yalnızca burada var, orada yok olduğunu.

**Ayrıca bakınız:** [Birleştirme ve rebase](merging.md) · [Çalışma ağaçları](worktrees.md)
