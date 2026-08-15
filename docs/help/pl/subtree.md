---
title: Subtree
category: Gałęzie i operacje na historii
order: 49
summary: Wciągnij inne repozytorium do katalogu tego — z plikami naprawdę obecnymi, bez ceremoniału podmodułów.
keywords: subtree git subtree biblioteka osadź prefiks split squash monorepo alternatywa dla podmodułu vendor embed submodule pull push
---

# Subtree

Subtree kopiuje inne repozytorium do katalogu twojego. Od tej pory pliki
**naprawdę tam są**: zwykły `git clone` je dostaje, `git checkout` przesuwa je
jak każdy inny plik, a nikt nie musi wiedzieć, że katalog przyszedł skądinąd.

I na tym polega cała różnica względem [podmodułu](lfs-sparse.md), który
przechowuje wyłącznie wskaźnik i potrzebuje `--recurse-submodules`, własnego
wypakowania i własnego odczepionego HEAD, żeby się w tym nie pogubić.

`⌘K` → **Subtree**.

![Wciągnięty katalog znaleziony w historii, ze źródłem, które Gitcito dla niego pamięta](../../screenshots/subtree.webp)

## Haczyk, o którym nikt nie wspomina

**Git nie zapisuje dla subtree żadnego manifestu.** Podmoduł ma `.gitmodules`,
wypisujący każdy adres i ścieżkę. Subtree nie ma nic — tylko stopkę
`git-subtree-dir:` na commicie, który wykonał import.

Repozytorium może więc zawierać subtree i nie dawać ci żadnego sposobu, żeby
sprawdzić, skąd ono przyszło. Gitcito robi, co może:

- Lista jest odkrywana z historii, przez czytanie tych stopek. Każde subtree
  dodane przez kogokolwiek i jakimkolwiek narzędziem się pojawia.
- **Repozytorium źródłowe i referencja** są pamiętane przez Gitcito,
  w konfiguracji gita tego repozytorium. Subtree odkryte z historii startuje
  z pustymi polami — wypełnij je raz, a od tej pory pull i push będą działać.

Zapamiętane wartości mieszkają pod `gitcito.subtree.*` w `.git/config`, więc
zostają przy repozytorium, ale nie podróżują do klonu. **Zapomnij** je czyści
i nie rusza niczego innego.

## Dodawanie

| Pole | Znaczenie |
|-------|---------|
| Katalog | Gdzie wyląduje, np. `vendor/parser`. Nie może jeszcze istnieć |
| Repozytorium źródłowe | Adres URL albo ścieżka na dysku |
| Gałąź lub tag | Co zaimportować |
| Squash | Wciągnij jako jeden commit zamiast całej historii |

**Zostaw Squash włączony**, chyba że masz powód. Bez niego każdy commit
biblioteki zostaje na zawsze wpleciony w twój log, a `git log` przestaje być
o twoim projekcie.

## Życie z tym

| Akcja | Co uruchamia |
|--------|--------------|
| **Pull** | `git subtree pull` — zmiany z upstreamu lądują jako merge do twojego katalogu |
| **Push** | `git subtree push` — twoje lokalne zmiany pod tym katalogiem wracają do źródła |
| **Split** | `git subtree split -b <branch>` — wyciąga własną historię katalogu do gałęzi, z plikami w jej korzeniu |

**Split** to ta akcja warta zapamiętania: zamienia wciągnięty katalog z powrotem
w historię samodzielnego repozytorium — i tak właśnie subtree przestaje być
subtree.

## Ograniczenia warte wiedzy

- **Push jest wolny.** Za każdym razem przelicza historię katalogu od zera. Na
  dużym repozytorium to sekundy do minut, a nie natychmiast, i Gitcito może
  jedynie na to czekać.
- **Pull to merge**, więc może wejść w konflikt jak każdy merge — lądujesz
  [w edytorze konfliktów](conflicts.md).
- **`git subtree` to skrypt z contrib**, nie wbudowane polecenie gita. Okrojona
  instalacja gita może go nie mieć; Gitcito mówi to wprost, zamiast podawać
  dalej „'subtree' is not a git command".
- **Zesquashowanej historii nie da się później od-squashować.** Tamte commity
  nigdy nie zostały zaimportowane.
- Gitcito nie zamienia podmodułu w subtree ani odwrotnie.

Zobacz też: [Merge i rebase](merging.md) · [Hydraulika z interfejsem](lfs-sparse.md)
