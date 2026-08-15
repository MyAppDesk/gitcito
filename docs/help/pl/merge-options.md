---
title: Opcje merge'a
category: Gałęzie i operacje na historii
order: 45
summary: Przełączniki git merge na merge'e, które psują się za każdym razem tak samo — -X ours, białe znaki, squash, subtree.
keywords: opcje merge strategia białe znaki squash podmoduł strategy -X ours theirs ignore-space-change whitespace no-ff ff-only no-commit subtree resolve ort recursive log --merge why conflict
---

# Opcje merge'a

Zwykły merge to jeden przycisk i najczęściej na tym historia się kończy. Ta
strona jest o tych pozostałych razach: o pliku lock, który gryzie się przy
każdym merge'u, o pliku, któremu ktoś zmienił wcięcia, o wciągniętym projekcie,
którego ścieżki się nie zgadzają. Git ma przełączniki na wszystkie trzy od lat;
są tylko zagrzebane w manualu, którego nikt nie otwiera w środku konfliktu.

Kliknij gałąź prawym przyciskiem → **Merge z opcjami…** — w wierszach gałęzi
i zdalnych w panelu bocznym *oraz* na kolorowych plakietkach referencji w grafie,
które dzielą jeden blok menu — albo `⌘K` → **Merge z opcjami**.

