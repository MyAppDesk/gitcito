---
title: Zeitmaschine
category: Repository & Historie
order: 13
summary: Zieh an einem Regler und sieh zu, wie sich das Repository selbst verändert, Commit für Commit.
keywords: zeitmaschine time machine historie regler slider vergangenheit tree durchsehen zurückspulen alte version
---

# Zeitmaschine

Einen alten Commit zu lesen heißt normalerweise, ihn auszuchecken, und das heißt,
das wegzustashen, woran du gerade warst. Hier nicht.

Zieh am Regler, und der **Dateibaum wird pro Commit neu gezeichnet**: Ordner
tauchen auf, Dateien wandern zwischen ihnen, gelöschte Dateien kommen zurück. Wähl
eine Datei aus, und du liest sie so, wie sie bei diesem Commit war.

Alles wird aus der Objektdatenbank gelesen (`git ls-tree`, `git show`). **Kein
Checkout, HEAD bewegt sich nie, deine nicht committeten Arbeiten bleiben
unangetastet** — du kannst mitten in einer Änderung durch ein Jahr Historie
scrubben.

![Der Baum, wie er bei einem früheren Commit stand, mit einer daneben geöffneten Datei](../../screenshots/time-machine.webp)

![Das Scrubben am Regler: der Baum baut sich Commit für Commit neu auf](../../screenshots/clip-time-machine.webp)

## Steuerung

| Taste | Aktion |
|---|---|
| <kbd>←</kbd> <kbd>→</kbd> | Ein Commit |
| <kbd>⇧</kbd> + <kbd>←</kbd> <kbd>→</kbd> | Zehn Commits |
| <kbd>Home</kbd> / <kbd>End</kbd> | Ältester / neuester |

Die Pfeile links und rechts vom Regler tun dasselbe. Dateien, die der aktuelle
Commit angefasst hat, werden im Baum hervorgehoben, mit einer Anzahl in der
Kopfzeile.

## Die Auswahl überlebt die Zeit

Wähl eine Datei und scrubbe zurück über den Commit hinaus, der sie erzeugt hat:
das Panel sagt, dass sie hier nicht existiert, und **behält deine Auswahl**.
Scrubbe vorwärts, und die Datei kommt mit ihrem alten Inhalt zurück. Genau darum
geht es — du bewegst das Repository, nicht deinen Cursor.

**Diese Version öffnen** übergibt die Datei bei diesem Commit an die normale
Dateiansicht.

**Siehe auch:** [Timelapse](timelapse.md) · [Blame & Historie](blame.md)
