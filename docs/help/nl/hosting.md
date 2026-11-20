---
title: Hosting & pull requests
category: Synchroniseren & meerdere repo's
order: 56
summary: Maak overal PR's aan; review en merge ze op GitHub en GitLab.
keywords: pull request PR merge request GitHub GitLab Bitbucket Azure DevOps review goedkeuren approve mergen issues
---

# Hosting & pull requests

## Aanmaken

Maak een pull request (of merge request) aan zonder de app te verlaten:
branchkeuzelijsten, titel en body voorgevuld vanuit de commits van de branch, een
conceptschakelaar, en — op GitHub — reviewers, labels en toegewezen personen die
bij het aanmaken meteen worden toegepast.

![Een pull request aanmaken](../../screenshots/create-pr.webp)

Werkt op **GitHub, GitLab, Bitbucket en Azure DevOps**. Openstaande PR's/MR's
voor alle vier staan in de zijbalk.

Begin er een vanuit branchvergelijking, de grafiek, de `+` in het PR-paneel, of
vanuit een issue (wat `Closes #N` invult).

## Stapels in de lijst

Pull requests die op elkaar staan vouwen samen tot één regel met een
stapelpictogram, de branch waarop de ketting landt en hoeveel het er zijn. Klap
hem uit om de ketting in leesvolgorde te zien — blad eerst, tot aan de basis —
met een pijltje onder elke regel dat noemt waarin hij samengaat, zodat de
richting op het scherm staat in plaats van uit vier bases te volgen.

Twee dingen maken zo'n groep: GitHubs eigen stapelnummer, als de pull requests
bij een [native stapel](stacks.md) horen, en anders de refs zelf — een pull
request wiens basis de head van een andere is, staat erop. Die tweede regel is
waarom dit ook op GitLab, Bitbucket en Azure DevOps werkt.

![Een stapel in de pull-requestlijst](../../screenshots/pr-stack-list.webp)

Elke regel draagt de staat van de **checks** van zijn head — hover voor de
aantallen — en op GitHub ook de niveaus die al gesloten of gemerged zijn, die een
lijst met open PR's zou verbergen. Een niveau boven een **gesloten** niveau wordt
als geblokkeerd gemarkeerd: zijn eigen checks mogen groen zijn, maar de branch
waarop hij mikt gaat nooit landen. De acties van de regel verschijnen bij hover,
zodat de titel de breedte houdt.

De checks lezen kost één verzoek per pull request, en alleen bij het verversen
van de lijst.

## Je pull requests op de bovenliggende repository van een fork

In een fork zijn de pull requests die ertoe doen meestal die je opende op de
repository waarvan je forkte, en die staan daar, niet op je fork. Heeft een
repository dus een remote `upstream` die naar een andere GitHub-repository wijst
dan `origin`, dan vraagt de lijst ook `upstream` om zijn open pull requests en
houdt **alleen die waarvan de branch uit je fork komt**. Ze verschijnen onder die
van je fork, onder een kop met de naam van de bovenliggende repository, **Op
owner/repo**. Een klik opent dezelfde detailweergave, met checks en review, op de
bovenliggende repository.

![De eigen pull request van de fork, daaronder zijn pull requests op de bovenliggende repository onder On example/pr-ready-branch](../../screenshots/fork-upstream-prs.webp)

*Grenzen:* alleen GitHub, en alleen een remote met de naam `upstream`. De andere
pull requests van de bovenliggende repository blijven bewust weg: dat is diens
wachtrij, niet jouw werk. Stapels en branch-zoekacties werken nog steeds alleen
met de lijst van `origin`. De bovenliggende repository opvragen kost één verzoek
meer per verversing.

## Reviewen — GitHub en GitLab

![Pull-requestpagina met het gesprek en de zijbalk met reviewers](../../screenshots/pull-request-page.webp)

Een klik op een pull request opent hem als **eigen pagina**. Die hangt aan zijn
repository zoals de wiki: een pictogram met het PR-nummer op het tabblad van de
repository, of op zijn chip in een groep. Klik nogmaals op het pictogram, of op de
naam van de repository, om terug te gaan. **Openen in nieuw tabblad** in het
rechtsklikmenu van de PR geeft hem in plaats daarvan een eigen tabblad. Is de
repository nergens open, dan opent de PR in een eigen tabblad.

Het werk gebeurt in de hoofdkolom, en de zijbalk zegt wat de PR *is*, zonder dat
je hoeft te scrollen. Met AI aan reviewt de ✨-knop in de kop de diff van de PR
zoals de host die meldt, dus het werkt ook voor een branch die je nooit hebt
opgehaald (een fork, die van een ander).

