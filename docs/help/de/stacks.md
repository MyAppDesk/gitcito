---
title: Gestapelte Branches
category: Branches & Eingriffe
order: 43
summary: Ketten abhängiger Branches — kaskadierender Restack und verkettete PRs mit einem Klick.
keywords: stack stapel gestapelt stacked branches graphite restack abhängig dependent kette chain parent eltern PR pro ebene per level submit einreichen autopilot retarget umzielen basis
---

# Gestapelte Branches

Ein Stack ist eine Kette von Branches, in der jeder auf dem darunter aufbaut:
`main → api → ui`. Drei kleine PRs zu reviewen schlägt es, einen riesigen zu
reviewen.

![Ein Branch-Stack](../../screenshots/branch-stack.webp)

Gitcito zeigt den Stack von unten nach oben mit der Anzahl der Commits auf jeder
Ebene. Jede Ebene mit einem offenen PR trägt dessen Nummer als Chip — ein Klick
darauf öffnet den PR.

## Den Stack als verkettete PRs einreichen

**Stack als PRs einreichen** erledigt mit einem Klick, wofür Stacking-Tools
Geld verlangen:

1. Pusht jede Ebene mit `--force-with-lease` (frische Branches tolerieren es,
   restackte brauchen es).
2. Öffnet für jede Ebene ohne PR einen — jeder **basiert auf seinem
   Parent-Branch**, nicht auf `main`, sodass jedes Review nur die eigenen
   Commits zeigt. Titel und Beschreibung stammen aus den Commits der jeweiligen
   Ebene.
3. Zielt jeden bestehenden PR um, dessen Basis abgedriftet ist.
4. Schreibt einen **Stack-Navigationsabschnitt** in jeden PR-Body, damit ein
   Reviewer auf jeder Ebene die ganze Kette sehen kann und wo dieser PR darin
   steht.

Die Aktion ist **idempotent**: Drücke sie nach jedem Restack oder jeder neuen
Ebene und sie konvergiert — nichts wird dupliziert, angefasst wird nur, was
abgedriftet ist.

## Restack

Wenn ein unterer Branch sich ändert — du hast Review-Kommentare auf `api`
abgearbeitet —, ist jeder Branch darüber jetzt auf der falschen Basis gebaut.
**Restack** rebast die gesamte Kette kaskadierend mit `rebase --onto`, sodass
das Umschreiben eines Parents keine Commits in seine Kinder dupliziert. Nach
einem Restack drücke erneut **Einreichen**: Es force-pusht die umgeschriebenen
Ebenen und die PRs aktualisieren sich an Ort und Stelle.

## Grenzen

- Das Einreichen ist vorerst **nur für GitHub** möglich (das Erstellen
  funktioniert auf allen vier Hosts, aber Umzielen und Body-Updates brauchen
  die GitHub-API).
- Nachdem der unterste PR gemergt ist, sieht git weiterhin die alte Kette:
  **hebe das Tracking** der gemergten Ebene auf (oder setze den Parent ihres
  Kindes auf den Trunk), restacke, reiche ein. Das Aufräumen nach dem Merge
  der untersten Ebene ist noch nicht automatisiert.
- Der Stack-Abschnitt in einem PR-Body wird zwischen versteckten Markern
  gepflegt — deine eigene Beschreibung darüber bleibt erhalten.

## Wo die Verknüpfungen liegen

Die Parent-Verknüpfungen werden in der **git config** gespeichert, sie reisen
also mit dem Repository mit und überleben einen erneuten Clone. Nichts davon
liegt in einem Dienst.

**Siehe auch:** [Interaktives Rebase](rebase.md) · [Hosting & Pull Requests](hosting.md)
