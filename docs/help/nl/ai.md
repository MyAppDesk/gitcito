---
title: AI-functies
category: AI
order: 80
summary: Optioneel, providerneutraal en geworteld in je echte code.
keywords: ai openai anthropic ollama lokaal llm commitboodschap commit message uitleggen explain review wiki grounded
---

# AI-functies

Elke AI-functie is **optioneel** en staat uit tot je een provider instelt. Er
gaat niets ergens naartoe tot je om iets specifieks vraagt.

![AI-instellingen](../../screenshots/settings-ai.webp)

## Providers

Voorinstellingen voor **OpenAI, Anthropic, OpenRouter, Groq, Mistral en Ollama**
(volledig lokaal), of elk OpenAI-compatibel endpoint. Modellen worden live
opgehaald en je kunt eigen instructies meegeven.

> Alleen OpenAI is echt door de wringer gehaald. De rest gebruikt een
> OpenAI-compatibele aanroepvorm en zou moeten werken — maar is niet
> geverifieerd.

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

**Zie ook:** [Repo-wiki](repo-wiki.md) · [Beveiliging & geheimen](security.md)
