import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarClock, CheckCircle2, ChevronDown, Landmark, Plus } from 'lucide-react'
import repository from '../data/index.js'
import { Amount, Button, EmptyState, ProgressRing, SkeletonLoader } from '../components/ui/index.js'
import AddEmiSheet from '../features/money/AddEmiSheet.jsx'
import { installmentCount, installmentsFor, rememberInstallment } from '../features/money/installments.js'

/**
 * EMI tracker — active loans with a progress ring (installments paid vs
 * tenure), next-due highlight (overdue / due-soon / scheduled), expandable
 * installment history and a mark-installment-paid action. Add loans via
 * the sheet; history is rebuilt through features/money/installments.js
 * because the frozen contract has no installments getter.
 */

function fmtRupees(minor) {
  return `₹${(minor / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function nextDueMeta(iso) {
  if (!iso) return null
  const today = new Date().toISOString().slice(0, 10)
  if (iso < today) return { text: 'Overdue', detail: iso, className: 'text-expense' }
  const soon = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)
  if (iso <= soon) return { text: 'Due soon', detail: iso, className: 'text-emi' }
  return { text: 'Next due', detail: iso, className: 'text-faint' }
}

function shortDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function Emi() {
  const [emis, setEmis] = useState(null)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [payingId, setPayingId] = useState(null)

  const refresh = useCallback(async () => {
    try {
      await repository.init()
      setEmis(await repository.listEmis())
      setError(null)
    } catch (err) {
      setError(err?.message ?? 'Could not load EMIs')
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function markPaid(emi) {
    if (payingId) return
    setPayingId(emi.id)
    try {
      const row = await repository.recordInstallment(emi.id, {})
      rememberInstallment(row)
      setExpandedId((cur) => cur ?? emi.id)
      await refresh()
    } catch (err) {
      setError(err?.message ?? 'Could not record installment')
    } finally {
      setPayingId(null)
    }
  }

  const active = useMemo(() => (emis ?? []).filter((e) => e.active), [emis])
  const closed = useMemo(() => (emis ?? []).filter((e) => !e.active), [emis])
  const loading = emis === null

  return (
    <section aria-label="EMI tracker">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">EMIs</h1>
          <p className="text-sm text-muted">
            {loading ? 'Loading…' : `${active.length} active ${active.length === 1 ? 'loan' : 'loans'}`}
          </p>
        </div>
        <Button variant="brand" icon={Plus} onClick={() => setSheetOpen(true)}>
          Add loan
        </Button>
      </header>

      {error ? (
        <p role="alert" className="text-sm font-semibold text-expense">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <SkeletonLoader key={i} variant="card" className="h-40 rounded-3xl" />
          ))}
        </div>
      ) : emis.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No loans tracked"
          message="Add a loan to see progress, installment history and due reminders."
          action={
            <Button variant="brand" icon={Plus} onClick={() => setSheetOpen(true)}>
              Add first loan
            </Button>
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {[...active, ...closed].map((emi, i) => {
              const paidCount = Math.min(installmentCount(emi.id), emi.tenure_months)
              const pct = emi.tenure_months > 0 ? Math.round((paidCount / emi.tenure_months) * 100) : 0
              const meta = emi.active ? nextDueMeta(emi.next_due_date) : null
              const isOpen = expandedId === emi.id
              const history = installmentsFor(emi.id)
              return (
                <motion.article
                  key={emi.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.25), duration: 0.24 }}
                  className={`neu-card rounded-3xl bg-surface p-4 ${!emi.active ? 'opacity-70' : ''}`}
                  aria-label={`${emi.name} — ${pct}% paid`}
                >
                  <div className="flex items-start gap-4">
                    <ProgressRing value={paidCount} max={emi.tenure_months} tone="emi" sublabel="paid" size={84} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-display truncate text-base font-bold">{emi.name}</h2>
                        {!emi.active && (
                          <span className="neu-inset shrink-0 rounded-full bg-base px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase text-income">
                            Done
                          </span>
                        )}
                      </div>
                      {emi.lender ? <p className="truncate text-xs text-muted">{emi.lender}</p> : null}
                      <p className="mt-1 text-xs font-medium text-muted tabular-nums">
                        <Amount value={emi.emi_inr_amount_minor} minor colored={false} animate={false} className="text-[13px]" />
                        <span className="text-faint"> / month · </span>
                        {paidCount}/{emi.tenure_months} installments
                      </p>
                      {meta ? (
                        <p className={`mt-1.5 inline-flex items-center gap-1 text-xs font-bold ${meta.className}`}>
                          <CalendarClock size={12} aria-hidden />
                          {meta.text}
                          <span className="font-medium">{meta.detail}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : emi.id)}
                      aria-expanded={isOpen}
                      className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-muted hover:text-ink select-none"
                    >
                      History ({history.length})
                      <ChevronDown size={13} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {emi.active ? (
                      <Button
                        size="sm"
                        variant="raised"
                        icon={CheckCircle2}
                        onClick={() => markPaid(emi)}
                        disabled={payingId === emi.id || payingId !== null}
                      >
                        {payingId === emi.id ? 'Recording…' : 'Mark installment paid'}
                      </Button>
                    ) : null}
                  </div>

                  {isOpen && (
                    <div className="hairline-t mt-3 space-y-2 pt-3">
                      {history.length === 0 ? (
                        <p className="py-2 text-center text-xs text-faint">No installments recorded yet</p>
                      ) : (
                        history.map((inst) => (
                          <div key={inst.id} className="flex items-center gap-2.5 rounded-2xl px-1 py-1.5">
                            <span aria-hidden className="neu-inset grid h-7 w-7 place-items-center rounded-full bg-base text-income">
                              <CheckCircle2 size={13} />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs text-muted tabular-nums">
                              Paid {shortDate(inst.paid_on)}
                              {inst.late ? <span className="ml-1.5 font-bold text-emi">late</span> : null}
                            </span>
                            <Amount value={inst.paid_inr_minor} minor colored={false} animate={false} className="text-sm" />
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </motion.article>
              )
            })}
          </div>

          <p className="mt-4 px-1 text-center text-[11px] leading-relaxed text-faint">
            Marking an installment paid advances the next due date by one month.
          </p>
        </>
      )}

      <AddEmiSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onSaved={refresh} />
    </section>
  )
}
