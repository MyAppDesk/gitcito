---
title: Gałęzie w stosie
category: Gałęzie i operacje na historii
order: 43
summary: Łańcuchy zależnych gałęzi — kaskadowy restack i połączone PR-y jednym kliknięciem.
keywords: stos stacked branches graphite restack zależne łańcuch rodzic PR na poziom stack dependent chain parent submit wysyłka autopilot retarget przekierowanie bazy
---

# Gałęzie w stosie

Stos to łańcuch gałęzi, w którym każda buduje na tej pod spodem:
`main → api → ui`. Zrecenzowanie trzech małych PR-ów bije na głowę recenzję
jednego ogromnego.

![Stos gałęzi](../../screenshots/branch-stack.webp)

Gitcito rysuje go jako **trasę**: na górze gałąź startowa, a pod nią po jednym
przystanku na poziom. PR każdego przystanku celuje w przystanek powyżej, a pierwszy
ląduje na gałęzi startowej. Przystanek pokazuje własne commity, czy potrzebuje
restacku, a po wysłaniu numer PR.

## Edycja trasy

| Element | Co robi |
|---------|---------|
| Pole **Start** | Gdzie ląduje stos. Zmień je, a cały łańcuch zostanie przepięty na nową gałąź i odtworzony. |
| Pole **przystanku** | Zamienia, która gałąź zajmuje to miejsce. Gałąź, która schodzi z trasy, jest tylko odpinana, nigdy usuwana. |
| **↑ / ↓** | Przesuwa przystanek o jedno miejsce. |
| **✕** | Zdejmuje przystanek z trasy; sąsiedzi się łączą. |
| **Dodaj przystanek** | Wybierz gałąź, którą już masz — dołączy na szczycie trasy — albo wpisz nazwę, której jeszcze nie ma: powstanie na czubku ostatniego przystanku i zostanie przełączona. |
| Przycisk ze strzałką | Przełącza na ten przystanek. |

Każde pole ma podpowiedzi w trakcie pisania: pisz, aby filtrować, ↑/↓ i Enter, aby
wybrać, a to, co wpiszesz spoza listy, też się liczy — zdalna referencja w rodzaju
`origin/main` nadaje się na gałąź startową.

Pod spodem wszystkie te zmiany to ta *sama* operacja: cała trasa, oddana naraz.
Dlatego jeden gest to jedno cofnięcie (<kbd>⌘Z</kbd>), a nie ślad po połowicznie
zastosowanych powiązaniach.

## Ile kosztuje zmiana trasy

Wszystko, co zmienia kolejność — zamiana, przesunięcie, inny start — **odtwarza**
łańcuch: własne commity każdego przystanku są rebase'owane na nową bazę. Może więc
dawać **konflikty**, dokładnie jak restack. Gitcito zatrzymuje się na pierwszym i
oddaje ci widok konfliktów; wcześniejsze przystanki już się przesunęły.

Cofnięcie odtwarza poprzednią trasę. Nie wskrzesza starych commitów, bo nowe to ta
sama praca z innymi rodzicami.

## Wypchnij wszystko

**Wypchnij wszystko** wypycha każdy poziom z `--force-with-lease` i na tym
kończy — to `gh stack push`, bez otwierania czegokolwiek. **Wyślij stos jako PR**
robi ten sam push, a potem robotę wokół PR-ów; użyj **Wypchnij wszystko**, gdy
chcesz mieć gałęzie na zdalnym, ale jeszcze nie recenzję.

## Wyślij stos jako połączone PR-y

**Wyślij stos jako PR-y** robi jednym kliknięciem to, za co narzędzia do
stackowania każą sobie płacić:

1. Wypycha każdy poziom z `--force-with-lease` (świeże gałęzie to tolerują,
   a te po restacku tego wymagają).
2. Otwiera PR dla każdego poziomu, który go nie ma — każdy **oparty na gałęzi
   rodzica**, a nie na `main`, więc każda recenzja pokazuje tylko własne
   commity. Tytuł i opis pochodzą z commitów danego poziomu.
3. Przekierowuje każdy istniejący PR, którego baza się rozjechała.
4. Wpisuje do treści każdego PR-a **sekcję nawigacji po stosie**, dzięki czemu
   recenzent na dowolnym poziomie widzi cały łańcuch i miejsce tego PR-a w nim.

Akcja jest **idempotentna**: naciśnij ją po każdym restacku, nowym poziomie
albo zmergowanym PR-ze, a wszystko się zbiegnie — nic nie jest duplikowane,
dotykane jest tylko to, co się rozjechało.

Kiedy dolny PR jest już **zmergowany**, ten sam przycisk po nim sprząta:
dziecko zmergowanego poziomu dostaje za rodzica główną gałąź, poziom przestaje
być śledzony, jego lokalna gałąź jest usuwana (bezpiecznie — główna gałąź
dowodnie ją zawiera), łańcuch przechodzi restack, a każdy pozostały PR jest
przekierowywany. Merguj od dołu do góry, naciskaj Wyślij, powtarzaj.

## Restack

Kiedy zmieni się niższa gałąź — poprawiłeś uwagi z recenzji na `api` — każda
gałąź nad nią stoi teraz na złej bazie. **Restack** kaskadowo rebase'uje cały
łańcuch przez `rebase --onto`, dzięki czemu przepisanie rodzica nie duplikuje
commitów do jego dzieci. Po restacku naciśnij ponownie **Wyślij**: wypycha
z wymuszeniem przepisane poziomy, a PR-y aktualizują się w miejscu.

## Ograniczenia

- Wysyłka działa na razie **tylko z GitHubem** (tworzenie działa na wszystkich
  czterech hostach, ale przekierowanie bazy i aktualizacja treści wymagają
  API GitHuba).
- Sprzątanie po mergu dołu widzi merge'e zwykłe i przez rebase po pochodzeniu,
  a merge'e przez **squash** — pytając GitHuba, czy PR gałęzi wylądował; z
  tokenem GitHuba sprzątany jest więc każdy styl merge'a. Na innych hostach
  albo bez tokena poziom zmergowany przez squash nadal trzeba przestać śledzić
  ręcznie. Najpierw zrób też fetch — sprawdzenie pochodzenia czyta główną
  gałąź według stanu z twojego ostatniego fetcha.
- Sekcja stosu w treści PR-a jest utrzymywana między ukrytymi znacznikami —
  twój własny opis nad nią zostaje zachowany.
- Przestawianie i zmiana pnia **przepisują historię** na każdym dotkniętym
  poziomie. Gałęzie są twoje, a niewypchnięte poziomy nic nie kosztują, ale
  poziom już w recenzji dostanie force-push przy następnym wysłaniu.
- Poziom przesuwa się o jedno miejsce naraz. Dwie zamiany to dwa rebase'y, a
  zatrzymanie się w połowie to czytelny stan; przeciągnięcie lądujące trzy
  miejsca dalej — nie.

## Gdzie mieszkają powiązania

Powiązania z rodzicem są przechowywane w **konfiguracji gita**, więc podróżują
razem z repozytorium i przeżywają ponowne sklonowanie. Nic nie mieszka
w żadnym serwisie.

**Zobacz też:** [Rebase interaktywny](rebase.md) · [Hosting i pull requesty](hosting.md)
