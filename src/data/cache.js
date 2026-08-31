/**
 * cache.js — shared read-through cache for repository list methods.
 *
 * Why: every screen refetched its own lists on every mount, so a
 * Dashboard -> Expenses -> Dashboard round trip re-ran identical Supabase
 * queries (and each query paid an extra auth round-trip). This cache makes
 * list reads:
 *   - shared across screens   (identical args => one query)
 *   - deduped while in flight (concurrent callers await ONE promise)
 *   - invalidated on any successful mutation (blanket: mutations are rare,
 *     reads are cheap; correctness beats clever invalidation graphs)
 *   - TTL-bounded (20 s) as a safety net for out-of-band changes
 *     (another tab / another device); screens stay live within that window
 *     via data-changed events instead of polling or focus storms.
 *
 * The repository PUBLIC INTERFACE is untouched — this wraps any impl that
 * satisfies repository.js and returns exactly what the impl returns
 * (fresh array copies are NOT made; callers already treat rows as
 * read-only snapshots, same as raw Supabase results).
 */

export const LIST_TTL_MS = 20_000
export const PROFILE_TTL_MS = 5 * 60_000

/** list method name -> owning entity tag (used only for docs/debug). */
export const CACHED_LISTS = {
  listTransactions: 'transactions',
  listLedgerEntries: 'ledger',
  listEmis: 'emis',
  listBudgets: 'budgets',
  listRecurring: 'recurring',
  listCategories: 'categories',
  getProfile: 'profile',
}

export function createListCache() {
  const entries = new Map() // key -> { value, at }
  const inflight = new Map() // key -> Promise

  function keyOf(method, args) {
    return `${method}:${JSON.stringify(args ?? [])}`
  }

  return {
    /** Read-through with in-flight dedupe. `run` must return a Promise. */
    read(method, args, run, ttlMs = LIST_TTL_MS) {
      const key = keyOf(method, args)
      const hit = entries.get(key)
      if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value)
      const pending = inflight.get(key)
      if (pending) return pending
      const promise = Promise.resolve()
        .then(run)
        .then((value) => {
          entries.set(key, { value, at: Date.now() })
          inflight.delete(key)
          return value
        })
        .catch((error) => {
          inflight.delete(key) // failures are never cached
          throw error
        })
      inflight.set(key, promise)
      return promise
    },

    /** Drop every cached list (called after any successful mutation). */
    invalidateAll() {
      entries.clear()
    },

    /** Stats hook for the cost-audit doc / dev debugging. */
    stats() {
      return { cached: entries.size, inflight: inflight.size }
    },
  }
}
