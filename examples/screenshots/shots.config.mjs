// Declarative screenshot manifest.
//
// Each entry describes ONE feature shot: which playground repo(s) to load, an
// optional `prepare` step that mutates the repo on disk before launch (e.g.
// start a merge so there are live conflicts), and a `drive` step that puts the
// running UI into the exact state to capture via the `__shot` store bridge.
//
// `themes` controls output: a single theme writes `<out>.png`; multiple themes
// write `<out>-<theme>.png` (matching the README's graph-light / graph-dark).
//
// Add a feature → add an entry here. `npm run screenshots <name>` regenerates
// just that one; `npm run screenshots` regenerates all.

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), 'assets')

/**
 * @typedef {Object} Shot
 * @property {string}   out      Output basename under docs/screenshots.
 * @property {string[]} repos    Playground repo dir names; first is active.
 * @property {'repo'|'group'} [kind]  Tab kind (default 'repo').
 * @property {boolean}  [groupLanding]  Show the group landing page (no active repo).
 * @property {('light'|'dark')[]} [themes]  Themes to emit (default ['dark']).
 * @property {(ctx: {repoPaths: Record<string,string>, run: Function}) => Promise<void>} [prepare]
 * @property {(page: import('playwright').Page, repoPaths: Record<string,string>) => Promise<void>} [drive]
 * @property {{name: string, durationMs: number, drive: Function}} [gif]  Optional motion clip.
 */

