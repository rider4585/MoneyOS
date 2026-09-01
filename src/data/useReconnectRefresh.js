import { useEffect, useRef } from 'react'
import repository from './index.js'
import { emitMutationChanged } from './events.js'

/**
 * useReconnectRefresh() — one mount in the app shell that makes EVERY screen
 * subscribed via useDataChanged() refetch the moment the browser comes back
 * online, without editing each screen.
 *
 * Why it's needed: when the user is offline, entries land in the local pending
 * queue (offlineQueue.js) and flush automatically once connectivity returns
 * (supabaseRepository.flushPending). But nothing told mounted screens to
 * refetch, so the "pending" rows lingered until a manual refresh.
 *
 * On 'online' this hook:
 *   - Supabase mode: triggers repository.flushPending(). flushPending is
 *     registered as a transactions mutation in events.js, so the wrapper
 *     invalidates the read-through cache and emits DATA_CHANGED_EVENT with
 *     entities ['transactions'] (plus the legacy txn event) AFTER the flush
 *     succeeds — screens refetch the already-synced rows exactly once, and the
 *     queue is empty meanwhile. It also fires when the queue was empty, so a
 *     reconnect with nothing queued still forces a fresh refetch.
 *   - Demo mode (no flushPending): emits the data-changed event directly; demo
 *     has no offline queue to drain, it only needs the refetch.
 *
 * The mount lives in the shell so the listener is registered once for the
 * whole authenticated app and is torn down with it.
 */
export default function useReconnectRefresh() {
  const startedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.addEventListener) return undefined
    if (startedRef.current) return undefined
    startedRef.current = true

    const onOnline = () => {
      if (typeof repository.flushPending === 'function') {
        // Wrapped repository: success emits data-changed + busts the cache.
        repository.flushPending().catch(() => {})
      } else {
        emitMutationChanged('flushPending')
      }
    }

    window.addEventListener('online', onOnline)
    return () => {
      startedRef.current = false
      window.removeEventListener('online', onOnline)
    }
  }, [])
}