import { useMemo, useState } from 'react'
import { layoutLayeredGraph, layoutPageGraph } from '../lib/wikiGraph'
import { interp, useT } from '../i18n'
import { commonPrefix, layerNodes, shortLabel } from '../../../shared/importGraph'
import { detectFrameworks, meaningfulDependencies } from '../../../shared/repoFacts'
import type { ImportGraph, LanguageStat, RepoFacts, TechStack, WikiPage } from '../../../shared/types'

// The counted half of the wiki: what the repo is written in, what it depends on
// and how its pages relate. Only the grouping of the stack comes from a model —
// the numbers and the package names are read off the repo itself.

const LANG_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#64748b'
]

function share(stat: LanguageStat): string {
  const pct = stat.share * 100
  return pct >= 1 ? `${Math.round(pct)}%` : '<1%'
}

/** Stacked bar of language shares, with a legend under it. */
export function LanguageBar({ languages }: { languages: LanguageStat[] }): React.JSX.Element | null {
  const t = useT()
  if (languages.length === 0) return null
  return (
    <section className="wiki-facts-block">
      <h3>{t('wiki.languages')}</h3>
      <div className="wiki-langbar">
        {languages.map((l, i) => (
          <span
            key={l.language}
            className="wiki-langbar-slice"
            style={{ width: `${Math.max(l.share * 100, 0.5)}%`, background: LANG_COLORS[i % LANG_COLORS.length] }}
            title={`${l.language} — ${share(l)} (${l.files} files)`}
          />
        ))}
      </div>
      <div className="wiki-lang-legend">
        {languages.map((l, i) => (
          <span key={l.language} className="wiki-lang-item">
            <span className="wiki-lang-dot" style={{ background: LANG_COLORS[i % LANG_COLORS.length] }} />
            {l.language} <span className="wiki-lang-share">{share(l)}</span>
          </span>
        ))}
      </div>
    </section>
  )
}

