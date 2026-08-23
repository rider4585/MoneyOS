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
  prefix = '₹',
  className = '',
}) {
  const rupees = minor ? value / 100 : value
  const magnitude = Math.abs(rupees)
  const sign = signed ? (rupees > 0 ? '+' : rupees < 0 ? '-' : '') : ''
  const tone = !colored ? '' : rupees > 0 ? 'text-income' : rupees < 0 ? 'text-expense' : ''

  if (!animate) {
    return (
      <span className={`tabular-nums font-semibold ${tone} ${className}`}>
        {`${sign}${prefix}${formatNumber(magnitude)}`}
      </span>
    )
  }

  return (
    <CountUp
      value={magnitude}
      format={(n) => `${sign}${prefix}${formatNumber(n)}`}
      className={`${tone} font-semibold ${className}`}
    />
  )
}
