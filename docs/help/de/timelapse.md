---
title: Timelapse
category: Repository & Historie
order: 14
summary: Spiel das ganze Leben des Repositorys als Animation ab — und exportiere es.
keywords: timelapse zeitraffer video animation historie abspielen gource export webm film jahresrückblick
---

# Timelapse

Sieh dem Repository beim Wachsen zu.

Jede Datei ist ein Punkt, platziert nach ihrem obersten Ordner: geboren, wenn sie
hinzugefügt wird, pulsierend, wenn ein Commit sie anfasst, anschwellend, wenn sie
wieder und wieder bearbeitet wird, ausblendend, wenn sie gelöscht wird. Datum,
Autor, Betreff und die mitlaufenden Zähler für Commits, Dateien und Autoren liegen
darüber, mit einem Fortschrittsbalken am unteren Rand.

![Der Timelapse mitten in der Wiedergabe](../../screenshots/timelapse.webp)

![Das ganze Leben eines Repositorys, abgespielt](../../screenshots/clip-timelapse.webp)

## Steuerung

- **Abspielen / Pause**, Geschwindigkeiten von **4× bis 32×**, und Neustart.
- Der Regler sucht, indem er **von vorn abspielt**, damit ein Zurückscrubben
  genau in der richtigen Welt landet statt in einer Näherung davon.

## Video exportieren

**Video exportieren** nimmt das Canvas von Anfang bis Ende auf und fragt, wo eine
`.webm` gespeichert werden soll.

Die Aufnahme passiert in der Seite selbst (`MediaRecorder`) — es gibt keinen
Encoder zu installieren, kein ffmpeg, und nichts wird irgendwohin hochgeladen. Auf
die Platte wird nichts geschrieben, bis du einen Pfad wählst.

> Ein Repository mit echter Form gibt einen besseren Film ab als ein
> aufgeräumtes. Umbenennungen, Löschungen und ein Ordner, der plötzlich
> explodiert, sind das, was es sehenswert macht.

**Siehe auch:** [Zeitmaschine](time-machine.md) · [Insights](insights.md)
