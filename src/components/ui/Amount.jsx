import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import CountUp from './CountUp.jsx'
import { INR } from '../../lib/money.js'
import { formatMinorToDisplay, resolveDisplayCurrency } from '../../lib/display.js'

function formatNumber(n) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

export default function Amount({
  value = 0,
  minor = false,
  signed = false,
  colored = true,
  animate = true,
  showArrow = false,
  prefix = '₹',
  className = '',
}) {
  // minor amounts are always INR minor units; the display currency decides
  // whether those render as ₹ or as the user's chosen currency.
  const displayCurrency = minor ? resolveDisplayCurrency() : INR
  const rupees = minor ? Number(value) / 100 : Number(value)
  const magnitude = Math.abs(rupees)
  const sign = signed ? (rupees > 0 ? '+' : rupees < 0 ? '-' : '') : ''
  const tone = !colored ? '' : rupees > 0 ? 'text-income' : rupees < 0 ? 'text-expense' : ''

  /* Directional glyph beside the figure (pulse §6); opt-in, default off */
  const Arrow =
    showArrow && colored ? (rupees > 0 ? ArrowUpRight : rupees < 0 ? ArrowDownRight : null) : null

  const format = (n) =>
    minor
      ? `${sign}${formatMinorToDisplay(Math.round(n), displayCurrency)}`
      : `${sign}${prefix}${formatNumber(n)}`

  const figure = animate ? <CountUp value={magnitude} format={format} /> : <span>{format(magnitude)}</span>

  return (
    <span className={`inline-flex items-baseline gap-0.5 tabular-nums font-semibold ${tone} ${className}`}>
      {figure}
      {Arrow ? <Arrow className="size-[1em] shrink-0" aria-hidden /> : null}
    </span>
  )
}
