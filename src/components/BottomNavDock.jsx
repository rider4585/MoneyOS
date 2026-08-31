import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { ArrowLeftRight, ChartPie, Home, ReceiptText } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/expenses', label: 'Expenses', icon: ReceiptText },
  // center slot is the FAB (rendered separately)
  null,
  { to: '/ledger', label: 'Ledger', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Budgets', icon: ChartPie },
]

/**
 * Bottom tab dock — Pulse floating glass dock (pulse §6): frosted blur,
 * inset-x 16px, low radius, sliding active pillar via layoutId spring.
 */
export default function BottomNavDock() {
  return (
    <nav
      aria-label="Primary"
      className="glass-panel fixed inset-x-4 bottom-3 z-40 mx-auto flex max-w-md justify-between rounded-3xl px-4 pt-2.5 pb-2"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      {tabs.map((tab, i) =>
        tab === null ? (
          <div key={`slot-${i}`} className="w-16 shrink-0" aria-hidden />
        ) : (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `group relative flex w-16 flex-col items-center gap-1 rounded-2xl py-1.5 transition-colors ${
                isActive ? 'text-brand dark:text-violet-300' : 'text-muted hover:text-ink'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* sliding active pill (pulse §5: layoutId spring) */}
                {isActive ? (
                  <motion.span
                    layoutId="dock-active"
                    transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                    aria-hidden
                    className="absolute inset-x-2 top-0 bottom-2 rounded-2xl border border-border bg-surface-raised/80 shadow-[var(--shadow-sm)]"
                  />
                ) : null}
                <span className="relative z-10">
                  <tab.icon size={22} strokeWidth={isActive ? 2.4 : 1.8} />
                </span>
                <span className="relative z-10 text-[11px] font-medium tracking-tight">
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ),
      )}
    </nav>
  )
}
