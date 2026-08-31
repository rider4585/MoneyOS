import { motion } from 'framer-motion'

/**
 * Pressable — every tap/click gets the Pulse press micro-feedback
 * (pulse spec §5: press scale 0.97, spring stiffness 320 / damping 26).
 * framer-motion's MotionConfig reducedMotion="user" disables it for users
 * who prefer reduced motion.
 */
export default function Pressable({
  as = 'button',
  scale = 0.97,
  className = '',
  children,
  ...rest
}) {
  const Component = motion[as] ?? motion.button

  return (
    <Component
      whileTap={{ scale }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={`cursor-pointer select-none ${className}`}
      {...rest}
    >
      {children}
    </Component>
  )
}
