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

Wszystkie trzy panele da się rozsuwać, a nagłówek wyniku niesie dwa
przełączniki widoku:

| Przełącznik | Co robi |
|---|---|
| **Zawijaj** | Zawija długie wiersze w panelach A i B zamiast je przewijać. Panel wyniku trzyma jeden rząd na wiersz — od tego zależą jego boczne znaczniki — więc zawsze się przewija |
| **Powiązane** | Przewija A, B i wynik razem, w pionie i w poziomie. Ich liczby wierszy się różnią, więc pozycja pionowa jest dopasowywana proporcjonalnie |

Zawijaj na starcie jest wyłączone, Powiązane — włączone, a oba przełączniki
pamiętają swój stan.

## Poruszanie się

Otwarcie pliku ląduje na jego **pierwszym konflikcie**, a nie na początku
pliku. Strzałki ⌃ / ⌄ w nagłówku wyniku — albo <kbd>Alt+↑</kbd> /
<kbd>Alt+↓</kbd> — przechodzą przez resztę, przewijając wszystkie trzy panele
do każdego z nich.

## Wybieranie

Per **linia**, per **fragment** albo od razu **cała strona** — a gdy odpowiedź
brzmi „zostaw obie", możesz wziąć obie strony fragmentu. Nawigator prowadzi cię
konflikt po konflikcie przez to, co zostało, więc nie da się przypadkiem zostawić
znacznika.

## Wsparcie AI

Przy włączonym AI **Rozwiąż z AI** proponuje scalenie w panelu wyniku. Nigdy nic
nie stosuje samo z siebie: czytasz, poprawiasz i dodajesz do przechowalni.
Zobacz [funkcje AI](ai.md).

## Pliki projektu Xcode

`project.pbxproj` konfliktuje częściej niż jakikolwiek inny plik w repozytorium
iOS — i prawie nigdy dlatego, że ktoś się z kimś nie zgadzał. To jeden płaski
słownik obiektów z 24-znakowymi kluczami szesnastkowymi, więc dodanie jednego
pliku zapisuje cztery wpisy: `PBXBuildFile`, `PBXFileReference`, wiersz w
`children` grupy nadrzędnej i wiersz w fazie budowania celu. Dwie osoby dodające
po jednym pliku zapisują osiem wpisów, które lądują w tych samych kilku
wierszach. Git widzi kolizję; nie ma czego rozwiązywać.

Gdy plikiem w konflikcie jest `project.pbxproj`, edytor konfliktów czyta
wszystkie trzy wersje jako projekty, a nie jako tekst, i proponuje **scalenie
według struktury**: dopasować obiekty po identyfikatorze, wziąć każde dodanie z
obu stron, połączyć tablice `children` i `files` i zatrzymać się na tym, co
naprawdę się rozjechało. Pasek nad panelami mówi, co dodała każda strona i co —
jeśli cokolwiek — zostaje dla ciebie.

Tak jak propozycja AI, ląduje w panelu wyniku i niczego nie przygotowuje do
zatwierdzenia. Czytasz to przed zapisaniem.

![Pasek scalania strukturalnego nad panelami konfliktu, na pliku projektu Xcode](../../screenshots/conflict-pbxproj.webp)

### Czego odmawia

**Nigdy nie zgaduje ustawienia, które ruszyliście oboje.** Jeśli ty ustawisz
`MARKETING_VERSION` na `1.1`, a oni na `2.0`, to jest decyzja i jest wymieniona
z nazwy na pasku — ustawienie, twoja wartość, ich — zamiast być rozstrzygnięta za
twoimi plecami. Obiekt, którego nie dało się rozstrzygnąć, zachowuje dokładnie
*twoją* wersję, żeby scalenie zastosowane w połowie nigdy nie trafiło na dysk.

**Odrzuca cały plik, jeśli którakolwiek z trzech wersji się nie parsuje.**
`project.pbxproj`, którego Xcode nie otworzy, kosztuje więcej niż ręczne
scalenie, więc wszystko, czego nie da się odczytać z pewnością, zostaje zwykłym
konfliktem tekstowym — i mówi o tym wprost.

**Nie wykrywa dwóch identyfikatorów nadanych różnym obiektom.** To rzadkie, bo
Xcode losuje je przypadkowo — ale gdy się zdarzy, wybranie którejkolwiek strony
po cichu wyrzuciłoby czyjś plik, więc jest zgłaszane zamiast scalane.

### Nie `merge=union`

Krążącym lekarstwem na to jest `*.pbxproj merge=union` w
[`.gitattributes`](attributes.md). Unikaj go. Union działa, dopóki jedynymi
zmianami są niezależne dodania, a w chwili gdy dwie osoby edytują to samo
ustawienie budowania, wypisuje oba wiersze i tworzy plik, którego Xcode odmawia
otwarcia — dokładnie wtedy, gdy najmniej prawdopodobne jest, że czytasz diff
uważnie. Scalanie strukturalne daje tę samą wygodę bez tej awarii.

## Pliki blokady

`Podfile.lock`, `Package.resolved`, `yarn.lock` i im podobne zapisują graf
zależności, który czyjś resolver już rozwiązał. Połowa jednego rozwiązania
zszyta z połową drugiego to graf, którego nikt nie rozwiązał: może się nie
zainstalować, a jeśli się zainstaluje, zainstaluje coś, czego nie testowała
żadna z gałęzi.

Dlatego gdy plikiem w konflikcie jest plik blokady, pasek nazywa narzędzie,
które nim rządzi, oferuje od razu **Zachowaj nasze** i **Zachowaj ich**, i podaje
polecenie, które wygeneruje go na nowo. Wybór strony nie jest tu kompromisem —
to cała metoda, a poprawnym czyni ją dopiero ponowne wygenerowanie.

![Pasek pliku blokady nad panelami konfliktu](../../screenshots/conflict-lockfile.webp)

Trzy panele pozostają dostępne, bo od czasu do czasu naprawdę chcesz przeczytać,
co się zmieniło: sumę kontrolną, którą rozpoznajesz, wersję, której się
spodziewałeś. To ręczna edycja jest tym, od czego to wszystko ma cię odwieść.

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
