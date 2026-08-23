/**
 * dates.js — month/date helpers for the plan screens (UTC-consistent,
 * matching lib/money.js conventions: ISO 'YYYY-MM-DD', months as 'YYYY-MM-01').
 */

/** Shift a 'YYYY-MM-01' month marker by n months. */
export function addMonthsIso(monthIso, n) {
  const d = new Date(`${monthIso}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + n)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
}

/** 'August 2026' style label from a 'YYYY-MM[-DD]' string. */
export function monthLabel(monthIso) {
  return new Date(`${monthIso.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Whole days from today until `dateIso` (negative = past). */
export function daysUntil(dateIso) {
  const today = new Date()
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const target = Date.parse(`${dateIso.slice(0, 10)}T00:00:00Z`)
  return Math.round((target - todayUtc) / 86_400_000)
}

/** Human countdown for an upcoming/overdue date: 'Due today' / 'in 8d' / 'overdue 2d'. */
export function countdownLabel(dateIso) {
  const n = daysUntil(dateIso)
  if (n === 0) return 'Due today'
  if (n === 1) return 'Due tomorrow'
  if (n > 1) return `in ${n} days`
  if (n === -1) return '1 day overdue'
  return `${Math.abs(n)} days overdue`
}
