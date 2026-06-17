import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'

const BG = 'radial-gradient(120% 120% at 50% 0%, #1a1c28 0%, #0e0f15 60%, #07080c 100%)'

export const ShotScene: React.FC<{
  src: string
  title: string
  subtitle: string
  accent: string
}> = ({ src, title, subtitle, accent }) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  // Slow Ken Burns zoom across the scene.
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.06])
  // Caption slides up + fades in early, fades out at the end.
  const inT = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 18 })
  const out = interpolate(frame, [durationInFrames - 14, durationInFrames], [1, 0], { extrapolateLeft: 'clamp' })
  const capY = interpolate(inT, [0, 1], [40, 0])

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            transform: `scale(${scale})`,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 40px 120px rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
            width: '78%',
            marginTop: -40
          }}
        >
          <Img src={staticFile(src)} style={{ width: '100%', display: 'block' }} />
        </div>
      </AbsoluteFill>

      {/* Scrim so captions stay readable over light-theme screenshots. */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(to top, rgba(7,8,12,0.92) 0%, rgba(7,8,12,0.7) 14%, rgba(7,8,12,0) 30%)',
          opacity: Math.min(inT, out)
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 70,
          textAlign: 'center',
          opacity: Math.min(inT, out),
          transform: `translateY(${capY}px)`
        }}
      >
        <div style={{ display: 'inline-block', height: 4, width: 56, background: accent, borderRadius: 4, marginBottom: 18 }} />
        <div style={{ color: '#fff', fontSize: 46, fontWeight: 800, letterSpacing: -0.5, textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>{title}</div>
        <div style={{ color: 'rgba(255,255,255,0.82)', fontSize: 24, fontWeight: 500, marginTop: 8, textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>{subtitle}</div>
      </div>
    </AbsoluteFill>
  )
}

export const TitleScene: React.FC<{ tagline: string; outro?: boolean }> = ({ tagline, outro }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const pop = spring({ frame, fps, config: { damping: 12, stiffness: 120 }, durationInFrames: 30 })
  const logoScale = interpolate(pop, [0, 1], [0.6, 1])
  const fade = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 })

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: 'system-ui, -apple-system, sans-serif', alignItems: 'center', justifyContent: 'center' }}>
      <Img src={staticFile('gitcito-mark.png')} style={{ width: 200, transform: `scale(${logoScale})`, marginBottom: 28 }} />
      <div style={{ color: '#fff', fontSize: 86, fontWeight: 800, opacity: fade, letterSpacing: -1.5 }}>Gitcito</div>
      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 30, fontWeight: 500, opacity: fade, marginTop: 6 }}>{tagline}</div>
      {outro && (
        <div style={{ color: '#8b5cf6', fontSize: 24, fontWeight: 700, opacity: fade, marginTop: 26 }}>
          Free · Open source · github.com/MyAppDesk/gitcito
        </div>
      )}
    </AbsoluteFill>
  )
}
