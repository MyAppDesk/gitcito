---
title: Rebase interaktywny
category: Gałęzie i operacje na historii
order: 42
summary: Przestawiaj, squashuj, rób fixup, zmieniaj wiadomości, edytuj albo porzucaj — przeciąganiem.
keywords: rebase interaktywny squash fixup reword drop edit autosquash todo przestaw
---

# Rebase interaktywny

Lista todo z `git rebase -i` jako lista, którą da się przeciągać.

![Edytor rebase'a interaktywnego](../../screenshots/interactive-rebase.webp)

| Akcja | Oznacza |
|---|---|
| **pick** | Zostaw tak, jak jest |
| **reword** | Zostaw zmianę, zmień wiadomość |
| **squash** | Wtop w commit powyżej, scalając obie wiadomości |
| **fixup** | Wtop w commit powyżej, wyrzuć tę wiadomość |
| **edit** | Zatrzymaj się tutaj, żebyś mógł zrobić amend |
| **drop** | Wyrzuć commit |

Przeciągaj wiersze, żeby zmienić kolejność. Edytor nigdy nie otwiera się
w terminalu — Gitcito pisze listę todo za ciebie.

## Autosquash jednym kliknięciem

- **Zrób fixup ze zmian w przechowalni do tego commita** tworzy za ciebie
  `fixup!`.
- **Autosquash od tego miejsca** wtapia każdy `fixup!` / `squash!` w jego cel.

Jeśli masz stertę poprawek z recenzji, a nie jedną, [absorb](absorb.md)
wyliczy, do którego commita należy każdy hunk, żebyś nie musiał tego robić sam.

> Rebase przepisuje historię. Cokolwiek już wypchnięte, będzie wymagało force
> pusha, a ten, kto to recenzował, zechce zobaczyć
> [co się zmieniło od](range-diff.md).

**Zobacz też:** [Absorb](absorb.md) · [Co się zmieniło od](range-diff.md) · [Odzyskiwanie](recovery.md)
