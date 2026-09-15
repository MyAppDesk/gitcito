---
title: Repozytoria
category: Synchronizacja i wiele repozytoriów
order: 52
summary: Każde repozytorium, które Gitcito zna, otwarte albo nie, na jednej przeszukiwalnej liście.
keywords: repozytoria rejestr wszystkie repozytoria ulubione gwiazdka ostatnie skan folder przeglądaj znajdź otwórz zarządzaj zarządzanie repozytoriami kolor sekcja odcień podświetlenie przestrzenie z folderów drzewo generuj import masowy repositories registry favourites starred recent scan folder workspaces
---

# Repozytoria

[Centrum dowodzenia](mission-control.md) odpowiada na pytanie "które z moich
otwartych repozytoriów mnie potrzebuje?". Zna tylko karty aktywnej
przestrzeni roboczej. Repozytoria odpowiadają na inne: **gdzie jest to
repozytorium i czy w ogóle jest gdzieś otwarte?** Obejmują wszystko, co
Gitcito kiedykolwiek widział. Każdą przestrzeń, każdą kartę, oraz to, co
znajdzie, skanując foldery, które mu wskażesz.

![Strona Repozytoria: kolorowe sekcje otwartych, ulubionych, ostatnich i
przestrzeni roboczych, każdy wiersz z nazwą, właścicielem, gałęzią i stanem
pracy](../../screenshots/repositories.webp)

## Sekcje

Repozytorium może pojawić się w **więcej niż jednej sekcji**. Celowo: każda
sekcja jest pełną odpowiedzią na własne pytanie, nie wycinkiem jednej listy.

| Sekcja | Co w niej jest |
|---|---|
| Otwarte repozytoria | Każda karta aktywnej przestrzeni roboczej w tej chwili |
| Ulubione | Repozytoria z gwiazdką, we wszystkich przestrzeniach |
| Ostatnie | Wszystko, co otwierałeś, najnowsze na górze. **Bez limitu**, w odróżnieniu od 8-elementowej listy w launcherze |
| Jedna na zapisaną przestrzeń | Karty tej przestrzeni, żebyś mógł wskoczyć do innej, nie przełączając się najpierw |
| Wszystkie repozytoria | Każde repozytorium, które rejestr zna, otwarte albo nie |

Pasek nad listą to jeden pas: **Zwiń wszystko** i **Rozwiń wszystko**, potem
pole wyszukiwania, które zajmuje resztę szerokości, potem przełącznik
podsumowania WIP.

Wyszukiwanie filtruje wiersze we wszystkich sekcjach naraz i **ukrywa
sekcje, które nic nie trafiają**, żeby wyniki nie tonęły pod kolumną pustych
nagłówków. Trafia nazwę repozytorium, alias, właściciela albo dowolny
fragment ścieżki. Gdy nigdzie nic nie pasuje, strona to mówi zamiast stać
się pusta.

Przy pustym polu każda sekcja jest widoczna, nawet gdy nic nie trzyma:
"Ulubione 0" mówi, że sekcja istnieje i jest pusta, i warto to wiedzieć. To
szum dopiero wtedy, gdy już szukasz.

### Kolory sekcji

Sekcje przychodzą **już pokolorowane**. Każdy nagłówek dostaje własny
odcień ze standardowej palety, w tym nowa przestrzeń w chwili, gdy się
pojawia. Chodzi o orientację, nie o ozdobę: przy sekcji na projekt i pięciu
wbudowanych sekcjach nad nimi długa lista przestaje mówić, gdzie jesteś, a
odcień czyni nagłówek rozpoznawalnym, zanim go przeczytasz.

Żeby zmienić jeden, użyj **⋮** na jego nagłówku: **Zmień kolor…** otwiera
ten sam [wybór koloru](workspaces.md) co karty grup i foldery, dziesięć
gotowych próbek oraz dowolna wartość hex. **Przywróć kolor** pojawia się,
gdy nadpisałeś sekcję, i wraca do przypisanego domyślnego.

Trzy rzeczy warte zapamiętania:

- Przypisanie jest **stabilne, nie losowe**. Te same sekcje dostają te same
  kolory przy każdym starcie, a dodanie przestrzeni nigdy nie przekolorowuje
  tych powyżej. Zapisują się tylko kolory, które zmienisz.
