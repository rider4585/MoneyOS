import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const DISMISS_KEY = 'moneyos.pwa.dismissed'

export function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true
  )
}

/**
 * PwaInstallProvider — single app-wide owner of the install affordance.
 * Captures `beforeinstallprompt` once, tracks whether the app is running as
 * an installed PWA (standalone / `appinstalled`), and remembers a manual
 * dismissal so the banner does not nag again on the same device.
 */
const PwaInstallContext = createContext({
  canInstall: false,
  installed: false,
  dismissed: false,
  install: async () => {},
  dismiss: () => {},
  reset: () => {},
})

export default function PwaInstallProvider({ children }) {
  const deferredRef = useRef(null)
  const [hasPrompt, setHasPrompt] = useState(false)
  const [installed, setInstalled] = useState(isStandalone)
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem(DISMISS_KEY) === '1'
  )

  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault()
      deferredRef.current = event
      setHasPrompt(true)
    }
    const onInstalled = () => {
      setInstalled(true)
      deferredRef.current = null
      setHasPrompt(false)
    }
    const onDisplayMode = (event) => {
      if (event.matches) setInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    const mql = window.matchMedia('(display-mode: standalone)')
    mql.addEventListener?.('change', onDisplayMode)

    // Already running as an installed PWA — nothing to prompt for.
    if (isStandalone()) setInstalled(true)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      mql.removeEventListener?.('change', onDisplayMode)
    }
  }, [])

  const canInstall = !installed && !dismissed && hasPrompt

  const install = useCallback(async () => {
    const event = deferredRef.current
    if (!event) return
    try {
      await event.prompt()
      const { outcome } = await event.userChoice
      if (outcome === 'accepted') {
        setInstalled(true)
      }
    } finally {
      deferredRef.current = null
      setHasPrompt(false)
    }
  }, [])

  const dismiss = useCallback(() => {
    setDismissed(true)
    window.localStorage.setItem(DISMISS_KEY, '1')
  }, [])

  const reset = useCallback(() => {
    setDismissed(false)
    window.localStorage.removeItem(DISMISS_KEY)
  }, [])

  const value = useMemo(
    () => ({ canInstall, installed, dismissed, hasPrompt, install, dismiss, reset }),
    [canInstall, installed, dismissed, hasPrompt, install, dismiss, reset]
  )

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>
}

export function usePwaInstall() {
  return useContext(PwaInstallContext)
}
