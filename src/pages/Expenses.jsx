import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, ReceiptText, SearchX } from 'lucide-react'
import repository from '../data/index.js'
import { formatMinorToDisplay, resolveDisplayCurrency } from '../lib/display.js'
import {
  Button,
  CategoryChip,
  EmptyState,
  NeuInput,
  SegmentedControl,
  SkeletonLoader,
} from '../components/ui/index.js'
import { useAddTransaction } from '../features/money/AddTransactionProvider.jsx'
import TxnRow from '../features/money/TxnRow.jsx'
import { useCategories } from '../features/categories.js'

/**
 * Expenses — every transaction: search, type + category filters, month
 * grouping, date/amount sorting, tap-to-edit and delete-with-confirm
 * (edit sheet lives in features/money and is shared with the FAB).
 */

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Recent' },
  { value: 'date-asc', label: 'Oldest' },
  { value: 'amount-desc', label: 'Highest' },
  { value: 'amount-asc', label: 'Lowest' },
]

const TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
]

function monthLabel(monthKey) {
  return new Date(`${monthKey}-01T00:00:00`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

function formatRupees(minor) {
  // compact lakh/crore (or K/M) for big month totals, else full locale format
  return formatMinorToDisplay(minor, resolveDisplayCurrency(), { compact: true })
}

export default function Expenses() {
  const { openCreate, openEdit } = useAddTransaction()
  const [txns, setTxns] = useState(null)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sort, setSort] = useState('date-desc')
  const { categories } = useCategories()
  const byId = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])

  const refresh = useCallback(async () => {
    try {
      await repository.init()
      setTxns(await repository.listTransactions())
      setError(null)
    } catch (err) {
      setError(err?.message ?? 'Could not load transactions')
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Stay fresh when entries are added/edited from the global FAB sheet too.
  useEffect(() => {
    const onChange = () => refresh()
    window.addEventListener('moneyos:transactions-changed', onChange)
    return () => window.removeEventListener('moneyos:transactions-changed', onChange)
  }, [refresh])

  const filtered = useMemo(() => {
    let rows = txns ?? []
    if (typeFilter !== 'all') rows = rows.filter((t) => t.type === typeFilter)
    if (categoryFilter !== 'all') rows = rows.filter((t) => t.category_id === categoryFilter)
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      rows = rows.filter(
        (t) =>
          (t.description ?? '').toLowerCase().includes(needle) ||
          (byId[t.category_id]?.name ?? '').toLowerCase().includes(needle)
      )
    }
    const cmp = {
      'date-desc': (a, b) => b.note_date.localeCompare(a.note_date) || b.id.localeCompare(a.id),
      'date-asc': (a, b) => a.note_date.localeCompare(b.note_date) || a.id.localeCompare(b.id),
      'amount-desc': (a, b) => b.inr_amount_minor - a.inr_amount_minor,
      'amount-asc': (a, b) => a.inr_amount_minor - b.inr_amount_minor,
    }[sort]
    return [...rows].sort(cmp)
  }, [txns, typeFilter, categoryFilter, q, sort, byId])

  // Month groups preserve the globally-sorted row order inside each group.
  const groups = useMemo(() => {
    const map = new Map()
    for (const t of filtered) {
      const key = t.note_date.slice(0, 7)
      if (!map.has(key)) map.set(key, { key, rows: [], spentMinor: 0, earnedMinor: 0 })
      const g = map.get(key)
      g.rows.push(t)
      if (t.type === 'expense') g.spentMinor += t.inr_amount_minor
      else g.earnedMinor += t.inr_amount_minor
    }
    return [...map.values()]
  }, [filtered])

  const chipKind = typeFilter === 'income' ? 'income' : 'expense'
  const chips = useMemo(
    () => [{ id: 'all', name: 'All', color: null }, ...categories.filter((c) => c.kind === chipKind)],
    [categories, chipKind]
  )
  const hasActiveFilters = typeFilter !== 'all' || categoryFilter !== 'all' || q.trim() !== ''

  return (
    <section aria-label="Expenses">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted">
            {txns === null ? 'Loading…' : `${filtered.length} of ${txns.length} entries`}
          </p>
        </div>
        <Button variant="brand" icon={Plus} onClick={() => openCreate(refresh)}>
          Add
        </Button>
      </header>

      <div className="space-y-3">
        <NeuInput
          icon={ReceiptText}
          placeholder="Search notes & categories…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search transactions"
        />

        <SegmentedControl options={TYPE_FILTERS} value={typeFilter} onChange={setTypeFilter} />

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips.map((cat) => (
            <CategoryChip
              key={cat.id}
              label={cat.name}
              color={cat.color}
              active={categoryFilter === cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className="shrink-0"
            />
          ))}
        </div>

        <SegmentedControl options={SORT_OPTIONS} value={sort} onChange={setSort} />
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-sm font-semibold text-expense">
          {error}
        </p>
      ) : null}

      {txns === null ? (
        <div className="mt-6 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonLoader key={i} variant="line" className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : txns.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={ReceiptText}
          title="No transactions yet"
          message="Tap the + button to log your first spend or income."
          action={
            <Button variant="brand" icon={Plus} onClick={() => openCreate(refresh)}>
              Add transaction
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={SearchX}
          title="Nothing matches"
          message={
            hasActiveFilters
              ? 'No entries match the current search and filters.'
              : 'No entries here yet.'
          }
          action={
            hasActiveFilters ? (
              <Button
                variant="raised"
                onClick={() => {
                  setQ('')
                  setTypeFilter('all')
                  setCategoryFilter('all')
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="mt-5 space-y-5">
          {groups.map((group) => (
            <motion.section
              key={group.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              aria-label={monthLabel(group.key)}
            >
              <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
                <h2 className="micro-label text-sm">{monthLabel(group.key)}</h2>
                <p className="text-xs font-medium text-muted tabular-nums">
                  {group.spentMinor > 0 && <span className="text-expense">−{formatRupees(group.spentMinor)}</span>}
                  {group.spentMinor > 0 && group.earnedMinor > 0 ? ' · ' : null}
                  {group.earnedMinor > 0 && <span className="text-income">+{formatRupees(group.earnedMinor)}</span>}
                </p>
              </div>
              <div className="space-y-2.5">
                {group.rows.map((txn, i) => (
                  <motion.div
                    key={txn.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.22 }}
                  >
                    <TxnRow txn={txn} onClick={() => openEdit(txn, refresh)} />
                  </motion.div>
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      )}
    </section>
  )
}
