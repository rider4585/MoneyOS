import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  ChartPie,
  CloudOff,
  ReceiptText,
  RefreshCw,
  Wallet,
} from 'lucide-react'
import repository from '../data/index.js'
import { useDataChanged } from '../data/useDataChanged.js'
import { monthStart } from '../lib/money.js'
import { Amount, Button, EmptyState, ProgressBar, SkeletonLoader, StatTile } from '../components/ui/index.js'
import PageHeader from '../features/plan/PageHeader.jsx'
import SpendChart from '../features/plan/SpendChart.jsx'
import { addMonthsIso, countdownLabel, daysUntil, monthLabel } from '../features/plan/dates.js'
import { useCategories } from '../features/categories.js'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const rise = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

function sumType(rows, type) {
  return rows.reduce((total, row) => (row.type === type ? total + row.inr_amount_minor : total), 0)
}

export default function Dashboard() {
  const [loaded, setLoaded] = useState(false)
  const [monthTxns, setMonthTxns] = useState([])
  const [prevTxns, setPrevTxns] = useState([])
  const [recentTxns, setRecentTxns] = useState([])
  const [budgets, setBudgets] = useState([])
  const [emis, setEmis] = useState([])
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const { byId } = useCategories()

  const month = monthStart()

  const [rev, setRev] = useState(0)
  useDataChanged(
    ['transactions', 'budgets', 'emis', 'categories'],
    () => setRev((r) => r + 1)
  )

  useEffect(() => {
    let alive = true
    Promise.all([
      repository.listTransactions({ month }),
      repository.listTransactions({ month: addMonthsIso(month, -1) }),
      repository.listTransactions(),
      repository.listBudgets(),
      repository.listEmis(),
    ])
      .then(([cur, prev, all, bud, emiRows]) => {
        if (!alive) return
        setMonthTxns(cur)
        setPrevTxns(prev)
        setRecentTxns(all.slice(0, 5))
        setBudgets(bud)
        setEmis(emiRows)
      })
      .catch((error) => {
        console.error('[dashboard] load failed', error)
        if (alive) setLoadError(true)
      })
      .finally(() => alive && setLoaded(true))
    return () => {
      alive = false
    }
  }, [month, attempt, rev])

  const income = useMemo(() => sumType(monthTxns, 'income'), [monthTxns])
  const expense = useMemo(() => sumType(monthTxns, 'expense'), [monthTxns])
  const net = income - expense
  const netPositive = net >= 0

  const outTrend = useMemo(() => {
    const prev = sumType(prevTxns, 'expense')
    if (!prev) return null
    const pct = Math.round(((expense - prev) / prev) * 100)
    return { up: pct > 0, delta: `${pct > 0 ? '+' : ''}${pct}%` }
  }, [prevTxns, expense])

  const inTrend = useMemo(() => {
    const prev = sumType(prevTxns, 'income')
    if (!prev) return null
    const pct = Math.round(((income - prev) / prev) * 100)
    return { up: pct > 0, delta: `${pct > 0 ? '+' : ''}${pct}%` }
  }, [prevTxns, income])

  const chartData = useMemo(() => {
    const now = new Date()
    const isCurrentMonth = month === monthStart(now)
    const year = Number(month.slice(0, 5))
    const monthIdx = Number(month.slice(5, 7)) - 1
    const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate()
    const lastDay = isCurrentMonth && now.getUTCFullYear() === year ? now.getUTCDate() : daysInMonth
    const byDay = new Map(Array.from({ length: lastDay }, (_, i) => [i + 1, 0]))
    for (const row of monthTxns) {
      if (row.type !== 'expense') continue
      const day = Number(row.note_date.slice(8, 10))
      if (byDay.has(day)) byDay.set(day, byDay.get(day) + row.inr_amount_minor)
    }
    return [...byDay.entries()].map(([day, amount]) => ({ day: String(day), amount }))
  }, [monthTxns, month])

  const hasSpend = chartData.some((point) => point.amount > 0)

  const topBudgets = useMemo(() => {
    const spentByCat = new Map()
    for (const row of monthTxns) {
      if (row.type !== 'expense' || !row.category_id) continue
      spentByCat.set(row.category_id, (spentByCat.get(row.category_id) ?? 0) + row.inr_amount_minor)
    }
    return budgets
      .map((budget) => ({ ...budget, spent: spentByCat.get(budget.category_id) ?? 0 }))
      .sort((a, b) => b.spent / Math.max(b.limit_inr_minor, 1) - a.spent / Math.max(a.limit_inr_minor, 1))
      .slice(0, 3)
  }, [budgets, monthTxns])

  const upcomingEmis = useMemo(
    () =>
      emis
        .filter((emi) => emi.active !== false && emi.next_due_date && daysUntil(emi.next_due_date) <= 30)
        .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date))
        .slice(0, 3),
    [emis]
  )

  const quickLinks = [
    { to: '/commitments', label: 'Commitments', icon: CalendarClock, hint: upcomingEmis.length ? `${upcomingEmis.length} due soon` : 'EMIs & recurring' },
    { to: '/budgets', label: 'Budgets', icon: ChartPie, hint: budgets.length ? `${budgets.length} active` : 'Set your first' },
  ]

  if (loadError) {
    return (
      <EmptyState
        icon={CloudOff}
        title="Couldn't load your data"
        message="MoneyOS couldn't reach your data layer. Check your connection and try again."
        action={
          <Button
            icon={RefreshCw}
            onClick={() => {
              setLoadError(false)
              setLoaded(false)
              setAttempt((a) => a + 1)
            }}
          >
            Retry
          </Button>
        }
      />
    )
  }

  if (!loaded) {
    return (
      <div className="space-y-4 pt-1">
        <SkeletonLoader variant="line" className="w-40" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonLoader variant="card" className="h-28" />
          <SkeletonLoader variant="card" className="h-28" />
        </div>
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="text" lines={4} />
      </div>
    )
  }

  const monthShort = monthLabel(month).split(' ')[0]

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader title={`This month`} subtitle={`${monthLabel(month)} · all amounts in INR`} />

      <motion.div variants={rise} className="grid grid-cols-2 gap-3">
        <StatTile
          label="Money in"
          value={income}
          minor
          icon={ArrowDownRight}
          trend={inTrend?.up ? 'up' : inTrend ? 'down' : undefined}
          trendDelta={inTrend?.delta}
          trendLabel="vs last mo"
          className="col-span-1"
        />
        <StatTile
          label="Money out"
          value={-expense}
          minor
          icon={ArrowUpRight}
          trend={outTrend?.up ? 'up' : outTrend ? 'down' : undefined}
          trendInverse
          trendDelta={outTrend?.delta}
          trendLabel="vs last mo"
          className="col-span-1"
        />
      </motion.div>

      <motion.div variants={rise} className="mt-3">
        <div className="panel relative overflow-hidden rounded-[24px] p-5">
          <div aria-hidden className="aurora pointer-events-none absolute inset-0" />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <p className="micro-label">Net flow</p>
              <p className="font-display mt-1.5 text-[2rem] font-bold leading-none tracking-tight tabular-nums sm:text-[2.5rem]">
                <Amount value={net} minor signed={!netPositive} />
              </p>
              <p className="mt-2 text-xs text-muted">{netPositive ? 'Income ahead of spending' : 'Spending exceeds income'}</p>
            </div>
            <span
              aria-hidden
              className={`relative grid h-13 w-13 place-items-center rounded-2xl border border-border bg-surface-raised ${
                netPositive ? 'text-income' : 'text-expense'
              }`}
              style={{
                boxShadow: `0 0 22px -4px color-mix(in srgb, ${
                  netPositive ? 'var(--income)' : 'var(--expense)'
                } 45%, transparent)`,
              }}
            >
              <Wallet size={23} />
            </span>
          </div>
        </div>
      </motion.div>

      <motion.section variants={rise} className="neu-card mt-4 rounded-[20px] bg-surface p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-ink font-display inline-flex items-center gap-2 text-base font-bold tracking-tight">
            <span aria-hidden className="bg-gradient-brand h-2 w-2 rounded-full opacity-80" /> Daily spend
          </h2>
          <Link to="/expenses" className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
            Expenses <ArrowRight size={12} aria-hidden />
          </Link>
        </div>
        {hasSpend ? (
          <SpendChart data={chartData} monthShort={monthShort} />
        ) : (
          <EmptyState icon={ReceiptText} title="No spends yet" message="Log an expense and your daily pattern shows up here." />
        )}
      </motion.section>

      <motion.section variants={rise} className="neu-card mt-4 rounded-[20px] bg-surface p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-ink font-display inline-flex items-center gap-2 text-base font-bold tracking-tight">
            <span aria-hidden className="bg-gradient-brand h-2 w-2 rounded-full opacity-80" /> Budget watch
          </h2>
          <Link to="/budgets" className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
            All budgets <ArrowRight size={12} aria-hidden />
          </Link>
        </div>
        {topBudgets.length ? (
          <div className="space-y-4">
            {topBudgets.map((budget) => {
              const name = byId[budget.category_id]?.name ?? 'Unknown category'
              const color = byId[budget.category_id]?.color
              return (
                <ProgressBar
                  key={budget.id}
                  value={budget.spent}
                  max={budget.limit_inr_minor}
                  size="sm"
                  showPercent
                  overLabel="over budget"
                  label={
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                      {name}
                    </span>
                  }
                />
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={ChartPie}
            title="No budgets yet"
            message="Create monthly limits per category to keep spending honest."
            action={
              <Link to="/budgets">
                <span className="bg-gradient-brand inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-white">
                  Set a budget
                </span>
              </Link>
            }
          />
        )}
      </motion.section>

      <motion.section variants={rise} className="neu-card mt-4 rounded-[20px] bg-surface p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-ink font-display inline-flex items-center gap-2 text-base font-bold tracking-tight">
            <span aria-hidden className="bg-gradient-brand h-2 w-2 rounded-full opacity-80" /> EMIs · next 30 days
          </h2>
          <Link to="/commitments" className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
            Tracker <ArrowRight size={12} aria-hidden />
          </Link>
        </div>
        {upcomingEmis.length ? (
          <ul className="divide-y divide-transparent">
            {upcomingEmis.map((emi) => {
              const overdue = daysUntil(emi.next_due_date) < 0
              return (
                <li key={emi.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{emi.name}</p>
                    <p className={`mt-0.5 text-xs font-medium ${overdue ? 'text-expense' : 'text-emi'}`}>
                      {countdownLabel(emi.next_due_date)} · {emi.lender ?? 'Lender'}
                    </p>
                  </div>
                  <Amount value={emi.emi_inr_amount_minor} minor colored={false} animate={false} className="shrink-0 text-sm" />
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState icon={CalendarClock} title="Nothing due soon" message="No EMI installments fall due in the next 30 days." />
        )}
      </motion.section>

      <motion.nav variants={rise} aria-label="Plan shortcuts" className="mt-4 grid grid-cols-2 gap-3">
        {quickLinks.map((link) => (
          <Link key={link.to} to={link.to} className="group">
            <div className="neu-raised-sm flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 transition-transform group-active:scale-[0.97]">
              <span aria-hidden className="bg-gradient-brand grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ boxShadow: '0 0 18px -4px color-mix(in srgb, var(--brand) 50%, transparent)' }}>
                <link.icon size={19} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{link.label}</span>
                <span className="block truncate text-xs text-faint">{link.hint}</span>
              </span>
            </div>
          </Link>
        ))}
      </motion.nav>

      <motion.section variants={rise} className="neu-card mt-4 mb-2 rounded-[20px] bg-surface p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-ink font-display inline-flex items-center gap-2 text-base font-bold tracking-tight">
            <span aria-hidden className="bg-gradient-brand h-2 w-2 rounded-full opacity-80" /> Recent activity
          </h2>
          <Link to="/expenses" className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
            View all <ArrowRight size={12} aria-hidden />
          </Link>
        </div>
        {recentTxns.length ? (
          <ul>
            {recentTxns.map((txn) => {
              const category = txn.category_id ? byId[txn.category_id] : null
              return (
                <li key={txn.id} className="flex items-center gap-3 py-2.5">
                  <span
                    aria-hidden
                    className="border-border grid h-9 w-9 shrink-0 place-items-center rounded-xl border bg-surface-raised"
                    style={{
                      color: category?.color ?? undefined,
                      boxShadow: category?.color
                        ? `0 0 14px -3px color-mix(in srgb, ${category.color} 55%, transparent)`
                        : undefined,
                    }}
                  >
                    <ReceiptText size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{txn.description || 'Transaction'}</p>
                    <p className="text-xs text-faint">
                      {(category?.name ?? 'Uncategorised')} ·{' '}
                      {new Date(`${txn.note_date}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
                    </p>
                  </div>
                  <Amount value={txn.type === 'expense' ? -txn.inr_amount_minor : txn.inr_amount_minor} minor signed animate={false} className="shrink-0 text-sm" />
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState icon={ReceiptText} title="Quiet so far" message="Your latest transactions will appear here." />
        )}
      </motion.section>
    </motion.div>
  )
}
