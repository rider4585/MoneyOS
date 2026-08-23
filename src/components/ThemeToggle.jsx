import { Moon, Sun } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '../theme/ThemeProvider.jsx'
import Pressable from './ui/Pressable.jsx'

/** Neumorphic inset track with a sliding sun/moon knob. */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'

  return (
    <Pressable
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Toggle dark mode"
      onClick={toggleTheme}
      className="neu-inset relative h-10 w-[4.5rem] rounded-full bg-surface"
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`neu-raised-sm absolute top-1 grid h-8 w-8 place-items-center rounded-full bg-surface-raised ${
          dark ? 'right-1 text-violet-300' : 'left-1 text-amber-500'
        }`}
      >
        {dark ? <Moon size={16} /> : <Sun size={16} />}
      </motion.span>
    </Pressable>
  )
}
