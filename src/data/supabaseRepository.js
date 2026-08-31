import { snapshotAmount, INR } from '../lib/money.js'
import { fetchFxRateToInr } from '../lib/fx.js'
import { getSupabase } from '../lib/supabase.js'

/**
 * supabaseRepository — Postgres/Supabase implementation of the repository
 * contract. Table/column names mirror app/supabase/schema.sql exactly
 * (source of truth). All *_minor columns are INR/native minor units;
 * multi-currency rows persist their entry-time fx snapshot.
 */

function client() {
  return getSupabase()
}

// Memoized user id: auth.getUser() is a NETWORK round-trip, and calling it on
// EVERY repository call was ~2x requests per screen. The session id is stable
// for the life of a session (the app fully reloads on sign-in/out via
// AuthProvider/ProtectedRoute), so we resolve once and reuse. Only a SUCCESSFUL
// resolve is cached; transient failures are re-attempted next call. __resetUserId
// exists so an auth change (sign-out) can clear it when the app re-boots without
// a hard reload.
let cachedUserId = null
export function __resetUserId() {
  cachedUserId = null
}

async function currentUserId() {
  if (cachedUserId) return cachedUserId
  const sb = client()
  const { data, error } = await sb.auth.getUser()
  if (error) throw error
  if (!data?.user?.id) throw new Error('supabaseRepository: no authenticated user')
  cachedUserId = data.user.id
  return cachedUserId
}

/** Entry-time money snapshot for a new row (fx fetched only when non-INR). */
async function snap(amountMinor, currency) {
  const cur = currency || INR
  const rate = await fetchFxRateToInr(cur)
  return snapshotAmount(amountMinor, cur, rate)
}

