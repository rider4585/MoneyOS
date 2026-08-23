import Pressable from './Pressable.jsx'

export default function CategoryChip({
  icon: Icon,
  label,
  color,
  active = false,
  onClick,
  className = '',
}) {
  const Tag = onClick ? Pressable : 'span'

  return (
    <Tag
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
        active ? 'neu-inset' : 'neu-raised-sm'
      } ${className}`}
      style={{
        backgroundColor: color ? `color-mix(in srgb, ${color} 14%, transparent)` : undefined,
        color: color || undefined,
      }}
    >
      {Icon ? <Icon size={13} aria-hidden /> : null}
      {label}
    </Tag>
  )
}
