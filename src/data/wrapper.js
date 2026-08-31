import { createListCache, LIST_TTL_MS, PROFILE_TTL_MS } from './cache.js'
import { emitMutationChanged, MUTATION_ENTITIES } from './events.js'

/**
 * wrapper.js — decorates any repository that satisfies the contract from
 * repository.js with (a) a shared read-through cache (in-flight dedupe + TTL)
 * and (b) a mutation side-effect bus. The PUBLIC INTERFACE is unchanged:
 * every method resolves to exactly what the raw impl returns, so the smoke
 * script (which imports createDemoRepository directly) is unaffected.
 *
 * Lifted out of index.js purely so it can be unit-tested without bothering
 * Vite (this module has no import.meta.env dependency).
 */

/** Repository list/get method -> owning entity (used for cache TTL selection). */
const CACHED_METHODS = {
  listTransactions: 'transactions',
  listLedgerEntries: 'ledger',
  listEmis: 'emis',
  listBudgets: 'budgets',
  listRecurring: 'recurring',
  listCategories: 'categories',
  getProfile: 'profile',
}

export function createRepositoryWrapper(raw) {
  const cache = createListCache()
  const proxy = {}

  for (const name of Object.keys(raw)) {
    const fn = raw[name]
    if (typeof fn !== 'function') continue

    if (name in CACHED_METHODS) {
      const ttl = name === 'getProfile' ? PROFILE_TTL_MS : LIST_TTL_MS
      proxy[name] = (...args) => cache.read(name, args, () => fn.apply(raw, args), ttl)
    } else if (name in MUTATION_ENTITIES) {
      proxy[name] = async (...args) => {
        const result = await fn.apply(raw, args)
        cache.invalidateAll() // blanket invalidate: reads are cheap, mutations rare
        emitMutationChanged(name)
        return result
      }
    } else {
      proxy[name] = fn.bind(raw)
    }
  }

  proxy.__cache = cache
  return proxy
}
