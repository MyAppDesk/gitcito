---
title: Radar współpracowników
category: Gałęzie i operacje na historii
order: 45
summary: Kto co ruszył w upstreamie — i czy trafia to w twoją niezacommitowaną pracę.
keywords: radar współpracowników aktywność zdalna upstream nakładanie kolizja zmodyfikowane pliki kto dotykał konflikt fetch teammate radar remote activity overlap dirty files collision who touched
---

# Radar współpracowników

Edytujesz `api.ts`. Ktoś inny też — na gałęzi, do której nie zaglądałeś. Zwykły
sposób, żeby się o tym dowiedzieć, to konflikt merge'a w przyszłym tygodniu;
sposób radaru to lista, dziś.

Wszystko jest liczone z twojego **ostatniego fetcha** — referencje zdalnie
śledzące, `merge-tree` w pamięci, nic więcej. Bez serwera, bez agenta na
maszynach współpracowników, bez sieci poza fetchem, który i tak robiłeś.

![Radar współpracowników](../../screenshots/teammate-radar.webp)

## Co mówi ci wiersz

Dla każdej zdalnej gałęzi, która ma commity nieobecne w twoim `HEAD`:

| Kolumna | Znaczenie |
|--------|---------|
| Kto i kiedy | Ostatni commitujący na tej gałęzi i jak dawno temu |
| Commity / pliki | Ile nadchodzi i ilu plików to dotyka |
| **Nakładanie** | Które z tych plików są **zmodyfikowane w twoim drzewie roboczym w tej chwili** — czerwona pigułka |
| Ryzyko | Czy zmergowanie tej gałęzi do `HEAD` weszłoby w konflikt (ten sam silnik co [radar konfliktów](conflict-radar.md)) |

Wiersze sortują się według tego, jak mocno kolidują z tobą: najpierw
nakładanie, potem przewidywane konflikty, potem świeżość. Rozwiń wiersz, żeby
zobaczyć dokładne listy plików; **Porównaj** otwiera pełne porównanie gałęzi.

## Kiedy się odzywa

Po każdym fetchu — ręcznym czy automatycznym — radar skanuje po cichu. Pokazuje
toast tylko wtedy, gdy commity z upstreamu dotykają plików, które
zmodyfikowałeś, **i** ten zbiór faktycznie zmienił się od ostatniego skanu.
Brak zmodyfikowanych plików, brak hałasu: czyste drzewo robocze nie może z
niczym kolidować.

## Ograniczenia

- Widzi to, co widział ostatni fetch. Współpracownik, który nie wypchnął
  zmian, jest niewidzialny — radar czyta referencje, nie myśli.
- Nakładanie działa na poziomie ścieżek, nie linii: dotknięcie tego samego
  pliku to ostrzeżenie, nie dowód konfliktu. Kolumna **Ryzyko** to odpowiedź
  na poziomie linii, ale tylko między stanami zacommitowanymi.
- Gałęzie nieaktywne dłużej niż ~45 dni są pomijane, a skanowanych jest tylko
  30 ostatnio poruszonych.

**Zobacz też:** [Radar konfliktów](conflict-radar.md) · [Fetch, pull i push](syncing.md) · [Co się zmieniło od](range-diff.md)
