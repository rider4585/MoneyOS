import Pressable from './Pressable.jsx'

/* Pulse treatments (spec §6) mapped onto the frozen v0.1 variant names.
   Glow shadows ride --glow-* vars and are decorative only. */
const VARIANTS = {
  raised: 'neu-raised-sm bg-surface text-ink hover:border-border-strong hover:text-brand',
  pressed: 'neu-inset bg-field text-muted',
  flat: 'bg-transparent text-brand hover:bg-brand/10',
  brand: 'bg-gradient-brand text-white shadow-[0_10px_28px_-6px_var(--glow-brand)]',
  income: 'bg-income text-white shadow-[0_10px_28px_-8px_var(--glow-income)]',
  expense: 'bg-expense text-white shadow-[0_10px_28px_-8px_var(--glow-expense)]',
}

const SIZES = {
  sm: 'gap-1.5 rounded-xl px-3 py-1.5 text-xs',
  md: 'gap-2 rounded-[14px] px-5 py-2.5 text-sm',
  lg: 'gap-2.5 rounded-[14px] px-6 py-3.5 text-base',
}

export default function Button({
  variant = 'raised',
  size = 'md',
  icon: Icon,
  trailingIcon: TrailingIcon,
  fullWidth = false,
  className = '',
  children,
  ...rest
}) {
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 17

  return (
    <Pressable
      type="button"
      className={`inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${
        VARIANTS[variant] ?? VARIANTS.raised
      } ${SIZES[size] ?? SIZES.md} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {Icon ? <Icon size={iconSize} aria-hidden /> : null}
      {children}
      {TrailingIcon ? <TrailingIcon size={iconSize} aria-hidden /> : null}
    </Pressable>
  )
}
