const SHAPES = {
  circle: 'h-12 w-12 rounded-full',
  card: 'h-32 w-full rounded-[18px]',
  line: 'h-4 w-full rounded-lg',
}

/* Shimmer sweep (pulse §5); reduced-motion renders static blocks via CSS */
export default function SkeletonLoader({ variant = 'line', lines = 3, className = '' }) {
  if (variant !== 'text') {
    return (
      <div aria-hidden className={`skeleton-shimmer ${SHAPES[variant] ?? SHAPES.line} ${className}`} />
    )
  }

  return (
    <div aria-hidden className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`skeleton-shimmer h-4 rounded-lg ${index === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  )
}
