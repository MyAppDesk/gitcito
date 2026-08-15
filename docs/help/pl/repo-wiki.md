---
title: Wiki repozytorium (AI)
category: AI
order: 81
summary: Wygenerowany przewodnik po bazie kodu, w którym każde twierdzenie cytuje plik.
keywords: wiki dokumentacja generowana baza kodu przegląd zależności architektura eksport docs documentation codebase overview dependencies
---

# Wiki repozytorium

Wskaż mu repozytorium, a napisze krótkie wiki wyjaśniające bazę kodu.

## Karta repozytorium

- **Rozbicie na języki** według bajtów.
- **Stos technologiczny** — frameworki pokazane jako plakietki (Next, Angular,
  Electron, Tailwind, Django…).
- **Zależności** czytane prosto z twoich manifestów (`package.json`,
  `Cargo.toml`, `go.mod`, `pyproject.toml`, `pubspec.yaml`, `Gemfile`…)
  i pogrupowane według roli architektonicznej. Rusztowanie — stuby typów,
  loadery, wtyczki lintera — jest najpierw odfiltrowywane, a pojawić się mogą
  wyłącznie pakiety, które projekt naprawdę deklaruje.
- **Graf zależności modułów**, sparsowany ze źródeł (JS/TS, Python, Go, Rust,
  Dart, Ruby, C/C++, PHP) i rozwiązany względem plików samego repozytorium, więc
  import pakietu nigdy nie staje się fałszywą krawędzią.

## Pisane strony

Gitcito planuje kilka stron na podstawie plików, które repozytorium śledzi —
najpierw dokumentacja i manifesty, potem to, co najbardziej się kręci — i pisze
każdą stronę z plików, które ona obejmuje.

**Każde stwierdzenie cytuje plik, z którego wyszło**, a twierdzenie, którego
żaden plik nie potwierdza, zostaje odrzucone, a nie opublikowane. Strony są
pisane równolegle i zapisywane za jednym zamachem, więc nieudany przebieg nigdy
nie zastępuje dobrego wiki. Aplikacja mówi ci, gdy wiki zostało napisane na
starszym commicie.

## Eksport

**Eksportuj do docs/** zapisuje całość do `docs/wiki/` jako powiązany Markdown —
więc da się to zacommitować, zrecenzować w PR-ze i przeczytać na twoim hostingu.

Pliki wyglądające na sekrety nigdy nie są wysyłane.

**Zobacz też:** [Funkcje AI](ai.md)
