---
title: Commitowanie
category: Praca ze zmianami
order: 31
summary: Style wiadomości, szablony, współautorzy i linter.
keywords: commit wiadomość kompozytor szablon współautor linter amend conventional gitmoji ticket template co-author
---

# Commitowanie

## Style wiadomości

Wybierz jeden w Ustawieniach; kompozytor się do niego dostosuje.

| Styl | Wygląda tak |
|---|---|
| **Conventional** | `feat(api)!: add rate limiting` — z listą typów |
| **Gitmoji** | `✨ add rate limiting` — z wyborem emoji |
| **Ticket** | `ABC-123: add rate limiting` — zasiane z nazwy gałęzi |
| **Zwykły** · **Auto** | Cokolwiek napiszesz; Auto pozwala AI zdecydować o kształcie |
| **Jaskiniowiec** · **Haiku** | Dokładnie to, na co wyglądają |

![Kompozytor wypełniony z szablonu commita](../../screenshots/commit-template.webp)

## Co kompozytor robi za ciebie

- <kbd>↑</kbd> <kbd>↓</kbd> przywołuje twoje **ostatnie wiadomości**.
- **Wybór współautora** dodaje stopki `Co-authored-by:` na podstawie osób, które
  faktycznie współtworzyły to repozytorium.
- `commit.template` / `.gitmessage` **wypełnia** wiadomość wstępnie, z pominięciem
  linii komentarza.
- W trakcie merge'a, cherry-picka czy reverta wiadomość jest **wypełniona
  wstępnie** tak, jak zrobiłby to git.
- Szkice **zostają zapamiętane** dla każdego repozytorium z osobna, więc
  przełączenie karty nigdy nie gubi wiadomości.

## Linter

Sprawdzenie na żywo, które niczego nie blokuje: długość tematu (z licznikiem
znaków), kropka na końcu, temat nie w trybie rozkazującym albo z małej litery,
zbyt szerokie linie w treści. Podpowiedzi, nigdy bramka — nie powstrzyma cię
przed zacommitowaniem.

## Amend

Amend przepisuje ostatni commit tym, co jest w przechowalni. Gitcito pokazuje ci
najpierw istniejącą wiadomość, żebyś ją edytował, a nie przepisywał od nowa.

**Zobacz też:** [Przechowalnia](staging.md) · [Absorb](absorb.md) · [Generator changelogu](changelog.md)
