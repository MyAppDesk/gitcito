import { TransitionSeries, linearTiming } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { ShotScene, TitleScene } from './Scene'

const TITLE = 75
const SHOT = 90
const XFADE = 20

export const SCENES = [
  { src: 'screenshots/graph-light.png', title: 'A commit graph done right', subtitle: 'Branches, merges & octopus merges, drawn properly', accent: '#6366f1' },
  { src: 'screenshots/conflict-resolver.png', title: 'Resolve conflicts visually', subtitle: 'Ours / theirs / per-line, with a live output pane', accent: '#ef4444' },
  { src: 'screenshots/settings-ai.png', title: 'AI commit messages', subtitle: 'Generate summaries & bodies from your staged diff', accent: '#10b981' },
  { src: 'screenshots/image-diff.png', title: 'See image changes', subtitle: 'Side-by-side & swipe comparison for binary diffs', accent: '#f59e0b' },
  { src: 'screenshots/markdown-preview.png', title: 'Preview anything', subtitle: 'Markdown, Word docs & syntax-highlighted code', accent: '#ec4899' },
  { src: 'screenshots/repo-groups.png', title: 'Group your repos', subtitle: 'Bundle related repositories into named groups & tabs', accent: '#8b5cf6' }
]

// Total = sum(sequences) − sum(transitions), since transitions overlap.
export const PROMO_DURATION = TITLE + SCENES.length * SHOT + TITLE - (SCENES.length + 1) * XFADE

const transition = (key: string): React.ReactElement => (
  <TransitionSeries.Transition key={key} timing={linearTiming({ durationInFrames: XFADE })} presentation={fade()} />
)

export const Promo: React.FC = () => {
  const children: React.ReactElement[] = [
    <TransitionSeries.Sequence key="title" durationInFrames={TITLE}>
      <TitleScene tagline="A lightweight Git client" />
    </TransitionSeries.Sequence>
  ]
  SCENES.forEach((s, i) => {
    children.push(transition(`tr-${i}`))
    children.push(
      <TransitionSeries.Sequence key={s.src} durationInFrames={SHOT}>
        <ShotScene {...s} />
      </TransitionSeries.Sequence>
    )
  })
  children.push(transition('tr-out'))
  children.push(
    <TransitionSeries.Sequence key="outro" durationInFrames={TITLE}>
      <TitleScene tagline="Works on my machine." outro />
    </TransitionSeries.Sequence>
  )
  return <TransitionSeries>{children}</TransitionSeries>
}
