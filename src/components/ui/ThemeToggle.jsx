import { Moon, Sun } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '../../theme/ThemeProvider.jsx'
import Pressable from './Pressable.jsx'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'

  return (
    <Pressable
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Toggle dark mode"
      onClick={toggleTheme}
      className={`neu-inset relative h-10 w-[4.5rem] rounded-full bg-field ${className}`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className={`absolute top-1 grid h-8 w-8 place-items-center rounded-full border border-border bg-surface-raised shadow-[var(--shadow-sm)] ${
          dark ? 'right-1 text-brand' : 'left-1 text-emi'
        }`}
      >
        {dark ? <Moon size={16} /> : <Sun size={16} />}
      </motion.span>
    </Pressable>
  )
}
