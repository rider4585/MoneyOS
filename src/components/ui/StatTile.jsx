import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import Amount from './Amount.jsx'

export default function StatTile({
  label,
  value,
  minor = false,
  icon: Icon,
  trend,
  trendDelta,
  trendLabel,
  trendInverse = false,
  sparkline = null,
  className = '',
}) {
  const TrendIcon =
    trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null
  const bullish =
    trend === 'up' ? !trendInverse : trend === 'down' ? trendInverse : null
  /* Delta pills: solid semantic text on a translucent tint of itself (pulse §3) */
  const trendPill =
    bullish === null
      ? 'text-muted'
      : bullish
        ? 'bg-income/12 text-income'
        : 'bg-expense/12 text-expense'

  return (
    <div className={`panel rounded-[18px] p-4 sm:p-5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        {label ? (
          <p className="micro-label">{label}</p>
        ) : (
          <span />
        )}
        {Icon ? (
          <span className="grid h-8 w-8 place-items-center rounded-xl border border-border bg-field text-brand">
            <Icon size={15} aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="font-display mt-2 text-xl font-bold tracking-tight tabular-nums sm:text-2xl">
        <Amount value={value} minor={minor} />
      </p>
      {sparkline ? (
        <div className="mt-3" aria-hidden>
          {sparkline}
        </div>
      ) : null}
      {TrendIcon && (trendDelta || trendLabel) ? (
        <p
          className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${trendPill}`}
        >
          <TrendIcon size={13} aria-hidden />
          {trendDelta}
          {trendLabel ? <span className="font-normal text-faint">{trendLabel}</span> : null}
        </p>
      ) : null}
    </div>
  )
}
