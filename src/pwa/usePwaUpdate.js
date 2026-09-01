import { useCallback, useEffect, useRef, useState } from 'react'

export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

/**
 * usePwaUpdate — manual PWA update affordance.
 *
 * The app uses vite-plugin-pwa with registerType 'autoUpdate', which updates
 * the service worker automatically in the background. If that ever misses
 * (stale cache, offline window, throttled SW check), this hook lets the user
 * force a fresh update check and reloads once the new worker takes control.
 *
 * State flow: 'idle' -> 'checking' -> 'updated' (reload fires) | 'upToDate'
 * | 'error' | 'unsupported'.
 */
export default function usePwaUpdate() {
  const [state, setState] = useState('idle')
  const mountedRef = useRef(true)
  const foundWorkerRef = useRef(false)
  const controllerHandlerRef = useRef(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // A newly activated service worker takes control and fires
  // 'controllerchange'; reload so the page serves the fresh assets.
  useEffect(() => {
    const onControllerChange = () => window.location.reload()
    window.addEventListener('controllerchange', onControllerChange)
    return () => window.removeEventListener('controllerchange', onControllerChange)
  }, [])

  const checkForUpdates = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      setState('unsupported')
      return
    }

    setState('checking')
    foundWorkerRef.current = false

    if (controllerHandlerRef.current) {
      window.removeEventListener('controllerchange', controllerHandlerRef.current)
      controllerHandlerRef.current = null
    }

    let reg
    try {
      reg = await navigator.serviceWorker.getRegistration()
    } catch {
      setState('error')
      return
    }
    if (!reg) {
      setState('upToDate')
      return
    }

    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing
      if (!newWorker) return
      foundWorkerRef.current = true
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated' && mountedRef.current) {
          setState('updated')
        }
      })
    })

    try {
      await reg.update()
    } catch {
      setState('error')
      return
    }

    // If no new worker was found within a short grace window, report
    // up-to-date. ('updatefound'/'activated' win the race otherwise.)
    window.setTimeout(() => {
      if (!foundWorkerRef.current && mountedRef.current) {
        setState('upToDate')
      }
    }, 2500)
  }, [])

  return { state, checkForUpdates }
}
