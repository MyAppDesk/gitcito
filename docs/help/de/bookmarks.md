---
title: Lesezeichen
category: Workspace-Werkzeuge
order: 94
summary: Gemerkte Stellen im Code, die überleben, wenn sich die Datei darunter ändert.
keywords: lesezeichen markieren zeile notiz stelle code navigation seitenleiste verschoben verloren schnipsel
---

# Lesezeichen

Eine Stelle, zu der du zurückwillst: die Zeile, in der der Bug wohnt, die
Funktion, die du halb umbenannt hast, das Ding, das nach dem Refactor weg soll.
Rechtsklick auf eine Zeile im Dateibetrachter, **Diese Zeile mit einem
Lesezeichen versehen** — sie erscheint in der Seitenleiste, und ein Klick bringt
dich zurück.

![Lesezeichen in der Seitenleiste](../../screenshots/bookmarks.webp)

Eine mit Lesezeichen versehene Zeile trägt eine Marke am Rand, und beim
Überfahren einer beliebigen Zeile erscheint eine blasse, die sich anklicken
lässt — das Kontextmenü ist für den Fall, dass du die Funktion schon kennst.

Lesezeichen sind privat für diese Maschine und dieses Repository. Nichts wird ins
Repo geschrieben: nicht committbar, nicht pushbar, für niemanden sonst sichtbar —
genau wie [Todos](todos.md).

## Die Zeile wandert. Das ist das ganze Problem.

`cart.ts:42` verfällt in dem Moment, in dem jemand darüber eine Zeile einfügt,
und ein Lesezeichen, das stillschweigend die falsche Zeile öffnet, ist schlimmer
als keines. Deshalb wird der **Text** der Zeile neben ihrer Nummer gespeichert,
und beim Öffnen wird neu gesucht:

1. die gemerkte Zeile, wenn sie diesen Text noch trägt;
2. sonst die nächstgelegene Zeile mit demselben Text — die nächstgelegene, damit
   eine im ganzen File wiederholte Zeile bei der Kopie landet, die ihrem alten
   Platz am nächsten ist;
3. sonst die nächstgelegene Zeile, die ohne Rücksicht auf Leerraum passt: das
   überlebt eine Umformatierung;
4. sonst sagt es, dass **die Zeile weg ist**, und öffnet dort, wo sie war, statt
   zu raten.

Wandert sie, heilt sich das Lesezeichen: die neue Nummer wird gespeichert, das
nächste Öffnen startet von dort. Eine **Notiz** lässt sich über das Kontextmenü
hinzufügen — ohne sie ist der Zeilentext selbst die Beschriftung.

## Die Grenzen

- **Ein Lesezeichen zeigt auf den Arbeitsbaum**, nicht auf einen Commit. Es folgt
  deinen Änderungen; rückwärts durch die Historie reist es nicht.
- **Eine neu geschriebene Datei verliert ihre Lesezeichen.** Ist weder der genaue
  Text noch seine leerraum-normalisierte Form in ein paar hundert Zeilen zu
  finden, bleibt nichts Ehrliches übrig, worauf man zeigen könnte.
- **Eine Umbenennung bricht die Lesezeichen der Datei.** Der Pfad ist der
  Schlüssel; git erkennt eine Umbenennung in einem Diff, aber ein Lesezeichen ist
  kein Teil eines Diffs.
- **Eine leere Zeile hat keinen Text zum Wiederfinden**, ihr Lesezeichen hängt
  allein an der Nummer.

**Siehe auch:** [Todos](todos.md) · [Probleme](problems.md)