- Kolor jest **lokalny dla tej strony**. Pokolorowanie tu sekcji przestrzeni
  nic nie mówi o tej przestrzeni gdzie indziej w Gitcito. Kolor jej karty to
  osobne ustawienie.
- Kolor jest **rozcieńczany** do niskiego procentu powierzchni, zamiast
  leżeć pełną siłą, żeby nasycony wybór zostawał czytelnym tłem w jasnym i
  ciemnym motywie. Bardzo blady kolor będzie więc wyglądał niemal
  neutralnie.

Przy więcej niż dziesięciu sekcjach paleta się powtarza, dwa nagłówki mogą
więc dzielić odcień.

## Co sprawia, że repozytorium jest znane

Wiersz pojawia się tutaj, gdy Gitcito je kiedyś **otworzył**, albo znalazł
pod **folderem do skanowania**. Nic nie jest indeksowane tylko dlatego, że
leży na dysku w miejscu, o którym nigdy mu nie wspomniałeś.

Otwarcie tej strony indeksuje też to, co masz **otwarte w karcie**, i tak
repozytoria przywrócone przy starcie dostają wiersz bez ponownego otwierania.
Obejmuje tylko otwarte karty i dzieje się przy pierwszej wizycie każdej
sesji, nie raz na zawsze. Repozytorium, któremu dasz **Forget**, zostaje
zapomniane, dopóki nie otworzysz go znowu.

Foldery do skanowania ustawia się w Ustawieniach:

- **Głębokość** to, ile poziomów katalogów skan schodzi poniżej korzenia
  (domyślnie 3, limit 10).
- Skan **zatrzymuje się na repozytorium**. Checkout wrzucony do środka albo
  submodule w repo nie jest indeksowany jako własny wiersz.
- Nigdy nie wchodzi do katalogów zaczynających się od kropki i pomija
  `node_modules` oraz podobne foldery zależności.
- **Czyta tylko nazwy folderów**: znalezienie katalogu `.git` czyni coś
  repozytorium tutaj. Nazwa, właściciel i gałąź biorą się z plików w `.git`
  (`HEAD`, config), nigdy przez uruchomienie `git`.

## Wiersze

Wiersze leżą w kolumnach: gwiazdka, nazwa (uwzględnia alias, jeśli
zmieniłeś nazwę), właściciel (z URL-a remote origin), chip gałęzi,
podsumowanie WIP i akcje. Kolumny są **wspólne dla całej strony**, nie
rozmiarowane per sekcja, więc nazwa w ostatniej sekcji stoi pod nazwą z
pierwszej i lista czyta się jak tabela, nie jak stos.

Końcowe akcje widać w spoczynku, nie dopiero po najechaniu: **otwórz w
karcie** oraz **⋮**, które otwiera to samo [menu kontekstowe
repozytorium](repo-menu.md) co kliknięcie prawym. To menu używane wszędzie
w Gitcito, rozszerzone o dwa wpisy właściwe tej stronie:

| Akcja | Co robi |
|---|---|
| Gwiazdka / zdejmij gwiazdkę | Dodaje repozytorium do Ulubionych albo je z nich wyjmuje |
| Locate… | Ponownie wskazuje przeniesiony lub przemianowany folder. Alias, profil i gwiazdka zostają. Jeśli cel miał już własne ustawienia, **wygrywa cel** |
| Forget | Usuwa wpis z tej listy. **Nigdy nie rusza folderu na dysku** |

Repozytorium, którego folder już nie istnieje, pokazuje się jako
**brakuje**, z **Locate…** i **Forget** w linii zamiast zwykłych akcji.

Gwiazdka to przełącznik ulubionych, nie pole wielokrotnego wyboru. Praca
zbiorcza idzie tu per sekcja, nie per zaznaczenie. Patrz niżej.

## Zamiana drzewa folderów w przestrzenie

Twój folder z kodem już koduje grupowanie, którego chcesz. Jeśli `~/Code`
trzyma `client-a`, `client-b` i `personal`, to są konteksty, między którymi
się przełączasz, a [przestrzeń robocza](workspaces.md) jest dokładnie tym,
z własnym paskiem kart.

