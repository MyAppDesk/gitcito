---
title: Edytuj dowolny commit
category: Gałęzie i operacje na historii
order: 46
summary: Przepisz pliki lub wiadomość historycznego commita w miejscu — z podglądem kaskady, zanim cokolwiek się zmieni.
keywords: edytuj commit przepisz historię popraw literówkę zmień wiadomość kaskada odtwarzanie rebase w miejscu chirurgia edit commit rewrite history amend past reword fix typo cascade replay
---

# Edytuj dowolny commit

Literówka siedzi w commicie sprzed trzech tygodni. Zwykła naprawa to rebase
interaktywny: zatrzymaj się na commicie, edytuj, kontynuuj, módl się. Naprawa
w Gitcito: kliknij commit prawym przyciskiem, **Edytuj ten commit**, zmień
tekst, gotowe. Przycisk pióra w panelu szczegółów commita otwiera ten sam
edytor.

![Edycja historycznego commita](../../screenshots/commit-edit.webp)

## Co robi

Wybierz dowolny commit na liniowej ścieżce do `HEAD`. Modal pokazuje jego pliki
i wiadomość; edytuj jedno lub drugie. Dalej dzieją się dwie rzeczy:

1. **Podgląd kaskady** odtwarza każdy commit powyżej edytowanego *w pamięci*
   (łańcuch cherry-picków przez `merge-tree` — bez checkoutu, bez drzewa
   roboczego, bez referencji). Każdy potomek pokazuje się na zielono lub
   czerwono, więc **zanim cokolwiek się ruszy** wiesz, czy edycja przechodzi
   czysto, czy koliduje z późniejszą zmianą.
2. **Przepisz historię** robi to naprawdę: ten sam łańcuch jest budowany
   poleceniami plumbing, a potem gałąź przesuwa się przez `reset --keep` —
   twoje niezacommitowane zmiany są przenoszone, albo reset się przerywa i nic
   się nie stało. Najpierw wykonywana jest [migawka strażnika](recovery.md),
   a cofnięcie przywraca stary łańcuch.

Autorstwo i daty każdego odtworzonego commita są zachowane; zmieniają się tylko
hashe — na tym właśnie polega przepisywanie historii.

## Gdy kaskada wchodzi w konflikt

Późniejszy commit dotknął tych samych linii, które edytujesz. Podgląd oznacza
ten commit na czerwono wraz z konfliktującymi plikami, a przepisanie odmawia
startu — nic nie jest nigdy zastosowane w połowie. Albo edytuj inaczej, albo
zmierz się z konfliktem wprost przez [rebase interaktywny](rebase.md).

## Ograniczenia

- **Tylko liniowa historia.** Merge między commitem a `HEAD` wyłącza edycję —
  odtwarzanie merge'ów to inny, trudniejszy problem.
- Pliki binarne i pliki powyżej 2 MB są pokazywane, ale nieedytowalne.
- Commit, który jest już na zdalnym repozytorium, można edytować, ale następny
  push będzie musiał być **force pushem** — modal ostrzega, zanim się na to
  zdecydujesz.
- Plików usuniętych w commicie nie da się edytować (nie ma treści do edycji).

**Zobacz też:** [Rebase interaktywny](rebase.md) · [Odzyskiwanie i reflog](recovery.md) · [Absorb](absorb.md)
