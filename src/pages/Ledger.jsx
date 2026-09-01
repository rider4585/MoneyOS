import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarClock, HandCoins, Plus } from 'lucide-react'
import repository from '../data/index.js'
import { useDataChanged } from '../data/useDataChanged.js'
import { formatMinorToDisplay, resolveDisplayCurrency } from '../lib/display.js'
import { Amount, Button, EmptyState, SkeletonLoader } from '../components/ui/index.js'
import LedgerEntrySheet from '../features/money/LedgerEntrySheet.jsx'
import SettleSheet from '../features/money/SettleSheet.jsx'
import StatusBadge, { ledgerStatus } from '../features/money/StatusBadge.jsx'

/**
 * Ledger — borrow/lent book. Counterparties aggregated to a NET balance
 * (emerald when they owe you, rose when you owe), expandable entry lists
 * with open / partially_settled / settled badges, create sheet and a
 * partial/full settle flow that accumulates settled_inr_minor.
 */

function initials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function fmtRupees(minor) {
  return formatMinorToDisplay(minor, resolveDisplayCurrency())
}

function dueMeta(dueDate) {
  if (!dueDate) return null
  const today = new Date().toISOString().slice(0, 10)
  if (dueDate < today) return { text: `Overdue · ${dueDate}`, tone: 'text-expense' }
  const soon = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)
  if (dueDate <= soon) return { text: `Due ${dueDate}`, tone: 'text-emi' }
  return { text: `Due ${dueDate}`, tone: 'text-faint' }
}

