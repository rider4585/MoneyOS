import { useId, useRef } from 'react'
import { motion } from 'framer-motion'
import Pressable from './Pressable.jsx'

export default function SegmentedControl({ options = [], value, onChange, className = '' }) {
  const groupId = useId()
  const listRef = useRef(null)

  // Roving-tabindex tabs: only the selected tab is in the tab order; arrow
  // keys / Home / End move focus (and selection) between the options.
  function focusIndex(index) {
    const node = listRef.current
    const buttons = node ? Array.from(node.querySelectorAll('[role="tab"]')) : []
    const target = buttons[index]
    target?.focus()
  }

  function handleKeyDown(event, index) {
    const last = options.length - 1
    let next = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index === last ? 0 : index + 1
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index === 0 ? last : index - 1
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = last
    if (next === null) return
    event.preventDefault()
    onChange?.(options[next].value)
    focusIndex(next)
  }

  return (
    <div
      role="tablist"
      ref={listRef}
      className={`flex gap-1 rounded-[14px] border border-border bg-field p-1 ${className}`}
    >
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange?.(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
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
