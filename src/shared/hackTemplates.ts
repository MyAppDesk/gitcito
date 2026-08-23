/**
 * Built-in session templates.
 *
 * Pure data, on purpose. A template that carried behaviour — its own hooks, its
 * own detection, its own conditional UI — would multiply with every other
 * template, and a single maintainer would end up shipping combinations nobody
 * has run. Because these are only fields, composing two of them is merging
 * fields, and every value stays editable after the session starts.
 */

import type { HackTemplate } from './types'

export const BUILTIN_HACK_TEMPLATES: HackTemplate[] = [
  {
    id: 'hackathon-36h',
    nameKey: 'hack.tpl.hackathon',
    durationHours: 36,
    // Under a minute: the whole point is seeing divergence while it is still
    // one file rather than one afternoon.
    fetchSeconds: 45,
    wipPushMinutes: 20,
    freezeFromHours: 4,
    motion: 'anime',
    radarNotify: true
  },
  {
    id: 'war-room',
    nameKey: 'hack.tpl.warRoom',
    durationHours: 12,
    fetchSeconds: 30,
    wipPushMinutes: 15,
    // An incident has no demo to freeze before — the whole session is the edge.
    freezeFromHours: 0,
    // People are reading production diffs; the theatre is actively unhelpful.
    motion: 'calm',
    radarNotify: true
  },
  {
    id: 'sprint-2w',
    nameKey: 'hack.tpl.sprint',
    durationHours: 24 * 14,
    fetchSeconds: 120,
    wipPushMinutes: 0,
    freezeFromHours: 0,
    motion: 'off',
    radarNotify: false
  }
]

export function findHackTemplate(id: string, custom: HackTemplate[]): HackTemplate | null {
  return custom.find((t) => t.id === id) ?? BUILTIN_HACK_TEMPLATES.find((t) => t.id === id) ?? null
}