**Dodaj folder do skanowania…** proponuje je zbudować. Po zindeksowaniu
skanu okno wypisuje foldery **bezpośrednio w** tym, który wybrałeś, z liczbą
repozytoriów w każdym. Zaznacz te, które chcesz. Każdy staje się przestrzenią
z **jedną kartą na repozytorium**.

| Wiersz | Znaczenie |
|---|---|
| Nazwa folderu i liczba | Zaznaczony domyślnie. Staje się przestrzenią |
| "{n} nowych, scala do …" | Przestrzeń dla tego folderu już istnieje. Dodawane są tylko nowe repozytoria |
| "Już w obszarze roboczym" | Nic do zrobienia, wyszarzone zamiast ukryte |
| Nazwa samego korzenia | Repozytoria leżące luzem w wybranym folderze, nie w podfolderze. Domyślnie odznaczone |

Repozytorium ląduje pod **pierwszym folderem pod korzeniem**, jak głęboko by
nie siedziało: `~/Code/client-a/nested/app` idzie do `client-a`. Foldery bez
repozytoriów nie są oferowane.

**Nic nie powstaje, dopóki nie potwierdzisz**, a anulowanie zostawia
indeks skanu. Repozytoria i tak są znane, i to właśnie robił ten przycisk
wcześniej.

### Skanowanie później jeszcze raz

Bezpieczne do powtórzenia. Drugi skan **dodaje i nigdy nie usuwa**:

- Nowe repozytoria dopisywane są do pasującej przestrzeni.
- Te, które przeniosłeś, przemianowałeś albo usunąłeś ręcznie, zostają jak
  je zostawiłeś.
- Przestrzeń, którą **przemianowałeś**, nadal jest rozpoznawana. Gitcito
  pamięta folder, z którego wyszła, więc scala zamiast tworzyć duplikat.
- Repozytorium skasowane z dysku trzyma kartę i pokazuje się jako
  brakujące.

Wygenerowane przestrzenie są zwyczajne. Zmieniaj nazwę, kolejność, kolor
albo usuwaj je jak każdą inną. Nic w nich nie zostaje specjalne.

## Zamykanie wszystkiego, co otwarte

Nagłówek **Otwarte repozytoria** niesie przycisk zamykania. **Zamknij
repozytorium**, gdy jedno jest otwarte, **Zamknij wszystkie karty**, gdy
kilka. Jest wyłączony, gdy nic nie jest otwarte.

Zamyka karty, które trzymają repozytoria, i **zostawia karty stron w
spokoju**, żeby strona Repozytoria, na której stoisz, nie zamknęła się sama.
Nic na dysku nie jest ruszane, nic nie jest commitowane, stashowane ani
odrzucane. Karta to tylko widok.

Zamknięcie kilku pyta najpierw i mówi, ile. Zamknięcie jednego nie: to tani
błąd, cofany zwykłym skrótem otwierania zamkniętej karty. Zamknięte karty
idą na ten sam stos dziesięciu, którego używa pojedyncze zamknięcie, i
otwierają się w kolejności, w jakiej stały na pasku. Więcej niż dziesięć
naraz nie wróci w całości.

## Fetch i pull całej sekcji

Każdy nagłówek sekcji niesie przycisk **fetch** i dzielony przycisk
**pull**. Działają na każde repozytorium w tej sekcji, pomijając te, których
folder **brakuje**. Repozytoria nie muszą być otwarte. Sekcja repo, których
nie otwierałeś w tej sesji, działa tak samo.

Oba idą **po kolei**, nie równolegle, żeby sekcja czterdziestu repozytoriów
nie odpalała czterdziestu procesów git naraz. Pasek stanu pokazuje, nad
którym repozytorium trwa praca i jak daleko jest przebieg, a cały wsad
kończy się **jednym** tostem, nie jednym na repozytorium. Jeśli część
padnie, tost mówi, ile wyszło i ile nie. Przebieg nie zatrzymuje się na
pierwszym błędzie.

Strzałka obok **pull** wybiera, co oznacza pull:

| Tryb | Co robi |
|---|---|
| Pull (fast-forward jeśli możliwe) | Domyślne Gita. Fast-forward, gdy może, merge, gdy nie może |
| Pull (tylko fast-forward) | Odmawia zamiast tworzyć commit merge |
| Pull (rebase) | Odtwarza twoje lokalne commity na wierzchu upstreamu |

