---
title: Dostępność
category: Dostosuj do siebie
order: 78
summary: Obsługa czytnika ekranu i klawiatury — co jest objęte, a co jeszcze nie.
keywords: dostępność accessibility a11y czytnik ekranu VoiceOver NVDA nawigacja klawiaturą fokus aria kontrast ograniczony ruch
---

# Dostępność

Gitcito ma dać się obsłużyć bez myszy i być czytelny dla czytnika ekranu. Ta
strona mówi, co to znaczy konkretnie — i gdzie są granice.

## Klawiatura

- **Karty, wiersze panelu bocznego, listy plików i menu paska narzędzi**
  można fokusować i aktywować Enterem lub Space. Przyciski dzielone
  (pull/push/stash) udostępniają strzałkę rozwijania jako osobny element
  przyjmujący fokus.
- **Graf commitów** to jeden przystanek fokusu: sfokusuj go i chodź po
  historii strzałkami góra/dół (albo j/k). Wybrany commit jest odczytywany z
  tematem, autorem i pozycją. Shift+F10 (albo klawisz menu) otwiera menu
  kontekstowe wybranego commita.
- **Menu kontekstowe** otwierają się z fokusem: strzałki przesuwają, Enter
  aktywuje, ArrowRight/ArrowLeft wchodzą do podmenu i z nich wychodzą,
  Escape zamyka.
- **Okna dialogowe** zatrzymują Tab w środku, po zamknięciu oddają fokus
  tam, gdzie był, i zamykają się Escape.
- **Paleta poleceń** (Cmd/Ctrl+K) to combobox: wyniki są odczytywane w
  trakcie pisania i przy przechodzeniu strzałkami.

## Czytniki ekranu

- Każde okno dialogowe jest zapowiadane swoim tytułem. Toasty — kanał
  informacji zwrotnej aplikacji — to regiony na żywo: sukcesy zgłaszają się
  grzecznie, błędy przerywają.
- Postęp (klonowanie, pobieranie aktualizacji) jest widoczny jako pasek
  postępu z procentem, a stany zajętości („Pobieranie…”) zapowiadają się
  same.
- Status pliku jest wypowiadany („Dodany”, „Zmodyfikowany”, „W konflikcie”),
  a nie tylko pokazywany kolorowym znakiem.
- Okno ma strukturę z landmarkami (banner, main, panel boczny, pasek stanu),
  więc nawigacja po landmarkach działa.

## Granice, powiedziane wprost

- **Terminal** to xterm.js i dziedziczy jego relację z czytnikami ekranu,
  która jest słaba. Traktuj go jako powierzchnię dla widzących; każda
  operacja gita, którą oferuje, istnieje też jako akcja w UI.
- **Cosmos (historia 3D), tory grafu commitów i diffy obrazów** są wizualne
  z natury. Dane pod spodem — lista commitów, listy plików — są dostępne;
  sam obraz nie.
- **Przeciąganie** (zmiana kolejności kroków interaktywnego rebase,
  przeciąganie gałęzi do merge'a) jest tylko dla wskaźnika tam, gdzie to
  zaznaczono; każda akcja przeciągania ma odpowiednik w menu albo w
  przycisku.
- Audyt stojący za tą stroną zrobiono VoiceOverem na macOS. NVDA/JAWS na
  Windows powinny zachowywać się tak samo, ale nie zostały sprawdzone w
  praktyce — zgłoszenia są mile widziane jako
  [issues](https://github.com/MyAppDesk/gitcito/issues).

## Powiązane ustawienia

**Ograniczenie ruchu** jest honorowane z ustawienia systemowego — animacje
zapadają się do natychmiastowych przejść. Kontrast motywu można dostroić dla
każdego motywu w [Ustawienia → Wygląd](themes.md).
