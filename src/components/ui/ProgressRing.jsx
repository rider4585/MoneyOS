import { motion, useReducedMotion } from 'framer-motion'

const TONES = {
  brand: 'var(--brand)',
  income: 'var(--income)',
  expense: 'var(--expense)',
  emi: 'var(--emi)',
}

export default function ProgressRing({
  value = 0,
  max = 100,
  size = 96,
  thickness = 10,
  tone = 'brand',
  sublabel,
  className = '',
}) {
  const reduce = useReducedMotion()
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const stroke = TONES[tone] ?? tone

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      className={`relative inline-grid place-items-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className="stroke-faint/25"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - ratio) }}
          transition={{ duration: reduce ? 0 : 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-tight">
        <div>
          <span className="font-display block text-sm font-bold tabular-nums">
            {Math.round(ratio * 100)}%
          </span>
          {sublabel ? (
            <span className="block text-[10px] font-medium text-faint">{sublabel}</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
