---
title: Gałęzie, zdalne repozytoria i panel boczny
category: Gałęzie i operacje na historii
order: 40
summary: Wszystko, co robi lewy panel, oraz przypięte gałęzie.
keywords: gałąź gałęzie utwórz przełącz zmień nazwę usuń zdalne przypięte panel boczny branch branches create checkout rename delete remote pinned sidebar presence
---

# Gałęzie, zdalne repozytoria i panel boczny

Jeden panel boczny — przestawialny i przeszukiwalny — mieści **gałęzie, zdalne
repozytoria, tagi, stashe, worktree i podmoduły**. Każdą sekcję da się ukryć
albo przestawić (Ustawienia → Układ), a pole filtra działa na wszystkie naraz.

![Panel boczny z przypiętymi gałęziami trzymanymi na górze](../../screenshots/pinned-branches.webp)

## Gałęzie

Twórz, przełączaj, zmieniaj nazwy i usuwaj — lokalne i zdalne. Wiersze gałęzi
pokazują:

- **↑przed / ↓za** względem swojego upstreamu,
- **plakietki obecności na poszczególnych zdalnych** (które zdalne mają tę
  gałąź),
- **kropkę ryzyka** po skanie [radaru konfliktów](conflict-radar.md),
- **znacznik ⟳**, gdy zdalne repozytorium
  [przepisało historię](range-diff.md).

Gałęzie z `/` w nazwie same zwijają się w składane katalogi.

![Nazwy gałęzi rozdzielone ukośnikiem zwinięte w drzewo](../../screenshots/branch-grouping.webp)

## Przypięte gałęzie

Oznacz gwiazdką gałęzie, do których ciągle wracasz — najedź na wiersz i kliknij
★ albo kliknij prawym przyciskiem → *Przypnij gałąź*. Wypływają wtedy do grupy
**Przypięte** na górze sekcji lokalnej, zapamiętywane osobno dla każdego
repozytorium, i jednocześnie zostają na swoim zwykłym miejscu niżej.

## Przełączanie na gałąź zdalną

Kliknij dwukrotnie gałąź zdalną, żeby utworzyć lokalną, która ją śledzi. Jeśli
lokalna gałąź o tej nazwie już istnieje i się **rozeszła**, Gitcito zapyta, jak
to pogodzić — rebase, merge czy reset — i zaproponuje wcześniejsze zrobienie
kopii gałęzi.

![Pytanie o rozeszłą gałąź: rebase, merge albo reset, z opcją kopii zapasowej](../../screenshots/diverged-checkout.webp)

**Zobacz też:** [Merge i rebase](merging.md) · [Worktree](worktrees.md)
