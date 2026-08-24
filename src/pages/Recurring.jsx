import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Pause, Pencil, Play, Plus, Repeat, Trash2, Zap } from 'lucide-react'
import repository from '../data/index.js'
import { isoDate } from '../lib/money.js'
import {
  Amount,
  BottomSheet,
  Button,
  EmptyState,
  NeuInput,
  NeuSelect,
  Pressable,
  SegmentedControl,
  SkeletonLoader,
} from '../components/ui/index.js'
import PageHeader from '../features/plan/PageHeader.jsx'
import { countdownLabel, daysUntil } from '../features/plan/dates.js'
import { FREQUENCIES, frequencyLabel, postRuleNow, setRuleActive, updateRule } from '../features/plan/recurringOps.js'
import { useCategories } from '../features/categories.js'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const rise = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

const EMPTY_FORM = {
  title: '',
  type: 'expense',
  amountRupees: '',
  category_id: '',
  frequency: 'monthly',
  intervalCount: '1',
  nextRunDate: isoDate(),
  endDate: '',
}

function ruleToForm(rule) {
  return {
    title: rule.title ?? '',
    type: rule.type ?? 'expense',
    amountRupees: String(rule.amount_minor / 100),
    category_id: rule.category_id ?? '',
    frequency: rule.frequency ?? 'monthly',
    intervalCount: String(rule.interval_count ?? 1),
    nextRunDate: rule.next_run_date ?? isoDate(),
    endDate: rule.end_date ?? '',
  }
}

