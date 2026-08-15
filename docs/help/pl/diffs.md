---
title: Diffy i podglądy
category: Czytanie zmian
order: 20
summary: Widok dzielony, podświetlanie na poziomie słów, diffy obrazów i podglądy plików.
keywords: diff widok dzielony obok siebie słowa białe znaki obraz podgląd markdown split side-by-side word level whitespace image preview docx pdf
---

# Diffy i podglądy

## Czytanie diffa

| Przełącznik | Co robi |
|---|---|
| **Ujednolicony ↔ dzielony** | Obok siebie, gdy chcesz porównywać; jeden pod drugim, gdy chcesz czytać |
| **Na poziomie słów** | Podświetla tylko zmienione tokeny wewnątrz edytowanej linii — na czerwono w starej, na zielono w nowej |
| **Ignoruj białe znaki** | Ukrywa zmiany wcięć, żeby na wierzch wypłynęła prawdziwa zmiana |
| <kbd>⌘F</kbd> | Szukaj wewnątrz diffa, z przechodzeniem do następnego/poprzedniego |

![Diff dzielony z podświetlaniem na poziomie słów](../../screenshots/split-diff.webp)

Nad każdym diffem siedzi [podsumowanie semantyczne](semantic-diff.md) — co się
zmieniło, symbol po symbolu, zamiast linia po linii.

## Diffy obrazów

Zmienione obrazy dostają prawdziwe porównanie: obok siebie albo z uchwytem, który
przeciągasz między „przed" a „po".

![Diff obrazu](../../screenshots/image-diff.webp)

## Podgląd czegokolwiek

Tryb **Podgląd** renderuje plik zamiast pokazywać jego źródło: Markdown, Word
(`.docx`), Excel (`.xlsx`), PDF, wideo, audio, obrazy — a dla całej reszty kod
z podświetlaniem składni.

![Podgląd Markdowna](../../screenshots/markdown-preview.webp)

## Zakładka Pliki

Zakładka **Pliki** w lewym panelu przegląda samo drzewo robocze, z plakietkami
statusu na katalogach (dodane / zmodyfikowane / usunięte), które agregują to, co
siedzi w środku.

![Zakładka plików z podglądem](../../screenshots/file-tree.webp)

![Plakietki na katalogach sumujące to, co zmieniło się w każdym z nich](../../screenshots/tree-badges.webp)

**Zobacz też:** [Diff semantyczny](semantic-diff.md) · [Przechowalnia](staging.md)
