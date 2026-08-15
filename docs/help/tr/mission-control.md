---
title: Komuta merkezi
category: Eşitleme ve çoklu depo
order: 51
summary: Çalışma alanındaki her depo tek ekranda, en kötüsü en üstte.
keywords: komuta merkezi kontrol paneli gösterge paneli tüm depolar genel bakış durum kirli push edilmemiş geride çalışma alanı mission control dashboard status dirty unpushed behind workspace
---

# Komuta merkezi

Yirmi depo, ve soru hep aynı: hangisinin bana ihtiyacı var?

Komuta merkezi bunu yanıtlar. **Etkin çalışma alanındaki** her depo tek bir
ekranda, gerçekten sizi bekleyene göre sıralanmış hâlde:

1. **Engellenmiş** — yarım kalmış bir rebase veya merge, çakışmalar, hiç
   okunamayan bir depo.
2. **Eşitlenecek** — önce pull edilecek commit'ler, sonra push edilecekler.
3. **Devam eden** — commit'lenmemiş çalışma, izlenmeyen dosyalar.
4. **Temiz** — sessiz olanlar, en altta, ait oldukları yerde.

![Her depo tek ekranda, en kötüsü en üstte](../../screenshots/mission-control.webp)

## Bir satır size ne anlatır

Dal ve upstream'i · ↑ileride / ↓geride · commit'lenmemiş ve izlenmeyen dosya
sayıları · stash'ler · açık PR'lar (depo zaten yüklendiyse) · **14 günlük commit
sparkline'ı** · son commit'in üzerinden geçen süre.

Bir satırı genişletin (şevron veya <kbd>space</kbd>) ve hangi commit'lerin push
edilmeyi beklediğini, hangi dosyaların kirli olduğunu tam olarak görün.

## Listeyi işlemek

- Üstteki durum rozetleri birer **filtredir** — "3 engellenmiş"e tıklayın,
  yalnızca onları görün.
- **Aciliyete**, **ada** veya **etkinliğe** göre sıralayın.
- **Birkaç depoyu işaretleyip** fetch edin ya da yalnızca geride kalanları pull
  edin (düğme sizin için sayar).
- Açık olduğu sürece kendini 30 saniyede bir yeniler.

| Tuş | Eylem |
|---|---|
| <kbd>↑</kbd> <kbd>↓</kbd> veya <kbd>j</kbd> <kbd>k</kbd> | Listede gezinin |
| <kbd>Enter</kbd> | O depoyu açın |
| <kbd>f</kbd> / <kbd>p</kbd> | Fetch / pull edin |
| <kbd>space</kbd> | Genişletin |
| <kbd>/</kbd> | Filtreye atlayın |

## Bir sekme değil, bir görünüm

Çalışma alanı adının yanındaki gösterge onu açıp kapatır; herhangi bir sekmeye
tıklamak sizi işinize geri döndürür. Kendine ait bir sekme açmaz ve içinde
bulunduğunuz çalışma alanına aittir — çalışma alanını değiştirin, o çalışma
alanının kontrol panelini alın.

Onu okumak **tamamen yereldir**: depo başına bir `git status`, ağ yok, token
yok. Kontrol panelini açmak hiçbir yerde kimlik doğrulaması yapmaz. Fetch
işlemi her zaman sizin istediğiniz bir şeydir.

**Ayrıca bakınız:** [Çalışma alanları ve sekmeler](workspaces.md) · [Çalışma alanları, sekmeler ve gruplar](workspaces.md)
