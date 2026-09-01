# MoneyOS v0.2.0 — Live QA Checklist

Run on the deployed app at `https://money-os-lac.vercel.app`. Tick each box that passes; note failures with a screenshot where possible.

## 0. Prereqs (human-side, unblocks login)
- [ ] Add `https://money-os-lac.vercel.app` to **Google OAuth** JS origins + redirect URIs (Google Cloud Console).
- [ ] Add `https://money-os-lac.vercel.app/**` to **Supabase** Auth → URL Configuration → Redirect URLs.
- [ ] (Verify) confirm Supabase env vars are set on Vercel (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and `DEMO_MODE` is off.

## 1. Auth & first load
- [ ] `Continue with Google` → signs in back to `money-os-lac.vercel.app` (not localhost), stays signed-in on reload.
- [ ] PWA install banner "Install MoneyOS" appears. Dismiss with ✕ → does not reappear this session.
- [ ] Settings → App shows **Version 0.2.0**.

## 2. Themed-text contrast (R4)
- [ ] Switch theme light/dark: Settings profile name, Daily spend / Budget watch / EMIs / Recent activity headings all readable in both themes.

## 3. PWA install & updates (R5)
- [ ] Install as app (Add to Home Screen). Launches full-screen standalone.
- [ ] Settings → App → **Check for updates** → reports "latest version" or reloads.
- [ ] Setting app version in Settings matches the money you see (sanity).

## 4. Currency conversion + rates (NEW)
- [ ] Add transaction → open currency dropdown → rate line shows "Snapshot at entry · 1 USD ≈ ₹…" with a fresh (~today) rate.
- [ ] Enter foreign amount → INR preview shown.
- [ ] Save foreign-currency txn → row shows currency badge + correct INR amount.

## 5. Offline flow (NEW)
- [ ] Turn on Airplane Mode / Wi-Fi off.
- [ ] Add a transaction (INR and a foreign currency with previously-cached rates).
- [ ] It saves locally; transaction list shows it marked **pending**; Settings shows **Offline · N pending**.
- [ ] Turn connectivity back on → pending rows **auto-sync** to Supabase (pending badge clears, Sync shows "All up to date").
- [ ] Also test the **Sync now** button in Settings manually flushes.

## 6. Nav flicker (reegress)
- [ ] On a phone, switch Home ↔ Expenses ↔ Ledger ↔ Budgets repeatedly — no flash/blank frame.

## 7. Tabs regression (sanity)
- [ ] Transactions, Expenses filters/search, Ledger add/settle, EMIs, Budgets, Recurring all still work in both themes.

Owner: human (Michael). Repro bucket: any failing item → new card or note to god.
