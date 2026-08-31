# Supabase Cost Audit

> **Status:** Design/audit document — no implementation.  
> **Scope:** Every `supabaseRepository` read/write call site plus the shared read-through cache (`src/data/wrapper.js`, `src/data/cache.js`).  
> **Applies to:** MoneyOS Pulse PWA, `src/data/supabaseRepository.js` (459 LOC). In `VITE_DEMO_MODE` these queries don't run (localStorage demo repo), so this audit matters only for the live/Supabase build.

## 1. What each request costs

Every Supabase call is one HTTPS round trip against the Postgres REST/PostgREST layer. Two recurring cost drivers are worth naming up front:

1. **Auth resolution** — `supabase.auth.getUser()` is itself a network round trip (~100–300 ms). `supabaseRepository` memoizes it in a module-level `cachedUserId` (see `currentUserId()`), so it is called **once per session** and reused by every method. This is already the single biggest saving in the codebase and must not be regressed.
2. **Third-party FX** — `snap()` calls `fetchFxRateToInr` for every **non-INR** write. That is an external HTTP call to `open.er-api.com`, cached in `sessionStorage` by `src/lib/fx.js`. It exists on the write path, not the read path.

The read-through cache (`cache.js`) additionally means list calls are not necessarily network calls on every render — see §4.

---

## 2. Read call-site inventory

| Call site | Repository call(s) issued | Network cost per cold load | Notes |
|---|---|---|---|
| **Dashboard** (`src/pages/Dashboard.jsx`) mount + every `rev` | `listTransactions({month})`<br>`listTransactions({month: prev})`<br>`listTransactions()` **(all rows)**<br>`listBudgets()`<br>`listEmis()` | **5** list queries | Three of them are the *same table* under different cache keys. The unbounded `listTransactions()` exists only to derive `recentTxns = all.slice(0,5)` — it fetches the **entire** history to show 5 recent rows. **Largest read inefficiency in the app.** |
| **Expenses** (`src/pages/Expenses.jsx`) mount + `transactions-changed` | `listTransactions()` (all rows) | **1** (full table) | Justified for client-side search/filter/sort, but unbounded; cost grows linearly with history. Also refetches on every data-changed event. |
| **Ledger** (`src/pages/Ledger.jsx`) mount + ledger change | `listLedgerEntries()` | **1** | Aggregated to per-counterparty net in memory. Fine. |
| **EMIs** (`src/pages/Emi.jsx`) mount + emi change | `listEmis()` | **1** | Installment *history* is rebuilt client-side by `features/money/installments.js` (the contract has no installments getter) — see §5.4. |
| **Budgets** (`src/pages/Budgets.jsx`) mount + every `rev` | `listBudgets(month)`<br>`listTransactions({month})` | **2** | Shared-row duplication with Dashboard's `listTransactions({month})` — different cache keys, so both hit the network on a cold load despite identical data. |
| **Recurring** (`src/pages/Recurring.jsx`) mount + every `rev` | `listRecurring()` | **1** | Fine. |
| **Settings / categories** (`useCategories`) | `listCategories()` (cached by `useCategories` provider) | **1** | Cached at the provider level; low churn. |
| **Profile** | `getProfile()` | **1** | `PROFILE_TTL_MS` (5 min) — longest-lived cache entry. |

> `init()` runs once at app boot and calls `currentUserId()` (memoized). Subsequent list calls reuse the cached id free of charge.

### 2.1 Duplication across screens

The same underlying entity is fetched under **different cache keys** because the cache keys on the full argument tuple:

- `listTransactions()` vs `listTransactions({month})` vs `listTransactions({month: prev})` are three separate entries even though they overlap heavily.
- `Budgets` and `Dashboard` both call `listTransactions({month: <current>})` — same query, same network cost, two cache entries are *avoidable* because the args match, so actually the cache DOES dedupe those two. The remaining cross-screen duplication is the 3 different-arg transaction variants on Dashboard.

**Bottom line:** on a cold Dashboard load the app issues 5 list round trips; 3 of them are variations of the same table.

---

## 3. Write call-site inventory

| Method | Queries / external calls | Cost profile |
|---|---|---|
| `addTransaction` | 1 insert (+ 1 FX if non-INR) | Minimal. |
| `updateTransaction` | 1 update (+ 1 FX if money fields change) | Good — **no pre-read** (caller sends the full row as the patch), so money fields rebuild exactly from the patch. |
| `deleteTransaction` | 1 delete | Minimal. |
| `listLedgerEntries` | 1 select | Read. |
| `addLedgerEntry` | 1 insert (+ 1 FX if non-INR) | Minimal. |
| `settleLedgerEntry` | **2 sequential** — `select` then `update` | Read-modify-write in two round trips. Has a small race window if two settles race. |
| `addEmi` | **2 FX calls** (principal + emi amount) + 1 insert | Two external FX calls for the *same* currency that could be batched into one. |
| `recordInstallment` | **4 sequential** — select emi → insert installment → `count(id)` → update emi | The `select('id',{count})` is a 3rd round trip used only to decide whether the emi is now done; and the whole 4-step could be a single server RPC. |
| `listBudgets` / `setBudget` | 1 select / 1 upsert | Minimal. |
| `listRecurring` / `add/update/deleteRecurring` | 1 each | `updateRecurring` also no pre-read (same pattern as transaction). |
| `listCategories` / `add/update/deleteCategory` | 1 each | Minimal. |
| `getProfile` | 1 select | Read; long TTL. |

---

## 4. The cache layer (`wrapper.js` + `cache.js`)

`createRepositoryWrapper` wraps every list with `cache.read(method, args, run, ttl)`:

