---
title: Ersetzen & pfropfen
category: Repository & Historie
order: 17
summary: Die Historie eines Klons kürzen, ohne sie umzuschreiben — git replace, Grafts, und wie du die Historie zurückholst.
keywords: ersetzen pfropfen replace git replace graft refs/replace shallow historie kürzen archiv parents umschreiben filter-branch alternative kleinerer clone useReplaceRefs no-replace-objects
---

# Ersetzen & pfropfen

`git replace` sagt git: *wo immer du gerade Objekt A lesen wolltest, lies
stattdessen B*. Nichts wird umgeschrieben. Kein Sha ändert sich. Jeder Commit
bleibt exakt dort, wo er war — git schaut im Vorbeigehen nur woanders hin.

Das klingt nach einer Kuriosität, bis du einen kleineren Klon willst. Dann ist
es die ehrliche Alternative zu einem Umschreiben der Historie: **pfropf einen
Commit auf gar keine Parents**, und alles davor fällt aus dem Log, aus dem
Graphen und aus jedem Klon, der von dort aus entsteht — während es weiterhin
gespeichert und weiterhin fetchbar bleibt und nur eine gelöschte Ref davon
entfernt ist, zurückzukommen.

`⌘K` → **Ersetzen & pfropfen**.

![Bestehende Ersetzungen und darunter das Formular zum Pfropfen](../../screenshots/replace.webp)

## Pfropfen

| Du gibst an | Und bekommst |
|---------|-------------|
| Einen Commit, **keine Parents** | Dieser Commit wird zum Anfang der Historie |
| Einen Commit, **einen oder mehrere Parents** | Er hängt sich dort an, statt dort, wo er wirklich sitzt |

Die zweite Form ist die interessante. Behalte die vollständige Historie in einem
Archiv-Repository, kürze das Arbeits-Repository, und ein Graft, der auf die
Spitze des Archivs zeigt, hängt die beiden wieder zusammen — derselbe Trick, mit
dem GitHub einen Shallow-Klon ausliefert, der sich trotzdem noch vertiefen
lässt.

**Auf gar keine Parents zu pfropfen fragt vorher nach**, denn „die Historie ist
weg“ und „die Historie ist versteckt“ sehen im Log identisch aus und sind
überhaupt nicht dasselbe. Die Objekte überleben, bis ein `gc` sie wegräumt;
siehe [Wartung](maintenance.md).

## Damit leben

**Ersetzungen sind Refs**, unter `refs/replace/`. Daraus folgen drei Dinge, die
man wissen sollte:

- Sie sind **lokal, bis sie gepusht werden**: `git push origin "refs/replace/*"`
  teilt sie, und wer ohne sie klont, sieht die unangetastete Historie.
- **Undo funktioniert** — die Ref zu entfernen stellt die echte Abstammung
  sofort wieder her, und Gitcito zeichnet das Pfropfen wie alles andere als
  rückgängig machbare Aktion auf.
- `core.useReplaceRefs=false` bringt git dazu, sie alle auf einen Schlag zu
  ignorieren. Der Schalter hier schreibt genau das, und der Dialog sagt es dir,
  wenn er aus ist — denn ein Repository, das seine eigenen Ersetzungen
  stillschweigend ignoriert, ist ein verwirrender Ort.

Auf der Kommandozeile zeigt `git --no-replace-objects log` die echte Historie,
ohne dass du eine Einstellung änderst.

## Wann du danach greifst statt nach einem Umschreiben

| Ziel | Werkzeug |
|------|------|
| Der Klon ist zu groß, die Historie ist in Ordnung | **Pfropfen** — nichts wird umgeschrieben, umkehrbar |
| Ein Geheimnis oder ein riesiger Blob muss *weg* sein | [Eine Datei aus der Historie entfernen](history-purge.md) — ein echtes Umschreiben |
| Du willst einmalig einfach weniger herunterladen | `git clone --depth` — shallow, keine Refs zu verwalten |

Ein Graft entfernt nichts. Wenn der Grund, aus dem du die alten Commits loswerden
willst, der ist, dass sie etwas enthalten, das nie hätte committet werden
dürfen, ist das hier die falsche Seite: Die Objekte sind immer noch da, immer
noch per Sha fetchbar und immer noch in jedem existierenden Klon.

## Grenzen, die man kennen sollte

- **Was du siehst, deckt sich nicht mehr mit dem, was gespeichert ist.** Das ist
  das Feature — und die Gefahr. Wer einen Klon mit Ersetzungen debuggt, muss
  wissen, dass es sie gibt.
- **Ersetzungen reisen standardmäßig nicht mit**, also können das `git log` einer
  Kollegin und deines sich völlig berechtigt widersprechen.
- **Eine Ersetzung kann einen Commit vor Werkzeugen verbergen, nicht vor git.**
  `git cat-file` und der [Objekt-Explorer](objects.md) öffnen das Original
  weiterhin per Sha.
- **Gitcito bietet `git replace --edit` nicht an** (den Inhalt eines Objekts von
  Hand umschreiben). Das ist die Aufgabe eines Texteditors auf einem rohen
  Objekt — und ein Schuss ins eigene Knie, wenn man eine UI drumherum baut.

Siehe auch: [Objekt-Explorer](objects.md) ·
[Eine Datei aus der Historie entfernen](history-purge.md) ·
[Repository-Wartung](maintenance.md)
