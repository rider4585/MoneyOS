/**
 * EmptyState → Pulse dashed panel with a decorative constellation
 * (spec §6). Icon sits in a filled field squircle.
 */
export default function EmptyState({ icon: Icon, title, message, action, className = '' }) {
  return (
    <div
      className={`relative flex flex-col items-center gap-3 overflow-hidden rounded-[18px] border border-dashed border-border-strong px-6 py-10 text-center ${className}`}
    >
      <svg
        aria-hidden
        viewBox="0 0 200 80"
        className="pointer-events-none absolute inset-x-0 top-2 h-16 w-full text-brand/35"
        fill="none"
      >
        <circle cx="30" cy="40" r="1.6" fill="currentColor" />
        <circle cx="78" cy="18" r="1.2" fill="currentColor" />
        <circle cx="126" cy="52" r="1.6" fill="currentColor" />
        <circle cx="172" cy="26" r="1.2" fill="currentColor" />
        <path d="M30 40 78 18l48 34 46-26" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 4" />
      </svg>
      <span className="relative grid h-14 w-14 place-items-center rounded-2xl border border-border bg-field text-faint">
        {Icon ? <Icon size={24} aria-hidden /> : null}
      </span>
      <p className="font-display relative text-base font-bold tracking-tight">{title}</p>
      {message ? <p className="relative max-w-[36ch] text-sm text-muted">{message}</p> : null}
      {action ? <div className="relative pt-2">{action}</div> : null}
    </div>
  )
}
