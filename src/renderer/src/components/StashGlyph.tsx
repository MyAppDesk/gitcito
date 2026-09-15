/**
 * The stash node in the commit graph: an archive box inside a dashed frame.
 *
 * The archive is the stash symbol everywhere else in the app (details header,
 * command palette, toolbar, sidebar), so the graph uses it too rather than
 * inventing a second vocabulary for the same thing. The dashed frame is what
 * separates it from a commit — a stash sits one row above its parent, so shape
 * alone has to carry "this is not part of the branch".
 *
 * Drawn as filled shapes rather than lucide's stroked paths: at 11-14px a
 * 1.5px-stroke 24px icon scales down to hairlines and turns to mush.
 */
export function StashGlyph({
  cx,
  cy,
  color,
  size,
  strokeWidth
}: {
  cx: number
  cy: number
  color: string
  /** Side of the outer frame, in px. */
  size: number
  strokeWidth: number
}): React.JSX.Element {
  // Every proportion is a fraction of `size` so compact and normal stay
  // recognisably the same glyph rather than drifting into two designs.
  const lidW = size * 0.58
  const bodyW = lidW * 0.84
  // The frame is deliberately lighter than the rails it sits among, and capped:
  // at the graph's `thick` line width a full-weight dash turns the corners into
  // blobs and the box stops reading as dotted at all.
  const frameW = Math.min(strokeWidth * 0.65, 1.5)
  return (
    <>
      {/* Opaque frame: the dashed tether runs behind the node and must not show through. */}
      <rect
        x={cx - size / 2}
        y={cy - size / 2}
        width={size}
        height={size}
        rx={size * 0.19}
        fill="var(--bg-1)"
        stroke={color}
        strokeWidth={frameW}
        strokeDasharray="1.6 1.6"
      />
      {/* lid */}
      <rect x={cx - lidW / 2} y={cy - size * 0.25} width={lidW} height={size * 0.19} rx={size * 0.06} fill={color} />
      {/* body */}
      <rect x={cx - bodyW / 2} y={cy - size * 0.02} width={bodyW} height={size * 0.32} rx={size * 0.08} fill={color} />
      {/* handle notch, knocked out of the body */}
      <rect
        x={cx - size * 0.093}
        y={cy + size * 0.086}
        width={size * 0.186}
        height={size * 0.071}
        rx={size * 0.036}
        fill="var(--bg-1)"
      />
    </>
  )
}
