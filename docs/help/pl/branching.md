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
To, które sekcje i katalogi zostawiasz rozwinięte albo zwinięte, jest
zapamiętywane per repozytorium — także po restarcie.

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
Kliknij prawym przyciskiem nagłówek katalogu, by zadziałać na całą grupę: *Usuń
wszystkie branche pod `feature` (4 branchy)* usuwa wszystko w środku po jednym
potwierdzeniu, które wypisuje dokładnie, które gałęzie znikną — gałąź, na
której jesteś, jest wykluczona. To samo menu istnieje na katalogach zdalnych
gałęzi, usuwając wtedy ze zdalnego repozytorium.

Wiersze zaznacza się grupowo jak pliki: klik z <kbd>⌘/Ctrl</kbd> przełącza
wiersz, klik z <kbd>Shift</kbd> zaznacza zakres, a
<kbd>Shift</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> rozszerza zaznaczenie od ostatnio
klikniętego wiersza. Kliknij zaznaczenie prawym przyciskiem, by otworzyć menu
zbiorcze — *Usuń 4 branchy* — które potwierdza pełną listą. Te same gesty
działają na zdalnych gałęziach, tagach i stashach.

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

### Gdy Twoja lokalna gałąź jest z tyłu

Przy przełączaniu zostaje przewinięta (fast-forward) do wierzchołka zdalnej
gałęzi. Brudne drzewo robocze trafia najpierw do nazwanego stasha i wraca po
aktualizacji, więc lokalne zmiany jej nie przerywają.

### Gdy Twoja lokalna gałąź jest do przodu

Jeśli lokalna gałąź jest do przodu, a zdalna nie ma nic nowego, przełączenie
odpowiedziałoby na prośbę o gałąź *zdalną* Twoją własną, niewypchniętą pracą —
dlatego nic nie zostaje przełączone, dopóki nie powiesz, którą stronę masz na
myśli:

| Wybór | Co się dzieje |
|-------|---------------|
| Przełącz na lokalną | Przechodzi na lokalną gałąź z nienaruszonymi commitami. To, co każdy inny klient robi po cichu. |
| Reset (soft) | Cofa gałąź do wierzchołka zdalnej; zmiany z commitów zostają **w poczekalni**, gotowe do ponownego commita. |
| Reset (mixed) | To samo cofnięcie, zmiany zostają **poza poczekalnią** w drzewie roboczym. |
| Reset (hard) | Odrzuca commity *i* ich zmiany. |

![Okno gałęzi do przodu: przełącz na lokalną albo zresetuj soft, mixed lub hard](../../screenshots/ahead-checkout.webp)

Zostaw zaznaczone *Najpierw utwórz gałąź zapasową*, a wierzchołek lokalnej gałęzi
zostanie zapisany jako `backup/<gałąź>-<znacznik-czasu>`, zanim cokolwiek się
przesunie — nawet reset hard dzieli wtedy od cofnięcia jedno przełączenie. Reset
trafia też na stos cofania (⌘Z), ale tylko do zamknięcia repozytorium; gałąź
zapasowa zostaje dłużej.

**Ograniczenia:** okno porównuje gałąź wyłącznie z właśnie pobraną referencją
śledzącą, więc zdalne repozytorium, które odrzuciło pobranie (brak sieci, złe
dane logowania), zostanie porównane z ostatnio znanym wierzchołkiem. Nie mówi
nic o tym, czy Twoje commity są *dobre* — tylko że są tu, a nie tam.

**Zobacz też:** [Merge i rebase](merging.md) · [Worktree](worktrees.md)
