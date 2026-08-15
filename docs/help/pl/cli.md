---
title: Wiersz poleceń
category: Narzędzia środowiska pracy
order: 93
summary: `gitcito .` — jak `code .`, tylko dla Gita.
keywords: cli wiersz poleceń terminal shim path instalacja otwórz katalog jedna instancja install open folder single instance
---

# Wiersz poleceń

```sh
gitcito .                        # open this folder
gitcito ~/code/api               # …or that one
gitcito . -n "My API"            # with a display name
gitcito . -g "Work"              # inside a group tab
gitcito . -n "My API" -g "Work"  # both
```

## Instalowanie shima

Paleta poleceń (<kbd>⌘K</kbd>) → **Zainstaluj polecenie 'gitcito' w PATH**
(macOS). Podlinkowuje symbolicznie mały shim do `/usr/local/bin` albo
`/opt/homebrew/bin`, prosząc o uprawnienia administratora tylko wtedy, gdy
żaden z nich nie jest dla ciebie zapisywalny. Uruchom to samo polecenie
ponownie, żeby odinstalować.

## Jak się zachowuje

- Jeśli ścieżka jest **już otwarta** — jako karta albo wewnątrz grupy — Gitcito
  **przenosi na nią fokus**, zamiast otwierać duplikat.
- Jeśli to jeszcze nie repozytorium Gita, i tak się otworzy, proponując
  przepływ „zainicjuj tutaj repozytorium".
- `-g` dodaje repozytorium do grupy o tej nazwie, tworząc ją, jeśli nie
  istnieje.
- Gitcito działa **w jednej instancji**: uruchomienie `gitcito` przy otwartej
  aplikacji przekazuje żądanie tamtemu oknu, zamiast odpalać drugą kopię.

**Zobacz też:** [Przestrzenie, karty i grupy](workspaces.md)
