---
title: Zewnętrzne narzędzia diff i merge
category: Gałęzie i operacje na historii
order: 43
summary: Przekaż plik do Kaleidoscope, Beyond Compare, Meld albo czegokolwiek już używasz — Gitcito czyta własną listę gita.
keywords: difftool mergetool zewnętrzne narzędzie diff merge kaleidoscope beyond compare meld kdiff3 p4merge araxis opendiff filemerge vimdiff winmerge diff.tool merge.tool orig kopia zapasowa
---

# Zewnętrzne narzędzia diff i merge

[Przeglądarka diffów](diffs.md) Gitcito i
[trzypanelowy edytor konfliktów](conflicts.md) radzą sobie z większością dni.
Niektórych dni nie: wygenerowany plik na 4000 linii, merge, przy którym musisz
widzieć cztery kolumny naraz, albo po prostu narzędzie, którego używasz od
dekady i czytasz szybciej niż jakiekolwiek nowe.

**Ustawienia → Ogólne → Zewnętrzne narzędzia diff i merge.**

## To lista gita, nie nasza

Gitcito nie prowadzi żadnej własnej tabeli. Listy rozwijane to
`git difftool --tool-help` i `git mergetool --tool-help` — i dlatego właśnie:

- Narzędzia, które git już znalazł na twojej maszynie, są wypisane pierwsze; te,
  które zna, ale ich nie znajduje, idą dalej, oznaczone jako *niezainstalowane*.
- **Własne narzędzie działa bez żadnego dodatkowego wsparcia.** Jeśli masz

  ```sh
  git config --global difftool.mine.cmd 'mycompare "$LOCAL" "$REMOTE"'
  ```

  to `mine` pojawi się na liście jak każde wbudowane.
- Twoje wybory zapisują się do **`diff.tool` i `merge.tool` w twojej globalnej
  konfiguracji gita** — tych samych kluczy, które czyta twój terminal. Ustaw je
  tutaj, a `git difftool` w wierszu poleceń zachowa się tak samo. Ustaw je tam,
  a Gitcito je podchwyci.

Git zna z pudełka mniej więcej trzydzieści narzędzi, w tym Kaleidoscope, Beyond
Compare, Meld, KDiff3, P4Merge, Araxis, DiffMerge, WinMerge, FileMerge, VS Code
i rodzinę vima.

## Gdzie pojawiają się akcje

| Miejsce | Akcja |
|---------|--------|
| Zmieniony plik w [kompozytorze commita](committing.md) | **Diff w \<narzędziu\>** — drzewo robocze względem indeksu |
| [Edytor konfliktów](conflicts.md) | **Merge w \<narzędziu\>** — pełny trójstronny merge |

Oba wpisy pojawiają się tylko wtedy, gdy narzędzie jest faktycznie
skonfigurowane; nieskonfigurowane `git difftool` po prostu by się wysypało,
a martwy przycisk jest gorszy niż brak przycisku.

## Co się dzieje, gdy narzędzie jest otwarte

Gitcito czeka na jego zamknięcie. To celowe — `git mergetool` dodaje rozwiązany
plik do przechowalni dopiero *po* wyjściu z narzędzia, więc dopiero wtedy jest
prawdziwy wynik do zaraportowania — i dlatego przycisk pokazuje kręciołek zamiast
wracać natychmiast.

Reszta aplikacji zostaje responsywna: to działa poza blokadą per repozytorium,
która szereguje normalne operacje gita, więc narzędzie merge zostawione otwarte
na czas obiadu nie zamraża karty za nim.

Kiedy zewnętrzny merge się powiedzie, git sam dodaje plik do przechowalni,
a Gitcito zamyka edytor i odświeża. Jeśli zamkniesz narzędzie bez zapisania, git
powie o tym i nic się nie zmieni.

## Plik `.orig`

`git mergetool` domyślnie zostawia obok rozwiązanego pliku kopię `<file>.orig` —
to zachowanie gita, nie Gitcito. Przełącznik w Ustawieniach zapisuje
`mergetool.keepBackup`; wyłącz go, a rozwiązany plik nie zostawi po sobie
niczego.

## Ograniczenia

- **Tylko diffy drzewa roboczego.** Wpis w kompozytorze porównuje to, co masz
  teraz, z indeksem. Porównywanie dwóch historycznych commitów zewnętrznie nie
  jest podpięte — do tego służy wbudowana [przeglądarka diffów](diffs.md) albo
  [porównanie](merging.md).
- **Jeden plik naraz.** Nie ma przemiatania w stylu „zrób diff każdego
  zmienionego pliku".
- **Gitcito niczego nie instaluje.** Narzędzie oznaczone jako
  *niezainstalowane* pozostaje wybieralne, bo git może je znaleźć po tym, jak je
  zainstalujesz — ale do tego czasu będzie się wysypywać.
