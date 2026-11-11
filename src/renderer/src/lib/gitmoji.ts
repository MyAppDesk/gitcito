// Renderer side of gitmoji: dictionary keys for each entry's intent, and the
// picker's search. The catalogue and the text logic live in shared/gitmoji.ts.
import type { TranslationKey } from '../i18n'
import { GITMOJI_CATALOG, type Gitmoji, type GitmojiCode } from '../../../shared/gitmoji'

/** Intent label per gitmoji. A Record over the code union, so a gitmoji added
 *  to the catalogue without a label is a compile error rather than a blank row. */
export const GITMOJI_LABELS: Record<GitmojiCode, TranslationKey> = {
  art: 'gitmoji.format',
  zap: 'gitmoji.performance',
  fire: 'gitmoji.remove',
  bug: 'gitmoji.fix',
  ambulance: 'gitmoji.hotfix',
  sparkles: 'gitmoji.feature',
  memo: 'gitmoji.docs',
  rocket: 'gitmoji.deploy',
  lipstick: 'gitmoji.style',
  tada: 'gitmoji.init',
  white_check_mark: 'gitmoji.tests',
  lock: 'gitmoji.security',
  closed_lock_with_key: 'gitmoji.secrets',
  bookmark: 'gitmoji.release',
  rotating_light: 'gitmoji.lintWarnings',
  construction: 'gitmoji.wip',
  green_heart: 'gitmoji.fixCi',
  arrow_down: 'gitmoji.downgradeDeps',
  arrow_up: 'gitmoji.upgradeDeps',
  pushpin: 'gitmoji.pinDeps',
  construction_worker: 'gitmoji.ci',
  chart_with_upwards_trend: 'gitmoji.analytics',
  recycle: 'gitmoji.refactor',
  heavy_plus_sign: 'gitmoji.addDep',
  heavy_minus_sign: 'gitmoji.removeDep',
  wrench: 'gitmoji.chore',
  hammer: 'gitmoji.devScripts',
  globe_with_meridians: 'gitmoji.i18n',
  pencil2: 'gitmoji.typos',
  poop: 'gitmoji.badCode',
  rewind: 'gitmoji.revert',
  twisted_rightwards_arrows: 'gitmoji.merge',
  package: 'gitmoji.packages',
  alien: 'gitmoji.externalApi',
  truck: 'gitmoji.move',
  page_facing_up: 'gitmoji.license',
  boom: 'gitmoji.breaking',
  bento: 'gitmoji.assets',
  wheelchair: 'gitmoji.accessibility',
  bulb: 'gitmoji.comments',
  beers: 'gitmoji.drunk',
  speech_balloon: 'gitmoji.text',
  card_file_box: 'gitmoji.database',
  loud_sound: 'gitmoji.addLogs',
  mute: 'gitmoji.removeLogs',
  busts_in_silhouette: 'gitmoji.contributors',
  children_crossing: 'gitmoji.ux',
  building_construction: 'gitmoji.architecture',
  iphone: 'gitmoji.responsive',
  clown_face: 'gitmoji.mock',
  egg: 'gitmoji.easterEgg',
  see_no_evil: 'gitmoji.gitignore',
  camera_flash: 'gitmoji.snapshots',
  alembic: 'gitmoji.experiment',
  mag: 'gitmoji.seo',
  label: 'gitmoji.types',
  seedling: 'gitmoji.seeds',
  triangular_flag_on_post: 'gitmoji.featureFlags',
  goal_net: 'gitmoji.catchErrors',
  dizzy: 'gitmoji.animations',
  wastebasket: 'gitmoji.deprecate',
  passport_control: 'gitmoji.auth',
  adhesive_bandage: 'gitmoji.simpleFix',
  monocle_face: 'gitmoji.dataExploration',
  coffin: 'gitmoji.deadCode',
  test_tube: 'gitmoji.failingTest',
  necktie: 'gitmoji.businessLogic',
  stethoscope: 'gitmoji.healthcheck',
  bricks: 'gitmoji.infra',
  technologist: 'gitmoji.devExperience',
  money_with_wings: 'gitmoji.sponsorship',
  thread: 'gitmoji.concurrency',
  safety_vest: 'gitmoji.validation',
  airplane: 'gitmoji.offline',
  't-rex': 'gitmoji.backCompat'
}

// Accent- and case-insensitive, so "pre" finds "préstamo" and "ACESSO" finds "acesso".
const fold = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

/**
 * Filter the catalogue for the picker. Matches the emoji itself, the code
 * (`spark`, with or without colons — what gitmoji-cli users type) and the
 * translated label (`labelOf` resolves it, so search works in every locale).
 * Code-prefix matches rank first, then the rest in catalogue order.
 */
export function searchGitmoji(query: string, labelOf: (key: TranslationKey) => string): Gitmoji[] {
  const q = fold(query.trim().replace(/^:|:$/g, ''))
  if (!q) return [...GITMOJI_CATALOG]
  const prefix: Gitmoji[] = []
  const other: Gitmoji[] = []
  for (const g of GITMOJI_CATALOG) {
    if (g.code.startsWith(q)) prefix.push(g)
    else if (
      g.code.includes(q) ||
      g.emoji.includes(query.trim()) ||
      fold(labelOf(GITMOJI_LABELS[g.code])).includes(q)
    )
      other.push(g)
  }
  return [...prefix, ...other]
}
