import { useEffect, useState } from 'react'
import repository from '../../data/index.js'
import { BottomSheet, Button, NeuInput } from '../../components/ui/index.js'

function rupeesToMinor(text) {
  const n = Number.parseFloat(text)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

/** Next occurrence of a fixed due day (1–28) — this month if still ahead, else next month. */
export function nextDueFromDay(dayOfMonth) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = Number(dayOfMonth)
  const target = d >= now.getDate() ? new Date(y, m, d) : new Date(y, m + 1, d)
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`
}

/**
 * AddEmiSheet — register an active loan: principal, lender, tenure
 * (installment count) and per-installment amount, plus the monthly due
 * day (1–28) used to derive the first next_due_date.
 */
export default function AddEmiSheet({ open, onClose, onSaved }) {
  const [name, setName] = useState('')
  const [lender, setLender] = useState('')
  const [principalText, setPrincipalText] = useState('')
  const [tenureText, setTenureText] = useState('')
  const [emiText, setEmiText] = useState('')
  const [rateText, setRateText] = useState('')
  const [dueDay, setDueDay] = useState('5')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setLender('')
    setPrincipalText('')
    setTenureText('')
    setEmiText('')
    setRateText('')
    setDueDay('5')
    setError(null)
    setBusy(false)
  }, [open])

  async function handleSave() {
    const principalMinor = rupeesToMinor(principalText)
    const emiMinor = rupeesToMinor(emiText)
    const tenure = Number.parseInt(tenureText, 10)
    const day = Number.parseInt(dueDay, 10)
    if (!name.trim()) return setError('Give the loan a name')
    if (principalMinor == null) return setError('Enter a valid principal')
    if (!Number.isInteger(tenure) || tenure < 1 || tenure > 600) return setError('Installments must be between 1 and 600')
    if (emiMinor == null) return setError('Enter a valid installment amount')
    if (!Number.isInteger(day) || day < 1 || day > 28) return setError('Due day must be between 1 and 28')

    setBusy(true)
    setError(null)
    try {
      const saved = await repository.addEmi({
        name: name.trim(),
        lender: lender.trim() || null,
        currency: 'INR',
        principal_minor: principalMinor,
        tenure_months: tenure,
        emi_amount_minor: emiMinor,
        interest_rate_pa: rateText.trim() === '' ? null : Number.parseFloat(rateText),
        start_date: new Date().toISOString().slice(0, 10),
        next_due_date: nextDueFromDay(day),
      })
      onSaved?.(saved)
      onClose?.()
    } catch (err) {
      setError(err?.message ?? 'Could not save loan')
    } finally {
      setBusy(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Add loan"
      subtitle="Track EMIs with progress and due reminders"
      bodyClassName="space-y-4"
    >
      <NeuInput
        label="Loan name"
        placeholder="e.g. Car loan"
        maxLength={80}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <NeuInput
        label="Lender"
        placeholder="e.g. HDFC Bank"
        maxLength={80}
        value={lender}
        onChange={(e) => setLender(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <NeuInput
          label="Principal (INR)"
          prefix="₹"
          inputMode="decimal"
          placeholder="0"
          value={principalText}
          onChange={(e) => setPrincipalText(e.target.value.replace(/[^0-9.]/g, ''))}
        />
        <NeuInput
          label="Interest % p.a."
          suffix="%"
          inputMode="decimal"
          placeholder="optional"
          value={rateText}
          onChange={(e) => setRateText(e.target.value.replace(/[^0-9.]/g, ''))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NeuInput
          label="Installments"
          suffix="months"
          inputMode="numeric"
          placeholder="e.g. 24"
          value={tenureText}
          onChange={(e) => setTenureText(e.target.value.replace(/[^0-9]/g, ''))}
        />
        <NeuInput
          label="Per installment (INR)"
          prefix="₹"
          inputMode="decimal"
          placeholder="0"
          value={emiText}
          onChange={(e) => setEmiText(e.target.value.replace(/[^0-9.]/g, ''))}
        />
      </div>

      <NeuInput
        label="Due day of month"
        suffix="/28 max"
        inputMode="numeric"
        value={dueDay}
        onChange={(e) => setDueDay(e.target.value.replace(/[^0-9]/g, ''))}
        hint="First due date is the next occurrence of this day"
        error={
          dueDay !== '' && !(Number(dueDay) >= 1 && Number(dueDay) <= 28)
            ? 'Must be 1–28'
            : undefined
        }
      />

      {error ? (
        <p role="alert" className="text-xs font-semibold text-expense">
          {error}
        </p>
      ) : null}

      <Button variant="brand" size="lg" fullWidth onClick={handleSave} disabled={busy}>
        {busy ? 'Saving…' : 'Add loan'}
      </Button>
    </BottomSheet>
  )
}
