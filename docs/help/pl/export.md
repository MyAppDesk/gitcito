---
title: Bundle i archiwa
category: Synchronizacja i wiele repozytoriów
order: 58
summary: Repozytorium jako jeden plik, z którego git potrafi sklonować, albo drzewo jako zip, do którego otwarcia nikomu nie jest potrzebny git.
keywords: bundle git bundle archiwum zip tarball tar gz eksport offline usb e-mail przeniesienie air gap export-ignore gitattributes clone from file range
---

# Bundle i archiwa

Dwa sposoby na zamknięcie repozytorium w jednym pliku. Wyglądają na wymienne,
a nie są — i wybranie złego jest całym powodem, dla którego ta strona istnieje.

| | **Bundle** | **Archiwum** |
|---|---|---|
| Zawiera | Historię: commity, gałęzie, tagi | Pliki w jednym commicie |
| Otwierane przez | `git clone` / `git fetch` — to *jest* zdalne repozytorium | Dowolne narzędzie do rozpakowywania |
| Później | Możesz z niego znowu pobierać, mergować, pracować dalej | Nic. To migawka |
| Do czego | Przeniesienia pracy na maszynę bez sieci | „Wyślij mi źródła z v2.1" |

`⌘K` → **Spakuj repozytorium do bundle'a** albo **Wyeksportuj archiwum**.

![Pakowanie repozytorium do jednego pliku, z gotową opcją zakresu](../../screenshots/export.webp)

## Bundle

Bundle to odpowiedź gita na przepaść, której żadna sieć nie przekracza: maszynę
odciętą od sieci, pendrive'a, załącznik do e-maila, laptopa w samolocie. Strona
odbierająca uruchamia `git clone work.bundle myrepo` i dostaje prawdziwe
repozytorium, z twoją historią i twoimi gałęziami, które pobiera z tamtego pliku
tak, jakby był serwerem.

Trzy zakresy:

| Zakres | Co podróżuje | Rozmiar |
|-------|--------------|------|
| **Wszystko** | Każda gałąź i tag, pełna historia | Całe repozytorium |
| **Jedna gałąź albo tag** | Ta referencja i wszystko, co osiąga | Zwykle większość |
| **Zakres commitów** | Tylko to, co jest między dwoma końcami | Mało |

**Bundle z zakresu to łatka historii, nie repozytorium.** Zapisuje dalszy koniec
jako *wymaganie wstępne*: git odmawia otwarcia go w repozytorium, które nie ma
już tamtego commita, bo nie byłoby do czego doczepić nowych commitów. To
zachowanie właściwe i za pierwszym razem zaskakujące. Sięgnij po zakres wtedy,
gdy druga strona ma już twoją pracę do jakiegoś punktu — do taga, który
ostatnio dostała, albo do commita, od którego oboje się odbiliście.

### Odbieranie

**Zaimportuj bundle…** czyta plik, wypisuje, co zawiera, i od razu mówi, czy to
repozytorium potrafi go użyć — jeśli brakuje wymagań wstępnych, powie ile, a nie
wysypie się później słowami samego gita.

Zaimportowane referencje lądują pod **`bundle/…`**, w przestrzeni nazw
śledzącej zdalne. Nic lokalnego się nie rusza: żadna gałąź nie jest przesuwana
fast-forwardem, żadna praca nie jest nadpisywana. Potem sam merge'ujesz,
rebase'ujesz albo przełączasz się na `bundle/main` na własnych warunkach —
dokładnie tak, jak zrobiłbyś z gałęzią z dowolnego innego zdalnego.

Żeby zamiast tego założyć z bundle'a *nowe* repozytorium, sklonuj z pliku
w terminalu: `git clone work.bundle myrepo`. Gitcito importuje do otwartego
repozytorium; nie klonuje z pliku.

## Archiwa

`git archive` zapisuje drzewo w jednym commicie jako zip albo tarball. Bez
`.git`, bez historii, bez możliwości pobierania z niego — i o to właśnie chodzi,
gdy odbiorca ma dostać kod źródłowy, a nie repozytorium.

| Opcja | Co robi |
|--------|-------------|
| Referencja | Gałąź, tag albo commit do wyeksportowania. Tag to zwykle właściwa odpowiedź |
| Format | `zip`, `tar.gz` albo `tar` |
| Zawiń w katalog | Dodaje katalog najwyższego poziomu, żeby rozpakowanie nigdy nie rozsypało plików wszędzie |
| Tylko ta ścieżka | Eksportuje jeden podkatalog zamiast całego drzewa |

### export-ignore jest powodem, żeby z tego skorzystać

Repozytorium może oznaczyć ścieżki w `.gitattributes`:

```
.github/     export-ignore
test/        export-ignore
*.psd        export-ignore
```

Te ścieżki są **pomijane w każdym archiwum**, zostając jednocześnie
w repozytorium. Tak właśnie projekt wysyła tarball wydania bez swojej
konfiguracji CI, swoich fixture'ów i swoich 200 MB plików projektowych — z
regułą mieszkającą w repozytorium, a nie w czyimś skrypcie wydania.

## Ograniczenia warte wiedzy

- **Bundle to pełna kopia**, chyba że użyjesz zakresu. Spakowanie repozytorium
  na 2 GB zapisuje plik na 2 GB i trwa tyle, co klonowanie.
- **Puste bundle'e są odrzucane** przez gita, nie przez Gitcito: zakres, między
  którego końcami nic nie ma, produkuje błąd, a nie bezużyteczny plik.
- **Import nie merguje.** Referencje przychodzą pod `bundle/…` i tam zostają,
  dopóki czegoś z nimi nie zrobisz.
- **Archiwum nie ma historii**, więc nie da się go z powrotem zamienić
  w repozytorium. Jeśli odbiorca będzie musiał commitować, wyślij bundle.
- **`export-ignore` dotyczy wyłącznie archiwów.** Niczego nie ukrywa przed
  klonem, bundle'em ani historią — po tamto zajrzyj do
  [usuwania pliku z historii](history-purge.md).

Zobacz też: [Synchronizacja](syncing.md) · [Bezpieczne udostępnianie](secure-share.md) ·
[Usuwanie pliku z historii](history-purge.md)
