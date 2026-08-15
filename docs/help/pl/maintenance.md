---
title: Konserwacja repozytorium
category: Repozytorium i historia
order: 15
summary: Ile repozytorium kosztuje na dysku, ile z tego da się odzyskać i co każde zadanie gita naprawdę zrobi.
keywords: konserwacja odśmiecanie repack miejsce na dysku rozmiar optymalizacja luźne spakowane obiekty maintenance gc garbage collect prune fsck count-objects loose packed commit-graph git maintenance schedule dangling
---

# Konserwacja repozytorium

Git nigdy nie mówi ci, ile repozytorium kosztuje. Działa dalej niezależnie od
tego, w jakim stanie jest jego baza obiektów, więc pierwszym sygnałem kłopotów
jest zwykle klon, który się wlecze, albo laptop bez wolnego miejsca — długo po
momencie, w którym jedno polecenie by to naprawiło.

Ten panel jest tym brakującym odczytem: dokąd poszło miejsce, ile z niego da się
odzyskać i co robi każde zadanie, zanim je uruchomisz.

`⌘K` → **Konserwacja repozytorium**.

![Zużycie dysku rozbite na spakowane, luźne i nieosiągalne, z zadaniami konserwacji pod spodem](../../screenshots/maintenance.webp)

## Czytanie liczb

Wszystko pochodzi z `git count-objects -v` i z prawdziwego przejścia po
osiągalności — nic nie jest szacowane.

| Wiersz | Co to jest | Dlaczego rośnie |
|-----|-----------|--------------|
| **Spakowane** | Obiekty wewnątrz packfile'ów, skompresowane i zdeltowane | To jest stan zdrowy |
| **Luźne** | Jeden plik na obiekt, ledwo skompresowany | Każdy commit i każdy fetch takie zapisuje |
| **Nieosiągalne** | Obiekty, na które już nic nie wskazuje | Porzucone commity, poprawione wiadomości, zarzucone rebase'y |

Liczba obok **Luźne** — *„n obiektów, m już spakowanych"* — jest tą wartą
obserwowania. Te `m` są przechowywane podwójnie: raz luźno, raz w paczce. To
czysta duplikacja, a `git gc` jest tym, co ją zwija.

**Nieosiągalne to jeszcze nie śmieci.** To dzięki tym obiektom `git reflog`
przywraca commit, który zresetowałeś. Git trzyma je przez dwa tygodnie celowo.

## Zadania

| Przycisk | Uruchamia | Koszt |
|--------|------|------|
| **Zoptymalizuj** | `git gc` | Sekundy do minuty. Prawie zawsze właściwa odpowiedź |
| **Przepakuj od zera** | `git gc --aggressive` | Minuty na dużym repozytorium. Przelicza każdą deltę |
| **Przebuduj graf commitów** | `git commit-graph write --reachable` | Szybkie. Zauważalnie przyspiesza przechodzenie logu i grafu |
| **Sprawdź spójność** | `git fsck --dangling` | Wolne na dużym repozytorium, niczego nie zmienia |
| **Usuń nieosiągalne teraz** | `git gc --prune=now` | Niszczy siatkę bezpieczeństwa reflogu |

**Zoptymalizuj** to ta, po którą się sięga. Pakuje luźne obiekty, wyrzuca to, co
jest nieosiągalne od ponad dwóch tygodni, i zostawia niedawną historię
odzyskiwalną.

**Przepakuj od zera** jest przereklamowane. Wyrzuca każdą istniejącą deltę
i przelicza od nowa, co zabiera minuty i zwykle oszczędza kilka procent
w stosunku do zwykłego gc. Warto zrobić to raz po zaimportowaniu ogromnej
historii; nie warto rutynowo.

**Usuń nieosiągalne teraz** najpierw pyta, a potwierdzenie mówi, ile obiektów
i ile miejsca. Po nim commit, który zresetowałeś godzinę temu, jest nie do
odzyskania — wpis w reflogu może wciąż być wypisany, ale obiektu za nim już nie
ma.

## Sprawdzenie spójności

`git fsck` weryfikuje, że każdy obiekt referowany przez inny obiekt jest
faktycznie obecny i wewnętrznie spójny.

- **Obiekty wiszące są normalne.** To te nieosiągalne, wypisane po nazwie.
  Repozytorium z setkami takich po rebasie jest zdrowe.
- **Obiekty brakujące to uszkodzenie** — ucięty zapis, zły dysk, przerwany
  transfer. Jeśli jakieś się pojawią, nie przepakowuj: przepakowanie uszkodzonej
  bazy potrafi zamienić problem odzyskiwalny w trwały. Sklonuj dobrą kopię ze
  swojego zdalnego repozytorium i przenieś swoje niewypchnięte gałęzie
  [bundlem](export.md).

## Konserwacja w tle

Ten checkbox rejestruje repozytorium w **`git maintenance`**, które pakuje
i prefetchuje według harmonogramu uruchamianego przez twój system operacyjny
(launchd, systemd albo Harmonogram zadań).

Nic tutaj nie jest specyficzne dla Gitcito: ten sam harmonogram służy twojemu
terminalowi, a `git maintenance unregister` odkręca to z dowolnego miejsca.
Odznaczenie checkboxa robi dokładnie to i zostawia harmonogram na miejscu dla
wszystkich innych zarejestrowanych repozytoriów.

## Ograniczenia warte wiedzy

- **Licznik nieosiągalnych wymaga pełnego przejścia po osiągalności**, więc
  otwarcie panelu na bardzo dużym repozytorium chwilę trwa. To uczciwa liczba,
  nie szacunek.
- **Rozmiary to to, co oddaje dysk**, a nie długość treści. Luźny obiekt na 400
  bajtów wciąż zajmuje blok 4 KB — dlatego tysiąc takich kosztuje megabajty
  i dlatego warto je pakować.
- **Worktree albo podmoduł ma własny `.git`**, więc pokazany rozmiar dotyczy
  wyłącznie tego repozytorium.
- **Konserwacja nie potrafi zmniejszyć historii.** Jeśli blob na 400 MB siedzi
  w commicie, jest osiągalny i gc będzie go trzymać w nieskończoność — to jest
  [usuwanie pliku z historii](history-purge.md), operacja inna i o wiele
  bardziej wywrotowa.
- **Gitcito nigdy nie uruchamia gc za twoimi plecami.** Własne `gc --auto` gita
  wciąż może, tak jak zawsze; jeśli któreś zawiedzie, zostawia notatkę
  w `.git/gc.log`, którą ten panel wyciąga na wierzch.

Zobacz też: [Usuwanie pliku z historii](history-purge.md) ·
[Bundle i archiwa](export.md) · [Odzyskiwanie](recovery.md)