export default function Ledger() {
  const [entries, setEntries] = useState(null)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [entrySheetOpen, setEntrySheetOpen] = useState(false)
  const [settleTarget, setSettleTarget] = useState(null)

  const refresh = useCallback(async () => {
    try {
      await repository.init()
      setEntries(await repository.listLedgerEntries())
      setError(null)
    } catch (err) {
      setError(err?.message ?? 'Could not load ledger')
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Refresh instantly when a ledger entry changes from any screen/sheet.
  useDataChanged(['ledger'], refresh)

  const people = useMemo(() => {
    const map = new Map()
    for (const e of entries ?? []) {
      const p =
        map.get(e.counterparty) ??
        { name: e.counterparty, lentOut: 0, borrowOut: 0, entries: [] }
      const out = Math.max(0, e.principal_inr_minor - e.settled_inr_minor)
      if (e.type === 'lent') p.lentOut += out
      else p.borrowOut += out
      p.entries.push(e)
      map.set(e.counterparty, p)
    }
    return [...map.values()]
      .map((p) => ({ ...p, net: p.lentOut - p.borrowOut }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
  }, [entries])

  const totals = useMemo(() => {
    let owedToMe = 0
    let iOwe = 0
    for (const p of people) {
      if (p.net > 0) owedToMe += p.net
      else iOwe += -p.net
    }
    return { owedToMe, iOwe }
  }, [people])

  const nameSuggestions = useMemo(() => people.map((p) => p.name), [people])
  const loading = entries === null

  return (
    <section aria-label="Borrow and lent ledger">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Ledger</h1>
          <p className="text-sm text-muted">Who owes whom, at a glance</p>
        </div>
        <Button variant="brand" icon={Plus} onClick={() => setEntrySheetOpen(true)}>
          New
        </Button>
      </header>

      {/* net-position summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="panel rounded-[18px] p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="micro-label">They owe you</p>
            <span className="grid h-8 w-8 place-items-center rounded-xl border border-border bg-field text-income">
              <ArrowUpRight size={15} aria-hidden />
            </span>
          </div>
          <p className="font-display mt-2 text-xl font-bold tracking-tight tabular-nums sm:text-2xl">
            <Amount value={totals.owedToMe} minor />
          </p>
        </div>
        <div className="panel rounded-[18px] p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="micro-label">You owe</p>
            <span className="grid h-8 w-8 place-items-center rounded-xl border border-border bg-field text-expense">
              <ArrowDownLeft size={15} aria-hidden />
            </span>
          </div>
          <p className="font-display mt-2 text-xl font-bold tracking-tight tabular-nums text-expense sm:text-2xl">
            {fmtRupees(totals.iOwe)}
          </p>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-sm font-semibold text-expense">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((i) => (
            <SkeletonLoader key={i} variant="line" className="h-20 rounded-3xl" />
          ))}
        </div>
      ) : people.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={ArrowLeftRight}
          title="No borrow or lent entries"
          message="Track money you lend or borrow so nothing is forgotten."
          action={
            <Button variant="brand" icon={Plus} onClick={() => setEntrySheetOpen(true)}>
              Add first entry
            </Button>
          }
        />
      ) : (
        <div className="mt-5 space-y-3">
          {people.map((person, pi) => {
            const isOpen = expanded === person.name
            const owesYou = person.net > 0
            return (
              <motion.div
                key={person.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(pi * 0.05, 0.25), duration: 0.24 }}
                className={`panel overflow-hidden rounded-[18px] ${isOpen ? 'border-border-strong' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : person.name)}
                  aria-expanded={isOpen}
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-4 text-left select-none"
                >
                  <span
                    aria-hidden
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-field text-sm font-bold"
                    style={{ color: owesYou ? 'var(--income)' : 'var(--expense)' }}
                  >
                    {initials(person.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{person.name}</span>
                    <span className="text-xs text-muted">
                      {person.entries.length} {person.entries.length === 1 ? 'entry' : 'entries'}
                      {person.lentOut > 0 && person.borrowOut > 0 ? ' · both ways' : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <Amount
                      value={owesYou ? person.net : -Math.abs(person.net)}
                      minor
                      signed
                      animate={false}
                      className="text-base"
                    />
                    <span className="micro-label mt-0.5 block">
                      {person.net === 0 ? 'all square' : owesYou ? 'owes you' : 'you owe'}
                    </span>
                  </span>
                </button>

                {isOpen && (
                  <div className="hairline-t space-y-2.5 px-4 pt-3 pb-4">
                    {[...person.entries]
                      .sort((a, b) => b.entry_date.localeCompare(a.entry_date))
                      .map((entry) => {
                        const status = ledgerStatus(entry)
                        const outstanding = Math.max(0, entry.principal_inr_minor - entry.settled_inr_minor)
                        const meta = dueMeta(entry.due_date)
                        const lent = entry.type === 'lent'
                        return (
                          <div key={entry.id} className="rounded-2xl border border-border bg-field px-3.5 py-3">
                            <div className="flex items-center gap-2">
                              <span
                                aria-hidden
                                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${lent ? 'text-income' : 'text-expense'}`}
                                style={{ backgroundColor: 'color-mix(in srgb, currentColor 12%, transparent)' }}
                              >
                                {lent ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-muted">
                                {lent ? 'Lent' : 'Borrowed'}
                                {entry.notes ? <span className="font-normal"> · {entry.notes}</span> : null}
                              </span>
                              <StatusBadge status={status} />
                            </div>
                            <div className="mt-2 flex items-end justify-between gap-2">
                              <div className="min-w-0">
                                <Amount
                                  value={entry.principal_inr_minor}
                                  minor
                                  colored={false}
                                  animate={false}
                                  className="text-lg"
                                />
                                <p className="mt-0.5 text-[11px] text-muted tabular-nums">
                                  {outstanding > 0
                                    ? `${fmtRupees(outstanding)} outstanding`
                                    : 'fully repaid'}
                                  {meta ? (
                                    <span className={`ml-1.5 inline-flex items-center gap-0.5 font-semibold ${meta.tone}`}>
                                      <CalendarClock size={10} aria-hidden />
                                      {meta.text}
                                    </span>
                                  ) : null}
                                </p>
                              </div>
                              {status !== 'settled' && (
                                <Button
                                  size="sm"
                                  variant="raised"
                                  icon={HandCoins}
                                  onClick={() => setSettleTarget(entry)}
                                  className="shrink-0"
                                >
                                  Settle
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      <LedgerEntrySheet
        open={entrySheetOpen}
        onClose={() => setEntrySheetOpen(false)}
        nameSuggestions={nameSuggestions}
        onSaved={refresh}
      />

      <SettleSheet
        open={settleTarget !== null}
        entry={settleTarget}
        onClose={() => setSettleTarget(null)}
        onSettled={refresh}
      />
    </section>
  )
}
