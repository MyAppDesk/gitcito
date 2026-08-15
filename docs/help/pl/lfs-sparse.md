---
title: LFS, sparse-checkout i łatki
category: Synchronizacja i wiele repozytoriów
order: 55
summary: Duże pliki, częściowe wypakowania i przenoszenie zmian jako plików.
keywords: lfs duże pliki sparse checkout cone klon częściowy łatka patch large file storage partial clone am apply
---

# LFS, sparse-checkout i łatki

## Git LFS

![Menedżer LFS](../../screenshots/lfs.webp)

Wykrywa, czy `git-lfs` jest zainstalowany, czy to repozytorium z niego korzysta
i które wzorce są śledzone. Lista plików pokazuje, co jest **pobrane**, a co
wciąż jest **wskaźnikiem** — i stamtąd możesz zrobić pull albo przyciąć.

## Sparse-checkout

![Sparse-checkout w trybie cone](../../screenshots/sparse-checkout.webp)

Tryb cone: zaznacz katalogi najwyższego poziomu, w których faktycznie pracujesz,
a reszta opuszcza twoje drzewo robocze, zostając w historii. Przydatne
w monorepo, w którym odpowiadasz tylko za dwa pakiety.

**Klon częściowy** (`--filter=blob:none`) jest oferowany przy klonowaniu, żebyś
nie ściągał blobów, których nigdy nie otworzysz.

## Łatki

- **Wyeksportuj** commit (albo zaznaczenie wielu) jako `.patch`.
- **Nałóż** łatkę na drzewo robocze (`git apply`) albo jako commit (`git am`).

Jedno i drugie z menu Narzędzia.

**Zobacz też:** [Worktree i podmoduły](worktrees.md)
