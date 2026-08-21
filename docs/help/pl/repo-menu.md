---
title: Menu kontekstowe repozytorium
category: Zacznij tutaj
order: 4
summary: Kliknij prawym przyciskiem dowolny chip lub kartę repozytorium, żeby dostać alias, worktree, GitHub, terminal i usuwanie.
keywords: menu kontekstowe prawy przycisk alias worktree github terminal pokaż edytor usuń karta repozytorium context menu right-click reveal editor remove repository tab
---

# Menu kontekstowe repozytorium

Kliknij repozytorium prawym przyciskiem — samodzielną kartę, chip wewnątrz
grupy, chip w zagnieżdżonym folderze, wiersz na liście powitalnej/w launcherze
albo wiersz w rozwijanej liście repozytoriów na pasku narzędzi — a dostaniesz
to samo menu dotyczące repozytorium. Sam chip grupy nadal otwiera menu grupy;
kliknięcie musi trafić w repozytorium.

![Menu kontekstowe repozytorium na chipie w grupie](../../screenshots/repo-context-menu.webp)

Rozwijana lista repozytoriów na pasku narzędzi wymienia każde otwarte
repozytorium, tak samo jak lista gałęzi wymienia gałęzie. Kliknij wiersz lewym
przyciskiem, żeby się na niego przełączyć. Kliknij wiersz prawym przyciskiem
(albo samą pastylkę bieżącego repozytorium), żeby dostać alias, worktree,
GitHub, terminal, pokazanie w menedżerze plików, edytor i usuwanie. **Otwórz
repozytorium…** na dole otwiera launcher.

![Kliknięcie prawym przyciskiem wiersza w rozwijanej liście repozytoriów na pasku narzędzi](../../screenshots/repo-dropdown-context-menu.webp)

## Co robi każda akcja

| Akcja | Efekt |
|---|---|
| **Utwórz alias…** / **Zmień alias…** | Tylko nazwa wyświetlana. Gitcito nigdy nie zmienia nazwy folderu na dysku ani go nie przenosi. Ten sam alias podąża za repozytorium przez karty, grupy i przestrzenie robocze. |
| **Usuń alias** | Widoczne, gdy alias istnieje. Przywraca nazwę folderu. |
| **Pokaż worktree** | Ustawia fokus na tym repozytorium i otwiera sekcję worktree w panelu bocznym. |
| **Nowe worktree…** | Ten sam dialog tworzenia worktree co z gałęzi. Nieaktywne, gdy ścieżka nie istnieje albo trwa merge/cherry-pick/rebase/revert. |
| **Kopiuj nazwę repozytorium** | Kopiuje kanoniczną nazwę folderu, nie alias. |
| **Kopiuj ścieżkę repozytorium** | Kopiuje ścieżkę bezwzględną. |
| **Zobacz na GitHubie** | Origin, jeśli to github.com, w przeciwnym razie pierwszy dający się sparsować zdalny GitHub. Nieaktywne, gdy żadnego nie da się wyprowadzić. |
| **Otwórz w terminalu** | Otwiera terminal Gitcito z tym repozytorium jako katalogiem roboczym. |
| **Pokaż w Finderze / Eksploratorze plików** | Podświetla folder repozytorium w systemowym menedżerze plików. |
| **Otwórz w edytorze zewnętrznym** | Edytor skonfigurowany w Ustawieniach. Widoczne, ale nieaktywne, dopóki żaden nie jest ustawiony. |
| **Usuń…** | Zamyka kartę albo wyrzuca chip z grupy. Używa tego samego ostrzeżenia o niezacommitowanej pracy co przycisk **×**. Nigdy nie kasuje plików z dysku. |

Brakująca lub nieprawidłowa ścieżka zostawia dostępne kopiowanie, alias
i usuwanie, a wyszarza wszystko, co otwierałoby lub przeglądało katalog.

**Zobacz też:** [Przestrzenie, karty i grupy](workspaces.md) · [Worktree i podmoduły](worktrees.md) · [Zewnętrzny edytor](editor.md) · [Wbudowany terminal](terminal.md)
