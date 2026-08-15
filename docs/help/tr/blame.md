---
title: Blame ve dosya geçmişi
category: Değişiklikleri okuma
order: 22
summary: Bu satırı kim yazdı, ne zaman yazdı ve öncesinde nasıl görünüyordu.
keywords: blame geçmiş dosya satır yazar annotate reblame takip history
---

# Blame ve dosya geçmişi

Herhangi bir dosyayı açın ve görünüm kipini değiştirin: **Önizleme · Dosya ·
Diff · Blame · Geçmiş**.

![Blame; her satırın arkasındaki commit kenar boşluğunda](../../screenshots/blame.webp)

## Blame

Her satır kendi commit'ini, yazarını ve tarihini taşır; commit'e göre renk
kodlandığı için ortak geçmişe sahip bloklar ilk bakışta göze çarpar.

- **Satırı diff'e kadar izleyin**: bir blame satırından, onu üreten değişikliğe
  doğrudan atlayın.
- **Bu commit'ten öncesini yeniden blame'le**: bir satıra sağ tıklayıp dosyayı o
  commit'ten *önceki* hâliyle blame'leyin — bir satırın geçmişinde görünümden
  çıkmadan geriye doğru yürümenin yolu budur.

## Geçmiş

Bu dosyaya dokunmuş her commit, en yenisi başta. Birini seçmek dosyanın o
commit'teki sürümünü gösterir, böylece dosyanın nasıl büyüdüğünü sayfa sayfa
izleyebilirsiniz.

![Tek bir dosyaya dokunmuş her commit, en yenisi başta](../../screenshots/file-history.webp)

Tek bir dosya yerine deponun tamamı için
[zaman makinesini](time-machine.md) kullanın.

## Üzerine gelip açıklatın

Yapay zekâ etkinken <kbd>⇧</kbd> tuşunu basılı tutup (yapılandırılabilir, ya da
hiç tuş gerekmeden) bir tanımlayıcının üzerine geldiğinizde, ona dair tek
satırlık bir açıklama ve dayandığı satırlar gösterilir — birine tıklayarak oraya
atlayabilirsiniz. Yalnızca simgenin çevresindeki numaralı bir pencereyi okur;
dolayısıyla bir şey başka bir yerde tanımlanmışsa uydurmak yerine bunu söyler.
Bkz. [Yapay zekâ özellikleri](ai.md).

**Ayrıca bakınız:** [Commit grafiği](graph.md) · [Diff'ler](diffs.md)
