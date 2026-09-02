---
title: Fetchen, Pullen & Pushen
category: Sync & viele Repos
order: 50
summary: Im Gleichschritt bleiben, mit Schutzmechanismen für die Operationen, die beißen.
keywords: fetch pull push force auto-fetch prune remote remotes upstream geschützter branch mehrere remotes fork mirror push tags all kein remote remote hinzufügen
---

# Fetchen, Pullen & Pushen

## Pull

Drei Modi, aus dem Dropdown gewählt: **Standard**, **nur Fast-Forward** oder
**Rebase**. Lokale Änderungen werden rund um den Pull automatisch gestasht und
wiederhergestellt, ein schmutziger Working Tree blockiert dich also nicht.

### Ein Branch, der nichts verfolgt

`git pull` ist ein Fetch gefolgt von einem Merge, und der Merge muss wissen,
*wohin* er mergen soll — in den Upstream des Branches. Ein lokal angelegter oder
ohne Tracking ausgecheckter Branch hat keinen. Der Fetch gelingt trotzdem, eine
lange Liste aktualisierter `origin/*`-Refs zieht vorbei, und dann bricht git ab
mit *"There is no tracking information for the current branch"*. Es wurde nichts
gepullt und nichts kaputtgemacht: der zweiten Hälfte fehlte schlicht das Ziel.

Gitcito liest diesen Fehler und bietet die Reparatur als Button an — welche,
hängt davon ab, ob der Remote den Branch schon führt:

| | |
|---|---|
| **Er liegt auf dem Remote** | **Verbinden & pullen** — setzt den Upstream auf `<remote>/<branch>` und führt dann den gewünschten Pull aus. **Mit ⌘Z widerrufbar**, was das Tracking wieder löst. |
| **Er ist noch nicht dort** | **Branch pushen** — ein gewöhnlicher Push, der den Upstream nebenbei setzt. |

Angeboten wird `origin`, sofern vorhanden, sonst der erste Remote der Liste.
Welcher Fall vorliegt, wird aus den Remote-Tracking-Refs gelesen, nicht über das
Netz — die Antwort spiegelt also den gerade gelaufenen Fetch.

## Push

Force-Pushes verwenden immer `--force-with-lease` — die sichere Variante, die
sich weigert, wenn sich der Remote bewegt hat, seit du zuletzt hingeschaut hast.
Ein **geschützter Branch** mit Force gepusht verlangt eine Bestätigung (die Liste
steckt im Zahnrad der Repository-Einstellungen).

![Die Bestätigung, die ein geschützter Branch vor einem Force-Push verlangt](../../screenshots/force-push-guard.webp)

### Keine Remotes

Push, Pull und Fetch brauchen ein Ziel. Ein Repository ohne eines — ein
frisches `git init`, ein Clone dessen Origin entfernt wurde — ließ diese
Knöpfe bisher nichts tun, oder einen leeren Fetch als Erfolg zählen. Sie
öffnen jetzt **Remote hinzufügen**, mit einem Hinweis, damit du eine URL
einfügen oder das Repo auf dem Host anlegen kannst. Das Hinzufügen beendet
die Aktion, mit der du angefangen hast: ein Push veröffentlicht den aktuellen
Branch, ein Pull holt und pullt, ein Fetch holt nur.

Der automatische Fetch im Hintergrund bleibt still, wenn es nichts zu holen
gibt. Er öffnet keinen Dialog nach der Uhr.

### Mehr als ein Remote

Der **Push**-Button zielt auf den Upstream des Branches. Der Pfeil daneben bietet
außerdem an, sobald ein Repository mehr als einen Remote hat:

| | |
|---|---|
| **Zu einem Remote pushen** | Wähle einen einzelnen Remote — einen Fork, einen Mirror, ein Deploy-Ziel |
| **Zu allen N Remotes pushen** | Ein Push pro Remote, der Reihe nach |
| **Alle Tags pushen zu** | `git push <remote> --tags`, alle lokalen Tags auf einmal |

Dieselben zwei Aktionen sitzen in der Seitenleiste auch in der Zeile jedes
einzelnen Remotes — und dort bist du meistens, wenn die Frage aufkommt.

**Eine Ablehnung bricht den Rest nicht ab.** Einen Fork und dessen Upstream zu
pushen ist genau der Fall, in dem die eine Seite sich weigert und die andere
trotzdem durchgehen soll, deshalb meldet jeder Remote für sich: Erfolge werden in
einem Toast namentlich genannt, und jeder Fehlschlag bekommt seinen eigenen mit
der Begründung von git.

