// Declarative screenshot manifest.
//
// Each entry describes ONE feature shot: which playground repo(s) to load, an
// optional `prepare` step that mutates the repo on disk before launch (e.g.
// start a merge so there are live conflicts), and a `drive` step that puts the
// running UI into the exact state to capture via the `__shot` store bridge.
//
// `themes` controls output: a single theme writes `<out>.webp`; multiple themes
// write `<out>-<theme>.webp` (matching the README's graph-light / graph-dark).
//
// Add a feature → add an entry here. `npm run screenshots <name>` regenerates
// just that one; `npm run screenshots` regenerates all.

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFile } from 'node:fs/promises'

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), 'assets')

/**
 * Expand sidebar sections by their title (as rendered: 'WORKTREES').
 *
 * Every section renders the same `.sb-section` / `.sb-header` markup and keeps
 * `open` in local component state, so there is nothing to set through the store
 * and no per-section selector to aim at — the visible title is the only thing
 * that tells them apart. A single click is right because each shot launches
 * with a fresh userData dir, so these sections are always at their collapsed
 * default.
 */
async function openSections(page, titles) {
  await page.evaluate((wanted) => {
    for (const header of document.querySelectorAll('.sb-header')) {
      const title = header.querySelector('.sb-title')?.textContent?.trim()
      if (title && wanted.includes(title)) header.click()
    }
  }, titles)
}

