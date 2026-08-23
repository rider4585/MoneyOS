import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && anonKey)

let client = null

/**
 * Lazy Supabase client (board.md §Architecture rules).
 * Throws a clear error when called without env config — demo mode never
 * touches it because src/data/index.js routes to demoRepository instead.
 */
export function getSupabase() {
  if (!supabaseConfigured) {
    throw new Error(
      'Supabase not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (.env), or run with VITE_DEMO_MODE=1'
    )
  }
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}

export const GOOGLE_OAUTH_SCOPES = 'email profile'
