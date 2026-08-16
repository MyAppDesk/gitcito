// Website chrome in fr. Keys mirror en.mjs; anything missing falls back to English.
export const fr = {
  'nav.handbook': 'Manuel',
  'nav.roadmap': 'Feuille de route',
  'nav.github': 'GitHub',
  'nav.sponsor': 'Soutenir',
  'nav.download': 'Télécharger',

  'foot.license':
    'Sous licence MIT · Fait par <a href="https://myappdesk.dev">MyAppDesk</a> avec 💜',
  'foot.source': 'Code source',
  'foot.roadmap': 'Feuille de route',
  'foot.reportIssue': 'Signaler un problème',
  'foot.sponsor': 'Soutenir',

  'meta.title': 'Gitcito — tout git, avec une interface qui vous le montre',
  'meta.description':
    'Un client Git entièrement vibe-codé. Gratuit. Graphe, indexation ligne par ligne, rebase, arbres de travail, sous-modules, LFS — plus quelques choses que les autres clients ne font pas.',

  'hero.title': 'Tout git,<br /><em>avec une interface qui vous le montre</em>',
  'hero.lede':
    'Graphe, indexation ligne par ligne, rebase, arbres de travail, sous-modules, LFS.<br />Les choses ordinaires, faites correctement — plus quelques-unes que personne d’autre ne fait.',
  'hero.download': 'Télécharger pour votre plateforme',
  'hero.source': 'Voir le code source',
  'hero.terms': 'Gratuit · MIT · v{version}',
  'hero.graphAlt': 'Le graphe des commits de Gitcito',

  'features.title': 'Quelques choses que les autres clients ne font pas',
  'features.sub':
    'Aucune n’est la raison d’utiliser Gitcito — la liste ci-dessus l’est. Elles existent parce que git connaît déjà la réponse et qu’aucun client ne prend la peine de la lui demander.',

  'ordinary.title': 'Ce que vous obtenez',
  'ordinary.sub':
    'Un client complet, pas un sous-ensemble. Tout est construit, documenté et présent dans l’application aujourd’hui — les choses ordinaires, qui constituent l’essentiel de l’usage réel de git.',
  'ordinary.graph':
    'Graphe des commits avec de vraies voies, fenêtré pour les historiques énormes',
  'ordinary.staging': 'Indexation jusqu’à la ligne près',
  'ordinary.conflicts':
    'Résolveur de conflits à trois volets qui dit quel côté est lequel',
  'ordinary.rebase': 'Rebase interactif par glisser-déposer',
  'ordinary.stacks': 'Branches empilées avec restack en cascade',
  'ordinary.recovery': 'Reflog, instantanés de travail en cours, bisect guidé',
  'ordinary.prs': 'Pull requests sur GitHub, GitLab, Bitbucket et Azure DevOps',
  'ordinary.terminal': 'Terminal intégré — un vrai PTY',
  'ordinary.launch':
    'Exécuter &amp; déboguer directement depuis <code>.vscode/launch.json</code>',
  'ordinary.ai': 'IA optionnelle qui cite les lignes qu’elle a lues',
  'ordinary.themes': 'Thèmes intégrés, clairs et sombres, plus ceux générés par l’IA',
  'ordinary.languages':
    'Traduit de bout en bout, manuel compris — l’arabe et l’hébreu inversent la mise en page',
  'ordinary.conflictAlt': 'Le résolveur de conflits',

  'download.title': 'Téléchargement',
  'download.sub':
    'Dernière version : <strong>v{version}</strong>. Chaque build est publié depuis la CI.',
  'download.cli':
    'Ou ouvrez un dépôt depuis votre terminal avec <code>gitcito .</code> — voir <a href="{cli}">la ligne de commande</a>.',
  'download.macNote': 'Apple silicon &amp; Intel · signé et notarisé',
  'download.winNote': 'Programme d’installation (x64)',
  'download.linuxNote': 'AppImage · deb',
  'download.forOs': 'Télécharger pour {os}',

  'handbook.title': 'Un manuel de {pages} pages, intégré à l’application',
  'handbook.sub':
    'Chaque fonctionnalité expliquée — hors ligne dans l’application, et ici même.',

  'sponsor.title': 'Soutenir Gitcito',
  'sponsor.body':
    'Gratuit, MIT, pas de backend, pas de télémétrie, rien à vous vendre en plus — il n’y a donc rien à acheter. Le parrainage paie le certificat Apple Developer dont les builds macOS signés ont besoin, le manuel et les traductions. Les rapports de bugs valent tout autant.',
  'sponsor.cta': 'Devenir sponsor sur GitHub',

  'doc.titleSuffix': 'Manuel de Gitcito',
  'doc.filter': 'Filtrer les pages…',
  'doc.filterLabel': 'Filtrer les pages',
  'doc.edit': 'Modifier cette page sur GitHub',
  'doc.improve': 'Améliorer cette traduction sur GitHub',

  'feature.conflict-radar.title': 'Radar de conflits',
  'feature.conflict-radar.body':
    'Voyez quelles branches vont entrer en conflit <strong>avant</strong> d’en fusionner aucune. Les fusions ont lieu à l’intérieur de la base d’objets — aucune extraction, aucun changement de la copie de travail, rien à nettoyer.',
  'feature.semantic-diff.title': 'Diff sémantique',
  'feature.semantic-diff.body':
    '<code>startServer</code> → <code>bootServer</code>, au lieu d’un mur rouge et vert de 400 lignes. Une vraie analyse tree-sitter, pas une regex.',
  'feature.range-diff.title': 'Ce qui a changé depuis',
  'feature.range-diff.body':
    'Ils ont poussé en force la branche que vous aviez relue. Voyez quels commits ont été réécrits, abandonnés ou ajoutés — les anciennes positions viennent gratuitement du reflog.',
  'feature.repo-chat.title': 'Discussion du dépôt',
  'feature.repo-chat.body':
    'Posez une question à ce dépôt et obtenez une réponse qui cite les lignes lues. Épinglez les fichiers et les commits à consulter — glissez-les depuis le graphe, l’arborescence ou n’importe où sur le disque.',
  'feature.absorb.title': 'Absorption',
  'feature.absorb.body':
    'Indexez vos corrections de revue et laissez blame diriger chaque section vers le commit qui l’a introduite, sous forme de <code>fixup!</code>.',
  'feature.time-machine.title': 'Machine à remonter le temps',
  'feature.time-machine.body':
    'Faites glisser un curseur et regardez le dépôt changer : les fichiers apparaissent, se déplacent, reviennent. HEAD ne bouge jamais et votre travail non validé reste intact.',
  'feature.timelapse.title': 'Timelapse',
  'feature.timelapse.body':
    'Rejouez toute la vie du dépôt sous forme d’animation — et exportez-la en vidéo, enregistrée dans la page, sans aucun encodeur à installer.',
  'feature.pr-preview.title': 'Prévisualiser une pull request',
  'feature.pr-preview.body':
    'Exécutez la pull request de quelqu’un d’autre — forks compris — sans rien valider. Aucun jeton d’API, aucun second distant : la tête est récupérée depuis la ref que l’hébergeur publie déjà, sur GitHub, GitLab, Bitbucket, Azure DevOps ou Gitea.',
  'feature.mission-control.title': 'Centre de contrôle',
  'feature.mission-control.body':
    'Tous les dépôts de l’espace de travail sur un seul écran, ordonnés selon ce qui réclame votre attention : bloqués d’abord, puis à synchroniser, puis sales, puis tranquilles.',
  'feature.attributes.title': 'Attributs de fichiers, avec une interface',
  'feature.attributes.body':
    'Le fichier le plus utile de git que personne n’écrit. Des fins de ligne réglées une fois pour tout le monde, un changelog qui cesse d’entrer en conflit, des fixtures tenues hors des archives de release — et des diffs lisibles pour Word et PDF, quand le convertisseur est installé.',
  'feature.languages.title': 'Votre langue, sans doute',
  'feature.languages.body':
    'Pas une traduction bâclée des boutons — toute l’interface, explications comprises. L’arabe et l’hébreu inversent la mise en page, tandis que le graphe, les diffs, les chemins et le terminal restent de gauche à droite, parce que c’est dans ce sens que le code se lit.',
  'feature.security.title': 'Vos secrets restent les vôtres',
  'feature.security.body':
    'Pas de backend. Les jetons et les entrées du coffre sont chiffrés avec le trousseau de votre système — et rien ne touche à ce trousseau tant qu’on ne vous a pas dit pourquoi et que vous n’avez pas dit oui.'
}
