import { INR } from './money.js'

const FX_ENDPOINT = 'https://open.er-api.com/v6/latest/USD'

/**
 * fx.js — entry-time currency snapshot (board.md binding rule).
 * Fetched ONCE per app entry, only when the user picks a non-INR currency.
 * The returned rate is cached in the row (fx_rate_to_inr) forever — later
 * display/aggregation never re-fetches; display is always INR.
 */

let ratesPromise = null

function sessionCacheGet(currency) {
  try {
    const raw = sessionStorage.getItem(`moneyos.fx.${currency}`)
    if (!raw) return null
    const { rate, at } = JSON.parse(raw)
    // Session-scoped cache: refresh after 12h inside one long-lived tab.
    if (Date.now() - at < 12 * 60 * 60 * 1000 && rate > 0) return rate
  } catch { /* storage unavailable (private mode) — fall through */ }
  return null
}

function sessionCacheSet(currency, rate) {
  try {
    sessionStorage.setItem(`moneyos.fx.${currency}`, JSON.stringify({ rate, at: Date.now() }))
  } catch { /* ignore */ }
}

async function fetchUsdRates() {
  const res = await fetch(FX_ENDPOINT)
  if (!res.ok) throw new Error(`fx: ${FX_ENDPOINT} responded ${res.status}`)
  const json = await res.json()
  if (json.result !== 'success' || !json.rates?.INR) {
    throw new Error('fx: unexpected payload from open.er-api.com')
  }
  return json.rates
}

/**
 * Rate that converts 1 unit of `currency` to INR.
 * @param {string} currency ISO-4217 code; INR short-circuits to 1.
 * @returns {Promise<number>} fx_rate_to_inr (> 0)
 */
export async function fetchFxRateToInr(currency) {
  if (!currency || currency === INR) return 1
  const cached = sessionCacheGet(currency)
  if (cached) return cached

  ratesPromise = ratesPromise || fetchUsdRates()
  let rates
  try {
    rates = await ratesPromise
  } catch (err) {
    ratesPromise = null // allow retry on next entry attempt
    throw err
  }
  const usdToInr = rates.INR
  const usdToCurrency = rates[currency]
  if (!(usdToCurrency > 0)) {
    throw new Error(`fx: unsupported currency "${currency}"`)
  }
  const rate = Math.round((usdToInr / usdToCurrency) * 1e8) / 1e8
  sessionCacheSet(currency, rate)
  return rate
}

/** True when a row's stored snapshot indicates foreign-currency origin. */
export function isForeignRow(row) {
  return Boolean(row?.currency && row.currency !== INR)
}
