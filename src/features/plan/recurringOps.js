import { isoDate } from '../../lib/money.js'

/**
 * recurringOps.js — higher-level recurring-rule operations for the plan lane,
 * composed ONLY from the frozen repository contract (add/delete/list).
 *
 * The contract has no update/pause primitives, so edit / pause / resume /
 * post-due are implemented as delete + re-add with merged fields. The re-added
 * rule gets a fresh id; transactions posted afterwards link to that new id.
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

async function rewriteRule(repository, rule, patch) {
  await repository.deleteRecurring(rule.id)
  try {
    return await repository.addRecurring({
      title: rule.title,
      category_id: rule.category_id ?? null,
      type: rule.type ?? 'expense',
      amount_minor: rule.amount_minor,
      currency: rule.currency,
      frequency: rule.frequency,
      interval_count: rule.interval_count ?? 1,
      next_run_date: rule.next_run_date,
      end_date: rule.end_date ?? null,
      active: rule.active ?? true,
      ...patch,
    })
  } catch (error) {
    // Re-add failed after delete — best-effort restore of the original row.
    await repository.addRecurring({
      title: rule.title,
      category_id: rule.category_id ?? null,
      type: rule.type ?? 'expense',
      amount_minor: rule.amount_minor,
      currency: rule.currency,
      frequency: rule.frequency,
      interval_count: rule.interval_count ?? 1,
      next_run_date: rule.next_run_date,
      end_date: rule.end_date ?? null,
      active: rule.active ?? true,
    }).catch(() => {})
    throw error
  }
}

/** Create or replace a rule's editable fields (title/amount/category/dates…). */
export async function updateRule(repository, rule, patch) {
  return rewriteRule(repository, rule, patch)
}

export async function setRuleActive(repository, rule, active) {
  return rewriteRule(repository, rule, { active })
}

/**
 * Post a due rule immediately: advance next_run_date first (so the schedule
 * rolls forward), then generate today's transaction linked to the new rule.
 * Returns { rule, transaction }.
 */
export async function postRuleNow(repository, rule) {
  const today = isoDate()
  const updated = await rewriteRule(repository, rule, {
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
