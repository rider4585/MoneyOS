import { useCallback, useMemo, useSyncExternalStore } from 'react'
import repository from '../data/index.js'

/**
 * categories.js — THE single category registry for both lanes (T4 dedupe).
 *
 * Backed by the repository contract (listCategories / addCategory /
 * updateCategory / deleteCategory), so demo and Supabase modes share one
 * source of truth: renames made in Settings show up instantly in expense
 * chips, transaction rows, budget pickers and recurring forms. Renames keep
 * ids stable so transaction/budget/recurring references survive.
 */

let cache = []
let loaded = false
let version = 0
const listeners = new Set()
let pendingLoad = null

function emit() {
  version += 1
  listeners.forEach((listener) => listener())
}

/** Pull categories through the active repository impl into the shared cache. */
export function refreshCategories() {
  if (pendingLoad) return pendingLoad
  pendingLoad = repository
    .listCategories()
    .then((rows) => {
      cache = Array.isArray(rows) ? rows : []
      loaded = true
      emit()
      return cache.map((c) => ({ ...c }))
    })
    .catch((error) => {
      console.error('[categories] load failed', error)
      return []
    })
    .finally(() => {
      pendingLoad = null
    })
  return pendingLoad
}

/** Synchronous snapshot of the current cache (empty before first load). */
export function listCategories() {
  return cache.map((c) => ({ ...c }))
}

export function categoryById(id) {
  return cache.find((c) => c.id === id) ?? null
}

export function categoriesFor(kind) {
  return cache.filter((c) => c.kind === kind)
}

export const FALLBACK_CATEGORY = { id: null, name: 'Uncategorised', kind: 'expense', color: '#94A3B8', icon: 'circle-ellipsis' }

/** Create via the repository, then resync every subscribed screen. */
export async function addCategory(input) {
  const row = await repository.addCategory(input)
  await refreshCategories()
  return row
}

/** Patch name/color/icon/kind via the repository, then resync. */
export async function updateCategory(id, patch) {
  const row = await repository.updateCategory(id, patch)
  await refreshCategories()
  return row
}

/** Delete via the repository (txns/recurring unlinked, budgets cascade), then resync. */
export async function deleteCategory(id) {
  await repository.deleteCategory(id)
  await refreshCategories()
}

const getVersion = () => version

/** React binding — shared { categories, byId, loaded } kept in sync app-wide. */
export function useCategories() {
  const subscribe = useCallback((listener) => {
    listeners.add(listener)
    if (!loaded && !pendingLoad) refreshCategories()
    return () => listeners.delete(listener)
  }, [])
  useSyncExternalStore(subscribe, getVersion, getVersion)

  return useMemo(() => {
    const categories = listCategories()
    const byId = Object.fromEntries(categories.map((category) => [category.id, category]))
    return { categories, byId, loaded }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])
}
