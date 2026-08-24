---
title: Worktree i podmoduły
category: Synchronizacja i wiele repozytoriów
order: 54
summary: Kilka wypakowań jednego repozytorium; oraz repozytoria wewnątrz repozytoriów.
keywords: worktree worktrees podmoduł podmoduły drzewo robocze submodule submodules linked checkout init sync
---

# Worktree i podmoduły

## Worktree

Worktree to drugie wypakowanie tego samego repozytorium, we własnym katalogu —
możesz więc popatrzeć na `main`, a `feature/x` zostaje dokładnie tak, jak je
zostawiłeś, bez stashowania.

- Twórz i usuwaj worktree z panelu bocznego. **Dwuklik** otwiera dany worktree
  jako własną kartę; prawy przycisk daje *Otwórz worktree*, *Pokaż w folderze*
  i usunięcie.
- Kliknij dowolną lokalną gałąź prawym przyciskiem → **Otwórz w worktree**, żeby
  postawić je w katalogu obok i otworzyć jako kartę.
- Gałąź mieszka naraz tylko w jednym worktree, więc przełączenie się na gałąź,
  którą trzyma inny worktree, nie może się udać — git odmawia komunikatem
  *already used by worktree at …*. Gitcito zamiast tego cię tam zabiera: menu
  gałęzi mówi *Przejdź do `x` w jej worktree*, a dwuklik na wierszu otwiera kartę
  tego worktree, zamiast się wywalić.

![Sekcje worktree i podmodułów w panelu bocznym, obie wypełnione](../../screenshots/worktrees.webp)

## Podmoduły

Dodawaj, aktualizuj (init i checkout), synchronizuj adresy i usuwaj podmoduły,
z żywym statusem dla każdego:

| Status | Oznacza |
|---|---|
| **Zsynchronizowany** | Wypakowany na commicie, który zapisuje rodzic |
| **Zmodyfikowany** | Wypakowany gdzie indziej albo brudny |
| **Niezainicjowany** | Zapisany, ale nigdy niewypakowany |

![Podmoduły ze swoim statusem, po jednym wierszu na każdy](../../screenshots/submodule-states.webp)

**Zobacz też:** [LFS i sparse-checkout](lfs-sparse.md) · [Fetch, pull i push](syncing.md)
