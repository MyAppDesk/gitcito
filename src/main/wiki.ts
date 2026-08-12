import { app, ipcMain, type WebContents } from 'electron'
import { dirname, join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import type {
  AIConfig,
  DependencyRef,
  ImportGraph,
  RepoFacts,
  RepoWiki,
  TechStack,
  WikiPage,
  WikiPagePlan,
  WikiProgress
} from '../shared/types'
import { isSecretFile } from '../shared/secretFiles'
import { isSafeRepoPath } from './aiSchemas'
import { gitService } from './git'
import { chatCompleteJson, InvalidAIResponse } from './ai'
import {
  MAX_PAGES,
  MAX_STACK_GROUPS,
  TECH_STACK_SCHEMA,
  cleanPageTitle,
  WIKI_PAGE_SCHEMA,
  WIKI_PLAN_SCHEMA,
  WIKI_PROMPT_VERSION,
  orderPlan,
  renderWikiPage,
  validateTechStack,
  validateWikiPage,
  validateWikiPlan,
  wikiExportFiles,
  wikiFreshness,
  type WikiFreshness
} from './wikiSchemas'
import { buildPagePack, rankPlanFiles, serializePack, serializeRepoFacts } from './wikiPack'
import {
  detectFrameworks,
  findManifests,
  languageBreakdown,
  meaningfulDependencies,
  parseManifest
} from '../shared/repoFacts'
import { buildImportGraph } from '../shared/importGraph'

// A generated wiki for a repository: the model plans the pages, writes each one
// from files the app hands it, and may only cite those files. Everything is
// built in memory and stored in one go, so a half-generated wiki never replaces
// a good one.

interface WikiData {
  repos: Record<string, RepoWiki>
}

const filePath = (): string => join(app.getPath('userData'), 'gitcito-wiki.json')
const empty = (): WikiData => ({ repos: {} })

async function load(): Promise<WikiData> {
  try {
    const raw = await readFile(filePath(), 'utf-8')
    return { ...empty(), ...(JSON.parse(raw) as WikiData) }
  } catch {
    return empty() // missing or corrupt → no wiki yet
  }
}

async function save(data: WikiData): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(filePath(), JSON.stringify(data, null, 2), 'utf-8')
}

/** How many pages are written at once. Enough to be quick, few enough to be polite. */
const WORKERS = 3
/** Files whose paths are shown to the planner. */
const PLAN_FILE_LIMIT = 400
/** Files packed into one page's prompt. */
const PAGE_FILE_LIMIT = 12

async function headSha(repoPath: string): Promise<string> {
  const [head] = await gitService.log(repoPath, 1).catch(() => [])
  return head?.hash ?? ''
}

/** Every readable, non-secret file the repo tracks. */
async function candidateFiles(repoPath: string): Promise<string[]> {
  const tracked = await gitService.listTrackedFiles(repoPath).catch(() => [] as string[])
  // A wiki is a summary of the code, never of the credentials sitting next to it.
  return tracked.filter((path) => !isSecretFile(path))
}

