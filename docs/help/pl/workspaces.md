---
title: Przestrzenie, karty i grupy
category: Zacznij tutaj
order: 3
summary: Wiele repozytoriów bez tonięcia w nich: karty, grupy, foldery i przestrzenie robocze.
keywords: przestrzeń robocza karty grupy foldery wiele repozytoriów układ workspace tabs groups folders multiple repos organise switch layout
---

# Przestrzenie, karty i grupy

Trzy poziomy, od najluźniejszego do najściślejszego.

## Karty

Jedno repozytorium, jedna karta. <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> otwiera wybór
nowej karty, a <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> zamyka aktywną. Karty można też
przeciągać, żeby zmienić kolejność, zamykać środkowym przyciskiem myszy albo
przywracać ostatnio zamkniętą przez <kbd>⌘⇧T</kbd>. Kliknij kartę repozytorium
(albo chip wewnątrz [grupy](#grupy)) prawym przyciskiem, żeby dostać
[menu kontekstowe repozytorium](repo-menu.md) — alias, worktree, GitHub,
terminal, pokazanie w menedżerze plików, edytor i usuwanie. Zamknij ostatnią
kartę, a <kbd>⌘W</kbd> zamknie zamiast niej okno. Kropka na karcie oznacza
niezacommitowaną pracę; inna kropka oznacza konflikty.

Jeśli pojawi się ostrzeżenie przy zamykaniu, <kbd>Escape</kbd> zawsze anuluje.
<kbd>Enter</kbd> potwierdza tylko wtedy, gdy karta jest czysta — przy
niezacommitowanych zmianach albo konfliktach ostrzeżenie celowo każe ci sięgnąć
po przycisk, żeby przypadkowe uderzenie w klawisz po <kbd>⌘W</kbd> nie zamknęło
pracy, którą wciąż trzymałeś.

## Grupy

Zbierz powiązane repozytoria w nazwaną, oznaczoną kolorem **kartę grupy**.
Wewnątrz grupy dostajesz drugi rząd z jednym chipem na repozytorium, a sama
grupa potrafi za jednym zamachem wykonać **Pobierz wszystko** lub **Pull na
wszystkich**.

![Karta grupy z kilkoma repozytoriami](../../screenshots/repo-groups.webp)

Grupy mogą zawierać **foldery, zagnieżdżane na dowolną głębokość**: kliknij
grupę prawym przyciskiem → *Nowy folder…*, a potem przeciągnij repozytoria na
chip folderu. Każdy folder dostaje kolor, zwija się do chipa z licznikiem,
agreguje kropki statusu wszystkiego, co w nim siedzi, i potrafi pobrać albo
zrobić pull dla całego swojego poddrzewa.

![Foldery na pasku kart grupy, każdy jako chip z licznikiem — Internal zagnieżdżony w Services](../../screenshots/nested-folders.webp)

> Foldery wyłącznie porządkują. Usunięcie folderu przenosi jego repozytoria do
> rodzica — nigdy nie zamyka repozytorium.

## Strony, które należą do repozytorium

Niektóre strony nie są bytem osobnym: [wiki](repo-wiki.md) repozytorium, jego
[statystyki](insights.md), [narzędzia deweloperskie](devtools.md) ogłoszone
przez sesję uruchomienia. Nie zajmują karty — pojawiają się jako małe ikony na
samym repozytorium.

- **Kliknij ikonę**, żeby pokazać stronę. **Kliknij ponownie — albo kliknij
  nazwę repozytorium** — żeby wrócić do repozytorium. Dopóki strona jest
  otwarta, nazwa dostaje kursor wskaźnika i małą plakietkę pod najechaniem: to
  droga powrotna.
- **Najedź na ikonę**, żeby zobaczyć ✕ zamykające tylko tę stronę.
- Wewnątrz **grupy** ikony siedzą na plakietce repozytorium, do którego należą,
  i tylko dopóki to repozytorium jest wybrane. Wybranie innego repo pokazuje
  *tamto* repozytorium, nie narzędzie sąsiada.
- Ponowne otwarcie tej samej strony zapala istniejącą ikonę, zamiast dokładać
  drugą.

Repozytorium, które nigdzie nie jest otwarte, nie ma ikony do noszenia — jego
strona otworzy się wtedy we własnej karcie: otwieranie musi zawsze coś otworzyć.

## Przestrzenie robocze

Przestrzeń robocza to **cały zapisany pasek kart**. Przełączenie podmienia
wszystkie karty naraz: `Praca` i `Prywatne` przestają sobie wchodzić w drogę.

Nazwa przestrzeni siedzi w lewym górnym rogu, obok znaku Gitcito. Kliknij ją,
żeby przełączyć, utworzyć, zmienić nazwę, przestawić lub usunąć. Obok znajduje
się wskaźnik otwierający [Centrum dowodzenia](mission-control.md) dla
przestrzeni, w której jesteś.

**Zobacz też:** [Centrum dowodzenia](mission-control.md) · [Wiersz poleceń](cli.md)
