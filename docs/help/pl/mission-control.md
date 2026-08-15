---
title: Centrum dowodzenia
category: Synchronizacja i wiele repozytoriów
order: 51
summary: Każde repozytorium przestrzeni roboczej na jednym ekranie, od najgorszego.
keywords: centrum dowodzenia panel wszystkie repozytoria przegląd status brudne niewypchnięte w tyle mission control dashboard overview dirty unpushed behind workspace
---

# Centrum dowodzenia

Dwadzieścia repozytoriów i pytanie zawsze to samo: które mnie potrzebuje?

Centrum dowodzenia na nie odpowiada. Każde repozytorium **aktywnej przestrzeni
roboczej** na jednym ekranie, uszeregowane według tego, co naprawdę cię
potrzebuje:

1. **Zablokowane** — rebase albo merge zostawiony w połowie, konflikty,
   repozytorium, którego w ogóle nie da się odczytać.
2. **Do zsynchronizowania** — najpierw commity do pulla, potem commity do
   pusha.
3. **W toku** — niezacommitowana praca, pliki nieśledzone.
4. **Czyste** — te ciche, na dole, gdzie ich miejsce.

![Każde repozytorium na jednym ekranie, od najgorszego](../../screenshots/mission-control.webp)

## Co mówi ci wiersz

Gałąź i jej upstream · ↑przed / ↓za · liczniki zmian niezacommitowanych
i nieśledzonych · stashe · otwarte PR-y (gdy repozytorium jest już wczytane) ·
**14-dniowa iskierka commitów** · czas od ostatniego commita.

Rozwiń wiersz (strzałką albo <kbd>spacją</kbd>), żeby zobaczyć dokładnie, które
commity czekają na pusha i które pliki są brudne.

## Praca z listą

- Pigułki statusu na górze są **filtrami** — kliknij „3 zablokowane", żeby
  zobaczyć tylko je.
- Sortuj po **pilności**, **nazwie** albo **aktywności**.
- **Zaznacz kilka repozytoriów**, żeby zrobić na nich fetch, albo pull tylko na
  tych, które są w tyle (przycisk sam je zliczy).
- Odświeża się samo co 30 sekund, dopóki jest otwarte.

| Klawisz | Akcja |
|---|---|
| <kbd>↑</kbd> <kbd>↓</kbd> albo <kbd>j</kbd> <kbd>k</kbd> | Chodzenie po liście |
| <kbd>Enter</kbd> | Otwórz to repozytorium |
| <kbd>f</kbd> / <kbd>p</kbd> | Fetch / pull na nim |
| <kbd>space</kbd> | Rozwiń je |
| <kbd>/</kbd> | Skocz do filtra |

## To widok, nie karta

Wskaźnik obok nazwy przestrzeni roboczej go przełącza; kliknięcie dowolnej karty
odsyła cię z powrotem do pracy. Nigdy nie dokłada własnej karty i należy do
przestrzeni, w której jesteś — przełącz przestrzeń, a dostaniesz panel tamtej
przestrzeni.

Czytanie go jest **czysto lokalne**: jeden `git status` na repozytorium, bez
sieci, bez tokenów. Otwarcie panelu nigdy nigdzie się nie uwierzytelnia. Fetch
zawsze jest czymś, o co poprosiłeś.

**Zobacz też:** [Przestrzenie i karty](workspaces.md) · [Przestrzenie, karty i grupy](workspaces.md)
