---
title: Bundles & Archive
category: Sync & viele Repos
order: 58
summary: Ein Repository als eine einzige Datei, aus der git klonen kann — oder ein Baum als Zip, für das niemand git braucht.
keywords: bundle git bundle archiv archive zip tarball tar gz export offline air gap usb e-mail übertragen transfer export-ignore gitattributes clone aus datei range bereich
---

# Bundles & Archive

Zwei Wege, ein Repository in eine einzige Datei zu packen. Sie sehen austauschbar
aus und sind es nicht — und dass man leicht den falschen wählt, ist der ganze
Grund für diese Seite.

| | Ein **Bundle** | Ein **Archiv** |
|---|---|---|
| Enthält | Historie: Commits, Branches, Tags | Die Dateien zu einem Commit |
| Geöffnet mit | `git clone` / `git fetch` — es *ist* ein Remote | Jedem Entpack-Tool |
| Danach | Du kannst erneut davon fetchen, mergen, weiterarbeiten | Nichts. Es ist ein Schnappschuss |
| Gut für | Arbeit auf eine Maschine ohne Netzwerk bringen | „Schick mir den Quellcode zu v2.1“ |

`⌘K` → **Repository bundeln** oder **Archiv exportieren**.

![Ein Repository wird in eine einzige Datei gebündelt, mit bereitstehender Bereichsoption](../../screenshots/export.webp)

## Bundles

Ein Bundle ist gits Antwort auf eine Lücke, die kein Netzwerk überbrückt: eine
Maschine ohne Netzanbindung, ein USB-Stick, ein E-Mail-Anhang, ein Laptop im
Flugzeug. Die Gegenseite führt `git clone work.bundle myrepo` aus und bekommt ein
echtes Repository, mit deiner Historie und deinen Branches, das aus dieser Datei
fetcht, als wäre sie ein Server.

Drei Umfänge:

| Umfang | Was mitreist | Größe |
|-------|--------------|------|
| **Alles** | Jeder Branch und jeder Tag, die vollständige Historie | Das ganze Repository |
| **Ein Branch oder Tag** | Diese Ref und alles, was sie erreicht | Meist das meiste davon |
| **Ein Bereich von Commits** | Nur das, was zwischen den beiden Enden liegt | Klein |

**Ein Bereichs-Bundle ist ein Patch der Historie, kein Repository.** Es hält das
entfernte Ende als *Voraussetzung* fest: git weigert sich, es in einem Repository
zu öffnen, das diesen Commit nicht bereits hat, weil es dort nichts gäbe, woran
die neuen Commits andocken könnten. Das ist das richtige Verhalten und beim
ersten Mal eine Überraschung. Nimm einen Bereich, wenn die andere Seite deine
Arbeit bis zu einem bestimmten Punkt schon hat — den Tag, den sie zuletzt
bekommen hat, oder den Commit, von dem ihr beide abgezweigt seid.

### Eines empfangen

**Bundle importieren…** liest die Datei, listet auf, was sie enthält, und sagt
gleich zu Beginn, ob dieses Repository damit etwas anfangen kann — fehlen
Voraussetzungen, nennt es dir ihre Anzahl, statt später mit gits eigener
Formulierung zu scheitern.

Importierte Refs landen unter **`bundle/…`**, im Remote-Tracking-Namensraum.
Lokal bewegt sich nichts: kein Branch wird fast-forwardet, keine Arbeit wird
überschrieben. Du mergst, rebast oder checkst `bundle/main` danach zu deinen
eigenen Bedingungen aus — genau wie einen Branch von jedem anderen Remote.

Um stattdessen ein *neues* Repository aus einem Bundle zu starten, klone im
Terminal aus der Datei: `git clone work.bundle myrepo`. Gitcito importiert in ein
geöffnetes Repository; es klont nicht aus einer Datei.

## Archive

`git archive` schreibt den Baum zu einem Commit als Zip oder Tarball. Kein
`.git`, keine Historie, keine Möglichkeit, davon zu fetchen — und genau das ist
der Punkt, wenn die Gegenseite Quellcode bekommen soll und kein Repository.

| Option | Was sie tut |
|--------|-------------|
| Referenz | Branch, Tag oder Commit, der exportiert wird. Ein Tag ist die übliche Antwort |
| Format | `zip`, `tar.gz` oder `tar` |
| In einen Ordner packen | Fügt einen Ordner auf oberster Ebene hinzu, damit das Entpacken nie Dateien überall verstreut |
| Nur dieser Pfad | Exportiert ein Unterverzeichnis statt des ganzen Baums |

### export-ignore ist der Grund, das hier zu benutzen

Ein Repository kann Pfade in `.gitattributes` markieren:

```
.github/     export-ignore
test/        export-ignore
*.psd        export-ignore
```

Diese Pfade **bleiben aus jedem Archiv heraus** und bleiben trotzdem im
Repository. So liefert ein Projekt einen Release-Tarball ohne seine
CI-Konfiguration, seine Fixtures und seine 200 MB Design-Dateien aus — und die
Regel lebt im Repository statt in irgendjemandes Release-Skript.

## Grenzen, die du kennen solltest

- **Ein Bundle ist eine vollständige Kopie**, außer du nutzt einen Bereich. Ein
  2-GB-Repository zu bundeln schreibt eine 2-GB-Datei und dauert so lange wie ein
  Clone.
- **Leere Bundles werden abgelehnt** — von git, nicht von Gitcito: Ein Bereich,
  zwischen dessen Enden nichts liegt, erzeugt einen Fehler statt einer nutzlosen
  Datei.
- **Der Import mergt nicht.** Refs landen unter `bundle/…` und bleiben dort, bis
  du etwas mit ihnen machst.
- **Ein Archiv hat keine Historie** und lässt sich deshalb nicht zurück in ein
  Repository verwandeln. Wenn die Gegenseite committen können muss, schick ein
  Bundle.
- **`export-ignore` wirkt nur auf Archive.** Es verbirgt nichts vor einem Clone,
  einem Bundle oder der Historie — dafür siehe
  [eine Datei aus der Historie entfernen](history-purge.md).

Siehe auch: [Synchronisieren](syncing.md) · [Sicheres Teilen](secure-share.md) ·
[Eine Datei aus der Historie entfernen](history-purge.md)
