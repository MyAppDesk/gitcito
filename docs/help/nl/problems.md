---
title: Problemen
category: Workspace-gereedschap
order: 92
summary: Wat de analyzers van je project zeggen, en welk deel jouw diff veroorzaakte.
keywords: problemen analyzer diagnostiek fouten waarschuwingen lint tsc typescript eslint dart analyze clippy cargo go vet ruff paneel gewijzigde bestanden
---

# Problemen

Elk project heeft al gereedschap dat vertelt wat er mis mee is — `tsc`,
`dart analyze`, ESLint, Clippy, `go vet`, Ruff. Wat geen van alle vertelt: of
**jouw** diff die veertig waarschuwingen heeft veroorzaakt. Gitcito weet welke
bestanden vuil zijn, dus dezelfde lijst beantwoordt die vraag met één schakelaar.

![Het Problemen-paneel en de teller in de statusbalk](../../screenshots/problems.webp)

De statusbalk draagt de telling — fouten, waarschuwingen, info: de drie getallen
die VS Code iedereen heeft leren lezen. Klik erop (of **Problemen** in het
opdrachtenpalet) en het paneel opent onderin, gegroepeerd per bestand. Op een
regel klikken opent het bestand daar. Vóór de eerste sweep toont hij streepjes in plaats van nullen: er heeft nog niemand gekeken, en drie nullen zouden iets anders beweren.

## Wat er wordt uitgevoerd

| Als de repository heeft | voert Gitcito uit |
|-------------------------|-------------------|
| `pubspec.yaml` | `dart analyze --format=machine` |
| `tsconfig.json` | `tsc --noEmit` |
| een ESLint-configuratie | `eslint -f json` |
| `Cargo.toml` | `cargo clippy --message-format=short` |
| `go.mod` | `go vet ./...` |
| `pyproject.toml` of `ruff.toml` | `ruff check --output-format=json` |

**Flutter valt onder de Dart-regel:** een Flutter-app is een Dart-project, en
`flutter analyze` roept dezelfde analyzer aan als `dart analyze`.

**Het project hoeft niet in de root te staan.** Die markers worden ook een paar
niveaus dieper gezocht, dus een Flutter-app onder `mobile/` of een package onder
`apps/web` wordt gevonden, en elke analyzer draait in de map van zijn eigen
project. Een genest project van dezelfde soort wordt overgeslagen als een
voorouder het al dekt — dat is precies wat een `tsconfig.json` in de root zegt —
en een sweep stopt bij twaalf projecten, want een monorepo hoort geen vijftig
compilers te starten.

Een binary in `node_modules/.bin` wint van die op je PATH, precies zoals de
scripts van het project het oplossen. Alles draait parallel, en de uitvoer van
elk gereedschap wordt tot één vorm herleid, ontdubbeld en gesorteerd: twee
analyzers die dezelfde regel melden leveren één rij op.

**Niets draait uit zichzelf.** `tsc --noEmit` op een grote repository is tientallen
seconden, en deze commando's zijn de toolchain van de repository, niet die van
Gitcito. Ze starten wanneer je het paneel opent of ververst, nooit vanzelf.
Daarom is de lijst een momentopname: bewerk een bestand en hij is verouderd tot
je opnieuw draait.

**Instellingen → Algemeen → Code-analyzers** bepaalt hoe gretig dat gaat:
sweepen bij het openen van het paneel (standaard), alleen bij verversen, of uit —
wat de analyzerhelft, de teller in de statusbalk en het commando volledig
verbergt.

**Gegenereerde uitvoer valt af.** Gereedschap dat op de projectroot is gericht
controleert alles wat het vindt, en dat omvat `.next/build/chunks`, een gebundelde
`dist`, een meegeleverde kopie — honderden klachten over machinaal geschreven code
die de handvol over die van jou bedelven. Gitcito vraagt git welke bestanden
genegeerd zijn en laat die vallen, en nooit een *gevolgd* bestand: gegenereerde
uitvoer committen is een keuze, en `git check-ignore` respecteert die.
`node_modules` gaat er sowieso uit.

## Alleen wat je hebt gewijzigd

De schakelaar in de kop gooit elk probleem weg in een bestand dat je niet hebt
aangeraakt. Dat is het beeld dat het waard is open te houden: een platte lijst
van elke waarschuwing in een codebase is binnen een week behang, terwijl "heeft
deze diff ze toegevoegd" een vraag is die je vóór het committen beantwoordt.

De ernst-chips filteren ook. Uit betekent *alles tonen*; er één aanzetten
versmalt ertoe.

## Tests

Het derde tabblad van het paneel voert de testsuite van het project uit en toont het resultaat als boom: elk testbestand en daarin de tests, mislukte eerst. **Tests uitvoeren** in het opdrachtenpalet opent het en start de run; de ▶-knop in het tabblad doet hetzelfde, en ↻ voert opnieuw uit.

| Rij | Een klik |
|---|---|
| Een mislukte test | Opent het testbestand op de regel waar de fout naar wijst, en klapt het foutbericht onder de rij open |
| Een geslaagde of overgeslagen test | Opent het testbestand |
| Een bestand dat faalde voordat er een test liep (syntaxfout, kapotte import) | Opent het bestand; het bericht zegt wat het tegenhield |

**Alleen mislukt** houdt alleen de fouten over; het zoekveld filtert op testnaam, of op pad om een heel bestand te houden.

Het leest het machinerapport van de runner zelf — `vitest run --reporter=json` of `jest --json` — en niet zijn uitvoer, dus namen, duren en berichten kloppen precies. De regel komt uit de stack van de fout: het is de mislukte assertion, niet het begin van de test.

De grenzen, eerlijk gezegd:

- **Alleen vitest en jest**, gevonden in de `package.json` in de root van de repository; vitest wint als beide er staan. De suites van losse pakketten in een monorepo lopen niet een voor een.
- **Alleen de geïnstalleerde runner draait** — het pakket in `node_modules`, direct met Node gestart (zonder shell, dus geen pad wordt ooit als commando gelezen). Staat hij erin maar is hij niet geïnstalleerd, dan zegt het tabblad dat; er wordt niets voor je gedownload.
- **Elke keer de hele suite.** Een „alleen wat ik veranderde” is er nog niet, en een trage suite duurt hier even lang als in een terminal. Na tien minuten stopt hij.
- Crasht de runner voordat hij zijn rapport schrijft, dan toont het tabblad wat hij afdrukte.
- Het voert de code van het project uit, zoals `npm test` zou doen — op verzoek, nooit uit zichzelf.

## De grenzen

- **Geen language server.** Dit is een sweep, geen daemon: geen kronkels tijdens
  het typen, geen resultaten voordat je erom vraagt.
- **Ontbrekend gereedschap wordt benoemd, niet verstopt.** De voettekst zegt wat
  niet kon draaien, want een lege lijst zonder uitleg is erger dan een korte met
  reden.
- **Alleen machineleesbare uitvoer wordt begrepen.** Elke analyzer wordt uit zijn
  gedocumenteerde machineformaat gelezen; gereedschap dat iets anders print is
  hier onzichtbaar.
- **Vijfduizend problemen is het plafond.** Daarna zegt het paneel het en stopt —
  een repository in die staat heeft een groter probleem dan een schuifbalk.

**Zie ook:** [Lokale CI](local-ci.md) · [Geïntegreerde terminal](terminal.md)
