/**
 * offlineQueue.js �?" durable offline write queue for the Supabase repository.
 *
 * When the user adds a transaction while offline (or the live FX fetch fails),
 * the repository stores the RAW user payload here instead of failing. The item
 * is replayed against the backend later, once connectivity returns, so nothing
 * is lost and the sync happens with the FRESHEST conversion rates.
 *
 * Design goals:
 *   - Persistence: pending items live in localStorage (survives reload/close).
 *   - Driver-agnostic: this module stores arbitrary serialisable payloads and
 *     replays them through a `push` callback supplied by the repository �?" so
 *     it works the same for ANY repo method, and is unit-testable in Node
 *     without touching the network or the DOM.
 *   - Reactivity: emits window 'moneyos:sync-changed' (localStorage-friendly)
 *     so screens subscribe with useSyncState() for a live indicator.
 *
 * localStorage is used instead of IndexedDB to keep the surface small and
 * synchronous reads cheap; the volume (a handful of rows while offline) is
 * tiny. Items are { id, at, entity, payload } where `entity` keeps replay
 * unambiguous; payload is the exact argument the repository mutation takes.
 */

const PENDING_KEY = 'moneyos.pending'
const META_KEY = 'moneyos.pending.meta'
export const SYNC_EVENT = 'moneyos:sync-changed'

let cachedOnLine = typeof navigator !== 'undefined' ? navigator.onLine : true

function storage() {
  if (typeof window === 'undefined' || !window.localStorage) return null
  return window.localStorage
}

function readAll() {
  const s = storage()
  if (!s) return []
  try {
    const raw = s.getItem(PENDING_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeAll(list) {
  const s = storage()
  if (!s) return
  try {
    s.setItem(PENDING_KEY, JSON.stringify(list))
    const meta = JSON.parse(s.getItem(META_KEY) || '{}')
    meta.updatedAt = Date.now()
    meta.pending = list.length
    s.setItem(META_KEY, JSON.stringify(meta))
  } catch {
    /* quota/private mode �?" best effort */
  }
}

function setOnline(value) {
  if (cachedOnLine === value) return
  cachedOnLine = value
  emitSync()
}

function emitSync() {
  try {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { state } }))
  } catch {
    /* non-DOM harness �?" safe to ignore */
  }
}

export const state = {
  get online() {
    return cachedOnLine
  },
  get pending() {
    return readAll()
  },
  get pendingCount() {
    return readAll().length
  },
  get isSyncing() {
    return false // transient; the repo sets its own busy flag via flush() below
  },
}

/** Storage-friendly snapshot for React (reads via useSyncExternalStore). */
export function getSnapshot() {
  return {
    online: getOnline(),
    pendingCount: getPendingCount(),
    updatedAt: getUpdatedAt(),
  }
}

export function getOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

export function getPending() {
  return readAll()
}

export function getPendingCount() {
  return readAll().length
}

export function getUpdatedAt() {
  const s = storage()
  if (!s) return null
  try {
    return JSON.parse(s.getItem(META_KEY) || '{}').updatedAt ?? null
  } catch {
    return null
  }
}

/** Subscribe to connectivity + queue changes. Returns an unsubscribe fn. */
export function subscribe(onChange) {
  const onChangeSync = () => onChange()
  try {
    window.addEventListener('online', onChangeSync)
    window.addEventListener('offline', onChangeSync)
    window.addEventListener(SYNC_EVENT, onChangeSync)
    window.addEventListener('storage', onChangeSync)
    return () => {
      window.removeEventListener('online', onChangeSync)
      window.removeEventListener('offline', onChangeSync)
      window.removeEventListener(SYNC_EVENT, onChangeSync)
      window.removeEventListener('storage', onChangeSync)
    }
  } catch {
    return () => {}
  }
}

/**
 * Add a raw payload to the offline queue for later replay.
 * @param {object} args { entity, payload }
 */
export function enqueue({ entity, payload }) {
  const list = readAll()
  list.push({
    id: `offline-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    entity,
    payload,
  })
  writeAll(list)
  emitSync()
}

/** Drop a single pending item by id (after a successful replay). */
export function dequeue(id) {
  const list = readAll()
  const next = list.filter((item) => item.id !== id)
  if (next.length !== list.length) {
    writeAll(next)
    emitSync()
  }
}

/**
 * Replay every pending item through `push`. Stops at the first failure so
 * earlier items are never skipped; the surviving queue keeps the rest.
 * @param {(item:{id,entity,payload}) => Promise<void>} push async full-push
 * @returns {Promise<{pushed:number, remaining:number}>}
 */
export async function flush(push) {
  const list = readAll()
  let pushed = 0
  for (const item of list) {
    try {
      await push(item)
      dequeue(item.id)
      pushed += 1
    } catch (err) {
      // Network/RPC failure �?" retry on next trigger; keep the item queued.
      break
    }
  }
  return { pushed, remaining: getPendingCount() }
}

/** Start listening for connectivity changes; returns a stop function. */
export function startConnectivityWatcher(onReconnect) {
  if (typeof window === 'undefined') return () => {}
  const onOnline = () => {
    setOnline(true)
    if (typeof onReconnect === 'function') onReconnect()
  }
  const onOffline = () => setOnline(false)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}
