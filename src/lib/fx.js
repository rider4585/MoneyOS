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

// ---------------------------------------------------------------------------
// Persistent last-known-rate store. Unlike the session cache (which is the
// live-accuracy layer and refreshes each session), this is an OFFLINE fallback:
// rates are written whenever they are fetched successfully and read when the
// device is offline so a non-INR entry can still be converted (the "old cached
// rates" the user asked for). Bounded to 30 days so it never converts with a
// very stale rate when a net connection is available.
// ---------------------------------------------------------------------------
const LAST_KEY = 'moneyos.fx.last'
const LAST_TTL_MS = 30 * 24 * 60 * 60 * 1000

function lastKnownRead() {
  try {
    const raw = localStorage.getItem(LAST_KEY)
    if (!raw) return {}
    const { rates, at } = JSON.parse(raw)
    if (Date.now() - at > LAST_TTL_MS) return {}
    return rates && typeof rates === 'object' ? rates : {}
  } catch {
    return {}
  }
}

function lastKnownWrite(rates) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({ rates, at: Date.now() }))
  } catch { /* quota/private mode �?" best effort */ }
}

/** Synchronous INR<->foreign fallback rate from the persistent store. */
export function getLastKnownRate(currency) {
  if (!currency || currency === INR) return 1
  const rates = lastKnownRead()
  const usdToInr = rates.INR
  const usdToCurrency = rates[currency]
  if (!(usdToInr > 0) || !(usdToCurrency > 0)) return null
  return Math.round((usdToInr / usdToCurrency) * 1e8) / 1e8
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

/** Drop all session-cached rates so the next fetch hits the live endpoint. */
export function clearFxSessionCache() {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith('moneyos.fx.')) sessionStorage.removeItem(key)
    }
  } catch {
    /* storage unavailable (private mode) �?" ignore */
  }
  ratesPromise = null
}

/**
 * Force a fresh fetch of the base USD table, resetting this session's cached
 * rates so the next fetchFxRateToInr() calls hit the live endpoint. Used when
 * the user opens the currency dropdown so they always see the LATEST rates.
 * @returns {Promise<Record<string, number>>} the raw per-USD rate map
 */
export async function refreshFxRates() {
  clearFxSessionCache()
  return fetchUsdRates()
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

  ratesPromise = ratesPromise || fetchUsdRates().catch((err) => {
    ratesPromise = null // allow retry on next entry attempt
    throw err
  })
  let rates
  try {
    rates = await ratesPromise
  } catch {
    // Network failure (offline) �?" fall back to the persistent last-known rate
    // so a non-INR entry can still be converted instead of hard-failing.
    const fallback = getLastKnownRate(currency)
    if (fallback) return fallback
    throw new Error(`fx: no rate for "${currency}" while offline`)
  }
  const usdToInr = rates.INR
  const usdToCurrency = rates[currency]
  if (!(usdToCurrency > 0)) {
    throw new Error(`fx: unsupported currency "${currency}"`)
  }
  const rate = Math.round((usdToInr / usdToCurrency) * 1e8) / 1e8
  sessionCacheSet(currency, rate)
  lastKnownWrite(rates)
  return rate
}

/** True when a row's stored snapshot indicates foreign-currency origin. */
export function isForeignRow(row) {
  return Boolean(row?.currency && row.currency !== INR)
}
