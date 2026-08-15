---
title: Fetch, pull i push
category: Synchronizacja i wiele repozytoriów
order: 50
summary: Trzymanie kroku, z zabezpieczeniami na operacjach, które gryzą.
keywords: fetch pull push force auto-fetch prune zdalne upstream chroniona gałąź wiele zdalnych fork mirror tagi remotes protected branch multiple remotes tags all
---

# Fetch, pull i push

## Pull

Trzy tryby, wybierane z listy: **domyślny**, **tylko fast-forward** albo
**rebase**. Lokalne zmiany są automatycznie chowane do stasha i przywracane
wokół pulla, więc brudne drzewo cię nie blokuje.

## Push

Force push zawsze używa `--force-with-lease` — bezpiecznego wariantu, który
odmawia, jeśli zdalne repozytorium ruszyło się od czasu, gdy ostatnio
patrzyłeś. Push z force'em na **chronioną gałąź** prosi o potwierdzenie (listę
znajdziesz w kole zębatym ustawień repozytorium).

![Potwierdzenie, którego chroniona gałąź żąda przed force pushem](../../screenshots/force-push-guard.webp)

### Więcej niż jedno zdalne repozytorium

Przycisk **Push** celuje w upstream gałęzi. Strzałka obok niego, gdy tylko
repozytorium ma więcej niż jedno zdalne, oferuje dodatkowo:

| | |
|---|---|
| **Push do jednego zdalnego** | Wybierz jedno — fork, mirror, cel wdrożenia |
| **Push do wszystkich N zdalnych** | Jeden push na zdalne, po kolei |
| **Wypchnij wszystkie tagi do** | `git push <remote> --tags`, każdy lokalny tag naraz |

Te same dwie akcje siedzą na wierszu każdego zdalnego w panelu bocznym — a to
zwykle miejsce, w którym jesteś, gdy pytanie się pojawia.

**Odmowa nie anuluje reszty.** Push do forka i do jego upstreamu to dokładnie
ten przypadek, w którym jedna strona odmawia, a druga i tak powinna przejść —
więc każde zdalne raportuje osobno: sukcesy są wymienione w jednym toaście,
a każda porażka dostaje własny, z powodem podanym przez gita.

Upstream gałęzi ustawia wyłącznie **pierwsze** zdalne z listy. Gałąź ma jeden
upstream, a ostatnie zdalne, do którego zrobiłeś push, nie jest automatycznie
tym, które ma być śledzone.

Obie drogi wykonują te same sprawdzenia co zwykły push — potwierdzenie chronionej
gałęzi i [zabezpieczenie przed sekretami](security.md). Publikowanie do dwóch
zdalnych to podwójna ekspozycja, a nie połowa ostrożności.

## Fetch

**Pobierz wszystko i przytnij** na każdym zdalnym, plus **auto-fetch** w tle
w ustawionym przez ciebie interwale (Ustawienia → Ogólne) i plakietka „pobrano X
temu" na pasku narzędzi.

Fetch, który natrafi na **przepisaną historię**, mówi to wprost: toast nazywa
gałąź, a jej wiersz dostaje znacznik otwierający
[co się zmieniło od](range-diff.md) dokładnie w commicie, na który wcześniej
wskazywała.

## Wiele repozytoriów naraz

- Karta grupy potrafi zrobić **Pobierz wszystko / Pull na wszystkich** dla
  całego swojego poddrzewa.
- [Centrum dowodzenia](mission-control.md) robi to w skali całej przestrzeni
  roboczej i potrafi zrobić pull *tylko* na tych repozytoriach, które faktycznie
  są w tyle.

## Zdalne repozytoria

Dodawaj, edytuj, usuwaj i pobieraj poszczególne zdalne z panelu bocznego.
Wiersze gałęzi noszą plakietki obecności na poszczególnych zdalnych, więc na
pierwszy rzut oka widzisz, które z nich mają kopię danej gałęzi.

**Zobacz też:** [Centrum dowodzenia](mission-control.md) · [Hosting i pull requesty](hosting.md)
