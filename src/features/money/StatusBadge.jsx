const TONES = {
  open: 'text-faint',
  partially_settled: 'text-emi',
  settled: 'text-income',
}

const LABELS = {
  open: 'Open',
  partially_settled: 'Partly settled',
  settled: 'Settled',
}

/** Small neumorphic pill badge for ledger entry status (open / partially_settled / settled). */
export default function StatusBadge({ status, className = '' }) {
  return (
    <span
      className={`neu-inset inline-flex items-center rounded-full bg-base px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase ${TONES[status] ?? TONES.open} ${className}`}
    >
      {LABELS[status] ?? LABELS.open}
    </span>
  )
}

/** Derive ledger status per schema semantics from settled vs principal (INR minor). */
export function ledgerStatus(entry) {
  const principal = Number(entry.principal_inr_minor ?? 0)
  const settled = Number(entry.settled_inr_minor ?? 0)
  if (principal > 0 && settled >= principal) return 'settled'
  if (settled > 0) return 'partially_settled'
  return 'open'
}
