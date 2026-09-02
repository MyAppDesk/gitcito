---
title: Branches, Remotes & die Seitenleiste
category: Branches & Eingriffe
order: 40
summary: Alles, was die linke Seitenleiste kann, und angeheftete Branches.
keywords: branch branches erstellen auschecken checkout umbenennen löschen remote angeheftet pinned seitenleiste sidebar presence remote hinzufügen
---

# Branches, Remotes & die Seitenleiste

Eine einzige umsortierbare, durchsuchbare Seitenleiste beherbergt **Branches,
Remotes, Tags, Stashes, Worktrees und Submodule**. Jeder Abschnitt lässt sich
ausblenden oder umsortieren (Einstellungen → Layout), und das Filterfeld gilt
für alle.
Welche Abschnitte und Ordner auf- oder zugeklappt sind, merkt sich die
Seitenleiste pro Repository — auch über Neustarts hinweg.

Ein Abschnitt mit mehr als 300 Refs startet zugeklappt. In einem Repository mit
Tausenden nie gelöschter Remote-Branches stünden sonst alle auf dem Bildschirm,
ohne dass jemand danach gefragt hat; einmal aufklappen genügt, die Entscheidung
wird wie jede andere gemerkt.

![Die Seitenleiste, mit angehefteten Branches ganz oben](../../screenshots/pinned-branches.webp)

## Branches

Erstellen, auschecken, umbenennen und löschen — lokal wie remote. Branch-Zeilen
zeigen:

- **↑voraus / ↓zurück** gegenüber ihrem Upstream,
- **Presence-Badges pro Remote** (welche Remotes diesen Branch haben),
- einen **Risikopunkt** nach einem Scan des [Konflikt-Radars](conflict-radar.md),
- eine **⟳-Markierung**, wenn der Remote
  [die Historie umgeschrieben hat](range-diff.md).

Branches mit `/` im Namen werden automatisch in aufklappbare Ordner gefaltet.
Ein Rechtsklick auf einen Ordnerkopf wirkt auf die ganze Gruppe: *Alle Branches
unter `feature` löschen (4 Branches)* entfernt alles darin nach einer einzigen
Bestätigung, die genau auflistet, welche Branches gehen — der Branch, auf dem
du stehst, bleibt außen vor. Dasselbe Menü gibt es auf Remote-Branch-Ordnern;
dort wird vom Remote gelöscht.

Das Branch-Dropdown in der Werkzeugleiste listet lokale und Remote-Branches.
Ein Rechtsklick auf einen Branch in diesem Dropdown benennt einen lokalen
Branch um, kopiert seinen Namen, checkt ihn in einem neuen Worktree aus,
mergt ihn in den aktiven Branch oder löscht ihn. Remote-Branches bieten kein
Umbenennen an und werden nach einer Bestätigung von ihrem Remote gelöscht.
Gitcito blendet den Merge aus, wenn die gewählte Referenz bereits im aktiven
Branch enthalten ist, und deaktiviert das Anlegen eines Worktrees, wenn der
Branch schon ausgecheckt ist.

![Aktionen für lokale Branches im Dropdown der Werkzeugleiste](../../screenshots/branch-dropdown-local-context-menu.webp)

![Aktionen für Remote-Branches im Dropdown der Werkzeugleiste](../../screenshots/branch-dropdown-remote-context-menu.webp)

Zeilen lassen sich wie Dateien mehrfach auswählen: <kbd>⌘/Strg</kbd>-Klick
schaltet eine Zeile um, <kbd>Umschalt</kbd>-Klick wählt einen Bereich, und
<kbd>Umschalt</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> erweitert die Auswahl von der
zuletzt geklickten Zeile aus. Ein Rechtsklick auf die Auswahl öffnet das
Sammelmenü — *4 Branches löschen* — das mit der vollständigen Liste bestätigt.
Dieselben Gesten funktionieren auf Remote-Branches, Tags und Stashes.

![Branch-Namen mit Schrägstrich, zu einem Baum gefaltet](../../screenshots/branch-grouping.webp)

## Einen Branch umbenennen

Ein Branch, der vor drei Tagen `fix` hieß, ist heute ein Branch, den niemand
mehr einordnen kann. Benenne ihn dort um, wo dir das Problem aufgefallen ist:

| Wo | Wie |
|----|-----|
| Seitenleiste | Rechtsklick auf den Branch → *Umbenennen…* |
| Branch-Dropdown in der Toolbar | Rechtsklick auf den Branch → *Umbenennen…* |
| Commit-Graph | Rechtsklick auf das Branch-Badge an einem Commit → *Umbenennen…* |
| Befehlspalette | <kbd>⌘/Strg</kbd>+<kbd>K</kbd> → *Branch umbenennen* (wirkt auf den ausgecheckten Branch) |

Eine lokale Umbenennung ist `git branch -m`: sofort und **mit ⌘Z rückgängig zu
machen** — der Undo-Eintrag benennt zurück. Wer den Branch umbenennt, auf dem er
steht, bleibt darauf.

