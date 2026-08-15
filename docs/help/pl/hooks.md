---
title: Hooki i .gitignore
category: Narzędzia środowiska pracy
order: 92
summary: Zarządzaj hookami gita i ignoruj pliki bez ręcznej edycji.
keywords: hooki hooks pre-commit husky core.hooksPath gitignore ignoruj przestań śledzić untrack
---

# Hooki i .gitignore

## Hooki

Wypisz każdy hook w repozytorium, zobacz, które są prawdziwe, a które to wciąż
`.sample`, i włączaj je, wyłączaj, edytuj albo twórz.

![Menedżer hooków](../../screenshots/hooks.webp)

Gitcito wykrywa własne **`core.hooksPath`** (husky i spółka) oraz konfigurację
**frameworku pre-commit** i mówi ci, kiedy hooki mieszkają gdzie indziej niż
w `.git/hooks` — w przeciwnym razie edytowałbyś plik, którego git nigdy nie
uruchamia.

> Hooki uruchamiają się dla commitów Gitcito dokładnie tak samo, jak dla
> `git commit`. Hook, który zawiedzie, blokuje commit, a jego wyjście wraca
> w błędzie.

## Sprytny .gitignore

Kliknij plik prawym przyciskiem → **Ignoruj** i wybierz:

| Wybór | Zapisuje |
|---|---|
| Ten plik | `path/to/file.log` |
| Wszystkie `*.ext` | `*.log` |
| Cały katalog | `path/to/folder/` |

![Okno wyboru reguły .gitignore](../../screenshots/gitignore-chooser.webp)

Reguła trafia do `.gitignore` **najbliższego katalogu** albo do korzenia
repozytorium, z podglądem linii na żywo, zanim się na nią zdecydujesz. Pliki już
śledzone dostają w tym samym oknie **Ignoruj i przestań śledzić**.

**Zobacz też:** [Bezpieczeństwo i sekrety](security.md) · [Przechowalnia](staging.md)