/** @type {Shot[]} */
export const shots = [
  {
    out: 'repo-groups',
    kind: 'group',
    repos: ['octopus-merge', 'merge-conflict', 'tags-and-releases', 'deep-history-monorepo'],
    groupLanding: true,
    themes: ['light'],
    recents: ['multi-remote', 'collaborators', 'reflog-recovery']
  },
  {
    out: 'graph',
    repos: ['octopus-merge'],
    themes: ['light', 'dark']
  },
  {
    out: 'conflict-resolver',
    repos: ['merge-conflict'],
    themes: ['light'],
    // The scenario leaves the repo on main; start the merge so conflicts exist.
    // Reset first so re-runs (which leave the repo mid-merge) stay idempotent.
    prepare: async ({ repoPaths, run }) => {
      const repo = repoPaths['merge-conflict']
      await run('git', ['-C', repo, 'merge', '--abort'], { allowFail: true })
      await run('git', ['-C', repo, 'checkout', '-f', 'main'], { allowFail: true })
      await run('git', ['-C', repo, 'merge', 'feature'], { allowFail: true })
    },
    drive: async (page, repoPaths) => {
      const repo = repoPaths['merge-conflict']
      await page.evaluate(async (repoPath) => {
        const s = window.__shot
        // Pick the first conflicted file and open the resolver on it.
        const data = s.repo.getState().repos[repoPath]
        const file = data?.status?.conflicted?.[0]?.path
        s.repo.getState().select(repoPath, { type: 'wip' })
        if (file) s.ui.getState().setConflictView({ repoPath, file })
      }, repo)
    }
  },
  {
    out: 'image-diff',
    // A throwaway repo with two commits of the same image, so the diff shows a
    // real before/after (the mascot illustrations in ./assets) instead of a
    // tiny generated swatch.
    repos: ['image-showcase'],
    themes: ['light'],
    prepare: async ({ repoPaths, run }) => {
      const repo = repoPaths['image-showcase']
      await run('rm', ['-rf', repo])
      await run('git', ['init', '-q', repo])
      await run('git', ['-C', repo, 'config', 'user.email', 'team@gitcito.dev'])
      await run('git', ['-C', repo, 'config', 'user.name', 'Gitcito'])
      await run('cp', [join(ASSETS, 'hero-before.png'), join(repo, 'mascot.png')])
      await run('git', ['-C', repo, 'add', '-A'])
      await run('git', ['-C', repo, 'commit', '-qm', 'feat: add mascot illustration'])
      await run('cp', [join(ASSETS, 'hero-after.png'), join(repo, 'mascot.png')])
      await run('git', ['-C', repo, 'add', '-A'])
      await run('git', ['-C', repo, 'commit', '-qm', 'design: summer-vibes mascot redesign'])
    },
    drive: async (page, repoPaths) => {
      const repo = repoPaths['image-showcase']
      await page.evaluate((repoPath) => {
        const s = window.__shot
        const head = s.repo.getState().repos[repoPath].commits[0] // the redesign commit
        s.ui.getState().setFileView({
          repoPath,
          file: 'mascot.png',
          source: { type: 'commit', hash: head.hash },
          mode: 'diff'
        })
      }, repo)
    }
  },
  {
    out: 'markdown-preview',
    repos: ['binary-images-unicode'],
    themes: ['light'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['binary-images-unicode']
      await page.evaluate(async (repoPath) => {
        const s = window.__shot
        const head = s.repo.getState().repos[repoPath]?.commits?.[0]
        s.ui.getState().setFileView({
          repoPath,
          file: 'README.md',
          source: { type: 'commit', hash: head.hash },
          mode: 'preview'
        })
      }, repo)
    }
  },
  {
    out: 'settings-ai',
    repos: ['octopus-merge'],
    themes: ['light'],
    drive: async (page) => {
      await page.evaluate(() => window.__shot.ui.getState().openModal({ kind: 'settings', page: 'ai' }))
    }
  },
  {
    out: 'settings-themes',
    repos: ['octopus-merge'],
    themes: ['light'],
    drive: async (page) => {
      await page.evaluate(() => window.__shot.ui.getState().openModal({ kind: 'settings', page: 'themes' }))
    }
  },

  // ── Features added since v0.12 ──────────────────────────────────────────────
  {
    // Signature column + verified/unverified/unsigned badges in the graph.
    out: 'signed-commits',
    repos: ['signed-commits'],
    themes: ['light', 'dark']
  },
  {
    // Reflog recovery modal — checkout / branch / reset from any past HEAD move.
    out: 'reflog',
    repos: ['reflog-recovery'],
    themes: ['dark'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['reflog-recovery']
      await page.evaluate((p) => window.__shot.ui.getState().openModal({ kind: 'reflog', repoPath: p }), repo)
      await page.waitForTimeout(700)
    }
  },
  {
    // Guided git bisect.
    out: 'bisect',
    repos: ['bisect-bug'],
    themes: ['dark'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['bisect-bug']
      await page.evaluate((p) => window.__shot.ui.getState().openModal({ kind: 'bisect', repoPath: p }), repo)
      await page.waitForTimeout(500)
    }
  },
  {
    // Git hooks manager (active / disabled / sample + framework banner).
    out: 'hooks',
    repos: ['hooks'],
    themes: ['dark'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['hooks']
      await page.evaluate((p) => window.__shot.ui.getState().openModal({ kind: 'hooks', repoPath: p }), repo)
      await page.waitForTimeout(700)
    }
  },
  {
    // Git LFS manager — tracked patterns + LFS files.
    out: 'lfs',
    repos: ['lfs-assets'],
    themes: ['dark'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['lfs-assets']
      await page.evaluate((p) => window.__shot.ui.getState().openModal({ kind: 'lfs', repoPath: p }), repo)
      await page.waitForTimeout(800)
    }
  },
  {
    // Cone-mode sparse-checkout editor.
    out: 'sparse-checkout',
    repos: ['deep-history-monorepo'],
    themes: ['dark'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['deep-history-monorepo']
      await page.evaluate((p) => window.__shot.ui.getState().openModal({ kind: 'sparse', repoPath: p }), repo)
      await page.waitForTimeout(700)
    }
  },
  {
    // Create-PR form, prefilled from a branch's commits.
    out: 'create-pr',
    repos: ['pr-ready-branch'],
    themes: ['dark'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['pr-ready-branch']
      await page.evaluate((p) => {
        const s = window.__shot
        const r = s.repo.getState().repos[p]
        const origin = r.remotes.find((x) => x.name === 'origin') ?? r.remotes[0]
        s.ui.getState().openModal({
          kind: 'create-pr',
          repoPath: p,
          remoteUrl: origin && origin.url,
          source: 'feat/awesome-feature',
          target: 'main',
          defaultTitle: 'feat: add awesome feature',
          defaultBody: '- add awesome() helper\n- wire awesome() into app\n- document awesome feature'
        })
      }, repo)
      await page.waitForTimeout(500)
    }
  },
  {
    // .gitignore chooser — pattern type × which .gitignore.
    out: 'gitignore-chooser',
    repos: ['gitignore-untrack'],
    themes: ['dark'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['gitignore-untrack']
      await page.evaluate(
        (p) =>
          window.__shot.ui
            .getState()
            .openModal({ kind: 'ignore', repoPath: p, targetPath: 'build/bundle.js', isFolder: false }),
        repo
      )
      await page.waitForTimeout(300)
    }
  },
  {
    // Commit composer prefilled from commit.template (.gitmessage).
    out: 'commit-template',
    repos: ['commit-template'],
    themes: ['dark'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['commit-template']
      await page.evaluate((p) => window.__shot.repo.getState().select(p, { type: 'wip' }), repo)
      await page.waitForTimeout(500)
    }
  },
  {
    // Integrated terminal — a real PTY (xterm + node-pty) docked under the repo.
    out: 'terminal',
    repos: ['deep-history-monorepo'],
    themes: ['dark'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['deep-history-monorepo']
      await page.evaluate((p) => window.__shot.repo.getState().select(p, { type: 'wip' }), repo)
      await page.waitForTimeout(300)
      // Open the terminal pane (the flag only toggles, so guard it).
      await page.evaluate(() => {
        const ui = window.__shot.ui.getState()
        if (!ui.terminalOpen) ui.toggleTerminal()
      })
      await page.waitForTimeout(1200)
      // Type a command so the shot shows real output, not a bare prompt.
      await page.click('.xterm').catch(() => {})
      await page.keyboard.type('git log --oneline -8')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(900)
    }
  },
  {
    // Files tab — the working-tree project browser (FolderTree) beside a preview.
    out: 'file-tree',
    repos: ['project-tree'],
    themes: ['light'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['project-tree']
      // Switch the sidebar to its Files tab (local state → click the tab button).
      await page.click('.sb-tabs .sb-tab:nth-child(2)').catch(() => {})
      await page.waitForTimeout(300)
      // Open a source file in the preview pane so the right side isn't empty.
      await page.evaluate((p) => {
        window.__shot.ui.getState().setFileView({
          repoPath: p,
          file: 'src/app.ts',
          source: { type: 'tree' },
          mode: 'file'
        })
      }, repo)
      await page.waitForTimeout(500)
    }
  },
  {
    // Interactive rebase — drag to reorder, squash, fixup, reword or drop.
    out: 'interactive-rebase',
    repos: ['interactive-rebase'],
    themes: ['dark'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['interactive-rebase']
      await page.evaluate(
        (p) =>
          window.__shot.ui.getState().openModal({
            kind: 'interactive-rebase',
            repoPath: p,
            base: 'main',
            baseSubject: 'initial commit'
          }),
        repo
      )
      await page.waitForTimeout(800)
    }
  }
]