Verfolgt der Branch ein Remote, bietet das Menü zusätzlich *Umbenennen (inkl.
Remote)…*: lokal umbenennen, den neuen Namen pushen, den alten upstream löschen.
Das ist **nicht rückgängig zu machen** — der alte Remote-Branch ist weg, und wer
ihn ausgecheckt hatte, muss neu zeigen. An einem Graph-Badge erscheint die
Option nur, wenn der Branch genau ein Remote verfolgt; bei mehreren wähle den
Branch in der Seitenleiste, damit der Upstream eindeutig ist.

**Grenzen:** Gitcito schreibt nichts um, was auf den alten Namen verwies —
offene Pull Requests zeigen weiter auf den Branch, gegen den sie geöffnet
wurden, und CI-Regeln mit Branch-Muster greifen nicht mehr. Einen Branch
umzubenennen, der in einem anderen [Worktree](worktrees.md) ausgecheckt ist,
schlägt fehl, und git sagt das auch.

## Einen Branch pullen und pushen, auf dem du nicht stehst

Rechtsklick auf einen lokalen Branch zeigt **Pullen** und **Pushen**, die auf
*diesen* Branch wirken, nicht auf den ausgecheckten — kein Umweg über einen
Checkout, um drei Branches nachzuziehen. Siehe
[Fetchen, Pullen & Pushen](syncing.md).

## Angeheftete Branches

Markiere die Branches, zu denen du immer wieder zurückkehrst, mit einem Stern —
fahre über die Zeile und klicke ★, oder Rechtsklick → *Branch anheften*. Sie
tauchen in einer Gruppe **Angeheftet** oben im Abschnitt "Lokal" auf, pro
Repository gemerkt, und bleiben zugleich an ihrem gewohnten Platz darunter.

## Einen Remote-Branch auschecken

Doppelklicke einen Remote-Branch, um den lokalen Branch anzulegen, der ihn
trackt. Existiert bereits ein lokaler Branch dieses Namens und ist er
**divergiert**, fragt Gitcito, wie abgeglichen werden soll — rebasen, mergen
oder zurücksetzen — und bietet an, den Branch vorher zu sichern.

![Die Abfrage bei divergiertem Branch: rebasen, mergen oder zurücksetzen, mit Backup-Option](../../screenshots/diverged-checkout.webp)

### Wenn dein lokaler Branch zurückliegt

Er wird im Zuge des Checkouts auf den Stand des Remote vorgespult
(fast-forward). Ein schmutziger Arbeitsbaum wird vorher in einem benannten Stash
abgelegt und danach zurückgespielt, damit lokale Änderungen das Update nicht
abbrechen.

### Wenn dein lokaler Branch voraus ist

Liegt der lokale Branch vorn und das Remote hat nichts Neues, würde ein Checkout
die Anfrage nach dem *Remote*-Branch mit deiner eigenen, ungepushten Arbeit
beantworten — deshalb wird nichts ausgecheckt, bis du sagst, welche Seite du
meintest:

| Option | Was passiert |
|--------|--------------|
| Lokalen Branch auschecken | Wechselt zum lokalen Branch, Commits bleiben erhalten. Das, was jeder andere Client stillschweigend tut. |
| Reset (soft) | Setzt den Branch auf den Remote-Stand zurück; die Änderungen der Commits bleiben **gestaged** und können neu committet werden. |
| Reset (mixed) | Derselbe Schritt, die Änderungen bleiben **ungestaged** im Arbeitsbaum. |
| Reset (hard) | Verwirft die Commits *und* ihre Änderungen. |

![Der Dialog für den vorausliegenden Branch: lokal auschecken oder Reset soft, mixed, hard](../../screenshots/ahead-checkout.webp)

Lass *Zuerst einen Backup-Branch anlegen* aktiviert, dann wird der lokale Stand
vor jeder Änderung als `backup/<branch>-<zeitstempel>` gesichert — selbst ein
Hard-Reset ist damit nur einen Checkout vom Rückgängigmachen entfernt. Der Reset
landet außerdem im Undo-Stapel (⌘Z), allerdings nur bis du das Repository
schließt; der Backup-Branch überlebt das.

**Grenzen:** der Dialog vergleicht den Branch nur mit dem gerade geholten
Tracking-Ref. Ein Remote, das den Fetch abgelehnt hat (offline, falsche
Zugangsdaten), wird also gegen den zuletzt bekannten Stand verglichen. Ob deine
Commits *gut* sind, sagt er nicht — nur, dass es sie hier gibt und dort nicht.

## Remotes

In der Remotes-Sektion der Seitenleiste werden Remotes hinzugefügt, bearbeitet,
geholt und entfernt. Fetch, Pull oder Push auf einem Repository ohne eines
öffnet denselben Dialog **Remote hinzufügen** — URL einfügen oder das Repo auf
dem Host anlegen — statt nichts zu tun. Siehe [Fetchen, Pullen und Pushen](syncing.md).

**Siehe auch:** [Mergen & Rebasen](merging.md) · [Worktrees](worktrees.md)
