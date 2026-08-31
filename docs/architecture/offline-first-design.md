# Offline-First Design

> **Status:** Design document — **no implementation**. The offline system is described here for review; nothing in this doc is built or wired yet.
>
> **Goal:** let MoneyOS read and write transactions, ledger, EMIs, budgets, recurring rules and categories **locally first**, then synchronise to Supabase when connectivity is restored — without changing the public `repository.js` contract or the screens that consume it.

---

## 1. Principles & non-goals

### 1.1 Working objectives
1. Reads and writes must succeed **offline** (and fail fast online only when truly unreachable).
2. The UI should look **the same** whether backed by the demo repo, Supabase, or the offline cache — no branching in screens.
3. Mutations made offline must eventually reach the server, in order, without data loss.
4. Conflict handling must be explicit, deterministic, and never silently destroy a user's edit.

### 1.2 Non-goals (out of scope for this design)
- Multi-author realtime collaboration / CRDTs.
- Complex merge rules per field. We keep a simple, predictable "last-write-wins with field-level snapshot + tombstone" model (see §5) that is good enough for a single-user personal-finance app.
- Full transactional GSIs / secondary indexes. The dataset is small (hundreds of rows/user); a flat per-entity local store suffices.

### 1.3 Why layer onto the repository pattern
The app already routes **all** data through one seam:
`index.js` selects one raw impl → `createRepositoryWrapper(raw)` → screens. The wrapper already (a) read-through caches, (b) emits `moneyos:data-changed` after every mutation (`events.js`, `MUTATION_ENTITIES`), and (c) invalidates the cache.

An offline impl is therefore just **another raw repository** (or a decorator around the Supabase one), selected or injected at `index.js` — with **zero screen changes**. That is the whole payoff of the existing seam.

---

## 2. Layering overview

```
Screens (consume repository.js contract only)
        │
        ▼
┌───────────────────────────────┐
│ createRepositoryWrapper(raw)  │  unchanged — cache + data-changed bus
└───────────────┬───────────────┘
                │ raw = OfflineFirstRepository(supabaseRaw)
                ▼
┌────────────────────────────────────────────────────────────┐
│ OfflineFirstRepository  (NEW — decorates supabase repo)    │
│  • read path:  local store first, network as warm-back     │
│  • write path: append to sync queue → apply locally →      │
│                flush queue when online                     │
│  • sync engine: idempotent replay, conflict resolver,      │
│                backoff/retry, wake-on-reconnect            │
└───────────┬──────────────────────────────┬─────────────────┘
            ▼                              ▼
   Local authoritative store      Supabase (network, remote source of truth)
   (IndexedDB, per-entity)
```

The **local store** is the read authority for the UI; the **queue + resolver** reconcile it with Supabase.

---

## 3. Storage layer

### 3.1 Choice: IndexedDB via `idb`-style thin wrapper
- **Why IndexedDB over `localStorage`:** datasets are small but sync needs object stores, per-key updates, stable ordering, and async throughput; localStorage is synchronous, string-only, and ~5 MB. The demo repo already uses localStorage and is **not** the offline target.
- **Adopt:** the permissive `idb` library (tiny promise wrapper) or a ~100-line hand-rolled IDB helper. Hand-rolled keeps the dependency footprint at zero, which suits this repo's minimal-deps style. Recommend a small internal `src/data/local/*` module set, no new runtime dep unless the team prefers `idb`.

### 3.2 Schema (object stores)
One store per entity, keyed by the server id where one exists:

| Store | Key | Notes |
|---|---|---|
| `transactions` | `id` | full row as returned by `listTransactions` |
| `ledgerEntries` | `id` | |
| `emis` | `id` | |
| `installments` | `id` | needed because the contract has no installments getter today; see §6 |
| `budgets` | `id` | unique per `(category_id, month)` |
| `recurring` | `id` | |
| `categories` | `id` | |
| `profile` | `id` | single row |
| `syncQueue` | sequential int | see §4 |
| `meta` | key | schema version, last-synced-at, per-tab session id |

Each row is stored as the **exact object the repository returns**, so `list*` methods can hydrate screens unchanged.

### 3.3 Bootstrap
On `init()`:
1. Open/upgrade the DB (`meta.schemaVersion` drives migrations).
2. If stores are empty → **backfill** from the network (`list*` per entity) and write locally.
3. Register `online`/`offline` and `visibilitychange` + `beforeunload` listeners (see §5.5).

