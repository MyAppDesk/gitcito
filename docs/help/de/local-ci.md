---
title: Lokale CI
category: Sync & viele Repos
order: 58
summary: Die GitHub Actions des Repos lokal mit act ausführen — bevor irgendetwas gepusht wird.
keywords: lokale ci local ci act actions workflow runner docker pipeline testen vor dem push before push nektos verdict badge notes per-commit urteil notizen pro commit
---

# Lokale CI

Die Schleife push–warten–rotes Kreuz–fixen–push verschwendet zehn Minuten pro
Runde. Mit [act](https://nektosact.com) laufen dieselben Workflows in
Docker-Containern auf deinem Rechner, und Gitcito steuert sie: Workflow
auswählen, Ausführen drücken, dasselbe Log verfolgen, das die CI ausgeben würde
— bevor irgendetwas deinen Rechner verlässt.

![Lokale CI](../../screenshots/local-ci.webp)

## Eine Integration, keine mitgelieferte Runtime

Gitcito liefert act und Docker ganz bewusst **nicht** mit — eine App, die eine
Container-Runtime mitschleppt, ist das Gegenteil eines Git-Clients. Es ist eine
Opt-in-Integration: aktiviere sie unter **Einstellungen → Integrationen** (oder
direkt im Dialog), und Gitcito erkennt, was installiert ist, und führt dich
durch den Rest — `brew install act`, ein laufender Docker-Daemon, fertig.
Nichts läuft, bevor alle drei Bedingungen erfüllt sind: aktiviert, act
installiert, Docker erreichbar.

## Was es tut

- Listet jeden Workflow unter `.github/workflows` auf, nach seinem `name:`.
- **Ausführen** startet den Workflow mit act gegen deinen **Arbeitsbaum** —
  ungecommittete Änderungen eingeschlossen, und genau das ist der Punkt: testen
  vor dem Commit, nicht nach dem Push.
- Die Ausgabe streamt live in den Dialog; **Stoppen** beendet den Lauf. Exit 0
  zeigt **Bestanden**, alles andere **Fehlgeschlagen** mit dem Code.

## Urteile pro Commit im Graphen

![Local-CI-Urteile im Graphen](../../screenshots/local-ci-verdicts.webp)

Ein abgeschlossener Lauf heftet sein Ergebnis an den Commit, den er getestet
hat: ein kleiner Kolben markiert die Zeile im Graphen **grün oder rot**, sodass
du auf einen Blick siehst, welche Commits die CI lokal schon überstanden haben.
Das Urteil wird als Git-Note unter `refs/notes/gitcito-ci` gespeichert — lokal
auf deinem Rechner, standardmäßig nie gepusht.

Ehrlichkeitsregel: Das Urteil wird nur angeheftet, wenn dein Arbeitsbaum
**sauber** war. Ein Lauf über ungecommittete Änderungen hat etwas getestet, das
kein Commit enthält — er zeigt sein Ergebnis also im Dialog, markiert aber
nichts.

## Grenzen

- act ist eine sehr gute Imitation der GitHub-Runner, keine perfekte: Actions,
  die von GitHub gehostete Dienste, Secrets oder exotische Runner-Images
  brauchen, können sich anders verhalten. Ein lokales Grün ist ein starkes
  Indiz, keine Garantie.
- Ein Lauf pro Repository zur gleichen Zeit; ein weiterer Start bricht den
  ersten ab.
- Nur Läufe auf Workflow-Ebene — einzelne Jobs, Matrizen oder Events
  auszuwählen ist act-Territorium; führe es im
  [Integrierten Terminal](terminal.md) aus, wenn du Flags brauchst.
- Der erste Lauf lädt die Runner-Images herunter — rechne damit, dass er einmal
  langsam ist.

**Siehe auch:** [Hosting & Pull Requests](hosting.md) · [Integriertes Terminal](terminal.md)
