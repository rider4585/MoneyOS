import { Amount, Pressable } from '../../components/ui/index.js'
import { INR } from '../../lib/money.js'
import { categoryById, FALLBACK_CATEGORY } from './categories.js'

function shortDate(iso) {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/**
 * TxnRow — one transaction line: colored category dot, note, date/method,
 * fx badge for foreign-currency origins, signed INR amount.
 * Tap opens the edit sheet (wired by the parent).
 */
export default function TxnRow({ txn, onClick }) {
  const cat = categoryById(txn.category_id) ?? FALLBACK_CATEGORY
  const isIncome = txn.type === 'income'
  const signedInrMinor = isIncome ? txn.inr_amount_minor : -txn.inr_amount_minor

  return (
    <Pressable
      as="div"
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      className="neu-raised-sm flex w-full items-center gap-3 rounded-2xl bg-surface px-3.5 py-3"
    >
      <span
        aria-hidden
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold"
        style={{ backgroundColor: `color-mix(in srgb, ${cat.color} 16%, transparent)`, color: cat.color }}
      >
        {cat.name.slice(0, 1)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          {txn.description || cat.name}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
          {shortDate(txn.note_date)}
          {txn.payment_method ? <span aria-hidden>·</span> : null}
          {txn.payment_method ? <span className="truncate">{txn.payment_method}</span> : null}
          {txn.currency && txn.currency !== INR ? (
            <span className="neu-inset rounded-full bg-base px-1.5 py-px text-[9px] font-bold tracking-wide uppercase text-faint">
              {txn.currency}
            </span>
          ) : null}
        </span>
      </span>

      <Amount value={signedInrMinor} minor signed className="shrink-0 text-sm" />
    </Pressable>
  )
}