async function planWiki(
  repoPath: string,
  repoName: string,
  files: string[],
  cfg: AIConfig
): Promise<WikiPagePlan[]> {
  const [branch, insights] = await Promise.all([
    gitService.open(repoPath).then((r) => r.current).catch(() => ''),
    gitService.repoInsights(repoPath, 0).catch(() => null)
  ])
  const ranked = rankPlanFiles(files, insights?.hotspots.map((h) => h.path) ?? [], PLAN_FILE_LIMIT)
  const facts = serializeRepoFacts({
    name: repoName,
    branch,
    totalCommits: insights?.totalCommits ?? 0,
    authors: insights?.authors ?? [],
    hotspots: insights?.hotspots ?? []
  })

  const system = `You are a staff engineer planning a short wiki that explains a codebase to a new contributor.

You are given the repository's file list and some facts about it. Plan the pages.

Rules:
- Between 3 and ${MAX_PAGES} pages. Fewer, better pages beat many thin ones.
- Exactly one page must have archetype "overview": what the project is and how it fits together.
- Every other page must list, in "scopePaths", the files it is about — copied EXACTLY from the file list. Never invent a path.
- Group by what the code does (a subsystem, a workflow), not by folder depth.
- "slug" is kebab-case and unique.
- "title" names the thing itself, in sentence case: "Data layer", "Release process", "Commit graph". Never repeat the archetype in it — no "… Module", "… Page", "… Overview", "… Reference".

Reply ONLY with valid JSON (no markdown fences):
{"pages":[{"slug":"overview","title":"Overview","archetype":"overview","scopePaths":["README.md"]}]}
- "archetype" is one of: overview, module, workflow, reference.`

  const known = new Set(ranked)
  const plan = await chatCompleteJson<{ pages: WikiPagePlan[] }>(
    cfg,
    [
      { role: 'system', content: system },
      { role: 'user', content: `${facts}\n\nFiles:\n${ranked.join('\n')}` }
    ],
    'wikiPlan',
    { name: 'wiki_plan', schema: WIKI_PLAN_SCHEMA, validate: (v) => validateWikiPlan(v, known) },
    0.2
  )
  return orderPlan(plan.pages.map((p) => ({ ...p, title: cleanPageTitle(p.title) })))
}

