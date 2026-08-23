import { useId } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatInr } from '../../lib/money.js'

/**
 * SpendChart — spend-by-day bars for one month, styled to the design system.
 * Colors come straight from the CSS custom properties (--brand/--brand-to/
 * --faint/--ink), so the chart flips with light/dark automatically.
 */
export default function SpendChart({ data = [], monthShort = '', height = 180 }) {
  const gradientId = `spend-bar-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  const ChartTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const minor = payload[0]?.value ?? 0
    if (!minor) return null
    return (
      <div className="glass-panel rounded-2xl px-3 py-2 text-xs">
        <p className="font-medium text-muted">{`${monthShort} ${label}`}</p>
        <p className="font-display mt-0.5 text-sm font-bold tabular-nums">
          {formatInr(minor)}
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap="18%">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" />
            <stop offset="100%" stopColor="var(--brand-to)" />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--faint)" strokeOpacity={0.3} strokeDasharray="3 6" />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted)', fontSize: 10 }}
          tickMargin={6}
          minTickGap={18}
        />
        <YAxis hide domain={[0, 'auto']} />
        <Tooltip
          content={<ChartTip />}
          cursor={{ fill: 'color-mix(in srgb, var(--brand) 10%, transparent)' }}
        />
        <Bar
          dataKey="amount"
          fill={`url(#${gradientId})`}
          radius={[5, 5, 2, 2]}
          maxBarSize={18}
          isAnimationActive
          animationDuration={700}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
