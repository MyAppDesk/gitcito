---
title: De opdrachtregel
category: Werkruimtegereedschap
order: 93
summary: `gitcito .` opent een repository — en `gitcito doctor` antwoordt zonder iets te openen.
keywords: cli opdrachtregel commandoregel terminal shim path installeren openen map enkele instantie doctor status repos commit-check config editor completions wait core.editor blame show search werkwoorden exitcode ci hook
---

# De opdrachtregel

Vanuit een terminal stel je twee soorten vragen, en `gitcito` beantwoordt ze
allebei.

De eerste is *“laat me dit zien”* — je zit in een kloon, er moet iets bekeken
worden, en de app is de juiste plek om ernaar te kijken. Zulke aanroepen openen
een venster, zo dicht mogelijk bij waar je naar vroeg.

De tweede is *“zeg het nu”* — een hook, een CI-taak, of jijzelf, midden in een
pipe, die een antwoord en een exitcode wil in plaats van een venster. Die starten
de app nooit: ze schrijven naar stdout en gaan uit de weg.

```sh
gitcito .                        # open deze map
gitcito blame src/api.ts -l 84   # …bij de blame van die regel
gitcito doctor                   # geen venster: controleert de repo, exit 1 bij falen
```

## Installeren

Opdrachtenpalet (<kbd>⌘K</kbd>) → **Installeer het 'gitcito'-commando in PATH**.
Op macOS wordt een kleine shim gelinkt in `/usr/local/bin` of
`/opt/homebrew/bin`, en worden beheerdersrechten alleen gevraagd als geen van
beide voor jou schrijfbaar is. Op Linux gaat hij naar `~/.local/bin`, waarvoor
helemaal geen rechten nodig zijn. Hetzelfde commando verwijdert hem weer. Windows
wordt nog niet ondersteund.

Daarna, desgewenst:

```sh
gitcito completions zsh >> ~/.zshrc     # of bash, of fish
```

## Dingen openen

| Commando | Opent |
|----------|-------|
| `gitcito [pad]` | De repository (standaard: de huidige map) |
| `gitcito open <naam>` | Een repository op **tabbladnaam** — `gitcito open api` |
| `gitcito diff` | De wijzigingen in de werkkopie |
| `gitcito graph` | De commitgrafiek |
| `gitcito show <ref>` | Eén commit — `HEAD~2`, een tag, een korte hash |
| `gitcito blame <bestand>` | Blame voor een bestand; met `-l 84` land je op een regel |
| `gitcito search <zoekterm>` | Codezoeken, met de zoekterm al ingevuld |
| `gitcito stack`, `stash`, `reflog`, `conflicts`, `todos`, `chat`, `settings` | Dat paneel |
| `gitcito ci`, `clean`, `bisect`, `absorb`, `snapshots`, `insights`, `terminal` | …enzovoort |

`gitcito help verbs` toont de volledige lijst. Drie opties gelden voor allemaal:
`-n <naam>` zet de weergegeven tabbladnaam, `-g <groep>` plaatst het in een
groepstabblad (dat zo nodig ontstaat), en `-l <n>` kiest een regel.

Gitcito draait als **enkele instantie**: `gitcito` uitvoeren terwijl de app open
staat, geeft het verzoek door aan dat venster in plaats van een tweede kopie te
starten. Een pad dat al open is — als tabblad of binnen een groep — krijgt
**focus**, geen duplicaat. Een map die nog geen repository is, opent alsnog en
biedt “repository hier initialiseren” aan.

## Antwoorden in de terminal

Deze printen en stoppen. Er opent geen venster, en de app hoeft niet eens te
draaien.

### `gitcito status`

Branch, tracking, voor/achter, werkkopie, stashes en — als de repository er een
meelevert — de [pushchecklist uit `.gitcito.json`](repo-settings.md). Exit 1
wanneer de werkkopie conflicten heeft, dus `gitcito status || echo geblokkeerd`
werkt.

### `gitcito doctor [--fix]`

