import { motion } from 'framer-motion'
import { Settings } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import BottomNavDock from './BottomNavDock.jsx'
import AddTransactionFab from './AddTransactionFab.jsx'
import DemoBanner from './DemoBanner.jsx'
import { PwaInstallBanner } from '../pwa/index.js'
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
      {/* aurora hero backdrop — one per screen max (pulse §4) */}
      <div
        aria-hidden
        className="aurora pointer-events-none fixed inset-x-0 top-0 h-72"
      />

      <AddTransactionProvider>
        <motion.main
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="mx-auto w-full max-w-xl px-5 pt-6 pb-40 sm:max-w-2xl md:max-w-3xl"
        >
          <DemoBanner />
          <PwaInstallBanner />
          <div className="flex justify-end">
            <NavLink
              to="/settings"
              aria-label="Settings"
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-border-strong hover:text-ink"
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