export function createSupabaseRepository() {
  return {
    async init() {
      // RLS + signup trigger handle profile/category provisioning server-side;
      // nothing to seed client-side.
      await currentUserId()
    },

    // ------------------------------------------------------------------ txns
    async listTransactions(filter = {}) {
      const uid = await currentUserId()
      let q = client()
        .from('transactions')
        .select('*')
        .eq('user_id', uid)
        .order('note_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (filter.type) q = q.eq('type', filter.type)
      if (filter.category_id) q = q.eq('category_id', filter.category_id)
      if (filter.month) {
        const mk = monthKey(filter.month)
        q = q.gte('note_date', `${mk}-01`).lt('note_date', nextMonthStart(mk))
      }
      if (filter.q) q = q.ilike('description', `%${filter.q}%`)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },

    async addTransaction(txn) {
      const uid = await currentUserId()
      const money = await snap(txn.amount_minor, txn.currency)
      const payload = {
        user_id: uid,
        type: txn.type ?? 'expense',
        category_id: txn.category_id ?? null,
        ...money,
        note_date: dateOnly(txn.note_date),
        description: txn.description ?? '',
        payment_method: txn.payment_method ?? 'UPI',
        source: txn.source ?? 'manual',
        recurring_rule_id: txn.recurring_rule_id ?? null,
      }
      const { data, error } = await client().from('transactions').insert(payload).select().single()
      if (error) throw error
      return data
    },

    async updateTransaction(id, patch) {
      // Applied WITHOUT a pre-read: the edit sheet sends the full row as the
      // patch (amount + currency + fx snapshot together), so rebuilding money
      // fields straight from the patch is exact and costs zero extra queries.
      // Currency defaults to INR for the snapshot only when the caller omits it
      // and only when money fields are being touched (a non-money patch simply
      // forwards the given columns unchanged).
      const updates = { ...patch }
      if ('amount_minor' in patch || 'currency' in patch || 'fx_rate_to_inr' in patch) {
        const currency = updates.currency ?? INR
        const explicit = Number(updates.fx_rate_to_inr)
        const rate =
          currency === INR
            ? 1
            : Number.isFinite(explicit) && explicit > 0
              ? explicit
              : await fetchFxRateToInr(currency)
        Object.assign(updates, snapshotAmount(updates.amount_minor ?? 0, currency, rate))
      }
      delete updates.id
      delete updates.created_at
      delete updates.updated_at

      const { data, error } = await client().from('transactions').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data
    },

    async deleteTransaction(id) {
      const { error } = await client().from('transactions').delete().eq('id', id)
      if (error) throw error
    },

    // ---------------------------------------------------------------- ledger
    async listLedgerEntries(type) {
      const uid = await currentUserId()
      let q = client()
        .from('ledger_entries')
        .select('*')
        .eq('user_id', uid)
        .order('entry_date', { ascending: false })
      if (type) q = q.eq('type', type)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },

    async addLedgerEntry(entry) {
      const uid = await currentUserId()
      const money = await snap(entry.principal_minor, entry.currency)
      const payload = {
        user_id: uid,
        type: entry.type,
        counterparty: entry.counterparty,
        principal_minor: money.amount_minor,
        currency: money.currency,
        fx_rate_to_inr: money.fx_rate_to_inr,
        principal_inr_minor: money.inr_amount_minor,
        settled_inr_minor: Math.min(entry.settled_inr_minor ?? 0, money.inr_amount_minor),
        entry_date: dateOnly(entry.entry_date),
        due_date: entry.due_date ? dateOnly(entry.due_date) : null,
        notes: entry.notes ?? null,
      }
      const { data, error } = await client().from('ledger_entries').insert(payload).select().single()
      if (error) throw error
      return data
    },

    async settleLedgerEntry(id, minorAmountInr) {
      const uid = await currentUserId()
      const amt = Math.round(Number(minorAmountInr))
      if (!(amt > 0)) throw new Error('settleLedgerEntry: amount must be positive (INR minor)')
      const { data: row, error: fetchErr } = await client()
        .from('ledger_entries')
        .select('principal_inr_minor, settled_inr_minor')
        .eq('id', id)
        .eq('user_id', uid)
        .single()
      if (fetchErr) throw fetchErr
      const next = Math.min(row.principal_inr_minor, row.settled_inr_minor + amt)
      const { data, error } = await client()
        .from('ledger_entries')
        .update({ settled_inr_minor: next })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },

    // ------------------------------------------------------------------ emis
    async listEmis() {
      const uid = await currentUserId()
      const { data, error } = await client()
        .from('emis')
        .select('*')
        .eq('user_id', uid)
        .order('next_due_date', { ascending: true })
      if (error) throw error
      return data ?? []
    },

    async addEmi(emi) {
      const uid = await currentUserId()
      const money = await snap(emi.principal_minor, emi.currency)
      const emiMoney = await snap(emi.emi_amount_minor, emi.currency)
      const payload = {
        user_id: uid,
        name: emi.name,
        lender: emi.lender ?? null,
        principal_minor: money.amount_minor,
        currency: money.currency,
        fx_rate_to_inr: money.fx_rate_to_inr,
        principal_inr_minor: money.inr_amount_minor,
        interest_rate_pa: emi.interest_rate_pa ?? null,
        tenure_months: emi.tenure_months,
        emi_amount_minor: emiMoney.amount_minor,
        emi_inr_amount_minor: emiMoney.inr_amount_minor,
        start_date: dateOnly(emi.start_date),
        next_due_date: dateOnly(emi.next_due_date ?? emi.start_date),
        active: emi.active ?? true,
        notes: emi.notes ?? null,
      }
      const { data, error } = await client().from('emis').insert(payload).select().single()
      if (error) throw error
      return data
    },

    async recordInstallment(emiId, installmentInput = {}) {
      const uid = await currentUserId()
      const { data: emi, error } = await client()
        .from('emis')
        .select('*')
        .eq('id', emiId)
        .eq('user_id', uid)
        .single()
      if (error) throw error

      const paidMinor = Math.round(installmentInput.paid_minor ?? emi.emi_amount_minor)
      if (!(paidMinor > 0)) throw new Error('recordInstallment: paid amount must be positive')
      const paidMoney = await snap(paidMinor, emi.currency)

      const instPayload = {
        user_id: uid,
        emi_id: emiId,
        paid_minor: paidMoney.amount_minor,
        currency: paidMoney.currency,
        fx_rate_to_inr: paidMoney.fx_rate_to_inr,
        paid_inr_minor: paidMoney.inr_amount_minor,
        paid_on: dateOnly(installmentInput.paid_on),
        late: installmentInput.late ?? false,
        notes: installmentInput.notes ?? null,
      }
      const { data: inst, error: instErr } = await client()
        .from('emi_installments')
        .insert(instPayload)
        .select()
        .single()
      if (instErr) throw instErr

      const d = new Date(`${emi.next_due_date}T00:00:00Z`)
      d.setUTCMonth(d.getUTCMonth() + 1)
      const { count, error: cntErr } = await client()
        .from('emi_installments')
        .select('id', { count: 'exact', head: true })
        .eq('emi_id', emiId)
      if (cntErr) throw cntErr
      const patch = { next_due_date: d.toISOString().slice(0, 10) }
      if ((count ?? 0) >= emi.tenure_months) patch.active = false
      await client().from('emis').update(patch).eq('id', emiId)

      return inst
    },

    // --------------------------------------------------------------- budgets
    async listBudgets(month) {
      const uid = await currentUserId()
      const m = `${monthKey(month)}-01`
      const { data, error } = await client()
        .from('budgets')
        .select('*')
        .eq('user_id', uid)
        .gte('month', m)
        .lt('month', nextMonthStart(m))
        .order('month', { ascending: false })
      if (error) throw error
      return data ?? []
    },

    async setBudget(budget) {
      const uid = await currentUserId()
      if (!(budget.limit_inr_minor > 0)) throw new Error('setBudget: limit must be positive (INR minor)')
      const month = `${monthKey(budget.month)}-01`
      const payload = {
        user_id: uid,
        category_id: budget.category_id,
        month,
        limit_inr_minor: Math.round(budget.limit_inr_minor),
        alert_threshold_pct: budget.alert_threshold_pct ?? 80,
      }
      const { data, error } = await client()
        .from('budgets')
        .upsert(payload, { onConflict: 'user_id,category_id,month' })
        .select()
        .single()
      if (error) throw error
      return data
    },

    async deleteBudget(id) {
      const { error } = await client().from('budgets').delete().eq('id', id)
      if (error) throw error
    },

    // ------------------------------------------------------------- recurring
    async listRecurring() {
      const uid = await currentUserId()
      const { data, error } = await client()
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', uid)
        .order('next_run_date', { ascending: true })
      if (error) throw error
      return data ?? []
    },

    async addRecurring(rule) {
      const uid = await currentUserId()
      const money = await snap(rule.amount_minor, rule.currency)
      const payload = {
        user_id: uid,
        title: rule.title,
        category_id: rule.category_id ?? null,
        type: rule.type ?? 'expense',
        ...money,
        inr_amount_minor: money.inr_amount_minor,
        frequency: rule.frequency,
        interval_count: rule.interval_count ?? 1,
        next_run_date: dateOnly(rule.next_run_date),
        end_date: rule.end_date ? dateOnly(rule.end_date) : null,
        last_run_at: null,
        active: rule.active ?? true,
      }
      const { data, error } = await client().from('recurring_transactions').insert(payload).select().single()
      if (error) throw error
      return data
    },

    async updateRecurring(id, patch) {
      const uid = await currentUserId()
      // Applied WITHOUT a pre-read for the same reason as updateTransaction: the
      // caller supplies the full row / money fields together, so rebuilding the
      // snapshot straight from the patch is exact and costs zero extra queries.
      const updates = { ...patch }
      if ('amount_minor' in patch || 'currency' in patch || 'fx_rate_to_inr' in patch) {
        const currency = updates.currency ?? INR
        const explicit = Number(updates.fx_rate_to_inr)
        const rate =
          currency === INR
            ? 1
            : Number.isFinite(explicit) && explicit > 0
              ? explicit
              : await fetchFxRateToInr(currency)
        Object.assign(updates, snapshotAmount(updates.amount_minor ?? 0, currency, rate))
      }
      delete updates.id
      delete updates.created_at
      delete updates.updated_at

      const { data, error } = await client()
        .from('recurring_transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },

    async deleteRecurring(id) {
      const { error } = await client().from('recurring_transactions').delete().eq('id', id)
      if (error) throw error
    },

    // ------------------------------------------------------------- categories
    async listCategories() {
      const uid = await currentUserId()
      const { data, error } = await client()
        .from('categories')
        .select('*')
        .eq('user_id', uid)
        .order('kind', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      return data ?? []
    },

    async addCategory(category) {
      const uid = await currentUserId()
      const name = String(category.name ?? '').trim()
      const kind = category.kind ?? 'expense'
      if (!name) throw new Error('addCategory: name is required')
      const payload = {
        user_id: uid,
        name,
        kind,
        color: category.color ?? '#8B5CF6',
        icon: category.icon ?? 'circle',
      }
      if (Number.isFinite(Number(category.sort_order))) payload.sort_order = Number(category.sort_order)
      const { data, error } = await client().from('categories').insert(payload).select().single()
      if (error) throw error
      return data
    },

    async updateCategory(id, patch) {
      const updates = { ...patch }
      if (updates.name != null) {
        updates.name = String(updates.name).trim()
        if (!updates.name) throw new Error('updateCategory: name is required')
      }
      delete updates.id
      delete updates.user_id
      delete updates.created_at
      delete updates.updated_at
      const { data, error } = await client().from('categories').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data
    },

    async deleteCategory(id) {
      // FKs do the rest: transactions/recurring SET NULL, budgets CASCADE.
      const { error } = await client().from('categories').delete().eq('id', id)
      if (error) throw error
    },

    // --------------------------------------------------------------- profile
    async getProfile() {
      const uid = await currentUserId()
      const { data, error } = await client().from('profiles').select('*').eq('id', uid).single()
      if (error) throw error
      return data
    },
  }
}

/** Month-ish input ('YYYY-MM' or 'YYYY-MM-DD…') → 'YYYY-MM'; absent → current month. */
function monthKey(value) {
  const m = /^(\d{4}-\d{2})/.exec(typeof value === 'string' ? value.trim() : '')
  return m ? m[1] : new Date().toISOString().slice(0, 7)
}

/** Date-ish input ('YYYY-MM-DD…' or bare 'YYYY-MM') → DATE 'YYYY-MM-DD'; absent → today. */
function dateOnly(value) {
  const s = typeof value === 'string' ? value.trim() : ''
  const m = /^(\d{4}-\d{2})(?:-(\d{2}))?/.exec(s)
  if (!m) return new Date().toISOString().slice(0, 10)
  return m[2] ? `${m[1]}-${m[2]}` : `${m[1]}-01`
}

function nextMonthStart(month) {
  const [y, mo] = month.split('-').map(Number)
  const ny = mo === 12 ? y + 1 : y
  const nm = mo === 12 ? 1 : mo + 1
  return `${ny}-${String(nm).padStart(2, '0')}-01`
}
