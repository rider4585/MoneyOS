import { NavLink } from 'react-router-dom'
import { ArrowLeftRight, Home, ReceiptText, Settings } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/expenses', label: 'Expenses', icon: ReceiptText },
  // center slot is the FAB (rendered separately)
  null,
  { to: '/ledger', label: 'Ledger', icon: ArrowLeftRight },
  { to: '/settings', label: 'Settings', icon: Settings },
]

/** Bottom tab dock — frosted glass PWA-style nav. */
export default function BottomNavDock() {
  return (
    <nav
      aria-label="Primary"
      className="glass-panel fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md items-end justify-between rounded-3xl px-4 pt-2 pb-2"
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
              `group flex w-16 flex-col items-center gap-1 rounded-2xl py-1.5 transition-colors ${
                isActive ? 'text-brand dark:text-violet-300' : 'text-muted hover:text-ink'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <tab.icon size={22} strokeWidth={isActive ? 2.4 : 1.8} />
                <span className="text-[11px] font-medium tracking-tight">{tab.label}</span>
                <span
                  aria-hidden
                  className={`h-1 w-1 rounded-full bg-current transition-opacity ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </>
            )}
          </NavLink>
        ),
      )}
    </nav>
  )
}
