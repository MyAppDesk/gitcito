---
title: TODO w kodzie
category: Narzędzia przestrzeni roboczej
order: 93
summary: Każde TODO, FIXME i HACK w źródłach, pogrupowane według znacznika, właściciela albo folderu.
keywords: todo fixme hack xxx note znacznik znaczniki komentarz komentarze drzewo etykieta właściciel przypisane cgm dług techniczny grep skan
---

# TODO w kodzie

TODO to obietnica, którą ktoś złożył sobie samemu, a potem o niej zapomniał.
Pisze się ją tam, gdzie jest problem — czyli dokładnie tam, gdzie nikt już nie
zagląda — a kiedy zaczyna mieć znaczenie, autor jest już w innym zespole. Grep
je znajduje, a tysiąc linii wyniku grepa to to samo, co ich nieznalezienie.

Karta **TODO** w doku analizatora czyta je wszystkie i robi to, czego grep nie
potrafi: grupuje. Otwórz dok z paska stanu albo z palety poleceń (`TODO w
kodzie`) i przejdź na drugą kartę.

Pasek stanu liczy znaczniki obok błędów i ostrzeżeń analizatorów; kliknięcie
tego licznika otwiera tę kartę.

![Karta TODO, pogrupowana według właściciela](../../screenshots/code-todos.webp)

## Co liczy się jako znacznik

Etykieta, w komentarzu, w pliku, który Git śledzi lub śledziłby:

| Zapisane | Odczytane jako |
|----------|----------------|
| `// TODO: wypuść to` | znacznik `TODO`, bez właściciela |
| `//todo wypuść to` | to samo — dwukropek i spacja są opcjonalne |
| `# todo wypuść to` | to samo — wielkość liter ani język nie mają znaczenia |
| `/* TODO(cgm): wypuść to */` | znacznik `TODO`, właściciel `cgm` |
| `-- TODO (CGM) wypuść to` | ten sam właściciel: `cgm`, `(CGM)` i `[cgm]` to jedna osoba |
| `<!-- TODO: @cgm wypuść to -->` | znowu to samo |

Znaczniki to `TODO`, `FIXME`, `BUG`, `HACK`, `XXX`, `NOTE`, `OPTIMIZE`,
`REVIEW`, `REFACTOR`, `DEPRECATED`, `QUESTION`, `IDEA`, `WIP` i `TEMP`. Pierwsze
cztery mają kolor, bo „to jest zepsute” i „to taki mój pomysł” nie powinny
wyglądać w liście tak samo.

Znacznik musi stać za początkiem komentarza — `//`, `#`, `--`, `;`, `%`, `/*`,
`*`, `<!--`, `"""`. Nic innego się nie liczy: `todo = [l for l in lines]` to kod,
a panel liczący przypisanie zmiennej jako dług to panel, któremu nie ufa się po
raz drugi. Ta sama zasada trzyma poza listą funkcję o nazwie `reviewNotes`.

## Grupowanie jest sednem

Cztery osie, każda na jedno kliknięcie:

| Grupuj według | Odpowiada na |
|---------------|--------------|
| **Znacznika** | Jakiego rodzaju dług niesie to repozytorium? |
| **Właściciela** | Co zostawiła każda osoba — i co leży na stosie nieprzypisanych? |
| **Folderu** | Który zakątek drzewa gnije? |
| **Pliku** | Zwykła lista, kiedy już wiesz, dokąd zmierzasz. |

**Nieprzypisane** to prawdziwa grupa, a nie resztki: znaczniki, przy których
nikt nie postawił swojego imienia, to te, których nikt nigdy nie podnosi, a
zobaczenie ich policzonych jest tu całym sensem.

Żetony znaczników u góry filtrują listę; robi to też kliknięcie plakietki
właściciela w wierszu oraz pole wyszukiwania, które dopasowuje treść, plik,
znacznik i właściciela. **Tylko zmienione** zawęża do plików, które
zmodyfikowałeś, a jeszcze nie zatwierdziłeś — ostatnia kontrola przed pushem,
gdy `// FIXME` zostawione godzinę temu właśnie ma stać się trwałe.

Kliknięcie wiersza otwiera plik w tej linii.

## Czego nie robi

- **Czyta, nigdy nie zapisuje.** Nie ma „oznacz jako zrobione”: TODO zamyka się,
  usuwając linię i zatwierdzając to. Listę, którą Gitcito prowadzi za ciebie,
  opisuje [todos](todos.md) — zupełnie co innego: prywatne notatki żyjące w
  aplikacji, nie w kodzie.
- **Pliki ignorowane są pomijane**, razem z `node_modules`, cokolwiek mówią
  znaczniki w środku. Pliki nieśledzone wchodzą do wyniku: znacznik napisany
  pięć minut temu najbardziej warto zobaczyć.
- **Nie odróżnia komentarza od napisu.** Linia `const banner = "// TODO"` jest
  dla skanu znacznikiem. Nie ma parsera czterdziestu języków i nie udaje, że ma.
- **Skan to zdjęcie chwili.** Po edycji pliku panel zachowuje swoje liczby aż do
  ponownego skanu; przycisk odświeżania to cała historia.
- **Zatrzymuje się na 5000 znaczników.** Repozytorium powyżej tej granicy ma
  problem z długiem, którego żaden panel nie rozwiąże.

## Gdzie się wykonuje

Jeden `git grep` po drzewie roboczym — dlatego trwa milisekundy tam, gdzie karta
[Problemy](problems.md) potrzebuje sekund: nic się nie kompiluje, żaden łańcuch
narzędzi nie bierze udziału, a wyszukiwanie omija pliki binarne i ścieżki
ignorowane, bo Git i tak wie, które to są.
