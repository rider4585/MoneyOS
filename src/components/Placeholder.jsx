import { motion } from 'framer-motion'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } },
}

/** Shared scaffold placeholder — feature screens arrive in T3. */
export default function Placeholder({ icon: Icon, title, subtitle, children }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={item} className="flex items-center gap-3">
        {Icon && (
          <span className="neu-raised-sm grid h-11 w-11 place-items-center rounded-2xl bg-surface text-brand dark:text-violet-300">
            <Icon size={22} />
          </span>
        )}
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
      </motion.div>

      <motion.p variants={item} className="text-sm leading-relaxed text-muted">
        {subtitle}
      </motion.p>

      <motion.div
        variants={item}
        className="neu-card rounded-3xl bg-surface p-5 text-sm text-muted"
      >
        <p className="font-medium text-ink">Coming in phase T3</p>
        <p className="mt-1">
          This screen is part of the shell skeleton only — the data layer (repository
          interface + demo/Supabase impls) lands in T2, then this page consumes it.
        </p>
      </motion.div>

      {children}
    </motion.div>
  )
}
