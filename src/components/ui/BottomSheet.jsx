import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import Pressable from './Pressable.jsx'

export default function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  dismissible = true,
  bodyClassName = '',
  sheetClassName = '',
  children,
}) {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={dismissible ? onClose : undefined}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            transition={
              reduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 320, damping: 26 }
            }
            drag={reduceMotion || !dismissible ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={
              dismissible
                ? (_, info) => {
                    if (info.offset.y > 120 || info.velocity.y > 600) onClose?.()
                  }
                : undefined
            }
            className={`glass-panel relative w-full max-w-md rounded-t-[24px] px-5 pt-3 pb-9 sm:rounded-[24px] sm:pb-7 ${sheetClassName}`}
          >
            <div
              aria-hidden
              className="mx-auto mb-3 h-1 w-12 shrink-0 rounded-full bg-faint/50 sm:hidden"
            />
            {(title || subtitle) && (
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {title ? (
                    <p className="font-display truncate text-lg font-bold tracking-tight">{title}</p>
                  ) : null}
                  {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
                </div>
                {dismissible ? (
                  <Pressable
                    type="button"
                    aria-label="Close"
                    onClick={onClose}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted"
                  >
                    <X size={16} />
                  </Pressable>
                ) : null}
              </div>
            )}
            <div className={bodyClassName}>{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
