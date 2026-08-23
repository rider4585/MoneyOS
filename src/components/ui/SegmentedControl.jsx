import { useId } from 'react'
import { motion } from 'framer-motion'
import Pressable from './Pressable.jsx'

export default function SegmentedControl({ options = [], value, onChange, className = '' }) {
  const groupId = useId()

  return (
    <div role="tablist" className={`neu-inset flex gap-1 rounded-2xl bg-base p-1 ${className}`}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange?.(option.value)}
            className="relative min-w-0 flex-1 justify-center rounded-xl px-3 py-2"
          >
            {selected ? (
              <motion.span
                layoutId={`segmented-${groupId}`}
                transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                className="neu-raised-sm absolute inset-0 rounded-xl bg-surface"
              />
            ) : null}
            <span
              className={`relative z-10 inline-flex items-center justify-center gap-1.5 truncate text-xs font-semibold ${
                selected ? 'text-brand' : 'text-muted'
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
