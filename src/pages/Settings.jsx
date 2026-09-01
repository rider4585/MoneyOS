import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Banknote, Check, Cloud, CloudOff, Globe, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { DEMO_MODE, repository } from '../data/index.js'
import useSyncState from '../data/useSyncState.js'
import {
  BottomSheet,
  Button,
  EmptyState,
  NeuInput,
  Pressable,
  SegmentedControl,
  ThemeToggle,
} from '../components/ui/index.js'
import PageHeader from '../features/plan/PageHeader.jsx'
import { addCategory, deleteCategory, updateCategory, useCategories } from '../features/categories.js'
import { useAuth } from '../context/AuthProvider.jsx'
import { useTheme } from '../theme/ThemeProvider.jsx'
import { usePwaInstall, usePwaUpdate, APP_VERSION } from '../pwa/index.js'
import { resolveDisplayCurrency, setDisplayCurrency, DISPLAY_CURRENCIES } from '../lib/display.js'
import { fetchFxRateToInr } from '../lib/fx.js'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const rise = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

const PALETTE = ['#F43F5E', '#F97316', '#F59E0B', '#10B981', '#14B8A6', '#0EA5E9', '#6366F1', '#8B5CF6', '#EC4899', '#94A3B8']
const EMPTY_FORM = { name: '', kind: 'expense', color: PALETTE[7] }

