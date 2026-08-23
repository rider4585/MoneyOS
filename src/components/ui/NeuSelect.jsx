import { useId } from 'react'
import { ChevronDown } from 'lucide-react'

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

  return (
    <label htmlFor={id} className={`block ${className}`}>
      {label ? <span className="mb-1 block text-sm font-medium text-muted">{label}</span> : null}
      <span className="relative block">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`neu-inset w-full appearance-none rounded-2xl bg-base px-4 py-3 pr-10 text-sm text-ink outline-none focus:ring-2 ${
            error ? 'focus:ring-expense/60' : 'focus:ring-brand/50'
          } ${selectClassName}`}
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
