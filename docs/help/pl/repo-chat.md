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

Czat repozytorium może proponować dokładne edycje, tworzenie lub pełne
zastępowanie oraz usuwanie plików, a następnie akcje Git asystenta **Uruchom**.
Gitcito oblicza rozwijany diff lokalnie. Istniejące pliki muszą pochodzić z
odczytanych dowodów; odrzucane są cele niebezpieczne, tajne, ignorowane,
generowane, binarne, nieaktualne, zbyt duże lub dostępne przez symlink. Push,
pull, reset, rebase i operacje force pozostają we właściwym interfejsie.

Cała partia jest ponownie sprawdzana przed pierwszym zapisem i wycofywana, gdy
któryś krok zawiedzie. Przed commitem Gitcito sprawdza też, czy coś jest w stage.
Karta oznacza akcje ukończone, nieudane i pominięte oraz zachowuje wynik
częściowy. Potem osobne wywołanie bez akcji podsumowuje rzeczywisty rezultat.

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
