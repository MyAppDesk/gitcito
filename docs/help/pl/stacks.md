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

**Nic się nie wykonuje, dopóki nie naciśniesz Zastosuj.** Wybór gałęzi,
przesunięcie przystanku, zdjęcie go z trasy — to wszystko edytuje listę na
ekranie. Prawdziwa operacja robi rebase gałęzi i je przełącza, a tego nie
powinno robić ciekawskie kliknięcie. Gdy trasa wygląda dobrze, **Zastosuj trasę**
wykonuje ją jako jeden odwracalny krok; **Odrzuć** przywraca rysunek do tego, co
mówi repozytorium.

Trasa jest rysowana w kolejności scalania: gałąź na górze scala się do tej
poniżej, aż do gałęzi, na której ląduje stos.

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
dawać **konflikty**, dokładnie jak restack. Dwa przystanki dotykające tych samych wierszy nie zamienią
się bez człowieka, a wtedy **nic się nie dzieje**: cała zmiana jest wycofywana —
czubki, powiązania rodzica i rozgrzebany rebase — a Gitcito nazywa dwa
przystanki, które się gryzą. Trącona lista rozwijana nie powinna zostawiać cię w
środku rebase'a.

**Restack** to druga połowa umowy: to rebase, o który poprosiłeś z nazwy, więc
zatrzymuje się na konflikcie i daje widok konfliktów — a to zarazem sposób na
przestawienie, którego Gitcito odmówiło: rozwiąż tam, potem przesuń przystanek.

Cofnięcie odtwarza poprzednią trasę. Nie wskrzesza starych commitów, bo nowe to ta
sama praca z innymi rodzicami.

## Wypchnij wszystko

**Wypchnij wszystko** wypycha każdy poziom z `--force-with-lease` i na tym
kończy — to `gh stack push`, bez otwierania czegokolwiek. **Wyślij stos jako PR**
robi ten sam push, a potem robotę wokół PR-ów; użyj **Wypchnij wszystko**, gdy
chcesz mieć gałęzie na zdalnym, ale jeszcze nie recenzję.

## Wyślij stos jako połączone PR-y

**Wyślij** pyta najpierw: ile pull requestów otworzy, ile przestawi, na którym
zdalnym repozytorium i po jednym wierszu `gałąź → baza` — otwieranie PR-ów jest
publiczne i trudno je cofnąć. Na koniec powiadomienie mówi, ile otwarto i ile
przestawiono. Sekcja nawigacji w każdym opisie jest tym, co czyni łańcuch
widocznym na GitHubie, który nie zna pojęcia stosu.

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

### Na GitHubie staje się to też prawdziwym stosem

Połączone bazy rozumie każdy host, a na GitLabie, Bitbuckecie i Azure DevOps to
wszystko, co jest. GitHub ma więcej: od czasu preview stacked pull requests stos
jest obiektem na serwerze. Gdy pull requesty już istnieją, Gitcito rejestruje je
jako stos — od dołu do góry — a ty dostajesz mapę stosu w UI, kaskadowy rebase po
stronie serwera i merge górnego PR-a, który ląduje wszystkie poziomy poniżej.

Jeśli repozytorium nie jest w tym preview albo token nie może zarządzać stosami,
wywołanie jest po cichu pomijane: łańcuch i jego sekcja nawigacji bronią się
same, tak jak na pozostałych hostach.

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
- Przystanek jest **rebase'owany**, więc gałąź, na której ląduje stos, nigdy nie
  jest zarazem przystankiem — podobnie jak gałąź **chroniona** (`main` i `master`,
  o ile nie zmienisz listy). Obie są odrzucane, zamiast po cichu przepisywać
  wspólną historię.
- Zanim cokolwiek otworzy, wysyłka pyta zdalne repozytorium, które gałęzie
  faktycznie dotarły, i wymienia brakujące. GitHub odpowiada na brak heada suchym
  „Validation Failed”, z którego nikt nic nie ma.
  Sprawdzana jest też gałąź, na której ląduje stos: jeśli istnieje tylko lokalnie,
  wysyłka proponuje ją wypchnąć i kontynuować.

## Gdzie mieszkają powiązania

Powiązania z rodzicem są przechowywane w **konfiguracji gita**, więc podróżują
razem z repozytorium i przeżywają ponowne sklonowanie. Nic nie mieszka
w żadnym serwisie.

**Zobacz też:** [Rebase interaktywny](rebase.md) · [Hosting i pull requesty](hosting.md)
