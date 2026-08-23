import { DEMO_MODE } from '../../data/index.js'
import { buildSeedData } from '../../data/seedData.js'

/**
 * installments.js — client-side installment history for the EMI screen.
 *
 * The FROZEN repository contract exposes recordInstallment() but no
 * installments getter, so the screen rebuilds history as:
 *   - DEMO_MODE: the deterministic seed rows (same data demoRepository
 *     persists on first init — read-only consumption of the exported
 *     builder), plus
 *   - every row this session returned from recordInstallment().
 *
 * When a listInstallments accessor lands in the data layer this module is
 * the single swap point.
 */

let sessionRows = []
let seedRows = null

function seedInstallmentsOnce() {
  if (seedRows || !DEMO_MODE) return seedRows ?? []
  try {
    seedRows = buildSeedData().emiInstallments
  } catch {
    seedRows = []
  }
  return seedRows
}

/** Remember a row returned by repository.recordInstallment(). */
export function rememberInstallment(row) {
  if (row?.id) sessionRows = [...sessionRows.filter((r) => r.id !== row.id), row]
}

/** Newest-first history for one loan (seed + session-recorded). */
export function installmentsFor(emiId) {
  const seen = new Set()
  const all = []
  for (const row of [...sessionRows, ...seedInstallmentsOnce()]) {
    if (row.emi_id !== emiId || seen.has(row.id)) continue
    seen.add(row.id)
    all.push(row)
  }
  return all.sort((a, b) => b.paid_on.localeCompare(a.paid_on))
}

/** Total paid installments for one loan (contract has no delete, so counts just add). */
export function installmentCount(emiId) {
  return (
    sessionRows.filter((r) => r.emi_id === emiId).length +
    seedInstallmentsOnce().filter((r) => r.emi_id === emiId).length
  )
}
