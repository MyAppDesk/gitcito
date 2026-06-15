import type { AppTheme, CodeTheme, ThemeMode, AppThemeColors, CodeThemeColors } from '../../../shared/types'

// ─── Built-in app themes ─────────────────────────────────────────────────────
// Every built-in theme ships a light and a dark palette. The active palette is
// chosen at apply-time from the user's appearance mode (light / dark / auto).

export const APP_THEMES: AppTheme[] = [
  {
    id: 'gitcito',
    name: 'Gitcito',
    builtin: true,
    light: {
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
    },
    dark: {
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
    id: 'contrast',
    name: 'Ultra Contrast',
    builtin: true,
    light: {
      bg0: '#ffffff',
      bg1: '#ffffff',
      bg2: '#f2f2f4',
      bg3: '#e6e6ea',
      bg4: '#d8d8de',
      border: '#9a9aa8',
      borderSoft: '#c8c8d0',
      text0: '#000000',
      text1: '#1a1a22',
      text2: '#44444f',
      accent: '#4b32d6',
      green: '#007d54',
      red: '#cc0033',
      yellow: '#a85600',
      purple: '#0077aa'
    },
    dark: {
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
    light: {
      bg0: '#eef1f7',
      bg1: '#ffffff',
      bg2: '#f3f5fa',
      bg3: '#e6eaf3',
      bg4: '#d8deec',
      border: '#cfd6e6',
      borderSoft: '#e3e8f2',
      text0: '#1c2433',
      text1: '#4a5468',
      text2: '#7b8699',
      accent: '#2d6fe0',
      green: '#2a9d76',
      red: '#d23f54',
      yellow: '#b07a00',
      purple: '#8a5cd6'
    },
    dark: {
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
    light: {
      bg0: '#f3efe0',
      bg1: '#fdf9ec',
      bg2: '#ece7d6',
      bg3: '#dfd9c4',
      bg4: '#cfc8b0',
      border: '#c8c0a6',
      borderSoft: '#e0dac6',
      text0: '#1c1a14',
      text1: '#46412f',
      text2: '#736b50',
      accent: '#7d4dd6',
      green: '#2a7a36',
      red: '#cb3a2a',
      yellow: '#9a6b00',
      purple: '#b3247a'
    },
    dark: {
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
    light: {
      bg0: '#e5e9f0',
      bg1: '#eceff4',
      bg2: '#dfe4ee',
      bg3: '#d8dee9',
      bg4: '#c8d0de',
      border: '#c2cad8',
      borderSoft: '#dbe0ea',
      text0: '#2e3440',
      text1: '#434c5e',
      text2: '#6b7488',
      accent: '#5e81ac',
      green: '#4f7a3f',
      red: '#bf616a',
      yellow: '#a07e1f',
      purple: '#9d6fa0'
    },
    dark: {
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
    id: 'solarized',
    name: 'Solarized',
    builtin: true,
    light: {
      bg0: '#f7f0dd',
      bg1: '#fdf6e3',
      bg2: '#eee8d5',
      bg3: '#e3ddc8',
      bg4: '#d6d0bb',
      border: '#d3cbb7',
      borderSoft: '#eee8d5',
      text0: '#073642',
      text1: '#586e75',
      text2: '#93a1a1',
      accent: '#268bd2',
      green: '#859900',
      red: '#dc322f',
      yellow: '#b58900',
      purple: '#6c71c4'
    },
    dark: {
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
    id: 'github',
    name: 'GitHub',
    builtin: true,
    light: {
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
    },
    dark: {
      bg0: '#010409',
      bg1: '#0d1117',
      bg2: '#161b22',
      bg3: '#21262d',
      bg4: '#30363d',
      border: '#30363d',
      borderSoft: '#21262d',
      text0: '#e6edf3',
      text1: '#adbac7',
      text2: '#8b949e',
      accent: '#2f81f7',
      green: '#3fb950',
      red: '#f85149',
      yellow: '#d29922',
      purple: '#a371f7'
    }
  },
  {
    id: 'monokai',
    name: 'Monokai',
    builtin: true,
    light: {
      bg0: '#f5f5ef',
      bg1: '#fafaf5',
      bg2: '#ecece4',
      bg3: '#deded4',
      bg4: '#cecec2',
      border: '#c8c8bb',
      borderSoft: '#e0e0d6',
      text0: '#272822',
      text1: '#49483e',
      text2: '#75715e',
      accent: '#00879e',
      green: '#5c8a00',
      red: '#c41a6e',
      yellow: '#9a6b00',
      purple: '#7d4dd6'
    },
    dark: {
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
  },
  {
    id: 'daltonic',
    name: 'Daltonic',
    builtin: true,
    // Colour-blind friendly palette based on the Okabe-Ito set: blue/orange are
    // used for the success/danger signals instead of green/red.
    light: {
      bg0: '#eef1f5',
      bg1: '#ffffff',
      bg2: '#f3f5f9',
      bg3: '#e5e9f0',
      bg4: '#d6dce6',
      border: '#cdd4df',
      borderSoft: '#e5e9f0',
      text0: '#11161d',
      text1: '#3f4854',
      text2: '#6e7886',
      accent: '#0072b2',
      green: '#009e73',
      red: '#d55e00',
      yellow: '#c98a00',
      purple: '#b3568f'
    },
    dark: {
      bg0: '#0d0f12',
      bg1: '#15181d',
      bg2: '#1b1f26',
      bg3: '#242a33',
      bg4: '#2f3742',
      border: '#39414d',
      borderSoft: '#242a33',
      text0: '#f0f3f7',
      text1: '#b5bdc9',
      text2: '#7a8494',
      accent: '#56b4e9',
      green: '#009e73',
      red: '#d55e00',
      yellow: '#e69f00',
      purple: '#cc79a7'
    }
  }
]

// ─── Built-in code (syntax) themes ───────────────────────────────────────────

export const CODE_THEMES: CodeTheme[] = [
  {
    id: 'gitcito',
    name: 'Gitcito',
    builtin: true,
    light: {
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
    },
    dark: {
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
    id: 'contrast',
    name: 'Ultra Contrast',
    builtin: true,
    light: {
      bg: 'transparent',
      text: '#000000',
      comment: '#44444f',
      keyword: '#4b32d6',
      string: '#007d54',
      number: '#a85600',
      function: '#0077aa',
      title: '#0077aa',
      variable: '#000000',
      type: '#4b32d6',
      builtin: '#0077aa',
      attr: '#a85600',
      tag: '#cc0033',
      operator: '#1a1a22',
      meta: '#44444f'
    },
    dark: {
      bg: 'transparent',
      text: '#ffffff',
      comment: '#9a9ab2',
      keyword: '#8b7bff',
      string: '#00ffbf',
      number: '#ff9e2c',
      function: '#22e0ff',
      title: '#22e0ff',
      variable: '#ffffff',
      type: '#a08cff',
      builtin: '#22e0ff',
      attr: '#ff9e2c',
      tag: '#ff476f',
      operator: '#d8d8e6',
      meta: '#9a9ab2'
    }
  },
  {
    id: 'midnight',
    name: 'Midnight',
    builtin: true,
    light: {
      bg: 'transparent',
      text: '#1c2433',
      comment: '#7b8699',
      keyword: '#2d6fe0',
      string: '#2a9d76',
      number: '#b07a00',
      function: '#7a4ad0',
      title: '#7a4ad0',
      variable: '#1c2433',
      type: '#1f6fd6',
      builtin: '#2d6fe0',
      attr: '#b07a00',
      tag: '#d23f54',
      operator: '#4a5468',
      meta: '#7b8699'
    },
    dark: {
      bg: 'transparent',
      text: '#e8ecf5',
      comment: '#6b7388',
      keyword: '#58a6ff',
      string: '#3fd0a4',
      number: '#f2cc60',
      function: '#b585f7',
      title: '#b585f7',
      variable: '#e8ecf5',
      type: '#79c0ff',
      builtin: '#58a6ff',
      attr: '#f2cc60',
      tag: '#e7596c',
      operator: '#aab2c5',
      meta: '#6b7388'
    }
  },
  {
    id: 'dracula',
    name: 'Dracula',
    builtin: true,
    light: {
      bg: 'transparent',
      text: '#1c1a14',
      comment: '#7b7560',
      keyword: '#b3247a',
      string: '#9a6b00',
      number: '#7d4dd6',
      function: '#2a7a36',
      title: '#2a7a36',
      variable: '#1c1a14',
      type: '#0a72a0',
      builtin: '#0a72a0',
      attr: '#2a7a36',
      tag: '#b3247a',
      operator: '#b3247a',
      meta: '#7b7560'
    },
    dark: {
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
    id: 'nord',
    name: 'Nord',
    builtin: true,
    light: {
      bg: 'transparent',
      text: '#2e3440',
      comment: '#7b8494',
      keyword: '#5e81ac',
      string: '#4f7a3f',
      number: '#9d6fa0',
      function: '#3b6ea5',
      title: '#3b6ea5',
      variable: '#2e3440',
      type: '#2a7d7d',
      builtin: '#2a7d7d',
      attr: '#2a7d7d',
      tag: '#5e81ac',
      operator: '#5e81ac',
      meta: '#7b8494'
    },
    dark: {
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
  },
  {
    id: 'solarized',
    name: 'Solarized',
    builtin: true,
    light: {
      bg: 'transparent',
      text: '#586e75',
      comment: '#93a1a1',
      keyword: '#859900',
      string: '#2aa198',
      number: '#d33682',
      function: '#268bd2',
      title: '#268bd2',
      variable: '#586e75',
      type: '#b58900',
      builtin: '#cb4b16',
      attr: '#b58900',
      tag: '#268bd2',
      operator: '#859900',
      meta: '#93a1a1'
    },
    dark: {
      bg: 'transparent',
      text: '#93a1a1',
      comment: '#586e75',
      keyword: '#859900',
      string: '#2aa198',
      number: '#d33682',
      function: '#268bd2',
      title: '#268bd2',
      variable: '#93a1a1',
      type: '#b58900',
      builtin: '#cb4b16',
      attr: '#b58900',
      tag: '#268bd2',
      operator: '#859900',
      meta: '#586e75'
    }
  },
  {
    id: 'github',
    name: 'GitHub',
    builtin: true,
    light: {
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
    },
    dark: {
      bg: 'transparent',
      text: '#e6edf3',
      comment: '#8b949e',
      keyword: '#ff7b72',
      string: '#a5d6ff',
      number: '#79c0ff',
      function: '#d2a8ff',
      title: '#d2a8ff',
      variable: '#e6edf3',
      type: '#ffa657',
      builtin: '#79c0ff',
      attr: '#79c0ff',
      tag: '#7ee787',
      operator: '#ff7b72',
      meta: '#8b949e'
    }
  },
  {
    id: 'monokai',
    name: 'Monokai',
    builtin: true,
    light: {
      bg: 'transparent',
      text: '#272822',
      comment: '#9b9788',
      keyword: '#c41a6e',
      string: '#9a6b00',
      number: '#7d4dd6',
      function: '#5c8a00',
      title: '#5c8a00',
      variable: '#272822',
      type: '#00879e',
      builtin: '#00879e',
      attr: '#5c8a00',
      tag: '#c41a6e',
      operator: '#c41a6e',
      meta: '#9b9788'
    },
    dark: {
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
    id: 'daltonic',
    name: 'Daltonic',
    builtin: true,
    light: {
      bg: 'transparent',
      text: '#11161d',
      comment: '#6e7886',
      keyword: '#0072b2',
      string: '#009e73',
      number: '#c98a00',
      function: '#b3568f',
      title: '#b3568f',
      variable: '#11161d',
      type: '#0072b2',
      builtin: '#0072b2',
      attr: '#c98a00',
      tag: '#d55e00',
      operator: '#3f4854',
      meta: '#6e7886'
    },
    dark: {
      bg: 'transparent',
      text: '#f0f3f7',
      comment: '#7a8494',
      keyword: '#56b4e9',
      string: '#009e73',
      number: '#e69f00',
      function: '#cc79a7',
      title: '#cc79a7',
      variable: '#f0f3f7',
      type: '#56b4e9',
      builtin: '#56b4e9',
      attr: '#e69f00',
      tag: '#d55e00',
      operator: '#b5bdc9',
      meta: '#7a8494'
    }
  }
]

// ─── Apply helpers ───────────────────────────────────────────────────────────

/** Resolve an appearance mode to a concrete light/dark value. */
export function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'auto') {
    return typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return mode
}

/** The active app palette for a theme given the appearance mode. */
export function resolveAppColors(theme: AppTheme, mode: ThemeMode): AppThemeColors {
  return theme[resolveMode(mode)]
}

/** The active code palette for a theme given the appearance mode. */
export function resolveCodeColors(theme: CodeTheme, mode: ThemeMode): CodeThemeColors {
  return theme[resolveMode(mode)]
}

export function applyAppTheme(theme: AppTheme, mode: ThemeMode): void {
  const r = document.documentElement
  const resolved = resolveMode(mode)
  const c = theme[resolved]
  r.style.colorScheme = resolved
  r.dataset.mode = resolved
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

export function applyCodeTheme(theme: CodeTheme, mode: ThemeMode, fontSize: number): void {
  const r = document.documentElement
  const c = theme[resolveMode(mode)]
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
