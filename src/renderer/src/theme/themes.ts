import type { AppTheme, CodeTheme } from '../../../shared/types'

// ─── Built-in app themes ─────────────────────────────────────────────────────

export const APP_THEMES: AppTheme[] = [
  {
    id: 'gitcito-light',
    name: 'Gitcito Light',
    builtin: true,
    colors: {
      bg0: '#eef0f8',
      bg1: '#ffffff',
      bg2: '#f4f5fb',
      bg3: '#e8ebf6',
      bg4: '#dde1f1',
      border: '#d4d8ec',
      borderSoft: '#e6e9f5',
      text0: '#2b2d42',
      text1: '#5a5f7d',
      text2: '#8a90ad',
      accent: '#6c5ce7',
      green: '#00b487',
      red: '#e23d63',
      yellow: '#e8690f',
      purple: '#0aa6cc'
    }
  },
  {
    id: 'gitcito',
    name: 'Gitcito Dark',
    builtin: true,
    colors: {
      bg0: '#0f1220',
      bg1: '#141829',
      bg2: '#171b2d',
      bg3: '#1e2440',
      bg4: '#283057',
      border: '#2a3158',
      borderSoft: '#1e2440',
      text0: '#edeffa',
      text1: '#a9afcb',
      text2: '#6b7299',
      accent: '#6c5ce7',
      green: '#00e6a8',
      red: '#ff5c7a',
      yellow: '#ff7a1a',
      purple: '#00d4ff'
    }
  },
  {
    id: 'gitcito-contrast',
    name: 'Gitcito Ultra Contrast',
    builtin: true,
    colors: {
      bg0: '#000000',
      bg1: '#060608',
      bg2: '#0c0c12',
      bg3: '#15151f',
      bg4: '#212130',
      border: '#3d3d4e',
      borderSoft: '#26262f',
      text0: '#ffffff',
      text1: '#d8d8e6',
      text2: '#9a9ab2',
      accent: '#8b7bff',
      green: '#00ffbf',
      red: '#ff476f',
      yellow: '#ff9e2c',
      purple: '#22e0ff'
    }
  },
  {
    id: 'midnight',
    name: 'Midnight',
    builtin: true,
    colors: {
      bg0: '#0b0c11',
      bg1: '#0e0f15',
      bg2: '#14161f',
      bg3: '#1a1d29',
      bg4: '#222636',
      border: '#262b3b',
      borderSoft: '#1d2130',
      text0: '#e8ecf5',
      text1: '#aab2c5',
      text2: '#6b7388',
      accent: '#58a6ff',
      green: '#3fd0a4',
      red: '#e7596c',
      yellow: '#f2cc60',
      purple: '#b585f7'
    }
  },
  {
    id: 'dracula',
    name: 'Dracula',
    builtin: true,
    colors: {
      bg0: '#1a1b26',
      bg1: '#21222c',
      bg2: '#282a36',
      bg3: '#343746',
      bg4: '#424450',
      border: '#3a3d4d',
      borderSoft: '#2d2f3d',
      text0: '#f8f8f2',
      text1: '#c8c9d4',
      text2: '#7f8195',
      accent: '#bd93f9',
      green: '#50fa7b',
      red: '#ff5555',
      yellow: '#f1fa8c',
      purple: '#ff79c6'
    }
  },
  {
    id: 'nord',
    name: 'Nord',
    builtin: true,
    colors: {
      bg0: '#242933',
      bg1: '#2e3440',
      bg2: '#343b4c',
      bg3: '#3b4252',
      bg4: '#434c5e',
      border: '#434c5e',
      borderSoft: '#3b4252',
      text0: '#eceff4',
      text1: '#d8dee9',
      text2: '#7b88a1',
      accent: '#88c0d0',
      green: '#a3be8c',
      red: '#bf616a',
      yellow: '#ebcb8b',
      purple: '#b48ead'
    }
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    builtin: true,
    colors: {
      bg0: '#002028',
      bg1: '#002b36',
      bg2: '#073642',
      bg3: '#0a4250',
      bg4: '#0f4f5e',
      border: '#0f4f5e',
      borderSoft: '#073642',
      text0: '#fdf6e3',
      text1: '#93a1a1',
      text2: '#586e75',
      accent: '#268bd2',
      green: '#859900',
      red: '#dc322f',
      yellow: '#b58900',
      purple: '#6c71c4'
    }
  },
  {
    id: 'github-light',
    name: 'GitHub Light',
    builtin: true,
    colors: {
      bg0: '#ffffff',
      bg1: '#f6f8fa',
      bg2: '#eaeef2',
      bg3: '#dde3ea',
      bg4: '#cdd5dd',
      border: '#d0d7de',
      borderSoft: '#e1e6eb',
      text0: '#1f2328',
      text1: '#454c54',
      text2: '#6e7781',
      accent: '#0969da',
      green: '#1a7f37',
      red: '#cf222e',
      yellow: '#9a6700',
      purple: '#8250df'
    }
  },
  {
    id: 'monokai',
    name: 'Monokai',
    builtin: true,
    colors: {
      bg0: '#1d1e19',
      bg1: '#272822',
      bg2: '#2f312a',
      bg3: '#3a3d33',
      bg4: '#49483e',
      border: '#3e3f36',
      borderSoft: '#32332c',
      text0: '#f8f8f2',
      text1: '#cfcfc2',
      text2: '#75715e',
      accent: '#66d9ef',
      green: '#a6e22e',
      red: '#f92672',
      yellow: '#e6db74',
      purple: '#ae81ff'
    }
  }
]

