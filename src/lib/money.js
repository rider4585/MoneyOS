/**
 * money.js — minor-unit (paise) helpers. Binding conventions:
 *   - Money is ALWAYS integer minor units; never floats in storage.
 *   - inr_minor = round(native_minor * fx_rate_to_inr) — single rounding point.
 */

export const INR = 'INR'

/** Round to nearest paise, guarding float noise. */
export function toMinor(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`money.toMinor: invalid amount ${value}`)
  }
  return Math.round(n)
}

/** Native minor -> INR minor using the row's entry-time fx snapshot. */
export function toInrMinor(amountMinor, fxRateToInr) {
  const rate = Number(fxRateToInr)
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`money.toInrMinor: invalid fx rate ${fxRateToInr}`)
  }
  return Math.round(Number(amountMinor) * rate)
}

/**
 * Snapshot a multi-currency amount at entry time.
 * @returns {{ amount_minor:number, currency:string, fx_rate_to_inr:number, inr_amount_minor:number }}
 */
export function snapshotAmount(amountMinor, currency = INR, fxRateToInr = 1) {
  const amount = toMinor(amountMinor)
  const rate = currency === INR ? 1 : Number(fxRateToInr)
  if (currency !== INR && !(rate > 0)) {
    throw new Error(`snapshotAmount: non-INR row needs a positive fx rate (${currency})`)
  }
  return { amount_minor: amount, currency, fx_rate_to_inr: rate, inr_amount_minor: toInrMinor(amount, rate) }
}

const INR_FMT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

/** Display formatting — always INR, from an *_inr_minor value. */
export function formatInr(inrMinor, { compact = false } = {}) {
  const rupees = Math.round(Number(inrMinor) / 100)
  if (compact && Math.abs(rupees) >= 100000) {
    return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1, notation: 'compact' }).format(rupees)}`
  }
  return INR_FMT.format(rupees)
}

/** ISO date (YYYY-MM-DD) for "now" or a Date. */
export function isoDate(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

/** First day of the month containing `date`, as ISO date (budgets.month). */
export function monthStart(date = new Date()) {
  const d = new Date(date)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
}
