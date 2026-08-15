---
title: Diff semantyczny
category: Czytanie zmian
order: 21
summary: Co się zmieniło, symbol po symbolu — zmiany nazw, zmiany sygnatur, przeniesienia.
keywords: diff semantyczny symbole zmiana nazwy sygnatura przeniesienie semantic ast tree-sitter rename signature moved what changed
---

# Diff semantyczny

Czysta zmiana nazwy w diffie liniowym wygląda jak usunięcie całego pliku
i dodanie całego pliku. To technicznie prawda i kompletnie bezużyteczne.

Nad każdym diffem pliku Gitcito pokazuje pasek **Co się zmieniło**: obie wersje
pliku są parsowane przez **tree-sitter** — prawdziwe drzewa składniowe, nie
wyrażenia regularne — a ich deklaracje są ze sobą zestawiane.

![Pasek „co się zmieniło": zmiany nazw i sygnatur, symbol po symbolu](../../screenshots/semantic-diff.webp)

| Werdykt | Przykład |
|---|---|
| **Zmieniona nazwa** | `startServer` → `bootServer` |
| **Sygnatura** | `open(path)` → `open(path, mode)` |
| **Dodane** / **Usunięte** | nowa funkcja; skasowana funkcja |
| **Przeniesione** | ten sam kod, 40 linii niżej |
| **Zmienione** | ta sama nazwa i sygnatura, inne ciało |

Zmiany nazw i sygnatur sortują się na początku — to właśnie ich recenzent nie
może przeoczyć. Kliknij wiersz, żeby skoczyć do tego symbolu w diffie.

## Co potrafi sparsować

TypeScript, TSX, JavaScript, Python, Go, Rust, Java, C, C++, C#, Ruby, PHP,
Swift, Kotlin, Scala, Lua, Bash i Zig.

Plik w języku, dla którego nie ma gramatyki, po prostu zachowuje swój zwykły
diff liniowy — pasek w ogóle się nie pojawia. Tak samo dla plików powyżej 400 KB.

## Uczciwe ograniczenia

- Zmiana nazwy, w której zmieniło się także ciało, jest raportowana jako zmiana
  nazwy **i** mówi o tym wprost.
- Dwie jednolinijkowe funkcje, które przypadkiem wyglądają podobnie, *nie*
  zostaną sparowane: poniżej progu wielkości dopasowanie musi być niemal
  dokładne, więc dostaniesz czyste usunięcie + dodanie zamiast fikcyjnej zmiany
  nazwy.
- Symbole, które przesunęły się o kilka linii tylko dlatego, że coś nad nimi
  urosło, nie są raportowane jako „przeniesione" — to pogrzebałoby prawdziwe
  przeniesienia.

**Zobacz też:** [Przeglądarka diffów](diffs.md) · [Co się zmieniło od](range-diff.md)
