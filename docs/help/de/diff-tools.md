---
title: Externe Diff- und Merge-Tools
category: Branches & Eingriffe
order: 43
summary: Gib eine Datei an Kaleidoscope, Beyond Compare, Meld oder was du sonst schon nutzt — Gitcito liest die Tool-Liste von git selbst.
keywords: difftool mergetool extern externes diff merge vergleich zusammenführen kaleidoscope beyond compare meld kdiff3 p4merge araxis opendiff filemerge vimdiff winmerge diff.tool merge.tool orig backup sicherung
---

# Externe Diff- und Merge-Tools

Gitcitos [Diff-Ansicht](diffs.md) und der [dreispaltige Resolver](conflicts.md)
reichen für die meisten Tage. An manchen Tagen nicht: eine generierte Datei mit
4.000 Zeilen, ein Merge, bei dem du vier Spalten gleichzeitig sehen musst, oder
schlicht das Tool, das du seit einem Jahrzehnt benutzt und schneller liest als
jedes neue.

**Einstellungen → Allgemein → Externe Diff- und Merge-Tools.**

## Es ist gits Liste, nicht unsere

Gitcito führt keine eigene Tabelle. Die Dropdowns sind
`git difftool --tool-help` und `git mergetool --tool-help` — und deshalb gilt:

- Die Tools, die git auf deiner Maschine bereits gefunden hat, stehen zuerst;
  die, die es kennt, aber nicht findet, stehen danach, markiert als *nicht
  installiert*.
- **Ein eigenes Tool funktioniert ohne zusätzliche Unterstützung.** Wenn du

  ```sh
  git config --global difftool.mine.cmd 'mycompare "$LOCAL" "$REMOTE"'
  ```

  gesetzt hast, taucht `mine` im Dropdown auf wie jedes eingebaute Tool.
- Deine Auswahl wird in **`diff.tool` und `merge.tool` in deiner globalen
  git-Konfiguration** geschrieben — dieselben Schlüssel, die auch dein Terminal
  liest. Setze es hier, und `git difftool` auf der Kommandozeile verhält sich
  genauso. Setze es dort, und Gitcito übernimmt es.

Git kennt ab Werk rund dreißig Tools, darunter Kaleidoscope, Beyond Compare,
Meld, KDiff3, P4Merge, Araxis, DiffMerge, WinMerge, FileMerge, VS Code und die
vim-Familie.

## Wo die Aktionen auftauchen

| Oberfläche | Aktion |
|---------|--------|
| Eine geänderte Datei im [Commit-Composer](committing.md) | **Diff in \<Tool\>** — Arbeitsverzeichnis gegen den Index |
| Der [Konflikt-Resolver](conflicts.md) | **Merge in \<Tool\>** — der vollständige Drei-Wege-Merge |

Beide Einträge erscheinen nur, wenn tatsächlich ein Tool konfiguriert ist; ein
unkonfiguriertes `git difftool` würde einfach einen Fehler werfen, und ein toter
Button ist schlimmer als gar kein Button.

## Was passiert, während das Tool offen ist

Gitcito wartet, bis es geschlossen wird. Das ist Absicht — `git mergetool`
staged die aufgelöste Datei erst, *nachdem* das Tool beendet wurde, sodass es
ein echtes Ergebnis zu melden gibt — und deshalb zeigt der Button einen Spinner,
statt sofort zurückzukehren.

Der Rest der App bleibt bedienbar: diese Aufrufe laufen außerhalb des
Repository-Locks, der normale git-Operationen serialisiert. Ein Merge-Tool, das
über die Mittagspause offen bleibt, friert also nicht den Tab dahinter ein.

Wenn ein externer Merge gelingt, staged git die Datei selbst, und Gitcito
schließt den Resolver und aktualisiert. Schließt du das Tool ohne zu speichern,
sagt git das, und nichts ändert sich.

## Die `.orig`-Datei

`git mergetool` legt standardmäßig eine Sicherung `<file>.orig` neben der
aufgelösten Datei ab — gits Verhalten, nicht Gitcitos. Der Schalter in den
Einstellungen schreibt `mergetool.keepBackup`; schalte ihn aus, und eine
aufgelöste Datei hinterlässt nichts.

## Grenzen

- **Nur Diffs gegen das Arbeitsverzeichnis.** Der Eintrag im Composer vergleicht
  das, was du gerade hast, mit dem Index. Zwei historische Commits extern zu
  vergleichen ist nicht verdrahtet — nimm dafür die eingebaute
  [Diff-Ansicht](diffs.md) oder den [Vergleich](merging.md).
- **Eine Datei zur Zeit.** Es gibt keinen Rundumschlag „jede geänderte Datei
  diffen“.
- **Gitcito installiert niemals etwas.** Ein als *nicht installiert* markiertes
  Tool bleibt auswählbar, weil git es nach der Installation vielleicht doch
  findet — bis dahin schlägt es aber fehl.
