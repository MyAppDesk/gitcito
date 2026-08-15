import { useCallback, useEffect, useState } from 'react'
import { Activity, AlertTriangle, Boxes, CalendarClock, HardDrive, Loader2, Stethoscope, Zap } from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { repoActions } from '../stores/repo'
import type { FsckReport, MaintenanceStats } from '../../../shared/types'
import { useT, interp } from '../i18n'

/** Human-readable byte size. */
function fmtBytes(n: number): string {
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} KB`
  return `${n} B`
}

/**
 * What the repository costs on disk, and what maintenance would give back.
 *
 * Git never volunteers these numbers, so nobody runs gc until a clone crawls.
 * The panel's job is to make "1.4 GB of this is unreachable" a thing you can
 * read before deciding, rather than a thing you infer from a slow fetch.
 */
export function MaintenanceModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const openModal = useUIStore((s) => s.openModal)
  const [stats, setStats] = useState<MaintenanceStats | null>(null)
  const [busy, setBusy] = useState(false)
  const [fsck, setFsck] = useState<FsckReport | null>(null)
  // Size before the last run, so the panel can say what it actually reclaimed.
  const [reclaimed, setReclaimed] = useState<number | null>(null)

  const load = useCallback(async (): Promise<void> => {
    setStats(await gitApi.maintenanceStats(repoPath).catch(() => null))
  }, [repoPath])

  useEffect(() => {
    void load()
  }, [load])

  const run = (task: 'gc' | 'aggressive' | 'commitGraph' | 'prune'): void => {
    const before = stats?.gitBytes ?? 0
    setBusy(true)
    setReclaimed(null)
    void repoActions
      .maintenance(repoPath, task)
      .then(async (ok) => {
        await load()
        if (ok) {
          const after = await gitApi.maintenanceStats(repoPath).then((s) => s.gitBytes).catch(() => before)
          setReclaimed(Math.max(0, before - after))
        }
      })
      .finally(() => setBusy(false))
  }

  const prune = (): void =>
    openModal({
      kind: 'confirm',
      danger: true,
      title: t('maint.pruneTitle'),
      message: interp(t('maint.pruneMessage'), {
        n: String(stats?.prunable ?? 0),
        size: fmtBytes(stats?.prunableBytes ?? 0)
      }),
      confirmLabel: t('maint.pruneOk'),
      onConfirm: () => run('prune')
    })

  const check = (): void => {
    setBusy(true)
    void gitApi
      .fsck(repoPath)
      .then(setFsck)
      .finally(() => setBusy(false))
  }

  const schedule = (on: boolean): void => {
    setBusy(true)
    void repoActions
      .maintenanceSchedule(repoPath, on)
      .then(() => load())
      .finally(() => setBusy(false))
  }

  // The bar is the whole story in one line: how much of .git is packed, how much
  // is loose (uncompressed, one file each), how much is simply waste.
  const packed = stats?.packBytes ?? 0
  const loose = stats?.looseBytes ?? 0
  const waste = (stats?.garbageBytes ?? 0) + (stats?.prunableBytes ?? 0)
  const barTotal = Math.max(1, packed + loose + waste)
  const pct = (n: number): string => `${Math.max(n > 0 ? 1.5 : 0, (n / barTotal) * 100)}%`

  return (
    <div className="maint-modal">
      <h3>
        <HardDrive size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('maint.title')}
      </h3>
      <p className="settings-hint">{t('maint.intro')}</p>

      {!stats ? (
        <p className="settings-hint">{t('common.loading')}</p>
      ) : (
        <>
          <div className="maint-total">
            <strong>{fmtBytes(stats.gitBytes)}</strong>
            <span className="settings-hint">{t('maint.onDisk')}</span>
          </div>

          <div className="maint-bar" title={t('maint.barTitle')}>
            <span className="maint-seg packed" style={{ width: pct(packed) }} />
            <span className="maint-seg loose" style={{ width: pct(loose) }} />
            <span className="maint-seg waste" style={{ width: pct(waste) }} />
          </div>

          <div className="maint-rows">
            <div className="maint-row">
              <span className="maint-dot packed" />
              <span className="maint-label">{t('maint.packed')}</span>
              <span className="maint-count">
                {interp(t('maint.objects'), { n: String(stats.packedObjects), packs: String(stats.packs) })}
              </span>
              <span className="maint-size">{fmtBytes(stats.packBytes)}</span>
            </div>
            <div className="maint-row">
              <span className="maint-dot loose" />
              <span className="maint-label">{t('maint.loose')}</span>
              <span className="maint-count">
                {interp(t('maint.looseCount'), { n: String(stats.looseObjects), dup: String(stats.prunePackable) })}
              </span>
              <span className="maint-size">{fmtBytes(stats.looseBytes)}</span>
            </div>
            <div className="maint-row">
              <span className="maint-dot waste" />
              <span className="maint-label">{t('maint.unreachable')}</span>
              <span className="maint-count">
                {interp(t('maint.unreachableCount'), {
                  n: String(stats.prunable),
                  garbage: String(stats.garbageFiles)
                })}
              </span>
              <span className="maint-size">{fmtBytes(stats.prunableBytes + stats.garbageBytes)}</span>
            </div>
          </div>

          <p className="settings-hint">
            {stats.lastPack
              ? interp(t('maint.lastPack'), { when: new Date(stats.lastPack).toLocaleDateString() })
              : t('maint.neverPacked')}
          </p>

          {stats.gcLog.trim() && (
            <p className="maint-warn">
              <AlertTriangle size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
              {t('maint.gcLog')}
            </p>
          )}

          {reclaimed !== null && (
            <p className="maint-reclaimed">
              {reclaimed > 0
                ? interp(t('maint.reclaimed'), { size: fmtBytes(reclaimed) })
                : t('maint.reclaimedNothing')}
            </p>
          )}

          <div className="maint-actions">
            <button className="btn ghost small" disabled={busy} onClick={() => run('gc')}>
              {busy ? <Loader2 size={12} className="spin" /> : <Zap size={12} />} {t('maint.gc')}
            </button>
            <button className="btn ghost small" disabled={busy} onClick={() => run('aggressive')}>
              <Boxes size={12} /> {t('maint.aggressive')}
            </button>
            <button className="btn ghost small" disabled={busy} onClick={() => run('commitGraph')}>
              <Activity size={12} /> {t('maint.commitGraph')}
            </button>
            <button className="btn ghost small" disabled={busy} onClick={check}>
              <Stethoscope size={12} /> {t('maint.fsck')}
            </button>
            <button className="btn danger small" disabled={busy || !stats.prunable} onClick={prune}>
              {t('maint.prune')}
            </button>
          </div>
          <p className="settings-hint">{t('maint.gcHint')}</p>

          {fsck && (
            <div className={`maint-fsck ${fsck.missing ? 'bad' : ''}`}>
              <strong>
                {fsck.missing
                  ? interp(t('maint.fsckBad'), { n: String(fsck.missing) })
                  : interp(t('maint.fsckOk'), { n: String(fsck.dangling) })}
              </strong>
              {fsck.output && <pre>{fsck.output.slice(0, 2000)}</pre>}
            </div>
          )}

          <label className="clone-partial maint-schedule">
            <input
              type="checkbox"
              checked={stats.scheduled}
              disabled={busy}
              onChange={(e) => schedule(e.target.checked)}
            />
            <span>
              <CalendarClock size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />
              {t('maint.schedule')}
              <span className="modal-hint">{t('maint.scheduleHint')}</span>
            </span>
          </label>
        </>
      )}
    </div>
  )
}
