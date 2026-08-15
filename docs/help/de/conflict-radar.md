---
title: Konflikt-Radar
category: Branches & Eingriffe
order: 44
summary: Sieh, welche Branches Konflikte verursachen werden, bevor du einen von ihnen mergst.
keywords: konflikt radar conflict merge vorschau risiko branches merge-tree
---

# Konflikt-Radar

Herauszufinden, dass ein Branch Konflikte hat, indem man ihn mergt, ist eine
teure Art, eine Frage zu stellen. Das Radar beantwortet sie vorher.

Gitcito mergt jeden Branch **innerhalb der Objektdatenbank** in eine Basis
deiner Wahl (`git merge-tree --write-tree`). Kein Checkout, keine Änderung am
Index, keine Änderung am Arbeitsverzeichnis, nichts, was danach aufzuräumen
wäre. Deine nicht committeten Arbeiten können genau da bleiben, wo sie sind,
während der Scan läuft.

![Das Radar, ein Urteil pro Branch](../../screenshots/conflict-radar.webp)

![Branch für Branch scannen, dann die umkämpften Dateien öffnen](../../screenshots/clip-conflict-radar.webp)

## Anwendung

Öffne es über das Werkzeugmenü, mit <kbd>⌘K</kbd> → *Konflikt-Radar*, oder mach
einen Rechtsklick auf einen Branch, um alles gegen **diesen** Branch zu scannen.

Es scannt, sobald es sich öffnet, und nimmt dabei deinen aktuellen Branch als
Basis.

| Urteil | Bedeutung |
|---|---|
| **Wird Konflikte haben** | Der Merge braucht Handarbeit. Die genauen Pfade sind aufgelistet. |
| **Mergt sauber** | Er ließe sich ohne Gegenwehr anwenden. |
| **Bereits enthalten** | Die Basis enthält ihn schon — nichts zu mergen. |
| **Fehlgeschlagen** | Git hat sich geweigert: nicht verwandte Historien, fehlende Ref. Der Grund wird angezeigt. |

Branches werden schlechteste zuerst sortiert, und der Schlimmste der Schlimmen —
derjenige, der die meisten Dateien anfasst — landet ganz oben.

## Umkämpfte Dateien

Darunter sortiert **Umkämpfte Dateien** die Pfade danach, wie viele Branches sie
umschreiben. Zwei Branches, die um eine Datei streiten, sind ein Gespräch, das
man jetzt führen sollte; fünf sind ein Designproblem.

## Nach einem Scan

Branch-Zeilen in der Seitenleiste tragen einen farbigen Punkt: Rot wird
Konflikte haben, Grün ist sauber, Bernstein ist ein Branch, den git abgelehnt
hat. Branches, die die Basis schon enthält, bekommen keinen Punkt — eine Reihe
grauer Punkte auf allem längst Gemergten wäre nur Rauschen.

> Scannen ändert nichts. `git status` bleibt sauber, und HEAD bewegt sich nicht.

**Siehe auch:** [Was sich seitdem geändert hat](range-diff.md) · [Mergen & Rebasen](merging.md)
