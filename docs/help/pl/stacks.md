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

Gitcito pokazuje stos od dołu do góry, z liczbą commitów na każdym poziomie.
Każdy poziom z otwartym PR-em nosi jego numer jako plakietkę — kliknij ją,
aby otworzyć PR.

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

Akcja jest **idempotentna**: naciśnij ją po każdym restacku albo nowym
poziomie, a wszystko się zbiegnie — nic nie jest duplikowane, dotykane jest
tylko to, co się rozjechało.

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
- Po zmergowaniu dolnego PR-a git nadal widzi stary łańcuch: **przestań
  śledzić** zmergowany poziom (albo ustaw głównej gałęzi rolę rodzica jego
  dziecka), zrób restack, wyślij. Sprzątanie po mergu dołu nie jest jeszcze
  zautomatyzowane.
- Sekcja stosu w treści PR-a jest utrzymywana między ukrytymi znacznikami —
  twój własny opis nad nią zostaje zachowany.

## Gdzie mieszkają powiązania

Powiązania z rodzicem są przechowywane w **konfiguracji gita**, więc podróżują
razem z repozytorium i przeżywają ponowne sklonowanie. Nic nie mieszka
w żadnym serwisie.

**Zobacz też:** [Rebase interaktywny](rebase.md) · [Hosting i pull requesty](hosting.md)