export default function Recurring() {
  const [loaded, setLoaded] = useState(false)
  const [rules, setRules] = useState([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const { byId } = useCategories()

  const reload = useCallback(async () => {
    setRules(await repository.listRecurring())
  }, [])

  useEffect(() => {
    let alive = true
    reload()
      .then(() => {})
      .catch((error) => console.error('[recurring] load failed', error))
      .finally(() => alive && setLoaded(true))
    return () => {
      alive = false
    }
  }, [reload])

  useEffect(() => {
    if (!confirmDeleteId) return undefined
    const timer = setTimeout(() => setConfirmDeleteId(null), 3000)
    return () => clearTimeout(timer)
  }, [confirmDeleteId])

  const sortedRules = useMemo(
    () =>
      [...rules].sort((a, b) => {
        if ((b.active ?? true) !== (a.active ?? true)) return (b.active ?? true) - (a.active ?? true)
        return String(a.next_run_date).localeCompare(String(b.next_run_date))
      }),
    [rules]
  )

  const formCategories = useMemo(
    () => Object.values(byId).filter((category) => category.kind === (form.type === 'income' ? 'income' : 'expense')),
    [byId, form.type]
  )

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setSheetOpen(true)
  }

  const openEdit = (rule) => {
    setEditingId(rule.id)
    setForm(ruleToForm(rule))
    setFormError(null)
    setSheetOpen(true)
  }

  const saveRule = async (event) => {
    event.preventDefault()
    const amountMinor = Math.round(Number(form.amountRupees) * 100)
    if (!form.title.trim()) return setFormError('Give the rule a name.')
    if (!(amountMinor > 0)) return setFormError('Enter an amount above ₹0.')
    if (!form.nextRunDate) return setFormError('Pick the next run date.')
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        type: form.type,
        amount_minor: amountMinor,
        currency: 'INR',
        category_id: form.category_id || null,
        frequency: form.frequency,
        interval_count: Math.max(1, Number(form.intervalCount) || 1),
        next_run_date: form.nextRunDate,
        end_date: form.endDate || null,
      }
      const original = rules.find((rule) => rule.id === editingId)
      if (original) {
        await updateRule(repository, original, payload)
      } else {
        await repository.addRecurring(payload)
      }
      await reload()
      setSheetOpen(false)
    } catch (error) {
      setFormError(error.message ?? 'Could not save the rule.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (rule) => {
    setBusyId(rule.id)
    try {
      await setRuleActive(repository, rule, !(rule.active ?? true))
      await reload()
    } catch (error) {
      console.error('[recurring] toggle failed', error)
    } finally {
      setBusyId(null)
    }
  }

  const removeRule = async (rule) => {
    if (confirmDeleteId !== rule.id) {
      setConfirmDeleteId(rule.id)
      return
    }
    setBusyId(rule.id)
    try {
      await repository.deleteRecurring(rule.id)
      await reload()
    } catch (error) {
      console.error('[recurring] delete failed', error)
    } finally {
      setBusyId(null)
      setConfirmDeleteId(null)
    }
  }

  const postNow = async (rule) => {
    setBusyId(rule.id)
    try {
      await postRuleNow(repository, rule)
      await reload()
    } catch (error) {
      console.error('[recurring] post-now failed', error)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader
        title="Recurring"
        subtitle="Auto-repeat money in & out"
        action={
          <Button variant="brand" size="sm" icon={Plus} onClick={openCreate}>
            Rule
          </Button>
        }
      />

      {!loaded ? (
        <div className="space-y-3">
          <SkeletonLoader variant="card" />
          <SkeletonLoader variant="card" />
        </div>
      ) : sortedRules.length ? (
        <motion.ul variants={rise} className="space-y-3">
          {sortedRules.map((rule) => {
            const paused = !(rule.active ?? true)
            const due = daysUntil(rule.next_run_date) <= 0
            const overdue = daysUntil(rule.next_run_date) < 0
            const category = rule.category_id ? byId[rule.category_id] : null
            const accent = category?.color ?? (rule.type === 'income' ? 'var(--income)' : 'var(--expense)')
            const busy = busyId === rule.id
            return (
              <li key={rule.id} className={`neu-card rounded-3xl bg-surface p-5 ${paused ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden
                      className="neu-inset grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-base"
                      style={{ color: accent }}
                    >
                      <Repeat size={17} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{rule.title}</p>
                      <p className="mt-0.5 text-xs font-medium text-muted">
                        {frequencyLabel(rule)}
                        {category ? ` · ${category.name}` : ''}
                        {paused ? ' · Paused' : ''}
                      </p>
                    </div>
                  </div>
                  <Amount value={rule.inr_amount_minor} minor colored={false} animate={false} className="shrink-0 text-sm" />
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className={`text-xs font-semibold ${overdue && !paused ? 'text-expense' : due && !paused ? 'text-emi' : 'text-faint'}`}>
                    {paused ? `Next run ${rule.next_run_date}` : `${countdownLabel(rule.next_run_date)} · ${rule.next_run_date}`}
                  </p>
                  {paused ? (
                    <span className="neu-inset rounded-full bg-base px-2.5 py-1 text-[10px] font-bold tracking-wide text-muted uppercase">Paused</span>
                  ) : due ? (
                    <Pressable
                      type="button"
                      onClick={() => postNow(rule)}
                      disabled={busy}
                      className="bg-gradient-brand inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      <Zap size={12} aria-hidden /> Post now
                    </Pressable>
                  ) : null}
                </div>

                <div className="hairline-t mt-3 flex items-center gap-2 pt-3">
                  <Pressable
                    type="button"
                    aria-label={paused ? `Resume ${rule.title}` : `Pause ${rule.title}`}
                    onClick={() => toggleActive(rule)}
                    disabled={busy}
                    className="neu-raised-sm inline-flex items-center gap-1.5 rounded-xl bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:text-brand"
                  >
                    {paused ? <Play size={13} aria-hidden /> : <Pause size={13} aria-hidden />}
                    {paused ? 'Resume' : 'Pause'}
                  </Pressable>
                  <Pressable
                    type="button"
                    aria-label={`Edit ${rule.title}`}
                    onClick={() => openEdit(rule)}
                    disabled={busy}
                    className="neu-raised-sm inline-flex items-center gap-1.5 rounded-xl bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:text-brand"
                  >
                    <Pencil size={13} aria-hidden /> Edit
                  </Pressable>
                  <Pressable
                    type="button"
                    aria-label={`Delete ${rule.title}`}
                    onClick={() => removeRule(rule)}
                    disabled={busy}
                    className={`neu-raised-sm ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold ${
                      confirmDeleteId === rule.id ? 'bg-expense text-white' : 'bg-surface text-muted hover:text-expense'
                    }`}
                  >
                    <Trash2 size={13} aria-hidden /> {confirmDeleteId === rule.id ? 'Sure?' : ''}
                  </Pressable>
                </div>
              </li>
            )
          })}
        </motion.ul>
      ) : (
        <EmptyState
          icon={Repeat}
          title="No recurring rules"
          message="Rent, salary, subscriptions — set them once and post each cycle in a tap."
          action={
            <Button variant="brand" icon={Plus} onClick={openCreate}>
              New rule
            </Button>
          }
        />
      )}

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingId ? 'Edit rule' : 'New recurring rule'}
        subtitle="Generates transactions on schedule"
      >
        <form onSubmit={saveRule} className="space-y-4">
          <NeuInput
            label="Name"
            placeholder="e.g. Flat rent"
            value={form.title}
            onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
          />
          <SegmentedControl
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
            ]}
            value={form.type}
            onChange={(type) => setForm((f) => ({ ...f, type, category_id: '' }))}
          />
          <NeuInput
            label="Amount"
            prefix="₹"
            type="number"
            inputMode="decimal"
            min="1"
            step="any"
            placeholder="e.g. 22000"
            value={form.amountRupees}
            onChange={(event) => setForm((f) => ({ ...f, amountRupees: event.target.value }))}
          />
          <NeuSelect
            label="Category"
            value={form.category_id}
            onChange={(event) => setForm((f) => ({ ...f, category_id: event.target.value }))}
          >
            <option value="">None</option>
            {formCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </NeuSelect>
          <div className="grid grid-cols-2 gap-3">
            <NeuSelect
              label="Frequency"
              value={form.frequency}
              onChange={(event) => setForm((f) => ({ ...f, frequency: event.target.value }))}
              options={FREQUENCIES}
            />
            <NeuInput
              label="Every"
              suffix="×"
              type="number"
              inputMode="numeric"
              min="1"
              max="99"
              value={form.intervalCount}
              onChange={(event) => setForm((f) => ({ ...f, intervalCount: event.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NeuInput
              label="Next run"
              type="date"
              value={form.nextRunDate}
              onChange={(event) => setForm((f) => ({ ...f, nextRunDate: event.target.value }))}
            />
            <NeuInput
              label="Ends (optional)"
              type="date"
              value={form.endDate}
              onChange={(event) => setForm((f) => ({ ...f, endDate: event.target.value }))}
            />
          </div>
          {formError ? (
            <p role="alert" className="text-xs font-semibold text-expense">
              {formError}
            </p>
          ) : null}
          <Button variant="brand" size="lg" fullWidth disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create rule'}
          </Button>
        </form>
      </BottomSheet>
    </motion.div>
  )
}
