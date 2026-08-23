import { motion } from 'framer-motion'

/**
 * Pressable — every tap/click gets spring-scale micro-feedback
 * (board.md: "spring scale on press, haptic-style bounce").
 * framer-motion's MotionConfig reducedMotion="user" disables it for users
 * who prefer reduced motion.
 */
export default function Pressable({
  as = 'button',
  scale = 0.93,
  className = '',
  children,
  ...rest
}) {
  const Component = motion[as] ?? motion.button

  return (
    <Component
      whileTap={{ scale }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      className={`cursor-pointer select-none ${className}`}
      {...rest}
    >
      {children}
    </Component>
  )
}
