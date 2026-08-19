---
title: AI-functies
category: AI
order: 80
summary: Optioneel, providerneutraal en geworteld in je echte code.
keywords: ai openai anthropic ollama lokaal llm commitboodschap commit message uitleggen explain review wiki grounded accounts account api-sleutel abonnement cli claude codex gemini modellen
---

# AI-functies

Elke AI-functie is **optioneel** en staat uit tot je een provider instelt. Er
gaat niets ergens naartoe tot je om iets specifieks vraagt.

![AI-instellingen](../../screenshots/settings-ai.webp)

## Accounts

Een **account** is één manier om een model te bereiken: een aanbieder, waar je
die bereikt en hoe die zich authenticeert. Je kunt er meerdere instellen en ze
bestaan naast elkaar — een werksleutel, een persoonlijke, een lokaal model, een
CLI waarop je al bent ingelogd.

Er zijn presets voor **OpenAI, Anthropic, Google Gemini, OpenRouter, Groq,
Mistral** en **Ollama** (volledig lokaal), plus elk OpenAI-compatibel endpoint.

Anthropic gebruikt zijn eigen `/v1/messages`-API in plaats van een
OpenAI-vormige aanroep, dus Claude-modellen werken echt in plaats van er alleen
op te lijken. Gemini wordt bereikt via Googles OpenAI-compatibele endpoint.

### Een abonnement in plaats van een API-sleutel

Kies de aanbieder **Lokale CLI** om te laten antwoorden door een agent-CLI die
al op deze machine staat en is ingelogd — `claude`, `gemini` of `codex`. Gitcito
start het programma met je prompt en leest het antwoord; er is geen API-sleutel
om te plakken en geen token wordt bewaard.

Gitcito draait alleen een commando dat je zelf als account hebt ingesteld, en
altijd met een lijst argumenten in plaats van een shell, zodat niets uit een
diff of een branchnaam als commando gelezen kan worden.

> **Dit is niet privéer dan een API-sleutel.** Je prompts bereiken nog steeds
> dezelfde aanbieder, onder je eigen account, precies zoals met een sleutel. Wat
> verandert is de facturering en de installatie, niet waar de tekst heen gaat.

Staat het commando niet in je `PATH`, typ dan het volledige pad op het account.

### Welk account beantwoordt wat

Onder **Welk account beantwoordt wat** kan elke functie — commitberichten, chat,
uitleggen, PR-review, conflictoplossing, wiki, thema's — naar een eigen account
en model wijzen. Laat een rij op de standaard staan om het standaardaccount te
volgen. Een goedkoop model voor commitberichten en een sterk model voor chat is
de gebruikelijke verdeling.

### Upgrademelding

Wie bijwerkt vanaf een versie van vóór de accounts, ziet dit één keer. De aanbieder en sleutel die je had worden het eerste account; er hoeft niets met de hand opnieuw ingesteld te worden.

![Upgrademelding](../../screenshots/ai-accounts-notice.webp)

## Modellen

Modellijsten komen van de aanbieder zelf en worden een dag gecachet; **Modellen
ophalen** ververst er één meteen. Onder de lijst zegt Gitcito waar die vandaan
komt — live, uit de cache (met tijdstip), of de ingebouwde reservelijst en
waarom.

De lijst is gefilterd op modellen die een chatverzoek kunnen beantwoorden, dus
embedding-, spraak- en beeldmodellen blijven eruit. Elk modelveld accepteert ook
vrije tekst, zodat een previewmodel, een privé-deployment of een net opgehaalde
Ollama-tag altijd bruikbaar is, ook als de aanbieder die niet noemt.

Een aanbieder die je nog geen sleutel gaf, of die onbereikbaar is, valt terug op
een kleine ingebouwde lijst in plaats van op een lege keuzelijst.

Geen enkele aanbieder publiceert een gerangschikte of samengestelde lijst, dus de bewerking is die van Gitcito: gedateerde snapshots vouwen samen in het model waarvan ze een snapshot zijn (`gpt-4o` dekt `gpt-4o-2024-08-06`), en de rest staat op datum in plaats van alfabetisch. **Alle modellen tonen**, onderaan de lijst, haalt alles terug wat de aanbieder stuurde.

## Wat het kan

| Functie | Wat je krijgt |
|---|---|
| **Commitboodschap** | Samenvatting (en optioneel een body) uit je gestagede diff, in de stijl die jij kiest |
| **Leg dit bestand uit** | Uitleg in gewone taal in een zijpaneel — Normaal, Beknopt, ELI5… zelfs Piraat |
| **Hover om uit te leggen** | Houd <kbd>⇧</kbd> ingedrukt en wijs een identifier aan voor een uitleg in één regel, plus de regels waarop die stoelt |
| **Conflictoplossing** | Stelt een merge voor in de bewerkbare uitvoer — past nooit automatisch toe |
| **PR-review** | Vat een diff samen en markeert risico's, elk verankerd aan een echte `path:line` |
| **PR-beschrijving** · **branchnamen** | Opgesteld uit de commits en de diff van de branch |
| **Thema's** · **grafiekpaletten** | Gegenereerd uit een prompt |
| **Slim stagen** | Suggesties voor wat in deze commit thuishoort |
| **AI-configuratiewizard** | Genereert assistentconfiguratiebestanden (instructies, agents, hooks) voor de repository — de toverstafknop in de koptekst van het chatpaneel |

## Geworteld, niet gegokt

De review ziet de diff als **gelabelde hunks** en mag alleen die labels citeren;
Gitcito herleidt elk label vervolgens naar een echt bestand en een echte regel.
Een model dat een locatie verzint wordt **afgewezen en opnieuw bevraagd**, zodat
bevindingen altijd naar bestaande code wijzen.

Hover-om-uit-te-leggen leest alleen een genummerd venster rond het token — in een
diff alleen de hunks die op het scherm staan — dus als een definitie ergens
anders woont, zegt het dat in plaats van iets te verzinnen. Antwoorden worden per
bestandsversie gecachet.

**Gemaskeerde geheimenbestanden worden nooit verstuurd.** Bestanden die onder de
maskeerregels voor geheimen vallen evenmin.

## Grenzen

- De ingebouwde reservelijsten verouderen tussen releases. Daar is het live
  ophalen voor; de reserve dekt alleen het geval dat ophalen niet kan.
- Filteren op chatmodellen gebeurt op naam, dus een chatmodel met een ongewone
  naam kan wegvallen. Typ het dan zelf in.
- Een CLI-account kan het tokengebruik alleen melden als de CLI dat doet; de
  gebruiks- en kostencijfers in Instellingen tellen die aanroepen dus te laag.
- Antwoorden via een CLI zijn trager dan een directe API-aanroep: het programma
  start per verzoek een hele sessie.
- Sleutels worden per account in je systeemsleutelhanger bewaard. Een account
  verwijderen verwijdert de sleutel ervan.

**Zie ook:** [Repo-wiki](repo-wiki.md) · [Beveiliging & geheimen](security.md)
