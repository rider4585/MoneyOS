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
  className = '',
}) {
  const TrendIcon =
    trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null
  const bullish =
    trend === 'up' ? !trendInverse : trend === 'down' ? trendInverse : null
  const trendTone = bullish === null ? 'text-muted' : bullish ? 'text-income' : 'text-expense'

  return (
    <div className={`neu-card rounded-3xl bg-surface p-4 sm:p-5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        {label ? (
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
        ) : (
          <span />
        )}
        {Icon ? (
          <span className="neu-inset grid h-8 w-8 place-items-center rounded-xl bg-base text-brand">
            <Icon size={15} aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="font-display mt-2 text-xl font-bold sm:text-2xl">
        <Amount value={value} minor={minor} />
      </p>
      {TrendIcon && (trendDelta || trendLabel) ? (
        <p className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${trendTone}`}>
          <TrendIcon size={13} aria-hidden />
          {trendDelta}
          {trendLabel ? <span className="font-normal text-faint">{trendLabel}</span> : null}
        </p>
      ) : null}
    </div>
  )
}
