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

Wybierz dowolny commit będący przodkiem `HEAD` — historia liniowa czy nie.
Modal pokazuje jego pliki i wiadomość; edytuj jedno lub drugie. Dalej dzieją
się dwie rzeczy:

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

## Merge w zakresie

![Edycja commita poniżej dwóch merge’y — kaskada je odtwarza](../../screenshots/commit-edit-merges.webp)

Merge między commitem a `HEAD` nie wyłącza już edycji. Kaskada odtwarza
merge, nakładając jego **zapisany wynik** — drzewo, które merge faktycznie
zacommitował, wraz z rozwiązaniami konfliktów — na przepisanego rodzica, więc
rozwiązania zrobione ręcznie przeżywają przepisanie co do joty. Bez rerere,
bez ponownego merge'owania, bez drzewa roboczego: to samo plumbing w pamięci
co reszta kaskady, a oba wskaźniki na rodziców są zachowane. Gałąź boczna,
która również zawiera edytowany commit, jest przepisywana i przekierowywana;
ta, która go nie zawiera, zachowuje swoją tożsamość nietkniętą. Baner w
modalu mówi, ile merge'ów niesie zakres, a kroki merge pokazują w podglądzie
ikonę merge.

Uczciwe zastrzeżenie: odtworzony merge jest tylko tak dobry jak jego zapisany
wynik. Jeśli twoja edycja koliduje z liniami, które rozwiązał sam merge,
podgląd robi się czerwony dokładnie jak każdy inny konfliktujący krok — nic
nie jest zgadywane.

## Gdy kaskada wchodzi w konflikt

Późniejszy commit dotknął tych samych linii, które edytujesz. Podgląd oznacza
ten commit na czerwono wraz z konfliktującymi plikami, a przepisanie odmawia
startu — nic nie jest nigdy zastosowane w połowie. Albo edytuj inaczej, albo
zmierz się z konfliktem wprost przez [rebase interaktywny](rebase.md).

## Ograniczenia

- **Commit musi być przodkiem `HEAD`.** Commit na niezmergowanej gałęzi
  bocznej nie ma ścieżki do twojej bieżącej gałęzi, po której dałoby się go
  odtworzyć.
- Pliki binarne i pliki powyżej 2 MB są pokazywane, ale nieedytowalne.
- Commit, który jest już na zdalnym repozytorium, można edytować, ale następny
  push będzie musiał być **force pushem** — modal ostrzega, zanim się na to
  zdecydujesz.
- Plików usuniętych w commicie nie da się edytować (nie ma treści do edycji).

**Zobacz też:** [Rebase interaktywny](rebase.md) · [Odzyskiwanie i reflog](recovery.md) · [Absorb](absorb.md)
