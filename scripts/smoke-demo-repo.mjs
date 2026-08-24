/**
 * smoke-demo-repo.mjs — Node harness that exercises the FULL demoRepository
 * contract without a browser (localStorage + fetch are shimmed).
 * Run: node scripts/smoke-demo-repo.mjs   (exit 0 = all assertions pass)
 */

const storage = new Map()
globalThis.localStorage = {
  getItem: (k) => storage.get(k) ?? null,
  setItem: (k, v) => void storage.set(k, String(v)),
  removeItem: (k) => void storage.delete(k),
}

// Stub the FX endpoint so the USD paths never hit the network.
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({ result: 'success', rates: { USD: 1, INR: 83.47, EUR: 0.92 } }),
})

const { createDemoRepository } = await import('../src/data/demoRepository.js')

let failures = 0
function assert(cond, label) {
  if (cond) {
    console.log(`  ok - ${label}`)
  } else {
    failures++
    console.error(`FAIL - ${label}`)
  }
}
function eq(a, b, label) {
  assert(Object.is(a, b), `${label} (${JSON.stringify(a)} === ${JSON.stringify(b)})`)
}

const repo = createDemoRepository()

await repo.init()

// ---- seed shape -----------------------------------------------------------
let txns = await repo.listTransactions()
assert(txns.length >= 30, `seeded >= 30 transactions (${txns.length})`)
assert(txns.some((t) => t.currency === 'USD' && t.fx_rate_to_inr > 80 && t.inr_amount_minor === Math.round(t.amount_minor * t.fx_rate_to_inr)), 'USD rows carry entry-time fx snapshot')

const ledgerAll = await repo.listLedgerEntries()
eq(ledgerAll.length, 3, 'seeded 3 counterparties ledger entries')
assert(ledgerAll.some((e) => e.type === 'borrow') && ledgerAll.some((e) => e.type === 'lent'), 'ledger mixes borrow/lent')

let emis = await repo.listEmis()
eq(emis.length, 2, 'seeded 2 active EMIs')
assert(emis.every((e) => e.active && e.next_due_date), 'EMIs active with next due dates')

let budgets = await repo.listBudgets()
eq(budgets.length, 4, 'seeded 4 budgets for current month')

let recurring = await repo.listRecurring()
eq(recurring.length, 2, 'seeded 2 recurring rules')

// ---- transaction CRUD -----------------------------------------------------
const added = await repo.addTransaction({
  type: 'expense',
  category_id: 'cat-food-dining',
  amount_minor: 25000,
  description: 'smoke-test lunch',
})
eq(added.inr_amount_minor, 25000, 'INR add keeps rate 1 (inr == native)')
eq((await repo.listTransactions()).length, txns.length + 1, 'addTransaction persists')

const updated = await repo.updateTransaction(added.id, { amount_minor: 30000 })
eq(updated.inr_amount_minor, 30000, 'updateTransaction recomputes inr snapshot')

const eurUpdated = await repo.updateTransaction(added.id, { currency: 'EUR', amount_minor: 2000 })
eq(eurUpdated.fx_rate_to_inr, Math.round((83.47 / 0.92) * 1e8) / 1e8, 'currency switch fetches fx for new currency')
eq(eurUpdated.inr_amount_minor, Math.round(2000 * (83.47 / 0.92)), 'inr snapshot recomputed on currency switch')

await repo.deleteTransaction(added.id)
eq((await repo.listTransactions()).length, txns.length, 'deleteTransaction removes row')

// filters
eq((await repo.listTransactions({ type: 'income' })).every((t) => t.type === 'income'), true, 'filter by type=income')
eq((await repo.listTransactions({ q: 'salary' })).length > 0, true, "filter by q='salary'")

// ---- USD add path (fx fetched-once, cached in row) -------------------------
const usdTxn = await repo.addTransaction({
  type: 'expense',
  category_id: 'cat-subscriptions',
  currency: 'USD',
  amount_minor: 1200,
  description: 'smoke-test USD',
})
eq(usdTxn.fx_rate_to_inr, 83.47, 'non-INR add snapshots fx from endpoint')
eq(usdTxn.inr_amount_minor, Math.round(1200 * 83.47), 'inr_amount_minor derived from snapshot')
await repo.deleteTransaction(usdTxn.id)

// ---- ledger settlement ------------------------------------------------------
const led = (await repo.listLedgerEntries())[0]
const beforeSettle = led.settled_inr_minor
const afterSettle = await repo.settleLedgerEntry(led.id, 100000)
eq(afterSettle.settled_inr_minor, Math.min(beforeSettle + 100000, afterSettle.principal_inr_minor), 'settle accumulates (clamped at principal)')
const clamped = await repo.settleLedgerEntry(led.id, 10_000_000)
eq(clamped.settled_inr_minor, clamped.principal_inr_minor, 'over-settlement clamps at principal_inr_minor')

// ---- newly added ledger entry uses principal_* shape (contract parity) ------
const newLed = await repo.addLedgerEntry({
  type: 'borrow',
  counterparty: 'Smoke Sibling',
  principal_minor: 500000,
})
assert(newLed.principal_inr_minor === 500000 && newLed.amount_minor === undefined, 'addLedgerEntry returns principal_* shape')
const settledNew = await repo.settleLedgerEntry(newLed.id, 125000)
eq(settledNew.settled_inr_minor, 125000, 'settle works on a freshly added entry')

// ---- newly added EMI uses principal_* shape ---------------------------------
const newEmi = await repo.addEmi({
  name: 'smoke-test loan',
  principal_minor: 10000000,
  emi_amount_minor: 212400,
  tenure_months: 60,
})
assert(newEmi.principal_inr_minor === 10000000 && newEmi.emi_inr_amount_minor === 212400 && newEmi.amount_minor === undefined, 'addEmi returns principal_* + emi_inr shape')

