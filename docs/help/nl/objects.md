---
title: Objectverkenner
category: Repository & geschiedenis
order: 16
summary: Loop door de laag onder de grafiek — commits, trees, blobs, tags en de refs die ernaar wijzen. Niets hier verandert iets.
keywords: objecten objects verkenner explorer blob tree commit tag ref plumbing cat-file ls-tree sha1 interne werking database rev-parse HEAD^{tree} loose packed
---

# Objectverkenner

Git heeft de reputatie ingewikkeld te zijn. Vrijwel alles daarvan komt doordat je
het model nooit ziet: **vier soorten objecten, en pointers**. Zodra je een commit
kunt aanklikken, op zijn tree belandt en ontdekt dat jouw bestand *een blob is*
met een naam die een tree eraan gaf, houdt het porselein op magie te zijn.

`⌘K` → **Objectverkenner**. Niets op deze pagina kan één byte veranderen — elke
aanroep erachter is een leesactie.

![De velden van een commit, met zijn tree en ouders als links, naast de reflijst](../../screenshots/objects.webp)

## De vier objecten

| Object | Is | Weet |
|--------|----|------|
| **blob** | De *inhoud* van een bestand | Niets. Niet zijn naam, niet zijn pad, niet zijn geschiedenis |
| **tree** | Een mapinhoudsopgave | Namen, modi en de sha van elke onderliggende blob of tree |
| **commit** | Eén momentopname | Zijn tree, zijn ouders, auteur, committer, boodschap |
| **tag** | Een geannoteerde tag | Het object waar hij naar wijst, de tagger, een boodschap |

De verrassing voor de meeste mensen zit in de eerste rij. **Een blob heeft geen
naam.** Twee bestanden met identieke inhoud, waar dan ook in je geschiedenis,
zijn dezelfde blob, één keer opgeslagen. De naam woont in de tree die ernaar
wijst — en dat is waarom git inhoud volgt in plaats van bestanden, en waarom
hernoemingen gedetecteerd worden in plaats van vastgelegd.

Een **ref** — `refs/heads/main`, `refs/tags/v1.0`, `HEAD` — is enkel een bestand
met een sha erin. Dat is de hele inhoud van "branchen is goedkoop".

## Rondlopen

De linkerkolom somt elke ref in de repository op, gegroepeerd zoals git ze
groepeert. Klik er een aan om te belanden op het object dat hij benoemt.

Van daaruit is alles een link:

- Een **commit** toont zijn `tree` en elke `parent` — klik door naar de
  momentopname, of achteruit door de geschiedenis, commit voor commit.
- Een **tree** somt zijn regels op met modus, type, sha en grootte. Klik een naam
  aan om dat kind te openen.
- Een **blob** toont zijn tekst (het begin ervan, bij iets groots), of zegt
  ronduit dat hij binair is.
- Een **geannoteerde tag** toont waar hij naar wijst — klik door naar de commit.

**Terug** loopt je stappen weer af.

## Een revisie intypen

Het vak accepteert alles wat `git rev-parse` accepteert, en daar houdt dit op een
browser te zijn en wordt het een manier om te leren:

| Typ dit | Om te krijgen |
|---------|---------------|
| `HEAD` | De huidige commit |
| `HEAD~3` | Drie commits terug |
| `HEAD^{tree}` | De tree van die commit, afgepeld |
| `HEAD:src/app.ts` | De blob voor dat pad, rechtstreeks |
| `v1.0^{}` | Waar een geannoteerde tag naar wijst, in plaats van het tagobject |
| `a1b2c3d` | Elk object, op sha — afkortingen werken |

De moduscijfers in een tree-lijst zijn het kennen waard: `100644` een bestand,
`100755` uitvoerbaar, `040000` een subtree, `120000` een symlink, `160000` een
submodule-gitlink — en die laatste is alles wat een submodule opslaat.

## Grenzen die je moet kennen

- **Alleen-lezen, met opzet.** Er is hier niets om mee te schrijven. Objecten met
  de hand maken is een oefening met `git hash-object`, en hoort in een terminal.
- **Grote blobs worden afgekapt** na de eerste 200 KB — genoeg om te zien wat het
  is, niet genoeg om het venster te laten hangen.
- **Groottes zijn de inhoudsgrootte van het object** zoals `git cat-file -s` die
  meldt, niet wat het na packen op schijf kost. Daarvoor zie je
  [onderhoud](maintenance.md).
- **Onbereikbare objecten zijn nog steeds objecten.** Plak een sha uit een
  dangling-rapport van `git fsck` en hij opent, wat vaak de snelste manier is om
  te zien wat een verloren commit bevatte voor je besluit of je hem terughaalt.

Zie ook: [De grafiek](graph.md) · [Repository-onderhoud](maintenance.md) ·
[Herstel](recovery.md)
