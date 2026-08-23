import { createDemoRepository } from './demoRepository.js'
import { createSupabaseRepository } from './supabaseRepository.js'
import { supabaseConfigured } from '../lib/supabase.js'

/**
 * Single selection point for the active repository implementation
 * (board.md §Architecture rules): VITE_DEMO_MODE=1 -> demo/localStorage,
 * otherwise Supabase. Screens consume ONLY the contract from repository.js.
 */

export const DEMO_MODE =
  String(import.meta.env.VITE_DEMO_MODE ?? '') === '1' || !supabaseConfigured

export const repository = DEMO_MODE ? createDemoRepository() : createSupabaseRepository()

export default repository
