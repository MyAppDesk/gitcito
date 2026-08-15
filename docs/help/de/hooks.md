---
title: Hooks & .gitignore
category: Workspace-Werkzeuge
order: 92
summary: Git-Hooks verwalten und Dateien ignorieren, ohne von Hand zu editieren.
keywords: hooks haken pre-commit husky core.hooksPath gitignore ignorieren untrack nicht mehr tracken
---

# Hooks & .gitignore

## Hooks

Liste jeden Hook im Repository auf, sieh, welche echt sind und welche noch
`.sample` heißen, und aktiviere, deaktiviere, bearbeite oder erstelle sie.

![Die Hook-Verwaltung](../../screenshots/hooks.webp)

Gitcito erkennt einen eigenen **`core.hooksPath`** (husky und Verwandte) sowie
eine **pre-commit**-Framework-Konfiguration und sagt dir, wenn die Hooks
woanders als in `.git/hooks` liegen — sonst würdest du eine Datei bearbeiten, die
git nie ausführt.

> Hooks laufen bei Gitcitos Commits genauso wie bei `git commit`. Ein Hook, der
> fehlschlägt, blockiert den Commit, und seine Ausgabe kommt im Fehler zurück.

## Intelligentes .gitignore

Rechtsklick auf eine Datei → **Ignorieren**, und dann wählen:

| Auswahl | Schreibt |
|---|---|
| Diese Datei | `path/to/file.log` |
| Alle `*.ext` | `*.log` |
| Den ganzen Ordner | `path/to/folder/` |

![Die .gitignore-Auswahl](../../screenshots/gitignore-chooser.webp)

Die Regel landet im `.gitignore` des **nächstgelegenen Ordners** oder im
Repository-Wurzelverzeichnis, mit einer Live-Vorschau der Zeile, bevor du dich
festlegst. Für bereits getrackte Dateien gibt es im selben Dialog ein
**Ignorieren & nicht mehr tracken**.

**Siehe auch:** [Sicherheit & Secrets](security.md) · [Staging](staging.md)
