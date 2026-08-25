// Pure helpers for the stacked-PR autopilot: planning which PRs to create or
// retarget for a stack, and maintaining the stack-navigation section each PR
// carries in its body. Shared main ↔ renderer, no I/O — the renderer plans and
// renders, the main process merges the section into live PR bodies.
import type { StackInfo } from './types'

/** What `planStackSubmit` decides per stack level. */
export interface StackPrAction {
  branch: string
  /** The PR base this level must have: its parent branch, or the trunk. */
  base: string
  /** create = no open PR for this branch; retarget = PR exists on a wrong base;
   *  ok = PR exists and already points at the right base. */
  action: 'create' | 'retarget' | 'ok'
  /** Existing PR number/url (retarget/ok only). */
  number?: number
  url?: string
}

/** The slice of a pull request the planner needs (from `listPullRequests`). */
export interface OpenPrSlice {
  id: number
  sourceBranch: string
  targetBranch: string
  url: string
}

/**
 * Decide, per stack level bottom→top, whether its PR must be created,
 * retargeted, or left alone. Idempotent by construction: running the resulting
 * actions and planning again yields all-'ok'.
 */
export function planStackSubmit(stack: StackInfo, openPrs: OpenPrSlice[], fallbackTrunk: string): StackPrAction[] {
  const trunk = stack.trunk || fallbackTrunk
  const byBranch = new Map(openPrs.map((p) => [p.sourceBranch, p]))
  return stack.branches.map((b) => {
    const base = b.parent && b.parent !== trunk ? b.parent : trunk
    const pr = byBranch.get(b.name)
    if (!pr) return { branch: b.name, base, action: 'create' }
    if (pr.targetBranch !== base)
      return { branch: b.name, base, action: 'retarget', number: pr.id, url: pr.url }
    return { branch: b.name, base, action: 'ok', number: pr.id, url: pr.url }
  })
}

export const STACK_SECTION_START = '<!-- gitcito-stack -->'
export const STACK_SECTION_END = '<!-- /gitcito-stack -->'

/** One rendered line of the stack table. */
export interface StackSectionLevel {
  branch: string
  number: number
}

/**
 * The Markdown block a stacked PR carries so reviewers can navigate the chain.
 * Levels arrive bottom→top and are rendered top→bottom (reading order of a
 * review: leaf first). `self` gets the pointer. Body copy is deliberately
 * English — it lives on the hosting provider, not in the app's UI.
 */
export function buildStackSection(levels: StackSectionLevel[], self: number, trunk: string): string {
  const rows = [...levels]
    .reverse()
    .map((l) => `- ${l.number === self ? '**' : ''}#${l.number}${l.number === self ? ' ◀**' : ''} \`${l.branch}\``)
  return [
    STACK_SECTION_START,
    '---',
    `**Stack** (top → bottom, lands on \`${trunk}\`):`,
    ...rows,
    '',
    '_Managed by [Gitcito](https://myappdesk.github.io/gitcito/) — merge bottom-up._',
    STACK_SECTION_END
  ].join('\n')
}

/** Insert or replace the marked stack section in a PR body, preserving the rest. */
export function mergeStackSection(body: string, section: string): string {
  const start = body.indexOf(STACK_SECTION_START)
  const end = body.indexOf(STACK_SECTION_END)
  if (start !== -1 && end !== -1 && end > start) {
    return body.slice(0, start) + section + body.slice(end + STACK_SECTION_END.length)
  }
  const trimmed = body.trimEnd()
  return trimmed ? `${trimmed}\n\n${section}` : section
}

/** What a submit is about to do, in numbers the user can be asked about. */
export interface StackPlanSummary {
  create: number
  retarget: number
  ok: number
  /** One "branch → base" line per level that will change, top level first. */
  lines: string[]
}

/**
 * Fold a plan into the sentence a confirmation needs. Opening pull requests is
 * outward-facing and hard to take back, so the dialog says exactly how many and
 * against what, rather than "submit stack?".
 */
export function summariseStackPlan(plan: StackPrAction[]): StackPlanSummary {
  const changing = plan.filter((a) => a.action !== 'ok')
  return {
    create: plan.filter((a) => a.action === 'create').length,
    retarget: plan.filter((a) => a.action === 'retarget').length,
    ok: plan.filter((a) => a.action === 'ok').length,
    lines: changing
      .slice()
      .reverse()
      .map((a) => `${a.branch} → ${a.base}`)
  }
}
