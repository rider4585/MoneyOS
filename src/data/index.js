import { createDemoRepository } from './demoRepository.js'
import { createSupabaseRepository } from './supabaseRepository.js'
import { supabaseConfigured } from '../lib/supabase.js'
import { createRepositoryWrapper } from './wrapper.js'

/**
 * Single selection point for the active repository implementation
 * (board.md §Architecture rules): VITE_DEMO_MODE=1 -> demo/localStorage,
 * otherwise Supabase. Screens consume ONLY the contract from repository.js.
 *
 * The raw impl is wrapped by createRepositoryWrapper (wrapper.js) so that
 * EVERY mutation — from any screen or sheet, in EITHER implementation —
 * (a) busts the shared read-through cache and (b) emits a data-changed event
 * that every mounted screen subscribes to via useDataChanged(). This is what
 * gives us an instant cross-screen refresh without polling or remounts.
 */

export const DEMO_MODE =
  String(import.meta.env.VITE_DEMO_MODE ?? '') === '1' || !supabaseConfigured

const raw = DEMO_MODE ? createDemoRepository() : createSupabaseRepository()
export const repository = createRepositoryWrapper(raw)

export default repository
