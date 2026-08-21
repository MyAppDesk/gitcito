---
title: Przechowalnia
category: Praca ze zmianami
order: 30
summary: Dodawaj do przechowalni całe pliki, pojedyncze hunki albo pojedyncze linie.
keywords: przechowalnia indeks hunk linie odrzuć staging stage unstage discard index partial
---

# Przechowalnia

Panel commita ma trzy listy: **W konflikcie**, **Poza przechowalnią**
i **W przechowalni**. Każda się zwija i każda pamięta, w jakim stanie ją
zostawiłeś.

![Diff poza przechowalnią, obok niego przyciski hunka i pliku](../../screenshots/line-staging.webp)

## Trzy poziomy precyzji

| Poziom | Jak |
|---|---|
| **Plik** | Kliknij ✚ w wierszu albo zaznacz kilka wierszy i dodaj je hurtem |
| **Hunk** | Otwórz diff i użyj przycisku w nagłówku hunka |
| **Linia** | Zaznacz linie wewnątrz diffa i dodaj dokładnie te |

To dodawanie po liniach sprawia, że da się w praktyce trzymać debugowe
`console.log` poza commitem, nie kasując go wcześniej.

## Odrzucanie

Odrzucanie działa na tych samych poziomach i zawsze pyta. Pliki nieśledzone są
kasowane; śledzone wracają do swojego stanu z przechowalni (albo z commita).

## Klawiatura

<kbd>↑</kbd> <kbd>↓</kbd> (albo <kbd>j</kbd> <kbd>k</kbd>) chodzą po listach
plików, <kbd>⇧</kbd> zaznacza zakres, a <kbd>⌘</kbd>/<kbd>Ctrl</kbd> przełącza
pojedyncze pliki.

<kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> rozszerza zaznaczenie od ostatnio
klikniętego wiersza. Kliknij zaznaczenie prawym przyciskiem, by za jednym razem
dodać do stage, usunąć ze stage, dodać do stasha albo odrzucić wszystko.

## Kopiowanie ścieżek

Kliknięcie prawym przyciskiem niezacommitowanego pliku daje **Kopiuj ścieżkę
pliku** (bezwzględną, ze znakami separatora platformy) oraz **Kopiuj względną
ścieżkę pliku** (`src/index.ts`, bez wiodącego `./`). Kilka zaznaczonych plików
kopiuje jedną ścieżkę na linię, w kolejności listy. Usunięte pliki pozostają
aktywne — te akcje kopiują tylko tekst. Foldery nadal kopiują ścieżkę folderu.

## Zanim zacommitujesz

Gitcito sprawdza kilka rzeczy i pyta raz, nigdy po cichu:

- plik, który wygląda na **sekret** (`.env`, `*.pem`, `id_rsa`…),
- **bardzo duży** blob (próg w Ustawienia → Bezpieczeństwo),
- commit **prosto na chronioną gałąź** (domyślnie `main`/`master`).

Każde z tych ostrzeżeń oferuje *Ignoruj i przestań śledzić* jednym kliknięciem.
Zobacz [Bezpieczeństwo i sekrety](security.md).

**Zobacz też:** [Commitowanie](committing.md) · [Diffy](diffs.md) · [Absorb](absorb.md)
