---
title: Erste Schritte
category: Erste Schritte
order: 1
summary: Ein Repository öffnen, den Graphen lesen, den ersten Commit machen.
keywords: einführung intro erste schritte first steps öffnen open clone klonen tabs graph commit
---

# Erste Schritte

Gitcito öffnet einen Ordner und zeigt dir seine Historie. In dein Repository wird
nichts geschrieben, bevor du nicht darum bittest.

![Ein frisch geöffnetes Repository, noch ohne Commits](../../screenshots/empty-repo.webp)

## Ein Repository öffnen

- **Zieh einen Ordner** auf das Fenster, oder nutze **Repository öffnen** auf dem
  Willkommensbildschirm.
- **Klone** eines von einer URL oder direkt von deinem Hoster — unter
  [Klonen](cloning.md) stehen die Optionen, die ein riesiges Repository schnell
  klonbar machen.
- Aus einem Terminal öffnet `gitcito .` den aktuellen Ordner in der laufenden
  App — siehe [die Kommandozeile](cli.md).
- Ein Ordner, der noch kein Git-Repository ist, lässt sich trotzdem öffnen; dabei
  wird angeboten, ihn zu initialisieren.

## Die drei Bereiche

| Bereich | Was er enthält |
|---|---|
| Links | Branches, Remotes, Tags, Stashes, Worktrees — und der Tab **Dateien** für das Arbeitsverzeichnis |
| Mitte | Der Commit-Graph, und was immer du daraus auswählst |
| Rechts | Der Commit-Composer, oder die Details des ausgewählten Commits |

## Alles Übrige finden

Zwei Wege, und sie führen an dieselben Stellen:

- **`⌘K`** (`Ctrl+K`) — die Befehlspalette. Tipp, was du willst; sie springt auch
  zu Branches, Commits und Dateien.
- **Werkzeuge** in der Symbolleiste — derselbe Satz an repository-bezogenen
  Aktionen als Menü, mit dem langen Rest in Gruppen gefaltet, damit es lesbar
  bleibt.

![Das Werkzeuge-Menü: die häufigen Werkzeuge zuerst, der Rest gruppiert](../../screenshots/tools-menu.webp)

Wird das Fenster schmal, kämpft die Aktionsleiste nicht mehr um Platz: Schaltflächen, die nicht mehr passen, wandern in ein Menü **Mehr** am Ende — in der Reihenfolge der Leiste und mit ihren Untermenüs. Wird das Fenster breiter, kommen sie zurück.

Alles, was über den einen Weg erreichbar ist, ist auch über den anderen
erreichbar — es gibt also nichts, das nur Power-User finden.

## Dein erster Commit

1. Bearbeite eine Datei. Sie erscheint unter **Nicht gestaged**.
2. Stage sie — die ganze Datei, einen Hunk oder [einzelne Zeilen](staging.md).
3. Schreib eine Nachricht und drück **Commit**.

Alles andere in Gitcito ist optional.