---

## 4. The sync queue

### 4.1 What gets queued
Every **mutation method** (`add*`, `update*`, `delete*`, `settle*`, `recordInstallment`, `setBudget`) enqueues an **operation descriptor**, in order, then applies it to the local store immediately so the UI reflects it instantly. The descriptor is the source of truth for replay:

```ts
type SyncOp = {
  id: number;                 // monotonic (autoincrement) — replay order
  method: string;             // e.g. 'addTransaction'
  args: unknown[];            // arguments as passed to the repository
  entity: string;             // from MUTATION_ENTITIES (for scoped invalidate)
  localId?: string;           // temporary client id for offline-created rows
  attempt: number;            // retry counter
  nextAttemptAt: number;      // backoff timestamp
  createdAt: string;          // ISO
}
```

### 4.2 Routing reads vs writes
- **Reads** (`list*`, `getProfile`): serve from the local store (fast, works offline). Optionally refresh in the background from the network when online (a "warm-back", see §7) so the local store converges even without user writes.
- **Writes**: local-apply first, then flush.

### 4.3 Offline-created rows need client ids
A new transaction created offline has **no server id yet**. Before the write reaches Supabase, other local mutations (and the UI) must reference it. So:
- `addTransaction`/`addLedgerEntry`/`addEmi`/`addRecurring`/`addCategory` generate a **`client_`-prefixed temporary id**, return that row to the UI, and store the pending row with `client_id`.
- On successful server insert, the server id is written back into the local row **and** any local references (e.g. `category_id`, `recurring_rule_id`) are rewritten from `client_*` → server id. This id-rewrite step is part of the flush transaction (§5.4).

---

## 5. Sync & conflict strategy

### 5.1 Sync trigger
- **Immediate flush** when a mutation lands while `navigator.onLine` is true (a trailing debounce ~1–2 s so rapid edits batch).
- **On reconnect**: `window.addEventListener('online', flush)`.
- **On app foreground**: `visibilitychange` → visible → flush (catches the "offline → online while tab hidden" gap).
- **Periodic safety net**: a low-frequency `setInterval` (e.g. every 60 s) while online, cheap because the queue is normally empty.

### 5.2 Flush algorithm (idempotent replay)
Process ops from the queue **in id order**; each op must be idempotent so a crash mid-flush never double-applies:

1. Read the next op.
2. If `nextAttemptAt` is in the future → stop (backoff).
3. Invoke the corresponding **Supabase** method with the op's args (rewriting `client_*` ids first, §5.4).
4. On success:
   - apply any server-assigned ids back to local store;
   - if a `localId` differs, **rewrite local references** (see §5.4);
   - remove the op from the queue;
   - `emitMutationChanged(entity)` so mounted screens refresh with the converged row.
5. On failure: classify (below), bump `attempt`, set `nextAttemptAt`, keep in queue, and try the next op (do not block the whole queue on one bad op).

### 5.3 Failure classification
| Class | Example | Action |
|---|---|---|
| Transient/retryable | network down, 5xx, timeout, RLS offline | retry with exponential backoff (1 s → 2 s → 4 s … cap ~60 s), keep in queue |
| Conflict (409 / expects-previous) | row changed on server since our base | route to the conflict resolver (§5.6) |
| Permanent (400 / validation) | violates a constraint | surface via `emitMutationChanged` + a visible "sync failed" badge; keep the row locally but flag it; do **not** drop user data |

### 5.4 Idempotency & `client_*` id rewriting
- **Server idempotency keys:** for `add*` ops, send a stable `client_txn_id` (e.g. the `client_` id) as an application-side idempotency guard. On retry after a network blip where the server actually committed, the server can dedupe (a unique `idempotency_key` column, or a unique `client_id` column) so the record is not duplicated.
- **Reference rewriting:** after the server returns real ids, run a small metadata pass over pending local rows that reference those `client_*` ids and substitute the real ids. This keeps `category_id`, `recurring_rule_id`, `emi_id`, etc. consistent offline.

### 5.5 Crash safety
- Because writes are local-first and the queue records the **arguments** (not just "did it"), a crash after the local write but before the flush leaves the op in the queue → it gets replayed on next launch. No user data is lost.
- `beforeunload` attempts a best-effort final flush flush but never blocks unload; the periodic/visibility flush is the real guarantee.

