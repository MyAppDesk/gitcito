---
title: Czat repozytorium
category: AI
order: 82
summary: Pytaj o to repozytorium, korzystając z plików i commitów przypiętych jako kontekst — i pozwól mu proponować akcje Gita, które zatwierdzasz przed uruchomieniem.
keywords: czat pytanie pytaj asystent kontekst przypnij załącz przeciągnij upuść commit plik dowód ugruntowany ai panel akcje uruchom zatwierdź automatyczne uruchamianie pozwól napraw błąd toast
---

# Czat repozytorium

Niektóre pytania szybciej zadać, niż wyszukać na nie odpowiedź. *Gdzie naprawdę
odświeżany jest token? Co zmienił ten commit, w jednym zdaniu? Po co istnieje ten
plik?* Czat repozytorium odpowiada na to w otwartym repozytorium i pokazuje
wiersze, na których się oparł.

Dzieli prawą kolumnę ze **Szczegółami**: karty u góry przełączają między nimi, więc
graf nie traci zaznaczenia, gdy o coś pytasz.

![Czat repozytorium z przypiętym kontekstem](../../screenshots/repo-chat.webp)

## Co czyta

Każda odpowiedź powstaje w dwóch przebiegach. Pierwszy wybiera niewielki zestaw
ścieżek i dosłownych wyszukiwań z listy śledzonych plików repozytorium. Drugi
odpowiada wyłącznie na podstawie zwróconych fragmentów i tylko je może cytować:
zmyślony plik lub wiersz to błąd walidacji, a nie wiarygodnie brzmiąca odpowiedź.

**Drugie spojrzenie.** Pierwszy przebieg musi zgadywać po samych nazwach, które
pliki są istotne — a to dokładnie ta zgadywanka, która zawodzi przy pytaniu
„skąd to jest wywoływane”. Dlatego odpowiedź może dopytać zamiast zgadywać: może
wskazać kolejne ścieżki, kolejne dosłowne wyszukiwania albo skróty commitów z
najnowszej historii, a pytanie zostaje zadane ponownie z tym, co przyniosą. Może
się to zdarzyć najwyżej dwa razy — każda runda to kolejne wywołanie modelu, na
które czekasz — a w ostatniej musi odpowiedzieć tym, co ma. Nie zobaczysz z tego
nic poza nieco dłuższym czekaniem i lepszą odpowiedzią.

| Uwzględnione | Pominięte |
|---|---|
| Śledzone pliki, w postaci z katalogu roboczego | Pliki nieśledzone |
| Diffy w przechowalni i poza nią, dla śledzonych plików | Wszystko, co łapie reguła ignorowania — nawet jeśli jest śledzone |
| Gałąź, przed/za oraz lista zmienionych ścieżek | [Pliki wyglądające na sekrety](security.md), pliki binarne, ścieżki generowane |

Czytanie katalogu roboczego pozwala rozmawiać o niezatwierdzonych zmianach.
Oznacza też, że te zmiany opuszczają komputer przy zadaniu pytania — dostaje je
dostawca skonfigurowany w [Funkcjach AI](ai.md).

