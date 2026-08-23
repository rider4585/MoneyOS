import { motion } from 'framer-motion'

/**
 * PageHeader — shared plan-screen header: display-font title, muted subtitle
 * and an optional right-aligned action slot. Rises in with the page.
 */
export default function PageHeader({ title, subtitle, action, className = '' }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`mb-5 flex items-start justify-between gap-3 ${className}`}
    >
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0 pt-1">{action}</div> : null}
    </motion.header>
  )
}
