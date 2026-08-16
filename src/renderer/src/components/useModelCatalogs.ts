import { useEffect, useRef, useState } from 'react'
import type { AIConfig, ModelCatalog } from '../../../shared/types'
import { resolveAI } from '../../../shared/aiAccounts'
import { aiApi } from '../infrastructure/api'

/**
 * Live model lists for every configured account, keyed by account id.
 *
 * The main process caches each list on disk for a day, so mounting a surface
 * that shows a model picker costs a cheap IPC round-trip rather than a request
 * per provider. Each account is asked for once per mount — the guard matters,
 * because `ai` changes identity on every keystroke in Settings.
 *
 * Returns the raw catalogues so a caller can tell a live list from the bundled
 * fallback; `refresh` bypasses the cache for one account.
 */
export function useModelCatalogs(ai: AIConfig): {
  catalogs: Record<string, ModelCatalog>
  loading: string[]
  refresh: (accountId: string) => Promise<ModelCatalog | null>
} {
  const [catalogs, setCatalogs] = useState<Record<string, ModelCatalog>>({})
  const [loading, setLoading] = useState<string[]>([])
  const requested = useRef<Set<string>>(new Set())
  const latest = useRef(ai)
  latest.current = ai

  const load = async (accountId: string, force: boolean): Promise<ModelCatalog | null> => {
    setLoading((ids) => (ids.includes(accountId) ? ids : [...ids, accountId]))
    try {
      const cfg = resolveAI({ ...latest.current, defaultAccountId: accountId })
      const catalog = await aiApi.listModels(cfg, force)
      setCatalogs((prev) => ({ ...prev, [accountId]: catalog }))
      return catalog
    } finally {
      setLoading((ids) => ids.filter((id) => id !== accountId))
    }
  }

  const ids = (ai.accounts ?? []).map((a) => a.id).join(',')
  useEffect(() => {
    for (const account of latest.current.accounts ?? []) {
      if (requested.current.has(account.id)) continue
      requested.current.add(account.id)
      void load(account.id, false)
    }
    // Keyed on the account ids alone: the config object itself changes far more
    // often than the set of accounts does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids])

  return { catalogs, loading, refresh: (accountId) => load(accountId, true) }
}