function SectionCard({ title, action, children, className = '' }) {
  return (
    <section className={`neu-card rounded-[20px] bg-surface p-5 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-ink font-display inline-flex items-center gap-2 text-base font-bold tracking-tight">
          <span aria-hidden className="bg-gradient-brand h-2 w-2 rounded-full opacity-80" /> {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const { categories } = useCategories()
  const { canInstall, installed, install } = usePwaInstall()
  const { state: updateState, checkForUpdates } = usePwaUpdate()
  const sync = useSyncState()
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)
  const [displayCurrency, setDisplayCur] = useState(() => resolveDisplayCurrency())

  function changeDisplayCurrency(next) {
    setDisplayCur(next)
    setDisplayCurrency(next)
    // Warm the persistent last-known rate so converted figures render instantly
    // (fire-and-forget; display falls back to INR if it fails while offline).
    fetchFxRateToInr(next).catch(() => {})
  }

  async function handleSyncNow() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res =
        typeof repository.flushPending === 'function'
          ? await repository.flushPending()
          : { pushed: 0, remaining: 0 }
      setSyncMsg(res.pushed > 0 ? `Synced ${res.pushed} entry${res.pushed === 1 ? '' : 's'}.` : 'All up to date.')
    } catch {
      setSyncMsg('Sync failed — try again when online.')
    } finally {
      setSyncing(false)
    }
  }

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => {
    if (!confirmDeleteId) return undefined
    const timer = setTimeout(() => setConfirmDeleteId(null), 3000)
    return () => clearTimeout(timer)
  }, [confirmDeleteId])

  const grouped = useMemo(
    () => ({
      expense: categories.filter((category) => category.kind === 'expense'),
      income: categories.filter((category) => category.kind === 'income'),
    }),
    [categories]
  )

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setSheetOpen(true)
  }

  const openRename = (category) => {
    setEditingId(category.id)
    setForm({ name: category.name, kind: category.kind, color: category.color })
    setFormError(null)
    setSheetOpen(true)
  }

  const saveCategory = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) return setFormError('Name is required.')
    try {
      if (editingId) {
        await updateCategory(editingId, { name: form.name.trim() })
      } else {
        await addCategory({ name: form.name.trim(), kind: form.kind, color: form.color })
      }
      setSheetOpen(false)
    } catch (error) {
      setFormError(error.message ?? 'Could not save the category.')
    }
  }

  const removeCategory = async (category) => {
    if (confirmDeleteId !== category.id) {
      setConfirmDeleteId(category.id)
      return
    }
    try {
      await deleteCategory(category.id)
    } catch (error) {
      console.error('[settings] category delete failed', error)
    }
    setConfirmDeleteId(null)
  }

  const renderGroup = (kind, label) => (
    <div className="mb-4 last:mb-0">
      <p className="mb-2 text-xs font-semibold tracking-wide text-faint uppercase">{label}</p>
      {grouped[kind].length ? (
        <ul className="space-y-1">
          {grouped[kind].map((category) => (
            <li key={category.id} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
              <span aria-hidden className="border-border grid h-7 w-7 shrink-0 place-items-center rounded-lg border bg-surface-raised" style={{ color: category.color }}>
                <span className="grid h-full w-full place-items-center text-[10px] font-black">{category.name.slice(0, 1)}</span>
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{category.name}</span>
              <Pressable
                type="button"
                aria-label={`Rename ${category.name}`}
                onClick={() => openRename(category)}
                className="grid h-8 w-8 place-items-center rounded-lg bg-surface neu-raised-sm text-muted hover:text-brand"
              >
                <Pencil size={13} />
              </Pressable>
              <Pressable
                type="button"
                aria-label={confirmDeleteId === category.id ? `Confirm delete ${category.name}` : `Delete ${category.name}`}
                onClick={() => removeCategory(category)}
                className={`inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold neu-raised-sm ${
                  confirmDeleteId === category.id ? 'bg-expense text-white' : 'bg-surface text-muted hover:text-expense'
                }`}
              >
                <Trash2 size={13} />
                {confirmDeleteId === category.id ? 'Sure?' : ''}
              </Pressable>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Banknote} title={`No ${label.toLowerCase()} categories`} message="Add one below." className="py-6" />
      )}
    </div>
  )

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader title="Settings" subtitle="Profile, theme, categories & data mode" />

      <motion.section variants={rise} className="glass-panel mb-4 flex items-center gap-4 rounded-3xl p-5">
        <span className="bg-gradient-brand font-display grid h-14 w-14 shrink-0 place-items-center rounded-full text-xl font-bold text-white">
          {(user?.name ?? user?.email ?? '?').slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-ink font-display truncate text-base font-bold">{user?.name ?? 'MoneyOS user'}</p>
          <p className="truncate text-sm text-muted">{user?.email}</p>
          <p className="mt-0.5 text-xs text-faint">Signed in via {user?.provider === 'demo' ? 'demo session' : user?.provider ?? 'google'}</p>
        </div>
      </motion.section>

      <motion.div variants={rise} className="mb-4">
        <SectionCard title="Appearance">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold capitalize">{theme} theme</p>
              <p className="text-xs text-muted">Pulse surfaces adapt automatically.</p>
            </div>
            <ThemeToggle />
          </div>
        </SectionCard>
      </motion.div>

      <motion.div variants={rise} className="mb-4">
        <SectionCard title="App">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {installed ? 'Installed as an app' : canInstall ? 'Install MoneyOS' : 'Add to your device'}
              </p>
              <p className="text-xs text-muted">
                {installed
                  ? 'Launching from your home screen.'
                  : canInstall
                    ? 'Install for a full-screen, offline-first experience.'
                    : 'Use your browser’s “Add to Home Screen” option from the address bar.'}
              </p>
            </div>
            {!installed && canInstall ? (
              <Button variant="brand" size="sm" onClick={install}>
                Install
              </Button>
            ) : null}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
            <div>
              <p className="text-sm font-semibold">Version {APP_VERSION}</p>
              <p className="text-xs text-muted">
                {updateState === 'checking'
                  ? 'Checking for updates…'
                  : updateState === 'updated'
                    ? 'Update found — reloading…'
                    : updateState === 'upToDate'
                      ? 'You’re on the latest version.'
                      : 'If new features don’t appear, update manually below.'}
              </p>
            </div>
            <Button
              variant="raised"
              size="sm"
              icon={RefreshCw}
              disabled={updateState === 'checking' || updateState === 'updated'}
              onClick={checkForUpdates}
            >
              {updateState === 'checking' ? 'Checking…' : 'Check for updates'}
            </Button>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
            <div>
              <p className="text-sm font-semibold">
                {sync.online ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Cloud className="size-4 text-brand" aria-hidden /> Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <CloudOff className="size-4 text-expense" aria-hidden /> Offline
                  </span>
                )}
                {sync.pendingCount > 0 && ` · ${sync.pendingCount} pending`}
              </p>
              <p className="text-xs text-muted">
                {sync.pendingCount > 0
                  ? `Offline entries will sync automatically when you’re back online.`
                  : syncMsg ?? `Every entry is saved to your account${!sync.online ? ' when online' : ''}.`}
              </p>
            </div>
            <Button
              variant="raised"
              size="sm"
              icon={RefreshCw}
              disabled={syncing}
              onClick={handleSyncNow}
            >
              {syncing ? 'Syncing…' : 'Sync now'}
            </Button>
          </div>
        </SectionCard>
      </motion.div>

      <motion.div variants={rise} className="mb-4">
        <SectionCard
          title="Categories"
          action={
            <Button variant="brand" size="sm" icon={Plus} onClick={openCreate}>
              Add
            </Button>
          }
        >
          {renderGroup('expense', 'Expense')}
          {renderGroup('income', 'Income')}
        </SectionCard>
      </motion.div>

      <motion.div variants={rise} className="mb-4">
        <SectionCard title="Currency & FX">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Display currency</p>
              <p className="text-xs text-muted">
                Amounts are stored as INR paise — this only changes how they're shown.
              </p>
            </div>
            <SegmentedControl
              options={DISPLAY_CURRENCIES.map((code) => ({
                value: code,
                label: code === 'INR' ? 'INR (₹)' : 'USD ($)',
              }))}
              value={displayCurrency}
              onChange={changeDisplayCurrency}
            />
          </div>
          <div className="mt-4 flex gap-3 border-t border-border pt-4">
            <span aria-hidden className="border-border grid h-10 w-10 shrink-0 place-items-center rounded-xl border bg-surface-raised text-brand" style={{ boxShadow: '0 0 16px -4px color-mix(in srgb, var(--brand) 45%, transparent)' }}>
              <Globe size={18} />
            </span>
            <div className="space-y-1.5 text-sm leading-relaxed text-muted">
              <p>
                Everything displays in <strong className="text-ink font-semibold">{displayCurrency === 'USD' ? 'USD ($)' : 'INR (₹)'}</strong>, stored as integer paise.
              </p>
              <p>
                A non-INR entry snapshots the exchange rate <em>once, at entry time</em> (open.er-api.com) and keeps it on the row — later rate moves never rewrite history. Display conversion uses the stored last-known rate.
              </p>
            </div>
          </div>
        </SectionCard>
      </motion.div>

      <motion.div variants={rise}>
        <SectionCard title="Data mode" className="mb-2!">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {DEMO_MODE ? 'Demo Mode — ON' : 'Live · Supabase'}
              </p>
              <p className="text-xs text-muted">
                {DEMO_MODE
                  ? 'Local seed data in your browser. Nothing leaves this device.'
                  : 'Reading & writing your Supabase project.'}
              </p>
            </div>
            <span
              className={`neu-inset inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ${
                DEMO_MODE ? 'text-emi' : 'text-income'
              }`}
            >
              <Check size={12} aria-hidden /> {DEMO_MODE ? 'demo' : 'live'}
            </span>
          </div>
          <p className="hairline-t mt-3 pt-3 text-xs text-faint tabular-nums">
            VITE_DEMO_MODE = {String(import.meta.env.VITE_DEMO_MODE ?? '(unset)')} · app v0.1.0
          </p>
        </SectionCard>
      </motion.div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingId ? 'Rename category' : 'New category'}
        subtitle={editingId ? 'Ids stay stable so budgets keep working' : 'Pick a kind and a color'}
      >
        <form onSubmit={saveCategory} className="space-y-4">
          <NeuInput
            label="Name"
            placeholder="e.g. Coffee runs"
            value={form.name}
            onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
          />
          {!editingId ? (
            <>
              <SegmentedControl
                options={[
                  { value: 'expense', label: 'Expense' },
                  { value: 'income', label: 'Income' },
                ]}
                value={form.kind}
                onChange={(kind) => setForm((f) => ({ ...f, kind }))}
              />
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-muted">Color</legend>
                <div className="flex flex-wrap gap-2.5">
                  {PALETTE.map((color) => {
                    const selected = form.color === color
                    return (
                      <Pressable
                        key={color}
                        type="button"
                        aria-label={`Use ${color}`}
                        aria-pressed={selected}
                        onClick={() => setForm((f) => ({ ...f, color }))}
                        className={`grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-90 ${
                          selected ? 'ring-2 ring-brand ring-offset-2 ring-offset-transparent' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {selected ? <Check size={15} className="text-white drop-shadow" aria-hidden /> : null}
                      </Pressable>
                    )
                  })}
                </div>
              </fieldset>
            </>
          ) : null}
          {formError ? (
            <p role="alert" className="text-xs font-semibold text-expense">
              {formError}
            </p>
          ) : null}
          <Button variant="brand" size="lg" fullWidth>
            {editingId ? 'Save name' : 'Create category'}
          </Button>
        </form>
      </BottomSheet>
    </motion.div>
  )
}
