import Pressable from './Pressable.jsx'

const VARIANTS = {
  raised: 'neu-raised-sm bg-surface text-ink hover:text-brand',
  pressed: 'neu-inset bg-base text-muted',
  flat: 'bg-transparent text-brand',
  brand: 'bg-gradient-brand text-white',
  income: 'bg-income text-white',
  expense: 'bg-expense text-white',
}

const SIZES = {
  sm: 'gap-1.5 rounded-xl px-3 py-1.5 text-xs',
  md: 'gap-2 rounded-2xl px-5 py-2.5 text-sm',
  lg: 'gap-2.5 rounded-[1.25rem] px-6 py-3.5 text-base',
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
