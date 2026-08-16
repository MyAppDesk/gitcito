#!/usr/bin/env node
/**
 * Static site generator for gitcito's GitHub Pages.
 *
 * Two outputs from one source of truth:
 *   - a landing page, whose feature copy is the same one the README carries;
 *   - the whole handbook (`docs/help/*.md`), the same Markdown the app renders
 *     offline and GitHub renders in the repository.
 *
 * No framework, no client-side router, no build step beyond this file — a
 * marketing page that needs `npm install` to fix a typo is a page nobody fixes.
 *
 *   node scripts/build-site.mjs          # → dist-site/
 *   node scripts/build-site.mjs --serve  # …and print how to preview it
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync, copyFileSync, rmSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'
import { LOCALE_NAMES, RTL_LOCALES, SITE, coverage, strings } from './site-i18n/index.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const HELP_DIR = join(ROOT, 'docs/help')
const SHOTS_DIR = join(ROOT, 'docs/screenshots')
const OUT = join(ROOT, 'dist-site')

const REPO = 'MyAppDesk/gitcito'
const SITE_URL = 'https://myappdesk.github.io/gitcito'
const RELEASES = `https://github.com/${REPO}/releases`
const LATEST = `${RELEASES}/latest`
const SPONSOR = 'https://github.com/sponsors/cgutierr-zgz'
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))

marked.setOptions({ gfm: true, breaks: false })

// The README and the roadmap stay English on purpose: they duplicate what the
// handbook already says in sixteen languages, and translated copies of them
// would rot silently — nothing in the gate reads them.
const ROADMAP_URL = `https://github.com/${REPO}/blob/main/ROADMAP.md`

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ── Handbook ────────────────────────────────────────────────────────────────

/** Flat `key: value` front matter — the same shape the app parses. */
function parsePage(file) {
  const src = readFileSync(join(HELP_DIR, file), 'utf8')
  // `file` may be `absorb.md` or `es/absorb.md`; the id is the basename either way.
  const id = (file.split('/').pop() ?? file).replace(/\.md$/, '')
  if (!src.startsWith('---')) return { id, title: id, category: 'Guide', order: 999, summary: '', body: src }
  const end = src.indexOf('\n---', 3)
  const meta = {}
  for (const line of src.slice(3, end).split('\n')) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    meta[line.slice(0, colon).trim()] = line
      .slice(colon + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
  }
  return {
    id,
    title: meta.title ?? id,
    category: meta.category ?? 'Guide',
    order: Number(meta.order ?? 999),
    summary: meta.summary ?? '',
    keywords: meta.keywords ?? '',
    body: src.slice(end + 4).replace(/^\n+/, '')
  }
}

const pages = readdirSync(HELP_DIR)
  .filter((f) => f.endsWith('.md'))
  .map(parsePage)
  .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))

const sections = []
for (const page of pages) {
  const found = sections.find((s) => s.category === page.category)
  if (found) found.pages.push(page)
  else sections.push({ category: page.category, pages: [page] })
}

/**
 * Rewrite in-repo links so they resolve on the site instead of on GitHub.
 *
 * `depth` is how deep the page sits under the site root: 1 for the English
 * handbook (`help/x.html`), 2 for a translation (`help/es/x.html`), which is
 * also why the Markdown's own image path differs by one `../`.
 */
function siteLinks(markdown, depth = 1) {
  const assets = `${'../'.repeat(depth)}assets/`
  return markdown
    .replace(/\]\(([\w-]+)\.md\)/g, '](./$1.html)')
    .replace(/\]\(\.\.\/(?:\.\.\/)?screenshots\/([\w.-]+)\)/g, `](${assets}$1)`)
}

// ── Translated handbooks ────────────────────────────────────────────────────

