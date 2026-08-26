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
erscheint eine Schaltfläche. Ein Klick öffnet DevTools **am Repository selbst**,
als eines seiner [Symbole](workspaces.md) statt als eigener Tab. Ein Symbol pro
Sitzung — zwei laufende Apps sind zwei DevTools.

Ein **Hot Restart veröffentlicht eine neue Adresse**, und das Panel folgt ihr,
solange seine Sitzung lebt. Ist die Sitzung vorbei, behält das Panel die letzte
Adresse, die meist tot ist: das Symbol schließen und DevTools aus dem neuen Lauf
öffnen.

## Welche Werkzeuge

Ein Werkzeug kommt hier hinein, wenn es zweierlei tut: eine Web-Oberfläche auf
dieser Maschine ausliefern und ihre Adresse ausgeben.

| Werkzeug | Die Zeile, die es ausgibt |
|---|---|
| Flutter DevTools | `The Flutter DevTools … is available at: <url>` |
| Dart DevTools (`dart devtools`) | `Serving DevTools at <url>` |
| Vue DevTools (`@vue/devtools`) | `Vue Devtools … listening on <url>` |
| Prisma Studio | `Prisma Studio is up on <url>` |
| Drizzle Studio | `Drizzle Studio is up and running on <url>` |
| webpack-bundle-analyzer | `Webpack Bundle Analyzer is started at <url>` |
| alles andere, das DevTools und eine Adresse nennt | fällt auf einen generischen Treffer |

**Was sich nicht einbetten lässt, und warum.** Der Node-Inspector gibt einen
`ws://`-Endpunkt aus, an den sich ein Debugger hängt, keine Seite — und das dazu
gehörige Chrome-DevTools-Frontend liegt hinter einer `devtools://`-URL, die keine
eingebettete Ansicht laden darf. Der Standalone-Build von React DevTools ist ein
eigenes Desktop-Fenster, keine ausgelieferte Seite. Beides kann hier kein Tab
sein; beides bräuchte einen Debug-Protokoll-Client statt einer Adresse.

**Ein Dev-Server ist kein Dev-Werkzeug.** Vite auf `:5173` ist deine App; sie
einzubetten wäre ein Vorschau-Panel — ein anderes Feature, bewusst nicht dieses.

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
