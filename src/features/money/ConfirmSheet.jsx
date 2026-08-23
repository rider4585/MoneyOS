import { AnimatePresence, motion } from 'framer-motion'
import { TriangleAlert } from 'lucide-react'
import { Button } from '../../components/ui/index.js'

/**
 * ConfirmSheet — destructive-action confirmation as a small centered glass
 * card (delete flows). Kept tiny on purpose; not a full BottomSheet.
 */
export default function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'expense',
  busy = false,
  onConfirm,
  onClose,
}) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[60] grid place-items-center p-6">
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="glass-panel relative w-full max-w-xs rounded-3xl p-5"
          >
            <span className="neu-inset mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-base text-expense">
              <TriangleAlert size={20} aria-hidden />
            </span>
            <p className="font-display text-center text-base font-bold">{title}</p>
            {message ? <p className="mt-1.5 text-center text-sm text-muted">{message}</p> : null}
            <div className="mt-4 flex gap-2.5">
              <Button variant="raised" fullWidth onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant={tone === 'income' ? 'income' : 'expense'}
                fullWidth
                onClick={onConfirm}
                disabled={busy}
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
