import { motion } from 'framer-motion'
import { LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthProvider.jsx'

/**
 * Login screen (Google-only OAuth). In DEMO_MODE this screen is never
 * reachable — ProtectedRoute lets demo users straight through.
 */
export default function Login() {
  const { signInWithGoogle, error, status } = useAuth()

  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        className="neu-card w-full max-w-sm p-8 text-center"
      >
        <div className="neu-raised-sm mx-auto grid size-14 place-items-center rounded-2xl">
          <span className="text-gradient-brand font-display text-2xl font-bold">M</span>
        </div>
        <h1 className="font-display mt-6 text-2xl font-bold tracking-tight">Welcome to MoneyOS</h1>
        <p className="mt-2 text-sm text-muted">
          One place for spends, borrow/lent, EMIs and budgets. Sign in with Google to sync your money safely.
        </p>

        <button
          onClick={signInWithGoogle}
          disabled={status === 'signing-in'}
          className="neu-raised-sm pressable mt-8 flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <LogIn className="size-4 text-brand" aria-hidden />
          {status === 'signing-in' ? 'Redirecting…' : 'Continue with Google'}
        </button>

        {error && <p className="mt-4 text-xs font-medium text-expense">{error}</p>}
      </motion.div>
    </div>
  )
}
