/**
 * repository.js — the MoneyOS data-layer CONTRACT (T1 stub).
 *
 * Every screen consumes ONLY this interface (board.md §Architecture rules).
 * T2 ships two implementations of the exact same shape:
 *   - demoRepository.js     (localStorage + seed data)   — active when VITE_DEMO_MODE=1
 *   - supabaseRepository.js (Supabase + Google auth)
 * chosen in src/data/index.js by the VITE_DEMO_MODE flag.
 *
 * Conventions:
 *   - Money is stored in MINOR UNITS (paise) as integers: `amount_minor`.
 *   - Multi-currency rows snapshot fx at entry time:
 *       { amount_minor, currency, fx_rate_to_inr, inr_amount_minor }
 *     fx fetched once from https://open.er-api.com/v6/latest/USD only when
 *     currency !== 'INR'; display currency is always INR.
 *   - All list methods return plain JS objects; ids are strings.
 */

const notImplemented = (method) => async () => {
  throw new Error(`repository.${method}: not implemented — arrives with T2 (data layer)`)
}

/**
 * @typedef {Object} Repository
 * @property {() => Promise<void>}                       init
 * // transactions (expenses/spends)
 * @property {(filter?: object) => Promise<Array>}       listTransactions
 * @property {(txn: object) => Promise<object>}          addTransaction
 * @property {(id: string, patch: object) => Promise<object>} updateTransaction
 * @property {(id: string) => Promise<void>}             deleteTransaction
 * // ledger_entries (borrow / lent with counterparties)
 * @property {(type: 'borrow'|'lent') => Promise<Array>}  listLedgerEntries
 * @property {(entry: object) => Promise<object>}         addLedgerEntry
 * @property {(id: string, minorAmount: number) => Promise<object>} settleLedgerEntry
 * // emis + emi_installments
 * @property {() => Promise<Array>}                      listEmis
 * @property {(emi: object) => Promise<object>}          addEmi
 * @property {(emiId: string, installment: object) => Promise<object>} recordInstallment
 * // budgets (per category/month)
 * @property {(month?: string) => Promise<Array>}        listBudgets
 * @property {(budget: object) => Promise<object>}       setBudget
 * // recurring_transactions (rules -> auto-generated entries)
 * @property {() => Promise<Array>}                      listRecurring
 * @property {(rule: object) => Promise<object>}         addRecurring
 * @property {(id: string, patch: object) => Promise<object>} updateRecurring
 * @property {(id: string) => Promise<void>}             deleteRecurring
 * // categories (user-scoped metadata; defaults provisioned per user)
 * @property {() => Promise<Array>}                      listCategories
 * @property {(category: object) => Promise<object>}     addCategory
 * @property {(id: string, patch: object) => Promise<object>} updateCategory
 * @property {(id: string) => Promise<void>}             deleteCategory
 * // profile / session-adjacent metadata
 * @property {() => Promise<object|null>}                getProfile
 */
export const repository = {
  init: notImplemented('init'),
  listTransactions: notImplemented('listTransactions'),
  addTransaction: notImplemented('addTransaction'),
  updateTransaction: notImplemented('updateTransaction'),
  deleteTransaction: notImplemented('deleteTransaction'),
  listLedgerEntries: notImplemented('listLedgerEntries'),
  addLedgerEntry: notImplemented('addLedgerEntry'),
  settleLedgerEntry: notImplemented('settleLedgerEntry'),
  listEmis: notImplemented('listEmis'),
  addEmi: notImplemented('addEmi'),
  recordInstallment: notImplemented('recordInstallment'),
  listBudgets: notImplemented('listBudgets'),
  setBudget: notImplemented('setBudget'),
  deleteBudget: notImplemented('deleteBudget'),
  listRecurring: notImplemented('listRecurring'),
  addRecurring: notImplemented('addRecurring'),
  updateRecurring: notImplemented('updateRecurring'),
  deleteRecurring: notImplemented('deleteRecurring'),
  listCategories: notImplemented('listCategories'),
  addCategory: notImplemented('addCategory'),
  updateCategory: notImplemented('updateCategory'),
  deleteCategory: notImplemented('deleteCategory'),
  getProfile: notImplemented('getProfile'),
}

export default repository
