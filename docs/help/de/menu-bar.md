---
title: Die Menüleiste
category: Erste Schritte
order: 5
summary: Was in Gitcitos macOS-Menüs steckt, und warum Windows und Linux keine Menüleiste haben.
keywords: menüleiste menubar menü anwendung datei bearbeiten ansicht fenster hilfe repository macos nativ über beenden
---

# Die Menüleiste

Eine Menüleiste beantwortet eine Frage, die keine andere Oberfläche gut
beantwortet: *Was kann diese App überhaupt?* Die
[Befehlspalette](search.md) ist schneller, sobald man weiß, wonach man sucht,
und der [Spickzettel](keyboard.md) listet die Tasten auf — aber in beidem
stöbert man nicht. In Menüs schon.

Alles darin ist auch aus dem Fenster heraus erreichbar. Nichts gibt es nur im
Menü, und das mit Absicht: Eine Funktion, die nur im Menü existiert, ist eine
Funktion, die Windows- und Linux-Nutzende nicht haben.

## Was wo liegt

| Menü | Enthält |
|---|---|
| **Gitcito** | Über, Update-Prüfung, [Einstellungen](repo-settings.md), die üblichen Einträge zum Ausblenden und Beenden |
| **Datei** | Neuer Tab, Repository öffnen oder [klonen](cloning.md), zuletzt geöffnet, Tabs schließen und wieder öffnen |
| **Bearbeiten** | Ausschneiden, Kopieren, Einfügen, Widerrufen — die Textbearbeitung, die die Tastatur ohnehin kann — plus [Codesuche](search.md) |
| **Ansicht** | Befehlspalette, die Schalter für Seitenleiste und Panel, das [Terminal](terminal.md), [Mission Control](mission-control.md), den [Tresor](vault.md), Zoom |
| **Repository** | Fetch, Pull, Push, Committen, Stashen, neuer Branch, [Pull Request](hosting.md), Widerrufen, im Finder zeigen, Repository-Einstellungen |
| **Fenster** | Minimieren, Zoomen, alle nach vorne bringen |
| **Hilfe** | Dieses Handbuch, den Spickzettel, Neuerungen, Lizenzen, Problem melden |

Das Repository-Menü ist komplett ausgegraut, wenn der aktive Tab kein
Git-Repository ist, und **Widerrufen** ist ausgegraut, wenn es nichts zu
widerrufen gibt — das Menü ist eine lesbare Zusammenfassung dessen, was die App
gerade zulässt.

## Shortcuts angezeigt, nicht beschlagnahmt

Die Tasten neben jedem Eintrag sind die, die tatsächlich belegt sind. Belegen
Sie <kbd>⌘K</kbd> in den Einstellungen neu, sagt das Ansicht-Menü es.

Das klappt, weil das Menü diese Kombinationen *anzeigt*, ohne sie zu
beanspruchen: Gitcitos eigene Tastaturbehandlung bleibt zuständig, und genau das
erlaubt einem Shortcut, sich je nach Position der Eingabemarke anders zu
verhalten. Das Einzige, was so nicht darstellbar ist, ist ein Shortcut, der
Gitcito nicht gehört — <kbd>⌘F</kbd> gehört der Datei oder dem Diff, das gerade
gelesen wird, also beansprucht ihn kein Menüeintrag.

## Die Grenzen

- **Nur macOS.** Unter Windows und Linux ist das Fenster rahmenlos — die
  Titelleiste zeichnet Gitcito selbst, und eine Menüleiste hätte keinen Platz.
  Dort führen die [Befehlspalette](search.md) und die
  [Tastaturkürzel](keyboard.md) zu denselben Befehlen.
- **Neu laden und die Entwicklerwerkzeuge erscheinen nur in
  Entwicklungs-Builds.** Neu laden verwirft den Zustand jedes offenen Tabs — das
  hat in einer Release-Version nichts neben „Zoomen“ zu suchen.
- **Zuletzt geöffnet listet höchstens zehn Repositorys**, das neueste zuerst,
  und folgt derselben Liste wie der [Startbildschirm](getting-started.md).
- **Tab wieder öffnen ist nie ausgegraut.** Der Stapel geschlossener Tabs lebt
  nur für die Sitzung, und das Menü kann ihn nicht sehen; ohne etwas zum
  Wiederöffnen passiert schlicht nichts.
