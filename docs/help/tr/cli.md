---
title: Komut satırı
category: Çalışma alanı araçları
order: 93
summary: `gitcito .` — `code .` gibi, ama Git için.
keywords: cli komut satırı terminal shim path kurulum klasör açma tek örnek single instance
---

# Komut satırı

```sh
gitcito .                        # open this folder
gitcito ~/code/api               # …or that one
gitcito . -n "My API"            # with a display name
gitcito . -g "Work"              # inside a group tab
gitcito . -n "My API" -g "Work"  # both
```

## Shim'i kurma

Komut paleti (<kbd>⌘K</kbd>) → **'gitcito' komutunu PATH'e kur** (macOS). Küçük
bir shim'i `/usr/local/bin` ya da `/opt/homebrew/bin` altına sembolik bağ olarak
koyar; yalnızca ikisi de sizin yazma izniniz dışındaysa yönetici hakkı ister.
Kaldırmak için aynı komutu yeniden çalıştırın.

## Nasıl davranır

- Yol **zaten açıksa** — bir sekme olarak ya da bir grubun içinde — Gitcito
  kopyasını açmak yerine **ona odaklanır**.
- Henüz bir Git deposu değilse yine de açılır ve "burada depo başlat" akışını
  sunar.
- `-g`, depoyu o adlı bir gruba ekler; grup yoksa oluşturur.
- Gitcito **tek örnek** çalışır: uygulama açıkken `gitcito` çalıştırmak, ikinci
  bir kopya başlatmak yerine isteği o pencereye devreder.

**Ayrıca bakınız:** [Çalışma alanları, sekmeler ve gruplar](workspaces.md)