async function writePage(
  repoPath: string,
  plan: WikiPagePlan,
  slugs: Set<string>,
  cfg: AIConfig
): Promise<WikiPage> {
  const paths = plan.scopePaths.slice(0, PAGE_FILE_LIMIT)
  const contents = await Promise.all(
    paths.map(async (path) => ({ path, content: await gitService.fileContent(repoPath, path).catch(() => '') }))
  )
  const pack = buildPagePack(contents)
  const allowed = { paths: new Set(pack.files.map((f) => f.path)), slugs: new Set([...slugs].filter((s) => s !== plan.slug)) }

  const system = `You are writing one page of a wiki that explains a codebase, for a new contributor.

You are given the full text of the files this page covers. Rules:
- Every claim must be supported by one of those files, named in "sourcePaths" exactly as given. If no file supports a claim, leave the claim out.
- Never invent file paths, function names or behaviour you cannot see.
- Never write Markdown, links or line numbers — the app renders those from what you return.
- At most 6 sections, at most 8 claims each. Prefer explaining how things fit together over listing what exists.
- "related" may only contain slugs of other pages in this wiki: ${[...allowed.slugs].join(', ') || '(none)'}.

Reply ONLY with valid JSON (no markdown fences):
{"summary":"one or two sentences","sections":[{"heading":"...","claims":[{"text":"...","sourcePaths":["src/x.ts"]}]}],"related":[]}`

  const user = `Page: ${plan.title} (${plan.archetype})

Files:

${serializePack(pack)}`

  const content = await chatCompleteJson<{
    summary: string
    sections: WikiPage['sections']
    related: string[]
  }>(
    cfg,
    [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    'wikiPage',
    {
      name: 'wiki_page',
      schema: WIKI_PAGE_SCHEMA,
      validate: (v) => validateWikiPage(v, allowed)
    },
    0.3
  )

  const page: WikiPage = {
    slug: plan.slug,
    title: plan.title,
    archetype: plan.archetype,
    summary: content.summary.trim(),
    sections: content.sections ?? [],
    related: content.related ?? [],
    markdown: ''
  }
  return { ...page, markdown: renderWikiPage(page) }
}

/**
 * What the repo is made of, counted rather than guessed: language shares by
 * bytes and the dependencies its manifests declare.
 */
async function repoFacts(repoPath: string, files: string[]): Promise<RepoFacts> {
  const sizes = await gitService.fileSizes(repoPath, files).catch(() => ({}) as Record<string, { size: number; binary: boolean }>)
  const sized = files
    .filter((path) => !sizes[path]?.binary)
    .map((path) => ({ path, size: sizes[path]?.size ?? 0 }))
  const languages = languageBreakdown(sized)

  const manifests = findManifests(files)
  const parsed = await Promise.all(
    manifests.map(async (path) => {
      const content = await gitService.fileContent(repoPath, path).catch(() => '')
      return parseManifest(path, content)
    })
  )
  // Same package declared by two manifests counts once.
  const byName = new Map<string, DependencyRef>()
  for (const dep of parsed.flat()) if (!byName.has(dep.name)) byName.set(dep.name, dep)

  return {
    languages,
    totalBytes: sized.reduce((sum, f) => sum + f.size, 0),
    manifests,
    dependencies: [...byName.values()]
  }
}

/**
 * Groups the declared dependencies into a readable stack. The names come from
 * the manifests — the model only decides where each belongs and what it is for,
 * and is rejected if it names something the project does not declare.
 */
async function describeStack(facts: RepoFacts, cfg: AIConfig): Promise<TechStack | null> {
  // Scaffolding out, sub-packages folded in: the model should be reasoning about
  // what this project is built on, not about ts-loader.
  const notable = meaningfulDependencies(facts.dependencies)
  if (notable.length === 0) return null
  const declared = new Set(notable.map((d) => d.name))
  const frameworks = detectFrameworks(notable)
  const list = notable
    .map((d) => `${d.name}${d.version ? ` ${d.version}` : ''}${d.dev ? ' (dev)' : ''}`)
    .join('\n')
  const languages = facts.languages
    .slice(0, 5)
    .map((l) => `${l.language} ${Math.round(l.share * 100)}%`)
    .join(', ')
  const detected = frameworks.map((f) => f.label).join(', ')

  const system = `You are explaining what a project is built on, to someone deciding whether they could work on it.

You get the languages it is written in and the dependencies it declares. Write the stack, not an inventory.

Rules:
- "summary": 2-3 sentences describing the ARCHITECTURE — what kind of application this is, what runs where, and which pieces carry the weight. Name frameworks, not packages. Say "a desktop app built with Electron, React in the renderer and a Go service for indexing", never "this project uses a mix of technologies".
- Group by architectural role: "Frontend", "Backend", "Desktop shell", "Data", "Testing", "Build". At most ${MAX_STACK_GROUPS} groups.
- Include only dependencies that tell someone something. Skip a package whose presence is implied by another (a React app obviously has react-dom), skip plugins and helpers. It is correct to leave most of the list out.
- "dep" must be copied EXACTLY from the list. Never invent one, never list one twice.
- "role" says what THIS project uses it for, in a few words. Not a description of the package in general — "renders the commit graph", not "a library for rendering".

Reply ONLY with valid JSON (no markdown fences):
{"summary":"…","groups":[{"name":"Frontend","items":[{"dep":"react","role":"renders the whole interface"}]}]}`

  const user = `Languages: ${languages || '(unknown)'}
${detected ? `Frameworks detected: ${detected}\n` : ''}
Declared dependencies:
${list}`

  try {
    return await chatCompleteJson<TechStack>(
      cfg,
      [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      'wikiStack',
      { name: 'tech_stack', schema: TECH_STACK_SCHEMA, validate: (v) => validateTechStack(v, declared) },
      0.2
    )
  } catch (err) {
    // The stack is a bonus on top of the pages; a bad reply just means no stack.
    if (!(err instanceof InvalidAIResponse)) throw err
    return null
  }
}

/** Source files worth parsing for imports, and small enough to be worth reading. */
const IMPORTABLE = /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|vue|svelte|py|go|rs|dart|rb|php|c|h|cc|cpp|cxx|hpp|hh|m|mm)$/i
const IMPORT_FILE_LIMIT = 1200
const IMPORT_MAX_FILE_BYTES = 400_000

/**
 * Which folder imports which, read from the source. Big repos are capped at the
 * largest slice we can read quickly; the graph says how much it left out.
 */
async function importGraph(repoPath: string, depth: number): Promise<ImportGraph> {
  const files = (await candidateFiles(repoPath)).filter((path) => IMPORTABLE.test(path))
  const sizes = await gitService
    .fileSizes(repoPath, files)
    .catch(() => ({}) as Record<string, { size: number; binary: boolean }>)
  const readable = files
    .filter((path) => !sizes[path]?.binary && (sizes[path]?.size ?? 0) <= IMPORT_MAX_FILE_BYTES)
    .slice(0, IMPORT_FILE_LIMIT)

  const contents = await Promise.all(
    readable.map(async (path) => ({ path, content: await gitService.fileContent(repoPath, path).catch(() => '') }))
  )
  return buildImportGraph(contents, { depth })
}

/** Runs `task` over `items`, `limit` at a time, preserving input order. */
async function pool<T, R>(items: T[], limit: number, task: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await task(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

async function generate(repoPath: string, cfg: AIConfig, wc: WebContents | null): Promise<RepoWiki> {
  const send = (progress: WikiProgress): void => {
    if (wc && !wc.isDestroyed()) wc.send('wiki:progress', { repoPath, progress })
  }

  try {
    send({ phase: 'planning' })
    const repoName = repoPath.split('/').pop() || repoPath
    const files = await candidateFiles(repoPath)
    if (files.length === 0) throw new Error('This repository has no tracked files to read.')

    const facts = await repoFacts(repoPath, files)
    const plan = await planWiki(repoPath, repoName, files, cfg)
    const slugs = new Set(plan.map((p) => p.slug))

    let done = 0
    const pages = await pool(plan, WORKERS, async (pagePlan) => {
      const page = await writePage(repoPath, pagePlan, slugs, cfg)
      done++
      send({ phase: 'page', slug: pagePlan.slug, title: pagePlan.title, done, total: plan.length })
      return page
    })

    const stack = await describeStack(facts, cfg)

    // Publish all at once: if any page threw, the previous wiki is still there.
    const wiki: RepoWiki = {
      headSha: await headSha(repoPath),
      generatedAt: Date.now(),
      model: cfg.model || '',
      promptVersion: WIKI_PROMPT_VERSION,
      pages,
      stack
    }
    const data = await load()
    data.repos[repoPath] = wiki
    await save(data)
    send({ phase: 'done' })
    return wiki
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    send({ phase: 'error', message })
    throw err
  }
}

export interface StoredWiki {
  wiki: RepoWiki | null
  freshness: WikiFreshness
  /** HEAD at the time of asking, so the UI can say how far behind the wiki is. */
  headSha: string
}

async function get(repoPath: string, model: string): Promise<StoredWiki> {
  const data = await load()
  const wiki = data.repos[repoPath] ?? null
  const head = await headSha(repoPath)
  return { wiki, freshness: wikiFreshness(wiki, { headSha: head, model }), headSha: head }
}

/**
 * Writes the stored wiki into the repo as Markdown, so it can be committed and
 * read on the host. Returns the paths written, relative to the repo.
 */
async function exportToRepo(repoPath: string): Promise<string[]> {
  const data = await load()
  const wiki = data.repos[repoPath]
  if (!wiki) throw new Error('There is no wiki for this repository yet.')

  const repoName = repoPath.split('/').pop() || repoPath
  const files = wikiExportFiles(wiki, repoName)
  for (const file of files) {
    // Slugs are validated kebab-case, but this writes into the user's repo —
    // check anyway rather than trust the shape of stored data.
    if (!isSafeRepoPath(file.path)) throw new Error(`Refusing to write ${file.path}`)
    const full = join(repoPath, file.path)
    await mkdir(dirname(full), { recursive: true })
    await writeFile(full, file.content, 'utf-8')
  }
  return files.map((f) => f.path)
}

async function clear(repoPath: string): Promise<void> {
  const data = await load()
  delete data.repos[repoPath]
  await save(data)
}

export function registerWikiHandlers(): void {
  ipcMain.handle('wiki:imports', (_e, repoPath: string, depth: number) => importGraph(repoPath, depth))
  ipcMain.handle('wiki:facts', async (_e, repoPath: string) => repoFacts(repoPath, await candidateFiles(repoPath)))
  ipcMain.handle('wiki:get', (_e, repoPath: string, model: string) => get(repoPath, model))
  ipcMain.handle('wiki:generate', (e, repoPath: string, cfg: AIConfig) => generate(repoPath, cfg, e.sender))
  ipcMain.handle('wiki:export', (_e, repoPath: string) => exportToRepo(repoPath))
  ipcMain.handle('wiki:clear', (_e, repoPath: string) => clear(repoPath))
}