De hoofdkolom heeft drie onderdelen:

| Onderdeel | Wat erin staat |
|---|---|
| **Gesprek** | De beschrijving, opmerkingen en inline reviewdraden (`bestand:regel`, met antwoorden). Daarna het opmerkingenveld met reageren / goedkeuren / wijzigingen vragen, en het mergevak (merge, squash of rebase) |
| **Bestanden** | Elk gewijzigd bestand, en de diff van het gekozen bestand naast de lijst, met syntaxkleuring en wijzigingen op woordniveau (geheim ogende bestanden gemaskeerd als die instelling aan staat). Een ✓-„bekeken”-lijst onthoudt je voortgang. Een bestand waarvoor de host geen diff stuurt (binair of te groot) linkt naar de host |
| **Checks** | CI-check-runs (GitHub), pipelinejobs (GitLab), commitstatussen (Forgejo) of PR-statussen (Azure DevOps), met geslaagd/mislukt/bezig en links naar de logs |

De zijbalk toont:

| Rij | Toont |
|---|---|
| **Auteur** | Wie hem opende, en wanneer |
| **Status** | Open, concept, gemerged (door wie, wanneer) of gesloten; conflicten met het doel |
| **Reviewers** | De laatste beslissing van elke reviewer (goedgekeurd, wijzigingen gevraagd, gereageerd) en wie nog moet reviewen, teams inbegrepen |
| **Toegewezenen, labels, mijlpaal** | Zoals ingesteld op de host, labels in hun eigen kleuren |
| **Branches** | Bron → doel, en de fork waar hij vandaan komt |
| **Wijzigingen** | Gewijzigde bestanden, commits, toegevoegde en verwijderde regels, met een balk |
| **Checks** | Geslaagd / mislukt / bezig, één klik van het onderdeel Checks |
| **Deelnemers** | Iedereen die meedeed |
| **Activiteit** | Wanneer hij geopend en voor het laatst bijgewerkt werd |

GitLab meldt geen regeltotalen voor een merge request; die worden uit de
bestandslijst opgeteld zodra die geladen is. Een rij die de host niet meldt, valt
weg.

Als iemand halverwege de review force-pusht, laat [wat er sindsdien veranderde](range-diff.md)
precies zien wat er verschoof.

