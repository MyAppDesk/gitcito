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

Die Aktion ist **idempotent**: Drücke sie nach jedem Restack, jeder neuen
Ebene oder jedem gemergten PR und sie konvergiert — nichts wird dupliziert,
angefasst wird nur, was abgedriftet ist.

Wenn der unterste PR **gemergt** ist, räumt derselbe Button hinterher: das
Kind der gemergten Ebene wird auf den Trunk umgehängt, das Tracking der Ebene
aufgehoben, ihr lokaler Branch gelöscht (sicher — der Trunk enthält ihn
nachweislich), die Kette restackt und jeder verbleibende PR umgezielt. Von
unten nach oben mergen, Einreichen drücken, wiederholen.

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
- Das Aufräumen nach dem Merge der untersten Ebene erkennt Merge- und
  Rebase-Merges über die Abstammung, und **Squash**-Merges, indem es GitHub
  fragt, ob der PR des Branches gelandet ist — mit einem GitHub-Token wird
  also jeder Merge-Stil aufgeräumt. Auf anderen Hosts, oder ohne Token, muss
  das Tracking einer squash-gemergten Ebene weiterhin von Hand aufgehoben
  werden. Fetche außerdem zuerst — die Abstammungsprüfung liest den Trunk im
  Stand deines letzten Fetch.
- Der Stack-Abschnitt in einem PR-Body wird zwischen versteckten Markern
  gepflegt — deine eigene Beschreibung darüber bleibt erhalten.

## Wo die Verknüpfungen liegen

Die Parent-Verknüpfungen werden in der **git config** gespeichert, sie reisen
also mit dem Repository mit und überleben einen erneuten Clone. Nichts davon
liegt in einem Dienst.

**Siehe auch:** [Interaktives Rebase](rebase.md) · [Hosting & Pull Requests](hosting.md)
