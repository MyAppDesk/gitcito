---
title: De commitgrafiek
category: Repository & geschiedenis
order: 10
summary: Geschiedenis lezen: banen, refs, kolommen, filters en meervoudige selectie.
keywords: grafiek graph geschiedenis history commits banen lanes branches merges kolommen filter lineair first-parent amend aanpassen undo ongedaan maken reset github
---

# De commitgrafiek

Branches, merges en octopus-merges netjes getekend, licht of donker. Het renderen
gebeurt in een venster, dus een repository met honderdduizend commits scrollt als
een met honderd.

| | |
|---|---|
| ![Commitgrafiek, licht](../../screenshots/graph-light.webp) | ![Commitgrafiek, donker](../../screenshots/graph-dark.webp) |

## Rondbewegen

- <kbd>↑</kbd> <kbd>↓</kbd> (of <kbd>j</kbd> <kbd>k</kbd>) verplaatsen de selectie.
- <kbd>⌘</kbd>/<kbd>Ctrl</kbd>-klik zet een commit aan of uit in een
  **meervoudige selectie**; <kbd>⇧</kbd>-klik pakt een reeks. Met meerdere
  geselecteerd rechtsklik je om ze op de huidige branch te cherry-picken, een
  aaneengesloten reeks te squashen, één gecombineerde patch te exporteren of hun
  SHA's te kopiëren.
- Commits die bij je **laatste fetch of pull** binnenkwamen zijn gemarkeerd als
  nieuw. Die nog niet in de uitgecheckte branch zitten blijven licht
  doorschijnend tot een pull ze binnenhaalt.
- Rechtsklik een commit voor **Aanpassen**, **Ongedaan maken**, **Resetten naar
  commit…** en **Bekijken op GitHub**, plus checkout, cherry-pick, revert,
  branch, tag en kopiëren. Onveilige acties blijven zichtbaar en worden
  uitgeschakeld.

## Het laten tonen wat jij wilt

- De **graaffocus** bepaalt hoeveel geschiedenis wordt getekend — Instellingen →
  Thema's → **Graaf**, of het tandwielmenu in de kop van de graaf. *Alles* tekent
  alles; *Lineaire geschiedenis* (first-parent) laat alleen de stam over;
  *Samengevoegde branches verbergen* houdt de stam plus de branches die nog niet
  zijn samengevoegd; *Solomodus* houdt jouw branch, je favoriete branches en de
  standaardbranch.

  Het filtert alleen wat het log al heeft geladen. *Samengevoegde branches
  verbergen* volgt gits eigen antwoord op "zit al in de huidige branch", dus van
  branch wisselen verandert wat verdwijnt — en het houdt elke commit waar nog een
  tag of een onbekende ref naar wijst, precies wat een verwijderde branch
  achterlaat. *Lineaire geschiedenis* en *Solomodus* zijn botter: een tag of een
  stash op een commit die zij verbergen, verdwijnt mee.

- **Filteren op pad**: rechtsklik een bestand of map → *Grafiek filteren op dit
  pad*, en alleen de commits die het aanraakten blijven verlicht.

![Grafiek teruggefilterd tot één pad](../../screenshots/graph-path-filter.webp)

- **Kolommen**: toon, verberg, herschaal en herschik de kolommen voor branch,
  boodschap, auteur, datum, SHA, handtekening en deployment.
- **Stijl**: Instellingen → Thema's → **Grafiek** — baanpalet (8 ingebouwde,
  eigen, of door AI gegenereerd), hoekstijl, rijdichtheid en lijndikte, met een
  live minigrafiek als voorbeeld.

![Grafiekstijlinstellingen met live voorbeeld](../../screenshots/settings-graph.webp)

## Commitdetails

Een commit selecteren toont zijn gewijzigde bestanden (boom of plat), auteur,
SHA, co-auteurs en zijn handtekening. `#123`-verwijzingen en `@vermeldingen`
worden automatisch gelinkt naar je host.

De bestandenlijst is meervoudig te selecteren met de gebruikelijke gebaren
(<kbd>⌘</kbd>/<kbd>Ctrl</kbd>-klik, <kbd>⇧</kbd>-klik,
<kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd>). Rechtsklik op de selectie → *{n}
bestanden terugzetten naar de werkboom* neemt die bestanden precies zoals deze
commit ze had: na één bevestiging worden de werkkopieën overschreven, zonder
HEAD of de index aan te raken.

![Door de commitdetails lopen](../../screenshots/clip-commit-details.webp)

**Zie ook:** [Blame & bestandsgeschiedenis](blame.md) · [Zoeken](search.md) · [Tijdmachine](time-machine.md)