// ---- EMI installment --------------------------------------------------------
const emi = emis[0]
const prevDue = emi.next_due_date
const inst = await repo.recordInstallment(emi.id, {})
eq(inst.paid_inr_minor, Math.round(inst.paid_minor * inst.fx_rate_to_inr), 'installment derives paid_inr from snapshot')
const refreshed = (await repo.listEmis()).find((e) => e.id === emi.id)
assert(refreshed.next_due_date > prevDue, `next_due_date advanced (${prevDue} -> ${refreshed.next_due_date})`)

// ---- budgets upsert (month accepted as 'YYYY-MM' OR 'YYYY-MM-01') ----------
const catId = budgets[0].category_id
const bumped = await repo.setBudget({ category_id: catId, limit_inr_minor: budgets[0].limit_inr_minor + 500000 })
eq(bumped.limit_inr_minor, budgets[0].limit_inr_minor + 500000, 'setBudget updates existing (same category+month)')
eq((await repo.listBudgets()).length, 4, 'budget count unchanged after upsert')
const altFormat = await repo.setBudget({ category_id: catId, month: new Date().toISOString().slice(0, 7), limit_inr_minor: 2000000 })
eq(altFormat.month, `${new Date().toISOString().slice(0, 7)}-01`, "setBudget normalises 'YYYY-MM' input to first-of-month")
eq((await repo.listBudgets(new Date().toISOString().slice(0, 7))).length, 4, "listBudgets('YYYY-MM') matches 'YYYY-MM-01' rows")

// ---- recurring -----------------------------------------------------------------
const rule = await repo.addRecurring({
  title: 'smoke-test rule',
  frequency: 'weekly',
  amount_minor: 50000,
  type: 'expense',
})
eq((await repo.listRecurring()).length, 3, 'addRecurring persists')
await repo.deleteRecurring(rule.id)
eq((await repo.listRecurring()).length, 2, 'deleteRecurring removes')

// ---- T4 contract completion -------------------------------------------------
// updateRecurring: stable id + money re-snapshot + pause
const editRule = await repo.addRecurring({
  title: 'smoke-edit rule',
  frequency: 'monthly',
  amount_minor: 100000,
  type: 'expense',
})
const editedRule = await repo.updateRecurring(editRule.id, { amount_minor: 150000, title: 'smoke-edited rule' })
eq(editedRule.id, editRule.id, 'updateRecurring keeps the rule id stable')
eq(editedRule.inr_amount_minor, 150000, 'updateRecurring recomputes inr snapshot')
eq((await repo.updateRecurring(editRule.id, { active: false })).active, false, 'updateRecurring pauses a rule')
await repo.deleteRecurring(editRule.id)

// deleteBudget (+ unknown id throws)
const delTarget = budgets[budgets.length - 1]
await repo.deleteBudget(delTarget.id)
eq((await repo.listBudgets()).length, 3, 'deleteBudget removes the row')
let threwUnknown = false
try {
  await repo.deleteBudget(delTarget.id)
} catch {
  threwUnknown = true
}
assert(threwUnknown, 'deleteBudget unknown id throws')
await repo.setBudget({
  category_id: delTarget.category_id,
  month: delTarget.month.slice(0, 7),
  limit_inr_minor: delTarget.limit_inr_minor,
})
eq((await repo.listBudgets()).length, 4, 'budget restored after delete test')

// categories: list/add/dup-guard/rename-stable-id
const cats = await repo.listCategories()
assert(cats.length >= 18 && cats.every((c) => c.kind === 'expense' || c.kind === 'income'), `categories listed (${cats.length})`)
const newCat = await repo.addCategory({ name: 'Smoke Lane', kind: 'expense', color: '#123456' })
assert(String(newCat.id).startsWith('cat-'), `addCategory returns row (${newCat.id})`)
threwUnknown = false
try {
  await repo.addCategory({ name: 'smoke lane', kind: 'expense' })
} catch {
  threwUnknown = true
}
assert(threwUnknown, 'addCategory duplicate name+kind throws')

const renamedCat = await repo.updateCategory(newCat.id, { name: 'Smoke Lane X' })
eq(renamedCat.id, newCat.id, 'updateCategory keeps id stable across rename')
eq(renamedCat.name, 'Smoke Lane X', 'updateCategory applies patch')

// deleteCategory mirrors schema FKs: txns SET NULL, budgets CASCADE
const cascadeTxn = await repo.addTransaction({
  type: 'expense',
  category_id: newCat.id,
  amount_minor: 1000,
  description: 'cascade probe',
})
await repo.setBudget({ category_id: newCat.id, limit_inr_minor: 500000 })
await repo.deleteCategory(newCat.id)
assert(!(await repo.listCategories()).some((c) => c.id === newCat.id), 'deleteCategory removes the row')
eq(
  (await repo.listTransactions()).find((t) => t.id === cascadeTxn.id)?.category_id ?? null,
  null,
  'deleteCategory unlinks transactions (SET NULL)'
)
eq((await repo.listBudgets()).length, 4, 'deleteCategory cascades its budgets only')
threwUnknown = false
try {
  await repo.deleteCategory(newCat.id)
} catch {
  threwUnknown = true
}
assert(threwUnknown, 'deleteCategory unknown id throws')

// ---- profile -------------------------------------------------------------------
const profile = await repo.getProfile()
assert(profile?.display_name, 'getProfile returns demo profile')

console.log(failures === 0 ? '\nSMOKE PASS' : `\nSMOKE FAIL (${failures})`)
process.exit(failures === 0 ? 0 : 1)
