// Website chrome in nl. Keys mirror en.mjs; anything missing falls back to English.
export const nl = {
  'nav.handbook': 'Handboek',
  'nav.roadmap': 'Roadmap',
  'nav.github': 'GitHub',
  'nav.sponsor': 'Sponsoren',
  'nav.download': 'Downloaden',

  'foot.license':
    'MIT-gelicentieerd · Gemaakt door <a href="https://myappdesk.dev">MyAppDesk</a> met 💜',
  'foot.source': 'Broncode',
  'foot.roadmap': 'Roadmap',
  'foot.reportIssue': 'Een probleem melden',
  'foot.sponsor': 'Sponsoren',

  'meta.title': 'Gitcito — heel git, met een UI die het je laat zien',
  'meta.description':
    'Een volledig vibe-coded Git-client. Gratis. Grafiek, stagen tot op de regel, rebase, worktrees, submodules, LFS — plus een paar dingen waarvan je niet wist dat git ze kon.',

  'hero.title': 'Heel git,<br /><em>met een UI die het je laat zien</em>',
  'hero.lede':
    'Grafiek, stagen tot op de regel, rebase, worktrees, submodules, LFS.<br />De gewone dingen, netjes gedaan — plus een paar waarvan je niet wist dat git ze kon.',
  'hero.download': 'Download voor jouw platform',
  'hero.source': 'Broncode bekijken',
  'hero.terms': 'Gratis · MIT · v{version}',
  'hero.graphAlt': 'De commitgrafiek van Gitcito',

  'features.title': 'Een paar dingen waarvan je niet wist dat git ze kon',
  'features.sub':
    'Geen van deze is de reden om Gitcito te gebruiken — de lijst hierboven is dat. Ze bestaan omdat git het antwoord allang weet; Gitcito vraagt er gewoon naar.',

  'ordinary.title': 'Wat je krijgt',
  'ordinary.sub':
    'Een volledige client, geen deelverzameling. Allemaal gebouwd, gedocumenteerd en vandaag al in de app — de gewone dingen, en dat is het meeste van wat git gebruiken werkelijk is.',
  'ordinary.graph': 'Commitgrafiek met echte banen, gevensterd voor enorme geschiedenissen',
  'ordinary.staging': 'Stagen tot op de losse regel',
  'ordinary.conflicts': 'Conflictoplosser met drie panelen die zegt welke kant welke is',
  'ordinary.rebase': 'Interactieve rebase door te slepen',
  'ordinary.stacks': 'Gestapelde branches met een cascaderende restack',
  'ordinary.recovery': 'Reflog, WIP-momentopnamen, begeleide bisect',
  'ordinary.prs': 'Pull requests op GitHub, GitLab, Bitbucket en Azure DevOps',
  'ordinary.terminal': 'Geïntegreerde terminal — een echte PTY',
  'ordinary.launch':
    'Uitvoeren &amp; debuggen rechtstreeks vanuit <code>.vscode/launch.json</code>',
  'ordinary.ai': 'Optionele AI die de regels citeert die ze gelezen heeft',
  'ordinary.themes': 'Ingebouwde thema’s, licht en donker, plus AI-gegenereerde',
  'ordinary.languages':
    'Overal vertaald, handboek inbegrepen — Arabisch en Hebreeuws spiegelen de indeling',
  'ordinary.conflictAlt': 'De conflictoplosser',

  'download.title': 'Downloaden',
  'download.sub':
    'Nieuwste release: <strong>v{version}</strong>. Elke build wordt vanuit CI gepubliceerd.',
  'download.cli':
    'Of open een repository vanuit je terminal met <code>gitcito .</code> — zie <a href="{cli}">de commandoregel</a>.',
  'download.macNote': 'Apple silicon &amp; Intel · ondertekend en genotariseerd',
  'download.winNote': 'Installatieprogramma (x64)',
  'download.linuxNote': 'AppImage · deb',
  'download.forOs': 'Download voor {os}',

  'handbook.title': 'Een handboek van {pages} pagina’s, ingebouwd in de app',
  'handbook.sub': 'Elke functie uitgelegd — offline in de app, en hier.',

  'sponsor.title': 'Gitcito sponsoren',
  'sponsor.body':
    'Gratis, MIT, geen backend, geen telemetrie, niets om je aan te smeren — er valt dus niets te kopen. Sponsoring betaalt het Apple Developer-certificaat dat de ondertekende macOS-builds nodig hebben, het handboek en de vertalingen. Bugmeldingen zijn net zoveel waard.',
  'sponsor.cta': 'Sponsor op GitHub',

  'doc.titleSuffix': 'Gitcito-handboek',
  'doc.filter': 'Pagina’s filteren…',
  'doc.filterLabel': 'Pagina’s filteren',
  'doc.edit': 'Deze pagina op GitHub bewerken',
  'doc.improve': 'Deze vertaling op GitHub verbeteren',

  'feature.conflict-radar.title': 'Conflictradar',
  'feature.conflict-radar.body':
    'Zie welke branches gaan conflicteren <strong>voordat</strong> je er ook maar één merget. Het mergen gebeurt binnen de objectdatabase — geen checkout, geen wijziging aan de werkboom, niets om op te ruimen.',
  'feature.recovery.title': 'WIP-snapshots',
  'feature.recovery.body':
    'Je hele werkboom — ongevolgde bestanden inbegrepen — vastgelegd op een timer en <strong>vlak vóór elke destructieve actie</strong>. Een weggegooide wijziging waar je spijt van hebt is één herstel verwijderd.',
  'feature.commit-edit.title': 'Bewerk elke commit',
  'feature.commit-edit.body':
    'Zit de typfout drie weken terug? Bewerk het bestand <strong>in de oude commit zelf</strong> — alles erboven wordt opnieuw afgespeeld, en de hele cascade krijgt een voorvertoning voordat er één ref beweegt.',
  'feature.ai.title': 'Breng je eigen modellen mee',
  'feature.ai.body':
    'Meerdere AI-accounts tegelijk — een OpenAI-sleutel voor commitberichten, Claude voor de chat, een lokale Ollama voor de rest. Modellenlijsten komen live van elke aanbieder, en een CLI waarop je al bent aangemeld werkt in plaats van een API-sleutel.',
  'feature.semantic-diff.title': 'Semantische diff',
  'feature.semantic-diff.body':
    '<code>startServer</code> → <code>bootServer</code>, in plaats van een rood-groene muur van 400 regels. Echte tree-sitter-parsing, geen regex.',
  'feature.range-diff.title': 'Wat er veranderd is sinds',
  'feature.range-diff.body':
    'Ze hebben de branch die je reviewde force-gepusht. Zie welke commits herschreven, weggelaten of toegevoegd zijn — de oude posities krijg je gratis uit de reflog.',
  'feature.repo-chat.title': 'Repository-chat',
  'feature.repo-chat.body':
    'Stel deze repository een vraag en krijg een antwoord dat de gelezen regels citeert. Zet de bestanden en commits vast die het moet bekijken — sleep ze uit de graaf, de bestandsboom of van waar dan ook op schijf.',
  'feature.absorb.title': 'Absorb',
  'feature.absorb.body':
    'Stage je reviewfixes en laat blame elke hunk sturen naar de commit die hem introduceerde, als een <code>fixup!</code>.',
  'feature.time-machine.title': 'Tijdmachine',
  'feature.time-machine.body':
    'Sleep een schuifregelaar en zie de repository veranderen: bestanden verschijnen, verhuizen, komen terug. HEAD beweegt nooit en je niet-gecommitte werk blijft onaangeroerd.',
  'feature.timelapse.title': 'Timelapse',
  'feature.timelapse.body':
    'Speel het hele leven van de repository af als animatie — en exporteer het als video, opgenomen in de pagina, zonder encoder om te installeren.',
  'feature.pr-preview.title': 'Een pull request bekijken',
  'feature.pr-preview.body':
    'Draai andermans pull request — forks inbegrepen — zonder iets te committen. Geen API-token, geen tweede remote: de head wordt opgehaald van de ref die de host toch al publiceert, op GitHub, GitLab, Bitbucket, Azure DevOps of Gitea.',
  'feature.mission-control.title': 'Mission control',
  'feature.mission-control.body':
    'Elke repository van de workspace op één scherm, geordend naar wat jou nodig heeft: geblokkeerd eerst, dan te synchroniseren, dan vuil, dan rustig.',
  'feature.attributes.title': 'Bestandsattributen, met een UI',
  'feature.attributes.body':
    'Het nuttigste bestand in git dat niemand schrijft. Regeleindes één keer voor iedereen geregeld, een changelog die ophoudt met conflicteren, fixtures die buiten release-tarballs blijven — en leesbare diffs voor Word en PDF, als de converter geïnstalleerd is.',
  'feature.languages.title': 'Jouw taal, waarschijnlijk',
  'feature.languages.body':
    'Geen half vertaalde knoppen — de hele interface, uitleg inbegrepen. Arabisch en Hebreeuws spiegelen de indeling, terwijl de grafiek, diffs, paden en de terminal van links naar rechts blijven, want dat is de richting waarin code gelezen wordt.',
  'feature.security.title': 'Je geheimen blijven van jou',
  'feature.security.body':
    'Geen backend. Tokens en kluisregels worden versleuteld met de sleutelhanger van je besturingssysteem — en er raakt niets die sleutelhanger tot je verteld is waarvoor, en je ja hebt gezegd.'
}
