import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Users } from 'lucide-react'
import repository from '../../data/index.js'
import {
  BottomSheet,
  Button,
  NeuInput,
  SegmentedControl,
} from '../../components/ui/index.js'

const DIRECTION_OPTIONS = [
  { value: 'lent', label: 'I lent', icon: ArrowUpRight },
  { value: 'borrow', label: 'I borrowed', icon: ArrowDownLeft },
]

function rupeesToMinor(text) {
  const n = Number.parseFloat(text)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * LedgerEntrySheet — create a borrow/lent entry: direction, person,
 * amount (INR), optional due date and note. Persists via the repository
 * contract; settlement stays separate (SettleSheet).
 */
export default function LedgerEntrySheet({ open, onClose, nameSuggestions = [], onSaved }) {
  const [direction, setDirection] = useState('lent')
  const [person, setPerson] = useState('')
  const [amountText, setAmountText] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setDirection('lent')
    setPerson('')
    setAmountText('')
    setDueDate('')
    setNotes('')
    setError(null)
    setBusy(false)
  }, [open])

  async function handleSave() {
    const minor = rupeesToMinor(amountText)
    if (!person.trim()) return setError('Who is this with?')
    if (minor == null) return setError('Enter an amount greater than zero')
    setBusy(true)
    setError(null)
    try {
      const saved = await repository.addLedgerEntry({
        type: direction,
        counterparty: person.trim(),
        currency: 'INR',
        principal_minor: minor,
        due_date: dueDate || null,
        notes: notes.trim() || null,
      })
      onSaved?.(saved)
      onClose?.()
    } catch (err) {
      setError(err?.message ?? 'Could not save entry')
    } finally {
      setBusy(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="New ledger entry"
      subtitle="Track money you lent out or borrowed"
      bodyClassName="space-y-4"
    >
      <SegmentedControl options={DIRECTION_OPTIONS} value={direction} onChange={setDirection} />

      <NeuInput
        icon={Users}
        label="Person"
        placeholder="Name"
        list="ledger-people"
        maxLength={80}
        value={person}
        onChange={(e) => setPerson(e.target.value)}
      />
      <datalist id="ledger-people">
        {nameSuggestions.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <NeuInput
        label="Amount (INR)"
        prefix="₹"
        inputMode="decimal"
        placeholder="0"
        value={amountText}
        onChange={(e) => setAmountText(e.target.value.replace(/[^0-9.]/g, ''))}
      />

      <NeuInput
        label="Due date (optional)"
        type="date"
        min={todayIso()}
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        hint="Leave empty if there is no fixed repayment date"
      />

      <NeuInput
        label="Note (optional)"
        placeholder="What was this for?"
        maxLength={140}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {error ? (
        <p role="alert" className="text-xs font-semibold text-expense">
          {error}
        </p>
      ) : null}

      <Button variant="brand" size="lg" fullWidth onClick={handleSave} disabled={busy}>
        {busy ? 'Saving…' : direction === 'lent' ? 'Record lent' : 'Record borrow'}
      </Button>
    </BottomSheet>
  )
}
