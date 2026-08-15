---
title: Blame i historia pliku
category: Czytanie zmian
order: 22
summary: Kto napisał tę linię, kiedy i jak wyglądała wcześniej.
keywords: blame historia pliku linia autor adnotacja winowajca history file line author annotate reblame follow
---

# Blame i historia pliku

Otwórz dowolny plik i przełącz tryb widoku: **Podgląd · Plik · Diff · Blame ·
Historia**.

![Blame, z commitem stojącym za każdą linią na marginesie](../../screenshots/blame.webp)

## Blame

Każda linia niesie swój commit, autora i datę, pokolorowane według commita, więc
bloki wspólnej historii widać na pierwszy rzut oka.

- **Idź za linią do diffa**: skocz z linii blame prosto do zmiany, która ją
  wyprodukowała.
- **Blame sprzed tego commita**: kliknij linię prawym przyciskiem, żeby zrobić
  blame na pliku w stanie *sprzed* tego commita — tak właśnie idzie się wstecz
  po historii linii, nie opuszczając widoku.

## Historia

Każdy commit, który dotknął tego pliku, od najnowszego. Wybranie któregoś
pokazuje wersję pliku z tego commita, więc możesz przekartkować to, jak plik
rósł.

![Każdy commit, który dotknął jednego pliku, od najnowszego](../../screenshots/file-history.webp)

Dla całego repozytorium, a nie jednego pliku, użyj
[wehikułu czasu](time-machine.md).

## Najedź, żeby dostać wyjaśnienie

Przy włączonym AI przytrzymanie <kbd>⇧</kbd> (klawisz konfigurowalny albo w ogóle
żaden) i wskazanie identyfikatora daje jednolinijkowe wyjaśnienie, czym on jest,
plus linie, na których się opiera — kliknij jedną, żeby tam skoczyć. Model czyta
wyłącznie ponumerowane okno wokół tokenu, więc gdy coś jest zdefiniowane gdzie
indziej, mówi o tym, zamiast to zmyślać. Zobacz [funkcje AI](ai.md).

**Zobacz też:** [Graf commitów](graph.md) · [Diffy](diffs.md)
