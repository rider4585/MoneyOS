import { useId } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * NeuSelect → Pulse filled field: filled surface, borderless at rest,
 * brand ring on focus (matches NeuInput).
 */
export default function NeuSelect({
  label,
  options = [],
  error,
  hint,
  className = '',
  selectClassName = '',
  children,
  ...rest
}) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  const tone = error
    ? 'border-expense/60 focus-visible:border-expense focus-visible:ring-expense/25'
    : 'border-transparent focus-visible:border-brand focus-visible:ring-brand/25'

  return (
    <label htmlFor={id} className={`block ${className}`}>
      {label ? <span className="micro-label mb-1.5 block">{label}</span> : null}
      <span className="relative block">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`w-full appearance-none rounded-[14px] border bg-field px-4 py-3 pr-10 text-sm text-ink outline-none transition-colors focus-visible:ring-2 ${tone} ${selectClassName}`}
          {...rest}
        >
          {children ??
            options.map((option) => {
              const val = typeof option === 'string' ? option : option.value
              const lbl = typeof option === 'string' ? option : (option.label ?? option.value)
              return (
                <option key={val} value={val}>
                  {lbl}
                </option>
              )
            })}
        </select>
        <ChevronDown
          size={16}
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-faint"
        />
      </span>
      {error ? (
        <span id={`${id}-error`} role="alert" className="mt-1 block text-xs font-medium text-expense">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="mt-1 block text-xs text-faint">
          {hint}
        </span>
      ) : null}
    </label>
  )
}
