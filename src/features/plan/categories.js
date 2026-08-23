import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { defaultCategories } from '../../data/seedData.js'

/**
 * categories.js — plan-lane category registry.
 *
 * The frozen repository contract (repository.js) exposes no category methods,
 * so the Settings category manager (and every plan screen that renders a
 * category name/color) uses this small localStorage-backed registry instead.
 * It is seeded from the same defaultCategories() the data layer seeds with,
 * so ids stay consistent ('cat-food-dining', …). Renames keep ids stable so
 * budget/recurring references survive. Swapped for contract methods if/when
 * the contract grows them.
 */

const STORAGE_KEY = 'moneyos.plan.categories.v1'

let cache = null
let version = 0
const listeners = new Set()

function persist() {
  version += 1
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {
    /* private-mode quota — registry stays in memory for this session */
  }
  listeners.forEach((listener) => listener())
}

function read() {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      cache = JSON.parse(raw)
      return cache
    }
  } catch {
    /* corrupt row — fall through to reseed */
  }
  cache = defaultCategories()
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {
    /* ignore */
  }
  return cache
}

export function listCategories() {
  return read().map((category) => ({ ...category }))
}

export function addCategory({ name, kind = 'expense', color = '#8B5CF6' }) {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) throw new Error('addCategory: name is required')
  const rows = read()
  const slug = trimmed.toLowerCase().replace(/[^a-z]+/g, '-') || 'custom'
  let id = `cat-${slug}`
  let suffix = 2
  while (rows.some((row) => row.id === id)) {
    id = `cat-${slug}-${suffix++}`
  }
  const maxSort = rows.reduce((max, row) => Math.max(max, row.sort_order ?? 0), 0)
  const row = { id, name: trimmed, kind, color, icon: 'circle', sort_order: maxSort + 10 }
  cache = [...rows, row]
  persist()
  return { ...row }
}

export function renameCategory(id, name) {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) throw new Error('renameCategory: name is required')
  const rows = read()
  const row = rows.find((entry) => entry.id === id)
  if (!row) throw new Error(`renameCategory: unknown id ${id}`)
  row.name = trimmed
  cache = [...rows]
  persist()
  return { ...row }
}

export function deleteCategory(id) {
  const rows = read()
  const before = rows.length
  cache = rows.filter((row) => row.id !== id)
  if (cache.length === before) throw new Error(`deleteCategory: unknown id ${id}`)
  persist()
}

export function subscribeCategories(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getVersion() {
  read()
  return version
}

/** React binding — { categories, byId } kept in sync across components. */
export function usePlanCategories() {
  const subscribe = useCallback((listener) => subscribeCategories(listener), [])
  useSyncExternalStore(subscribe, getVersion, getVersion)

  return useMemo(() => {
    const categories = listCategories()
    const byId = Object.fromEntries(categories.map((category) => [category.id, category]))
    return { categories, byId }
  }, [version])
}
