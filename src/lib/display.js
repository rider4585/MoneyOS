import { INR } from './money.js'
import { getLastKnownRate } from './fx.js'

/**
 * display.js — user-facing display currency (INR vs USD).
 *
 * The data layer is ALWAYS INR minor units (inr_amount_minor); this module
 * only changes how those numbers are RENDERED. Nothing here touches storage
 * or aggregation — pure presentation.
 */

export const DISPLAY_CURRENCY_KEY = 'moneyos.display_currency'
export const DEFAULT_DISPLAY_CURRENCY = INR

/** Currencies the user may choose to view amounts in. */
export const DISPLAY_CURRENCIES = [INR, 'USD']

/** Best-effort localStorage read; defaults to INR when unset/unavailable. */
export function resolveDisplayCurrency() {
  try {
    const raw = localStorage.getItem(DISPLAY_CURRENCY_KEY)
    if (DISPLAY_CURRENCIES.includes(raw)) return raw
  } catch {
    /* storage unavailable (private mode) — fall through */
  }
  return DEFAULT_DISPLAY_CURRENCY
}

/** Persist the display-currency choice. Ignores unsupported values. */
export function setDisplayCurrency(currency) {
  if (!DISPLAY_CURRENCIES.includes(currency)) return
  try {
    localStorage.setItem(DISPLAY_CURRENCY_KEY, currency)
  } catch {
    /* quota/private mode — best effort */
  }
}

const COMPACT_THRESHOLD = 100000 // 1 lakh in the target currency's main unit

const FORMATTERS = new Map()

function formatterFor(currency, compact = false) {
  const key = `${currency}:${compact ? 'compact' : 'full'}`
  if (!FORMATTERS.has(key)) {
    const isInr = currency === INR
    FORMATTERS.set(
      key,
      new Intl.NumberFormat(isInr ? 'en-IN' : 'en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: isInr ? 0 : 2,
        ...(compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}),
      })
    )
  }
  return FORMATTERS.get(key)
}

/**
 * Convert an INR-minor (paise) integer into the target currency's main unit
 * (rupees for INR, dollars for USD). Uses the stored/last-known fx rate
 * (sync, offline-capable). Returns null when no rate is available yet.
 */
export function toDisplayAmount(inrMinor, targetCurrency = resolveDisplayCurrency()) {
  const rupees = Number(inrMinor) / 100
  if (targetCurrency === INR) return rupees
  const rateToInr = getLastKnownRate(targetCurrency)
  if (!(rateToInr > 0)) return null
  return rupees / rateToInr
}

/**
 * Format an inr_amount_minor integer for display in `targetCurrency`
 * (default: the user's chosen display currency). Compact notation kicks in
 * past ₹1L / $100K, mirroring the old formatInr month-total behaviour.
 */
export function formatMinorToDisplay(inrMinor, targetCurrency = resolveDisplayCurrency(), { compact = false } = {}) {
  const units = toDisplayAmount(inrMinor, targetCurrency)
  if (units === null) {
    // No stored rate for the target yet — amounts are INR in storage, so
    // falling back to the INR figure is always truthful.
    const inrUnits = Number(inrMinor) / 100
    return (formatterFor(INR, compact && Math.abs(inrUnits) >= COMPACT_THRESHOLD)).format(inrUnits)
  }
  const useCompact = compact && Math.abs(units) >= COMPACT_THRESHOLD
  return formatterFor(targetCurrency, useCompact).format(units)
}

/**
 * General display formatter for a native-currency row: given its entry-time
 * snapshot (amount_minor + fx_rate_to_inr), render it in `targetCurrency`
 * (default: the user's display currency). Native units are converted to INR
 * minor first, then to the target — the single-rounding-axis approach.
 */
export function formatDisplay(amountNative, fxRateToInr, targetCurrency = resolveDisplayCurrency()) {
  const native = Number(amountNative)
  const rate = Number(fxRateToInr)
  const inrMinor = Math.round(native * (rate > 0 ? rate : 1))
  return formatMinorToDisplay(inrMinor, targetCurrency)
}