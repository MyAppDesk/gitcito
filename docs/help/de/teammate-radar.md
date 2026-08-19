---
title: Teamkollegen-Radar
category: Branches & Eingriffe
order: 45
summary: Wer upstream was bewegt hat — und ob es auf deiner uncommitteten Arbeit landet.
keywords: teamkollegen radar teammate radar remote aktivität activity upstream überlappung overlap geänderte dateien dirty files kollision collision wer hat angefasst who touched konflikt conflict fetch
---

# Teamkollegen-Radar

Du bearbeitest gerade `api.ts`. Jemand anderes auch, auf einem Branch, den du
nie angesehen hast. Der übliche Weg, das herauszufinden, ist ein Merge-Konflikt
nächste Woche; der Weg des Radars ist eine Liste, heute.

Alles wird aus deinem **letzten Fetch** berechnet — Remote-Tracking-Refs, ein
`merge-tree` im Speicher, sonst nichts. Kein Server, kein Agent auf den
Rechnern deiner Teamkollegen, kein Netzwerk über den Fetch hinaus, den du
ohnehin gemacht hast.

![Teamkollegen-Radar](../../screenshots/teammate-radar.webp)

## Was eine Zeile dir sagt

Für jeden Remote-Branch mit Commits, die dein `HEAD` nicht hat:

| Spalte | Bedeutung |
|--------|---------|
| Wer & wann | Der letzte Committer auf diesem Branch, und wie lange das her ist |
| Commits / Dateien | Wie viel hereinkommt, und wie viele Dateien es anfasst |
| **Überlappung** | Welche dieser Dateien **gerade jetzt in deinem Arbeitsverzeichnis geändert sind** — die rote Pille |
| Risiko | Ob ein Merge dieses Branches in `HEAD` Konflikte hätte (dieselbe Engine wie das [Konflikt-Radar](conflict-radar.md)) |

Zeilen sind danach sortiert, wie sehr sie mit dir kollidieren: Überlappung
zuerst, dann vorhergesagte Konflikte, dann Aktualität. Klapp eine Zeile auf für
die genauen Dateilisten; **Vergleichen** öffnet den vollständigen
Branch-Vergleich.

## Wann es sich meldet

Nach jedem Fetch — manuell oder automatisch — sucht das Radar den Himmel
stumm ab. Es zeigt nur dann einen Hinweis, wenn Upstream-Commits Dateien
anfassen, die du geändert hast, **und** sich diese Menge seit dem letzten
Durchlauf tatsächlich geändert hat. Keine geänderten Dateien, kein Lärm: ein
sauberes Arbeitsverzeichnis kann mit nichts kollidieren.

## Grenzen

- Es sieht, was der letzte Fetch gesehen hat. Ein Teamkollege, der nicht
  gepusht hat, ist unsichtbar — hier werden Refs gelesen, keine Gedanken.
- Überlappung ist pfadgenau, nicht zeilengenau: dieselbe Datei anzufassen ist
  ein Warnsignal, kein Beweis für einen Konflikt. Die Spalte **Risiko** ist die
  zeilengenaue Antwort, aber nur zwischen committeten Ständen.
- Branches, die länger als ~45 Tage still liegen, werden übersprungen, und nur
  die 30 zuletzt bewegten werden gescannt.

**Siehe auch:** [Konflikt-Radar](conflict-radar.md) · [Fetchen, Pullen & Pushen](syncing.md) · [Was sich seitdem geändert hat](range-diff.md)
