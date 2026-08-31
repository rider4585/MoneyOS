import Pressable from './Pressable.jsx'

/**
 * CategoryChip → Pulse translucent tinted pill (spec §6):
 * color-mix tint background + colored text; active state deepens the tint
 * and adds a same-hue hairline ring.
 */
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
        onClick ? 'focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:outline-none' : ''
      } ${className}`}
      style={{
        backgroundColor: color
          ? `color-mix(in srgb, ${color} ${active ? 26 : 14}%, transparent)`
          : `var(--field)`,
        borderColor: color && active ? `color-mix(in srgb, ${color} 45%, transparent)` : 'var(--border)',
        color: color || (active ? 'var(--ink)' : 'var(--muted)'),
      }}
    >
      {Icon ? <Icon size={13} aria-hidden /> : null}
      {label}
    </Tag>
  )
}
