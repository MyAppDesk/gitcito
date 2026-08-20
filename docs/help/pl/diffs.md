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
| **Zawijanie** (tylko widok podzielony) | Zawija długie wiersze w ich kolumnie zamiast je przewijać |
| **Powiązane** (podzielony, bez zawijania) | Przewija obie połowy razem, w pionie i w poziomie — wyłączone, każda kolumna osobno |
| <kbd>⌘F</kbd> | Szukaj wewnątrz diffa, z przechodzeniem do następnego/poprzedniego |

Zawijanie jest domyślnie wyłączone: jeden wiersz zajmuje jeden rząd, więc obie
strony pozostają porównywalne rząd po rzędzie, a każda połowa przewija się w
poziomie własnym paskiem. Włącz je, gdy wolisz przeczytać długi wiersz, niż go
gonić — kosztem tego, że wiersz zawinięty na trzy rzędy nie stoi już naprzeciw
swojego odpowiednika. Każdy przełącznik pamięta swój stan między plikami i
sesjami.

Bez zawijania obie połowy przewijają się domyślnie **powiązane** — w pionie, co
trzyma wiersze naprzeciw siebie, i w poziomie, więc kolumna 90 po lewej stoi
nad kolumną 90 po prawej. Rozłącz je, gdy strony się rozjechały — blok z
wcięciem naprzeciw bloku bez wcięcia, zmiana nazwy, która przesunęła każdy
wiersz — albo gdy chcesz porównać dwa odległe fragmenty tego samego pliku, i
zaparkuj każdą połowę tam, gdzie jest jej treść.

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

## Bardzo duże pliki

Podglądy i widok pliku wczytują plik w całości do pamięci, więc oba odmawiają
otwarcia plików powyżej limitu rozmiaru (32 MB dla podglądów, 16 MB dla
tekstu) i zamiast tego pokazują, jak duży jest plik. **Wczytaj mimo to** znosi
limit dla tego jednego pliku — nic nie jest niedostępne, duże wczytania są po
prostu dobrowolne. Pliki i diffy powyżej kilku tysięcy wierszy nadal renderują
się w całości, ale wiersze przewinięte poza widok nie są już układane ani
malowane, więc gigantyczny diff lockfile'a przestaje kosztować pamięć całego
laptopa.

![Plik powyżej limitu rozmiaru, z opcją Wczytaj mimo to](../../screenshots/file-too-large.webp)

## Zakładka Pliki

Zakładka **Pliki** w lewym panelu przegląda samo drzewo robocze, z plakietkami
statusu na katalogach (dodane / zmodyfikowane / usunięte), które agregują to, co
siedzi w środku.

![Zakładka plików z podglądem](../../screenshots/file-tree.webp)

![Plakietki na katalogach sumujące to, co zmieniło się w każdym z nich](../../screenshots/tree-badges.webp)

**Zobacz też:** [Diff semantyczny](semantic-diff.md) · [Przechowalnia](staging.md)
