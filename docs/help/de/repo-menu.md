---
title: Repository-Kontextmenü
category: Erste Schritte
order: 4
summary: Rechtsklick auf einen Repository-Chip oder -Tab für Alias, Worktrees, GitHub, Terminal und Entfernen.
keywords: kontextmenü rechtsklick alias worktree github terminal anzeigen editor entfernen repository tab context menu
---

# Repository-Kontextmenü

Rechtsklick auf ein Repository — ein eigenständiger Tab, ein Chip in einer
Gruppe, ein Chip in einem verschachtelten Ordner, eine Zeile in der
Willkommens-/Launcher-Liste oder eine Zeile im Repository-Dropdown der Toolbar
— und du bekommst dasselbe repositorybezogene Menü. Der Gruppen-Chip selbst
öffnet weiterhin das Gruppenmenü; der Klick muss auf dem Repository landen.

![Das Repository-Kontextmenü auf einem Chip in einer Gruppe](../../screenshots/repo-context-menu.webp)

Das Repository-Dropdown in der Toolbar listet jedes offene Repository auf, so
wie das Branch-Dropdown die Branches. Ein Linksklick auf eine Zeile wechselt
dorthin. Ein Rechtsklick auf eine Zeile (oder auf die Pille des aktuellen
Repositorys selbst) bringt Alias, Worktrees, GitHub, Terminal, Anzeigen,
Editor und Entfernen. **Repository öffnen…** ganz unten öffnet den Launcher.

![Rechtsklick auf eine Zeile im Repository-Dropdown der Toolbar](../../screenshots/repo-dropdown-context-menu.webp)

## Was jede Aktion tut

| Aktion | Wirkung |
|---|---|
| **Alias erstellen…** / **Alias ändern…** | Nur ein Anzeigename. Gitcito benennt den Ordner auf der Platte nie um und verschiebt ihn nie. Derselbe Alias folgt dem Repository über Tabs, Gruppen und Workspaces hinweg. |
| **Alias entfernen** | Erscheint, wenn ein Alias existiert. Stellt den Ordnernamen wieder her. |
| **Worktrees anzeigen** | Fokussiert dieses Repository und öffnet den Worktree-Abschnitt der Seitenleiste. |
| **Neuer Worktree…** | Derselbe Dialog zum Anlegen eines Worktrees wie von einem Branch aus. Deaktiviert, solange der Pfad fehlt oder ein Merge/Rebase/Cherry-Pick/Revert läuft. |
| **Repository-Namen kopieren** | Kopiert den kanonischen Ordnernamen, nicht den Alias. |
| **Repository-Pfad kopieren** | Kopiert den absoluten Pfad. |
| **Auf GitHub anzeigen** | Origin, wenn es github.com ist, sonst das erste parsebare GitHub-Remote. Deaktiviert, wenn sich keines ableiten lässt. |
| **Im Terminal öffnen** | Öffnet Gitcitos Terminal mit diesem Repository als Arbeitsverzeichnis. |
| **Im Finder / Explorer anzeigen** | Hebt den Repository-Ordner im Dateimanager der Plattform hervor. |
| **Im externen Editor öffnen** | Der in den Einstellungen konfigurierte Editor. Sichtbar, aber deaktiviert, bis einer gesetzt ist. |
| **Entfernen…** | Schließt den Tab oder wirft den Chip aus der Gruppe. Nutzt dieselbe Warnung vor nicht committeter Arbeit wie der **×**-Button. Es löscht nie Dateien von der Platte. |

Bei fehlendem oder ungültigem Pfad bleiben Kopieren, Alias und Entfernen
verfügbar; alles, was das Verzeichnis öffnen oder untersuchen würde, wird
ausgegraut.

**Siehe auch:** [Workspaces, Tabs & Gruppen](workspaces.md) · [Worktrees & Submodule](worktrees.md) · [Externer Editor](editor.md) · [Terminal](terminal.md)