/** Dependencies as the manifests declare them, grouped by the model. */
export function StackList({ stack, facts }: { stack: TechStack | null; facts: RepoFacts }): React.JSX.Element | null {
  const t = useT()
  const versions = useMemo(() => new Map(facts.dependencies.map((d) => [d.name, d.version])), [facts.dependencies])
  const frameworks = useMemo(
    () => detectFrameworks(meaningfulDependencies(facts.dependencies)),
    [facts.dependencies]
  )
  if (!stack && frameworks.length === 0) return null

  return (
    <section className="wiki-facts-block">
      <h3>{t('wiki.stack')}</h3>
      {frameworks.length > 0 && (
        <div className="wiki-fw-row">
          {frameworks.map((fw) => (
            <span key={fw.label} className={`wiki-fw ${fw.kind}`} title={fw.dep}>
              <span className="wiki-fw-badge">{fw.badge}</span>
              {fw.label}
            </span>
          ))}
        </div>
      )}
      {stack && <p className="wiki-stack-summary">{stack.summary}</p>}
      {stack && (
        <div className="wiki-stack-groups">
          {stack.groups.map((group) => (
            <div key={group.name} className="wiki-stack-group">
              <h4>{group.name}</h4>
              {group.items.map((item) => (
                <div key={item.dep} className="wiki-stack-item">
                  <span className="wiki-stack-head">
                    <code>{item.dep}</code>
                    {versions.get(item.dep) && <span className="wiki-stack-version">{versions.get(item.dep)}</span>}
                  </span>
                  <span className="wiki-stack-role">{item.role}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/**
 * Which folder imports which, laid out in layers: what nothing depends on at
 * the top, the foundations everything leans on at the bottom. Read from the
 * source, so it shows what the code does rather than what anyone says it does.
 */
export function ImportMap({ graph }: { graph: ImportGraph }): React.JSX.Element | null {
  const t = useT()
  const [focus, setFocus] = useState<string | null>(null)

  const layout = useMemo(() => {
    const prefix = commonPrefix(graph.nodes.map((n) => n.id))
    const layers = layerNodes(graph.nodes, graph.edges)
    return layoutLayeredGraph(
      graph.nodes.map((n) => ({
        id: n.id,
        label: shortLabel(n.id, prefix),
        layer: layers.get(n.id) ?? 0,
        files: n.files,
        in: n.in,
        out: n.out
      })),
      graph.edges
    )
  }, [graph])

  if (graph.nodes.length < 2) return null

  const maxCount = Math.max(...graph.edges.map((e) => e.count), 1)
  const related = (id: string): boolean =>
    focus === null || focus === id || graph.edges.some((e) => (e.from === focus && e.to === id) || (e.to === focus && e.from === id))

  return (
    <section className="wiki-facts-block">
      <h3>{t('wiki.imports')}</h3>
      <p className="settings-hint wiki-imports-hint">
        {interp(t('wiki.importsHint'), { resolved: graph.resolved, external: graph.external })}
        {graph.omittedEdges > 0 && ` ${interp(t('wiki.importsOmitted'), { n: graph.omittedEdges })}`}
      </p>
      <div className="wiki-map-scroll">
        <svg
          className="wiki-layer-map"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          style={{ height: layout.height }}
          role="img"
          aria-label={t('wiki.imports')}
        >
          <defs>
            <marker id="wiki-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" className="wiki-arc-head" />
            </marker>
          </defs>
          {layout.edges.map((e) => (
            <path
              key={`${e.from}->${e.to}`}
              d={e.path}
              className={`wiki-arc ${focus !== null && focus !== e.from && focus !== e.to ? 'dim' : ''}`}
              style={{ strokeWidth: 1 + (e.count / maxCount) * 3.5 }}
              markerEnd="url(#wiki-arrow)"
            >
              <title>{`${e.from} → ${e.to} · ${e.count} imports`}</title>
            </path>
          ))}
          {layout.nodes.map((n) => (
            <g
              key={n.id}
              className={`wiki-layer-node ${focus === n.id ? 'active' : ''} ${related(n.id) ? '' : 'dim'}`}
              onMouseEnter={() => setFocus(n.id)}
              onMouseLeave={() => setFocus(null)}
            >
              <rect
                x={n.x - n.halfWidth}
                y={n.y - 13}
                width={n.halfWidth * 2}
                height={26}
                rx={13}
              />
              <text x={n.x} y={n.y + 4} textAnchor="middle">
                {n.label}
              </text>
              <title>{`${n.id} · ${n.files} files · imports ${n.out} · imported ${n.in}`}</title>
            </g>
          ))}
        </svg>
      </div>
    </section>
  )
}

/** The wiki's pages as a map: overview in the middle, links as lines. */
export function PageMap({
  pages,
  activeSlug,
  onSelect
}: {
  pages: WikiPage[]
  activeSlug: string | null
  onSelect: (slug: string) => void
}): React.JSX.Element | null {
  const t = useT()
  const [hover, setHover] = useState<string | null>(null)
  const layout = useMemo(() => layoutPageGraph(pages), [pages])
  const sourceCount = useMemo(() => {
    const counts = new Map<string, number>()
    for (const page of pages) {
      const paths = new Set<string>()
      for (const section of page.sections) for (const claim of section.claims) for (const p of claim.sourcePaths) paths.add(p)
      counts.set(page.slug, paths.size)
    }
    return counts
  }, [pages])
  if (pages.length < 2) return null

  const focus = hover ?? activeSlug
  const linked = (slug: string): boolean =>
    focus === null ||
    focus === slug ||
    layout.edges.some((e) => (e.from === focus && e.to === slug) || (e.to === focus && e.from === slug))

  return (
    <section className="wiki-facts-block">
      <h3>{t('wiki.map')}</h3>
      <svg
        className="wiki-map"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label={t('wiki.map')}
      >
        {layout.edges.map((e) => (
          <line
            key={`${e.from}-${e.to}`}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            className={`wiki-map-edge ${focus && focus !== e.from && focus !== e.to ? 'dim' : ''}`}
          />
        ))}
        {layout.nodes.map((n) => {
          // Bigger bubble = the page rests on more files.
          const sources = sourceCount.get(n.slug) ?? 0
          const radius = (n.archetype === 'overview' ? 24 : 17) + Math.min(8, sources)
          return (
            <g
              key={n.slug}
              className={`wiki-map-node kind-${n.archetype} ${n.slug === activeSlug ? 'active' : ''} ${linked(n.slug) ? '' : 'dim'}`}
              onClick={() => onSelect(n.slug)}
              onMouseEnter={() => setHover(n.slug)}
              onMouseLeave={() => setHover(null)}
            >
              <circle cx={n.x} cy={n.y} r={radius} />
              <text className="wiki-map-glyph" x={n.x} y={n.y + 5} textAnchor="middle">
                {n.archetype === 'overview' ? '◎' : n.archetype === 'workflow' ? '⇄' : n.archetype === 'reference' ? '≡' : '▢'}
              </text>
              <text x={n.x} y={n.y + radius + 15} textAnchor="middle">
                {n.label}
              </text>
              <title>{`${n.label} · ${sources} source file(s)`}</title>
            </g>
          )
        })}
      </svg>
    </section>
  )
}
