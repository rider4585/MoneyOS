import { isoDate } from '../../lib/money.js'

/**
 * recurringOps.js — higher-level recurring-rule operations for the plan lane,
 * composed from the repository contract. Since T4 the contract exposes
 * updateRecurring(id, patch), so edit / pause / resume keep the rule's id
 * stable (transactions posted earlier stay linked).
 */

export const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

/** Advance an ISO date by one rule period. */
export function advanceNextRun(dateIso, frequency, intervalCount = 1) {
  const step = Math.max(1, Number(intervalCount) || 1)
  const d = new Date(`${dateIso.slice(0, 10)}T00:00:00Z`)
  switch (frequency) {
    case 'daily':
      d.setUTCDate(d.getUTCDate() + step)
      break
    case 'weekly':
      d.setUTCDate(d.getUTCDate() + 7 * step)
      break
    case 'yearly':
      d.setUTCFullYear(d.getUTCFullYear() + step)
      break
    case 'monthly':
    default:
      d.setUTCMonth(d.getUTCMonth() + step)
      break
  }
  return d.toISOString().slice(0, 10)
}

/** 'Every 2 weeks' style label from a rule's frequency fields. */
export function frequencyLabel(rule) {
  const unit = FREQUENCIES.find((f) => f.value === rule.frequency)?.label ?? rule.frequency
  const n = Number(rule.interval_count ?? 1)
  if (n <= 1) return unit
  const plural = { Daily: 'days', Weekly: 'weeks', Monthly: 'months', Yearly: 'years' }[unit] ?? unit
  return `Every ${n} ${plural}`
}

/** Create or replace a rule's editable fields (title/amount/category/dates…). */
export async function updateRule(repository, rule, patch) {
  return repository.updateRecurring(rule.id, patch)
}

export async function setRuleActive(repository, rule, active) {
  return repository.updateRecurring(rule.id, { active })
}

/**
 * Post a due rule immediately: advance next_run_date (schedule rolls forward),
 * then generate today's transaction linked to the rule. Returns { rule, transaction }.
 */
export async function postRuleNow(repository, rule) {
  const today = isoDate()
  const updated = await repository.updateRecurring(rule.id, {
    next_run_date: advanceNextRun(rule.next_run_date || today, rule.frequency, rule.interval_count),
  })
  const transaction = await repository.addTransaction({
    type: rule.type ?? 'expense',
    category_id: rule.category_id ?? null,
    amount_minor: rule.amount_minor,
    currency: rule.currency,
    note_date: today,
    description: rule.title,
    payment_method: 'Auto',
    source: 'recurring',
    recurring_rule_id: updated.id,
  })
  return { rule: updated, transaction }
}
