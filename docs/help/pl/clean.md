---
title: Usuwanie plików nieśledzonych
category: Praca ze zmianami
order: 35
summary: Próba na sucho git clean — każda nieśledzona ścieżka z rozmiarem, pliki ignorowane osobno, a Kosz jako domyślny cel.
keywords: clean git clean nieśledzone usuń śmieci wynik budowania ignorowane gitignore próba na sucho kosz untracked remove delete junk build output dry run trash node_modules dist
---

# Usuwanie plików nieśledzonych

Drzewo robocze zbiera pliki, z których git nigdy nie zrobił kopii: notatkę na
brudno, `debug-output.txt`, `dist/` po nieudanym budowaniu, `node_modules` z
gałęzi, którą porzuciłeś w zeszłym miesiącu. Git ma na to jedno polecenie —
`git clean` — i jest to jedyna operacja gita, za którą **nic nie stoi**. Treść
nigdy nie była w commicie, więc nie ma wpisu w reflogu, nie ma stasha, nie ma
cofnięcia i nie ma zaklęcia `git`, które by to przywróciło.

Dlatego właśnie jest to operacja, którą ludzie uruchamiają w terminalu i której
żałują. Wersja Gitcito pokazuje całą listę, zanim cokolwiek się wydarzy.

`⌘K` → **Usuń pliki nieśledzone**.

![Ścieżki nieśledzone i ignorowane wypisane osobno, każda z rozmiarem, zanim cokolwiek zostanie usunięte](../../screenshots/clean.webp)

## Co znaczy ta lista

Każdy wpis to ścieżka, do której `git clean` mógłby sięgnąć, z rozmiarem na
dysku, w dwóch grupach:

| Grupa | Co to jest | Domyślnie zaznaczone |
|-------|-----------|---------------------|
| **Nieśledzone** | Nigdy nie zacommitowane, niedopasowane przez `.gitignore` | Tak |
| **Ignorowane** | Dopasowane przez `.gitignore` — wynik budowania, cache, `.env` | **Nie** |

W tym podziale tkwi cały sens. Ścieżki ignorowane są zwykle bezwartościowe, a od
czasu do czasu są jedyną kopią czegoś, co ma znaczenie: lokalnego `.env`, zrzutu
bazy, ściągniętego fixture'a. Nic, co pasuje do `.gitignore`, nie zostanie ci
nigdy zaznaczone.

W pełni nieśledzony **katalog to jeden wiersz**, a nie wiersz na plik — `tmp/`,
`dist/`, `node_modules/` — bo taka jest ziarnistość, z jaką git je usuwa,
a wypis 40 000 plików to wypis, którego nikt nie czyta. Jego rozmiar to suma
tego, co zawiera.

Katalog oznaczony jako **własne repozytorium** ma własny `.git`: klon, który
wrzuciłeś do środka tego repozytorium, albo eksperyment, którego nigdy nie
podpiąłeś. Git odmawia ich usunięcia (chce `-ff`, flagi, której Gitcito nie
oferuje) — bierze je Kosz.

## Kosz albo skasowanie

**Przenieś do Kosza** jest domyślnie włączone i w ogóle nie przechodzi przez
gita: ścieżki trafiają do systemowego Kosza, skąd możesz je odłożyć na miejsce.
To jedyna droga, która usuwa zagnieżdżone repozytorium, i jedyna, którą przeżyje
źle zaznaczony checkbox.

Wyłączenie tego to prawdziwe `git clean -f -d -x` na dokładnie zaznaczonych
ścieżkach — i prosi o potwierdzenie, mając przed tobą liczbę pozycji i łączny
rozmiar. Z tego nic się nie odzyskuje.

## Ograniczenia warte wiedzy

- **Tylko pliki nieśledzone.** Zmodyfikowany plik śledzony tu nie trafia — od
  tego jest [Odrzuć](staging.md), które przywraca go z indeksu albo z HEAD.
- **Lista jest ucięta** na pierwszych 400 ścieżkach. Jeśli repozytorium ma ich
  więcej, usuń to, co wypisane, i naciśnij **Skanuj ponownie** po resztę.
- **Rozmiary katalogów są przybliżone** dla bardzo dużych drzew: skanowanie
  zatrzymuje się po 20 000 plików, więc gigantyczne `node_modules` może wypaść
  mniejsze, niż jest naprawdę. Nigdy nie wypada większe.
- **Skan to migawka.** Jeśli budowanie zapisuje pliki przy otwartym oknie,
  naciśnij **Skanuj ponownie**, zanim cokolwiek usuniesz.
- Ścieżki są sprawdzane z własną listą plików usuwalnych gita, zanim cokolwiek
  zostanie ruszone, więc nic śledzonego nie da się przez to okno usunąć — nawet
  po nazwie.

Zobacz też: [Przechowalnia i odrzucanie](staging.md) · [Ignorowanie plików](hooks.md) ·
[Usuwanie pliku z historii](history-purge.md)
