import { motion, useReducedMotion } from 'framer-motion'

const TONES = {
  brand: 'var(--brand)',
  income: 'var(--income)',
  expense: 'var(--expense)',
  emi: 'var(--emi)',
}

const HEIGHTS = {
  sm: 'h-2',
  md: 'h-3.5',
  lg: 'h-5',
}

export default function ProgressBar({
  value = 0,
  max = 100,
  tone = 'auto',
  size = 'md',
  label,
  showPercent = false,
  overLabel = 'over budget',
  className = '',
}) {
  const reduce = useReducedMotion()
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0
  const over = max > 0 && value > max
  const resolvedKey = tone === 'auto' ? (over ? 'expense' : 'brand') : tone
  const fill = TONES[resolvedKey] ?? resolvedKey
  const track = HEIGHTS[size] ?? HEIGHTS.md

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      className={className}
    >
      {label || showPercent ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
          {label ? <span className="font-medium text-muted">{label}</span> : <span />}
          {showPercent ? (
            <span className={`tabular-nums ${over ? 'font-semibold text-expense' : 'text-muted'}`}>
              {over ? overLabel : `${Math.round(ratio * 100)}%`}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className={`neu-well overflow-hidden rounded-full bg-base ${track}`}>
        <motion.div
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ duration: reduce ? 0 : 0.9, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{
            background:
              fill === TONES.brand
                ? 'linear-gradient(90deg, var(--brand), var(--brand-to))'
                : fill,
          }}
        />
      </div>
    </div>
  )
}
