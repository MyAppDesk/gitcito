---
title: Lokale CI
category: Sync & viele Repos
order: 58
summary: Die GitHub Actions des Repos lokal mit act ausführen — bevor irgendetwas gepusht wird.
keywords: lokale ci local ci act actions workflow runner docker pipeline testen vor dem push before push nektos
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
