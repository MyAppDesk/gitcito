// Website chrome in it. Keys mirror en.mjs; anything missing falls back to English.
export const it = {
  'nav.handbook': 'Manuale',
  'nav.roadmap': 'Roadmap',
  'nav.github': 'GitHub',
  'nav.sponsor': 'Sostieni',
  'nav.download': 'Download',

  'foot.license': 'Licenza MIT · Fatto da <a href="https://myappdesk.dev">MyAppDesk</a> con 💜',
  'foot.source': 'Codice sorgente',
  'foot.roadmap': 'Roadmap',
  'foot.reportIssue': 'Segnala un problema',
  'foot.sponsor': 'Sostieni',

  'meta.title': 'Gitcito — tutto git, con un’interfaccia che te lo mostra',
  'meta.description':
    'Un client Git interamente vibe-coded. Gratis. Grafo, staging riga per riga, rebase, worktree, sottomoduli, LFS — più alcune cose che non sapevi che git potesse fare.',

  'hero.title': 'Tutto git,<br /><em>con un’interfaccia che te lo mostra</em>',
  'hero.lede':
    'Grafo, staging riga per riga, rebase, worktree, sottomoduli, LFS.<br />Le cose ordinarie, fatte come si deve — più alcune che non sapevi che git potesse fare.',
  'hero.download': 'Scarica per la tua piattaforma',
  'hero.source': 'Vedi il codice',
  'hero.terms': 'Gratis · MIT · v{version}',
  'hero.graphAlt': 'Il grafo dei commit di Gitcito',

  'features.title': 'Alcune cose che non sapevi che git potesse fare',
  'features.sub':
    'Nessuna di queste è il motivo per usare Gitcito — il motivo è l’elenco qui sopra. Esistono perché git conosce già la risposta; Gitcito si limita a chiedergliela.',

  'ordinary.title': 'Cosa include',
  'ordinary.sub':
    'Un client completo, non un sottoinsieme. Tutto realizzato, documentato e già nell’app oggi — le cose ordinarie, che sono la maggior parte di ciò che significa davvero usare git.',
  'ordinary.graph': 'Grafo dei commit con corsie vere, a finestra per cronologie enormi',
  'ordinary.staging': 'Staging fino alla singola riga',
  'ordinary.conflicts': 'Risolutore di conflitti a tre pannelli che dice quale lato è quale',
  'ordinary.rebase': 'Rebase interattivo trascinando',
  'ordinary.stacks': 'Branch impilate con restack a cascata',
  'ordinary.recovery': 'Reflog, snapshot del lavoro in corso, bisect guidato',
  'ordinary.prs': 'Pull request su GitHub, GitLab, Bitbucket e Azure DevOps',
  'ordinary.terminal': 'Terminale integrato — un PTY vero',
  'ordinary.launch': 'Esecuzione e debug direttamente da <code>.vscode/launch.json</code>',
  'ordinary.ai': 'AI opzionale che cita le righe che ha letto',
  'ordinary.themes': 'Temi integrati, chiaro e scuro, più quelli generati dall’AI',
  'ordinary.languages': 'Tutto tradotto, manuale incluso — arabo ed ebraico rispecchiano il layout',
  'ordinary.conflictAlt': 'Il risolutore di conflitti',

  'download.title': 'Download',
  'download.sub':
    'Ultima versione: <strong>v{version}</strong>. Ogni build è pubblicata dalla CI.',
  'download.cli':
    'Oppure apri un repository dal terminale con <code>gitcito .</code> — vedi <a href="{cli}">la riga di comando</a>.',
  'download.macNote': 'Apple silicon &amp; Intel · firmato e notarizzato',
  'download.winNote': 'Installer (x64)',
  'download.linuxNote': 'AppImage · deb',
  'download.forOs': 'Scarica per {os}',

  'handbook.title': 'Un manuale di {pages} pagine, dentro l’app',
  'handbook.sub': 'Ogni funzione spiegata — offline nell’app, e proprio qui.',

  'sponsor.title': 'Sostieni Gitcito',
  'sponsor.body':
    'Gratis, MIT, senza backend, senza telemetria, niente da piazzarti — quindi non c’è niente da comprare. Le sponsorizzazioni pagano il certificato Apple Developer che serve alle build macOS firmate, il manuale e le traduzioni. Una segnalazione di bug vale esattamente lo stesso.',
  'sponsor.cta': 'Sostieni su GitHub',

  'doc.titleSuffix': 'Manuale di Gitcito',
  'doc.filter': 'Filtra le pagine…',
  'doc.filterLabel': 'Filtra le pagine',
  'doc.edit': 'Modifica questa pagina su GitHub',
  'doc.improve': 'Migliora questa traduzione su GitHub',

  'feature.conflict-radar.title': 'Radar dei conflitti',
  'feature.conflict-radar.body':
    'Scopri quali branch andranno in conflitto <strong>prima</strong> di fonderne una sola. I merge avvengono dentro il database degli oggetti — nessun checkout, nessuna modifica alla working tree, niente da ripulire.',
  'feature.recovery.title': 'Istantanee del lavoro in corso',
  'feature.recovery.body':
    'Tutto il tuo albero di lavoro — file non tracciati inclusi — fotografato a intervalli regolari e <strong>subito prima di ogni azione distruttiva</strong>. Uno scarto di cui ti penti è a un ripristino di distanza.',
  'feature.commit-edit.title': 'Modifica qualsiasi commit',
  'feature.commit-edit.body':
    'Il refuso è di tre settimane fa? Modifica il file <strong>dentro il vecchio commit</strong> — tutto ciò che sta sopra viene rieseguito, e l’intera cascata è mostrata in anteprima prima che una sola ref si muova.',
  'feature.ai.title': 'Porta i tuoi modelli',
  'feature.ai.body':
    'Più account di IA insieme — una chiave OpenAI per i messaggi di commit, Claude per la chat, un Ollama locale per il resto. Gli elenchi dei modelli arrivano in diretta da ogni provider, e una CLI a cui hai già fatto l’accesso funziona al posto di una chiave API.',
  'feature.semantic-diff.title': 'Diff semantico',
  'feature.semantic-diff.body':
    '<code>startServer</code> → <code>bootServer</code>, invece di un muro rosso e verde da 400 righe. Parsing vero con tree-sitter, non una regex.',
  'feature.range-diff.title': 'Cos’è cambiato da',
  'feature.range-diff.body':
    'Hanno fatto un force push sul branch che avevi rivisto. Guarda quali commit sono stati riscritti, scartati o aggiunti — le posizioni vecchie arrivano gratis dal reflog.',
  'feature.repo-chat.title': 'Chat del repository',
  'feature.repo-chat.body':
    'Fai una domanda a questo repository e ottieni una risposta che cita le righe lette. Fissa i file e i commit da guardare: trascinali dal grafo, dall’albero dei file o da qualunque punto del disco.',
  'feature.absorb.title': 'Absorb',
  'feature.absorb.body':
    'Metti in stage le correzioni della revisione e lascia che blame instradi ogni hunk nel commit che l’ha introdotto, come un <code>fixup!</code>.',
  'feature.time-machine.title': 'Macchina del tempo',
  'feature.time-machine.body':
    'Trascina un cursore e guarda il repository cambiare: i file compaiono, si spostano, tornano. HEAD non si muove e il tuo lavoro non committato resta intatto.',
  'feature.timelapse.title': 'Timelapse',
  'feature.timelapse.body':
    'Riproduci l’intera vita del repository come un’animazione — ed esportala come video, registrato nella pagina, senza nessun encoder da installare.',
  'feature.pr-preview.title': 'Anteprima di una pull request',
  'feature.pr-preview.body':
    'Esegui la PR di qualcun altro — fork inclusi — senza committare niente. Nessun token API, nessun secondo remote: la head viene recuperata dalla ref che l’host già pubblica, su GitHub, GitLab, Bitbucket, Azure DevOps o Gitea.',
  'feature.mission-control.title': 'Mission control',
  'feature.mission-control.body':
    'Ogni repository dell’area di lavoro su una sola schermata, ordinati per quanto ti reclamano: prima i bloccati, poi quelli da sincronizzare, poi quelli sporchi, poi quelli tranquilli.',
  'feature.attributes.title': 'Attributi dei file, con un’interfaccia',
  'feature.attributes.body':
    'Il file più utile di git che nessuno scrive. Fine riga sistemati una volta per tutti, un changelog che smette di andare in conflitto, fixture tenute fuori dai tarball di release — e diff leggibili per Word e PDF, quando il convertitore è installato.',
  'feature.languages.title': 'La tua lingua, probabilmente',
  'feature.languages.body':
    'Non una traduzione di facciata dei pulsanti — l’interfaccia intera, spiegazioni comprese. Arabo ed ebraico rispecchiano il layout, mentre il grafo, i diff, i percorsi e il terminale restano da sinistra a destra, perché è la direzione in cui si legge il codice.',
  'feature.security.title': 'I tuoi segreti restano tuoi',
  'feature.security.body':
    'Nessun backend. I token e le voci della cassaforte sono cifrati con il portachiavi del sistema — e niente tocca quel portachiavi finché non ti è stato detto a che scopo e non hai detto di sì.',
  'feature.cli.title': 'Una GUI Git con una vera CLI',
  'feature.cli.body':
    '`gitcito .` apre un repository, `gitcito blame src/api.ts -l 84` lo apre su quella riga, e `gitcito doctor` non apre alcuna finestra: verifica ciò che il repository richiede ed esce con un codice che la tua CI sa leggere.'
}
