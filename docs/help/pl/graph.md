---
title: Graf commitów
category: Repozytorium i historia
order: 10
summary: Czytanie historii: tory, referencje, kolumny, filtry i zaznaczanie wielu commitów.
keywords: graf historia commity tory gałęzie merge kolumny filtr liniowy graph lanes branches merges columns filter first-parent amend cofnij undo reset github
---

# Graf commitów

Gałęzie, merge'e i merge'e ośmiornicowe narysowane porządnie, w jasnym motywie
i w ciemnym. Renderowanie jest okienkowe, więc repozytorium ze stoma tysiącami
commitów przewija się tak jak to ze stoma.

| | |
|---|---|
| ![Graf commitów, jasny](../../screenshots/graph-light.webp) | ![Graf commitów, ciemny](../../screenshots/graph-dark.webp) |

## Poruszanie się

- <kbd>↑</kbd> <kbd>↓</kbd> (albo <kbd>j</kbd> <kbd>k</kbd>) przesuwają
  zaznaczenie.
- <kbd>⌘</kbd>/<kbd>Ctrl</kbd>-kliknięcie dorzuca commit do **zaznaczenia
  wielokrotnego**; <kbd>⇧</kbd>-kliknięcie bierze zakres. Mając zaznaczonych
  kilka, kliknij prawym przyciskiem, żeby zrobić na nich cherry-pick na bieżącą
  gałąź, zesquashować ciągły odcinek, wyeksportować jedną zbiorczą łatkę albo
  skopiować ich SHA.
- Commity, które przyszły z twoim **ostatnim fetchem lub pullem**, są oznaczone
  jako nowe.
- Kliknij commit prawym przyciskiem, żeby dostać **Popraw**, **Cofnij**,
  **Zresetuj do commita…** i **Zobacz na GitHubie**, a do tego checkout,
  cherry-pick, revert, gałąź, tag i kopiowanie. Akcje niebezpieczne pozostają
  widoczne i się dezaktywują.

## Ustawianie tego, co ma pokazywać

- **Fokus grafu** decyduje, ile historii jest rysowane — Ustawienia → Motywy →
  **Graf**, albo menu koła zębatego w nagłówku grafu. *Wszystko* rysuje całość;
  *Historia liniowa* (first-parent) zostawia sam pień; *Ukryj scalone gałęzie*
  zostawia pień plus gałęzie jeszcze niescalone; *Tryb solo* zostawia twoją
  gałąź, gałęzie oznaczone gwiazdką i gałąź domyślną.

  Filtruje tylko to, co log już wczytał. *Ukryj scalone gałęzie* ufa odpowiedzi
  samego gita na „już zawarta w bieżącej gałęzi”, więc zmiana gałęzi zmienia to,
  co znika — i zachowuje każdy commit, na który wciąż wskazuje tag albo ref,
  którego nie rozpoznaje, czyli dokładnie to, co zostaje po usuniętej gałęzi.
  *Historia liniowa* i *Tryb solo* są bardziej brutalne: tag albo schowek na
  ukrywanym commicie znika razem z nim.

- **Filtr po ścieżce**: kliknij plik albo katalog prawym przyciskiem →
  *Filtruj graf po tej ścieżce*, a zapalone zostaną tylko commity, które go
  dotknęły.

![Graf zawężony do jednej ścieżki](../../screenshots/graph-path-filter.webp)

- **Kolumny**: pokaż, ukryj, zmień rozmiar i kolejność kolumn gałęzi,
  wiadomości, autora, daty, SHA, podpisu i wdrożenia.
- **Styl**: Ustawienia → Motywy → **Graf** — paleta torów (8 wbudowanych, własna
  albo wygenerowana przez AI), styl narożników, gęstość wierszy i grubość linii,
  z podglądem mini-grafu na żywo.

![Ustawienia stylu grafu z podglądem na żywo](../../screenshots/settings-graph.webp)

## Szczegóły commita

Zaznaczenie commita pokazuje jego zmienione pliki (jako drzewo albo płasko),
autora, SHA, współautorów i podpis. Referencje `#123` i `@wzmianki` są
automatycznie linkowane do twojego hostingu.

Listę plików zaznacza się grupowo zwykłymi gestami (klik z
<kbd>⌘</kbd>/<kbd>Ctrl</kbd>, klik z <kbd>⇧</kbd>,
<kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd>). Prawy klik na zaznaczeniu → *Przywróć
{n} plików do drzewa roboczego* bierze te pliki dokładnie takie, jakie miał ten
commit: po jednym potwierdzeniu nadpisuje kopie robocze, nie ruszając ani HEAD,
ani indeksu.

![Przechodzenie przez szczegóły commita](../../screenshots/clip-commit-details.webp)

**Zobacz też:** [Blame i historia pliku](blame.md) · [Wyszukiwanie](search.md) · [Wehikuł czasu](time-machine.md)
