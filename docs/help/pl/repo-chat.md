---
title: Czat repozytorium
category: AI
order: 82
summary: Pytaj o to repozytorium, korzystając z plików i commitów przypiętych jako kontekst.
keywords: czat pytanie pytaj asystent kontekst przypnij załącz przeciągnij upuść commit plik dowód ugruntowany ai panel
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

Gdy AI jest wyłączone w całości, czat znika razem z nim — żaden panel nie
proponuje odpowiedzi, której nic nie może udzielić.

Model czatu można przełączyć także w nagłówku samego panelu, obok nazwy dostawcy
— to to samo ustawienie, bez otwierania Ustawień.

![Ustawienia czatu repozytorium](../../screenshots/settings-repo-chat.webp)

## Czego odmawia

- **Pliki wyglądające na sekrety nigdy nie są czytane**, przypięte czy nie: chip
  wraca oznaczony jako pominięty, z powodem. Przypięcie nie omija
  [maskowania sekretów](security.md).
- **Pliki binarne i większe niż 512 KB** spoza repozytorium są pomijane tak samo.
  Wewnątrz obowiązują zwykłe reguły.
- **Nigdy nie zapisuje.** Żadnego dodawania do przechowalni, commitów ani zmiany
  gałęzi — nie ma narzędzi, tylko tekst. Odpowiedź twierdząca, że coś zrobiła,
  opisuje, a nie relacjonuje.
- **Rozmowy żyją tylko w pamięci.** Każde repozytorium ma własny wątek; wyjście z
  Gitcito je porzuca.

## Jak otworzyć

| Klawisze | Działanie |
|---|---|
| Przycisk dymka na pasku narzędzi | Przełącza kartę Czat |
| <kbd>⌘⌥B</kbd> / <kbd>Ctrl+Alt+B</kbd> | Przełącza cały prawy panel |
| <kbd>⌘⏎</kbd> / <kbd>Ctrl+Enter</kbd> | Wysyła wiadomość |

Resztę, w tym zmianę przypisania przełączników paneli, opisuje
[Klawiatura i skróty](keyboard.md).

**Zobacz też:** [Funkcje AI](ai.md) · [Bezpieczeństwo i sekrety](security.md) ·
[Wiki repozytorium](repo-wiki.md)
