---
title: Zadania
category: Narzędzia środowiska pracy
order: 97
summary: Prywatna lista dla każdego repozytorium, widoczna na pasku bocznym i na pasku stanu.
keywords: todo zadanie zadania lista checklista notatka notatki przypomnienie priorytet
---

# Zadania

Połowa notatek programisty ma jedną linijkę i żyje jedno popołudnie: *zmienić
nazwę tej zmiennej przed PR-em*, *ścieżka fikstury jest zła*, *zapytać o limit
ponowień*. System zgłoszeń jest do tego za ciężki, plik z brudnopisem trafia
przypadkiem do commita, a karteczka przestaje istnieć w chwili zmiany
repozytorium.

Zadania to właśnie ta lista, przypięta do repozytorium, w którym stoisz.

![Lista zadań z jednym otwartym wpisem, jego notatkami i priorytetem](../../screenshots/todos.webp)

## Gdzie mieszkają

Nigdzie w twoim repozytorium. Zadanie zapisuje się razem z ustawieniami samego
Gitcito, kluczowane ścieżką repozytorium — a z tego wynikają trzy rzeczy warte
zapamiętania:

- **Nic nie trafia do commita.** W `git status` nie pojawia się żaden plik, więc
  zadanie nigdy nie przemknie w commicie ani w diffie.
- **Nikt inny go nie widzi.** To notatka do siebie, nie wspólny backlog. Jeśli
  zadanie należy do zespołu, jego miejsce jest w zgłoszeniu.
- **Idzie za katalogiem, nie za gałęzią.** Otwórz ten sam klon w dwóch kartach —
  zobaczysz jedną listę. Sklonuj projekt ponownie w innym miejscu na dysku —
  dostaniesz drugą, osobną.

Gałąź, na której byłeś podczas pisania, zapisuje się jako *kontekst* i widać ją
w szczegółach. To przypomnienie, gdzie byłeś, a nie filtr: zadania nie znikają,
gdy przełączysz się na coś innego.

## Jak je zapisać

Otwórz listę — przycisk ↗ w nagłówku sekcji **Zadania**, plakietka na pasku
stanu albo **Zadania** w palecie poleceń —, wpisz linijkę i naciśnij
<kbd>Enter</kbd>. Sekcja na pasku bocznym pozostaje listą do czytania i
odhaczania; pisanie dzieje się w jednym miejscu.

Kolejność jest gotowa: najpierw otwarte — wysoki priorytet nad normalnym, a ten
nad niskim — a w obrębie priorytetu najstarsze pierwsze, bo to, co jest
ignorowane najdłużej, zasługuje na uwagę. Ukończone opadają na dół, ostatnio
odhaczone na górze, żeby cofnięcie pomyłki było jednym ruchem.

## Ustawianie własnej kolejności

Domyślne sortowanie ma zdanie i czasem się myli: trzy rzeczy, które naprawdę
zamierzasz zrobić dziś po południu, nie muszą być trzema najgłośniejszymi.
Przeciągnij wiersz za uchwyt albo naciśnij jego przyciski ▲ / ▼ — <kbd>Alt</kbd>
ze strzałkami robi to samo z klawiatury — a lista zachowa kolejność, którą jej
nadasz.

Pierwsze przeciągnięcie włącza za ciebie **Kolejność ręczną**; odznacz ją w
wierszu filtrów, aby oddać listę sortowaniu według priorytetu, zapamiętanemu
dokładnie takim, jakie było. Dwa ograniczenia warte poznania:

- **Przesuwają się tylko otwarte zadania.** Ukończone zostają na stosie poniżej,
  ostatnio odhaczone na górze, niezależnie od trybu.
- **Zmiana kolejności ustępuje, dopóki w polu filtra jest tekst**, bo wiersz
  przesunięty obok niewidocznych sąsiadów ląduje tam, gdzie się tego nie
  spodziewasz.

Priorytet nadal widać jako słupki sygnału obok każdego wiersza — jeden słupek
dla niskiego, trzy dla wysokiego — i nadal steruje żółtym znacznikiem na pasku
stanu.

## Widać je bez szukania

![Sekcja paska bocznego i plakietka na pasku stanu w jednym oknie](../../screenshots/todos-markers.webp)

| Znacznik | Gdzie | Co znaczy |
|---|---|---|
| Plakietka <kbd>☑ 3</kbd> | Pasek stanu, na lewo od nazwy gałęzi | Ile jest otwartych; żółta, gdy któreś ma wysoki priorytet |
| Licznik | Nagłówek sekcji na pasku bocznym | Ta sama liczba, tuż przy liście |

Obie znikają przy zerze. Stałe „0 zadań” to mebel, a mebli w końcu
przestaje się zauważać.

## Szczegóły

Kliknij zadanie — na pasku bocznym, na plakietce paska stanu albo przez
**Zadania** w palecie poleceń — aby otworzyć pełną listę z panelem szczegółów.

| Pole | Do czego służy |
|---|---|
| **Tytuł** | Ta jedna linijka. Edytowana na miejscu; nie ma przycisku zapisu. |
| **Notatki** | Wszystko, co nie zmieściło się w tytule: dlaczego to ważne, których plików dotyczy, co znaczy „zrobione”. |
| **Priorytet** | Niski, normalny lub wysoki. Rządzi kolejnością i kolorem plakietki. |
| **Utworzono / Ukończono** | Kiedy zapisałeś i kiedy odhaczyłeś. |
| **Zapisane na** | Gałąź, która była wtedy wybrana. |

Ten sam widok ma pole filtra, przełącznik **Pokaż ukończone** i **Wyczyść
ukończone**, które usuwa odhaczone na dobre i pyta wcześniej.

Ten przełącznik to ten sam, co **Ustawienia → Wygląd → Ukryj ukończone zadania**: po wyłączeniu odhaczone zadania znikają i z tej listy, i z sekcji na pasku bocznym. Nic nie jest usuwane, a liczniki nadal je uwzględniają.

## Czego świadomie nie robi

- **Żadnych terminów, przypomnień ani powiadomień.** Lista zadań, która ponagla,
  jest kalendarzem; ta czeka, aż na nią spojrzysz.
- **Żadnej synchronizacji ani udostępniania.** Nie opuszcza twojego komputera i
  nie wchodzi w skład eksportu przestrzeni roboczej.
- **Żadnych powiązań ze zgłoszeniami czy commitami.** Jeśli notatka zasługuje na
  tyle struktury, wyrosła z tej listy — załóż [zgłoszenie](hosting.md).
- **Usunięcie jest ostateczne.** Dla skasowanego zadania nie ma wpisu cofnięcia,
  bo git nigdy go nie zapisał.

**Zobacz też:** [Ustawienia repozytorium](repo-settings.md) ·
[Centrum dowodzenia](mission-control.md)
