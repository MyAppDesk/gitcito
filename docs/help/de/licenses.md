---
title: Open-Source-Lizenzen
category: Anpassen
order: 104
summary: Die Lizenz jedes Drittanbieter-Pakets lesen, das dieser Build von Gitcito mitliefert.
keywords: lizenzen licenses namensnennung hinweise open source MIT Apache BSD drittanbieter abhängigkeiten credits über
---

# Open-Source-Lizenzen

Gitcito baut auf gut neunzig Open-Source-Paketen auf, und fast alle verlangen
dafür dasselbe: dass ihr Hinweis mit dem Programm mitreist. MIT, BSD und Apache
sagen das im Text selbst. Diese Seite ist der Ort dieses Hinweises — so erfüllt
die App die Pflicht, nicht eine Datei, an deren Kopie jemand denken muss.

Sie ist auch die ehrliche Antwort auf „was läuft eigentlich auf meinem Rechner“.

## Öffnen

Klicke auf die **Versionsnummer** in der Statusleiste — das öffnet **Neuigkeiten**
— und dann auf **Lizenzen** in dessen Kopfzeile. Oder öffne die Befehlspalette und
suche nach *Open-Source-Lizenzen*. Sie öffnet sich in einem eigenen Tab, wie
Neuigkeiten.

![Der Lizenzen-Tab](../../screenshots/licenses.webp)

| Spalte | Was sie ist |
|--------|-------------|
| Name | Das Paket, wie es auf npm veröffentlicht ist |
| Version | Die genaue Version, die dieser Build aufgelöst hat |
| Badge | Der SPDX-Bezeichner aus dem Manifest des Pakets |

Wähle eine Zeile, um den vollständigen Lizenztext zu lesen, den das Paket
mitliefert. Das Link-Symbol öffnet die Projektseite im Browser. Das Filterfeld
sucht in Paketname und Lizenzbezeichner, `Apache` grenzt die Liste also auf
Apache-lizenzierte Pakete ein.

## Was sie abdeckt und was nicht

Die Liste entsteht beim Build aus dem **Produktions-Abhängigkeitsbaum** — alles,
was in der gepackten App landet, auch transitive Abhängigkeiten, die du nie
direkt angefordert hast — plus Electron selbst. Build-Werkzeuge, die nie
ausgeliefert werden, bleiben absichtlich draußen.

Zwei Grenzen, die man kennen sollte:

- **Einige Pakete liefern keine Lizenzdatei.** Sie nennen im Manifest einen
  Bezeichner und sonst nichts. Diese Zeilen sagen das, statt einen Text zu
  erfinden — eine Lizenz, die man nicht lesen kann, ist keine, auf die man sich
  verlassen kann.
- **Der Bezeichner ist, was das Paket behauptet.** Gitcito zeigt ihn an, prüft
  ihn aber nicht. Ist das Manifest eines Pakets falsch, irrt diese Seite mit.

Gitcitos eigene Lizenz ist MIT; das Badge oben rechts öffnet sie auf GitHub.

**Siehe auch:** [Sprachen & Rechts-nach-links](languages.md) · [Themes & Erscheinungsbild](themes.md)