/** locale → its pages, merged over English so a partial translation still works. */
const localeSets = new Map()
const localeCoverage = new Map()
for (const entry of readdirSync(HELP_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const locale = entry.name
  const translated = new Map()
  for (const file of readdirSync(join(HELP_DIR, locale)).filter((f) => f.endsWith('.md'))) {
    const page = parsePage(join(locale, file))
    translated.set(page.id, page)
  }
  if (!translated.size) continue
  // English order wins so every language's sidebar keeps one shape.
  localeSets.set(
    locale,
    pages.map((en) => {
      const local = translated.get(en.id)
      return local ? { ...local, id: en.id, order: en.order } : en
    })
  )
  // Tracked separately from the merged set: every locale renders all 61 pages
  // because untranslated ones fall back, so the merged count would report a
  // half-finished language as complete.
  localeCoverage.set(locale, translated.size)
}

const siteLocales = ['en', ...[...localeSets.keys()].sort()]

/** Sections for a given locale's page set. */
function sectionsOf(pageList) {
  const out = []
  for (const page of pageList) {
    const found = out.find((s) => s.category === page.category)
    if (found) found.pages.push(page)
    else out.push({ category: page.category, pages: [page] })
  }
  return out
}

/** `<link rel="alternate" hreflang>` for the landing page, in every language. */
function alternatesForHome() {
  if (siteLocales.length < 2) return ''
  const url = (loc) => `${SITE_URL}/${loc === 'en' ? '' : `${loc}/`}`
  return (
    siteLocales.map((loc) => `<link rel="alternate" hreflang="${loc}" href="${url(loc)}" />`).join('\n') +
    `\n<link rel="alternate" hreflang="x-default" href="${url('en')}" />\n`
  )
}

/** `<link rel="alternate" hreflang>` for one page id, in every language. */
function alternatesFor(id) {
  if (siteLocales.length < 2) return ''
  const url = (loc) => `${SITE_URL}/help/${loc === 'en' ? '' : `${loc}/`}${id}.html`
  return (
    siteLocales.map((loc) => `<link rel="alternate" hreflang="${loc}" href="${url(loc)}" />`).join('\n') +
    `\n<link rel="alternate" hreflang="x-default" href="${url('en')}" />\n`
  )
}

// ── Shared chrome ───────────────────────────────────────────────────────────

const head = (title, description, depth, opts = {}) => {
  const base = '../'.repeat(depth)
  const { lang = 'en', dir = 'ltr', alternates = '' } = opts
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:type" content="website" />
<meta property="og:image" content="https://myappdesk.github.io/gitcito/assets/og-image.jpg" />
<meta name="theme-color" content="#0b0e1a" />
<link rel="icon" href="${base}assets/gitcito-mark.png" />
<link rel="stylesheet" href="${base}styles.css" />
${alternates}</head>
<body>`
}

/**
 * `depth` is how deep the page sits under the site root, `home` the locale's
 * own root — an English reader clicking the logo should not land in Japanese,
 * and a Japanese reader should not land in English.
 */
const nav = (depth, locale = 'en') => {
  const base = '../'.repeat(depth)
  const t = strings(locale)
  const home = locale === 'en' ? `${base}index.html` : `${base}${locale}/index.html`
  const handbook =
    locale === 'en' ? `${base}help/getting-started.html` : `${base}help/${locale}/getting-started.html`
  return `<header class="nav">
  <a class="brand" href="${home}">
    <img src="${base}assets/gitcito-mark.png" alt="" width="26" height="26" />
    <span>Gitcito</span>
  </a>
  <nav>
    <a href="${handbook}">${t('nav.handbook')}</a>
    <a href="${ROADMAP_URL}">${t('nav.roadmap')}</a>
    <a href="https://github.com/${REPO}">${t('nav.github')}</a>
    <a href="${SPONSOR}">${t('nav.sponsor')}</a>
    <a class="btn small" href="${LATEST}">${t('nav.download')}</a>
  </nav>
</header>`
}

const footer = (locale = 'en') => {
  const t = strings(locale)
  return `<footer class="foot">
  <span>${t('foot.license')}</span>
  <span><a href="https://github.com/${REPO}">${t('foot.source')}</a> · <a href="${ROADMAP_URL}">${t('foot.roadmap')}</a> · <a href="https://github.com/${REPO}/issues/new">${t('foot.reportIssue')}</a> · <a href="${SPONSOR}">${t('foot.sponsor')}</a></span>
</footer>
</body>
</html>`
}

// ── Landing ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '🛰️',
    title: 'Conflict radar',
    id: 'conflict-radar',
    body: 'See which branches will conflict <strong>before</strong> merging any of them. The merges happen inside the object database — no checkout, no working-tree change, nothing to clean up.'
  },
  {
    icon: '🧠',
    title: 'Semantic diff',
    id: 'semantic-diff',
    body: '<code>startServer</code> → <code>bootServer</code>, instead of a 400-line red/green wall. Real tree-sitter parsing across 18 languages.'
  },
  {
    icon: '⏪',
    title: 'What changed since',
    id: 'range-diff',
    body: 'They force-pushed the branch you reviewed. See which commits were rewritten, dropped or added — the old positions come free from the reflog.'
  },
  {
    icon: '💬',
    title: 'Repository chat',
    id: 'repo-chat',
    body: 'Ask this repository a question and get an answer that cites the lines it read. Pin the files and commits it must look at.'
  },
  {
    icon: '🧲',
    title: 'Absorb',
    id: 'absorb',
    body: 'Stage your review fixes and let blame route each hunk into the commit that introduced it, as a <code>fixup!</code>.'
  },
  {
    icon: '🕰️',
    title: 'Time machine',
    id: 'time-machine',
    body: 'Drag a slider and watch the repository change: files appear, move, come back. HEAD never moves and your uncommitted work is untouched.'
  },
  {
    icon: '🎬',
    title: 'Timelapse',
    id: 'timelapse',
    body: "Replay the repository's whole life as an animation — and export it as a video, recorded in the page with no encoder to install."
  },
  {
    icon: '🧪',
    title: 'Preview a pull request',
    id: 'pr-preview',
    body: "Run someone else's PR — forks included — without committing anything. No API token, no second remote: the head is fetched from the ref the forge already publishes, on GitHub, GitLab, Bitbucket, Azure DevOps or Gitea."
  },
  {
    icon: '🎛️',
    title: 'Mission control',
    id: 'mission-control',
    body: 'Every repository of the workspace on one screen, ordered by what needs you: blocked first, then to sync, then dirty, then quiet.'
  },
  {
    icon: '🏷️',
    title: 'File attributes, with a UI',
    id: 'attributes',
    body: 'The most useful file in git that nobody writes. Line endings settled once for everyone, a changelog that stops conflicting, fixtures kept out of release tarballs — and readable diffs for Word and PDF, when the converter is installed.'
  },
  {
    icon: '🌍',
    title: 'Sixteen languages',
    id: 'languages',
    body: 'Not a stub translation of the buttons — the whole interface, explanations included. Arabic and Hebrew mirror the layout, while the graph, diffs, paths and the terminal stay left-to-right, because that is the direction code reads in.'
  },
  {
    icon: '🔐',
    title: 'Your secrets stay yours',
    id: 'security',
    body: 'No backend. Tokens and vault entries are encrypted with your OS keychain — and nothing touches that keychain until you have been told what for and said yes.'
  }
]

// The OS names are proper nouns and stay; only the note beside each is copy.
const DOWNLOADS = [
  { os: 'macOS', noteKey: 'download.macNote', match: 'mac' },
  { os: 'Windows', noteKey: 'download.winNote', match: 'win' },
  { os: 'Linux', noteKey: 'download.linuxNote', match: 'linux' }
]

// A feature card shows the handbook page's own screenshot. The file is named
// after the page id, bar the one case where the page covers more than its shot.
const CARD_SHOT = { security: 'secret-masking' }

/** The card's screenshot, or null when there is none to show. */
function cardShot(id) {
  const name = `${CARD_SHOT[id] ?? id}.webp`
  return existsSync(join(SHOTS_DIR, name)) ? name : null
}

function landing(locale = 'en') {
  const t = strings(locale)
  const forOs = t('download.forOs').split('{os}')
  const depth = locale === 'en' ? 0 : 1
  const base = '../'.repeat(depth)
  // The handbook a card links to is the one in the reader's language.
  const helpDir = locale === 'en' ? `${base}help/` : `${base}help/${locale}/`
  const pageList = locale === 'en' ? pages : (localeSets.get(locale) ?? pages)

  const cards = FEATURES.map((f) => {
    const shot = cardShot(f.id)
    const title = t(`feature.${f.id}.title`)
    const figure = shot
      ? `\n      <a class="card-shot" href="${helpDir}${f.id}.html"><img src="${base}assets/${shot}" alt="${esc(title)}" loading="lazy" /></a>`
      : ''
    return `    <article class="card">${figure}
      <span class="card-icon" aria-hidden="true">${f.icon}</span>
      <h3><a href="${helpDir}${f.id}.html">${title}</a></h3>
      <p>${t(`feature.${f.id}.body`)}</p>
    </article>`
  }).join('\n')

  const downloads = DOWNLOADS.map(
    (d) => `      <a class="dl" href="${LATEST}" data-os="${d.match}">
        <strong>${d.os}</strong>
        <span>${t(d.noteKey)}</span>
      </a>`
  ).join('\n')

  const handbook = sectionsOf(pageList)
    .map(
      (s) => `      <div class="hb-col">
        <h4>${esc(s.category)}</h4>
        ${s.pages.map((p) => `<a href="${helpDir}${p.id}.html">${esc(p.title)}</a>`).join('\n        ')}
      </div>`
    )
    .join('\n')

  const ordinary = (keys) =>
    keys.map((k) => `        <li>${t(`ordinary.${k}`)}</li>`).join('\n')

  const switcher = siteLocales
    .map((loc) => {
      const href = loc === 'en' ? `${base}index.html` : `${base}${loc}/index.html`
      const current = loc === locale ? ' aria-current="true"' : ''
      return `      <a${current} href="${href}" lang="${loc}">${esc(LOCALE_NAMES[loc] ?? loc)}</a>`
    })
    .join('\n')

  return `${head(t('meta.title'), t('meta.description'), depth, {
    lang: locale,
    dir: RTL_LOCALES.has(locale) ? 'rtl' : 'ltr',
    alternates: alternatesForHome()
  })}
${nav(depth, locale)}
<main>
  <section class="hero">
    <img class="hero-mark" src="${base}assets/gitcito-mark.png" alt="" width="86" height="86" />
    <h1>${t('hero.title')}</h1>
    <p class="lede">${t('hero.lede')}</p>
    <div class="cta">
      <a class="btn primary" href="${LATEST}" id="download">${t('hero.download')}</a>
      <a class="btn ghost" href="https://github.com/${REPO}">${t('hero.source')}</a>
    </div>
    <p class="version">${t('hero.terms', { version: pkg.version })}</p>
    <img class="shot" src="${base}assets/graph-dark.webp" alt="${esc(t('hero.graphAlt'))}" loading="lazy" />
    <div class="lang-bar">
${switcher}
    </div>
  </section>

  <section class="section">
    <h2>${t('ordinary.title')}</h2>
    <p class="sub">${t('ordinary.sub')}</p>
    <div class="two">
      <ul class="ticks">
${ordinary(['graph', 'staging', 'conflicts', 'rebase', 'stacks', 'recovery'])}
      </ul>
      <ul class="ticks">
${ordinary(['prs', 'terminal', 'launch', 'ai', 'themes', 'languages'])}
      </ul>
    </div>
    <img class="shot" src="${base}assets/conflict-resolver.webp" alt="${esc(t('ordinary.conflictAlt'))}" loading="lazy" />
  </section>

  <section class="section alt">
    <h2>${t('features.title')}</h2>
    <p class="sub">${t('features.sub')}</p>
    <div class="grid">
${cards}
    </div>
  </section>

  <section class="section">
    <h2>${t('download.title')}</h2>
    <p class="sub">${t('download.sub', { version: pkg.version })}</p>
    <div class="downloads">
${downloads}
    </div>
    <p class="sub small">${t('download.cli', { cli: `${helpDir}cli.html` })}</p>
  </section>

  <section class="section alt">
    <h2>${t('handbook.title', { pages: pages.length })}</h2>
    <p class="sub">${t('handbook.sub')}</p>
    <div class="handbook">
${handbook}
    </div>
  </section>

  <section class="section">
    <h2>${t('sponsor.title')}</h2>
    <p class="sub">${t('sponsor.body')}</p>
    <p><a class="btn primary" href="${SPONSOR}">${t('sponsor.cta')}</a></p>
  </section>
</main>
${footer(locale)}
<script>
  // Point the main button at the file for whoever is reading, and highlight
  // their platform in the download list. Everything still resolves to the
  // latest release page if this never runs.
  (function () {
    var ua = navigator.userAgent
    var os = /Mac/i.test(ua) ? 'mac' : /Win/i.test(ua) ? 'win' : /Linux|X11/i.test(ua) ? 'linux' : null
    if (!os) return
    var label = { mac: 'macOS', win: 'Windows', linux: 'Linux' }[os]
    var btn = document.getElementById('download')
    // Split around {os} instead of interpolating, so a language that puts the
    // platform first ("macOS 版をダウンロード") still reads correctly.
    if (btn) btn.textContent = ${JSON.stringify(forOs[0])} + label + ${JSON.stringify(forOs[1] ?? '')}
    var card = document.querySelector('.dl[data-os="' + os + '"]')
    if (card) card.classList.add('yours')
  })()
</script>
`
}

// ── Handbook pages ──────────────────────────────────────────────────────────

function helpPage(page, locale = 'en', pageList = pages) {
  const depth = locale === 'en' ? 1 : 2
  const sidebar = sectionsOf(pageList)
    .map(
      (s) => `    <div class="side-group">
      <span class="side-title">${esc(s.category)}</span>
      ${s.pages
        .map((p) => `<a class="${p.id === page.id ? 'active' : ''}" href="${p.id}.html">${esc(p.title)}</a>`)
        .join('\n      ')}
    </div>`
    )
    .join('\n')

  // The switcher stays on the page you are reading rather than dumping you at
  // the handbook index — changing language is not the same as starting over.
  const switcher = siteLocales
    .map((loc) => {
      const href =
        loc === 'en'
          ? `${'../'.repeat(depth - 1)}${page.id}.html`
          : `${'../'.repeat(depth - 1)}${loc}/${page.id}.html`
      const current = loc === locale ? ' aria-current="true"' : ''
      return `      <a${current} href="${href}" lang="${loc}">${esc(LOCALE_NAMES[loc] ?? loc)}</a>`
    })
    .join('\n')

  const t = strings(locale)
  const source = locale === 'en' ? `${page.id}.md` : `${locale}/${page.id}.md`
  const edit = locale === 'en' ? t('doc.edit') : t('doc.improve')

  return `${head(`${page.title} — ${t('doc.titleSuffix')}`, page.summary, depth, {
    lang: locale,
    dir: RTL_LOCALES.has(locale) ? 'rtl' : 'ltr',
    alternates: alternatesFor(page.id)
  })}
${nav(depth)}
<div class="doc">
  <aside class="side">
    <input class="side-search" type="search" placeholder="${esc(t('doc.filter'))}" aria-label="${esc(t('doc.filterLabel'))}" />
${siteLocales.length > 1 ? `    <details class="side-lang">\n      <summary>${esc(LOCALE_NAMES[locale] ?? locale)}</summary>\n${switcher}\n    </details>` : ''}
${sidebar}
  </aside>
  <main class="doc-body">
    <p class="crumb">${esc(page.category)}</p>
    <article class="prose">
${marked.parse(siteLinks(page.body, depth))}
    </article>
    <p class="edit"><a href="https://github.com/${REPO}/blob/main/docs/help/${source}">${edit}</a></p>
  </main>
</div>
${footer(locale)}
<script>
  // Filter the sidebar. Deliberately dumb: no index, no fetch, no dependency.
  var search = document.querySelector('.side-search')
  if (search) {
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase()
      document.querySelectorAll('.side-group').forEach(function (group) {
        var any = false
        group.querySelectorAll('a').forEach(function (a) {
          var hit = !q || a.textContent.toLowerCase().indexOf(q) !== -1
          a.style.display = hit ? '' : 'none'
          any = any || hit
        })
        group.style.display = any ? '' : 'none'
      })
    })
  }
