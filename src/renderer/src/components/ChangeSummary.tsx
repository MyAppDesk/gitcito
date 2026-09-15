import { ChevronRight } from 'lucide-react'
import { SAMPLE_STATUS, fileStats, summaryChips } from '../lib/fileStats'
import { interp, useT } from '../i18n'
import { statusClass, statusLabel } from './FileListView'

/** The change breakdown above a file list.
 *  Same status tiles the rows use (M / + / − / → / !), a mono count, and a
 *  git-stat bar for the mix — so the header and the tree speak one language. */
export function ChangeSummary({ files, title }: { files: { status: string }[]; title?: string }): React.JSX.Element {
  const t = useT()
  const chips = summaryChips(fileStats(files))
  const spoken = chips.map((c) => interp(t(c.labelKey), { n: c.n })).join(', ')
  const label = [title, spoken].filter(Boolean).join('. ')
  return (
    <span className="change-summary" title={label || undefined} aria-label={label || undefined}>
      {chips.length > 0 && (
        <span className="change-summary-bar" aria-hidden="true">
          {chips.map((c) => (
            <span
              key={c.bucket}
              className={`change-summary-seg ${statusClass(SAMPLE_STATUS[c.bucket])}`}
              style={{ flexGrow: c.n }}
            />
          ))}
        </span>
      )}
      {chips.map((c) => {
        const status = SAMPLE_STATUS[c.bucket]
        const spokenChip = interp(t(c.labelKey), { n: c.n })
        return (
          <span key={c.bucket} className="change-chip" title={spokenChip}>
            <span className={`file-status ${statusClass(status)}`} aria-hidden="true">
              {status === 'R' ? <ChevronRight size={12} strokeWidth={3} /> : statusLabel(status)}
            </span>
            <span className="change-chip-n">{c.n}</span>
          </span>
        )
      })}
    </span>
  )
}
