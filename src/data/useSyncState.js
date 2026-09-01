import { useSyncExternalStore } from 'react'
import { subscribe, getSnapshot } from './offlineQueue.js'

/**
 * useSyncState() — live snapshot of the offline/online + pending-queue state.
 * Rerenders whenever connectivity changes or the pending queue mutates, so the
 * Settings sync indicator stays accurate without polling.
 * @returns {{ online:boolean, pendingCount:number, updatedAt:(number|null) }}
 */
export default function useSyncState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
