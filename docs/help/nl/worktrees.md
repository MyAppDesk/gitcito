---
title: Worktrees & submodules
category: Synchroniseren & meerdere repo's
order: 54
summary: Meerdere checkouts van één repository; en repository's binnen repository's.
keywords: worktree worktrees submodule submodules gekoppelde checkout init sync
---

# Worktrees & submodules

## Worktrees

Een worktree is een tweede checkout van dezelfde repository, in een eigen map —
zodat je naar `main` kunt kijken terwijl `feature/x` precies blijft zoals je hem
achterliet, zonder te stashen.

- Maak en verwijder worktrees vanuit de zijbalk. **Dubbelklik** er een om hem
  als eigen tabblad te openen; rechtsklik geeft *Worktree openen*, *In map
  tonen* en verwijderen.
- Rechtsklik een willekeurige lokale branch → **Openen in een worktree** om er
  een op te tuigen in een naburige map en hem als tabblad te openen.
- Een branch woont maar in één worktree tegelijk, dus een branch uitchecken die
  een andere worktree al vasthoudt kan niet — git weigert met *already used by
  worktree at …*. Gitcito brengt je er in plaats daarvan heen: het branchmenu
  zegt *Naar `x` in zijn worktree*, en dubbelklikken op de rij opent het tabblad
  van die worktree in plaats van te mislukken.

### Worktrees onderhouden

Een worktree van vorige maand ben je snel vergeten, en de vragen komen bij het opruimen: zit er nog werk in? Bestaat die map nog? Elke rij beantwoordt ze voordat je ze hoeft te stellen.

| Op de rij | Betekent |
|---|---|
| **●3** | Drie bestanden met niet-gecommitte wijzigingen in die worktree |
| **↑2 ↓1** | De branch staat twee commits voor en één achter op de upstream |
| 🔒 | Vergrendeld — beweeg erover voor de reden die bij het vergrendelen is opgegeven |
| **ontbreekt**, naam doorgestreept | De map is weg; git heeft alleen de registratie nog |

De aantallen worden gelezen als de sectie opengaat, als de commit van die worktree verandert en als het venster de focus terugkrijgt — niet bij elke verversing, want elk is een `git status` in een andere map.

Klik met rechts op een rij voor:

| Actie | Wat het doet |
|---|---|
| **Worktree vergrendelen** | Voorkomt dat git (en elke andere client) hem opschoont, verplaatst of verwijdert. Geef een reden — *op de externe schijf* — en die verschijnt bij het slot. Voor worktrees op media die niet altijd zijn aangesloten. |
| **Worktree ontgrendelen** | Het omgekeerde. Ongedaan maken vergrendelt hem weer, met dezelfde reden. |
| **Worktree verplaatsen…** | Verplaatst de map en werkt de koppelingen van git in beide richtingen bij. Niet beschikbaar zolang hij vergrendeld of in een tabblad geopend is: tabbladen en hun indeling worden per pad onthouden, dus het tabblad zou naar niets wijzen. Sluit het eerst. Ongedaan maken zet hem terug. |
| **Worktree verwijderen** | Vraagt git eerst wat er verloren zou gaan. Een schone worktree krijgt de gewone bevestiging, en ongedaan maken maakt hem opnieuw aan op dezelfde branch in dezelfde map. Een met niet-gecommitte wijzigingen krijgt een aparte bevestiging, *Weggooien en verwijderen*, met het aantal bestanden, zonder ongedaan maken. |
| **Verplaatste map opnieuw koppelen…** | Alleen op een rij die *ontbreekt*: geef aan waar de map naartoe is (verplaatst in de bestandsbeheerder) en git koppelt hem opnieuw met `git worktree repair`. |
| **Ontbrekende worktrees vergeten** | Ook de gumknop in de sectiekop, zichtbaar zodra een rij ontbreekt. Voert `git worktree prune` uit. |

Wat deze acties **niet** doen:

- **Een worktree verwijderen wist ook de genegeerde bestanden** — `.env`, `node_modules`, build-uitvoer. Git telt ze niet als wijzigingen, dus zelfs de "schone" bevestiging meldt het, en ongedaan maken brengt ze niet terug.
- **Vergeten wist alleen de registratie in git.** Er zijn geen bestanden te wissen — de map is al weg — en vergrendelde worktrees worden overgeslagen, want een vergrendelde op een losgekoppelde schijf ziet er precies zo uit als een gewiste.
- Een vergrendeling is een afspraak tussen git-clients, geen bestandsbeveiliging: niets buiten git wordt tegengehouden de map te wissen.
- De hoofd-worktree — de repository zelf — kan niet worden vergrendeld, verplaatst of verwijderd.
- Een worktree verwijderen verwijdert nooit de branch. Verwijder die in de branchlijst als je klaar bent.

![De worktree- en submodulesecties van de zijbalk, beide gevuld](../../screenshots/worktrees.webp)

## Submodules

Voeg submodules toe, werk ze bij (init & checkout), synchroniseer URL's en
verwijder ze, met live status voor elk:

| Status | Betekent |
|---|---|
| **In sync** | Uitgecheckt op de commit die de ouder vastlegt |
| **Gewijzigd** | Ergens anders uitgecheckt, of vuil |
| **Niet geïnitialiseerd** | Vastgelegd, maar nooit uitgecheckt |

![Submodules met hun status, elk op een eigen rij](../../screenshots/submodule-states.webp)

**Zie ook:** [LFS & sparse-checkout](lfs-sparse.md) · [Fetchen, pullen & pushen](syncing.md)
