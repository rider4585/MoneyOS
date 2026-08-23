import { useId } from 'react'

export default function NeuInput({
  label,
  icon: Icon,
  prefix,
  suffix,
  error,
  hint,
  className = '',
  inputClassName = '',
  ...rest
}) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <label htmlFor={id} className={`block ${className}`}>
      {label ? <span className="mb-1 block text-sm font-medium text-muted">{label}</span> : null}
      <span className="relative block">
        {Icon ? (
          <Icon
            size={16}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-faint"
          />
        ) : null}
        {prefix && !Icon ? (
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm font-semibold text-muted">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`neu-inset w-full rounded-2xl bg-base px-4 py-3 text-sm text-ink outline-none placeholder:text-faint focus:ring-2 ${
            error ? 'focus:ring-expense/60' : 'focus:ring-brand/50'
          } ${Icon || prefix ? 'pl-10' : ''} ${suffix ? 'pr-11' : ''} ${inputClassName}`}
          {...rest}
        />
        {suffix ? (
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs font-semibold text-faint">
            {suffix}
          </span>
        ) : null}
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