![Opcje merge'a, z dokładnym poleceniem gita wypisanym pod spodem](../../screenshots/merge-options.webp)

Polecenie jest wypisywane w miarę, jak je składasz. Jest tam po to, żeby dało
się je zestawić z manualem — i żeby następnym razem odpalić je z terminala, bez
tego okna.

## Kiedy hunk wchodzi w konflikt

| Wybór | Flaga | Oznacza |
|--------|------|-------|
| Zatrzymaj się i zapytaj | — | Domyślne. Rozwiązujesz sam |
| Zostaw stronę tej gałęzi | `-X ours` | Gryzące się hunki rozwiązują się na to, co już jest wypakowane |
| Weź stronę przychodzącą | `-X theirs` | Gryzące się hunki rozwiązują się na gałąź, która przychodzi |

**`-X ours` to nie `-s ours`.** Ten przełącznik decyduje wyłącznie o hunkach,
które faktycznie się gryzą; każda inna zmiana z drugiej gałęzi merguje się
normalnie. Strategia o nazwie `ours` — której Gitcito nie oferuje — bierze twoje
drzewo w całości i wyrzuca drugą stronę, produkując commit scalający, który
twierdzi, że zawiera pracę, której nie zawiera. To rozróżnienie jest
najczęściej opacznie rozumianą rzeczą w merge'ach gita.

**Nie da się nim rozstrzygnąć wszystkiego.** Konflikt zmiana/usunięcie — jedna
strona edytowała plik, druga go skasowała — nie jest hunkiem treści i `-X`
zostawia go tobie. I słusznie: nie istnieje żadna wersja „preferuj nasze", która
odpowiadałaby na pytanie, czy usunięty plik ma wrócić.

## Białe znaki

| Wybór | Flaga |
|--------|------|
| Ignoruj zmiany w istniejących białych znakach | `-X ignore-space-change` |
| Ignoruj białe znaki całkowicie | `-X ignore-space-at-eol`, `-X ignore-all-space` |

Przypadek, dla którego to istnieje: jedna gałąź zmieniła wcięcia w pliku (albo
zrobił to formatter), druga edytowała te same linie. Git widzi dwie zmiany
w jednej linii i staje. Przy ignorowanych białych znakach zmiana wcięć nie jest
zmianą do zważenia, a prawdziwa edycja przechodzi przez merge.

Wynik zachowuje białe znaki *drugiej* strony w liniach, których dotknęła, więc
przepuszczenie formattera po fakcie nie jest złym pomysłem.

## Co zapisać

| Wybór | Flaga | Zostawia cię z |
|--------|------|-----------------|
| Fast-forward, kiedy się da | — | Commitem scalającym tylko wtedy, gdy historia się rozeszła |
| Zawsze twórz commit scalający | `--no-ff` | Commitem scalającym nawet przy fast-forwardzie, więc gałąź na zawsze widać w grafie |
| Tylko fast-forward, inaczej odmów | `--ff-only` | Niczym, jeśli potrzebny byłby prawdziwy merge. Przydatne jako kontrola |
| Squash | `--squash` | Zmianami w przechowalni, bez zapisanego merge'a, z commitem do napisania przez ciebie |
| Zmerguj, ale nie commituj | `--no-commit` | Merge'em w przechowalni i w toku, żebyś mógł go najpierw obejrzeć albo poprawić |

**Squash i `--no-commit` to nie to samo.** Squash zapomina, że merge w ogóle się
wydarzył: git nie zapisuje drugiego rodzica, a gałąź następnym razem będzie
wyglądać na niezmergowaną. `--no-commit` to merge w toku, który po prostu na
ciebie czeka — `MERGE_HEAD` jest ustawiony, a commit kończy go normalnie.

**`--ff-only` nie zawodzi po cichu.** Jeśli potrzebny byłby commit scalający,
git odmawia i nic się nie rusza — i to właśnie czyni z niego dobre sprawdzenie
zdrowego rozsądku przed zeskryptowanym merge'em.

## Strategia

| Strategia | Do czego |
|----------|-----|
| Domyślna (`ort`) | Do wszystkiego. Nowoczesny trójstronny merge gita |
| `subtree` | Obie strony mieszkają pod różnymi ścieżkami — projekt wciągnięty do podkatalogu tego repozytorium |
| `resolve` | Stary trójstronny merge. Czasem udaje mu się tam, gdzie `ort` poddaje się na historii krzyżowej |

`-s subtree` to ta warta zapamiętania. Merge aktualizacji z projektu, który
siedzi w `vendor/parser/`, w przeciwnym razie wyglądałby jak „każdy plik
usunięty, każdy plik dodany"; strategia subtree najpierw wylicza przesunięcie
ścieżek. Cały przepływ pracy opisują [subtree](subtree.md).

## Dlaczego to jest w konflikcie

Wewnątrz [edytora konfliktów](conflicts.md) jest przycisk **Dlaczego to jest
w konflikcie**. Uruchamia `git log --merge` dla pliku, który masz przed sobą,
i wypisuje — dla każdej strony osobno — commity, które go dotknęły, odkąd
gałęzie się rozeszły.

![Commity z każdej strony, które dotknęły pliku w konflikcie](../../screenshots/conflict-why.webp)

Znaczniki konfliktu mówią, *co* się gryzie. To mówi, *kto to zmienił, kiedy
i po co* — a to zwykle jest pytanie, które faktycznie przesądza o rozwiązaniu,
i powód, żeby pójść kogoś zapytać, zanim wybierze się stronę.

Jeśli nic nie pokazuje, żadna ze stron nie zacommitowała zmiany dokładnie w tym
pliku: kolizja bierze się ze zmiany nazwy albo przeniesienia katalogu wyżej.

## Ograniczenia warte wiedzy

- **Opcje dotyczą jednego merge'a.** Nie są zapamiętywane i nie zmieniają
  zwykłego wpisu **Zmerguj do bieżącej** ani menu przeciągnij-i-upuść.
- **Cofnij nadal działa**: merge z opcjami zapisuje ten sam wpis cofnięcia,
  który resetuje do `ORIG_HEAD`.
- **Merge'e ośmiornicowe** (więcej niż dwie gałęzie naraz) nie są tutaj
  oferowane.
- **Wpisy „Zmerguj X do Y" w menu commita** pozostają zwykłymi merge'ami. Kiedy
  chcesz opcji, użyj samej plakietki referencji.
- **`-X` decyduje po cichu.** Nic nie oznacza, które hunki zostały rozwiązane
  automatycznie, więc przy ważnym merge'u przeczytaj potem diff, zamiast ufać
  brakowi konfliktów.

Zobacz też: [Merge i rebase](merging.md) · [Konflikty](conflicts.md) ·
[Subtree](subtree.md) · [Radar konfliktów](conflict-radar.md)
