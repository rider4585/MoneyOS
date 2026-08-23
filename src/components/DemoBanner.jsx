import { FlaskConical } from 'lucide-react'
import { DEMO_MODE } from '../data/index.js'

/**
 * Visible "Demo Mode" banner (board.md §Architecture rules) — rendered at the
 * top of the AppShell whenever VITE_DEMO_MODE=1 bypasses real auth.
 */
export default function DemoBanner() {
  if (!DEMO_MODE) return null
  return (
    <div className="glass-panel mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border border-white/40 px-4 py-1.5 dark:border-white/10">
      <FlaskConical className="size-3.5 text-brand" aria-hidden />
      <span className="text-[11px] font-semibold tracking-wide uppercase">Demo Mode</span>
      <span className="text-[11px] text-muted">local sample data · nothing syncs</span>
    </div>
  )
}
