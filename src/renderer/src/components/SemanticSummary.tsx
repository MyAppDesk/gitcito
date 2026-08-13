import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Braces,
  ChevronDown,
  ChevronRight,
  Minus,
  MoveVertical,
  PenLine,
  Plus,
  Signature,
  Tags
} from 'lucide-react'
import type { BlobSpec, SemanticChange, SemanticDiff } from '../../../shared/types'
import { gitApi } from '../infrastructure/api'
import { revealLine } from '../lib/reveal'
import { useT, interp } from '../i18n'

const ICON: Record<SemanticChange['kind'], typeof Plus> = {
  renamed: Tags,
  signature: Signature,
  added: Plus,
  removed: Minus,
  changed: PenLine,
  moved: MoveVertical
}

/**
 * The structural summary above a file diff: what tree-sitter says actually
 * happened (renames, signature changes, moves) rather than which lines moved.
 * Renders nothing at all when the file's language has no grammar, so the plain
 * line diff stays exactly as it was.
 */
export function SemanticSummary({
  repoPath,
  file,
  oldSide,
  newSide
}: {
  repoPath: string
  file: string
  oldSide: BlobSpec
  newSide: BlobSpec
}): React.JSX.Element | null {
  const [result, setResult] = useState<SemanticDiff | null>(null)
  const [open, setOpen] = useState(false)
  const t = useT()

  const oldKey = JSON.stringify(oldSide)
  const newKey = JSON.stringify(newSide)
  useEffect(() => {
    let cancelled = false
    setResult(null)
    gitApi
      .semanticDiff(repoPath, file, oldSide, newSide)
      .then((r) => !cancelled && setResult(r))
      .catch(() => !cancelled && setResult(null))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPath, file, oldKey, newKey])

  if (!result?.language || result.changes.length === 0) return null

  const label = (c: SemanticChange): React.JSX.Element => {
    if (c.kind === 'renamed') {
      return (
        <>
          <code className="sem-old">{c.oldName}</code>
          <ArrowRight size={11} className="sem-arrow" />
          <code className="sem-new">{c.symbol}</code>
          {c.newSignature && <code className="sem-sig">{c.newSignature}</code>}
        </>
      )
    }
    if (c.kind === 'signature') {
      return (
        <>
          <code className="sem-new">{c.symbol}</code>
          <code className="sem-old">{c.oldSignature || '()'}</code>
          <ArrowRight size={11} className="sem-arrow" />
          <code className="sem-sig">{c.newSignature || '()'}</code>
        </>
      )
    }
    return <code className="sem-new">{c.symbol}</code>
  }

  /** The trailing note: rename call-site count, or how far a symbol moved. */
  const note = (c: SemanticChange): string | null => {
    if (c.kind === 'renamed' && c.detail) return interp(t('sem.sites'), { n: c.detail })
    if (c.kind === 'moved' && c.detail) return interp(t('sem.movedBy'), { n: c.detail })
    if ((c.kind === 'renamed' || c.kind === 'signature') && c.bodyChanged) return t('sem.bodyToo')
    return null
  }

  return (
    <div className="sem-root">
      <div className="sem-head" onClick={() => setOpen((o) => !o)}>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Braces size={12} className="sem-head-icon" />
        <span className="sem-title">{t('sem.title')}</span>
        <span className="sem-count">{result.changes.length}</span>
        <span className="sem-lang">{result.language}</span>
      </div>
      {open && (
        <div className="sem-list">
          {result.changes.map((c, i) => {
            const Icon = ICON[c.kind]
            const n = note(c)
            return (
              <div
                key={`${c.kind}:${c.symbol}:${i}`}
                className={`sem-row ${c.kind}`}
                title={c.line ? interp(t('sem.jump'), { n: String(c.line) }) : undefined}
                onClick={() => c.line && revealLine(c.line)}
              >
                <Icon size={12} className={`sem-icon ${c.kind}`} />
                <span className={`sem-kind ${c.kind}`}>{t(`sem.kind.${c.kind}` as 'sem.kind.added')}</span>
                <span className="sem-body">{label(c)}</span>
                <span className="sem-symkind">{c.symbolKind}</span>
                {n && <span className="sem-note">{n}</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
