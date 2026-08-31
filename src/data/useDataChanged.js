import { useEffect, useRef } from 'react'
import { onDataChanged } from './events.js'

/**
 * useDataChanged(entities, handler) — subscribe a mounted screen to
 * data-layer mutations. Fires `handler` whenever ANY repository mutation
 * touches one of `entities` (e.g. ['transactions', 'budgets']), regardless
 * of which screen or sheet issued it and in EITHER repo implementation.
 *
 * The handler is kept in a ref, so closures stay fresh without
 * resubscribing on every render (no stale-closure refreshes, no listener
 * churn). Pass an empty array to receive every mutation.
 */
export function useDataChanged(entities, handler) {
  const key = (entities ?? []).join('|')
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    const wanted = key ? key.split('|') : []
    return onDataChanged((detail) => {
      const touched = detail?.entities ?? []
      if (!wanted.length || touched.some((entity) => wanted.includes(entity))) {
        handlerRef.current(detail)
      }
    })
  }, [key])
}

export default useDataChanged
