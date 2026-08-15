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

![Sabitlenmiş dalların en üstte tutulduğu kenar çubuğu](../../screenshots/pinned-branches.webp)

## Dallar

Yerel ve uzak dalları oluşturun, checkout edin, yeniden adlandırın ve silin.
Dal satırları şunları gösterir:

- upstream'lerine göre **↑önde / ↓geride** durumu,
- **uzak depo başına varlık rozetleri** (bu dal hangi uzak depolarda var),
- bir [çakışma radarı](conflict-radar.md) taramasından sonra bir **risk noktası**,
- uzak depo [geçmişi yeniden yazdığında](range-diff.md) bir **⟳ işareti**.

Adında `/` bulunan dallar otomatik olarak katlanabilir klasörlere toplanır.

![Eğik çizgiyle ayrılmış dal adlarının ağaca katlanmış hâli](../../screenshots/branch-grouping.webp)

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

**Ayrıca bakınız:** [Birleştirme ve rebase](merging.md) · [Çalışma ağaçları](worktrees.md)
