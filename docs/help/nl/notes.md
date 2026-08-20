---
title: Commitnotities
category: Geschiedenis lezen
order: 26
summary: Hang tekst aan een commit die al gepusht is — zonder de commit te veranderen.
keywords: notities notes git notes annoteren commentaar commit refs/notes review ticket amend herschrijven push notes fetch notes
---

# Commitnotities

Een commitboodschap wordt één keer geschreven en dan bevroren: hem veranderen
herschrijft de commit, geeft hem een nieuwe hash, en breekt iedereen die de oude
al heeft. Dat is prima een uur na het committen en onmogelijk een week later.

`git notes` is de uitweg. Een notitie wordt **naast** de commit bewaard, onder
`refs/notes/commits`, en er een aanhangen laat de commit byte voor byte
identiek. Het werkt dus op geschiedenis die al gepubliceerd is — precies wanneer
je het liefst iets wilt toevoegen.

Typisch gebruik: de review die hem goedkeurde, het ticket dat hij sloot, waarom
hij gerevert is, in welke release hij meeging.

## Er een schrijven

Selecteer een commit. Onder de boodschap staat een sectie **Notitie**: *Een
notitie toevoegen*, typen, **Notitie opslaan**. Meerdere regels mag.

![Een notitie schrijven onder de boodschap van een gepushte commit, en hem opslaan](../../screenshots/clip-commit-note.webp)

Een notitie opslaan is een gewone Gitcito-actie — er verschijnt een melding, en
**Ongedaan maken** zet de vorige tekst terug, inclusief het herstellen van een
notitie die je verwijderde.

De tekst leegmaken en opslaan verwijdert de notitie; een lege notitie bestaat
niet.

## Er een vinden

Notities zijn onzichtbaar in een gewone log, en dat is de belangrijkste reden dat
mensen ze nooit ontdekken. Gitcito markeert een commit die er een draagt met een
klein notitie-icoon in de boodschapkolom van de grafiek, zodat de aantekening
vindbaar is zonder dat je weet dat hij er is.

Vanaf de commandoregel drukt `git log --notes` ze onder elke boodschap af.

## Ze delen

**Dit is het deel dat iedereen verrast: een gewone `git push` pusht geen
notities, en een gewone `git fetch` haalt ze niet op.** Ze wonen buiten
`refs/heads` en `refs/tags`, dus de standaard-refspecs slaan ze volledig over.
Notities die je op je laptop schrijft blijven op je laptop tot iemand ze
uitdrukkelijk verplaatst.

Tools → **Notitie** → *Notities pushen* / *Notities ophalen*, per remote. Ze
draaien:

```sh
git push <remote> refs/notes/commits
git fetch <remote> +refs/notes/commits:refs/notes/commits
```

Alleen de commitnotities-ref reist mee — Gitcito's eigen machine-lokale refs
(zoals de oordelen van de [lokale CI](local-ci.md)) worden bewust niet
gepubliceerd.

Sommige hosts willen notities ook aan hun kant ingeschakeld of toegestaan zien;
een weigering daar is het beleid van de host, geen beperking van Gitcito.

Geen gedeelde remote, of geen schrijftoegang? [Veilig delen](secure-share.md)
kan de notities van een repository in een versleuteld bestand pakken dat een
teamgenoot direct importeert, met een voorvertoning van wat er zou landen en
een uitdrukkelijke overschrijf-keuze voor uiteengelopen notities.

## Grenzen

- **Eén notities-ref.** Gitcito leest en schrijft de standaard
  `refs/notes/commits`. Eigen namespaces (`git notes --ref=review`) worden niet
  ontsloten — een repository die ze gebruikt ziet die notities hier niet.
- **Geen merge van uiteengelopen notities.** Annoteren twee mensen dezelfde
  commit en pushen ze allebei, dan weigert git de tweede push. Dat oplossen
  betekent `git notes merge` in de [terminal](terminal.md).
- **Notities vallen niet onder een purge-back-up** of onder
  [momentopnamen](recovery.md). Het zijn gewone refs die normale operaties
  overleven, maar een repository die vanaf nul opnieuw gekloond is begint zonder
  ze.

Zie ook: [Committen](committing.md) · [De commitgrafiek](graph.md)