Voert dezelfde controles uit als het paneel voor
[repositoryconfiguratie](repo-settings.md): de Node-versie, submodules, LFS,
`core.hooksPath`, vereiste bestanden. **Exit 1 als een controle faalt**, en dat
is het hele punt — de regels die een repository verklaart zijn weinig waard als
alleen degene met de interface open ze ooit ziet:

```yaml
- run: gitcito doctor          # in CI, vóór alles wat duur is
```

`--fix` past de reparaties toe die de dokter kent (submodules initialiseren,
`lfs pull`, `core.hooksPath` zetten, een bestand vanuit zijn voorbeeld kopiëren)
en controleert opnieuw. Hij voert nooit een commando uit dat de configuratie
aanleverde — de verzameling reparaties is gesloten.

Waarschuwingen laten de run niet falen. Een waarschuwing betekent dat de dokter
iets niet kon vaststellen, niet dat er iets mis is, en builds daarop laten falen
zou het bestand te duur maken om in te voeren.

### `gitcito commit-check [bestand]`

Controleert een commitbericht. Zonder argument leest het `.git/COMMIT_EDITMSG`;
`-m "…"` controleert een tekst. Het weet wat de repository verklaarde: een
onbekende scope is een **fout** wanneer `.gitcito.json` scopes opsomt, en louter
stijladvies wanneer niet. Hang het in een hook:

```sh
# .husky/commit-msg
gitcito commit-check "$1"
```

### `gitcito config init | show | check`

`init` leest de repository en stelt een `.gitcito.json` voor op basis van wat er
al is — `.nvmrc`, `.gitmodules`, een `.env.example` zonder `.env`, de
commit-scopes die de geschiedenis gebruikt. `--dry-run` print in plaats van te
schrijven. `show` toont het huidige bestand; `check` valideert het en somt elk
veld op dat zou wegvallen.

### `gitcito repos [filter]`

Elke repository die Gitcito kent — open tabbladen eerst, dan de recente — met de
groep. `--paths` print kale paden, één per regel, om te scripten:

```sh
cd "$(gitcito repos --paths api | head -1)"
```

## Gitcito als editor van git

```sh
gitcito editor install
```

zet `core.editor` en `sequence.editor` op `gitcito --wait`. Vanaf dan openen
`git commit` (zonder `-m`), `git commit --amend`, `git tag -a` en
`git rebase -i` hun bestand in Gitcito in plaats van vim, met een tellertje en
dezelfde hints over het commitbericht als de composer toont.

![De editor die Gitcito opent wanneer git erom vraagt](../../screenshots/cli-edit.webp)

Het woord dat telt is **wacht**: git hangt aan dat dialoogvenster. Dus

- **Opslaan en doorgaan** schrijft het bestand terug en git gaat verder.
- **Annuleren** schrijft een leeg bestand, wat git leest als *afbreken*.
- Het venster op een andere manier sluiten — Escape, de achtergrond, Gitcito
  afsluiten — telt als Annuleren. Een terminal die eeuwig wacht zou veel erger
  zijn dan een bericht dat je opnieuw moet typen.

Voeg `--local` toe om het tot één repository te beperken, en draai het terug met
`gitcito editor uninstall`.

## Wat het niet doet

- **Geen enkel terminalwerkwoord wijzigt de repository.** `doctor --fix` is de
  enige uitzondering, en zijn reparaties zijn een vaste lijst die geen
  configuratiebestand kan uitbreiden.
- **`repos` leest alleen.** De draaiende app bezit haar instellingenbestand; de
  CLI leest het en schrijft het nooit.
- **Een werkwoord dat de geïnstalleerde app niet kent, wordt genegeerd**, niet
  geweigerd — een nieuwere shim opent bij een oudere app alsnog de repository.
- **Windows heeft nog geen shim.** De werkwoorden zijn allemaal geïmplementeerd;
  alleen het installatiepad ontbreekt.

**Zie ook:** [Werkruimtes, tabbladen en groepen](workspaces.md) ·
[Repositoryconfiguratie](repo-settings.md) · [Committen](committing.md)
