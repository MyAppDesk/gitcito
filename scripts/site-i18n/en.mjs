/**
 * Copy for the website's own chrome — everything the generator writes that does
 * not come from `docs/help/`.
 *
 * The handbook translates itself: its pages are Markdown, one directory per
 * locale. The landing page, the nav, the footer and the feature cards had no
 * such home, so they lived as literals inside `build-site.mjs` and stayed
 * English no matter what language the reader picked. This is that home.
 *
 * Rules, mirroring the app's dictionaries in `src/renderer/src/i18n/`:
 *
 *   - `en` is the reference. A locale may omit a key; the generator falls back
 *     to English rather than printing the key.
 *   - Values may carry inline HTML (`<code>`, `<em>`, `<strong>`, `<br />`).
 *     Keep the tags; translate around them.
 *   - `{version}`, `{pages}` and `{os}` are substituted at build time. Keep the
 *     token spelled exactly; word order around it is yours.
 *   - Product names, git commands and file paths stay as they are.
 *
 * `npm run site` prints per-locale coverage, and `test/docs.test.ts` fails if a
 * locale invents a key English does not have.
 */

export const en = {
  'nav.handbook': 'Handbook',
  'nav.roadmap': 'Roadmap',
  'nav.github': 'GitHub',
  'nav.sponsor': 'Sponsor',
  'nav.download': 'Download',

  'foot.license': 'MIT licensed · Made by <a href="https://myappdesk.dev">MyAppDesk</a> with 💜',
  'foot.source': 'Source',
  'foot.roadmap': 'Roadmap',
  'foot.reportIssue': 'Report an issue',
  'foot.sponsor': 'Sponsor',

  'meta.title': 'Gitcito — the whole of git, with a UI that shows it to you',
  'meta.description':
    'A fully vibe-coded Git client. Free. Graph, staging by line, rebase, worktrees, submodules, LFS — plus a few things other clients do not do.',

  'hero.title': 'The whole of git,<br /><em>with a UI that shows it to you</em>',
  'hero.lede':
    'Graph, staging by line, rebase, worktrees, submodules, LFS.<br />The ordinary things, done properly — plus a few nobody else does.',
  'hero.download': 'Download for your platform',
  'hero.source': 'View source',
  'hero.terms': 'Free · MIT · v{version}',
  'hero.graphAlt': 'The Gitcito commit graph',

  'features.title': 'A few things other clients do not do',
  'features.sub':
    'None of these is the reason to use Gitcito — the list above is. They exist because git already knows the answer and no client bothers to ask it.',

  'ordinary.title': 'What you get',
  'ordinary.sub':
    'A complete client, not a subset. All of it built, documented and in the app today — the ordinary things, which is most of what using git actually is.',
  'ordinary.graph': 'Commit graph with real lanes, windowed for huge histories',
  'ordinary.staging': 'Staging down to individual lines',
  'ordinary.conflicts': 'Three-pane conflict resolver that says which side is which',
  'ordinary.rebase': 'Interactive rebase by dragging',
  'ordinary.stacks': 'Stacked branches with a cascade restack',
  'ordinary.recovery': 'Reflog, WIP snapshots, guided bisect',
  'ordinary.prs': 'Pull requests on GitHub, GitLab, Bitbucket and Azure DevOps',
  'ordinary.terminal': 'Integrated terminal — a real PTY',
  'ordinary.launch': 'Run &amp; debug straight from <code>.vscode/launch.json</code>',
  'ordinary.ai': 'Optional AI that cites the lines it read',
  'ordinary.themes': 'Built-in themes, light and dark, plus AI-generated ones',
  'ordinary.languages': 'Translated throughout, handbook included — Arabic and Hebrew mirror the layout',
  'ordinary.conflictAlt': 'The conflict resolver',

  'download.title': 'Download',
  'download.sub': 'Latest release: <strong>v{version}</strong>. Every build is published from CI.',
  'download.cli':
    'Or open a repository from your terminal with <code>gitcito .</code> — see <a href="{cli}">the command line</a>.',
  'download.macNote': 'Apple silicon &amp; Intel · signed and notarised',
  'download.winNote': 'Installer (x64)',
  'download.linuxNote': 'AppImage · deb',
  'download.forOs': 'Download for {os}',

  'handbook.title': 'A {pages}-page handbook, built into the app',
  'handbook.sub': 'Every feature explained — offline in the app, and right here.',

  'sponsor.title': 'Sponsor Gitcito',
  'sponsor.body':
    'Free, MIT, no backend, no telemetry, nothing to upsell — so there is nothing to buy. Sponsorship pays for the Apple Developer certificate the signed macOS builds need, the handbook and the translations. Bug reports are worth just as much.',
  'sponsor.cta': 'Sponsor on GitHub',

  'doc.titleSuffix': 'Gitcito handbook',
  'doc.filter': 'Filter pages…',
  'doc.filterLabel': 'Filter pages',
  'doc.edit': 'Edit this page on GitHub',
  'doc.improve': 'Improve this translation on GitHub',

  'feature.conflict-radar.title': 'Conflict radar',
  'feature.conflict-radar.body':
    'See which branches will conflict <strong>before</strong> merging any of them. The merges happen inside the object database — no checkout, no working-tree change, nothing to clean up.',
  'feature.semantic-diff.title': 'Semantic diff',
  'feature.semantic-diff.body':
    '<code>startServer</code> → <code>bootServer</code>, instead of a 400-line red/green wall. Real tree-sitter parsing, not a regex.',
  'feature.range-diff.title': 'What changed since',
  'feature.range-diff.body':
    'They force-pushed the branch you reviewed. See which commits were rewritten, dropped or added — the old positions come free from the reflog.',
  'feature.absorb.title': 'Absorb',
  'feature.absorb.body':
    'Stage your review fixes and let blame route each hunk into the commit that introduced it, as a <code>fixup!</code>.',
  'feature.time-machine.title': 'Time machine',
  'feature.time-machine.body':
    'Drag a slider and watch the repository change: files appear, move, come back. HEAD never moves and your uncommitted work is untouched.',
  'feature.timelapse.title': 'Timelapse',
  'feature.timelapse.body':
    "Replay the repository's whole life as an animation — and export it as a video, recorded in the page with no encoder to install.",
  'feature.pr-preview.title': 'Preview a pull request',
  'feature.pr-preview.body':
    "Run someone else's PR — forks included — without committing anything. No API token, no second remote: the head is fetched from the ref the forge already publishes, on GitHub, GitLab, Bitbucket, Azure DevOps or Gitea.",
  'feature.mission-control.title': 'Mission control',
  'feature.mission-control.body':
    'Every repository of the workspace on one screen, ordered by what needs you: blocked first, then to sync, then dirty, then quiet.',
  'feature.attributes.title': 'File attributes, with a UI',
  'feature.attributes.body':
    'The most useful file in git that nobody writes. Line endings settled once for everyone, a changelog that stops conflicting, fixtures kept out of release tarballs — and readable diffs for Word and PDF, when the converter is installed.',
  'feature.languages.title': 'Your language, probably',
  'feature.languages.body':
    'Not a stub translation of the buttons — the whole interface, explanations included. Arabic and Hebrew mirror the layout, while the graph, diffs, paths and the terminal stay left-to-right, because that is the direction code reads in.',
  'feature.security.title': 'Your secrets stay yours',
  'feature.security.body':
    'No backend. Tokens and vault entries are encrypted with your OS keychain — and nothing touches that keychain until you have been told what for and said yes.'
}
