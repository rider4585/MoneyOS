import { useEffect, useMemo, useState } from 'react'
import repository from '../../data/index.js'
import { BottomSheet, Button, NeuInput } from '../../components/ui/index.js'

function rupeesToMinor(text) {
  const n = Number.parseFloat(text)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

/**
 * SettleSheet — partial or full settlement of one ledger entry.
 * Writes settled_inr_minor via settleLedgerEntry(id, inrMinor): the repo
 * accumulates and clamps at principal_inr_minor, so "Settle full" sends the
 * remaining outstanding and over-typed amounts clamp safely.
 */
export default function SettleSheet({ open, onClose, entry = null, onSettled }) {
  const [amountText, setAmountText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const outstandingMinor = useMemo(() => {
    if (!entry) return 0
    return Math.max(0, entry.principal_inr_minor - entry.settled_inr_minor)
  }, [entry])

  useEffect(() => {
    if (!open) return
    setAmountText('')
    setError(null)
    setBusy(false)
  }, [open, entry?.id])

  async function settle(minorAmount) {
    if (!(minorAmount > 0)) {
      setError('Enter an amount greater than zero')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await repository.settleLedgerEntry(entry.id, minorAmount)
      onSettled?.()
      onClose?.()
    } catch (err) {
      setError(err?.message ?? 'Could not record settlement')
    } finally {
      setBusy(false)
    }
  }

  function handlePartial() {
    const minor = rupeesToMinor(amountText)
    if (minor == null) {
      setError('Enter an amount greater than zero')
      return
    }
    settle(minor)
  }

  const fmt = (m) => `₹${(m / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  return (
    <BottomSheet
      open={open && entry !== null}
      onClose={onClose}
      title="Settle up"
      subtitle={entry ? `${entry.counterparty} · ${entry.type === 'lent' ? 'they owe you' : 'you owe them'}` : null}
      bodyClassName="space-y-4"
    >
      {entry ? (
        <>
          <div className="neu-inset rounded-2xl bg-base px-4 py-3 text-center">
            <p className="text-xs font-medium text-muted">Outstanding</p>
            <p className="font-display mt-0.5 text-2xl font-bold tabular-nums">
              {fmt(outstandingMinor)}
            </p>
            <p className="mt-1 text-[11px] text-faint tabular-nums">
              settled so far {fmt(entry.settled_inr_minor)} of {fmt(entry.principal_inr_minor)}
            </p>
          </div>

          <Button variant="brand" fullWidth onClick={() => settle(outstandingMinor)} disabled={busy}>
            {busy ? 'Recording…' : `Settle full · ${fmt(outstandingMinor)}`}
          </Button>

          <div className="flex items-center gap-2">
            <span aria-hidden className="h-px flex-1 bg-faint/30" />
            <span className="text-xs font-medium text-faint">or partially</span>
            <span aria-hidden className="h-px flex-1 bg-faint/30" />
          </div>

          <NeuInput
            label="Partial amount (INR)"
            prefix="₹"
            inputMode="decimal"
            placeholder="0"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value.replace(/[^0-9.]/g, ''))}
            suffix="INR"
          />

          {error ? (
            <p role="alert" className="text-xs font-semibold text-expense">
              {error}
            </p>
          ) : null}

          <Button variant="raised" fullWidth onClick={handlePartial} disabled={busy}>
            Record partial payment
          </Button>
        </>
      ) : null}
    </BottomSheet>
  )
}
