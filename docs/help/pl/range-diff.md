---
title: Co się zmieniło od
category: Czytanie zmian
order: 23
summary: Ktoś zrobił force push na gałęzi, którą recenzowałeś. Zobacz, co naprawdę się zmieniło.
keywords: range-diff force push rebase przepisana historia recenzja reflog interdiff wymuszona aktualizacja review rewritten forced update
---

# Co się zmieniło od

Zrecenzowałeś gałąź. Ktoś ją zrebase'ował i zrobił force push. Zwykły diff jest
teraz bezwartościowy: po rebasie każdy commit jest nowym commitem, więc wszystko
wygląda na nowe.

`git range-diff` paruje obie wersje commit po commicie, a Gitcito wyczytuje stare
pozycje prosto z **reflogu** — nic więc nie musiało być zawczasu nigdzie
zapisane, żeby to zadziałało.

![Przepisane, nowe i porzucone commity po force pushu](../../screenshots/range-diff.webp)

| Werdykt | Znaczenie |
|---|---|
| **Przepisany** | Ten sam commit, zmieniony. Rozwiń go, żeby zobaczyć interdiff — poprawkę w wiadomości i dodatkowe sprawdzenie, a nie cały plik. |
| **Nowy** | Doszedł, odkąd patrzyłeś. |
| **Porzucony** | Zniknął, odkąd patrzyłeś. |
| **Bez zmian** | Przetrwał przepisanie nietknięty. |

## Jak się tam dostać

- **Fetch, który natrafi na przepisaną historię, powie ci o tym.** Toast nazywa
  gałąź, a jej wiersz pod Zdalnymi dostaje **⟳**, które klikasz, żeby otworzyć
  porównanie dokładnie z commitem, na który wcześniej wskazywała.
- Kliknij dowolną gałąź prawym przyciskiem → *Co się zmieniło od…*
- <kbd>⌘K</kbd> → *Co się zmieniło od*

## Poprzednie pozycje

Chipy pod polami referencji to reflog gałęzi: wymuszone aktualizacje, rebase'y,
resety, każdy z informacją, kiedy się wydarzył. Wybierz któryś, a porównanie
przeliczy się względem niego. I to cała ta funkcja — historia tego, gdzie gałąź
bywała, i tak leży już na twoim dysku.

**Zobacz też:** [Radar konfliktów](conflict-radar.md) · [Odzyskiwanie i reflog](recovery.md)
