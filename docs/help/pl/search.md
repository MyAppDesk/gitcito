---
title: Paleta poleceń i wyszukiwanie
category: Repozytorium i historia
order: 11
summary: Skocz gdziekolwiek i przegrepuj drzewo albo historię.
keywords: paleta poleceń wyszukiwanie grep kod pickaxe znajdź rozmyte skok command palette search code find fuzzy jump
---

# Paleta poleceń i wyszukiwanie

## Paleta — <kbd>⌘K</kbd>

Rozmyty skok do **gałęzi** (przełącza na nią), **commita** (przewija do niego
graf), **pliku z drzewa roboczego** albo **akcji** — fetch, pull, push, stash,
terminal, reflog, ustawienia i każda funkcja z tego podręcznika.

Uczy się: to, czego używałeś ostatnio, idzie na początek, a to, czego używasz
często, bije to, czego nie używasz.

![Paleta poleceń](../../screenshots/command-palette.webp)

## Wyszukiwanie w kodzie — <kbd>⌘⇧F</kbd>

Dwa różne pytania, jedno okno:

| Tryb | Na jakie pytanie odpowiada |
|---|---|
| **Zawartość** | „Gdzie ten napis jest teraz?" — `git grep` po plikach śledzonych *i* nieśledzonych, z wielkością liter / całym słowem / wyrażeniem regularnym. |
| **Kilof po historii** | „Kiedy ten napis się pojawił albo zniknął?" — `git log -S` / `-G`. |

Trafienia wracają z podświetloną składnią i zaznaczonym dopasowaniem,
pogrupowane po plikach i rozwijalne do dokładnych linii. Kliknij jedno, żeby
otworzyć plik na tej linii, albo commit, który je wprowadził.

![Wyniki wyszukiwania w kodzie](../../screenshots/code-search.webp)

## Filtrowanie grafu

Pole wyszukiwania nad grafem filtruje commity po wiadomości, autorze, SHA albo
statusie wdrożenia. Po „tylko commity, które dotknęły tego pliku" sięgnij po
filtr ścieżki — zobacz [graf commitów](graph.md).

**Zobacz też:** [Graf commitów](graph.md) · [Klawiatura i skróty](keyboard.md)
