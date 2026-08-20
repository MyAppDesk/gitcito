---
title: Barrierefreiheit
category: Anpassen
order: 78
summary: Screenreader- und Tastatur-Unterstützung — was abgedeckt ist und was noch nicht.
keywords: barrierefreiheit accessibility a11y screenreader VoiceOver NVDA tastaturnavigation fokus aria kontrast reduzierte bewegung
---

# Barrierefreiheit

Gitcito soll ohne Maus bedienbar und für einen Screenreader lesbar sein. Diese
Seite sagt, was das konkret bedeutet — und wo die Grenzen liegen.

## Tastatur

- **Tabs, Seitenleisten-Zeilen, Dateilisten und Toolbar-Menüs** sind
  fokussierbar und werden mit Enter oder Space aktiviert. Geteilte Buttons
  (Pull/Push/Stash) stellen ihren Dropdown-Pfeil als eigenes fokussierbares
  Element bereit.
- **Der Commit-Graph** ist ein einziger Fokus-Halt: fokussiere ihn und gehe
  mit Hoch/Runter (oder j/k) durch die Historie. Der ausgewählte Commit wird
  mit Betreff, Autor und Position angesagt. Shift+F10 (oder die Menütaste)
  öffnet das Kontextmenü des ausgewählten Commits.
- **Kontextmenüs** öffnen sich fokussiert: Pfeiltasten bewegen, Enter
  aktiviert, ArrowRight/ArrowLeft betreten und verlassen Untermenüs, Escape
  schließt.
- **Dialoge** halten Tab in sich gefangen, geben den Fokus beim Schließen
  dorthin zurück, wo du warst, und schließen mit Escape.
- Die **Befehlspalette** (Cmd/Ctrl+K) ist eine Combobox: Ergebnisse werden
  beim Tippen und beim Durchgehen mit den Pfeiltasten angesagt.

## Screenreader

- Jeder Dialog wird mit seinem Titel angesagt. Toasts — der Feedback-Kanal
  der App — sind Live-Regionen: Erfolge melden sich höflich, Fehler
  unterbrechen.
- Fortschritt (Klonen, Update-Download) ist als Fortschrittsbalken mit
  Prozentangabe zugänglich, und Beschäftigt-Zustände („Wird abgerufen …“)
  sagen sich selbst an.
- Der Dateistatus wird gesprochen („Hinzugefügt“, „Geändert“, „Konflikt“),
  nicht nur als farbiges Zeichen angezeigt.
- Das Fenster ist mit Landmarken strukturiert (Banner, Main, Seitenleiste,
  Statusleiste), Landmarken-Navigation funktioniert also.

## Die Grenzen, klar benannt

- **Das Terminal** ist xterm.js und erbt dessen Screenreader-Geschichte, und
  die ist schwach. Behandle es als Oberfläche für sehende Nutzer; jede
  Git-Operation, die es bietet, existiert auch als UI-Aktion.
- **Cosmos (die 3D-Historie), die Spuren des Commit-Graphen und Bild-Diffs**
  sind ihrer Natur nach visuell. Die Daten dahinter — die Commit-Liste, die
  Dateilisten — sind zugänglich; das Bild selbst nicht.
- **Drag-and-drop** (Schritte eines interaktiven Rebase umsortieren, Branches
  zum Mergen ziehen) ist dort, wo vermerkt, nur per Zeiger möglich; jede
  Drag-Aktion hat ein Menü- oder Button-Äquivalent.
- Das Audit hinter dieser Seite wurde mit VoiceOver auf macOS gemacht.
  NVDA/JAWS unter Windows sollten sich gleich verhalten, sind aber nicht
  praxiserprobt — Berichte sind als
  [Issues](https://github.com/MyAppDesk/gitcito/issues) willkommen.

## Verwandte Einstellungen

**Reduzierte Bewegung** wird aus der Betriebssystem-Einstellung übernommen —
Animationen kollabieren zu sofortigen Übergängen. Der Theme-Kontrast lässt
sich pro Theme in [Einstellungen → Erscheinungsbild](themes.md) einstellen.
