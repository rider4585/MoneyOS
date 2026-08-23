import { snapshotAmount, INR, monthStart } from '../lib/money.js'
import { fetchFxRateToInr } from '../lib/fx.js'
import { buildSeedData } from './seedData.js'

/**
 * demoRepository — full offline implementation of the repository contract
 * (repository.js). localStorage-backed, seeded on first init. Active when
 * VITE_DEMO_MODE=1 (see src/data/index.js).
 */

const STORAGE_KEY = 'moneyos.demo.v1'

let db = null

function load() {
  if (db) return db
  const raw = localStorage.getItem(STORAGE_KEY)
  db = raw ? JSON.parse(raw) : null
  return db
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Snapshot helper shared by all add paths (fx fetched only when non-INR). */
async function snap(amountMinor, currency) {
  const rate = await fetchFxRateToInr(currency || INR)
  return snapshotAmount(amountMinor, currency || INR, rate)
}

function nextDueDateAddMonth(isoDateStr) {
  const d = new Date(`${isoDateStr}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + 1)
  return d.toISOString().slice(0, 10)
}

export function createDemoRepository() {
  return {
    async init() {
      if (!load()) {
        db = {
          profile: {
            id: 'demo-user',
            email: 'demo@moneyos.app',
            display_name: 'Aarav (Demo)',
            avatar_url: null,
            default_currency: INR,
          },
          categories: [],
          transactions: [],
          ledger_entries: [],
          emis: [],
          emi_installments: [],
          budgets: [],
          recurring_transactions: [],
        }
        const seed = buildSeedData()
        db.categories = seed.categories
        db.transactions = seed.transactions
        db.ledger_entries = seed.ledgerEntries
        db.emis = seed.emis
        db.emi_installments = seed.emiInstallments
        db.budgets = seed.budgets
        db.recurring_transactions = seed.recurringRules
        persist()
      }
    },

    // ------------------------------------------------------------------ txns
    async listTransactions(filter = {}) {
      let rows = load().transactions.map((t) => ({ ...t }))
      if (filter.type) rows = rows.filter((t) => t.type === filter.type)
      if (filter.category_id) rows = rows.filter((t) => t.category_id === filter.category_id)
      if (filter.month) rows = rows.filter((t) => t.note_date.startsWith(filter.month))
      if (filter.q) {
        const q = filter.q.toLowerCase()
        rows = rows.filter((t) => (t.description ?? '').toLowerCase().includes(q))
      }
      rows.sort((a, b) => b.note_date.localeCompare(a.note_date) || b.id.localeCompare(a.id))
      return rows
    },

    async addTransaction(txn) {
      const data = load()
      const money = await snap(txn.amount_minor, txn.currency)
      const row = {
        id: uid('txn'),
        type: txn.type ?? 'expense',
        category_id: txn.category_id ?? null,
        ...money,
        note_date: txn.note_date ?? new Date().toISOString().slice(0, 10),
        description: txn.description ?? '',
        payment_method: txn.payment_method ?? 'UPI',
        source: txn.source ?? 'manual',
        recurring_rule_id: txn.recurring_rule_id ?? null,
      }
      data.transactions.push(row)
      persist()
      return row
    },

    async updateTransaction(id, patch) {
      const data = load()
      const row = data.transactions.find((t) => t.id === id)
      if (!row) throw new Error(`updateTransaction: unknown id ${id}`)
      Object.assign(row, patch)
      if ('amount_minor' in patch || 'currency' in patch || 'fx_rate_to_inr' in patch) {
        const rate =
          row.currency === INR ? 1 : Number.isFinite(Number(patch.fx_rate_to_inr)) ? Number(patch.fx_rate_to_inr) : await fetchFxRateToInr(row.currency)
        Object.assign(row, snapshotAmount(row.amount_minor, row.currency, rate))
      }
      persist()
      return { ...row }
    },

    async deleteTransaction(id) {
      const data = load()
      const before = data.transactions.length
      data.transactions = data.transactions.filter((t) => t.id !== id)
      if (data.transactions.length === before) throw new Error(`deleteTransaction: unknown id ${id}`)
      persist()
    },

    // ---------------------------------------------------------------- ledger
    async listLedgerEntries(type) {
      let rows = load().ledger_entries.map((e) => ({ ...e }))
      if (type) rows = rows.filter((e) => e.type === type)
      rows.sort((a, b) => b.entry_date.localeCompare(a.entry_date))
      return rows
    },

    async addLedgerEntry(entry) {
      const data = load()
      const money = await snap(entry.principal_minor, entry.currency)
      if (entry.settled_inr_minor != null && entry.settled_inr_minor > money.inr_amount_minor) {
        throw new Error('addLedgerEntry: settlement cannot exceed principal')
      }
      const row = {
        id: uid('led'),
        type: entry.type,
        counterparty: entry.counterparty,
        ...money,
        settled_inr_minor: entry.settled_inr_minor ?? 0,
        entry_date: entry.entry_date ?? new Date().toISOString().slice(0, 10),
        due_date: entry.due_date ?? null,
        notes: entry.notes ?? null,
      }
      data.ledger_entries.push(row)
      persist()
      return row
    },

    async settleLedgerEntry(id, minorAmountInr) {
      const data = load()
      const row = data.ledger_entries.find((e) => e.id === id)
      if (!row) throw new Error(`settleLedgerEntry: unknown id ${id}`)
      const amt = Math.round(Number(minorAmountInr))
      if (!(amt > 0)) throw new Error('settleLedgerEntry: amount must be positive (INR minor)')
      const next = Math.min(row.principal_inr_minor, row.settled_inr_minor + amt)
      row.settled_inr_minor = next
      persist()
      return { ...row }
    },

    // ------------------------------------------------------------------ emis
    async listEmis() {
      return load().emis.map((e) => ({ ...e }))
    },

    async addEmi(emi) {
      const data = load()
      const money = await snap(emi.principal_minor, emi.currency)
      const emiMoney = emi.emi_inr_amount_minor
        ? { amount_minor: Math.round(emi.emi_inr_amount_minor / (emi.fx_rate_to_inr ?? 1)), currency: emi.currency ?? INR, fx_rate_to_inr: emi.fx_rate_to_inr ?? 1, inr_amount_minor: Math.round(emi.emi_inr_amount_minor) }
        : await snap(emi.emi_amount_minor, emi.currency)
      const row = {
        id: uid('emi'),
        name: emi.name,
        lender: emi.lender ?? null,
        ...money,
        interest_rate_pa: emi.interest_rate_pa ?? null,
        tenure_months: emi.tenure_months,
        emi_amount_minor: emiMoney.amount_minor,
        fx_rate_to_inr: money.fx_rate_to_inr,
        emi_inr_amount_minor: emiMoney.inr_amount_minor,
        start_date: emi.start_date ?? new Date().toISOString().slice(0, 10),
        next_due_date: emi.next_due_date ?? emi.start_date ?? new Date().toISOString().slice(0, 10),
        active: emi.active ?? true,
        notes: emi.notes ?? null,
      }
      data.emis.push(row)
      persist()
      return row
    },

    async recordInstallment(emiId, installmentInput = {}) {
      const data = load()
      const emi = data.emis.find((e) => e.id === emiId)
      if (!emi) throw new Error(`recordInstallment: unknown emi ${emiId}`)
      const paidMinor = Math.round(installmentInput.paid_minor ?? emi.emi_amount_minor)
      if (!(paidMinor > 0)) throw new Error('recordInstallment: paid amount must be positive')
      const rate = emi.currency === INR ? 1 : emi.fx_rate_to_inr || (await fetchFxRateToInr(emi.currency))
      const row = {
        id: uid('inst'),
        emi_id: emiId,
        paid_minor: paidMinor,
        currency: emi.currency,
        fx_rate_to_inr: rate,
        paid_inr_minor: Math.round(paidMinor * rate),
        paid_on: installmentInput.paid_on ?? new Date().toISOString().slice(0, 10),
        late: installmentInput.late ?? false,
        notes: installmentInput.notes ?? null,
      }
      data.emi_installments.push(row)
      emi.next_due_date = nextDueDateAddMonth(emi.next_due_date)
      const count = data.emi_installments.filter((i) => i.emi_id === emiId).length
      if (count >= emi.tenure_months) emi.active = false
      persist()
      return row
    },

    // --------------------------------------------------------------- budgets
    async listBudgets(month) {
      const target = month ?? monthStart()
      return load()
        .budgets.filter((b) => b.month === target)
        .map((b) => ({ ...b }))
    },

    async setBudget(budget) {
      const data = load()
      const m = budget.month ?? monthStart()
      const existing = data.budgets.find(
        (b) => b.category_id === budget.category_id && b.month === m
      )
      if (!(budget.limit_inr_minor > 0)) throw new Error('setBudget: limit must be positive (INR minor)')
      if (existing) {
        existing.limit_inr_minor = Math.round(budget.limit_inr_minor)
        existing.alert_threshold_pct = budget.alert_threshold_pct ?? existing.alert_threshold_pct
        persist()
        return { ...existing }
      }
      const row = {
        id: uid('bud'),
        category_id: budget.category_id,
        month: m,
        limit_inr_minor: Math.round(budget.limit_inr_minor),
        alert_threshold_pct: budget.alert_threshold_pct ?? 80,
      }
      data.budgets.push(row)
      persist()
      return row
    },

    // ------------------------------------------------------------- recurring
    async listRecurring() {
      return load().recurring_transactions.map((r) => ({ ...r }))
    },

    async addRecurring(rule) {
      const data = load()
      const money = await snap(rule.amount_minor, rule.currency)
      const row = {
        id: uid('rec'),
        title: rule.title,
        category_id: rule.category_id ?? null,
        type: rule.type ?? 'expense',
        ...money,
        frequency: rule.frequency,
        interval_count: rule.interval_count ?? 1,
        next_run_date: rule.next_run_date ?? new Date().toISOString().slice(0, 10),
        end_date: rule.end_date ?? null,
        last_run_at: null,
        active: rule.active ?? true,
      }
      data.recurring_transactions.push(row)
      persist()
      return row
    },

    async deleteRecurring(id) {
      const data = load()
      const before = data.recurring_transactions.length
      data.recurring_transactions = data.recurring_transactions.filter((r) => r.id !== id)
      if (data.recurring_transactions.length === before) throw new Error(`deleteRecurring: unknown id ${id}`)
      persist()
    },

    // --------------------------------------------------------------- profile
    async getProfile() {
      return { ...load().profile }
    },
  }
}