Ten wybór to **jedna globalna preferencja**, nie per sekcja: opisuje, jak
robisz pull, i ustawienie go ze strzałki jednej sekcji zmienia go wszędzie.
Każdy pull **wielu repozytoriów** go honoruje. Przyciski sekcji tutaj,
fetch/pull na [karcie grupy](workspaces.md) i zbiorczy pull [centrum
dowodzenia](mission-control.md). Pull **pojedynczego** repozytorium z paska
zostaje nietknięty, bo to menu i tak pyta, jakiego pulla chcesz.

## Pasek akcji

**Otwórz folder…**, **Klonuj…** i **Dodaj folder do skanowania…**. Trzy
sposoby, żeby włożyć repozytorium do rejestru Gitcito, z tej samej strony,
na której szukasz już znanego.

## Podsumowanie WIP

Opcjonalne pole. Włączone, każdy **rozwinięty** wiersz odpala prawdziwy
`git status` i pokazuje niezacommitowaną pracę oraz stan sync. Wyłączone,
wiersze nie kosztują nic poza czytaniem plików w `.git`.

Jest opcjonalne celowo: podsumowanie kosztuje mniej więcej pięć procesów
git na repozytorium, paczkami po osiem, żeby duży rejestr nie zatrzymywał
interfejsu. Włączenie to świadome "sprawdź wszystko, co teraz widzę", nie
stały koszt.

## Ograniczenia

- **Nic na tej stronie nie odświeża się na timerze.** Otwórz stronę
  ponownie albo wyłącz i włącz podsumowanie WIP, żeby zobaczyć bieżący
  stan.
- **Podsumowanie WIP obejmuje tylko rozwinięte sekcje.** Zwinięta sekcja
  nie pokazuje statusu, zaznaczone pole czy nie.
- **Repozytorium jest znane dopiero, gdy je otworzysz albo zeskanujesz
  folder, który je zawiera.** Stąd nie da się przeszukać systemu plików.
- **Budowania przestrzeni nie cofniesz jednym ruchem.** Anulowanie okna nic
  nie tworzy, ale plan, który potwierdziłeś i potem żałujesz, odwija się
  przez ręczne usunięcie przestrzeni.
- **Tylko jeden poziom w głąb.** Foldery poniżej pierwszego poziomu są
  spłaszczane do paska kart przestrzeni. `client-a/nested/app` staje się
  kartą w `client-a`, nie folderem w środku.
- **"Skanuj teraz" w Ustawieniach tego nie oferuje.** Skanuje wszystkie
  skonfigurowane korzenie naraz, gdzie okno per folder nie ma sensu, i tylko
  indeksuje.
- **Zamknij wszystkie otwiera karty po jednej, do dziesięciu.** Zamknięcie
  więcej niż dziesięciu repozytoriów naraz znaczy, że najstarszych nie
  otworzysz ze stosu, choć wszystkie nadal są w **Ostatnich**.
- **Pull nie filtruje po tym, co jest w tyle.** Robi pull każdego
  repozytorium w sekcji, bo wiedzieć, które są w tyle, znaczyłoby najpierw
  zrobić fetch. Pull aktualnego repozytorium to no-op, kosztuje czas, nie
  bezpieczeństwo.
- **Fetch albo pull sekcji nie cofniesz ze stosu cofania.** Fetch nic nie
  zmienia w tym, co już miałeś. Pull, który robi merge albo rebase, cofa
  się per repozytorium z historii tego repozytorium, nie stąd.
- **Kolory sekcji są kosmetyczne.** Nie filtrują, nie sortują, nie grupują
  ani nie synchronizują nigdzie, a kolor na sekcji przestrzeni nie jest
  kolorem tej przestrzeni.
- **Forget usuwa wpis z listy, nigdy z dysku.** Jeśli folder nadal tam
  jest, skan tego samego korzenia (albo ponowne otwarcie) wraca z nim od
  razu.

**Zobacz też:** [Centrum dowodzenia](mission-control.md) · [Przestrzenie, karty i grupy](workspaces.md)