- **Key** = `method:JSON(args)` — so dedupe/invalidation is argument-precise, *not* entity-precise.
- **In-flight dedupe** — concurrent callers awaiting the same key share one promise. Great for mounting storms.
- **TTL** — `LIST_TTL_MS = 20_000`, `PROFILE_TTL_MS = 300_000`.
- **Blanket `invalidateAll()`** on any successful mutation, for any entity.

### 4.1 Wins already present
- Auth memoization → ~2× fewer round trips per screen vs. naive.
- Read-through cache → Dashboard → Expenses → Dashboard round trips no longer re-run identical queries.
- In-flight dedupe → one network call even if many components subscribe during the same tick.
- Event-driven refresh (`useDataChanged`, `moneyos:transactions-changed`) instead of polling → no background query when idle.

### 4.2 Costs / risks of the current cache
1. **Blanket invalidation churn.** Adding a *transaction* clears `getProfile` and `listCategories` too (both re-fetch next read). Correct, but it re-fetches unrelated entities.
2. **Argument-granular keys.** Overlapping-but-different-arg reads (Dashboard's 3 transaction variants) are not deduped against each other even though the rows overlap.
3. **Failures are never cached** — good (correctness), but a transient network error forces refetch on every retry; there is no short negative-TTL backoff.
4. The cache returns the stored array reference (no defensive copy) — fine today because callers treat rows as read-only snapshots, but worth a comment for future callers.

---

## 5. Proposed optimizations (design only — not implemented)

Prioritised high → low.

### 5.1 Stop fetching all transactions for "recent 5" (P0)
`Dashboard` should not run `listTransactions()` (full scan) to show 5 rows. Add an optional `limit` to `listTransactions(filter)` (or a dedicated `listRecentTransactions(limit)`), pushed down to PostgREST via `.limit(n)` / `.order(...).limit(n)`. Saves the single largest read (the whole table) on every cold load and Dashboard refresh.

### 5.2 Paginate Expenses (P1)
As history grows, `listTransactions()` becomes a full-table scan per visit. Introduce offset/limit (or keyset pagination on `(note_date, created_at)`) plus `count: exact` for a total, and load-in-when-scrolled. Keep the current in-memory search/filter/sort for the loaded window.

### 5.3 Scoped cache invalidation (P1)
Replace blanket `invalidateAll()` with per-entity invalidation: mutate a transaction → invalidate only `listTransactions*`; mutate a budget → only `listBudgets*`; etc. `MUTATION_ENTITIES` in `events.js` already maps each mutation to its entity — reuse it. Keeps `getProfile`/`listCategories` warm across daily transaction entry. (Blanket invalidate was a "read cheap / mutation rare" simplification; with the P0/P2 read reductions it remains acceptable, but scoping cuts churn further.)

### 5.4 Batch FX (P1)
- `addEmi` makes two `fetchFxRateToInr` calls for the same currency. Resolve the rate **once** and reuse it for both principal and EMI snapshot.
- Consider a `fetchFxRatesToInr([currencies])` that resolves several currencies in one upstream call when a form holds multiple currencies.

### 5.5 Collapse excursion-y multi-step writes into one RPC (P2)
- **`recordInstallment`** (currently 4 round trips): push a single `plpgsql` function that inserts the installment, derives `paid_*`, re-reads the emi, counts installments, advances `next_due_date`, and toggles `active` — returning the new installment. One round trip, atomic, no client-visible intermediate states.
- **`settleLedgerEntry`** (2 round trips + race): a single RPC that reads `principal_inr_minor`/`settled_inr_minor`, clamps the new total, and updates — atomic read-modify-write, no race window.
- Even without RPCs, `recordInstallment`'s `count(id)` for deactivation can be dropped by deriving installment count client-side (the emi row is already fetched) and only issuing the update.

### 5.6 Reuse one fetch across Dashboard variants (P2)
Consider a "fetch transactions once, derive all three Dashboard lists in memory" approach: one `listTransactions({month})`, then derive `prev` and `recent` from a slightly wider single fetch, instead of three differently-keyed queries. This is an alternative/complement to §5.1.

### 5.7 Keep event-driven refresh; revisit TTL only if needed (P2)
The 20 s `LIST_TTL_MS` is a safety net for cross-tab/device changes. It is not a polling loop, so it has no background cost. If real-time consistency matters, prefer Supabase Realtime subscriptions over shortening the TTL (which would increase server load). No change recommended today.

### 5.8 Negative-cache / error backoff (P3)
Optional: cache a short-lived "errored" marker keyed per `(method,args)` so a flapping network doesn't hammer the server on rapid retries. Low priority given failures are currently rare in practice.

---

## 6. Recommended action summary

| # | Change | Est. impact | Scope |
|---|---|---|---|
| 5.1 | `limit` on listTransactions for Dashboard recent | High (kills full-table read) | Data layer + caller |
| 5.4 | Batch `addEmi` FX | Medium (fewer external calls) | `supabaseRepository.js` |
| 5.3 | Scoped cache invalidation | Medium (less refetch churn) | `wrapper.js`/`events.js` |
| 5.2 | Paginate Expenses | Medium (bounds growth) | Data layer + `Expenses.jsx` |
| 5.5 | RPC for installment / settle | Medium (round trips + race) | `supabase/` SQL + repo |
| 5.6 | Single fetch, derive Dashboard lists | Medium | `Dashboard.jsx` |

> ⚠️ **FROZEN:** `src/data/**`, `src/lib/**`, and the `repository.js` contract are frozen for the R3 polish lane. These optimizations are **design proposals only**; none are implemented here. Any implementation must land in a separate lane with its own build/smoke gate.
