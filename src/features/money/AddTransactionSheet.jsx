import { useEffect, useMemo, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import repository from '../../data/index.js'
import { INR } from '../../lib/money.js'
import { fetchFxRateToInr } from '../../lib/fx.js'
import {
  BottomSheet,
  Button,
  CategoryChip,
  EmptyState,
  NeuInput,
  NeuSelect,
  SegmentedControl,
} from '../../components/ui/index.js'
import { useCategories } from '../categories.js'
import ConfirmSheet from './ConfirmSheet.jsx'

export const ENTRY_CURRENCIES = [INR, 'USD', 'EUR', 'GBP', 'AED', 'SGD']

const PAYMENT_METHODS = ['UPI', 'Cash', 'Card', 'NEFT', 'Bank transfer', 'Other']

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense', icon: ArrowUpCircle },
  { value: 'income', label: 'Income', icon: ArrowDownCircle },
]

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function rupeesToMinor(text) {
  const n = Number.parseFloat(text)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

/**
 * AddTransactionSheet — create/edit a transaction via the FAB or tap-to-edit.
 * Keypad-friendly amount, expense/income toggle, category chips, optional
 * non-INR currency with an entry-time fx snapshot preview (repo persists it),
 * date, note and payment method. Consumes ONLY the repository contract.
 */
export default function AddTransactionSheet({ open, onClose, prefill = null, onSaved }) {
  const editing = Boolean(prefill)

  const [type, setType] = useState('expense')
  const [amountText, setAmountText] = useState('')
  const [currency, setCurrency] = useState(INR)
  const [categoryId, setCategoryId] = useState(null)
  const [date, setDate] = useState(todayIso())
  const [note, setNote] = useState('')
  const [method, setMethod] = useState('UPI')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [fxRate, setFxRate] = useState(null)
  const { categories } = useCategories()
  const kindCats = useMemo(
    () => categories.filter((c) => c.kind === (type === 'income' ? 'income' : 'expense')),
    [categories, type]
  )

  // (Re)initialise the form whenever the sheet opens for a new target.
  useEffect(() => {
    if (!open) return
    setError(null)
    setBusy(false)
    setConfirmDelete(false)
    if (prefill) {
      setType(prefill.type ?? 'expense')
      setAmountText(String(Math.abs(prefill.amount_minor ?? 0) / 100))
      setCurrency(prefill.currency ?? INR)
      setCategoryId(prefill.category_id ?? null)
      setDate(prefill.note_date ?? todayIso())
      setNote(prefill.description ?? '')
      setMethod(prefill.payment_method ?? 'UPI')
    } else {
      setType('expense')
      setAmountText('')
      setCurrency(INR)
      setCategoryId(null)
      setDate(todayIso())
      setNote('')
      setMethod('UPI')
    }
  }, [open, prefill])

  // Keep the selected category valid for the active type (heals after load too).
  useEffect(() => {
    if (!categoryId || kindCats.every((c) => c.id !== categoryId)) {
      setCategoryId(kindCats[0]?.id ?? null)
    }
  }, [categoryId, kindCats]) // eslint-disable-line react-hooks/exhaustive-deps

  // Entry-time fx snapshot preview — fetched once per currency per session
  // (sessionStorage-cached inside fx.js); the repository re-snapshots on save.
  useEffect(() => {
    if (!open || currency === INR) {
      setFxRate(null)
      return undefined
    }
    let alive = true
    fetchFxRateToInr(currency)
      .then((rate) => {
        if (alive) setFxRate(rate)
      })
      .catch(() => {
        if (alive) setFxRate(null)
      })
    return () => {
      alive = false
    }
  }, [open, currency])

  const kind = type === 'income' ? 'income' : 'expense'
  const chips = kindCats
  const inrPreview = useMemo(() => {
    const minor = rupeesToMinor(amountText)
    if (minor == null || !fxRate) return null
    return Math.round(minor * fxRate) / 100
  }, [amountText, fxRate])

  async function handleSave() {
    const minor = rupeesToMinor(amountText)
    if (minor == null) {
      setError('Enter an amount greater than zero')
      return
    }
    setBusy(true)
    setError(null)
    const payload = {
      type,
      category_id: categoryId,
      currency,
      amount_minor: minor,
      note_date: date || todayIso(),
      description: note.trim(),
      payment_method: method,
    }
    try {
      const saved = editing
        ? await repository.updateTransaction(prefill.id, payload)
        : await repository.addTransaction(payload)
      onSaved?.(saved, editing)
      onClose?.()
    } catch (err) {
      setError(err?.message ?? 'Could not save transaction')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    try {
      await repository.deleteTransaction(prefill.id)
      setConfirmDelete(false)
      onSaved?.(null, true)
      onClose?.()
    } catch (err) {
      setError(err?.message ?? 'Could not delete transaction')
      setConfirmDelete(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={editing ? 'Edit transaction' : 'Add transaction'}
        subtitle={editing ? 'Update or remove this entry' : 'Every amount is stored in paise and shown in INR'}
        bodyClassName="space-y-4"
      >
        <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={setType} />

        {/* keypad-friendly amount + currency */}
        <span className="neu-inset flex items-center gap-2 rounded-2xl bg-base px-4 py-3 focus-within:ring-2 focus-within:ring-brand/50">
          <span className="font-display text-2xl leading-none font-bold text-faint">₹</span>
          <input
            value={amountText}
            onChange={(e) => setAmountText(e.target.value.replace(/[^0-9.]/g, ''))}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            aria-label="Amount in rupees"
            className="font-display w-full min-w-0 bg-transparent text-2xl font-bold tabular-nums outline-none placeholder:text-faint/60"
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            aria-label="Currency"
            className="neu-raised-sm shrink-0 cursor-pointer rounded-xl bg-surface px-2 py-1.5 text-xs font-bold outline-none"
          >
            {ENTRY_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </span>
        {currency !== INR && (
          <p className="-mt-2 text-xs text-muted">
            {fxRate ? (
              <>
                Snapshot at entry · 1 {currency} ≈ ₹{fxRate.toFixed(4)}
                {inrPreview != null ? <> · this entry ≈ ₹{inrPreview.toLocaleString('en-IN')}</> : null}
              </>
            ) : (
              <>Fetching live rate…</>
            )}
          </p>
        )}

        {/* category chips */}
        {chips.length > 0 ? (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {chips.map((cat) => (
              <CategoryChip
                key={cat.id}
                label={cat.name}
                color={cat.color}
                active={categoryId === cat.id}
                onClick={() => setCategoryId(cat.id)}
                className="shrink-0"
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={ArrowDownCircle} title={`No ${kind} categories`} className="py-4" />
        )}

        <div className="grid grid-cols-2 gap-3">
          <NeuInput
            label="Date"
            type="date"
            value={date}
            max="2100-12-31"
            onChange={(e) => setDate(e.target.value)}
          />
          <NeuSelect
            label="Paid via"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            options={PAYMENT_METHODS}
          />
        </div>

        <NeuInput
          label="Note"
          placeholder="What was this for?"
          maxLength={140}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {error ? (
          <p role="alert" className="text-xs font-semibold text-expense">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2.5 pt-1">
          {editing && (
            <Button variant="raised" onClick={() => setConfirmDelete(true)} disabled={busy} className="shrink-0">
              Delete
            </Button>
          )}
          <Button variant="brand" size="lg" fullWidth onClick={handleSave} disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Add transaction'}
          </Button>
        </div>
      </BottomSheet>

      <ConfirmSheet
        open={confirmDelete}
        title="Delete this transaction?"
        message={
          prefill
            ? `“${prefill.description || 'Untitled'}” will be removed permanently.`
            : 'This entry will be removed permanently.'
        }
        confirmLabel="Delete"
        busy={busy}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  )
}
