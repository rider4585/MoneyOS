/**
 * GlassCard → Pulse "Panel" (spec §4/§6): raised surface, hairline border,
 * layered shadow, no blur — frosted glass is reserved for the dock/sheets.
 * Export name kept as GlassCard so callers stay untouched.
 */
export default function GlassCard({ className = '', children, ...rest }) {
  return (
    <div className={`panel rounded-[18px] ${className}`} {...rest}>
      {children}
    </div>
  )
}
