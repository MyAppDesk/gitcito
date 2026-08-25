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

Gitcito rysuje stos z góry na dół, aż do pnia, na którym ląduje. Każdy poziom
pokazuje własne commity, **w co wyceluje jego PR** — w poziom poniżej, a w
przypadku najniższego w pień — a po wysłaniu także numer PR jako klikalną
plakietkę.

## Budowanie stosu

| Zrób to | A |
|---------|---|
| **Dodaj poziom** | Tworzy gałąź nad liściem i przełącza się na nią. To `gh stack add`, tylko z selektorem zamiast obowiązkowego argumentu. |
| **Dodaj powyżej** na dowolnym poziomie | To samo, ale w *środku* stosu: to, co siedziało na tym poziomie, zostaje przepięte na nową gałąź, więc łańcuch zachowuje kolejność i zyskuje piętro. Nic nie jest odtwarzane — nowa gałąź powstaje na czubku rodzica. |
| **Dodaj istniejącą gałąź** | Gałąź, którą już masz, dołącza do stosu nad liściem. Przydatne, gdy zacząłeś zwyczajnie i dopiero potem zobaczyłeś, że to stos. |

Każde pole gałęzi ma **podpowiedzi w trakcie pisania**: pisz, aby filtrować, ↑/↓
i Enter, aby wybrać, a to, co wpiszesz spoza listy, też się liczy — zdalna
referencja w rodzaju `origin/main` nadaje się na bazę.

## Przestawianie

Strzałki **↑ / ↓** przy poziomie zamieniają go z sąsiadem. To nie jest edycja
metadanych: łańcuch zostaje przepięty i odtworzony, więc własne commity każdego
poziomu lądują na nowej bazie. Ruch można cofnąć (<kbd>⌘Z</kbd>) — cofnięcie
odtwarza poprzednią kolejność, nie wskrzesza starych commitów.

Ponieważ przestawianie to seria rebase'ów, może dawać **konflikty**, dokładnie
jak restack. Gitcito zatrzymuje się na pierwszym i oddaje ci widok konfliktów;
poziomy poniżej są już przeniesione.

## Wskazywanie gdzie indziej

**Ustaw rodzica** na poziomie otwiera ten sam selektor: wybierz inną gałąź, a
powiązanie tego poziomu się przesunie. Wiersz **bazy** na dole robi to samo dla
pnia — zmień go, a cały stos zostanie przepięty na nowy pień i odtworzony.

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
