import { defaultCategories } from '../../data/seedData.js'

/**
 * categories.js — category metadata for the money screens.
 *
 * The repository contract (repository.js) is FROZEN and exposes no
 * listCategories accessor, so screens resolve category metadata from the
 * canonical default set exported by the data layer's seed module
 * (read-only consumption — same list the demo store and Supabase signup
 * trigger provision). If a richer accessor lands upstream this module is
 * the single swap point.
 */

export const MONEY_CATEGORIES = defaultCategories()

const BY_ID = new Map(MONEY_CATEGORIES.map((c) => [c.id, c]))

export function categoryById(id) {
  return BY_ID.get(id) ?? null
}

export function categoriesFor(kind) {
  return MONEY_CATEGORIES.filter((c) => c.kind === kind)
}

/** lucide icon names are stored as strings in seeds; money screens use a color dot instead of resolving icons. */
export const FALLBACK_CATEGORY = { id: null, name: 'Uncategorised', kind: 'expense', color: '#94A3B8', icon: 'circle-ellipsis' }
