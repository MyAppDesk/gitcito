---
title: Absorb
category: Praca ze zmianami
order: 33
summary: Odeślij każdą poprawkę z przechowalni do commita, który wprowadził daną linię.
keywords: absorb fixup autosquash amend przechowalnia hunki blame recenzja poprawki staged review fixes
---

# Absorb

Poprawiłeś trzy uwagi z recenzji w trzech plikach. Uczciwe rozwiązanie to trzy
commity `fixup!` wycelowane we właściwych rodziców. To, co ludzie faktycznie
robią, to jeden commit o nazwie „poprawki z recenzji".

Absorb robi za ciebie tę uczciwą rzecz.

![Absorb kierujący każdy hunk z przechowalni do commita, który go wprowadził](../../screenshots/absorb.webp)

## Jak to działa

1. Dodaj poprawki do przechowalni.
2. Narzędzia → **Wchłoń zmiany z przechowalni…** (albo <kbd>⌘K</kbd>).
3. Gitcito robi blame na liniach, których dotyka każdy hunk z przechowalni,
   znajduje, który z **twoich niewypchniętych commitów** je wprowadził,
   i pokazuje ci plan, zanim cokolwiek zrobi.

Plan wypisuje każdy commit docelowy razem z hunkami, które do niego zmierzają,
plus grupę **Jeszcze do niczego nie należy** — zupełnie nowy plik nie ma
historii, do której dałoby się go wchłonąć, więc zostaje w przechowalni, żebyś
zacommitował go normalnie.

| Przycisk | Co się dzieje |
|---|---|
| **Utwórz fixupy** | Jeden commit `fixup!` na cel. Nic nie jest rebase'owane. |
| **Utwórz fixupy i zrebase'uj** | To samo, a potem rebase z autosquashem wtapia je w historię. |

## Reguły, których się trzyma

- **Kandydatami są wyłącznie niewypchnięte commity.** Cokolwiek już
  opublikowane, nie jest nasze do przepisywania. Jeśli wszystko jest wypchnięte,
  absorb mówi to wprost i nic nie robi.
- **Drzewo robocze nigdy nie jest ruszane.** Tylko indeks i commity, które
  absorb sam tworzy.
- **Porażka nie zostawia bałaganu.** Jeśli którykolwiek krok się nie powiedzie,
  HEAD i indeks wracają dokładnie tam, gdzie były.
- Odmawia działania w trakcie merge'a albo rebase'a — ten indeks należy do gita.

**Zobacz też:** [Rebase interaktywny](rebase.md) · [Przechowalnia](staging.md)
