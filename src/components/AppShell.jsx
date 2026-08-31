import { motion } from 'framer-motion'
import { Settings } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import BottomNavDock from './BottomNavDock.jsx'
import AddTransactionFab from './AddTransactionFab.jsx'
import DemoBanner from './DemoBanner.jsx'
import { AddTransactionProvider } from '../features/money/AddTransactionProvider.jsx'

/**
 * AppShell — router outlet with staggered page transitions,
 * glass bottom tab dock and the neumorphic add-transaction FAB.
 * The FAB opens the capture-first full-screen add route (/add);
 * the dock/FAB are hidden on that route for a focused capture.
 */
export default function AppShell() {
  const location = useLocation()

  return (
    <div className="min-h-dvh bg-base text-ink">
      {/* soft brand glow backdrop */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-72 opacity-25 dark:opacity-20"
        style={{
          background:
            'radial-gradient(60% 100% at 50% 0%, var(--brand) 0%, transparent 70%)',
        }}
      />

      <AddTransactionProvider>
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="mx-auto w-full max-w-xl px-5 pt-6 pb-40 sm:max-w-2xl md:max-w-3xl"
        >
          <DemoBanner />
          <div className="flex justify-end">
            <NavLink
              to="/settings"
              aria-label="Settings"
              className="neu-card grid h-10 w-10 place-items-center rounded-full bg-surface text-muted transition-colors hover:text-ink"
            >
              <Settings size={18} strokeWidth={1.9} />
            </NavLink>
          </div>
          <Outlet />
        </motion.main>

        <FabAndDock hide={location.pathname.startsWith('/add')} />
      </AddTransactionProvider>
    </div>
  )
}

function FabAndDock({ hide }) {
  const navigate = useNavigate()
  return (
    <>
      {!hide && (
        <>
          <AddTransactionFab onOpen={() => navigate('/add')} />
          <BottomNavDock />
        </>
      )}
    </>
  )
}
