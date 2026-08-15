---
title: Eine Datei aus der Historie entfernen
category: Branches & Eingriffe
order: 48
summary: Ein geleaktes Credential oder ein riesiges Binary aus jedem Commit holen — und genau verstehen, was das kostet.
keywords: purge bereinigen historie verlauf umschreiben rewrite filter-branch bfg filter-repo geleakt secret credential token datei entfernen big blob repository verkleinern backup pre-purge rotieren durchsuchen größte dateien
---

# Eine Datei aus der Historie entfernen

`git rm` verhindert, dass eine Datei in *neuen* Commits auftaucht. Auf die
bereits gemachten hat es keine Wirkung: Der Blob liegt weiterhin in der
Objektdatenbank, weiterhin in jedem Clone, weiterhin ein `git show` entfernt.

Das ist gleich zweimal wichtig — wenn die Datei ein Credential war, und wenn sie
400 MB groß war.

`⌘K` → **Datei aus der Historie entfernen**, oder Rechtsklick auf die Datei — im
Projektbaum, in der Dateiliste eines Commits oder im Commit-Editor. Der Commit,
der eine Datei *gelöscht* hat, ist meist der Ort, an dem jemand merkt, dass sie
immer noch in der Historie steckt — deshalb liegt der Ausweg auch in diesem Menü.

## Den Pfad finden

Zwei Wege hinein, weil sie verschiedene Fragen beantworten.

**Tippe ihn** — relativ zum Repository, kein führender Schrägstrich — wenn du
schon weißt, was du entfernen willst.

**Historie durchsuchen**, wenn du es nicht weißt. Sie listet jeden Pfad auf, der
je committet wurde, die schwersten zuerst, mit der Anzahl seiner Versionen und
der Info, ob er noch getrackt wird. Gelöschte Pfade sind als solche markiert und
sind meist die, die du suchst: Eine Datei, die aus dem Arbeitsverzeichnis
verschwunden, aber noch in jedem Clone ist, ist genau der Fall, den ein normaler
Dateidialog dir nicht zeigen kann, weil die Datei zum Auswählen gar nicht da ist.

Dieselbe Liste beantwortet auch den anderen Grund, aus dem Leute hierherkommen —
*warum ist dieser Clone zwei Gigabyte groß* —, denn sie ist nach den Bytes
sortiert, die die Blobs jedes Pfads tatsächlich belegen. Eine Zeile auszuwählen
misst sie sofort.

![Jeder je committete Pfad, die schwersten zuerst, gelöschte markiert](../../screenshots/history-purge-browse.webp)

## Messen, bevor du zustimmst

Drücke **Messen** (oder wähle eine Zeile). Noch wird nichts geschrieben. Du
bekommst:

| | |
|---|---|
| **Umgeschriebene Commits** | Jeder Commit ab dem ersten, der die Datei enthielt |
| **Branches / Tags** | Refs, die sich bewegen werden |
| **Von seinen Blobs belegt** | Bytes, die diese Versionen tatsächlich einnehmen |
| **Erster Commit** | Wo das Umschreiben beginnt — alles danach bekommt einen neuen Hash |

![Die Messung: umgeschriebene Commits, betroffene Refs, belegte Bytes und die Warnung, das Secret trotzdem zu rotieren](../../screenshots/history-purge.webp)

Ist die Zahl null, stimmt der Pfad nicht. Das ist meistens ein Tippfehler oder
ein fehlendes Verzeichnispräfix, keine Abwesenheit.

## Was das Umschreiben tatsächlich tut

Gitcito kopiert jeden Branch und jeden Tag nach
`refs/gitcito/pre-purge/<timestamp>/…` und führt dann aus:

```sh
git filter-branch --force \
  --index-filter 'git rm --cached --ignore-unmatch -- <path>' \
  --prune-empty --tag-name-filter cat -- --branches --tags
```

`--index-filter` schreibt den Index direkt um, statt jeden Commit auszuchecken —
das ist der Unterschied zwischen Minuten und Stunden. `--branches --tags` statt
`--all` ist Absicht: `--all` würde die Backup-Refs einschließen, und das
Umschreiben würde sein eigenes Sicherheitsnetz auffressen.

Commits, die nichts außer der entfernten Datei enthielten, fallen weg
(`--prune-empty`). Tags werden auf ihre umgeschriebenen Commits umgehängt.

## Das Backup, und warum der Speicherplatz noch nicht zurückkommt

Die Bereinigung lässt sich rückgängig machen, und der Preis dafür ist, dass
**der Speicherplatz erst freigegeben wird, wenn du es sagst**. Solange das Backup
existiert, sind die alten Commits noch erreichbar, also räumt git sie nicht weg.

| Aktion | Wirkung |
|--------|--------|
| **Wiederherstellen** | Jeder Branch und jeder Tag kehrt zu seinem Commit von vor der Bereinigung zurück; die Datei kommt mit ihnen zurück |
| **Backup verwerfen** | Löscht die Backup-Refs, lässt den Reflog verfallen, führt `git gc --prune=now` aus — Platz zurück, Bereinigung jetzt endgültig |

Zwei Schritte statt einem, weil der erste die wiederherstellbare Hälfte ist und
der zweite es nicht ist.

## Rotiere das Secret trotzdem

**Wenn ein Credential jemals gepusht wurde, macht das Umschreiben deiner Historie
den Leak nicht ungeschehen.** Jemand kann es gefetcht haben; Forge-Server
behalten unreferenzierte Objekte eine Weile; ein CI-Log kann es ausgegeben haben.
Das Umschreiben verhindert, dass es sich weiter verbreitet — es macht die
Offenlegung nicht rückgängig.

Rotiere den Key. Und bereinige dann, damit die nächste Person, die klont, ihn
nicht findet.

## Was es nicht tun wird

- **Es wird nicht pushen.** Umschreiben ist lokal. Das Ergebnis zu
  veröffentlichen heißt Force-Push auf jeden betroffenen Branch, und alle anderen
  müssen neu klonen oder hart zurücksetzen — der
  [Force-Push-Schutz](syncing.md) ist der Ort, an dem diese Entscheidung fällt.
- **Es verweigert bei schmutzigem Arbeitsverzeichnis** oder mitten in einem Merge
  bzw. Rebase. Ein Rewrite bewegt HEAD wieder und wieder, und das rund um
  uncommittete Arbeit zu tun ist der Weg, auf dem sie verloren geht.
- **Es schreibt nach Pfad um, nicht nach Inhalt.** Ein Secret zu entfernen, das
  in eine Quelldatei hineinkopiert wurde statt in einer eigenen Datei zu liegen,
  braucht einen Content-Filter — das ist das Revier von
  `git filter-repo --replace-text`, und Gitcito kapselt es nicht.
- **`filter-branch` ist langsam bei sehr großen Historien.** Es ist das, was
  überall mit git mitgeliefert wird, und deshalb das, was Gitcito verwendet. Bei
  einem Repository mit Zehntausenden Commits ist `git filter-repo` im
  [Terminal](terminal.md) das schnellere Werkzeug.
- **Die Clones anderer Leute sind nicht dein Repository.** Sie behalten die alte
  Historie, bis sie neu klonen.