Nur der **erste** Remote in der Liste setzt den Upstream des Branches. Ein Branch
hat einen Upstream, und der zuletzt gepushte Remote ist nicht automatisch der, den
er tracken soll.

Beide Wege durchlaufen dieselben Prüfungen wie ein gewöhnlicher Push — die
Bestätigung für geschützte Branches und den [Secret-Schutz](security.md). An zwei
Remotes zu veröffentlichen ist die doppelte Exposition, nicht die halbe Vorsicht.

## Branches, auf denen du nicht stehst

`git pull` bewegt immer nur HEAD — deshalb verlangen die meisten Clients erst
einen Checkout, bevor ein Branch nachziehen kann. Gitcito nicht: Rechtsklick auf
einen lokalen Branch — in der Seitenleiste oder auf dem Badge im
[Graphen](graph.md) — bringt **\<Branch\> pullen** und **\<Branch\> pushen**, beide
auf *diesen* Branch bezogen.

| | |
|---|---|
| **`<Branch>` pullen** | Zieht die lokale Ref per Fast-Forward auf ihr Upstream nach, ohne Checkout. Das Arbeitsverzeichnis bleibt unberührt. **Mit ⌘Z rückgängig** — das Undo setzt den Branch zurück. |
| **`<Branch>` pushen** | Ein gewöhnlicher Push dieses Branches, mit denselben Protected-Branch- und [Secret-Wächtern](security.md) wie der Button in der Toolbar. |

Pullen ist ausgegraut, wenn der Branch nichts trackt — es gibt nichts zu holen.
Auf dem Branch, auf dem du *stehst*, fallen beide auf den normalen Pull zurück,
der auch das Arbeitsverzeichnis aktualisiert.

**Die Grenze, die zählt:** ein Branch, der von seinem Upstream **abgewichen**
ist, wird abgelehnt — mit einer Meldung, die das sagt. Eine Divergenz aufzulösen
heißt Merge oder Rebase, und beide brauchen ein Arbeitsverzeichnis; dieser Fall
kostet dich also weiterhin einen Checkout. Ein Force-Push für einen Branch, auf
dem du nicht stehst, wird angeboten, wenn der Remote den Push ablehnt — der Weg
"erst pullen, dann erneut" aus demselben Grund nicht.

## Fetch

**Fetch** hat einen eigenen Button in der Toolbar, direkt neben Pull. Er holt von
jedem Remote und prunt, sodass deine `origin/*`-Refs und alle Ahead/Behind-Zähler
aktuell sind — und rührt weder deinen Branch noch deinen Arbeitsbaum an. Das ist
der Button, wenn du *sehen* willst, was die anderen getan haben, ohne deine
eigene Arbeit zu bewegen.

Dazu gibt es einen **Auto-Fetch** im Hintergrund in einem von dir gesetzten
Intervall (Einstellungen → Allgemein). Fahre über den Fetch-Button, und das Alter
blendet sich darunter ein — *vor 4 Min.* — bernsteinfarben, sobald ein Fetch
älter als fünfzehn Minuten ist. Es belegt nie Platz in der Toolbar, denn es
beantwortet eine Frage, die man nur beim Griff zum Button stellt. Es stammt aus
`FETCH_HEAD`, ein `git fetch` im Terminal zählt also genauso.

Ein Fetch, der **umgeschriebene Historie** findet, sagt das: ein Toast nennt den
Branch, und dessen Zeile bekommt einen Marker, der [was sich seither geändert
hat](range-diff.md) genau bei dem Commit öffnet, auf den er früher zeigte.

## Viele Repositorys auf einmal

- Ein Gruppen-Tab kann seinen ganzen Teilbaum **fetchen / pullen**.
- [Mission Control](mission-control.md) macht es über den gesamten Workspace und
  kann *nur* die Repositorys pullen, die tatsächlich hinterherhinken.

## Remotes

Einzelne Remotes hinzufügen, bearbeiten, entfernen und fetchen — aus der
Seitenleiste. Branch-Zeilen tragen Badges für die Präsenz pro Remote, du siehst
also auf einen Blick, welche Remotes eine Kopie eines Branches haben.

**Fetch, Pull oder Push ohne Remotes** öffnet denselben Dialog „Remote
hinzufügen“, statt ins Leere zu laufen. Siehe [Fetchen, Pullen und Pushen](syncing.md).

**Siehe auch:** [Mission Control](mission-control.md) · [Hosting & Pull Requests](hosting.md)
