---
title: Odzyskiwanie i reflog
category: Odzyskiwanie i ochrona
order: 60
summary: Siatka bezpieczeństwa: reflog, migawki WIP i bisect.
keywords: reflog odzyskiwanie cofnij zgubione commity migawki wip strażnik guard nieśledzone untracked odrzucenie discard czyszczenie clean bisect skrypt kod wyjścia hard reset recovery undo lost snapshots run automated
---

# Odzyskiwanie i reflog

Git rzadko cokolwiek gubi. Trudne jest odnalezienie tego z powrotem.

## Reflog

Każdy ruch `HEAD` — i każdej gałęzi — razem z tym, co go spowodowało: checkout,
reset, rebase, amend, wymuszony fetch. Z dowolnego dawnego wpisu możesz się na
niego **przełączyć**, **odbić od niego gałąź** albo **zrobić do niego hard
reset**.

![Przeglądarka reflogu](../../screenshots/reflog.webp)

To jest przycisk „właśnie zresetowałem nie tę gałąź".

## Migawki WIP

Niezacommitowana praca to jedyna rzecz, której reflog nie uratuje — więc Gitcito
robi jej migawki: **całe drzewo robocze — pliki zmodyfikowane, zestage'owane i
nieśledzone** — zacommitowane przez jednorazowy indeks i przypięte pod
`refs/gitcito/wip`. Ani twój prawdziwy indeks, ani lista stashy nie są ruszane.

![Migawki WIP](../../screenshots/snapshots.webp)

Migawkę robią trzy rzeczy:

| Wyzwalacz | Kiedy |
|---------|------|
| **Strażnik** | Automatycznie, tuż przed destrukcyjną operacją — odrzuceniem zmian, czyszczeniem, hard resetem, przywróceniem z commita. Domyślnie włączony; przełączysz go w oknie migawek. |
| **Timer** | Co 5 / 15 / 30 minut, póki repozytorium jest otwarte. |
| **Ręcznie** | Przycisk **Zrób migawkę teraz**. |

To strażnik się tu liczy: praca przepada na zawsze zwykle w sekundę po
odrzuceniu, którego nie chciałeś. Z włączonym strażnikiem ten stan jest migawką
— otwórz listę, kliknij przywróć, odetchnij.

Zaznacz migawkę, żeby zobaczyć uchwycone przez nią pliki, podejrzeć zmianę w
dowolnym pliku i przywrócić **pojedynczy plik** albo całe drzewo. Przywracanie
kopiuje pliki z migawki na obecne kopie — najpierw powstaje migawka strażnika,
więc samo przywrócenie też da się cofnąć.

**Ograniczenia warte poznania.** Tyknięcie timera lub strażnika, które nie
znajdzie niczego nowego, niczego nie zapisuje. Przywracanie nadpisuje i odtwarza
pliki, ale nigdy nie usuwa pliku utworzonego po migawce. Pliki ignorowane nie są
uchwytywane. Migawki to lokalne ukryte referencje: nigdy nie są wypychane, są
bezpieczne przed `git gc`, trzymanych jest 50 najnowszych.

## Prowadzony bisect

Oznaczaj commity jako dobre i złe, patrz, jak zakres się zawęża, wyląduj na
pierwszym złym commicie. Gitcito śledzi, ile kroków zostało, więc wiesz, czy
jesteś dwa pytania od odpowiedzi, czy dziesięć.

![Prowadzony bisect](../../screenshots/bisect.webp)

### Niech zdecyduje polecenie

Gdy zakres jest już zasiany, **Niech zdecyduje polecenie** oddaje całe
poszukiwanie w ręce `git bisect run`. Git wypakowuje każdego kandydata,
uruchamia twoje polecenie i czyta jego kod wyjścia:

| Kod wyjścia | Oznacza |
|-----------|-------|
| `0` | Dobry — błędu tutaj nie ma |
| `125` | Nie da się tego przetestować; pomiń |
| cokolwiek innego | Zły |

Zestaw testów już mówi tym językiem — i dlatego `npm test` jest zwykle całą
odpowiedzią. Gitcito podsuwa skrypty tego projektu jako wypełnienia jednym
kliknięciem, strumieniuje wyjście w trakcie i ląduje na pierwszym złym commicie,
a ty nie odpowiadasz na ani jedno pytanie.

![Pole polecenia, gotowe oddać poszukiwanie zestawowi testów](../../screenshots/bisect-run.webp)

**Na co uważać.** Polecenie uruchamia się na *każdym* commicie, który git
testuje, więc polecenie, które wdraża, publikuje albo pisze poza repozytorium,
zrobi to kilkakrotnie. Trzymaj się czegoś, co wyłącznie czyta i raportuje.
**Zatrzymaj** ubija przebieg i zostawia sesję otwartą, żebyś mógł oznaczać dalej
ręcznie; **Przerwij** kończy bisect całkowicie.

Polecenie, które zawodzi z niepowiązanego powodu — powiedzmy z braku zależności
w tamtym punkcie historii — oznacza dobry commit jako zły i wysyła poszukiwanie
w złe miejsce. Wyjście z kodem `125` ze skryptu opakowującego jest wyjściem
gita z tej sytuacji.

## Pozostawiony plik blokady

Git zakłada plik `.lock` obok tego, co za chwilę zapisze, i usuwa go, gdy zapis
się uda. Proces, który ginie, trzymając blokadę — padnięty edytor, terminal
zamknięty w trakcie `git commit`, fetch ubity podczas czyszczenia zdalnych
referencji — zostawia ją, i od tej pory każdy zapis kończy się tą samą linią:

```
error: could not delete references: cannot lock ref 'refs/remotes/origin/x':
Unable to create '…/refs/remotes/origin/x.lock': File exists.
```

Repozytorium nie jest uszkodzone. Po prostu na drodze leży plik.

Gitcito najpierw ponawia kilka razy, bo blokada trzymana przez *działający* git
zwykle zwalnia się w milisekundach. Gdy tak się nie stanie, błąd otwiera okno
zamiast ściany tekstu: wszystkie blokady wciąż na dysku, wiek każdej z nich i
jeden przycisk, który je usuwa i ponawia operację, która się nie udała.

**Wiek to cały argument.** Blokadę młodszą niż 30 sekund przypisuje się gitowi,
który wciąż pracuje, i Gitcito odmawia jej usunięcia — proponuje poczekać i
spróbować ponownie. Starsze są proponowane do usunięcia, od najstarszej, a okno
mówi wprost, co sprawdzić przed zgodą: że żaden edytor, terminal ani inny klient
Gita nie pracuje teraz w tym repozytorium. Wyjęcie blokady spod żywego zapisu to
prosta droga do rozdartego indeksu.

Skanowanie obejmuje własny katalog git repozytorium i katalog wspólny, więc
blokady dowiązanego worktree też się znajdą. Podmoduły są pomijane — należą do
innego repozytorium i sprząta się je, otwierając je.

## Cofnij / ponów

Większość operacji odkłada wpis na stos cofnięć, więc <kbd>⌘Z</kbd> odwraca
ostatnią z nich wszędzie tam, gdzie git na to pozwala.

**Zobacz też:** [Co się zmieniło od](range-diff.md) · [Stashe](stashes.md)