/**
 * @typedef {Object} Shot
 * @property {string}   out      Output basename under docs/screenshots.
 * @property {string[]} repos    Playground repo dir names; first is active.
 * @property {'repo'|'group'} [kind]  Tab kind (default 'repo').
 * @property {boolean}  [groupLanding]  Show the group landing page (no active repo).
 * @property {('light'|'dark')[]} [themes]  Themes to emit (default ['dark']).
 * @property {boolean} [keychain]  Grant keychain consent for this shot. Only for
 *   shots that need a readable vault — granting makes macOS raise its own
 *   dialog, which Playwright cannot dismiss. Everything else runs declined.
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
  {
    // Settings → Themes → Graph tab: lane palette, line corners, density,
    // thickness, with the live mini-graph preview.
    out: 'settings-graph',
    repos: ['octopus-merge'],
    themes: ['dark'],
    drive: async (page) => {
      await page.evaluate(() => window.__shot.ui.getState().openModal({ kind: 'settings', page: 'themes' }))
      await page.waitForTimeout(300)
      await page.click('.theme-tabs .theme-tab:nth-child(2)').catch(() => {})
      await page.waitForTimeout(400)
    }
  },

  {
    // Settings → Shortcuts tab (rebindable shortcut editor).
    out: 'settings-shortcuts',
    repos: ['octopus-merge'],
    themes: ['light'],
    drive: async (page) => {
      await page.evaluate(() => window.__shot.ui.getState().openModal({ kind: 'settings', page: 'shortcuts' }))
      await page.waitForTimeout(400)
    }
  },
  {
    // Settings → Security tab (mask secrets, large-file guard, vault entry).
    out: 'settings-security',
    repos: ['octopus-merge'],
    themes: ['light'],
    drive: async (page) => {
      await page.evaluate(() => window.__shot.ui.getState().openModal({ kind: 'settings', page: 'security' }))
      await page.waitForTimeout(400)
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
    themes: ['light'],
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
    themes: ['light'],
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
    themes: ['light'],
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
    themes: ['light'],
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
    themes: ['light'],
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
    themes: ['light'],
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
    themes: ['light'],
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
    themes: ['light'],
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
    appTheme: 'midnight',
    drive: async (page, repoPaths) => {
      const repo = repoPaths['deep-history-monorepo']
      await page.evaluate((p) => window.__shot.repo.getState().select(p, { type: 'wip' }), repo)
      await page.waitForTimeout(300)
      // Open the terminal pane for this repo (per-repo flag; toggles, so guard).
      await page.evaluate((p) => {
        const ui = window.__shot.ui.getState()
        if (!ui.terminalOpenByRepo[p]) ui.toggleTerminal(p)
      }, repo)
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
    appTheme: 'solarized',
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
  },
  {
    // Command palette (⌘K) — fuzzy jump to branches / commits / files / actions.
    out: 'command-palette',
    repos: ['command-palette'],
    themes: ['dark'],
    appTheme: 'nord',
    drive: async (page) => {
      await page.evaluate(() => window.__shot.ui.getState().toggleCommandPalette())
      await page.waitForTimeout(300)
      await page.fill('.cmdp-input', 'feat').catch(() => {})
      await page.waitForTimeout(400)
    }
  },
  {
    // In-app code search (⌘⇧F) — git grep across the working tree.
    out: 'code-search',
    repos: ['code-search'],
    themes: ['dark'],
    appTheme: 'dracula',
    drive: async (page, repoPaths) => {
      const repo = repoPaths['code-search']
      await page.evaluate((p) => window.__shot.ui.getState().openModal({ kind: 'code-search', repoPath: p }), repo)
      await page.waitForTimeout(300)
      await page.fill('.codesearch-input', 'TODO').catch(() => {})
      await page.waitForTimeout(600)
    }
  },
  {
    // Branch stack — dependent branches with restack.
    out: 'branch-stack',
    repos: ['stacked-branches'],
    themes: ['light'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['stacked-branches']
      await page.evaluate((p) => window.__shot.ui.getState().openModal({ kind: 'stack', repoPath: p }), repo)
      await page.waitForTimeout(700)
    }
  },
  {
    // WIP snapshots — uncommitted-work safety net.
    out: 'snapshots',
    repos: ['snapshots'],
    themes: ['light'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['snapshots']
      await page.evaluate((p) => window.__shot.ui.getState().openModal({ kind: 'snapshots', repoPath: p }), repo)
      await page.waitForTimeout(700)
    }
  },
  {
    // Conventional-commit changelog generator.
    out: 'changelog-gen',
    repos: ['changelog'],
    themes: ['light'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['changelog']
      await page.evaluate((p) => window.__shot.ui.getState().openModal({ kind: 'changelog-gen', repoPath: p }), repo)
      await page.waitForTimeout(1200)
    }
  },
  {
    // Keyboard shortcut cheatsheet (rebindable).
    out: 'cheatsheet',
    repos: ['command-palette'],
    themes: ['dark'],
    appTheme: 'monokai',
    drive: async (page) => {
      await page.evaluate(() => window.__shot.ui.getState().openModal({ kind: 'cheatsheet' }))
      await page.waitForTimeout(500)
    }
  },
  {
    // Graph filtered by a path — non-matching commits dimmed.
    out: 'graph-path-filter',
    repos: ['insights'],
    themes: ['light'],
    drive: async (page) => {
      await page.evaluate(() => window.__shot.ui.getState().setPathFilter('src/core.js'))
      await page.waitForTimeout(700)
    }
  },
  {
    // Repository settings — tabbed (general / analytics / history / logs).
    out: 'repo-settings',
    repos: ['deep-history-monorepo'],
    themes: ['light'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['deep-history-monorepo']
      await page.evaluate((p) => window.__shot.ui.getState().openModal({ kind: 'repo-settings', repoPath: p }), repo)
      await page.waitForTimeout(400)
      // Click the Insights tab to show the relocated repo-insights dashboard.
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('.repo-settings-tabs button')].find((b) => /Insights|Métricas/.test(b.textContent || ''))
        if (btn) btn.click()
      })
      await page.waitForTimeout(500)
      await page.waitForTimeout(700)
    }
  },
  {
    // Side-by-side (split) diff with word-level highlighting.
    out: 'split-diff',
    repos: ['word-diff'],
    themes: ['light'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['word-diff']
      await page.evaluate((p) => {
        window.__shot.ui.getState().setFileView({ repoPath: p, file: 'config.ts', source: { type: 'wip', staged: false, untracked: false }, mode: 'diff' })
      }, repo)
      await page.waitForTimeout(500)
      await page.click('.diff-toggles button:first-child').catch(() => {})
      await page.waitForTimeout(500)
    }
  },
  {
    // Local vault — OS-keychain-encrypted secrets, per-repo + global.
    out: 'vault',
    repos: ['secrets'],
    themes: ['light'],
    // Writes and reads real vault entries, so this one needs the keychain.
    keychain: true,
    drive: async (page, repoPaths) => {
      const repo = repoPaths['secrets']
      await page.evaluate(async (r) => {
        await window.api.vault.upsert('global', '', { key: 'OPENAI_API_KEY', value: 'sk-demo-abc123def456', note: 'shared across repos' })
        await window.api.vault.upsert('global', '', { key: 'NPM_TOKEN', value: 'npm_demoTokenValue', note: '' })
        await window.api.vault.upsert('repo', r, { key: 'DATABASE_URL', value: 'postgres://user:pass@db/app', note: 'staging' })
        await window.api.vault.upsert('repo', r, { key: 'STRIPE_SECRET', value: 'sk_test_demo', note: '' })
        window.__shot.settings.getState().openPageTab({ type: 'vault', repoPath: r })
      }, repo)
      await page.waitForTimeout(900)
    }
  },
  {
    // Repository insights — churn, hotspots, contributors.
    out: 'insights',
    repos: ['insights'],
    themes: ['light'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['insights']
      await page.evaluate((p) => window.__shot.settings.getState().openPageTab({ type: 'insights', repoPath: p }), repo)
      await page.waitForTimeout(1800)
    }
  },
  {
    // LAUNCH picker — runs a .vscode/launch.json config in the integrated
    // terminal, with the floating debug toolbar (pause / restart / stop).
    out: 'launch-configs',
    repos: ['launch-configs'],
    themes: ['dark'],
    appTheme: 'midnight',
    drive: async (page, repoPaths) => {
      const repo = repoPaths['launch-configs']
      await page.evaluate(async (p) => {
        const s = window.__shot
        s.repo.getState().select(p, { type: 'wip' })
        const launch = s.launch.getState()
        await launch.discover(p)
        const groups = s.launch.getState().groupsByRepo[p] ?? []
        const root = groups.find((g) => g.isRoot) ?? groups[0]
        const watch = root?.configs.find((c) => /watch/i.test(c.name)) ?? root?.configs[0]
        if (root && watch) await launch.run(p, root, watch)
      }, repo)
      // Let the watcher stream a few ticks into the terminal.
      await page.waitForTimeout(2600)
      // Surface the launch picker so both the dropdown and a live run are shown.
      await page.click('.sb-tab-launch').catch(() => {})
      await page.waitForTimeout(500)
    }
  },
  {
    out: 'conflict-radar',
    repos: ['conflict-radar'],
    themes: ['dark'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['conflict-radar']
      await page.evaluate((p) => window.__shot.ui.getState().openModal({ kind: 'conflict-radar', repoPath: p, base: 'main' }), repo)
      // The radar scans on open: one merge-tree per branch, plus a single-ref
      // retry for the orphan branch git refuses. Wait for verdicts, not layout.
      await page.waitForSelector('.radar-row', { timeout: 15000 }).catch(() => {})
      await page.waitForTimeout(1200)
    }
  },
  {
    out: 'semantic-diff',
    repos: ['semantic-diff'],
    themes: ['dark'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['semantic-diff']
      await page.evaluate((p) => {
        const s = window.__shot
        // The refactor commit is the tip: rename + signature change + move.
        const commit = s.repo.getState().repos[p].commits[0]
        s.repo.getState().select(p, { type: 'commit', hash: commit.hash })
        s.ui.getState().setFileView({
          repoPath: p,
          file: 'src/app.ts',
          source: { type: 'commit', hash: commit.hash },
          mode: 'diff'
        })
      }, repo)
      // tree-sitter parses both sides before the strip appears.
      await page.waitForSelector('.sem-row', { timeout: 15000 }).catch(() => {})
      await page.waitForTimeout(600)
    }
  },
  {
    out: 'range-diff',
    repos: ['force-push'],
    themes: ['dark'],
    // The fixture is deliberately left un-fetched so the app can demo the
    // discovery; fetching here is what puts the rewrite in the tracking ref's
    // reflog, which is where the comparison reads its "before" from.
    prepare: async ({ repoPaths, run }) => {
      await run('git', ['-C', repoPaths['force-push'], 'fetch', '--all', '--prune'], { allowFail: true })
    },
    drive: async (page, repoPaths) => {
      const repo = repoPaths['force-push']
      await page.evaluate(
        (p) => window.__shot.ui.getState().openModal({ kind: 'range-diff', repoPath: p, branch: 'origin/feature/login' }),
        repo
      )
      await page.waitForSelector('.rd-row', { timeout: 15000 }).catch(() => {})
      // Expand the rewritten commit so the interdiff — the point of the whole
      // feature — is what the screenshot shows.
      await page.click('.rd-row-wrap.modified .rd-row').catch(() => {})
      await page.waitForTimeout(500)
    }
  },
  {
    out: 'absorb',
    repos: ['absorb'],
    themes: ['dark'],
    // Absorb works on the index, so the review fixes have to be staged first.
    prepare: async ({ repoPaths, run }) => {
      await run('git', ['-C', repoPaths['absorb'], 'add', '-A'], { allowFail: true })
    },
    drive: async (page, repoPaths) => {
      const repo = repoPaths['absorb']
      await page.evaluate((p) => window.__shot.ui.getState().openModal({ kind: 'absorb', repoPath: p }), repo)
      await page.waitForSelector('.ab-target', { timeout: 15000 }).catch(() => {})
      await page.waitForTimeout(600)
    }
  },
  {
    out: 'time-machine',
    repos: ['time-machine'],
    themes: ['dark'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['time-machine']
      await page.evaluate((p) => window.__shot.ui.getState().openModal({ kind: 'time-machine', repoPath: p }), repo)
      await page.waitForSelector('.tm-entry', { timeout: 15000 }).catch(() => {})
      // Scrub back to when the entry point still lived at the repo root, then
      // open a file so the shot shows both panes doing their job.
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('ArrowLeft')
        await page.waitForTimeout(180)
      }
      await page.click('.tm-entry:not(.dir)').catch(() => {})
      await page.waitForTimeout(700)
    }
  },
  {
    out: 'timelapse',
    repos: ['deep-history-monorepo'],
    themes: ['dark'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['deep-history-monorepo']
      await page.evaluate((p) => window.__shot.ui.getState().openModal({ kind: 'timelapse', repoPath: p }), repo)
      // Let it play far enough in that the canvas has a world on it rather
      // than three lonely dots.
      await page.waitForTimeout(4500)
    }
  },
  {
    out: 'mission-control',
    kind: 'group',
    repos: ['absorb', 'merge-conflict', 'time-machine', 'force-push', 'deep-history-monorepo'],
    themes: ['dark'],
    // One repo mid-merge and one with staged work, so the dashboard shows the
    // ordering it exists for instead of five identical clean rows.
    prepare: async ({ repoPaths, run }) => {
      const conflict = repoPaths['merge-conflict']
      await run('git', ['-C', conflict, 'merge', '--abort'], { allowFail: true })
      await run('git', ['-C', conflict, 'checkout', '-f', 'main'], { allowFail: true })
      await run('git', ['-C', conflict, 'merge', 'feature'], { allowFail: true })
      await run('git', ['-C', repoPaths['absorb'], 'add', '-A'], { allowFail: true })
    },
    drive: async (page) => {
      await page.evaluate(() => window.__shot.ui.getState().setMissionOpen(true))
      await page.waitForSelector('.mc-row', { timeout: 15000 }).catch(() => {})
      // Expand the busiest row: the pending commits and dirty files are the
      // part a screenshot can actually teach.
      await page.click('.mc-row-wrap:first-child .mc-expand').catch(() => {})
      await page.waitForTimeout(900)
    }
  },
  {
    // Blame — the collaborators repo has several authors, so the gutter shows
    // real name/date variety instead of one block of the same commit.
    out: 'blame',
    repos: ['collaborators'],
    themes: ['light'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['collaborators']
      await page.evaluate((p) => {
        window.__shot.ui.getState().setFileView({ repoPath: p, file: 'auth.js', source: { type: 'tree' }, mode: 'blame' })
      }, repo)
      await page.waitForTimeout(1200)
    }
  },
  {
    // File history — the same file's commits over time, the other half of the
    // blame page.
    out: 'file-history',
    repos: ['collaborators'],
    themes: ['dark'],
    appTheme: 'nord',
    drive: async (page, repoPaths) => {
      const repo = repoPaths['collaborators']
      await page.evaluate((p) => {
        window.__shot.ui.getState().setFileView({ repoPath: p, file: 'api.js', source: { type: 'tree' }, mode: 'history' })
      }, repo)
      await page.waitForTimeout(1200)
    }
  },
  {
    // Line staging — an unstaged diff with the per-line gutter controls visible.
    out: 'line-staging',
    repos: ['line-staging'],
    themes: ['light'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['line-staging']
      await page.evaluate((p) => {
        const s = window.__shot
        s.repo.getState().select(p, { type: 'wip' })
        s.ui.getState().setFileView({
          repoPath: p,
          file: 'config.js',
          source: { type: 'wip', staged: false, untracked: false },
          mode: 'diff'
        })
      }, repo)
      await page.waitForTimeout(800)
      // Hover a changed line so its stage-this-line affordance is in the frame.
      await page.hover('.diff-line.add').catch(() => {})
      await page.waitForTimeout(400)
    }
  },
  {
    // Partial stash — pick which files go into the stash.
    out: 'stash-partial',
    repos: ['stash-picking'],
    themes: ['light'],
    // The scenario ends by stashing everything, so the tree it leaves behind is
    // clean and the modal would render "nothing to stash". Dirty it again, with
    // a mix of edits and a new file, so there is something to pick from.
    prepare: async ({ repoPaths }) => {
      const repo = repoPaths['stash-picking']
      await writeFile(join(repo, 'alpha.txt'), 'alpha v3 — a fix worth keeping out of the stash\n')
      await writeFile(join(repo, 'beta.txt'), 'beta v3 — half-finished, stash this one\n')
      await writeFile(join(repo, 'src/gamma.txt'), 'gamma v3 — experiment, stash it\n')
      await writeFile(join(repo, 'epsilon-untracked.txt'), 'a brand new file the stash can capture\n')
    },
    drive: async (page, repoPaths) => {
      const repo = repoPaths['stash-picking']
      await page.evaluate((p) => window.__shot.ui.getState().openModal({ kind: 'stash-partial', repoPath: p }), repo)
      await page.waitForTimeout(800)
    }
  },
  {
    // Tag creation — lightweight / annotated / signed, and whether to push.
    out: 'create-tag',
    repos: ['tags-and-releases'],
    themes: ['dark'],
    appTheme: 'dracula',
    drive: async (page, repoPaths) => {
      const repo = repoPaths['tags-and-releases']
      await page.evaluate((p) => window.__shot.ui.getState().openModal({ kind: 'create-tag', repoPath: p }), repo)
      await page.waitForTimeout(700)
    }
  },
  {
    // Branch comparison — ahead/behind plus the commits on each side. Branch
    // names come from the loaded repo so the shot survives scenario edits.
    out: 'branch-compare',
    repos: ['octopus-merge'],
    themes: ['light'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['octopus-merge']
      await page.evaluate((p) => {
        const s = window.__shot
        // branches is a BranchesPayload ({ current, locals, remotes, tags }),
        // not an array — the locals carry the names.
        const names = (s.repo.getState().repos[p]?.branches?.locals ?? []).map((b) => b.name)
        // The combined diff is computed as branchB...branchA, so the branch that
        // is ahead has to go first — with main first the panel reads "No
        // differences" and the shot teaches nothing.
        const branchB = names.find((n) => n === 'main') ?? names[0]
        const branchA = names.find((n) => n !== branchB) ?? names[1]
        if (branchA && branchB) s.ui.getState().openModal({ kind: 'branch-compare', repoPath: p, branchA, branchB })
      }, repo)
      await page.waitForTimeout(1200)
    }
  },
  {
    // Preview a pull request locally — the modal that resolves a PR ref on any
    // host, forks included.
    out: 'pr-preview',
    repos: ['pr-ready-branch'],
    themes: ['dark'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['pr-ready-branch']
      await page.evaluate((p) => window.__shot.ui.getState().openModal({ kind: 'pr-preview', repoPath: p }), repo)
      await page.waitForTimeout(900)
    }
  },
  {
    // The diverged-branch guard: the dialog that appears instead of silently
    // picking a strategy when local and remote have both moved.
    out: 'diverged-checkout',
    repos: ['diverged-checkout'],
    themes: ['light'],
    drive: async (page) => {
      await page.evaluate(() => {
        window.__shot.ui.getState().openModal({
          kind: 'diverged-checkout',
          localName: 'feature/pricing',
          fullName: 'origin/feature/pricing',
          ahead: 3,
          behind: 5,
          onResolve: () => {}
        })
      })
      await page.waitForTimeout(600)
    }
  },
  {
    // Profiles — separate identity and tokens for work vs everything else.
    out: 'settings-profiles',
    repos: ['octopus-merge'],
    themes: ['light'],
    drive: async (page) => {
      await page.evaluate(() => window.__shot.ui.getState().openModal({ kind: 'settings', page: 'profile' }))
      await page.waitForTimeout(600)
    }
  },
  {
    // Secure share — an encrypted bundle of settings/vault entries for another
    // machine.
    out: 'secure-share',
    repos: ['secure-share'],
    themes: ['dark'],
    appTheme: 'midnight',
    // The export lists the vault section it can pack, which needs the keychain.
    keychain: true,
    drive: async (page, repoPaths) => {
      const repo = repoPaths['secure-share']
      await page.evaluate(
        (p) => window.__shot.ui.getState().openModal({ kind: 'secure-share', repoPath: p, initialMode: 'export' }),
        repo
      )
      await page.waitForTimeout(700)
    }
  },
  {
    // The whole-workspace variant of the same bundle.
    out: 'secure-workspace',
    repos: ['workspace-share'],
    themes: ['light'],
    keychain: true,
    drive: async (page) => {
      await page.evaluate(() => window.__shot.ui.getState().openModal({ kind: 'secure-workspace', initialMode: 'export' }))
      await page.waitForTimeout(700)
    }
  },
  {
    // Pinned branches — the sidebar with favourites held at the top.
    out: 'pinned-branches',
    repos: ['pinned-branches'],
    themes: ['light'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['pinned-branches']
      await page.evaluate((p) => window.__shot.repo.getState().select(p, { type: 'wip' }), repo)
      await page.waitForTimeout(700)
    }
  },
  {
    // An empty repository — what Getting started actually opens on.
    out: 'empty-repo',
    repos: ['empty-repo'],
    themes: ['light'],
    drive: async (page) => {
      await page.waitForTimeout(800)
    }
  },
  {
    // Split terminals — two panels side by side in one group, which is the part
    // a single-pane terminal shot cannot show.
    out: 'terminal-split',
    repos: ['deep-history-monorepo'],
    themes: ['dark'],
    appTheme: 'midnight',
    drive: async (page, repoPaths) => {
      const repo = repoPaths['deep-history-monorepo']
      await page.evaluate((p) => {
        const ui = window.__shot.ui.getState()
        if (!ui.terminalOpenByRepo[p]) ui.toggleTerminal(p)
      }, repo)
      await page.waitForTimeout(1400)
      await page.evaluate((p) => {
        const t = window.__shot.terminals.getState()
        const active = t.byRepo[p]?.activeGroupId
        if (active) t.splitGroup(p, active, p)
      }, repo)
      await page.waitForTimeout(1600)
      await page.click('.xterm').catch(() => {})
      await page.keyboard.type('git status -sb')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(900)
    }
  },
  {
    // Secret masking — a .env previewed with its values hidden, which is the
    // security page's central claim.
    out: 'secret-masking',
    repos: ['secrets'],
    themes: ['light'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['secrets']
      await page.evaluate((p) => {
        window.__shot.ui.getState().setFileView({ repoPath: p, file: '.env', source: { type: 'tree' }, mode: 'file' })
      }, repo)
      await page.waitForTimeout(900)
    }
  },
  {
    // Worktrees and submodules — the two sidebar sections that only have
    // something in them in a repo set up for it.
    out: 'worktrees',
    repos: ['submodules-worktrees'],
    themes: ['light'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['submodules-worktrees']
      await page.evaluate((p) => window.__shot.repo.getState().select(p, { type: 'wip' }), repo)
      // Both sections are defaultOpen={false} and their open state is local
      // component state, so it has to be clicked open. Sections share one class
      // — the title is what tells them apart.
      await openSections(page, ['WORKTREES', 'SUBMODULES'])
      await page.waitForTimeout(900)
    }
  },
  {
    // Submodule states — behind, modified, uninitialised, each with its badge.
    out: 'submodule-states',
    repos: ['submodule-states'],
    themes: ['dark'],
    appTheme: 'nord',
    drive: async (page, repoPaths) => {
      const repo = repoPaths['submodule-states']
      await page.evaluate((p) => window.__shot.repo.getState().select(p, { type: 'wip' }), repo)
      await openSections(page, ['SUBMODULES'])
      await page.waitForTimeout(900)
    }
  },
  {
    // Subfolders inside a group tab: repositories filed into nested folders
    // rather than one flat list.
    out: 'nested-folders',
    kind: 'group',
    repos: ['nested-folders', 'octopus-merge', 'merge-conflict', 'code-search', 'insights'],
    groupLanding: true,
    themes: ['light'],
    drive: async (page, repoPaths) => {
      await page.evaluate((paths) => {
        const store = window.__shot.settings
        // The zustand state wraps the settings object — tabs live under
        // `.settings`, not at the top level.
        const tabs = () => store.getState().settings.tabs ?? []
        const foldersOf = (id) => tabs().find((t) => t.id === id)?.folders ?? []
        const tab = tabs().find((t) => t.kind === 'group')
        if (!tab) return

        // Build a small tree, then file the repos into it — the point of the
        // shot is the nesting, which empty folders cannot show. `update` sets
        // state synchronously, so each folder is readable straight after.
        store.getState().createFolder(tab.id, 'Services', null)
        store.getState().createFolder(tab.id, 'Frontend', null)
        const services = foldersOf(tab.id).find((f) => f.name === 'Services')
        const frontend = foldersOf(tab.id).find((f) => f.name === 'Frontend')
        if (services) {
          store.getState().createFolder(tab.id, 'Internal', services.id)
          store.getState().moveRepoToFolder(tab.id, paths['octopus-merge'], services.id)
          store.getState().moveRepoToFolder(tab.id, paths['merge-conflict'], services.id)
        }
        if (frontend) store.getState().moveRepoToFolder(tab.id, paths['code-search'], frontend.id)
      }, repoPaths)
      await page.waitForTimeout(1000)
    }
  },
  {
    // Branch grouping — slash-separated prefixes folded into a tree.
    out: 'branch-grouping',
    repos: ['branch-grouping'],
    themes: ['light'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['branch-grouping']
      await page.evaluate((p) => window.__shot.repo.getState().select(p, { type: 'wip' }), repo)
      await page.waitForTimeout(900)
    }
  },
  {
    // Status badges on the project tree: which files are modified, added or
    // ignored, without leaving the file browser.
    out: 'tree-badges',
    repos: ['tree-badges'],
    themes: ['light'],
    drive: async (page) => {
      // Files tab — the tree lives beside the preview pane.
      await page.click('.sb-tabs .sb-tab:nth-child(2)').catch(() => {})
      await page.waitForTimeout(900)
    }
  },
  {
    // A force-push that would rewrite what the remote has: the guard fires
    // before anything leaves the machine.
    out: 'force-push-guard',
    repos: ['force-push'],
    themes: ['dark'],
    drive: async (page, repoPaths) => {
      const repo = repoPaths['force-push']
      await page.evaluate((p) => window.__shot.repo.getState().select(p, { type: 'wip' }), repo)
      await page.waitForTimeout(600)
      // The copy here is the reference locale's real guard text
      // (`confirm.protectedForcePush.*` / `confirm.forcePush.ok`) with {branch}
      // filled in. Inventing wording would put a dialog in the handbook that
      // nobody can find in the app.
      await page.evaluate(() => {
        window.__shot.ui.getState().openModal({
          kind: 'confirm',
          title: 'Force-push a protected branch?',
          message:
            '"main" is a protected branch. Force-pushing rewrites history others may have pulled. Continue?',
          confirmLabel: 'Force push',
          danger: true,
          onConfirm: () => {}
        })
      })
      await page.waitForTimeout(600)
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
  },
  {
    out: 'clip-time-machine',
    repos: ['time-machine'],
    themes: ['dark'],
    gif: {
      durationMs: 6000,
      // The whole point is motion: the file tree rebuilding itself commit by
      // commit as the slider walks backwards, then forwards again.
      drive: async (page, repoPaths) => {
        const repo = repoPaths['time-machine']
        await page.evaluate((p) => window.__shot.ui.getState().openModal({ kind: 'time-machine', repoPath: p }), repo)
        await page.waitForSelector('.tm-entry', { timeout: 15000 }).catch(() => {})
        await page.waitForTimeout(500)
        for (let i = 0; i < 9; i++) {
          await page.keyboard.press('ArrowLeft')
          await page.waitForTimeout(320)
        }
        await page.waitForTimeout(400)
        for (let i = 0; i < 5; i++) {
          await page.keyboard.press('ArrowRight')
          await page.waitForTimeout(320)
        }
      }
    }
  },
  {
    out: 'clip-timelapse',
    repos: ['deep-history-monorepo'],
    themes: ['dark'],
    gif: {
      durationMs: 7000,
      // Opens playing at the default speed; the clip is simply the animation.
      drive: async (page, repoPaths) => {
        const repo = repoPaths['deep-history-monorepo']
        await page.evaluate((p) => window.__shot.ui.getState().openModal({ kind: 'timelapse', repoPath: p }), repo)
        await page.waitForTimeout(6500)
      }
    }
  },
  {
    out: 'clip-conflict-radar',
    repos: ['conflict-radar'],
    themes: ['dark'],
    gif: {
      durationMs: 5500,
      // Shows the scan landing verdict by verdict, then the contested files.
      drive: async (page, repoPaths) => {
        const repo = repoPaths['conflict-radar']
        await page.waitForTimeout(600)
        await page.evaluate(
          (p) => window.__shot.ui.getState().openModal({ kind: 'conflict-radar', repoPath: p, base: 'main' }),
          repo
        )
        await page.waitForSelector('.radar-row', { timeout: 15000 }).catch(() => {})
        await page.waitForTimeout(1500)
        // Open the worst offender to reveal its conflicting paths.
        await page.click('.radar-row-wrap.conflict .radar-row').catch(() => {})
        await page.waitForTimeout(1800)
      }
    }
  }
]
