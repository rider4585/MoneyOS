export default function EmptyState({ icon: Icon, title, message, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center gap-3 px-6 py-10 text-center ${className}`}>
      <span className="neu-well grid h-16 w-16 place-items-center rounded-full bg-base text-faint">
        {Icon ? <Icon size={26} aria-hidden /> : null}
      </span>
      <p className="font-display text-base font-bold">{title}</p>
      {message ? <p className="max-w-[36ch] text-sm text-muted">{message}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  )
}
