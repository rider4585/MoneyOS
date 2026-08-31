import { useId } from 'react'
import { motion } from 'framer-motion'
import Pressable from './Pressable.jsx'

export default function SegmentedControl({ options = [], value, onChange, className = '' }) {
  const groupId = useId()

  return (
    <div role="tablist" className={`flex gap-1 rounded-[14px] border border-border bg-field p-1 ${className}`}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange?.(option.value)}
            className="relative min-w-0 flex-1 justify-center rounded-[10px] px-3 py-2 focus-visible:ring-2 focus-visible:ring-brand/60"
          >
            {selected ? (
              <motion.span
                layoutId={`segmented-${groupId}`}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                className="absolute inset-0 rounded-[10px] border border-border bg-surface-raised shadow-[var(--shadow-sm)]"
              />
            ) : null}
            <span
              className={`relative z-10 inline-flex items-center justify-center gap-1.5 truncate text-xs font-semibold transition-colors ${
                selected ? 'text-ink' : 'text-muted'
              }`}
            >
              {option.icon ? <option.icon size={13} aria-hidden /> : null}
              {option.label}
            </span>
          </Pressable>
        )
      })}
    </div>
  )
}
