---
title: Aufgaben
category: Workspace-Werkzeuge
order: 97
summary: Eine private Checkliste pro Repository, sichtbar in der Seitenleiste und der Statusleiste.
keywords: todo aufgabe aufgaben checkliste liste notiz notizen erinnerung merkzettel priorität
---

# Aufgaben

Die Hälfte der Notizen beim Entwickeln ist eine Zeile lang und lebt einen
Nachmittag: *diese Variable vor dem PR umbenennen*, *der Fixture-Pfad stimmt
nicht*, *nach dem Retry-Limit fragen*. Ein Issue-Tracker ist dafür zu schwer,
eine Kritzeldatei landet versehentlich in einem Commit, und ein Klebezettel ist
weg, sobald du das Repository wechselst.

Aufgaben sind genau diese Liste — am Repository, in dem du gerade stehst.

![Die Aufgabenliste mit einer geöffneten Aufgabe samt Notizen und Priorität](../../screenshots/todos.webp)

## Wo sie liegen

Nirgendwo in deinem Repository. Eine Aufgabe wird bei den Einstellungen von
Gitcito gespeichert, nach dem Pfad des Repositorys geschlüsselt. Daraus folgen
drei Dinge:

- **Es wird nichts committet.** In `git status` taucht keine Datei auf, also
  kann eine Aufgabe nie in einem Commit oder einem Diff mitfahren.
- **Niemand sonst sieht sie.** Das ist eine Notiz an dich, kein geteiltes
  Backlog. Was dem Team gehört, gehört in ein Issue.
- **Sie folgt dem Ordner, nicht dem Branch.** Denselben Klon in zwei Tabs
  geöffnet: eine Liste. Ein zweiter Klon desselben Projekts woanders auf der
  Platte: eine zweite, eigene Liste.

Der Branch, auf dem du beim Schreiben warst, wird als *Kontext* festgehalten und
in der Detailansicht gezeigt. Das ist eine Erinnerung, kein Filter — Aufgaben
verschwinden nicht, wenn du etwas anderes auscheckst.

## Eine schreiben

Öffne die Liste — die Schaltfläche ↗ in der Kopfzeile des Abschnitts
**Aufgaben**, der Chip in der Statusleiste oder **Aufgaben** in der
Befehlspalette —, tippe die Zeile und drücke <kbd>Enter</kbd>. Der
Seitenleisten-Abschnitt bleibt eine Liste zum Lesen und Abhaken; geschrieben
wird an genau einer Stelle.

Sortiert wird für dich: offene Aufgaben zuerst — hohe Priorität über normaler,
normale über niedriger —, innerhalb einer Priorität die älteste zuerst, denn was
am längsten ignoriert wurde, gehört gesehen. Erledigtes sinkt nach unten, zuletzt
Abgehaktes oben, damit ein Fehlklick sofort rückgängig zu machen ist.

## In Ihre eigene Reihenfolge bringen

Die Standardsortierung hat eine Meinung und liegt manchmal falsch: Die drei
Dinge, die Sie heute Nachmittag wirklich vorhaben, sind nicht zwangsläufig die
drei lautesten. Ziehen Sie eine Zeile am Griff oder drücken Sie ihre
▲/▼-Schaltflächen – <kbd>Alt</kbd> mit den Pfeiltasten tut dasselbe über die
Tastatur – und die Liste behält Ihre Reihenfolge.

Das erste Ziehen oder Verschieben schaltet **Manuelle Reihenfolge** für Sie ein;
entfernen Sie den Haken in der Filterzeile, um die Liste wieder der
Prioritätssortierung zu überlassen, die genau so erinnert wird, wie sie war.
Zwei Grenzen, die man kennen sollte:

- **Nur offene Aufgaben bewegen sich.** Erledigte bleiben in ihrem Stapel
  darunter, die zuletzt abgehakte oben – in jedem Modus.
- **Das Umsortieren tritt zurück, solange im Filterfeld Text steht**, denn eine
  Zeile, die an unsichtbaren Nachbarn vorbeizieht, landet dort, wo Sie sie nicht
  erwartet haben.

Die Priorität wird weiterhin angezeigt, als Signalbalken neben jeder Zeile – ein
Balken für niedrig, drei für hoch – und steuert nach wie vor den gelben Chip in
der Statusleiste.

## Sie sehen, ohne hinzusehen

![Der Abschnitt in der Seitenleiste und der Chip in der Statusleiste in einem Fenster](../../screenshots/todos-markers.webp)

| Markierung | Wo | Bedeutet |
|---|---|---|
| Chip <kbd>☑ 3</kbd> | Statusleiste, links vom Branch-Namen | Wie viele offen sind; gelb, wenn eine hohe Priorität hat |
| Zähler | Die Kopfzeile des Seitenleisten-Abschnitts | Dieselbe Zahl, direkt an der Liste |

Beide verschwinden bei null. Ein dauerhaftes „0 Aufgaben“ ist Mobiliar, und
Mobiliar ist genau das, was man irgendwann nicht mehr sieht.

## Die Detailansicht

Klicke eine Aufgabe an — in der Seitenleiste, auf den Chip in der Statusleiste
oder über **Aufgaben** in der Befehlspalette —, um die vollständige Liste mit
Detailbereich zu öffnen.

| Feld | Wofür es da ist |
|---|---|
| **Titel** | Die eine Zeile. Wird direkt bearbeitet; es gibt keinen Speichern-Knopf. |
| **Notizen** | Alles, was der Titel nicht fasst: warum es zählt, welche Dateien, wann es erledigt ist. |
| **Priorität** | Niedrig, normal oder hoch. Steuert die Sortierung und die Farbe des Chips. |
| **Erstellt / Erledigt** | Wann du sie geschrieben und wann du sie abgehakt hast. |
| **Notiert auf** | Der Branch, der damals ausgecheckt war. |

Dieselbe Ansicht trägt das Filterfeld, den Schalter **Erledigte anzeigen** und
**Erledigte löschen** — das entfernt Abgehaktes endgültig und fragt vorher.

Dieser Schalter ist derselbe wie **Einstellungen → Darstellung → Erledigte Aufgaben ausblenden**: schaltest du ihn aus, verschwinden abgehakte Aufgaben aus dieser Liste und aus dem Seitenleisten-Abschnitt. Gelöscht wird nichts, und die Zähler berücksichtigen sie weiterhin.

## Was sie bewusst nicht tut

- **Keine Fälligkeitsdaten, keine Erinnerungen, keine Benachrichtigungen.** Eine
  Aufgabenliste, die drängelt, ist ein Kalender; diese wartet, bis du hinsiehst.
- **Keine Synchronisierung, kein Teilen.** Sie verlässt deinen Rechner nicht und
  ist nicht Teil eines Workspace-Exports.
- **Keine Verknüpfung zu Issues oder Commits.** Wenn eine Notiz so viel Struktur
  verdient, ist sie dieser Liste entwachsen — öffne ein [Issue](hosting.md).
- **Löschen ist endgültig.** Für eine gelöschte Aufgabe gibt es keinen
  Rückgängig-Eintrag, weil git sie nie festgehalten hat.

**Siehe auch:** [Einstellungen pro Repository](repo-settings.md) ·
[Missionskontrolle](mission-control.md)
