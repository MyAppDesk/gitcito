---
title: Zakładki
category: Narzędzia przestrzeni roboczej
order: 94
summary: Zapamiętane miejsca w kodzie, które przeżywają zmiany w pliku.
keywords: zakładka zakładki oznacz linia notatka miejsce kod nawigacja panel boczny przesunięte zgubione fragment
---

# Zakładki

Miejsce, do którego chcesz wrócić: linia, w której siedzi błąd, funkcja w połowie
zmiany nazwy, rzecz do usunięcia, gdy refactor wyląduje. Kliknij prawym na linię
w podglądzie pliku i wybierz **Dodaj zakładkę do tej linii**; pojawi się na pasku
bocznym, a kliknięcie zabierze cię z powrotem.

![Zakładki na pasku bocznym](../../screenshots/bookmarks.webp)

Zakładki są prywatne dla tej maszyny i tego repozytorium. Nic nie trafia do repo:
nie da się ich zacommitować ani wypchnąć, nikt inny ich nie zobaczy — dokładnie
jak [zadania](todos.md).

## Linia się przesuwa. Na tym polega cały problem.

`cart.ts:42` psuje się w chwili, gdy ktoś wstawi linię wyżej, a zakładka, która po
cichu otwiera złą linię, jest gorsza niż brak zakładki. Dlatego obok numeru
zapisywany jest **tekst** linii, a otwarcie szuka jej na nowo:

1. zapamiętana linia, jeśli wciąż ma ten tekst;
2. w przeciwnym razie najbliższa linia o tym samym tekście — najbliższa, żeby
   linia powtórzona w całym pliku trafiła na kopię najbliższą dawnego miejsca;
3. dalej najbliższa linia pasująca z pominięciem białych znaków, co przeżywa
   zmianę wcięć;
4. a jeśli i tego nie ma, mówi, że **linia zniknęła**, i otwiera tam, gdzie była,
   zamiast zgadywać.

Gdy się przesunie, zakładka się leczy: zapisywany jest nowy numer, więc następne
otwarcie startuje z właściwego miejsca. **Notatkę** dodasz z menu kontekstowego —
bez niej etykietą jest sam tekst linii.

## Ograniczenia

- **Zakładka wskazuje na drzewo robocze**, nie na commit. Podąża za twoimi
  zmianami; nie cofa się przez historię.
- **Przepisany plik traci swoje zakładki.** Jeśli ani dokładnego tekstu, ani jego
  formy bez białych znaków nie ma w promieniu kilkuset linii, nie zostaje nic
  uczciwego, na co można wskazać.
- **Zmiana nazwy pliku psuje jego zakładki.** Kluczem jest ścieżka; git wykryje
  rename w diffie, ale zakładka nie jest częścią diffa.
- **Pusta linia nie ma tekstu do odnalezienia** — jej zakładka wisi tylko na
  numerze.

**Zobacz też:** [Zadania](todos.md) · [Problemy](problems.md)
