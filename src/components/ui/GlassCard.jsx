export default function GlassCard({ className = '', children, ...rest }) {
  return (
    <div className={`glass-panel rounded-3xl ${className}`} {...rest}>
      {children}
    </div>
  )
}
