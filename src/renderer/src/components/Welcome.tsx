import { motion } from 'framer-motion'
import { FolderGit2, History, Download } from 'lucide-react'
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'
import { useT } from '../i18n'
import gitcitoLaunch from '../assets/gitcito-launch.png'

export function Welcome(): React.JSX.Element {
  const { settings, openRepoTab } = useSettingsStore()
  const openModal = useUIStore((s) => s.openModal)
  const t = useT()

  const openRepo = async (): Promise<void> => {
    const path = await window.api.selectDirectory()
    if (path) openRepoTab({ path, name: path.split('/').pop() ?? path })
  }

  const cloneRepo = (): void => {
    openModal({ kind: 'clone', onClone: (repo) => openRepoTab(repo) })
  }

  return (
    <div className="welcome">
      <motion.div
        className="welcome-card"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      >
        <div className="welcome-logo">
          <img className="welcome-art" src={gitcitoLaunch} alt="" draggable={false} />
        </div>

        <motion.button className="btn ghost big" onClick={cloneRepo} whileTap={{ scale: 0.97 }}>
          <Download size={17} /> {t('welcome.cloneRepo')}
        </motion.button>
        <h1>Gitcito</h1>
        <p>{t('welcome.tagline')}</p>

        <motion.button className="btn primary big" onClick={() => void openRepo()} whileTap={{ scale: 0.97 }}>
          <FolderGit2 size={17} /> {t('welcome.openRepo')}
        </motion.button>

        {settings.recentRepos.length > 0 && (
          <div className="recent">
            <div className="recent-title">
              <History size={13} /> {t('welcome.recent')}
            </div>
            {settings.recentRepos.map((r, i) => (
              <motion.button
                key={r.path}
                className="recent-item"
                onClick={() => openRepoTab(r)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
              >
                <strong>{r.name}</strong>
                <span>{r.path}</span>
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
