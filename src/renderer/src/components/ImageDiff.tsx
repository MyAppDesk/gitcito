import { useRef, useState } from 'react'
import { Columns2, MoveHorizontal } from 'lucide-react'

interface ImageDiffProps {
  before: string | null
  after: string | null
}

export function ImageDiff({ before, after }: ImageDiffProps): React.JSX.Element {
  const [view, setView] = useState<'side' | 'slider'>('side')
  const [pos, setPos] = useState(50)
  const wrapRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  if (!before && !after) return <div className="diff-empty">Image unavailable</div>

  // Only one side present → file was added or removed.
  if (!before || !after) {
    const single = (after ?? before) as string
    return (
      <div className="image-diff">
        <div className={`imgd-badge ${after ? 'added' : 'removed'}`}>{after ? 'Added' : 'Removed'}</div>
        <div className="image-preview checker">
          <img src={single} alt="" draggable={false} />
        </div>
      </div>
    )
  }

  const move = (clientX: number): void => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPos(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)))
  }

  return (
    <div className="image-diff">
      <div className="imgd-toolbar">
        <button className={`imgd-tab ${view === 'side' ? 'active' : ''}`} onClick={() => setView('side')}>
          <Columns2 size={14} /> Side by side
        </button>
        <button className={`imgd-tab ${view === 'slider' ? 'active' : ''}`} onClick={() => setView('slider')}>
          <MoveHorizontal size={14} /> Slider
        </button>
      </div>

      {view === 'side' ? (
        <div className="imgd-side">
          <figure>
            <figcaption className="removed">Before</figcaption>
            <div className="image-preview checker">
              <img src={before} alt="before" draggable={false} />
            </div>
          </figure>
          <figure>
            <figcaption className="added">After</figcaption>
            <div className="image-preview checker">
              <img src={after} alt="after" draggable={false} />
            </div>
          </figure>
        </div>
      ) : (
        <div
          className="imgd-slider checker"
          ref={wrapRef}
          onPointerDown={(e) => {
            dragging.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
            move(e.clientX)
          }}
          onPointerMove={(e) => dragging.current && move(e.clientX)}
          onPointerUp={(e) => {
            dragging.current = false
            e.currentTarget.releasePointerCapture(e.pointerId)
          }}
        >
          <img className="imgd-base" src={after} alt="after" draggable={false} />
          <img
            className="imgd-overlay"
            src={before}
            alt="before"
            draggable={false}
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          />
          <div className="imgd-divider" style={{ left: `${pos}%` }}>
            <span className="imgd-knob">
              <MoveHorizontal size={14} />
            </span>
          </div>
          <span className="imgd-tag removed" style={{ opacity: pos > 14 ? 1 : 0 }}>
            Before
          </span>
          <span className="imgd-tag added right" style={{ opacity: pos < 86 ? 1 : 0 }}>
            After
          </span>
        </div>
      )}
    </div>
  )
}