// ─── Built-in code (syntax) themes ───────────────────────────────────────────

export const CODE_THEMES: CodeTheme[] = [
  {
    id: 'gitcito-dark',
    name: 'Gitcito (default)',
    builtin: true,
    colors: {
      bg: 'transparent',
      text: '#edeffa',
      comment: '#6b7299',
      keyword: '#6c5ce7',
      string: '#00e6a8',
      number: '#ff7a1a',
      function: '#00d4ff',
      title: '#00d4ff',
      variable: '#edeffa',
      type: '#7f8ff4',
      builtin: '#00d4ff',
      attr: '#ff7a1a',
      tag: '#ff5c7a',
      operator: '#a9afcb',
      meta: '#6b7299'
    }
  },
  {
    id: 'gitcito-light-code',
    name: 'Gitcito Light',
    builtin: true,
    colors: {
      bg: 'transparent',
      text: '#2b2d42',
      comment: '#8a90ad',
      keyword: '#6c5ce7',
      string: '#00936f',
      number: '#c2570d',
      function: '#0a8fb0',
      title: '#0a8fb0',
      variable: '#2b2d42',
      type: '#5a4bd1',
      builtin: '#0a8fb0',
      attr: '#c2570d',
      tag: '#d4365e',
      operator: '#5a5f7d',
      meta: '#8a90ad'
    }
  },
  {
    id: 'dracula-code',
    name: 'Dracula',
    builtin: true,
    colors: {
      bg: 'transparent',
      text: '#f8f8f2',
      comment: '#6272a4',
      keyword: '#ff79c6',
      string: '#f1fa8c',
      number: '#bd93f9',
      function: '#50fa7b',
      title: '#50fa7b',
      variable: '#f8f8f2',
      type: '#8be9fd',
      builtin: '#8be9fd',
      attr: '#50fa7b',
      tag: '#ff79c6',
      operator: '#ff79c6',
      meta: '#6272a4'
    }
  },
  {
    id: 'github-code',
    name: 'GitHub',
    builtin: true,
    colors: {
      bg: 'transparent',
      text: '#1f2328',
      comment: '#6e7781',
      keyword: '#cf222e',
      string: '#0a3069',
      number: '#0550ae',
      function: '#8250df',
      title: '#8250df',
      variable: '#1f2328',
      type: '#953800',
      builtin: '#0550ae',
      attr: '#0550ae',
      tag: '#116329',
      operator: '#cf222e',
      meta: '#6e7781'
    }
  },
  {
    id: 'monokai-code',
    name: 'Monokai',
    builtin: true,
    colors: {
      bg: 'transparent',
      text: '#f8f8f2',
      comment: '#75715e',
      keyword: '#f92672',
      string: '#e6db74',
      number: '#ae81ff',
      function: '#a6e22e',
      title: '#a6e22e',
      variable: '#f8f8f2',
      type: '#66d9ef',
      builtin: '#66d9ef',
      attr: '#a6e22e',
      tag: '#f92672',
      operator: '#f92672',
      meta: '#75715e'
    }
  },
  {
    id: 'nord-code',
    name: 'Nord',
    builtin: true,
    colors: {
      bg: 'transparent',
      text: '#d8dee9',
      comment: '#616e88',
      keyword: '#81a1c1',
      string: '#a3be8c',
      number: '#b48ead',
      function: '#88c0d0',
      title: '#88c0d0',
      variable: '#d8dee9',
      type: '#8fbcbb',
      builtin: '#8fbcbb',
      attr: '#8fbcbb',
      tag: '#81a1c1',
      operator: '#81a1c1',
      meta: '#616e88'
    }
  }
]

