---
title: Klonowanie
category: Zacznij tutaj
order: 2
summary: Sklonuj z adresu URL albo prosto z hostingu — i zawęź to, co się ściąga, gdy repozytorium jest ogromne.
keywords: klonowanie sklonuj płytki częściowy filtr podmoduły monorepo clone shallow depth partial filter blob none single branch submodules recursive ls-remote unshallow
---

# Klonowanie

**Nowe repozytorium → Sklonuj** albo `⌘K` → *Sklonuj*. Wklej adres URL albo
zaloguj się do GitHuba, GitLaba, Bitbucketa czy Azure DevOps i wybierz z listy
własnych repozytoriów — do klonowania użyty zostanie token wybranego
[profilu](profiles.md), po czym zostanie porzucony i nigdy nie trafi do
`.git/config`.

Wskaż katalog nadrzędny i nazwę; linijka pod polami pokazuje dokładnie, gdzie
repozytorium wyląduje. Katalog, który już istnieje, zostanie odrzucony, a nie
scalony z klonem.

## Zaawansowane — zawężanie klonu

Wszystko w sekcji **Zaawansowane** jest domyślnie wyłączone: zostaw to w spokoju,
a dostaniesz zwykły, kompletny klon. Ta sekcja zarabia na siebie w
repozytoriach, w których „kompletny" oznacza dwadzieścia minut i kilka
gigabajtów.

![Okno klonowania z otwartą sekcją Zaawansowane: klon częściowy, płytki, jedna gałąź, podmoduły i wybór gałęzi](../../screenshots/clone-advanced.webp)

| Opcja | Co robi git | Ile to kosztuje |
|--------|---------------|---------------|
| **Klon częściowy** | `--filter=blob:none` | Pełna historia, bez zawartości plików. Bloby dociągają się na żądanie, więc otwarcie starego pliku wymaga sieci. |
| **Klon płytki** | `--depth=N` | Istnieje tylko N najnowszych commitów. Blame, log, bisect i range-diff kończą się na cięciu. |
| **Tylko jedna gałąź** | `--single-branch` | Pozostałe gałęzie zostają na zdalnym repozytorium, dopóki ich nie pobierzesz. |
| **Klonuj podmoduły** | `--recurse-submodules` | Każdy podmoduł też zostaje wypakowany — więcej czasu teraz, żadnych brakujących katalogów później. |
| **Gałąź do wypakowania** | `--branch <name>` | Zaczynasz na tej gałęzi zamiast na domyślnej gałęzi zdalnego repozytorium. |

**Częściowy przed płytkim.** Klon częściowy zachowuje każdy commit — historia
pozostaje przeszukiwalna, a leniwie dociągane są jedynie zawartości plików. Klon
płytki naprawdę odrzuca historię: `git log` kończy się na cięciu, a blame nie
widzi nic dalej. Jeśli klonujesz monorepo po to, żeby w nim pracować, zwykle
chodzi ci o klon częściowy.

Płytkość da się cofnąć: `git fetch --unshallow` w [terminalu](terminal.md)
uzupełnia historię z powrotem.

### Wybór gałęzi

Wpisz nazwę gałęzi albo naciśnij **Wypisz gałęzie**, żeby zapytać zdalne
repozytorium, co ma (`git ls-remote --heads`), i wybrać z listy. To jedna podróż
po sieci, wykonywana wyłącznie po naciśnięciu przycisku — nic nie jest odpytywane
w trakcie pisania.

Jeśli wypisanie się nie powiedzie — prywatny adres bez tokenu, literówka, brak
sieci — pole pozostaje zwykłym polem tekstowym, a samo klonowanie zgłosi
prawdziwy błąd.

### Dwie uwagi o flagach

- **`--depth` implikuje `--single-branch`.** Przy klonie płytkim pozostawienie
  *Tylko jedna gałąź* odznaczone jest właśnie tym, co upomina się o pozostałe
  gałęzie (`--no-single-branch`) — dlatego podpowiedź pod spodem się zmienia.
- **Klonowanie lokalnego katalogu** normalnie zupełnie ignoruje `--depth`,
  ponieważ git twardo linkuje magazyn obiektów zamiast go pobierać. Gitcito
  klonuje przez adres `file://`, gdy prosisz o płytką kopię lokalnego
  repozytorium — tak, żeby głębokość, o którą poprosiłeś, była głębokością,
  którą dostaniesz.

## Postęp

Pasek raportuje to, co raportuje git: zliczanie, kompresowanie, odbieranie,
rozwiązywanie, wypakowywanie. Etap, który nie potrafi podać sumy, pokazuje pasek
nieokreślony zamiast zmyślonego procentu.

Nowe repozytorium otwiera się w karcie, przypięte do profilu, którym zostało
sklonowane.