GitLab-verschillen, eerlijk gezegd: GitLab heeft geen enkele „review
indienen”-aanroep, dus **goedkeuren** gebruikt het goedkeuringsendpoint en
**wijzigingen vragen** trekt je goedkeuring in en plaatst je opmerking.
**Rebase-merge** wordt niet aangeboden — GitLab kiest tussen mergecommit en
fast-forward op basis van de projectinstellingen, dus het mergemenu toont alleen
merge en squash. Inline draden tonen bestand en regel, maar niet het
omringende stuk diff, dat de API van GitLab niet teruggeeft. Reviewen en mergen
werkt op gitlab.com en op een [zelf beheerde GitLab](#zelf-beheerde-gitlab). Bitbucket
opent voor reviews nog steeds in de browser.

Forgejo-verschillen: draden met regelopmerkingen worden getoond maar je kunt er
niet op antwoorden (Forgejo heeft daar geen API voor), en de checks zijn de
statussen van de head-commit — meer bij [Forgejo](#forgejo).

Azure DevOps-verschillen: goedkeuren brengt je stem uit (*Approved*);
**wijzigingen vragen** stemt *Waiting for author*. De PR afronden kan met merge,
squash of rebase. Azure geeft de gewijzigde bestanden van een PR maar stuurt geen
diff, dus de app haalt beide versies van elk bestand op en berekent de diff zelf
— voor de eerste 200 bestanden; een binair bestand, of een te grote wijziging,
linkt naar de host. Personen verschijnen als initialen, omdat de profielfoto’s
van Azure een aangemelde browser nodig hebben.

De zijbalk toont ook de **aan de PR gekoppelde work items** — nummer, titel, type
en status —, elk opent in de browser. Ze lezen vraagt een token dat work items
mag lezen (*Work Items: Read*); zonder dat valt de rij gewoon weg.

## Zelf beheerde GitLab

Een bedrijfs-GitLab heeft een eigen adres. Geef een profiel dat adres in
**Instellingen → Integraties → GitLab → GitLab-adres**, bijvoorbeeld
`git.example.org` of `https://example.net/gitlab` voor een instantie onder een
pad. Vanaf dan zijn remotes op die host GitLab: merge requests worden getoond,
geopend, gereviewd en gemerged, de kloonbrowser en *Repository aanmaken* praten
ermee, en push en fetch melden zich aan met het token van dat profiel.

**Een GitLab-token hoort bij één instantie.** Het token van een profiel wordt
alleen naar het adres gestuurd dat dat profiel noemt. Een leeg adres betekent
gitlab.com. Een gitlab.com-token bereikt nooit de bedrijfsserver, en een
bedrijfstoken nooit gitlab.com. Staan je werk- en privéaccount op verschillende
instanties, geef elk dan een eigen profiel. Een repository die aan een profiel
gekoppeld is, gebruikt de instantie van dat profiel.

**Token aanmaken** opent de tokenpagina van je instantie met `api` en
`write_repository` vooraf geselecteerd. Een alleen-lezen-token verbindt zonder
problemen en faalt dan bij de eerste push.

Grenzen:

- **Alleen https.** Een `http://`-adres wordt geweigerd, omdat het token anders
  onversleuteld over het netwerk zou gaan.
- **Eén GitLab-instantie per profiel.** Voeg een tweede profiel toe voor een
  tweede instantie.
- Via ssh wordt de host vergeleken, niet het pad, dus twee instanties op één host
  onder verschillende paden zijn bij een ssh-remote niet uit elkaar te houden.
- Remote-avatars worden alleen getekend voor gitlab.com en github.com. Een zelf
  beheerde remote krijgt het eenvoudige pictogram, zodat zijn groepsnamen nooit
  naar een publieke host gaan.

## Forgejo

Stel het adres van de instantie in voordat je het token invoert. Het adres wijzigen wist de vorige aanmelding.

![Instellingen voor de Forgejo-integratie](../../screenshots/forgejo-integration.webp)

Forgejo — en Gitea, dat dezelfde API deelt — draait altijd op een adres dat de
eigenaar koos: je eigen server, of een publieke zoals codeberg.org. Geef een
profiel dat adres in **Instellingen → Integraties → Forgejo**, samen met een
toegangstoken. **Token aanmaken** opent de tokenpagina van die server. Geef het token lees- en schrijfrechten op *repository*, *issue* en
*notification*, en leesrechten op *user* en *organization*. De rechten van een
token zijn achteraf niet te wijzigen: een token zonder *issue* of *notification*
toont geen issues of meldingen, en een nieuw token is de oplossing.

Vanaf dan zijn remotes op die server Forgejo:

| Werkt | Hoe |
|-------|-----|
| Push en fetch | Aangemeld met het token van het profiel |
| Open pull requests | Getoond in de zijbalk en geopend in de [pull-requestpagina](#reviewen--github-en-gitlab): gesprek, diff van elk bestand, checks (commitstatussen, inclusief Forgejo Actions), reageren, goedkeuren, wijzigingen vragen, en merge / squash / rebase |
| Een pull request aanmaken | Vanuit de app; een concept krijgt het voorvoegsel `WIP:` dat Forgejo gebruikt |
| Kloonbrowser, repository aanmaken | Op die server, onder je account of een organisatie |

Een check die een **Forgejo Actions**-job is, toont zijn log onder de rij, met
kleuren, beginnend aan het eind, waar de fout staat. Forgejo heeft geen API voor
joblogs, dus de app vraagt dezelfde pagina op die de logweergave op het web
downloadt, en stuurt het token alleen mee als de link een job op precies deze
server is; een status van een externe CI krijgt het nooit. Een server die logs
alleen aan een aangemelde browser geeft, antwoordt met zijn aanmeldpagina — de rij
zegt dat en biedt de browser aan. Heel lange logs tonen hun laatste paar duizend
regels.

Net als bij GitLab gaat **een Forgejo-token alleen naar de server die het
uitgaf**. Een profiel zonder Forgejo-adres heeft helemaal geen
Forgejo-aanmelding. Er is geen standaardserver om op terug te vallen.

Grenzen:

- Draden met regelopmerkingen worden getoond, maar je kunt er vanuit de app niet
  op antwoorden: Forgejo heeft geen API voor een antwoord binnen een bestaande
  draad. Antwoord op de server.
- Alleen https, één Forgejo-server per profiel.
- Lijsten stoppen na twintig verzoeken: 1.000 pull requests of repositories bij de standaard paginagrootte van de server.

## Issues, mijlpalen, releases — GitHub en Forgejo

Blader door issues en open een volledig issue-tabblad: body, opmerkingen, labels,
toegewezen personen, milestone, Projects v2-velden, sluiten/heropenen, en **maak
een branch voor dit issue** (met AI-naamgeving). Milestones tonen voortgang en
hun issues. Releases zijn doorbladerbaar met een changelogpagina.

Op een [Forgejo](#forgejo)-server werken dezelfde lijsten en pagina’s, met het
Forgejo-token van het profiel. Twee dingen zijn alleen van GitHub en blijven daar
leeg: velden uit Projects v2 en de aan een issue gekoppelde pull requests.
Releases tonen de nieuwste, niet de hele geschiedenis.

## Wacht op jouw review

In de pull-requestlijst van de zijbalk markeert een 👁 de PR's waarbij **jij**
reviewer bent en nog niet hebt gereageerd — op GitHub, GitLab en Forgejo. Wie
„jij” bent, wordt met de aanmelding van het profiel aan de host gevraagd en tien
minuten onthouden. Een token dat zijn eigen gebruiker niet mag lezen (zonder
`read:user` op Forgejo, bijvoorbeeld) markeert niets.

Met **Instellingen → Systeemmeldingen** aan geeft een pull request op GitLab of
Forgejo die op jou *begint* te wachten er een; een klik opent de PR-pagina. De
eerste blik op een repository onthoudt alleen wat al wacht, dus de app openen
speelt geen achterstand af. Reviewverzoeken van GitHub blijven bij zijn
meldingeninbox, verderop, die ze al meldt.

## Meldingen — GitHub en Forgejo

Je hele inbox — reviewverzoeken, vermeldingen, CI-activiteit — over elke
repository heen, met filters voor ongelezen/alles en markeren als gelezen. De bel
in de werkbalk draagt een badge voor ongelezen items, en optionele
bureaubladmeldingen gaan af wanneer er om een review gevraagd wordt of CI klaar
is.

Heeft het actieve profiel een Forgejo-server, dan komen diens meldingen in
dezelfde lijst, de nieuwste eerst, en worden ze op die server als gelezen
gemarkeerd. Forgejo zegt niet *waarom* je een melding kreeg, dus die rijen hebben
geen reden en geven nooit een systeemmelding — die hangt van de reden af.

## Tokens

Tokens per profiel voor meerdere accounts of organisaties, bewaard in de
sleutelhanger van je besturingssysteem. Gitcito kan ook lenen wat je **git
credential helper** al bevat, dus een organisatie waarvoor je al geauthenticeerd
bent vergt vaak helemaal geen instelwerk. Zie
[Beveiliging & geheimen](security.md).

Elk profiel **koppelt zijn eigen account**. In Instellingen → Integraties zoekt
**Inloggen met git** een login die al op de machine staat — in de credential
helper van git, dan het actieve account van de **GitHub CLI**, dan het
aanmeldvenster van de helper — en koppelt dat account aan het profiel. Niets
wordt stilzwijgend gedeeld: een nieuw profiel begint ontkoppeld, en een account
dat een ander profiel al koppelde, wordt geweigerd. Voor een tweede
GitHub-account voeg je het toe aan gh (`gh auth login`), maak je het actief
(`gh auth switch`) en meld je aan vanuit het andere profiel — of plak je het
token van dat account. Git vraagt nooit in een terminal om gebruikersnaam en
wachtwoord.

De pagina toont of de verbinding het token van het profiel is, de koppeling met
de helper van git of met de GitHub CLI, en **Ontkoppelen** maakt dat alleen voor
dit profiel ongedaan: een token wordt gewist (bij de host blijft het geldig tot
je het daar intrekt), een koppeling verwijderd (de login blijft in gh of de helper).

De API van de host — pull requests, issues, CI — en fetch, pull en push van git
zelf over https gebruiken allebei het token of het gekoppelde account van het
profiel. De inloggegevens bereiken git alleen voor dat ene commando, beperkt tot
de host van de remote, en worden nooit in `.git/config` geschreven. Een profiel
zonder beide laat git aan zijn eigen credential helper over. Azure DevOps,
GitLab en Bitbucket koppelen via de credential helper van git — Git Credential
Manager bewaart meerdere accounts per host — of gebruiken een token per
profiel. Een koppeling noemt één account per host, dus organisaties die
verschillende accounts nodig hebben, krijgen elk een profiel.

**Zie ook:** [Gestapelde branches](stacks.md) · [AI-functies](ai.md)
