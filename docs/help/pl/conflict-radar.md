---
title: Radar konfliktów
category: Gałęzie i operacje na historii
order: 44
summary: Zobacz, które gałęzie wejdą w konflikt, zanim którąkolwiek zmergujesz.
keywords: radar konfliktów podgląd merge ryzyko gałęzie kolizja conflict radar merge preview clash risk branches merge-tree
---

# Radar konfliktów

Dowiadywanie się, że gałąź wchodzi w konflikt, poprzez jej zmergowanie to
kosztowny sposób zadania pytania. Radar odpowiada na nie wcześniej.

Gitcito merguje każdą gałąź do wybranej przez ciebie bazy **wewnątrz bazy
obiektów** (`git merge-tree --write-tree`). Bez przełączania, bez zmiany indeksu,
bez zmiany drzewa roboczego, bez sprzątania po fakcie. Twoja niezacommitowana
praca może zostać dokładnie tam, gdzie jest, przez cały czas trwania skanu.

![Radar, jeden werdykt na gałąź](../../screenshots/conflict-radar.webp)

![Skanowanie gałąź po gałęzi, a potem otwarcie spornych plików](../../screenshots/clip-conflict-radar.webp)

## Jak go używać

Otwórz go z menu narzędzi, przez <kbd>⌘K</kbd> → *Radar konfliktów* albo kliknij
gałąź prawym przyciskiem, żeby przeskanować wszystko względem **tamtej** gałęzi.

Skanuje od razu po otwarciu, biorąc twoją bieżącą gałąź za bazę.

| Werdykt | Znaczenie |
|---|---|
| **Wejdzie w konflikt** | Zmergowanie wymaga rąk. Dokładne ścieżki są wypisane. |
| **Merguje się czysto** | Nałożyłaby się bez walki. |
| **Już wewnątrz** | Baza już ją zawiera — nie ma czego mergować. |
| **Nieudane** | Git odmówił: niepowiązane historie, brakująca referencja. Powód jest pokazany. |

Gałęzie sortują się od najgorszej, a najgorsza z najgorszych — ta dotykająca
największej liczby plików — idzie na sam wierzch.

## Sporne pliki

Poniżej **Sporne pliki** układają ścieżki według tego, ile gałęzi je przepisuje.
Dwie gałęzie bijące się o jeden plik to rozmowa do odbycia teraz; pięć to
problem projektowy.

## Po skanie

Wiersze gałęzi w panelu bocznym noszą kolorową kropkę: czerwona wejdzie
w konflikt, zielona jest czysta, bursztynowa to gałąź, której git odmówił.
Gałęzie już zawarte w bazie nie dostają kropki — rząd szarych kropek przy
wszystkim, co już zmergowane, to zwykły szum.

> Skanowanie niczego nie zmienia. `git status` zostaje czysty, a HEAD się nie
> rusza.

**Zobacz też:** [Co się zmieniło od](range-diff.md) · [Merge i rebase](merging.md)
