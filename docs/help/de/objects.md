---
title: Objekt-Explorer
category: Repository & Historie
order: 16
summary: Die Schicht unter dem Graphen ablaufen — Commits, Trees, Blobs, Tags und die Refs, die auf sie zeigen. Nichts hier ändert irgendetwas.
keywords: objekte objects objekt-explorer object explorer blob tree commit tag ref plumbing cat-file ls-tree sha1 interna internals datenbank database rev-parse HEAD^{tree} lose loose gepackt packed
---

# Objekt-Explorer

Git hat den Ruf, kompliziert zu sein. Fast alles davon rührt daher, dass man
das Modell nie zu Gesicht bekommt: **vier Arten von Objekten, und Zeiger**.
Sobald du auf einen Commit klicken, bei seinem Tree landen und feststellen
kannst, dass deine Datei ein Blob *ist*, dem ein Tree einen Namen gegeben hat,
hört das Porzellan auf, Magie zu sein.

`⌘K` → **Objekt-Explorer**. Nichts auf dieser Seite kann ein Byte verändern —
jeder Aufruf dahinter ist ein Lesevorgang.

![Die Felder eines Commits, mit Tree und Parents als Links, neben der Ref-Liste](../../screenshots/objects.webp)

## Die vier Objekte

| Objekt | Ist | Weiß |
|--------|----|-------|
| **blob** | Der *Inhalt* einer Datei | Nichts. Nicht seinen Namen, nicht seinen Pfad, nicht seine Historie |
| **tree** | Ein Verzeichniseintrag | Namen, Modi und die SHA jedes Kind-Blobs oder -Trees |
| **commit** | Eine Momentaufnahme | Seinen Tree, seine Parents, Autor, Committer, Nachricht |
| **tag** | Ein annotierter Tag | Das Objekt, auf das er zeigt, den Tagger, eine Nachricht |

Die Überraschung ist für die meisten die erste Zeile. **Ein Blob hat keinen
Namen.** Zwei Dateien mit identischem Inhalt, irgendwo in deiner Historie, sind
derselbe Blob und werden einmal gespeichert. Der Name lebt im Tree, der auf ihn
zeigt — weshalb Git Inhalte trackt statt Dateien, und weshalb Umbenennungen
erkannt und nicht aufgezeichnet werden.

Eine **Ref** — `refs/heads/main`, `refs/tags/v1.0`, `HEAD` — ist nur eine Datei,
die eine SHA enthält. Das ist alles, was hinter „Branchen ist billig" steckt.

## Ablaufen

Die linke Spalte listet jede Ref des Repositorys auf, gruppiert so, wie Git sie
gruppiert. Klick eine an, um bei dem Objekt zu landen, das sie benennt.

Von dort aus ist alles ein Link:

- Ein **Commit** zeigt seinen `tree` und jeden `parent` — klick dich zur
  Momentaufnahme durch, oder rückwärts durch die Historie, Commit für Commit.
- Ein **Tree** listet seine Einträge mit Modus, Typ, SHA und Größe. Klick auf
  einen Namen, um dieses Kind zu öffnen.
- Ein **Blob** zeigt seinen Text (bei allem Großen dessen Anfang) — oder sagt
  klar, dass er binär ist.
- Ein **annotierter Tag** zeigt, worauf er zeigt — klick dich zum Commit durch.

**Zurück** geht deine Schritte wieder ab.

## Eine Revision eintippen

Das Feld nimmt alles, was `git rev-parse` akzeptiert — und hier hört es auf, ein
Browser zu sein, und fängt an, ein Weg zum Lernen zu werden:

| Tipp das ein | Um das zu bekommen |
|-----------|--------|
| `HEAD` | Den aktuellen Commit |
| `HEAD~3` | Drei Commits zurück |
| `HEAD^{tree}` | Den Tree dieses Commits, ausgeschält |
| `HEAD:src/app.ts` | Den Blob für diesen Pfad, direkt |
| `v1.0^{}` | Das, worauf ein annotierter Tag zeigt, statt des Tag-Objekts |
| `a1b2c3d` | Jedes Objekt, per SHA — Abkürzungen funktionieren |

Die Modus-Ziffern in einer Tree-Auflistung lohnen sich zu kennen: `100644` eine
Datei, `100755` ausführbar, `040000` ein Untertree, `120000` ein Symlink,
`160000` ein Submodul-Gitlink — wobei letzteres alles ist, was ein Submodul
überhaupt speichert.

## Grenzen, die man kennen sollte

- **Nur lesend, mit Absicht.** Es gibt hier nichts zum Schreiben. Objekte von
  Hand zu bauen ist eine Übung mit `git hash-object` und gehört in ein Terminal.
- **Große Blobs werden abgeschnitten**, nach den ersten 200 KB — genug, um zu
  sehen, worum es geht, nicht genug, um das Fenster hängen zu lassen.
- **Größen sind die Inhaltsgröße des Objekts**, so wie `git cat-file -s` sie
  meldet, nicht das, was es nach dem Packen auf der Platte kostet. Dafür siehe
  [Wartung](maintenance.md).
- **Unerreichbare Objekte sind trotzdem Objekte.** Füg eine SHA aus einem
  Dangling-Bericht von `git fsck` ein, und sie öffnet sich — oft der schnellste
  Weg zu sehen, was ein verlorener Commit enthielt, bevor du entscheidest, ob du
  ihn zurückholst.

Siehe auch: [Der Graph](graph.md) · [Repository-Wartung](maintenance.md) ·
[Wiederherstellung](recovery.md)
