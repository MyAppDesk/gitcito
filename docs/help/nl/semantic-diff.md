---
title: Semantische diff
category: Wijzigingen lezen
order: 21
summary: Wat er veranderde, symbool voor symbool — hernoemingen, handtekeningwijzigingen, verplaatsingen.
keywords: semantische diff semantic ast tree-sitter hernoemen rename signature handtekening verplaatst moved symbolen wat veranderde
---

# Semantische diff

Een zuivere hernoeming ziet er in een regeldiff uit als een heel bestand
verwijderd en een heel bestand toegevoegd. Dat is technisch waar en volslagen
nutteloos.

Boven elke bestandsdiff toont Gitcito een strook **Wat er veranderde**: beide
versies van het bestand worden geparseerd met **tree-sitter** — echte
syntaxbomen, geen reguliere expressies — en hun declaraties worden aan elkaar
gekoppeld.

![De wat-er-veranderde-strook: hernoemingen en handtekeningwijzigingen, symbool voor symbool](../../screenshots/semantic-diff.webp)

| Oordeel | Voorbeeld |
|---|---|
| **Hernoemd** | `startServer` → `bootServer` |
| **Handtekening** | `open(path)` → `open(path, mode)` |
| **Toegevoegd** / **Verwijderd** | een nieuwe functie; een verwijderde |
| **Verplaatst** | dezelfde code, 40 regels lager |
| **Gewijzigd** | zelfde naam en handtekening, andere body |

Hernoemingen en handtekeningwijzigingen staan bovenaan — dat is wat een reviewer
niet mag missen. Klik een rij aan om naar dat symbool in de diff te springen.

## Wat het kan parseren

TypeScript, TSX, JavaScript, Python, Go, Rust, Java, C, C++, C#, Ruby, PHP,
Swift, Kotlin, Scala, Lua, Bash en Zig.

Een bestand waarvan de taal geen grammatica heeft houdt gewoon zijn normale
regeldiff — de strook verschijnt dan helemaal niet. Hetzelfde geldt voor
bestanden boven de 400 KB.

## Eerlijke grenzen

- Een hernoeming waarvan ook de body veranderde wordt als hernoeming gemeld
  **en** zegt dat erbij.
- Twee functies van één regel die toevallig op elkaar lijken worden *niet*
  gekoppeld: onder een zekere grootte moet de match bijna exact zijn, dus je
  krijgt een nette verwijderd + toegevoegd in plaats van een verzonnen
  hernoeming.
- Symbolen die alleen een paar regels opschuiven omdat iets erboven groeide
  worden niet als "verplaatst" gemeld — dat zou de echte verplaatsingen
  bedelven.

**Zie ook:** [Diffweergave](diffs.md) · [Wat er veranderd is sinds](range-diff.md)
