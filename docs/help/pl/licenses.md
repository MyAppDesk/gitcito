---
title: Licencje open source
category: Dostosuj do siebie
order: 104
summary: Przeczytaj licencję każdego pakietu zewnętrznego dołączonego do tej wersji Gitcito.
keywords: licencje licenses uznanie autorstwa informacje open source MIT Apache BSD zewnętrzne zależności podziękowania o programie
---

# Licencje open source

Gitcito jest zbudowane na ponad dziewięćdziesięciu pakietach open source i prawie
wszystkie proszą w zamian o to samo: żeby ich informacja podróżowała razem z
programem. MIT, BSD i Apache mówią to w samym tekście. Ta strona jest miejscem tej
informacji, dzięki czemu obowiązek spełnia aplikacja, a nie plik, o którego
skopiowaniu ktoś musi pamiętać.

To także uczciwa odpowiedź na pytanie „co właściwie działa na mojej maszynie”.

## Jak otworzyć

Kliknij **numer wersji** na pasku stanu — otwiera to **Nowości** — a potem
**Licencje** w jego nagłówku. Albo otwórz paletę poleceń i wyszukaj *Licencje
open source*. Otwiera się we własnej karcie, tak jak Nowości.

![Karta licencji](../../screenshots/licenses.webp)

| Kolumna | Co to jest |
|---------|------------|
| Nazwa | Pakiet tak, jak opublikowano go w npm |
| Wersja | Dokładna wersja użyta w tej kompilacji |
| Etykieta | Identyfikator SPDX z manifestu pakietu |

Zaznacz wiersz, aby przeczytać pełny tekst licencji dołączony do pakietu. Ikona
linku otwiera stronę projektu w przeglądarce. Filtr przeszukuje nazwę pakietu i
identyfikator licencji, więc wpisanie `Apache` zawęża listę do pakietów na
licencji Apache.

## Co obejmuje, a czego nie

Lista jest generowana przy kompilacji z **drzewa zależności produkcyjnych** —
wszystkiego, co trafia do spakowanej aplikacji, łącznie z zależnościami
przechodnimi, o które nigdy nie prosiłeś wprost — plus sam Electron. Narzędzia
kompilacji, które nigdy nie są dystrybuowane, są celowo pominięte.

Dwa ograniczenia, które warto znać:

- **Kilka pakietów nie zawiera pliku licencji.** Deklarują identyfikator w
  manifeście i nic więcej. Te wiersze to mówią, zamiast wymyślać tekst, bo
  licencja, której nie da się przeczytać, nie jest licencją, na której można
  polegać.
- **Identyfikator to to, co deklaruje pakiet.** Gitcito go pokazuje, ale nie
  weryfikuje. Jeśli manifest pakietu jest błędny, ta strona myli się razem z nim.

Licencja samego Gitcito to MIT, a etykieta w prawym górnym rogu otwiera ją na
GitHubie.

**Zobacz też:** [Języki i pisanie od prawej do lewej](languages.md) · [Motywy i wygląd](themes.md)
