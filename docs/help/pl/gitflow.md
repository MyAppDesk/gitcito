---
title: Git flow
category: Gałęzie i operacje na historii
order: 46
summary: Zaczynaj i kończ feature'y, wydania i hotfixy bez zapamiętywania, która gałąź merguje się gdzie.
keywords: gitflow git flow feature release hotfix develop main master prefiks tag wersji model gałęzi start finish
---

# Git flow

[Model gałęzi git-flow](https://nvie.com/posts/a-successful-git-branching-model/)
to pięć reguł i mnóstwo księgowości. Reguły są łatwe; to księgowość ludzie mylą
o osiemnastej w dniu wydania — merge hotfixa do `main` i zapomnienie o
`develop`, albo otagowanie nie tej gałęzi.

`⌘K` → **Git flow** prowadzi tę księgowość.

![Okno git flow na gałęzi release: rozpoczęcie gałęzi u góry, jej zakończenie na dole](../../screenshots/gitflow.webp)

## Układ

| Gałąź | Zawiera |
|--------|-------|
| **Gałąź wydań** (`main`) | To, co jest na produkcji. Każde wydanie jest tutaj otagowane. |
| **Gałąź integracyjna** (`develop`) | Miejsce, gdzie skończona praca zbiera się między wydaniami. |
| `feature/*` | Jedna jednostka pracy, odbita od develop. |
| `release/*` | Stabilizowana wersja, odbita od develop. |
| `hotfix/*` | Pilna poprawka, odbita od **main** — produkcja nie może czekać na develop. |

Gitcito czyta i zapisuje te same klucze konfiguracji `gitflow.*`, których używa
CLI `git flow` (`gitflow.branch.master`, `gitflow.prefix.feature`, …).
Repozytorium, na którym ktoś już uruchomił `git flow init`, jest rozpoznawane
od razu, a repozytorium skonfigurowane tutaj działa potem z CLI. Gitcito
uruchamia przez cały czas zwykłe polecenia gita — CLI nie musi być
zainstalowane.

**Skonfiguruj** zapisuje te klucze i, jeśli gałąź integracyjna jeszcze nie
istnieje, tworzy ją z gałęzi wydań. Nic więcej nie jest ruszane. Każdą nazwę
i prefiks możesz zmienić później przez **Edytuj układ**.

## Rozpoczynanie

Wybierz rodzaj, wpisz nazwę, naciśnij **Zacznij**. Okno pokazuje gałąź, którą
zamierza utworzyć, i gałąź, z której ją utworzy, zanim się na to zdecydujesz:

```
feature/search   from develop
hotfix/1.0.1     from main
```

Nazwa to to, co wpiszesz; prefiks bierze się z układu.

## Kończenie

**Zakończ** to ta część warta zautomatyzowania, bo to kilka kroków, z których
wszystkie muszą się wydarzyć:

| Rodzaj | Co robi Gitcito |
|------|-------------------|
| Feature | Merguje do develop przez `--no-ff`, usuwa gałąź, zostawia cię na develop |
| Release | Merguje do main, taguje, merguje do develop, usuwa gałąź, zostawia cię na develop |
| Hotfix | Merguje do main, taguje, merguje do develop, usuwa gałąź, zostawia cię na **main** |

`--no-ff` jest celowe: to commit scalający sprawia, że gałąź jest potem widoczna
w [grafie](graph.md). Bez niego krótki feature znika w prostej linii, a model
traci to, po co powstał.

Tag to `<prefiks tagu wersji><nazwa>` — `release/1.1.0` staje się `v1.1.0` przy
domyślnym prefiksie. Odznacz **Otaguj wydanie**, żeby to pominąć, i napisz
wiadomość taga, jeśli chcesz czegoś więcej niż domyślnej.

### Czego odmawia

- **Brudne drzewo robocze go zatrzymuje.** Najpierw zacommituj albo zrób
  [stash](stashes.md); zakończenie merguje dwie gałęzie i przesuwa HEAD dwa
  razy, a robienie tego wokół niezacommitowanej pracy to sposób, w jaki ludzie
  ją tracą.
- **Konfliktujący merge cofa całość.** Gdyby merge do main się powiódł, a merge
  do develop wszedł w konflikt, zostałbyś z na wpół skończonym wydaniem. Gitcito
  przywraca każdą gałąź tam, gdzie była, i zgłasza konflikt. Zmerguj tamtą gałąź
  ręcznie, rozwiąż ją w [edytorze konfliktów](conflicts.md), a resztę przepływu
  dokończysz własnoręcznie.
- **Nigdy nie robi pusha.** Zakończenie jest lokalne. Wypchnij main, develop
  i nowy tag, kiedy będziesz gotów — zobacz [synchronizację](syncing.md).

### Cofnij

Jedno **Cofnij** przywraca wszystko: obie gałęzie wracają do swoich poprzednich
commitów, tag zostaje usunięty, a zakończona gałąź odtworzona na swoim starym
czubku. To cały powód, dla którego zakończenie da się bezpiecznie wypróbować.

## Kiedy z tego nie korzystać

Git flow pasuje do oprogramowania z wersjonowanymi wydaniami i wspieraną gałęzią
produkcyjną. Jeśli wdrażasz z `main` kilka razy dziennie, gałęzie release
i hotfix to ceremoniał, z którego nie skorzystasz — lepiej pasują tam
[gałęzie w stosie](stacks.md) albo zwykłe krótko żyjące gałęzie od `main`.
Featureowa połowa modelu wciąż działa świetnie sama z siebie.
