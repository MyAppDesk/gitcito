---
title: Beliebige Commits bearbeiten
category: Branches & Eingriffe
order: 46
summary: Dateien oder Nachricht eines historischen Commits an Ort und Stelle umschreiben — die Kaskade wird vorher als Vorschau gezeigt.
keywords: commit bearbeiten edit historie umschreiben rewrite history amend vergangenheit reword tippfehler typo korrigieren kaskade cascade replay rebase in place eingriff surgery
---

# Beliebige Commits bearbeiten

Der Tippfehler steckt in einem Commit von vor drei Wochen. Die übliche Lösung
ist ein interaktiver Rebase: beim Commit anhalten, bearbeiten, fortsetzen,
beten. Gitcitos Lösung ist: Rechtsklick auf den Commit, **Diesen Commit
bearbeiten**, Text ändern, fertig. Der Stift-Button im Commit-Details-Panel
öffnet denselben Editor.

![Einen historischen Commit bearbeiten](../../screenshots/commit-edit.webp)

## Was es tut

Wähle einen beliebigen Commit, der ein Vorfahre von `HEAD` ist — lineare
Historie oder nicht. Der Dialog zeigt seine Dateien und seine Nachricht;
bearbeite eines von beidem. Von dort aus passieren zwei Dinge:

1. **Kaskaden-Vorschau** spielt jeden Commit oberhalb des bearbeiteten *im
   Speicher* nach (eine Kette von `merge-tree`-Cherry-Picks — kein Checkout,
   kein Arbeitsverzeichnis, keine Refs). Jeder Nachfahre erscheint grün oder
   rot, du weißt also, **bevor sich irgendetwas bewegt**, ob die Änderung
   sauber durchläuft oder mit einer späteren Änderung kollidiert.
2. **Historie umschreiben** macht es wirklich: Dieselbe Kette wird mit
   Plumbing gebaut, dann bewegt sich der Branch mit `reset --keep` — deine
   nicht committeten Änderungen werden mitgenommen, oder der Reset bricht ab
   und nichts ist passiert. Vorher wird ein
   [Schutz-Schnappschuss](recovery.md) angelegt, und Rückgängig stellt die
   alte Kette wieder her.

Urheberschaft und Daten jedes nachgespielten Commits bleiben erhalten; nur die
Hashes ändern sich — genau das bedeutet es, Historie umzuschreiben.

## Merges im Bereich

![Bearbeiten eines Commits unterhalb zweier Merges — die Kaskade spielt sie nach](../../screenshots/commit-edit-merges.webp)

Ein Merge zwischen dem Commit und `HEAD` deaktiviert das Bearbeiten nicht
mehr. Die Kaskade spielt einen Merge nach, indem sie sein **aufgezeichnetes
Ergebnis** — den Baum, den der Merge tatsächlich committet hat,
Konfliktauflösungen eingeschlossen — auf den umgeschriebenen Elterncommit
anwendet, sodass von Hand vorgenommene Auflösungen das Umschreiben
wortwörtlich überleben. Kein rerere, kein erneutes Mergen, kein Worktree:
dasselbe In-Memory-Plumbing wie im Rest der Kaskade, und beide Eltern-Zeiger
bleiben erhalten. Ein Seiten-Branch, der den bearbeiteten Commit ebenfalls
enthält, wird umgeschrieben und neu ausgerichtet; einer, der ihn nicht
enthält, behält seine Identität unangetastet. Das Banner im Dialog sagt, wie
viele Merges der Bereich enthält, und Merge-Schritte zeigen in der Vorschau
ein Merge-Symbol.

Der ehrliche Vorbehalt: Ein nachgespielter Merge ist nur so gut wie sein
aufgezeichnetes Ergebnis. Kollidiert deine Änderung mit Zeilen, die der Merge
selbst aufgelöst hat, wird die Vorschau rot — genau wie bei jedem anderen
kollidierenden Schritt. Nichts wird geraten.

## Wenn die Kaskade kollidiert

Ein späterer Commit hat dieselben Zeilen angefasst, die du gerade bearbeitest.
Die Vorschau markiert diesen Commit rot samt den Konfliktdateien, und das
Umschreiben weigert sich zu laufen — nichts ist jemals halb angewendet.
Entweder bearbeite anders, oder stelle dich dem Konflikt direkt mit einem
[interaktiven Rebase](rebase.md).

## Grenzen

- **Der Commit muss ein Vorfahre von `HEAD` sein.** Ein Commit auf einem
  nicht gemergten Seiten-Branch hat keinen Pfad zu deinem aktuellen Branch,
  auf dem er nachgespielt werden könnte.
- Binärdateien und Dateien über 2 MB werden angezeigt, sind aber nicht
  editierbar.
- Ein Commit, der schon auf einem Remote liegt, lässt sich bearbeiten, aber
  dein nächster Push muss ein **Force-Push** sein — der Dialog warnt, bevor du
  dich darauf einlässt.
- Im Commit gelöschte Dateien lassen sich nicht bearbeiten (es gibt keinen
  Inhalt zum Bearbeiten).

**Siehe auch:** [Interaktiver Rebase](rebase.md) · [Wiederherstellung & das Reflog](recovery.md) · [Einarbeiten](absorb.md)
