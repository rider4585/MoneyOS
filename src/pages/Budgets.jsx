import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ChartPie, ChevronLeft, ChevronRight, CloudOff, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import repository from '../data/index.js'
import { useDataChanged } from '../data/useDataChanged.js'
import { formatInr, monthStart } from '../lib/money.js'
import {
  BottomSheet,
  Button,
  EmptyState,
  GlassCard,
  NeuInput,
  NeuSelect,
  Pressable,
  ProgressBar,
  SkeletonLoader,
} from '../components/ui/index.js'
import PageHeader from '../features/plan/PageHeader.jsx'
import { addMonthsIso, monthLabel } from '../features/plan/dates.js'
import { useCategories } from '../features/categories.js'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const rise = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

const EMPTY_FORM = { category_id: '', limitRupees: '', thresholdPct: '80' }

export default function Budgets() {
  const [month, setMonth] = useState(monthStart())
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [rev, setRev] = useState(0)
  const [budgets, setBudgets] = useState([])
  const [monthTxns, setMonthTxns] = useState([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const { categories, byId } = useCategories()

  const reload = useCallback(async (targetMonth) => {
    const [rows, txns] = await Promise.all([
      repository.listBudgets(targetMonth),
      repository.listTransactions({ month: targetMonth }),
    ])
    setBudgets(rows)
    setMonthTxns(txns)
  }, [])

  // Refresh instantly when a budget, transaction or category changes anywhere.
  useDataChanged(['budgets', 'transactions', 'categories'], () => setRev((r) => r + 1))

  useEffect(() => {
    let alive = true
    setLoaded(false)
    reload(month)
      .catch((error) => {
        console.error('[budgets] load failed', error)
        if (alive) setLoadError(true)
      })
      .finally(() => alive && setLoaded(true))
    return () => {
      alive = false
    }
  }, [month, reload, attempt, rev])

  useEffect(() => {
    if (!confirmDeleteId) return undefined
    const timer = setTimeout(() => setConfirmDeleteId(null), 3000)
    return () => clearTimeout(timer)
  }, [confirmDeleteId])

  const spentByCategory = useMemo(() => {
    const map = new Map()
    for (const row of monthTxns) {
      if (row.type !== 'expense' || !row.category_id) continue
      map.set(row.category_id, (map.get(row.category_id) ?? 0) + row.inr_amount_minor)
    }
    return map
  }, [monthTxns])

  const budgetRows = useMemo(
    () =>
      budgets.map((budget) => ({
        ...budget,
        name: byId[budget.category_id]?.name ?? 'Unknown category',
        color: byId[budget.category_id]?.color,
        spent: spentByCategory.get(budget.category_id) ?? 0,
      })),
    [budgets, byId, spentByCategory]
  )

  const totalLimit = budgetRows.reduce((sum, row) => sum + row.limit_inr_minor, 0)
  const totalSpent = budgetRows.reduce((sum, row) => sum + row.spent, 0)

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.kind === 'expense'),
    [categories]
  )
  const selectableCategories = useMemo(
    () =>
      expenseCategories.filter(
        (category) =>
          !budgetRows.some((row) => row.category_id === category.id && row.id !== editingId)
      ),
    [expenseCategories, budgetRows, editingId]
  )

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setSheetOpen(true)
  }

  const openEdit = (row) => {
    setEditingId(row.id)
    setForm({
      category_id: row.category_id,
      limitRupees: String(row.limit_inr_minor / 100),
      thresholdPct: String(row.alert_threshold_pct ?? 80),
    })
    setFormError(null)
    setSheetOpen(true)
  }

  const removeBudget = async (row) => {
    if (confirmDeleteId !== row.id) {
      setConfirmDeleteId(row.id)
      return
    }
    try {
      await repository.deleteBudget(row.id)
      await reload(month)
    } catch (error) {
      console.error('[budgets] delete failed', error)
    }
    setConfirmDeleteId(null)
  }

  const saveBudget = async (event) => {
    event.preventDefault()
    const limitMinor = Math.round(Number(form.limitRupees) * 100)
    if (!form.category_id) return setFormError('Pick a category to budget.')
    if (!(limitMinor > 0)) return setFormError('Enter a limit above ₹0.')
    setSaving(true)
    try {
      await repository.setBudget({
        category_id: form.category_id,
        month,
        limit_inr_minor: limitMinor,
        alert_threshold_pct: Math.min(99, Math.max(1, Number(form.thresholdPct) || 80)),
      })
      await reload(month)
      setSheetOpen(false)
    } catch (error) {
      setFormError(error.message ?? 'Could not save budget.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader
        title="Budgets"
        subtitle="Monthly limits per category"
        action={
          <Button variant="brand" size="sm" icon={Plus} onClick={openCreate}>
            Budget
          </Button>
        }
      />

      <motion.div variants={rise} className="neu-inset mb-4 flex items-center justify-between rounded-2xl bg-base px-2 py-2">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setMonth(addMonthsIso(month, -1))}
          className="neu-raised-sm grid h-9 w-9 place-items-center rounded-xl bg-surface text-muted hover:text-brand"
        >
          <ChevronLeft size={17} />
        </button>
        <p className="font-display text-sm font-bold">{monthLabel(month)}</p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setMonth(addMonthsIso(month, 1))}
          className="neu-raised-sm grid h-9 w-9 place-items-center rounded-xl bg-surface text-muted hover:text-brand"
        >
          <ChevronRight size={17} />
        </button>
      </motion.div>

      {!loaded ? (
        <div className="space-y-3">
          <SkeletonLoader variant="card" className="h-24" />
          <SkeletonLoader variant="card" />
          <SkeletonLoader variant="card" />
        </div>
      ) : loadError ? (
        <EmptyState
          icon={CloudOff}
          title="Couldn't load budgets"
          message="Something went wrong while fetching this month's budgets."
          action={
            <Button
              icon={RefreshCw}
              onClick={() => {
                setLoadError(false)
                setAttempt((a) => a + 1)
              }}
            >
              Retry
            </Button>
          }
        />
      ) : (
        <>
          {budgetRows.length ? (
            <GlassCard className="p-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="micro-label">Total budgeted</p>
                  <p className="font-display mt-1.5 text-2xl font-bold tracking-tight tabular-nums">{formatInr(totalSpent)} </p>
                  <p className="text-xs text-muted">of {formatInr(totalLimit)} planned</p>
                </div>
                <p
                  className={`font-display text-lg font-bold tracking-tight tabular-nums ${
                    totalSpent > totalLimit ? 'text-expense' : totalSpent >= (totalLimit * 0.8) ? 'text-emi' : 'text-income'
                  }`}
                >
                  {totalLimit ? `${Math.round((totalSpent / totalLimit) * 100)}%` : '—'}
                </p>
              </div>
              <ProgressBar value={totalSpent} max={totalLimit || 1} size="md" className="mt-3" />
            </GlassCard>
          ) : null}

          {budgetRows.length ? (
            <motion.ul variants={rise} className="mt-4 space-y-3">
              {budgetRows.map((row) => {
                const pct = row.limit_inr_minor ? Math.round((row.spent / row.limit_inr_minor) * 100) : 0
                const over = row.spent > row.limit_inr_minor
                const near = !over && row.alert_threshold_pct && pct >= row.alert_threshold_pct
                return (
                  <li key={row.id} className="neu-card rounded-[20px] bg-surface p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="inline-flex items-center gap-2 text-sm font-bold">
                          <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                          <span className="truncate">{row.name}</span>
                        </p>
                        <p className="mt-1 text-sm">
                          <span className="font-semibold tabular-nums">{formatInr(row.spent)}</span>{' '}
                          <span className="text-xs font-medium text-faint">of {formatInr(row.limit_inr_minor)}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Edit ${row.name} budget`}
                          onClick={() => openEdit(row)}
                          className="neu-raised-sm grid h-8 w-8 place-items-center rounded-lg bg-surface text-muted hover:text-brand"
                        >
                          <Pencil size={14} />
                        </button>
                        <Pressable
                          type="button"
                          aria-label={confirmDeleteId === row.id ? `Confirm delete ${row.name} budget` : `Delete ${row.name} budget`}
                          onClick={() => removeBudget(row)}
                          className={`neu-raised-sm inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold ${
                            confirmDeleteId === row.id ? 'bg-expense text-white' : 'bg-surface text-muted hover:text-expense'
                          }`}
                        >
                          <Trash2 size={13} />
                          {confirmDeleteId === row.id ? 'Sure?' : ''}
                        </Pressable>
                      </div>
                    </div>
                    <ProgressBar value={row.spent} max={row.limit_inr_minor} size="sm" showPercent overLabel={`${Math.max(pct - 100, 1)}% over`} className="mt-3" />
                    {near ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emi/10 px-2.5 py-1 text-xs font-bold text-emi">
                        <AlertTriangle size={12} aria-hidden /> Past your {row.alert_threshold_pct}% alert line
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </motion.ul>
          ) : (
            <EmptyState
              icon={ChartPie}
              title={`No budgets for ${monthLabel(month)}`}
              message="Set a monthly cap per spending category — progress bars turn rose when you cross the line."
              action={
                <Button variant="brand" icon={Plus} onClick={openCreate}>
                  New budget
                </Button>
              }
            />
          )}
        </>
      )}

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingId ? 'Edit budget' : 'New budget'}
        subtitle={monthLabel(month)}
      >
        <form onSubmit={saveBudget} className="space-y-4">
          <NeuSelect
            label="Category"
            value={form.category_id}
            onChange={(event) => setForm((f) => ({ ...f, category_id: event.target.value }))}
            error={formError && !form.category_id ? formError : undefined}
            hint={editingId ? undefined : 'Categories already budgeted this month are hidden.'}
          >
            <option value="">Choose…</option>
            {selectableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </NeuSelect>
          <NeuInput
            label="Monthly limit"
            prefix="₹"
            type="number"
            inputMode="decimal"
            min="1"
            step="any"
            placeholder="e.g. 8000"
            value={form.limitRupees}
            onChange={(event) => setForm((f) => ({ ...f, limitRupees: event.target.value }))}
          />
          <NeuInput
            label="Alert at (% used)"
            suffix="%"
            type="number"
            inputMode="numeric"
            min="1"
            max="99"
            value={form.thresholdPct}
            onChange={(event) => setForm((f) => ({ ...f, thresholdPct: event.target.value }))}
            hint="You'll see an amber heads-up past this share."
          />
          {formError && form.category_id ? (
            <p role="alert" className="text-xs font-semibold text-expense">
              {formError}
            </p>
          ) : null}
          <Button variant="brand" size="lg" fullWidth disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create budget'}
          </Button>
        </form>
      </BottomSheet>
    </motion.div>
  )
}
