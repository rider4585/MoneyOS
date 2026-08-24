import { useEffect } from 'react'
import { motion, animate, useMotionValue, useTransform } from 'framer-motion'

/**
 * CountUp — animated count-up for amounts (board.md motion rules).
 * Renders tabular numerals; pass `format` to control display (e.g. ₹ + grouping).
 */
export default function CountUp({ value = 0, duration = 1.1, format = (n) => String(n), className = '' }) {
  const count = useMotionValue(0)
  const whole = Number.isInteger(value)
  const text = useTransform(count, (latest) => format(whole ? Math.round(latest) : latest))

  useEffect(() => {
    const controls = animate(count, value, { duration, ease: 'easeOut' })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <motion.span className={`tabular-nums ${className}`}>
      <motion.span>{text}</motion.span>
    </motion.span>
  )
}
