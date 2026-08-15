---
title: Eksplorator obiektów
category: Repozytorium i historia
order: 16
summary: Przejdź się po warstwie pod grafem — commity, drzewa, bloby, tagi i referencje, które na nie wskazują. Nic tutaj niczego nie zmienia.
keywords: obiekty eksplorator blob drzewo commit tag referencja hydraulika wnętrzności baza objects object explorer tree ref plumbing cat-file ls-tree sha1 internals rev-parse HEAD^{tree} loose packed
---

# Eksplorator obiektów

Git ma opinię skomplikowanego. Prawie cała bierze się z tego, że nigdy nie widać
modelu: **cztery rodzaje obiektów i wskaźniki**. Kiedy raz klikniesz commit,
wylądujesz na jego drzewie i odkryjesz, że twój plik *jest* blobem, któremu
nazwę nadało drzewo, porcelana przestaje być magią.

`⌘K` → **Eksplorator obiektów**. Nic na tej stronie nie potrafi zmienić ani
jednego bajtu — każde wywołanie za nią jest odczytem.

![Pola commita, z jego drzewem i rodzicami jako linkami, obok listy referencji](../../screenshots/objects.webp)

## Cztery obiekty

| Obiekt | Jest | Wie |
|--------|----|-------|
| **blob** | *Zawartością* pliku | Niczym. Ani swojej nazwy, ani ścieżki, ani historii |
| **tree** | Spisem katalogu | Nazwy, tryby i sha każdego dziecka: bloba albo drzewa |
| **commit** | Jedną migawką | Swoje drzewo, swoich rodziców, autora, commitera, wiadomość |
| **tag** | Tagiem anotowanym | Obiekt, na który wskazuje, tagującego, wiadomość |

Zaskoczeniem dla większości ludzi jest pierwszy wiersz. **Blob nie ma nazwy.**
Dwa pliki o identycznej treści, gdziekolwiek w twojej historii, to ten sam blob,
przechowany raz. Nazwa mieszka w drzewie, które na niego wskazuje — i dlatego
git śledzi treść, a nie pliki, i dlatego zmiany nazw są wykrywane, a nie
zapisywane.

**Referencja** — `refs/heads/main`, `refs/tags/v1.0`, `HEAD` — to zwykły plik
zawierający sha. I to jest całe „gałęzie są tanie".

## Chodzenie po tym

Lewa kolumna wypisuje każdą referencję w repozytorium, pogrupowaną tak, jak
grupuje je git. Kliknij którąś, żeby wylądować na obiekcie, który nazywa.

Stamtąd wszystko jest linkiem:

- **Commit** pokazuje swoje `tree` i każdego `parent` — przeklikaj się do
  migawki albo wstecz przez historię, commit po commicie.
- **Drzewo** wypisuje swoje wpisy z trybem, typem, sha i rozmiarem. Kliknij
  nazwę, żeby otworzyć dziecko.
- **Blob** pokazuje swój tekst (dla czegoś dużego — jego początek) albo mówi
  wprost, że jest binarny.
- **Tag anotowany** pokazuje, na co wskazuje — przeklikaj się do commita.

**Wstecz** cofa twoje kroki.

## Wpisywanie rewizji

Pole przyjmuje wszystko, co przyjmuje `git rev-parse` — i tutaj to przestaje być
przeglądarką, a zaczyna być sposobem na naukę:

| Wpisz to | Żeby dostać |
|-----------|--------|
| `HEAD` | Bieżący commit |
| `HEAD~3` | Trzy commity wstecz |
| `HEAD^{tree}` | Drzewo tego commita, obrane |
| `HEAD:src/app.ts` | Blob dla tej ścieżki, wprost |
| `v1.0^{}` | To, na co wskazuje tag anotowany, zamiast samego obiektu taga |
| `a1b2c3d` | Dowolny obiekt, po sha — skróty działają |

Cyfry trybu w spisie drzewa warto znać: `100644` to plik, `100755` plik
wykonywalny, `040000` poddrzewo, `120000` dowiązanie symboliczne, `160000`
gitlink podmodułu — a ten ostatni to całość tego, co podmoduł przechowuje.

## Ograniczenia warte wiedzy

- **Tylko do odczytu, celowo.** Nie ma tu czym pisać. Tworzenie obiektów ręcznie
  to ćwiczenie z `git hash-object` i należy do terminala.
- **Duże bloby są ucinane** po pierwszych 200 KB — dość, żeby zobaczyć, co to
  jest, i za mało, żeby zawiesić okno.
- **Rozmiary to rozmiar treści obiektu** tak, jak raportuje go
  `git cat-file -s`, a nie to, ile kosztuje on na dysku po spakowaniu. Po tamto
  sięgnij do [konserwacji](maintenance.md).
- **Obiekty nieosiągalne to wciąż obiekty.** Wklej sha z raportu wiszących
  obiektów `git fsck`, a się otworzy — i to często najszybszy sposób, żeby
  zobaczyć, co zawierał zgubiony commit, zanim zdecydujesz, czy go odzyskać.

Zobacz też: [Graf](graph.md) · [Konserwacja repozytorium](maintenance.md) ·
[Odzyskiwanie](recovery.md)
