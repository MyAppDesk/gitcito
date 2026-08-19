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

Wähle einen beliebigen Commit auf einem linearen Pfad zu `HEAD`. Der Dialog
zeigt seine Dateien und seine Nachricht; bearbeite eines von beidem. Von dort
aus passieren zwei Dinge:

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

## Wenn die Kaskade kollidiert

Ein späterer Commit hat dieselben Zeilen angefasst, die du gerade bearbeitest.
Die Vorschau markiert diesen Commit rot samt den Konfliktdateien, und das
Umschreiben weigert sich zu laufen — nichts ist jemals halb angewendet.
Entweder bearbeite anders, oder stelle dich dem Konflikt direkt mit einem
[interaktiven Rebase](rebase.md).

## Grenzen

- **Nur lineare Historie.** Ein Merge zwischen dem Commit und `HEAD`
  deaktiviert das Bearbeiten — Merges nachzuspielen ist ein anderes, härteres
  Problem.
- Binärdateien und Dateien über 2 MB werden angezeigt, sind aber nicht
  editierbar.
- Ein Commit, der schon auf einem Remote liegt, lässt sich bearbeiten, aber
  dein nächster Push muss ein **Force-Push** sein — der Dialog warnt, bevor du
  dich darauf einlässt.
- Im Commit gelöschte Dateien lassen sich nicht bearbeiten (es gibt keinen
  Inhalt zum Bearbeiten).

**Siehe auch:** [Interaktiver Rebase](rebase.md) · [Wiederherstellung & das Reflog](recovery.md) · [Einarbeiten](absorb.md)
