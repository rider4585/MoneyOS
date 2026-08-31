/**
 * events.js — app-wide data reactivity bus (data-layer owned).
 *
 * After every SUCCESSFUL repository mutation the wrapper in index.js emits:
 *   window 'moneyos:data-changed'  detail { entities: ['transactions', …], at }
 * and, for backwards compatibility with the original wiring, also
 *   window 'moneyos:transactions-changed'
 * whenever 'transactions' is among the touched entities.
 *
 * Screens never call this directly — they subscribe with useDataChanged()
 * so ANY mutation (from the FAB sheet, a screen's own sheet, or a future
 * caller) instantly refreshes every mounted screen showing that data, in
 * BOTH repository implementations (the wrapper sits above them).
 */

export const DATA_CHANGED_EVENT = 'moneyos:data-changed'
export const LEGACY_TRANSACTIONS_EVENT = 'moneyos:transactions-changed'

/** repository method -> entity(ies) it can change. Reads/init are absent. */
export const MUTATION_ENTITIES = {
  addTransaction: ['transactions'],
  updateTransaction: ['transactions'],
  deleteTransaction: ['transactions'],
  addLedgerEntry: ['ledger'],
  settleLedgerEntry: ['ledger'],
  addEmi: ['emis'],
  recordInstallment: ['emis'],
  setBudget: ['budgets'],
  deleteBudget: ['budgets'],
  addRecurring: ['recurring'],
  updateRecurring: ['recurring'],
  deleteRecurring: ['recurring'],
  // Category deletes cascade (budgets) and unlink (txns/recurring), so any
  // category write may touch several datasets — subscribers refetch cheaply
  // thanks to the shared cache in cache.js.
  addCategory: ['categories', 'transactions', 'budgets', 'recurring'],
  updateCategory: ['categories'],
  deleteCategory: ['categories', 'transactions', 'budgets', 'recurring'],
}

/** Emit after a successful mutation of `method`. No-op for reads/unknown. */
export function emitMutationChanged(method) {
  const entities = MUTATION_ENTITIES[method]
  if (!entities) return false
  try {
    window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail: { entities, method } }))
    if (entities.includes('transactions')) {
      window.dispatchEvent(new CustomEvent(LEGACY_TRANSACTIONS_EVENT))
    }
  } catch {
    /* window unavailable (non-DOM harness) — events are best-effort */
  }
  return true
}

/**
 * Subscribe to data-changed notifications.
 * @param {(detail: {entities: string[], method: string}) => void} handler
 * @returns {() => void} unsubscribe
 */
export function onDataChanged(handler) {
  const listener = (event) => handler(event.detail ?? { entities: [] })
  try {
    window.addEventListener(DATA_CHANGED_EVENT, listener)
    return () => window.removeEventListener(DATA_CHANGED_EVENT, listener)
  } catch {
    return () => {}
  }
}
