---
title: Pasek menu
category: Zacznij tutaj
order: 5
summary: Co zawierają menu Gitcito w macOS i dlaczego Windows oraz Linux nie mają paska menu.
keywords: pasek menu menu aplikacja plik edycja widok okno pomoc repozytorium macos natywne o programie zakończ
---

# Pasek menu

Pasek menu odpowiada na pytanie, na które żadna inna powierzchnia nie odpowiada
dobrze: *co ta aplikacja w ogóle potrafi?* [Paleta poleceń](search.md) jest
szybsza, gdy już wiesz, czego szukasz, a [ściąga](keyboard.md) wymienia
klawisze — ale po żadnej z nich się nie przegląda. Po menu tak.

Wszystko, co się w nich znajduje, jest osiągalne również z wnętrza okna. Nic nie
istnieje wyłącznie w menu, i to celowo: funkcja żyjąca tylko w menu to funkcja,
której użytkownicy Windowsa i Linuksa nie mają.

## Co gdzie leży

| Menu | Zawiera |
|---|---|
| **Gitcito** | O programie, sprawdzanie aktualizacji, [Ustawienia](repo-settings.md), standardowe pozycje ukrywania i wyjścia |
| **Plik** | Nowa karta, otwarcie lub [sklonowanie](cloning.md) repozytorium, otwórz ostatnie, zamykanie i przywracanie kart |
| **Edycja** | Wytnij, kopiuj, wklej, cofnij — edycja tekstu, którą klawiatura już wykonuje — plus [wyszukiwanie w kodzie](search.md) |
| **Widok** | Paleta poleceń, przełączniki panelu bocznego i prawego, [terminal](terminal.md), [mission control](mission-control.md), [sejf](vault.md), powiększenie |
| **Repozytorium** | Fetch, pull, push, commit, stash, nowa gałąź, [pull request](hosting.md), cofnij, pokaż w Finderze, ustawienia repozytorium |
| **Okno** | Minimalizuj, powiększ, przenieś wszystko na wierzch |
| **Pomoc** | Ten podręcznik, ściąga, nowości, licencje, zgłoszenie problemu |

Menu Repozytorium jest w całości wyszarzone, gdy aktywna karta nie jest
repozytorium git, a **Cofnij** jest wyszarzone, gdy nie ma czego cofać — menu to
czytelne podsumowanie tego, na co aplikacja w tej chwili pozwala.

## Skróty pokazane, nie przejęte

Klawisze obok każdej pozycji to te, które faktycznie przypisałeś. Zmień
przypisanie <kbd>⌘K</kbd> w Ustawieniach, a menu Widok to pokaże.

Działa to, ponieważ menu *wyświetla* te kombinacje, nie zgłaszając do nich
pretensji: obsługą klawiatury nadal steruje sam Gitcito, dzięki czemu skrót może
zachować się inaczej w zależności od tego, gdzie stoi kursor. Jedyne, czego w
ten sposób nie da się pokazać, to skrót, którego Gitcito nie posiada —
<kbd>⌘F</kbd> należy do czytanego pliku lub diffa, więc żadna pozycja menu go
nie zajmuje.

## Ograniczenia

- **Tylko macOS.** W Windows i Linuksie okno nie ma ramki — pasek tytułu rysuje
  sam Gitcito i pasek menu nie ma gdzie się zmieścić. Tam te same polecenia
  prowadzą przez [paletę poleceń](search.md) i [skróty
  klawiaturowe](keyboard.md).
- **Przeładuj i Narzędzia deweloperskie pojawiają się tylko w kompilacjach
  deweloperskich.** Przeładowanie wyrzuca stan każdej otwartej karty, a to nie
  jest coś, co wydana wersja powinna oferować obok pozycji Powiększ.
- **Otwórz ostatnie pokazuje najwyżej dziesięć repozytoriów**, od najnowszego, i
  korzysta z tej samej listy co [ekran powitalny](getting-started.md).
- **Przywróć zamkniętą kartę nigdy nie jest wyszarzone.** Stos zamkniętych kart
  żyje tylko przez sesję i menu go nie widzi; wybranie pozycji, gdy nie ma czego
  przywracać, nic nie robi.
