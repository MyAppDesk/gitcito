---
title: Talen & rechts-naar-links
category: Naar eigen smaak
order: 102
summary: Kies je interfacetaal op vlag en endoniem, met een gespiegelde indeling voor Arabisch en Hebreeuws.
keywords: taal talen language locale locales i18n internationalisatie vertaling vertalen rtl rechts-naar-links right-to-left arabisch hebreeuws spiegelen richting vlag endoniem engels spaans duits frans portugees italiaans nederlands pools turks russisch oekraïens chinees japans koreaans
---

# Talen & rechts-naar-links

De interface van Gitcito is vertaald. De taal is een instelling
van Gitcito, niet van het besturingssysteem — een ontwikkelaar op een Engelse
macOS-installatie die liever Japans leest stelt dat hier in, en een ontwikkelaar
op een Hebreeuws systeem die de app in het Engels wil, wordt niet overruled.

**Instellingen → Algemeen → Taal.**

![De taalkiezer](../../screenshots/languages.webp)

## Wat er meegeleverd wordt

| | | | |
|---|---|---|---|
| English | Español | Deutsch | Français |
| Português (Brasil) | Italiano | Nederlands | Polski |
| Türkçe | Русский | Українська | 简体中文 |
| 日本語 | 한국어 | العربية | עברית |

Elke rij in de kiezer staat in zijn eigen taal geschreven. Wie Koreaans zoekt
speurt naar 한국어, niet naar het woord "Koreaans" in een taal waar hij juist
vanaf wil.

### Over de vlaggen

Een vlag benoemt een land; een locale benoemt een taal. Die twee vallen echt niet
samen — Arabisch is officiële taal in meer dan twintig staten, en Portugees ligt
op twee continenten. De iconen volgen dezelfde conventie als de taalkiezer van
elk besturingssysteem: de primaire regio van de locale. Ze staan er om *in één
oogopslag herkend* te worden, niet om een uitspraak te doen over wie een taal
toebehoort.

Ze zijn met opzet als vectorbeeld getekend en niet als emoji. Windows levert
helemaal geen vlagemoji mee — `🇩🇪` wordt daar getoond als een kadertje met de
letters "DE".

## Rechts-naar-links

Arabisch en Hebreeuws spiegelen de hele interface: de zijbalk verhuist naar
rechts, panelen en werkbalken keren om, iconen die ergens heen wijzen wijzen de
andere kant op.

Wisselen gebeurt meteen en vraagt geen herstart.

![Gitcito in het Arabisch, met de indeling gespiegeld](../../screenshots/rtl.webp)

### Wat met opzet niet spiegelt

Sommige inhoud loopt van links naar rechts, welke taal je ook leest. Die
spiegelen zou ronduit fout zijn, dus deze blijven zoals ze zijn:

| Blijft LTR | Waarom |
|------------|--------|
| De commitgrafiek | Baanposities worden in pixels berekend; een gespiegelde container zou niet stroken met de getekende lijnen |
| Diffs en bestandsinhoud | Code is LTR, en een gespiegelde diff is onleesbaar |
| Blame en de conflictuitvoer | Zelfde reden — de tekst is broncode, geen proza |
| De geïntegreerde terminal | Die rendert zijn eigen raster; de uitvoer van git is LTR |
| Paden, SHA's, refs en commando's | `refs/heads/main` leest maar in één richting |

Elk hiervan is geïsoleerd, zodat een stuk Arabisch *binnenin* — een branchnaam,
een commitboodschap, een bestandsnaam — de tekst eromheen niet kan herordenen.

### De grenzen

Hier is het eerlijk over waar het ophoudt:

- **Commitboodschappen, branchnamen en bestandsinhoud krijgen van Gitcito nooit
  een andere richting.** Ze worden getoond zoals hun auteur ze schreef. Een
  Hebreeuwse commitboodschap in een LTR-geïsoleerde lijst verschijnt als
  Hebreeuws, maar de omliggende rij klapt er niet voor om.
- **Oppervlakken van derden houden hun eigen richting** — de terminal is xterm,
  en Markdown-voorbeelden renderen het document zoals het geschreven is.
- **Bestandsnamen met gemengde richting zijn lastig.** Een pad met een Arabische
  map binnen een Engelse boom wordt geïsoleerd in plaats van herordend, wat
  correct is maar de eerste keer toch verrassend kan ogen.

## Dit handboek is ook vertaald

Niet alleen de knoppen. Elke pagina die je hier leest bestaat in elke taal die de
lijst hierboven toont — de uitleg, de tabellen met wat elke optie doet, de
secties die vertellen
wat een functie weigert te doen. Wie de taal van de interface wisselt, wisselt
het handboek mee, in de app en op de website.

Een vertaling mag onvolledig zijn. Is een pagina nog niet vertaald, dan krijg je
de Engelse in plaats van een ontbrekende pagina, en de zijbalk houdt in elke taal
dezelfde vorm, zodat een schermafbeelding of een instructie nog steeds klopt met
wat je ziet.

Op de website heeft elke pagina een taalwisselaar die je op de pagina laat die je
aan het lezen was, want van taal wisselen is niet hetzelfde als opnieuw beginnen.

**Wat machinaal vertaald is, en wat dat kost.** Engels en Spaans zijn met de hand
geschreven. De rest is door een model vertaald tegen een woordenlijst, en daarna
door een script gecontroleerd: elke pagina, elke link, elk afbeeldingspad, elk
codeblok byte voor byte tegen het Engels. Dat vangt kapotte structuur. Het vangt
geen zin die klopt maar houterig is. Leest een pagina slecht in jouw taal, dan is
dat een bug die het melden waard is.

## Een taal toevoegen

De woordenboeken zijn één bestand per locale onder `src/renderer/src/i18n/`, en
het Engelse bestand is de referentie waartegen elk ander typegecontroleerd wordt
— een ontbrekende sleutel is een compileerfout, geen stille terugval op het
Engels. De testsuite controleert ook dat elke `{placeholder}` die een string
interpoleert de vertaling overleeft, zodat een zin zijn commit-sha niet kwijt kan
raken op weg naar een andere taal.

Het handboek werkt net zo: `docs/help/` bevat de Engelse pagina's en
`docs/help/<locale>/` bevat elke vertaling, één bestand per pagina met dezelfde
bestandsnaam. `npm run lint:docs` controleert of elke vertaalde pagina een Engels
origineel heeft, of haar front matter compleet is, en of haar links en
afbeeldingen vanuit één map dieper kloppen.

Bijdragen zijn welkom — één pagina tegelijk is prima, en een houterige vertaling
rechttrekken is net zo nuttig als een ontbrekende toevoegen.

**Zie ook:** [Thema's & uiterlijk](themes.md) · [Profielen](profiles.md)
