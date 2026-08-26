---
title: Flutter DevTools
category: Workspace-Werkzeuge
order: 93
summary: Netzwerkansicht, Timeline, Inspector und Memory-Profiler in einem Gitcito-Tab.
keywords: devtools flutter dart netzwerk timeline inspector speicher profiler webview eingebettet panel vm service
---

# Flutter DevTools

DevTools hat die Netzwerkansicht, die Timeline, den Widget-Inspector und den
Memory-Profiler bereits — und ist eine Flutter-Web-App, die auf deinem eigenen
Rechner ausgeliefert wird. Gitcito baut davon also nichts nach und spricht auch
nicht selbst mit dem Dart VM Service: Es bemerkt die Adresse und bettet sie ein.

![DevTools in einem Gitcito-Tab](../../screenshots/devtools.webp)

`flutter run` gibt die Zeile aus, sobald der VM-Service steht:

```
The Flutter DevTools debugger and profiler on iPhone 16 Pro is available at:
http://127.0.0.1:9100?uri=http://127.0.0.1:53412/uJ8k=/
```

Die Launch-Sitzung beobachtet dafür ihre eigene Ausgabe, und in der Debug-Leiste
erscheint eine Schaltfläche. Ein Klick öffnet DevTools in einem eigenen Tab, eines
pro Sitzung — zwei laufende Apps sind zwei DevTools.

Ein **Hot Restart veröffentlicht eine neue Adresse**, und der Tab folgt ihr,
solange seine Sitzung lebt. Ist die Sitzung vorbei, behält der Tab die letzte
Adresse, die meist tot ist: schließen und DevTools aus dem neuen Lauf öffnen.

## Was er darf

Die eingebettete Ansicht ist kurz angeleint, denn diese App hält Zugangsdaten:

- **Nur Loopback.** `127.0.0.1`, `localhost`, `::1`. Ein Einbetten mit einer
  anderen Adresse wird abgelehnt, eine Weiterleitung dorthin ebenso.
- **Kein Preload, keine Node-Integration, Context Isolation an.** Die Seite hat
  keine Brücke nach Gitcito.
- **Links öffnen im echten Browser**, in einem normalen Fenster, nicht im Panel.

## Die Grenzen

- **Es ist DevTools, nicht unseres.** Was diese Version kann, kann das Panel; was
  sie nicht kann, können wir auch nicht. Es gibt keine Gitcito-Netzwerkansicht.
- **Nur Flutter meldet sich so.** Ein reines Dart-Programm gibt eine VM-Service-
  URL aus, aber keine DevTools-Adresse — also erscheint keine Schaltfläche.
- **Ein leeres Panel heißt: die App ist beendet.** DevTools wird *von der
  laufenden App* ausgeliefert; endet sie, antwortet ihre Adresse nicht mehr.

**Siehe auch:** [Ausführen und debuggen](launch.md)
