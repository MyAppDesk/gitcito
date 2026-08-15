---
title: Subtrees
category: Branches & Eingriffe
order: 49
summary: Ein anderes Repository in ein Verzeichnis von diesem hier einbetten — die Dateien sind wirklich da, ohne Submodul-Zeremonie.
keywords: subtree git subtree vendor bibliothek einbetten prefix split squash monorepo submodul alternative pull push
---

# Subtrees

Ein Subtree kopiert ein anderes Repository in ein Verzeichnis von deinem. Danach
sind die Dateien **wirklich da**: ein schlichtes `git clone` holt sie mit,
`git checkout` bewegt sie wie jede andere Datei, und niemand muss wissen, dass
das Verzeichnis von woanders herkommt.

Das ist der ganze Unterschied zu einem [Submodul](lfs-sparse.md), das nur einen
Zeiger speichert und `--recurse-submodules`, seinen eigenen Checkout und seinen
eigenen detached HEAD braucht, den man auseinanderhalten muss.

`⌘K` → **Subtrees**.

![Ein eingebettetes Verzeichnis, in der Historie gefunden, mit der Quelle, die Gitcito sich dafür merkt](../../screenshots/subtree.webp)

## Der Haken, den niemand erwähnt

**Git führt kein Manifest für Subtrees.** Ein Submodul hat `.gitmodules`, worin
jede URL und jeder Pfad steht. Ein Subtree hat nichts — nur einen
`git-subtree-dir:`-Trailer an dem Commit, der den Import gemacht hat.

Ein Repository kann also einen Subtree enthalten und dir keinerlei Möglichkeit
geben herauszufinden, woher er kam. Gitcito tut, was es kann:

- Die Liste wird aus der Historie ermittelt, indem diese Trailer gelesen werden.
  Jeder Subtree, den irgendwer mit irgendeinem Werkzeug hinzugefügt hat, taucht
  auf.
- Das **Quell-Repository und die Ref** merkt sich Gitcito in der git-Konfiguration
  dieses Repositorys. Ein aus der Historie ermittelter Subtree startet mit leeren
  Feldern — trag sie einmal ein, und Pull und Push funktionieren von da an.

Die gemerkten Werte liegen unter `gitcito.subtree.*` in `.git/config`, bleiben
also beim Repository, reisen aber nicht in einen Klon mit. **Vergessen** löscht
sie und rührt sonst nichts an.

## Einen hinzufügen

| Feld | Bedeutung |
|-------|-------|
| Verzeichnis | Wo er landet, z. B. `vendor/parser`. Darf noch nicht existieren |
| Quell-Repository | Eine URL oder ein Pfad auf der Platte |
| Branch oder Tag | Was importiert wird |
| Squash | Als einen einzigen Commit hereinholen statt seiner gesamten Historie |

**Lass Squash an**, wenn du keinen Grund dagegen hast. Ohne es wird jeder einzelne
Commit der Bibliothek für immer in dein Log eingeflochten, und `git log` handelt
nicht mehr von deinem Projekt.

## Damit leben

| Aktion | Was sie ausführt |
|--------|--------------|
| **Pull** | `git subtree pull` — Änderungen von upstream landen als Merge in deinem Verzeichnis |
| **Push** | `git subtree push` — deine lokalen Änderungen unter diesem Verzeichnis gehen zurück an die Quelle |
| **Split** | `git subtree split -b <branch>` — extrahiert die eigene Historie des Verzeichnisses in einen Branch, mit den Dateien in dessen Wurzel |

**Split** ist das, was zu kennen sich lohnt: es verwandelt ein eingebettetes
Verzeichnis zurück in die Historie eines eigenständigen Repositorys — so hört ein
Subtree auf, ein Subtree zu sein.

## Grenzen, die man kennen sollte

- **Push ist langsam.** Er berechnet die Historie des Verzeichnisses jedes Mal
  komplett neu. Bei einem großen Repository sind das Sekunden bis Minuten, nicht
  sofort, und Gitcito kann nur darauf warten.
- **Ein Pull ist ein Merge**, kann also wie jeder Merge Konflikte erzeugen — du
  landest [im Resolver](conflicts.md).
- **`git subtree` ist ein contrib-Skript**, kein git-Builtin. Einer abgespeckten
  git-Installation kann es fehlen; Gitcito sagt das klar, statt dir
  "'subtree' is not a git command" weiterzureichen.
- **Gesquashte Historie lässt sich später nicht ent-squashen.** Die Commits wurden
  nie importiert.
- Gitcito wandelt kein Submodul in einen Subtree um, und auch nicht umgekehrt.

Siehe auch: [Mergen & Rebasen](merging.md) · [Plumbing mit UI](lfs-sparse.md)
