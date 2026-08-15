---
title: Gestapelte Branches
category: Branches & Eingriffe
order: 43
summary: Ketten abhängiger Branches, mit einem kaskadierenden Restack.
keywords: stack stapel gestapelt stacked branches graphite restack abhängig dependent kette chain parent eltern PR pro ebene per level
---

# Gestapelte Branches

Ein Stack ist eine Kette von Branches, in der jeder auf dem darunter aufbaut:
`main → api → ui`. Drei kleine PRs zu reviewen schlägt es, einen riesigen zu
reviewen.

![Ein Branch-Stack](../../screenshots/branch-stack.webp)

Gitcito zeigt den Stack von unten nach oben mit der Anzahl der Commits auf jeder
Ebene und lässt dich **pro Ebene einen PR öffnen** — jeder davon zielt auf
seinen Parent statt auf `main`.

## Restack

Wenn ein unterer Branch sich ändert — du hast Review-Kommentare auf `api`
abgearbeitet —, ist jeder Branch darüber jetzt auf der falschen Basis gebaut.
**Restack** rebast die gesamte Kette kaskadierend mit `rebase --onto`, sodass
das Umschreiben eines Parents keine Commits in seine Kinder dupliziert.

## Wo die Verknüpfungen liegen

Die Parent-Verknüpfungen werden in der **git config** gespeichert, sie reisen
also mit dem Repository mit und überleben einen erneuten Clone. Nichts davon
liegt in einem Dienst.

**Siehe auch:** [Interaktives Rebase](rebase.md) · [Hosting & Pull Requests](hosting.md)