// ─── Apply helpers ───────────────────────────────────────────────────────────

export function applyAppTheme(theme: AppTheme): void {
  const r = document.documentElement
  const c = theme.colors
  r.style.setProperty('--bg-0', c.bg0)
  r.style.setProperty('--bg-1', c.bg1)
  r.style.setProperty('--bg-2', c.bg2)
  r.style.setProperty('--bg-3', c.bg3)
  r.style.setProperty('--bg-4', c.bg4)
  r.style.setProperty('--border', c.border)
  r.style.setProperty('--border-soft', c.borderSoft)
  r.style.setProperty('--text-0', c.text0)
  r.style.setProperty('--text-1', c.text1)
  r.style.setProperty('--text-2', c.text2)
  r.style.setProperty('--accent', c.accent)
  r.style.setProperty('--accent-soft', hexToRgba(c.accent, 0.14))
  r.style.setProperty('--green', c.green)
  r.style.setProperty('--red', c.red)
  r.style.setProperty('--yellow', c.yellow)
  r.style.setProperty('--purple', c.purple)
}

export function applyCodeTheme(theme: CodeTheme, fontSize: number): void {
  const r = document.documentElement
  const c = theme.colors
  r.style.setProperty('--code-bg', c.bg)
  r.style.setProperty('--code-text', c.text)
  r.style.setProperty('--code-comment', c.comment)
  r.style.setProperty('--code-keyword', c.keyword)
  r.style.setProperty('--code-string', c.string)
  r.style.setProperty('--code-number', c.number)
  r.style.setProperty('--code-function', c.function)
  r.style.setProperty('--code-title', c.title)
  r.style.setProperty('--code-variable', c.variable)
  r.style.setProperty('--code-type', c.type)
  r.style.setProperty('--code-builtin', c.builtin)
  r.style.setProperty('--code-attr', c.attr)
  r.style.setProperty('--code-tag', c.tag)
  r.style.setProperty('--code-operator', c.operator)
  r.style.setProperty('--code-meta', c.meta)
  r.style.setProperty('--code-font-size', `${fontSize}px`)
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function allAppThemes(custom: AppTheme[]): AppTheme[] {
  return [...APP_THEMES, ...custom]
}

export function allCodeThemes(custom: CodeTheme[]): CodeTheme[] {
  return [...CODE_THEMES, ...custom]
}

export function findAppTheme(id: string, custom: AppTheme[]): AppTheme {
  return allAppThemes(custom).find((t) => t.id === id) ?? APP_THEMES[0]
}

export function findCodeTheme(id: string, custom: CodeTheme[]): CodeTheme {
  return allCodeThemes(custom).find((t) => t.id === id) ?? CODE_THEMES[0]
}
