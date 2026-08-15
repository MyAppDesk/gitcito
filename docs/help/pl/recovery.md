---
title: Odzyskiwanie i reflog
category: Odzyskiwanie i ochrona
order: 60
summary: Siatka bezpieczeństwa: reflog, migawki WIP i bisect.
keywords: reflog odzyskiwanie cofnij zgubione commity migawki wip bisect skrypt kod wyjścia hard reset recovery undo lost snapshots run automated
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
robi jej migawki: twoje zmiany w śledzonych plikach plus indeks z przechowalni,
uchwycone jako commit `git stash create` przypięty pod `refs/gitcito/wip`.

![Migawki WIP](../../screenshots/snapshots.webp)

- **Nigdy nie rusza twojego drzewa roboczego** i **nigdy nie pojawia się na
  twojej liście stashy** — to ukryta referencja, a nie stash.
- Zrób migawkę ręcznie albo pozwól jej chodzić co **5 / 15 / 30 minut**.
- Przywróć albo usuń dowolną migawkę z listy.

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

## Cofnij / ponów

Większość operacji odkłada wpis na stos cofnięć, więc <kbd>⌘Z</kbd> odwraca
ostatnią z nich wszędzie tam, gdzie git na to pozwala.

**Zobacz też:** [Co się zmieniło od](range-diff.md) · [Stashe](stashes.md)
