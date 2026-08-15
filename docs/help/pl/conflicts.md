---
title: Rozwiązywanie konfliktów
category: Praca ze zmianami
order: 32
summary: Trzypanelowy edytor konfliktów, który mówi ci, która strona jest która.
keywords: konflikt konflikty rozwiąż nasze ich znaczniki trójstronny zapamiętane rozwiązanie conflict resolver merge ours theirs markers three-way rerere reuse recorded resolution replay
---

# Rozwiązywanie konfliktów

Kiedy merge, rebase, cherry-pick albo revert się zatrzyma, baner mówi ci, **co**
się zatrzymało i **między czym** — „merge `feature/x` do `main`", a nie po
prostu „konflikt".

![Edytor konfliktów](../../screenshots/conflict-resolver.webp)

## Dlaczego to jest w konflikcie

**Dlaczego to jest w konflikcie** w nagłówku wypisuje, dla każdej strony
osobno, commity, które dotknęły tego pliku, odkąd gałęzie się rozeszły — czyli
`git log --merge`, które git ma od zawsze i którego nikt nie znajduje.

![Commity z każdej strony, które dotknęły pliku w konflikcie](../../screenshots/conflict-why.webp)

Znaczniki mówią, co się gryzie. To mówi, kto to zmienił i po co — a to zwykle
przesądza o rozwiązaniu. Pustka w tym miejscu oznacza, że żadna ze stron nie
zacommitowała zmiany dokładnie w tej ścieżce — kolizja wzięła się ze zmiany
nazwy albo przeniesienia.

## Trzy panele

| Panel | Jest |
|---|---|
| Lewy | **Nasze** — strona, na której byłeś, opisana swoim commitem |
| Prawy | **Ich** — strona, która przychodzi, opisana swoim commitem |
| Środkowy | **Wynik**: edytowalny, z numerami linii, i to on faktycznie trafia do przechowalni |

Wszystkie trzy panele da się rozsuwać.

## Wybieranie

Per **linia**, per **fragment** albo od razu **cała strona** — a gdy odpowiedź
brzmi „zostaw obie", możesz wziąć obie strony fragmentu. Nawigator prowadzi cię
konflikt po konflikcie przez to, co zostało, więc nie da się przypadkiem zostawić
znacznika.

## Wsparcie AI

Przy włączonym AI **Rozwiąż z AI** proponuje scalenie w panelu wyniku. Nigdy nic
nie stosuje samo z siebie: czytasz, poprawiasz i dodajesz do przechowalni.
Zobacz [funkcje AI](ai.md).

## Jak ich w ogóle uniknąć

[Radar konfliktów](conflict-radar.md) mówi ci, które gałęzie wejdą w konflikt,
zanim którąkolwiek zmerge'ujesz.

## Niech git pamięta (rerere)

Rebase'uj długo żyjącą gałąź, a za każdym razem spotkasz ten sam konflikt.
`rerere` — *reuse recorded resolution* — jest odpowiedzią gita: zapamiętuje, jak
konflikt rozstrzygnąłeś, i odtwarza tę odpowiedź następnym razem, gdy pojawi się
identyczny.

**Ustawienia → Ogólne → Zapamiętuj rozwiązania konfliktów.** Zapisuje
`rerere.enabled` do twojej globalnej konfiguracji gita, więc wiersz poleceń
zachowuje się tak samo.

Kiedy git odpowiedział za ciebie, edytor mówi to wprost, zamiast pokazywać pusty
ekran „brak znaczników konfliktu", i oferuje **Zapomnij to rozwiązanie** — co
kasuje pamięć *i* przywraca konflikt, żebyś mógł rozstrzygnąć go inaczej.

Dwie rzeczy warte wiedzy:

- **Odtworzone rozwiązanie nie trafia do przechowalni**, chyba że włączysz
  *Automatycznie dodawaj odtworzone rozwiązanie do przechowalni*. Zostaw to
  wyłączone: sens tej pauzy polega na tym, że zapamiętana odpowiedź może być
  błędna dla tego konkretnego merge'a, a dodanie jej bez patrzenia to sposób, w
  jaki trafia ona do commita.

  Właśnie dlatego odtworzony plik **zostaje w Plikach w konflikcie**: git
  zapisał treść, ale indeks wciąż trzyma go jako niescalony i dopiero dodanie do
  przechowalni to zamyka. Ruszy go **Dodaj tak, jak jest** w edytorze albo
  **Oznacz wszystkie jako rozwiązane** na liście.
- **rerere nie rozumie każdego konfliktu.** Konflikty typu dodanie/dodanie
  i usunięcie/zmiana nie dostają preimage'u, więc zawsze wracają surowe. Licznik
  w Ustawieniach pokazuje, ile ich naprawdę trzyma, a **Zapomnij wszystkie**
  go opróżnia.

**Zobacz też:** [Radar konfliktów](conflict-radar.md) · [Merge i rebase](merging.md)