### 5.6 Conflict resolution (single-user model)
The app is single-user (RLS scopes everything to one `user_id`), so true concurrent edits are rare. Use a simple, documented **Last-Write-Wins with field-level merge**:

- Each local row records a `baseVersion` (server `updated_at` at the time it was loaded) alongside the local edits.
- On flush, if the server row's `updated_at` equals the `baseVersion` → apply directly (no conflict).
- If it differs → do a **field-level merge**: keep the newer value per column (compare the local `updatedAt` of the field vs the server row's `updated_at`), then push the merged result. For a personal finance app, LWW-per-field is predictable and safe enough.
- **Never overwrite** money rows wholesale when the other side has legitimate newer data; conflict resolution is surfaced by writing the merged row *back* through the same queue so the resolver itself is auditable.
- Deletes use **tombstones**: a `deleted:true` row (or a `delete-<id>` op) is kept in the local store until the server acknowledges, so an offline delete is not resurrected by a stale server read.

---

## 6. Layering details & gaps to close

### 6.1 What the design reuses from today
- **`createRepositoryWrapper`** — unchanged: still caches reads and emits data-changed after mutations. The offline impl returns the same object shapes, so `MUTATION_ENTITIES`, `useDataChanged`, and the shared cache keep working.
- **`events.js` health** — the sync engine reuses `emitMutationChanged` so screens converge automatically when a flush lands.

### 6.2 Gaps in the current code the offline design must fill
1. **No installments getter.** `Emi.jsx` rebuilds installment history client-side via `features/money/installments.js` because the frozen contract has no `listInstallments`. Offline needs installments stored locally & queued, so add an internal (non-contract) `OfflineFirstRepository` state for installments, or surface a read method internally without changing the contract's public surface.
2. **`recordInstallment`/`settleLedgerEntry` are multi-step writes** (see cost audit). As queued ops they must be **atomic**: enqueue the whole operation as one op so replay applies it atomically, rather than its sub-queries.
3. **FX snapshotting offline.** `snap()`/`fetchFxRateToInr` hits the network at write time. Offline, a non-INR entry cannot fetch a *live* rate. Design decision: **snapshot the last-known rate** (cached in `sessionStorage`/local store) and mark the row `fx_rate_offline: true`; when syncing, optionally re-snapshot if a fresher rate is available, but **never silently rewrite history** — the saved row keeps its entry-time rate per the product rule in `Settings.jsx`.

### 6.3 Network-aware read policy (warm-back, not blocking)
- Reads never block on the network: serve local, then if online, fire a background refresh of that entity (with the existing 20 s cache/TTL and in-flight dedupe so we don't spam). This is strictly an enhancement over today's synchronous fetch and keeps the UI instant.

---

## 7. Where the offline impl plugs in (diagram)

At `src/data/index.js` the active repository is chosen once:

```
DEMO_MODE ? demoRepo :
           (offlineEnabled ? createOfflineFirstRepository() : supabaseRepo)
```

`createOfflineFirstRepository()` internally constructs the Supabase repo and decorates it (see §2). Everything downstream (screens, wrapper, events) is oblivious.

**Suggested module layout (all new under `src/data/`, none touching frozen files):**
```
src/data/
  offline/
    db.js            # IndexedDB open/options/stores, migrations
    localStore.js    # per-entity get/all/set/delete, client-id gen
    syncQueue.js     # enqueue/read/dequeue/retry/backoff, op descriptors
    syncEngine.js    # flush loop, online/visibility listeners, resolver
    createOfflineFirstRepository.js  # the decorator factory (index.js imports this)
```
> ⚠️ `src/data/**` is **FROZEN** for the R3 polish lane. This entire directory is design-only and must be built in its own lane with its own gate (`npm run build` + `node scripts/smoke-demo-repo.mjs` 47/47).

---

## 8. Acceptance criteria (for when this is built)

1. With the network detached, the app still lists & edits every entity; edits persist across reload (IndexedDB).
2. Reconnecting flushes the queue in order, server and local converge, and a second flush is a no-op (idempotent).
3. Deleting offline → nothing resurrects on the next server read (tombstone path).
4. A `client_*` offline-created transaction referencing a `client_*` category ends up with real server ids after sync (reference rewrite).
5. Currency rows created offline keep their entry-time rate and are never silently re-snapshotted to a different value.
6. All original tests still pass; a new offline smoke harness (mirroring `smoke-demo-repo.mjs` but with a fake offline/online toggle) passes.
