import { useState } from 'react'
import { motion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import BottomNavDock from './BottomNavDock.jsx'
import AddTransactionFab from './AddTransactionFab.jsx'
import DemoBanner from './DemoBanner.jsx'

/**
 * AppShell — router outlet with staggered page transitions,
 * glass bottom tab dock and the neumorphic add-transaction FAB.
 */
export default function AppShell() {
  const location = useLocation()
  const [sheetOpen, setSheetOpen] = useState(false)

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

      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="mx-auto w-full max-w-xl px-5 pt-6 pb-40"
      >
        <DemoBanner />
        <Outlet />
      </motion.main>

      <AddTransactionFab onOpen={() => setSheetOpen(true)} />
      <BottomNavDock />

      {/* Placeholder sheet — proves the glass-panel token; real form lands in T2 */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.button
            type="button"
            aria-label="Close"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 cursor-default bg-black/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Add transaction"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="glass-panel relative w-full max-w-xl rounded-t-3xl p-6 pb-10"
          >
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="neu-raised-sm absolute -top-12 right-4 grid h-10 w-10 place-items-center rounded-full bg-surface text-muted hover:text-ink"
              aria-label="Close sheet"
            >
              <X size={18} />
            </button>
            <h2 className="font-display text-lg font-semibold">Add transaction</h2>
            <p className="mt-2 text-sm text-muted">
              The entry form ships with the data layer (T2). This sheet exists to prove
              the <span className="text-gradient-brand font-medium">glass-panel</span>{' '}
              overlay token.
            </p>
          </motion.div>
        </div>
      )}
    </div>
  )
}
