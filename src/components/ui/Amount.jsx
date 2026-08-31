import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import CountUp from './CountUp.jsx'

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
  const rupees = minor ? value / 100 : value
  const magnitude = Math.abs(rupees)
  const sign = signed ? (rupees > 0 ? '+' : rupees < 0 ? '-' : '') : ''
  const tone = !colored ? '' : rupees > 0 ? 'text-income' : rupees < 0 ? 'text-expense' : ''

  /* Directional glyph beside the figure (pulse §6); opt-in, default off */
  const Arrow =
    showArrow && colored ? (rupees > 0 ? ArrowUpRight : rupees < 0 ? ArrowDownRight : null) : null

  const figure = animate ? (
    <CountUp value={magnitude} format={(n) => `${sign}${prefix}${formatNumber(n)}`} />
  ) : (
    <span>{`${sign}${prefix}${formatNumber(magnitude)}`}</span>
  )

  return (
    <span className={`inline-flex items-baseline gap-0.5 tabular-nums font-semibold ${tone} ${className}`}>
      {figure}
      {Arrow ? <Arrow className="size-[1em] shrink-0" aria-hidden /> : null}
    </span>
  )
}
