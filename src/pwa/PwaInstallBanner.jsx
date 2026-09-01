import { motion, AnimatePresence } from 'framer-motion'
import { Download, X } from 'lucide-react'
import { usePwaInstall } from './PwaInstallProvider.jsx'
import Pressable from '../components/ui/Pressable.jsx'

/**
 * PwaInstallBanner — small dismissible Pulse install banner shown when the
 * PWA is installable but not yet installed. Reuses the glass-panel recipe and
 * the brand Button; a ✕ dismisses (and remembers) so it never returns on this
 * device. Hidden automatically after install / standalone.
 */
export default function PwaInstallBanner() {
  const { canInstall, install, dismiss } = usePwaInstall()

  if (!canInstall) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="glass-panel mb-4 flex items-center gap-3 rounded-2xl px-4 py-3"
      >
        <span
          aria-hidden
          className="bg-gradient-brand grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white"
        >
          <Download size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-sm font-bold">Install MoneyOS</p>
          <p className="truncate text-xs text-muted">Launch from your home screen for instant access.</p>
        </div>
        <Pressable
          type="button"
          onClick={install}
          className="bg-gradient-brand shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-[0_10px_28px_-6px_var(--glow-brand)]"
        >
          Install
        </Pressable>
        <Pressable
          type="button"
          aria-label="Dismiss install prompt"
          onClick={dismiss}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-muted hover:text-ink"
        >
          <X size={15} />
        </Pressable>
      </motion.div>
    </AnimatePresence>
  )
}