Jeden niuans: z włączonymi
[propozycjami akcji](#uruchamianie-akcji-z-czatu) stan repozytorium zawiera
**nazwy** nieśledzonych plików — „dodaj nowy plik do przechowalni” ich
potrzebuje — ale ich zawartość nadal nigdy nie jest czytana.

## Przypinanie kontekstu

To model decyduje, co przeczytać. Przypięcie jest sposobem, by go przegłosować:
przypięte czytane jest **najpierw** i dostaje większą część budżetu kontekstu.

Cztery sposoby, wszystkie trafiają do tego samego rzędu chipów nad polem
wiadomości:

| Zrób to | Dostajesz |
|---|---|
| Kliknij proponowany chip | Plik otwarty w podglądzie albo commit zaznaczony w grafie |
| Przeciągnij wiersz z karty **Pliki** | Ten plik |
| Przeciągnij wiersz z **grafu commitów** | Ten commit — jego opis i diff w blokach |
| **+** → *Wybierz plik…*, albo przeciągnij z Findera/Eksploratora | Dowolny plik na dysku, również spoza repozytorium |

Chipy zostają przypięte do kolejnych pytań; `×` usuwa jeden, a wyczyszczenie
rozmowy usuwa wszystkie. Limit to osiem.

Przypięty commit wnosi swój opis i do dwunastu bloków diffa. Bloki dotyczące
wykluczonej ścieżki wypadają z tego diffa, a nie cały commit.

## Ustawienia

**Ustawienia → AI → Czat repozytorium**:

| Ustawienie | Działanie |
|---|---|
| **Zadawaj pytania o repozytorium** | Wyłączone usuwa kartę, przycisk paska i cel skrótu. Reszta AI działa dalej |
| **Model czatu** | Model tylko dla czatu. Puste oznacza model profilu — pytanie kosztuje mniej niż przegląd, mniejszy zwykle wystarcza |
| **Tylko zatwierdzona treść** | Odpowiada z ostatniego commita zamiast z katalogu roboczego: niezatwierdzone zmiany nigdy nie opuszczają komputera |
| **Proponowanie akcji na plikach i w Git** | Wyłączone znów czyni czat czysto tylko do odczytu: żadnych kart akcji, żadnej listy zatwierdzania |
| **Tryb plików tylko do odczytu** | Włączony blokuje tworzenie, edytowanie, zastępowanie i usuwanie plików, ale pozostawia dostępne akcje Git. Domyślnie jest włączony |
| **Jak uruchamiane są proponowane akcje** | Tryb zatwierdzania — zobacz [Tryby zatwierdzania](#tryby-zatwierdzania). Akcje destrukcyjne i tak proszą o potwierdzenie |
| **Pozwól czatowi proponować akcje zdalne** | Domyślnie wyłączone. Włączone dodaje fetch, pull, push, otwarcie pull requesta i wysłanie stosu |

Gdy AI jest wyłączone w całości, czat znika razem z nim — żaden panel nie
proponuje odpowiedzi, której nic nie może udzielić.

Model czatu można przełączyć także w nagłówku samego panelu, obok nazwy dostawcy
— to to samo ustawienie, bez otwierania Ustawień.

Przycisk różdżki obok tytułu panelu otwiera **kreator konfiguracji AI** —
prowadzony przepływ, który generuje pliki konfiguracyjne asystenta
(instrukcje, agenci, hooki) dla tego repozytorium. Zobacz
[Funkcje AI](ai.md).

![Ustawienia czatu repozytorium](../../screenshots/settings-repo-chat.webp)

## Praca z wiadomościami

Wiadomości to zwykły tekst. Zaznacz dowolny fragment i skopiuj go albo kliknij
dymek prawym przyciskiem: **Kopiuj** bierze zaznaczenie, **Kopiuj wiadomość**
całą wiadomość — odpowiedź jest kopiowana jako jej źródło Markdown — a gdy
kliknięcie trafiło w link, **Kopiuj link** jego adres.

Linki otwierają się w domyślnej przeglądarce, nigdy wewnątrz Gitcito — zarówno
linki Markdown w odpowiedziach, jak i zwykłe adresy `https://` w twoich
wiadomościach.

Gdy wiadomość wspomina obraz — ścieżkę repozytorium taką jak `docs/logo.png`
albo URL kończący się rozszerzeniem obrazu — najechanie na wzmiankę pokazuje
mały podgląd. Ścieżki repozytorium są czytane z drzewa roboczego; wzmianka,
która nie prowadzi do czytelnego obrazu, po prostu nic nie pokazuje.

![Podgląd obrazu po najechaniu](../../screenshots/repo-chat-image-hover.webp)

## Uruchamianie akcji z czatu

Poproś o zmianę zamiast o fakt — *dodaj pliki markdown do przechowalni,
zatwierdź to jako poprawkę, wpisz wynik builda na listę ignorowanych* — a
odpowiedź przyjdzie z **kartą akcji**. Pusta rozmowa proponuje pod
wprowadzeniem kilka przykładowych próśb w postaci chipów; kliknięcie jednego
wypełnia pole wiadomości, więc możesz je zredagować przed wysłaniem. Karta
wymienia konkretne kroki, które asystent chce
wykonać, jeden wiersz na akcję, z przyciskami **Uruchom** i **Odrzuć**. Nic z
karty jeszcze się nie wydarzyło; model może tylko proponować, a każda
propozycja jest sprawdzana z katalogiem roboczym, zanim ją zobaczysz — akcja
wskazująca nieistniejący plik zostaje odrzucona, a nie wyświetlona.

![Pusta rozmowa z przykładowymi prośbami](../../screenshots/repo-chat-empty.webp)

![Proponowane akcje na czacie](../../screenshots/repo-chat-actions.webp)

Czat repozytorium może proponować dokładne edycje, tworzenie lub całkowitą
podmianę plików oraz ich usunięcie, a potem akcje Gita: wzorce ignorowania,
stage, unstage, commit, stash, odrzucenie, gałąź, przełączenie, tag oraz —
ponieważ pokazuje mu się listę gałęzi i ostatnie commity — merge, rebase, revert
i cherry-pick. Gitcito liczy rozwijany diff lokalnie. Istniejące pliki muszą
pochodzić z przeczytanych dowodów; cele niebezpieczne, sekretne, ignorowane,
generowane, binarne, nieaktualne, zbyt duże i osiągane przez dowiązania
symboliczne są odrzucane. Reset, przepisywanie historii, kasowanie gałęzi i
każda operacja wymuszona pozostają wyłącznie w swoim własnym interfejsie.

Merge albo rebase może zatrzymać się na konflikcie. Wtedy przebieg kończy się w
tym miejscu, karta oznacza ten wiersz jako nieudany i zachowuje licznik tego, co
już wykonano, a baner konfliktu przejmuje kontrolę dokładnie tak, jak przy tej
samej operacji uruchomionej z paska.

Cała partia jest ponownie sprawdzana przed pierwszym zapisem i wycofywana, gdy
któryś krok zawiedzie. Przed commitem Gitcito sprawdza też, czy coś jest w stage.
Karta oznacza akcje ukończone, nieudane i pominięte oraz zachowuje wynik
częściowy. Potem osobne wywołanie bez akcji podsumowuje rzeczywisty rezultat.

**Może też napisać `.gitcito.json`.** Czat dostaje kształt
[własnego pliku konfiguracyjnego repozytorium](repo-config.md), więc *dodaj
odnośniki do zgłoszeń dla JIRA-1234* albo *chroń gałęzie release* staje się
akcją na pliku pisaną wobec prawdziwego schematu, a nie wiarygodnie wyglądającymi
kluczami, które ładowarka odrzuci. Wymaga włączonych akcji na plikach — tego
samego przełącznika trybu tylko do odczytu.

**Wiersze, którym przyda się obrazek, dostają go.** Jednolinijkowe podsumowanie
wystarcza przy „dodaj dwa pliki do poczekalni” i zupełnie nie wystarcza przy
„otwórz cztery pull requesty na stosie”: wiersze opisujące kształt rysują go —
gałąź publikowaną przez push i o ile wyprzedza, dwie referencje merge’a lub
rebase’a, commity, które revert albo cherry-pick powtórzyłby, wraz z ich
tematami, pull requesta w docelowej postaci oraz stos jako drabinę z bazą
każdego poziomu i informacją, czy wysyłka go otworzy, przekieruje, czy zostawi.

### Akcje wychodzące poza tę maszynę

Pobieranie, pull, push, otwarcie pull requesta i wysłanie stosu są **domyślnie
wyłączone**, za opcją **Pozwól czatowi proponować akcje zdalne**. Publikowanie
pracy zasługuje na świadomą decyzję, a przy wyłączonej opcji model nie dowiaduje
się nawet, że takie akcje istnieją: nie może zaproponować jednej i zostać
odrzucony — a to właśnie ta usterka uczy ludzi włączać ustawienia bez czytania.

Po włączeniu:

| Akcja | Robi |
|---|---|
| **Pobierz** / **Pull** | Ten sam fetch i pull co z paska; tryb pulla (merge, tylko fast-forward, rebase) jest częścią propozycji |
| **Wyślij** | Publikuje jedną gałąź do jednego zdalnego repozytorium. **Nigdy z force**: wymuszony push nie istnieje w słowniku propozycji, więc nie da się go zaproponować |
| **Otwórz PR** | Otwiera jeden pull request, szkic lub nie, wobec origin repozytorium. Karta zachowuje potem odnośnik |
| **Wyślij stos** | Pełna wysyłka [stosu PR-ów](stacks.md): push każdego poziomu, otwarcie lub przekierowanie po jednym pull requeście, zapisanie sekcji nawigacji, rejestracja stosu w GitHubie |

![Plan czatu, który wysyła gałąź i otwiera pull requesta](../../screenshots/repo-chat-remote-actions.webp)

Proponowany push przechodzi najpierw te same zabezpieczenia co push z paska:
potwierdzenie gałęzi chronionej, ostrzeżenie o publikowaniu
[plików wyglądających na poświadczenia](security.md) i listę kontrolną
repozytorium przed pushem. To okna dialogowe, więc odpowiada się na nie przed
startem planu, a nie z jego wnętrza.

### Cofnięcie planu

Plan zatwierdza się jako całość, więc jako całość się go cofa. Przed pierwszą
akcją mogącą cokolwiek zmienić Gitcito zapisuje, gdzie stała gałąź, i robi
migawkę drzewa roboczego; ukończona karta oferuje wtedy **Cofnij plan**.
Przenosi gałąź z powrotem na ten commit i przywraca drzewo, co odrzuca wszystko,
co plan wytworzył — dlatego najpierw pyta i nazywa commit, do którego wraca.
Otwarte pull requesty pozostają otwarte: zdalnego repozytorium lokalna migawka
nie cofnie.

### Tryby zatwierdzania

Lista z tarczą pod polem wiadomości (także w **Ustawienia → AI → Czat
repozytorium**) decyduje, jak karta zostanie uruchomiona:

| Tryb | Uruchamia |
|---|---|
| **Zawsze pytaj** | Nic, dopóki nie naciśniesz **Uruchom** na karcie |
| **Automatycznie uruchamiaj bezpieczne akcje** | Propozycje złożone wyłącznie z odwracalnych porządków — stage, unstage, ignore, branch, tag — ruszają od razu po nadejściu; reszta czeka na przycisk |
| **Automatycznie uruchamiaj wszystkie akcje** | Każda propozycja rusza po nadejściu, z wyjątkiem destrukcyjnych |

Propozycja, która **odrzuciłaby niezatwierdzone zmiany, zawsze najpierw pyta**,
w każdym trybie, a potwierdzenie wymienia pliki, które by przepadły. Karta
zdaje sprawę z tego, co naprawdę się stało — ile akcji się wykonało albo jaki
błąd je zatrzymał — a asystent poznaje wynik, więc kolejne pytanie wie, czy
jego plan wykonano, czy odrzucono.

### Naprawianie błędów z asystentem

Gdy operacja Gita się nie powiedzie, a czat AI jest dostępny, toast błędu
zyskuje przycisk z iskierką: otwiera czat z opisem niepowodzenia wklejonym do
pola wiadomości, więc „czemu to się nie udało i co teraz” to jedno kliknięcie.
Szkic można edytować — nic nie zostanie wysłane, póki nie naciśniesz Wyślij.

## Czego odmawia

- **Pliki wyglądające na sekrety nigdy nie są czytane**, przypięte czy nie: chip
  wraca oznaczony jako pominięty, z powodem. Przypięcie nie omija
  [maskowania sekretów](security.md).
- **Pliki binarne i większe niż 512 KB** spoza repozytorium są pomijane tak samo.
  Wewnątrz obowiązują zwykłe reguły.
- **Nigdy nie zapisuje samodzielnie.** Model nie ma narzędzi, tylko tekst:
  zmiana przychodzi jako karta propozycji, uruchamia się wyłącznie według
  [twoich reguł zatwierdzania](#tryby-zatwierdzania), a krok destrukcyjny
  zawsze prosi o potwierdzenie. Przy wyłączonym ustawieniu **Proponowanie
  akcji Gita na czacie** nawet nie proponuje.
- **Rozmowy żyją tylko w pamięci.** Każde repozytorium ma własny wątek; wyjście z
  Gitcito je porzuca.

## Jak otworzyć

| Klawisze | Działanie |
|---|---|
| Przycisk dymka na pasku narzędzi | Przełącza kartę Czat |
| <kbd>⌘⌥B</kbd> / <kbd>Ctrl+Alt+B</kbd> | Przełącza cały prawy panel |
| <kbd>Enter</kbd> | Wysyła wiadomość |
| <kbd>Shift+Enter</kbd> | Wstawia nowy wiersz |

Resztę, w tym zmianę przypisania przełączników paneli, opisuje
[Klawiatura i skróty](keyboard.md).

**Zobacz też:** [Funkcje AI](ai.md) · [Bezpieczeństwo i sekrety](security.md) ·
[Wiki repozytorium](repo-wiki.md)
