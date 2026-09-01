import { useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatMinorToDisplay, resolveDisplayCurrency } from '../../lib/display.js'

/**
 * SpendChart — Pulse daily spend curve (spec §6/§7): 2px brand gradient line
 * with a soft area fill that fades to transparent, dotted faint gridlines and
 * a dark-glass tooltip. All colors come from CSS custom properties so the
 * chart flips with light/dark automatically.
 */
const TICK_FONT = {
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontWeight: 500,
}

export default function SpendChart({ data = [], monthShort = '', height = 180 }) {
  const lineId = `spend-line-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const areaId = `spend-area-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  const ChartTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const minor = payload[0]?.value ?? 0
    return (
      <div className="glass-panel rounded-2xl px-3 py-2 text-xs">
        <p className="font-medium text-muted">{`${monthShort} ${label}`}</p>
        <p className="font-display mt-0.5 text-sm font-bold tabular-nums">
          {formatMinorToDisplay(minor, resolveDisplayCurrency())}
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id={lineId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--brand)" />
            <stop offset="100%" stopColor="var(--brand-to)" />
          </linearGradient>
          <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.24} />
            <stop offset="100%" stopColor="var(--brand-to)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--faint)" strokeOpacity={0.22} strokeDasharray="3 6" />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted)', ...TICK_FONT }}
          tickMargin={6}
          minTickGap={18}
        />
        <YAxis hide domain={[0, 'auto']} />
        <Tooltip
          content={<ChartTip />}
          cursor={{ stroke: 'var(--faint)', strokeOpacity: 0.4, strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke={`url(#${lineId})`}
          strokeWidth={2}
          fill={`url(#${areaId})`}
          dot={false}
          activeDot={{ r: 4, fill: 'var(--brand)', stroke: 'var(--base)', strokeWidth: 2 }}
          isAnimationActive
          animationDuration={700}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
