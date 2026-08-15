---
title: Podgląd pull requesta
category: Synchronizacja i wiele repozytoriów
order: 57
summary: Uruchom cudzy pull request na swojej maszynie, nie commitując niczego — na dowolnym hostingu, także dla PR-ów z forków.
keywords: podgląd pull request merge request PR MR fork lokalnie przetestuj wypróbuj refs/pull refs/merge-requests pull-requests zdalna gałąź check out locally test remote branch
---

# Podgląd pull requesta

Przeczytanie diffa w przeglądarce mówi ci, czy kod dobrze się czyta. Nie mówi
ci, czy aplikacja nadal się uruchamia. Żeby się tego dowiedzieć, musisz
uruchomić tę gałąź — i tutaj ludzie utykają, bo pull request z forka mieszka
w repozytorium, którego nigdy nie klonowałeś i do którego często nie możesz
pushować.

Podgląd lokalny rozwiązuje to faktem, którego większość ludzi nigdy nie musi
poznać: hostingi publikują czubek każdego pull requesta jako zwykłą referencję
gita **w repozytorium docelowym**. Fork nie musi być osiągalny, nie potrzebujesz
tokenu API i nie dodaje się drugiego zdalnego. Jeden fetch i kod jest na twoim
dysku.

![Podgląd lokalny: wybierz zdalne, pull requesta i sposób jego nałożenia](../../screenshots/pr-preview.webp)

| Hosting | Gdzie mieszka czubek PR-a |
|------|-------------------------|
| GitHub, GitHub Enterprise, Gitea, Forgejo, Gogs | `refs/pull/<n>/head` |
| GitLab (chmura i self-hosted) | `refs/merge-requests/<n>/head` |
| Bitbucket Cloud, Bitbucket Server | `refs/pull-requests/<n>/from` |
| Azure DevOps | `refs/pull/<n>/merge` |

Gitcito sonduje wszystkie cztery jednym `ls-remote`, więc nieznany albo
samodzielnie utrzymywany hosting zadziała, o ile trzyma się jednej z tych
konwencji.

## Otwieranie

- Lista pull requestów w panelu bocznym — przycisk ze strzałką przy dowolnym
  wpisie. Działa dla każdego hostingu, w przeciwieństwie do widoku
  szczegółowego, który jest tylko dla GitHuba.
- Paleta poleceń: **Podejrzyj pull requesta lokalnie**.
- Wewnątrz widoku szczegółowego pull requesta, obok przycisku „otwórz
  w przeglądarce".

## Co mu podajesz

**Zdalne** — repozytorium, *przeciwko* któremu pull request został otwarty,
zwykle `origin`. Nie fork.

**Pull request** — numer albo wklejony adres z przeglądarki. `7`, `#7`
i `https://github.com/owner/repo/pull/7` działają tak samo; podobnie kształty
adresów GitLaba, Bitbucketa i Azure DevOps. Naciśnij **Znajdź**, a Gitcito
poinformuje o referencji, którą rozwiązał, i commicie, na który ona wskazuje —
zanim cokolwiek zostanie pobrane.

**Zdalna gałąź** — druga zakładka, na wypadek gdy nie ma referencji PR-a do
znalezienia: hostingu, który ich nie publikuje, albo gałęzi, którą po prostu
chcesz wypróbować. Podaj nazwę gałęzi taką, jaka jest na zdalnym repozytorium.

## Dwa sposoby nałożenia

Żaden nie zapisuje commita. To celowe — podgląd, od którego nie da się odejść,
nie jest podglądem.

| Tryb | Co się dzieje | Jak to cofnąć |
|------|--------------|-----------------|
| **Lokalna gałąź** | Referencja jest pobierana na własną gałąź (domyślnie `pr/7`) i wypakowywana. Twoje pozostałe gałęzie zostają nietknięte. | Cofnij wraca do gałęzi, na której byłeś, i kasuje gałąź podglądu. |
| **Niezacommitowany merge** | Referencja jest mergowana do bieżącej gałęzi przez `--no-commit --no-ff`, zostawiając połączone drzewo w przechowalni, żebyś mógł je zbudować i przetestować. | Cofnij przerywa merge. |

Podglądnięcie tego samego pull requesta po raz drugi używa ponownie tej samej
gałęzi, przesuwając ją na nowy czubek — przydatne, gdy autor wypycha poprawkę
w trakcie twoich testów. Kiedy ta gałąź już istnieje, Gitcito mówi o tym i pyta
przed jej zresetowaniem, bo każdy commit, który żyje tylko tam, przepadłby.

## Czego nie zrobi

- **Nie wymyśli referencji, której hosting nie publikuje.** Niektóre
  konfiguracje self-hosted wyłączają referencje PR-ów; niektóre hostingi nigdy
  ich nie miały. Dostajesz czytelne „brak referencji dla #n" i zakładkę zdalnej
  gałęzi jako drogę wyjścia.
- **Nie pobiera tagów.** Podgląd nie powinien wciągać cudzej przestrzeni nazw
  tagów do twojego repozytorium.
- **Tryb merge'a wymaga czystego drzewa roboczego.** Git odmawia mergowania na
  niezacommitowaną pracę; najpierw zrób [stash](stashes.md).
- **Podgląd to nie recenzja.** Kładzie kod na twojej maszynie — niczego nie
  zatwierdza, nie komentuje ani nie merguje. Od tego jest
  [hosting i pull requesty](hosting.md).
- **Prywatne forki zostają prywatne.** Referencję PR-a serwuje repozytorium
  docelowe, więc dostęp idzie za twoimi poświadczeniami do *tamtego* zdalnego —
  zobacz [bezpieczeństwo](security.md).

## Sprzątanie

Gałąź podglądu jest zwykłą gałęzią: skasuj ją z panelu bocznego, gdy skończysz,
albo naciśnij cofnij zaraz po podglądzie. Niezacommitowany merge podglądu da się
porzucić przez cofnij albo rozwiązać i zacommitować, jeśli jednak zdecydowałeś,
że go chcesz — w tym momencie przestaje być podglądem, a staje się
[merge'em](merging.md).