</script>
`
}

// ── Styles ──────────────────────────────────────────────────────────────────

const STYLES = `:root {
  --bg: #0b0e1a;
  --bg-2: #131829;
  --bg-3: #1a2036;
  --line: #232a45;
  --text: #e8ecf8;
  --text-2: #a5adc8;
  --text-3: #6f7899;
  --accent: #6366f1;
  --accent-2: #22d3ee;
  --radius: 14px;
  --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }

/* Scrollbars, themed. The OS default is a bright slab on a dark page, and the
   sidebar's own scroller made it look like a seam down the middle. */
* { scrollbar-width: thin; scrollbar-color: var(--line) transparent; }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: var(--line);
  border-radius: 8px;
  border: 3px solid transparent;
  background-clip: content-box;
}
::-webkit-scrollbar-thumb:hover { background: #2f3660; background-clip: content-box; }
::-webkit-scrollbar-corner { background: transparent; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
a { color: var(--accent-2); text-decoration: none; }
a:hover { text-decoration: underline; }
code { font-family: var(--mono); font-size: 0.9em; background: var(--bg-3); padding: 1px 6px; border-radius: 5px; }
img { max-width: 100%; }

/* nav */
.nav {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 18px;
  padding: 12px 26px;
  background: rgba(11, 14, 26, 0.82);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}
.brand { display: flex; align-items: center; gap: 9px; color: var(--text); font-weight: 700; letter-spacing: 0.2px; }
.nav nav { margin-left: auto; display: flex; align-items: center; gap: 20px; }
.nav nav a { color: var(--text-2); font-size: 14px; }
.nav nav a:hover { color: var(--text); text-decoration: none; }

/* buttons */
.btn {
  display: inline-block; padding: 12px 22px; border-radius: 10px;
  font-weight: 600; font-size: 15px; border: 1px solid transparent;
}
.btn.small { padding: 7px 14px; font-size: 13.5px; }
.btn.primary { background: linear-gradient(135deg, var(--accent), #8b5cf6); color: #fff; box-shadow: 0 10px 30px -10px var(--accent); }
.btn.primary:hover { text-decoration: none; filter: brightness(1.08); }
.btn.ghost { border-color: var(--line); color: var(--text); }
.btn.ghost:hover { border-color: var(--accent); text-decoration: none; }
.nav .btn { background: var(--accent); color: #fff; }

/* hero */
.hero { max-width: 1000px; margin: 0 auto; padding: 74px 26px 40px; text-align: center; }
.hero-mark { margin-bottom: 18px; }
.hero h1 { margin: 0 0 14px; font-size: clamp(32px, 5.6vw, 56px); line-height: 1.1; letter-spacing: -0.02em; }
.hero h1 em {
  font-style: normal;
  background: linear-gradient(120deg, var(--accent), var(--accent-2));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.lede { margin: 0 auto 26px; max-width: 620px; color: var(--text-2); font-size: 17px; }
.cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.version { margin-top: 14px; color: var(--text-3); font-size: 13px; }
.shot {
  margin-top: 42px; border-radius: var(--radius); border: 1px solid var(--line);
  box-shadow: 0 40px 80px -40px rgba(0, 0, 0, 0.9);
}

/* sections */
.section { max-width: 1060px; margin: 0 auto; padding: 64px 26px; }
.section.alt { background: var(--bg-2); max-width: none; }
.section.alt > * { max-width: 1060px; margin-left: auto; margin-right: auto; }
.section h2 { font-size: clamp(23px, 3.2vw, 32px); margin: 0 0 10px; letter-spacing: -0.01em; }
.sub { color: var(--text-2); margin: 0 0 30px; max-width: 660px; }
.sub.small { font-size: 14px; margin-top: 18px; }

/* feature grid */
.grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(268px, 1fr)); }
.card {
  padding: 22px; border-radius: var(--radius);
  background: var(--bg-2); border: 1px solid var(--line);
  transition: border-color 0.15s, transform 0.15s;
}
.section.alt .card { background: var(--bg-3); }
.card:hover { border-color: var(--accent); transform: translateY(-2px); }
/* The screenshot sits above the card's text, cropped to a consistent band so
   cards keep a common rhythm whatever shape the shot is. */
.card-shot {
  display: block; margin: -22px -22px 16px; border-bottom: 1px solid var(--line);
  border-radius: var(--radius) var(--radius) 0 0; overflow: hidden;
}
.card-shot img { display: block; width: 100%; height: 148px; object-fit: cover; object-position: top left; }
.card-icon { font-size: 22px; }
.card h3 { margin: 10px 0 8px; font-size: 17px; }
.card h3 a { color: var(--text); }
.card p { margin: 0; color: var(--text-2); font-size: 14.5px; }

/* two columns of ticks */
.two { display: grid; gap: 8px 40px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
.ticks { list-style: none; margin: 0; padding: 0; }
.ticks li { padding: 7px 0 7px 26px; position: relative; color: var(--text-2); font-size: 15px; }
.ticks li::before { content: "✓"; position: absolute; left: 0; color: var(--accent-2); font-weight: 700; }

/* downloads */
.downloads { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(232px, 1fr)); }
.dl {
  display: block; padding: 20px; border-radius: var(--radius);
  background: var(--bg-2); border: 1px solid var(--line); color: var(--text);
}
.dl:hover { border-color: var(--accent); text-decoration: none; }
.dl strong { display: block; font-size: 17px; margin-bottom: 4px; }
.dl span { color: var(--text-3); font-size: 13.5px; }
.dl.yours { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }

/* handbook index */
.handbook { display: grid; gap: 26px; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
.hb-col h4 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-3); }
.hb-col a { display: block; padding: 3px 0; color: var(--text-2); font-size: 14.5px; }
.hb-col a:hover { color: var(--accent-2); }

/* docs */
.doc { display: flex; gap: 34px; max-width: 1180px; margin: 0 auto; padding: 30px 26px 70px; }
.side {
  width: 248px; flex: none;
  position: sticky; top: 74px; align-self: flex-start;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  /* Reserve the track so the list does not shift when the bar appears, and
     keep the thumb off the text. */
  scrollbar-gutter: stable;
  padding-right: 8px;
  /* Fade the last row out instead of cutting it mid-letter. */
  mask-image: linear-gradient(to bottom, #000 calc(100% - 22px), transparent 100%);
}
.side-search {
  width: 100%; margin-bottom: 16px; padding: 7px 10px;
  background: var(--bg-2); border: 1px solid var(--line); border-radius: 8px;
  color: var(--text); font-size: 13.5px;
}
.side-group { margin-bottom: 16px; }
.side-title { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-3); margin-bottom: 5px; }
.side a { display: block; padding: 4px 9px; border-radius: 7px; color: var(--text-2); font-size: 14px; }
.side a:hover { background: var(--bg-2); color: var(--text); text-decoration: none; }
.side a.active { background: var(--bg-3); color: var(--text); font-weight: 600; }
.doc-body { min-width: 0; flex: 1; }
.crumb { color: var(--text-3); font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.07em; margin: 0 0 4px; }
.prose { max-width: 780px; }
.prose h1 { font-size: 34px; margin: 0 0 12px; letter-spacing: -0.02em; }
.prose h2 { font-size: 21px; margin: 34px 0 10px; padding-bottom: 7px; border-bottom: 1px solid var(--line); }
.prose h3 { font-size: 16.5px; margin: 24px 0 8px; }
.prose p, .prose li { color: var(--text-2); }
.prose strong { color: var(--text); }
.prose table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 14.5px; }
.prose th, .prose td { border: 1px solid var(--line); padding: 8px 12px; text-align: left; }
.prose th { background: var(--bg-2); color: var(--text); }
.prose blockquote {
  margin: 16px 0; padding: 10px 16px; border-left: 3px solid var(--accent);
  background: var(--bg-2); border-radius: 0 8px 8px 0;
}
.prose blockquote p { margin: 0; }
.prose pre { background: var(--bg-2); border: 1px solid var(--line); padding: 14px 16px; border-radius: 10px; overflow-x: auto; }
.prose pre code { background: none; padding: 0; }
.prose img { border-radius: 10px; border: 1px solid var(--line); margin: 12px 0; }
.prose kbd {
  font-family: var(--mono); font-size: 12px; padding: 2px 6px;
  border: 1px solid var(--line); border-bottom-width: 2px; border-radius: 5px; background: var(--bg-2);
}
.edit { margin-top: 44px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 13.5px; }

/* language bar under the hero — sixteen endonyms, each in its own script */
.lang-bar {
  display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 14px;
  max-width: 760px; margin: 34px auto 0; padding-top: 22px;
  border-top: 1px solid var(--line);
}
.lang-bar a {
  color: var(--text-3); text-decoration: none; font-size: 13.5px;
  unicode-bidi: isolate;
}
.lang-bar a:hover { color: var(--text); }
.lang-bar a[aria-current] { color: var(--accent-2); }

/* language switcher */
.side-lang { margin-bottom: 18px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg-2); }
.side-lang summary {
  cursor: pointer; padding: 7px 10px; font-size: 13px; color: var(--text-2);
  list-style: none; display: flex; align-items: center; justify-content: space-between;
}
.side-lang summary::after { content: '▾'; color: var(--text-3); }
.side-lang[open] summary::after { content: '▴'; }
.side-lang summary::-webkit-details-marker { display: none; }
.side-lang a { display: block; padding: 5px 10px; font-size: 13px; color: var(--text-2); text-decoration: none; }
.side-lang a:hover { color: var(--text); background: var(--bg-3); }
.side-lang a[aria-current] { color: var(--accent-2); }
/* An endonym is written in its own script, so a right-to-left name sits in a
   left-to-right list. Isolate each so it cannot reorder its neighbours. */
.side-lang a { unicode-bidi: isolate; }

/* A right-to-left handbook page mirrors its prose but not its code. */
[dir='rtl'] .prose th, [dir='rtl'] .prose td { text-align: right; }
[dir='rtl'] .prose pre, [dir='rtl'] .prose code { direction: ltr; unicode-bidi: isolate; text-align: left; }
[dir='rtl'] .prose blockquote {
  border-left: 0; border-right: 3px solid var(--accent); border-radius: 8px 0 0 8px;
}

/* footer */
.foot {
  display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  max-width: 1060px; margin: 0 auto; padding: 30px 26px 46px;
  border-top: 1px solid var(--line); color: var(--text-3); font-size: 13.5px;
}

@media (max-width: 820px) {
  .doc { flex-direction: column; }
  .side { position: static; width: auto; max-height: none; }
  .nav nav { gap: 14px; }
}
`

// ── Build ───────────────────────────────────────────────────────────────────

rmSync(OUT, { recursive: true, force: true })
mkdirSync(join(OUT, 'help'), { recursive: true })
mkdirSync(join(OUT, 'assets'), { recursive: true })

writeFileSync(join(OUT, 'styles.css'), STYLES)
writeFileSync(join(OUT, 'index.html'), landing())
for (const page of pages) writeFileSync(join(OUT, 'help', `${page.id}.html`), helpPage(page))

// A landing page per language at /<locale>/. English keeps the root so no
// existing link, bookmark or search result moves.
for (const locale of siteLocales.filter((l) => l !== 'en')) {
  mkdirSync(join(OUT, locale), { recursive: true })
  writeFileSync(join(OUT, locale, 'index.html'), landing(locale))
}

// One handbook tree per translated locale, under help/<locale>/. English keeps
// the bare help/ path so no existing link or search result breaks.
for (const [locale, pageList] of localeSets) {
  mkdirSync(join(OUT, 'help', locale), { recursive: true })
  for (const page of pageList) {
    writeFileSync(join(OUT, 'help', locale, `${page.id}.html`), helpPage(page, locale, pageList))
  }
}

// Every screenshot the handbook and the landing can reference, plus the mark.
for (const file of readdirSync(SHOTS_DIR)) copyFileSync(join(SHOTS_DIR, file), join(OUT, 'assets', file))
copyFileSync(join(ROOT, 'docs/gitcito-mark.png'), join(OUT, 'assets/gitcito-mark.png'))
// The share card is a 1200x630 JPEG: the screenshots are WebP now, and LinkedIn
// and Facebook are unreliable with it. JPEG is the format every scraper agrees
// on, and a quarter of the PNG's bytes for a photo-like screenshot.
copyFileSync(join(ROOT, 'docs/og-image.jpg'), join(OUT, 'assets/og-image.jpg'))

// Pages would otherwise run the output through Jekyll, which drops _-prefixed
// files and can mangle raw HTML.
writeFileSync(join(OUT, '.nojekyll'), '')

const count = readdirSync(join(OUT, 'help')).filter((f) => f.endsWith('.html')).length
console.log(`✔ site: index + ${count} handbook pages → dist-site/`)
for (const [locale, done] of [...localeCoverage].sort()) {
  const site = coverage(locale)
  const full = done === count && site.done === site.total
  console.log(
    `  ${full ? '✔' : '·'} ${locale.padEnd(6)} handbook ${String(done).padStart(3)}/${count}` +
      `   site copy ${String(site.done).padStart(3)}/${site.total}`
  )
}

// A locale with site copy but no handbook would render a landing page whose
// every link leads back into English. Worth saying out loud.
const orphanCopy = Object.keys(SITE).filter((l) => l !== 'en' && !localeSets.has(l))
if (orphanCopy.length) console.log(`  ! site copy without a handbook: ${orphanCopy.join(', ')}`)
if (process.argv.includes('--serve')) {
  console.log(`  preview: npx serve ${existsSync(OUT) ? 'dist-site' : ''}`)
}
