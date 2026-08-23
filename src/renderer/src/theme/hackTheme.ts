import type { AppTheme, CodeTheme, GraphPalette, GraphStyle } from '../../../shared/types'

/**
 * The look of a session — a whole curated skin, not a banner bolted onto
 * whatever theme happened to be active.
 *
 * A mode you can only tell is on by reading a strip at the top is not a mode.
 * When a session starts, Gitcito swaps its app palette, its syntax palette and
 * its graph style together, and puts all three back untouched when it ends.
 * The user's own choices are never overwritten — they are stashed and restored
 * (see `stores/hack.ts`).
 *
 * The palette is one idea carried through every surface: near-black grounds
 * that let colour glow, a hot magenta accent, cyan as the second voice, and
 * warm amber for anything that wants attention. Light mode is the same
 * relationships at a different luminance rather than a separate design — a
 * session at midday and a session at 4am should be recognisably the same thing.
 */

export const HACK_APP_THEME: AppTheme = {
  id: 'hack-mode',
  name: 'Hack mode',
  builtin: true,
  light: {
    bg0: '#f4f1fa',
    bg1: '#ffffff',
    bg2: '#f7f3fd',
    bg3: '#ece4fb',
    bg4: '#ddd0f6',
    border: '#cbb8ef',
    borderSoft: '#e6dcf8',
    text0: '#1b0f2e',
    text1: '#4e3a72',
    text2: '#8574a8',
    accent: '#c2185b',
    green: '#00875a',
    red: '#d61f4e',
    yellow: '#b45309',
    purple: '#0e7490'
  },
  dark: {
    // Near-black with a violet cast: dark enough for the accents to read as
    // light sources rather than as coloured text.
    bg0: '#08060f',
    bg1: '#0d0a18',
    bg2: '#120e21',
    bg3: '#1b1533',
    bg4: '#2a1f4d',
    border: '#3b2a68',
    borderSoft: '#1f1739',
    text0: '#f6f2ff',
    text1: '#b9a8e0',
    text2: '#7d6ba8',
    accent: '#ff2e88',
    green: '#2bff9a',
    red: '#ff3b5c',
    yellow: '#ffb302',
    purple: '#22d3ee'
  }
}

/**
 * Syntax colours tuned to the same palette.
 *
 * Deliberately calmer than the chrome around it: the app can shout, but a diff
 * at 4am is precision work, and neon on every token is how a theme becomes
 * unreadable at hour twenty.
 */
export const HACK_CODE_THEME: CodeTheme = {
  id: 'hack-mode',
  name: 'Hack mode',
  builtin: true,
  light: {
    bg: '#ffffff',
    text: '#1b0f2e',
    comment: '#8574a8',
    keyword: '#c2185b',
    string: '#00875a',
    number: '#b45309',
    function: '#0e7490',
    title: '#0e7490',
    variable: '#1b0f2e',
    type: '#7c3aed',
    builtin: '#c2185b',
    attr: '#b45309',
    tag: '#c2185b',
    operator: '#4e3a72',
    meta: '#8574a8'
  },
  dark: {
    bg: '#0d0a18',
    text: '#e9e2fb',
    comment: '#6b5a92',
    keyword: '#ff5c9d',
    string: '#2bff9a',
    number: '#ffb302',
    function: '#22d3ee',
    title: '#22d3ee',
    variable: '#e9e2fb',
    type: '#c084fc',
    builtin: '#ff5c9d',
    attr: '#ffb302',
    tag: '#ff5c9d',
    operator: '#b9a8e0',
    meta: '#7d6ba8'
  }
}

/** Branch colours for the commit graph — the same family, in the order the
 *  graph assigns lanes, so the first two branches get the two loudest voices. */
export const HACK_GRAPH_PALETTE: GraphPalette = {
  id: 'hack-mode',
  name: 'Hack mode',
  colors: ['#ff2e88', '#22d3ee', '#2bff9a', '#ffb302', '#c084fc', '#ff7a45', '#38bdf8', '#f472b6']
}

/**
 * Graph shape: thicker rails, sharper corners, dot nodes.
 *
 * `compact` nodes rather than avatars is the one decision here that is about
 * legibility rather than looks — during an event the graph is read as a shape,
 * and eight avatars per screen turn it back into a list.
 */
export const HACK_GRAPH_STYLE: GraphStyle = {
  paletteId: 'hack-mode',
  edgeStyle: 'sharp',
  density: 'compact',
  lineWidth: 'thick',
  nodeStyle: 'compact',
  topology: 'full'
}

/** What the user had before the session took over, so it can be handed back
 *  exactly as it was — including the case where they were already using a
 *  custom theme of their own. */
export interface ThemeSnapshot {
  appThemeId: string
  codeThemeId: string
  graphStyle: GraphStyle
}
