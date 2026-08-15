---
title: Einarbeiten
category: Mit Änderungen arbeiten
order: 33
summary: Schickt jede gestagte Korrektur zurück in den Commit, der die Zeile eingeführt hat.
keywords: einarbeiten absorb fixup autosquash amend gestagt hunks blame review korrekturen
---

# Einarbeiten

Du hast drei Review-Kommentare über drei Dateien hinweg abgearbeitet. Ehrlich
wären drei `fixup!`-Commits, die jeweils auf den richtigen Parent zeigen. Was
Leute tatsächlich machen, ist ein Commit namens "review fixes".

Absorb erledigt das Ehrliche für dich.

![Absorb leitet jeden gestagten Hunk in den Commit, der ihn eingeführt hat](../../screenshots/absorb.webp)

## So funktioniert es

1. Stage die Korrekturen.
2. Werkzeuge → **Gestagte Änderungen einarbeiten…** (oder <kbd>⌘K</kbd>).
3. Gitcito blamet die Zeilen, die jeder gestagte Hunk berührt, findet heraus,
   welcher **deiner ungepushten Commits** sie eingeführt hat, und zeigt dir den
   Plan, bevor irgendetwas passiert.

Der Plan listet jeden Ziel-Commit mit den Hunks auf, die dorthin gehen, dazu
eine Gruppe **Gehört noch zu nichts** — eine brandneue Datei hat keine Historie,
in die sie eingearbeitet werden könnte, also bleibt sie gestagt, damit du sie
ganz normal committen kannst.

| Button | Was passiert |
|---|---|
| **Fixups erstellen** | Ein `fixup!`-Commit pro Ziel. Es wird nichts rebased. |
| **Fixups erstellen & rebasen** | Dasselbe, dann faltet ein Autosquash-Rebase sie ein. |

## Die Regeln, an die es sich hält

- **Nur ungepushte Commits kommen infrage.** Was bereits veröffentlicht ist,
  gehört nicht uns zum Umschreiben. Ist alles gepusht, sagt Absorb das und tut
  nichts.
- **Das Arbeitsverzeichnis wird nie angefasst.** Nur der Index und die Commits,
  die Absorb selbst erzeugt.
- **Ein Fehlschlag hinterlässt kein Chaos.** Scheitert irgendein Schritt,
  werden HEAD und Index exakt so zurückgesetzt, wie sie vorher waren.
- Während eines Merges oder Rebases verweigert es den Dienst — dieser Index
  gehört git.

**Siehe auch:** [Interaktives Rebase](rebase.md) · [Staging](staging.md)
