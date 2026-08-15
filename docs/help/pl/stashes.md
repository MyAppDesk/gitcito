---
title: Stashe
category: Synchronizacja i wiele repozytoriów
order: 52
summary: Stashe częściowe, przywracanie wybranych plików i stash → gałąź.
keywords: stash stashe częściowy keep-index apply pop drop nieśledzone gałąź untracked branch partial
---

# Stashe

Stashowanie w Gitcito nie jest na zasadzie wszystko albo nic.

| Akcja | Co robi |
|---|---|
| **Stash** | Wszystko, w tym pliki nieśledzone, jeśli chcesz, z wiadomością |
| **Stash częściowy** | Zaznacz tylko te pliki, które chcesz; opcjonalnie `--keep-index` |
| **Apply / Pop** | Cały stash albo **tylko niektóre jego pliki** |
| **Stash → gałąź** | `git stash branch` — wyjście awaryjne, gdy stash nie chce się czysto nałożyć |

Zaznaczenie stasha pokazuje jego pliki i diffy, dokładnie tak jak przy commicie.

![Stash częściowy: zaznacz tylko te pliki, które mają wejść](../../screenshots/stash-partial.webp)

## Kiedy stash nie chce się nałożyć

Jeśli nałożenie stasha zadeptałoby pliki nieśledzone, git staje. Gitcito
proponuje ich nadpisanie i ponowną próbę, zamiast zostawiać cię z wymyślaniem
zaklęcia.

Jeśli drzewo odjechało za daleko, **stash → gałąź** odtwarza gałąź, z której
stash został zdjęty, nakłada go tam czysto i usuwa stash.

## Nie mylić z migawkami

[Migawki WIP](recovery.md) są automatyczne i ukryte; stashe są świadome
i wypisane. Migawki nigdy nie ruszają twojej listy stashy.

**Zobacz też:** [Odzyskiwanie](recovery.md) · [Przechowalnia](staging.md)
