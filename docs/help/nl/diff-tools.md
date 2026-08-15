---
title: Externe diff- & mergetools
category: Branches & ingrepen
order: 43
summary: Geef een bestand door aan Kaleidoscope, Beyond Compare, Meld of wat je al gebruikt — Gitcito leest de eigen toollijst van git.
keywords: difftool mergetool extern external diff merge kaleidoscope beyond compare meld kdiff3 p4merge araxis opendiff filemerge vimdiff winmerge diff.tool merge.tool orig back-up
---

# Externe diff- & mergetools

De [diffweergave](diffs.md) en de [oplosser met drie panelen](conflicts.md) van
Gitcito redden de meeste dagen. Sommige dagen niet: een gegenereerd bestand van
4.000 regels, een merge waarbij je vier kolommen tegelijk moet zien, of gewoon de
tool die je al tien jaar gebruikt en sneller leest dan welke nieuwe ook.

**Instellingen → Algemeen → Externe diff- & mergetools.**

## Het is de lijst van git, niet die van ons

Gitcito houdt geen eigen tabel bij. De keuzelijsten zijn
`git difftool --tool-help` en `git mergetool --tool-help`, en daarom:

- De tools die git al op je machine vond staan bovenaan; die het kent maar niet
  kan vinden staan eronder, gemarkeerd als *niet geïnstalleerd*.
- **Een eigen tool werkt zonder extra ondersteuning.** Heb je

  ```sh
  git config --global difftool.mine.cmd 'mycompare "$LOCAL" "$REMOTE"'
  ```

  dan verschijnt `mine` in de keuzelijst als elke ingebouwde.
- Je keuzes worden geschreven naar **`diff.tool` en `merge.tool` in je globale
  git-config** — dezelfde sleutels die je terminal leest. Stel het hier in en
  `git difftool` op de commandoregel gedraagt zich net zo. Stel het daar in en
  Gitcito pikt het op.

Git kent zo'n dertig tools uit de doos, waaronder Kaleidoscope, Beyond Compare,
Meld, KDiff3, P4Merge, Araxis, DiffMerge, WinMerge, FileMerge, VS Code en de
vim-familie.

## Waar de acties opduiken

| Plek | Actie |
|------|-------|
| Een gewijzigd bestand in de [commitopsteller](committing.md) | **Diff in \<tool\>** — werkboom tegen de index |
| De [conflictoplosser](conflicts.md) | **Mergen in \<tool\>** — de volledige drieweg-merge |

Beide verschijnen alleen als er werkelijk een tool ingesteld is; een
niet-ingestelde `git difftool` zou enkel een fout geven, en een dode knop is
erger dan geen knop.

## Wat er gebeurt terwijl de tool open staat

Gitcito wacht tot hij sluit. Dat is met opzet — `git mergetool` staget het
opgeloste bestand pas *nadat* de tool afsluit, zodat er een echt resultaat te
melden valt — en daarom toont de knop een draaiend wieltje in plaats van meteen
terug te keren.

De rest van de app blijft responsief: deze draaien buiten het slot per repository
dat gewone git-operaties serialiseert, dus een mergetool die je tijdens de lunch
open laat staan bevriest het tabblad erachter niet.

Slaagt een externe merge, dan staget git het bestand zelf en sluit Gitcito de
oplosser en ververst. Sluit je de tool zonder op te slaan, dan zegt git dat en
verandert er niets.

## Het `.orig`-bestand

`git mergetool` laat standaard een back-up `<file>.orig` naast het opgeloste
bestand achter — gedrag van git, niet van Gitcito. De schakelaar in de
instellingen schrijft `mergetool.keepBackup`; zet hem uit en een opgelost bestand
laat niets achter.

## Grenzen

- **Alleen werkboomdiffs.** Het item in de opsteller vergelijkt wat je nu hebt
  met de index. Twee historische commits extern vergelijken is niet aangesloten —
  gebruik daarvoor de ingebouwde [diffweergave](diffs.md) of de
  [vergelijking](merging.md).
- **Eén bestand tegelijk.** Er is geen veegactie "diff elk gewijzigd bestand".
- **Gitcito installeert nooit iets.** Een tool met het label *niet geïnstalleerd*
  blijft selecteerbaar, omdat git hem alsnog kan vinden nadat je hem installeert
  — maar tot dat moment faalt hij.
