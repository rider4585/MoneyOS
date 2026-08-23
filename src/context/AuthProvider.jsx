import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getSupabase, GOOGLE_OAUTH_SCOPES } from '../lib/supabase.js'
import { DEMO_MODE } from '../data/index.js'

/**
 * AuthProvider — Google-only Supabase auth with session persistence.
 * DEMO_MODE bypasses login entirely with a synthetic demo user (board.md
 * §Architecture rules); the visible banner lives in components/DemoBanner.jsx.
 */

const DEMO_USER = {
  id: 'demo-user',
  email: 'demo@moneyos.app',
  name: 'Aarav (Demo)',
  avatar_url: null,
  provider: 'demo',
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [sessionUser, setSessionUser] = useState(null)
  const [status, setStatus] = useState(DEMO_MODE ? 'ready' : 'restoring') // restoring|ready|signing-in
  const [error, setError] = useState(null)

  useEffect(() => {
    if (DEMO_MODE) return undefined
    const sb = getSupabase()

    sb.auth
      .getSession()
      .then(({ data }) => {
        setSessionUser(data?.session?.user ? mapUser(data.session.user) : null)
      })
      .catch(() => setError('Could not restore session'))
      .finally(() => setStatus('ready'))

    const { subscription } = sb.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ? mapUser(session.user) : null)
    })
    return () => subscription?.unsubscribe()
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (DEMO_MODE) return
    setStatus('signing-in')
    setError(null)
    try {
      const { error: err } = await getSupabase().auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: GOOGLE_OAUTH_SCOPES,
          redirectTo: window.location.origin,
        },
      })
      if (err) throw err
      // Redirect flow — no local state change until onAuthStateChange fires.
    } catch (e) {
      setError(e.message ?? 'Google sign-in failed')
      setStatus('ready')
    }
  }, [])

  const signOut = useCallback(async () => {
    if (DEMO_MODE) return
    await getSupabase().auth.signOut()
    setSessionUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user: DEMO_MODE ? DEMO_USER : sessionUser,
      isDemo: DEMO_MODE,
      status,
      error,
      signInWithGoogle,
      signOut,
    }),
    [sessionUser, status, error, signInWithGoogle, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function mapUser(supabaseUser) {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name:
      supabaseUser.user_metadata?.full_name ??
      supabaseUser.user_metadata?.name ??
      supabaseUser.email,
    avatar_url: supabaseUser.user_metadata?.avatar_url ?? null,
    provider: supabaseUser.app_metadata?.provider ?? 'google',
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
