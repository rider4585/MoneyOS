const SHAPES = {
  circle: 'h-12 w-12 rounded-full',
  card: 'h-32 w-full rounded-3xl',
  line: 'h-4 w-full rounded-lg',
}

export default function SkeletonLoader({ variant = 'line', lines = 3, className = '' }) {
  if (variant !== 'text') {
    return (
      <div
        aria-hidden
        className={`animate-pulse bg-faint/20 ${SHAPES[variant] ?? SHAPES.line} ${className}`}
      />
    )
  }

  return (
    <div aria-hidden className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`h-4 animate-pulse rounded-lg bg-faint/20 ${
            index === lines - 1 ? 'w-2/3' : 'w-full'
          }`}
        />
      ))}
    </div>
  )
}