// ── Animated clips (GIF) ──────────────────────────────────────────────────────
// Captured by sampling screenshots at a steady fps, so GIF playback stays
// proportional to real time. Each clip loads a repo then runs `drive(page)`;
// `durationMs` is the total clip length (drive + hold on the final frame).
/** @type {Shot[]} */
export const clips = [
  {
    out: 'clip-commit-details',
    repos: ['octopus-merge'],
    themes: ['light'],
    gif: {
      durationMs: 4200,
      drive: async (page, repoPaths) => {
        const repo = repoPaths['octopus-merge']
        // Walk down a few commits so the details panel animates in and updates.
        const hashes = await page.evaluate(
          (p) => window.__shot.repo.getState().repos[p].commits.slice(0, 5).map((c) => c.hash),
          repo
        )
        for (const hash of hashes) {
          await page.evaluate(
            ({ p, hash }) => window.__shot.repo.getState().select(p, { type: 'commit', hash }),
            { p: repo, hash }
          )
          await page.waitForTimeout(700)
        }
      }
    }
  },
  {
    out: 'clip-themes',
    repos: ['octopus-merge'],
    themes: ['light'],
    gif: {
      durationMs: 5000,
      // Start on Gitcito light, swap to Nord dark, then back — shows both the
      // light/dark switch and a different built-in theme in one clip.
      drive: async (page) => {
        const steps = [
          { appThemeId: 'gitcito', codeThemeId: 'gitcito', themeMode: 'light' },
          { appThemeId: 'nord', codeThemeId: 'nord', themeMode: 'dark' },
          { appThemeId: 'gitcito', codeThemeId: 'gitcito', themeMode: 'light' }
        ]
        for (const patch of steps) {
          await page.evaluate(
            (p) => window.__shot.settings.getState().update((s) => ({ ...s, ...p })),
            patch
          )
          await page.waitForTimeout(1300)
        }
      }
    }
  }
]
