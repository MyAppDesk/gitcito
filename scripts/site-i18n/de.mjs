// Website chrome in de. Keys mirror en.mjs; anything missing falls back to English.
export const de = {
  'nav.handbook': 'Handbuch',
  'nav.roadmap': 'Roadmap',
  'nav.github': 'GitHub',
  'nav.sponsor': 'Sponsern',
  'nav.download': 'Herunterladen',

  'foot.license':
    'MIT-lizenziert · Gemacht von <a href="https://myappdesk.dev">MyAppDesk</a> mit 💜',
  'foot.source': 'Quellcode',
  'foot.roadmap': 'Roadmap',
  'foot.reportIssue': 'Ein Problem melden',
  'foot.sponsor': 'Sponsern',

  'meta.title': 'Gitcito — das ganze git, mit einer Oberfläche, die es dir zeigt',
  'meta.description':
    'Ein vollständig vibe-codierter Git-Client. Kostenlos. Graph, Staging bis auf die Zeile, Rebase, Worktrees, Submodule, LFS — dazu ein paar Dinge, die andere Clients nicht tun.',

  'hero.title': 'Das ganze git,<br /><em>mit einer Oberfläche, die es dir zeigt</em>',
  'hero.lede':
    'Graph, Staging bis auf die Zeile, Rebase, Worktrees, Submodule, LFS.<br />Die gewöhnlichen Dinge, ordentlich gemacht — dazu ein paar, die sonst niemand macht.',
  'hero.download': 'Für deine Plattform herunterladen',
  'hero.source': 'Quellcode ansehen',
  'hero.terms': 'Kostenlos · MIT · v{version}',
  'hero.graphAlt': 'Der Commit-Graph von Gitcito',

  'features.title': 'Ein paar Dinge, die andere Clients nicht tun',
  'features.sub':
    'Keines davon ist der Grund, Gitcito zu benutzen — die Liste oben ist es. Es gibt sie, weil git die Antwort ohnehin schon kennt und sich kein Client die Mühe macht, danach zu fragen.',

  'ordinary.title': 'Was du bekommst',
  'ordinary.sub':
    'Ein vollständiger Client, kein Ausschnitt. Alles gebaut, dokumentiert und heute schon in der App — die gewöhnlichen Dinge, und die sind das meiste an dem, was git benutzen wirklich ausmacht.',
  'ordinary.graph': 'Commit-Graph mit echten Spuren, gefenstert für riesige Historien',
  'ordinary.staging': 'Staging bis hinunter zu einzelnen Zeilen',
  'ordinary.conflicts':
    'Dreispaltiger Konfliktlöser, der sagt, welche Seite welche ist',
  'ordinary.rebase': 'Interaktiver Rebase per Ziehen',
  'ordinary.stacks': 'Gestapelte Branches mit kaskadierendem Restack',
  'ordinary.recovery': 'Reflog, WIP-Schnappschüsse, geführtes Bisect',
  'ordinary.prs': 'Pull Requests auf GitHub, GitLab, Bitbucket und Azure DevOps',
  'ordinary.terminal': 'Integriertes Terminal — ein echtes PTY',
  'ordinary.launch':
    'Ausführen &amp; debuggen direkt aus <code>.vscode/launch.json</code>',
  'ordinary.ai': 'Optionale KI, die die Zeilen zitiert, die sie gelesen hat',
  'ordinary.themes': 'Eingebaute Themes, hell und dunkel, dazu KI-generierte',
  'ordinary.languages':
    'Durchgängig übersetzt, Handbuch inklusive — Arabisch und Hebräisch spiegeln das Layout',
  'ordinary.conflictAlt': 'Der Konfliktlöser',

  'download.title': 'Herunterladen',
  'download.sub':
    'Neuestes Release: <strong>v{version}</strong>. Jeder Build wird aus der CI veröffentlicht.',
  'download.cli':
    'Oder öffne ein Repository aus deinem Terminal mit <code>gitcito .</code> — siehe <a href="{cli}">die Kommandozeile</a>.',
  'download.macNote': 'Apple silicon &amp; Intel · signiert und notarisiert',
  'download.winNote': 'Installer (x64)',
  'download.linuxNote': 'AppImage · deb',
  'download.forOs': 'Für {os} herunterladen',

  'handbook.title': 'Ein Handbuch mit {pages} Seiten, eingebaut in die App',
  'handbook.sub': 'Jede Funktion erklärt — offline in der App und genau hier.',

  'sponsor.title': 'Gitcito sponsern',
  'sponsor.body':
    'Kostenlos, MIT, kein Backend, keine Telemetrie, nichts, was dir noch verkauft werden soll — es gibt also nichts zu kaufen. Sponsoring bezahlt das Apple-Developer-Zertifikat, das die signierten macOS-Builds brauchen, das Handbuch und die Übersetzungen. Fehlerberichte sind genauso viel wert.',
  'sponsor.cta': 'Auf GitHub sponsern',

  'doc.titleSuffix': 'Gitcito-Handbuch',
  'doc.filter': 'Seiten filtern…',
  'doc.filterLabel': 'Seiten filtern',
  'doc.edit': 'Diese Seite auf GitHub bearbeiten',
  'doc.improve': 'Diese Übersetzung auf GitHub verbessern',

  'feature.conflict-radar.title': 'Konflikt-Radar',
  'feature.conflict-radar.body':
    'Sieh, welche Branches Konflikte verursachen werden, <strong>bevor</strong> du einen von ihnen mergst. Die Merges passieren innerhalb der Objektdatenbank — kein Checkout, keine Änderung am Arbeitsverzeichnis, nichts, was aufzuräumen wäre.',
  'feature.semantic-diff.title': 'Semantischer Diff',
  'feature.semantic-diff.body':
    '<code>startServer</code> → <code>bootServer</code>, statt einer 400 Zeilen langen rot-grünen Wand. Echtes tree-sitter-Parsing, keine Regex.',
  'feature.range-diff.title': 'Was sich geändert hat seit',
  'feature.range-diff.body':
    'Sie haben den Branch force-gepusht, den du reviewt hast. Sieh, welche Commits umgeschrieben, verworfen oder hinzugefügt wurden — die alten Positionen liefert das Reflog gratis mit.',
  'feature.absorb.title': 'Einarbeiten',
  'feature.absorb.body':
    'Stage deine Review-Korrekturen und lass blame jeden Hunk in den Commit leiten, der ihn eingeführt hat — als <code>fixup!</code>.',
  'feature.time-machine.title': 'Zeitmaschine',
  'feature.time-machine.body':
    'Zieh an einem Regler und sieh dem Repository beim Verändern zu: Dateien tauchen auf, wandern, kommen zurück. HEAD bewegt sich nie, und deine nicht committeten Arbeiten bleiben unangetastet.',
  'feature.timelapse.title': 'Timelapse',
  'feature.timelapse.body':
    'Spiel das ganze Leben des Repositorys als Animation ab — und exportiere es als Video, in der Seite aufgezeichnet, ohne einen Encoder zu installieren.',
  'feature.pr-preview.title': 'Einen Pull Request lokal ansehen',
  'feature.pr-preview.body':
    'Führe den Pull Request von jemand anderem aus — Forks eingeschlossen — ohne irgendetwas zu committen. Kein API-Token, kein zweites Remote: der Head wird von der Ref geholt, die der Hoster ohnehin veröffentlicht, auf GitHub, GitLab, Bitbucket, Azure DevOps oder Gitea.',
  'feature.mission-control.title': 'Missionskontrolle',
  'feature.mission-control.body':
    'Jedes Repository des Workspace auf einem Bildschirm, sortiert danach, was dich braucht: blockiert zuerst, dann zu synchronisieren, dann dirty, dann ruhig.',
  'feature.attributes.title': 'Dateiattribute, mit Oberfläche',
  'feature.attributes.body':
    'Die nützlichste Datei in git, die niemand schreibt. Zeilenenden ein für alle Mal für alle geklärt, ein Changelog, der aufhört zu kollidieren, Fixtures, die aus Release-Tarballs draußen bleiben — und lesbare Diffs für Word und PDF, wenn der Konverter installiert ist.',
  'feature.languages.title': 'Deine Sprache, vermutlich',
  'feature.languages.body':
    'Keine Alibi-Übersetzung der Buttons — die ganze Oberfläche, Erklärungen inklusive. Arabisch und Hebräisch spiegeln das Layout, während Graph, Diffs, Pfade und das Terminal von links nach rechts bleiben, weil Code in dieser Richtung gelesen wird.',
  'feature.security.title': 'Deine Geheimnisse bleiben deine',
  'feature.security.body':
    'Kein Backend. Tokens und Tresor-Einträge werden mit dem Schlüsselbund deines Betriebssystems verschlüsselt — und nichts rührt diesen Schlüsselbund an, bevor dir gesagt wurde wofür und du ja gesagt hast.'
}
