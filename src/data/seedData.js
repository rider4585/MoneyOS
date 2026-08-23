import { INR } from '../lib/money.js'

/**
 * seedData.js — deterministic demo dataset for demoRepository.
 * All money in MINOR units (paise). Foreign-currency rows carry an
 * entry-time fx snapshot { amount_minor, currency, fx_rate_to_inr,
 * inr_amount_minor }; INR rows use rate 1. Dates are relative to build time
 * so the demo always looks current.
 */

const day = 24 * 60 * 60 * 1000

function daysAgo(now, n) {
  return new Date(now - n * day).toISOString().slice(0, 10)
}
function daysAhead(now, n) {
  return daysAgo(now, -n)
}

/** fx snapshots pinned at plausible Aug-2026 levels (demo only). */
const FX_USD = 83.47

function usd(usdMinor) {
  return {
    amount_minor: usdMinor,
    currency: 'USD',
    fx_rate_to_inr: FX_USD,
    inr_amount_minor: Math.round(usdMinor * FX_USD),
  }
}

function inr(rupees) {
  return { amount_minor: rupees * 100, currency: INR, fx_rate_to_inr: 1, inr_amount_minor: rupees * 100 }
}

/** Principal-shaped money for ledger/EMI rows (schema: principal_minor / principal_inr_minor). */
function principal(money) {
  return {
    principal_minor: money.amount_minor,
    currency: money.currency,
    fx_rate_to_inr: money.fx_rate_to_inr,
    principal_inr_minor: money.inr_amount_minor,
  }
}

export function defaultCategories() {
  // Mirrors supabase/schema.sql handle_new_user() seeds (source of truth).
  const c = [
    ['Food & Dining', 'expense', '#F43F5E', 'utensils', 10],
    ['Groceries', 'expense', '#F97316', 'shopping-basket', 20],
    ['Transport', 'expense', '#0EA5E9', 'car', 30],
    ['Rent', 'expense', '#8B5CF6', 'home', 40],
    ['Utilities', 'expense', '#06B6D4', 'plug', 50],
    ['Shopping', 'expense', '#EC4899', 'shopping-bag', 60],
    ['Entertainment', 'expense', '#A855F7', 'clapperboard', 70],
    ['Health', 'expense', '#10B981', 'heart-pulse', 80],
    ['Travel', 'expense', '#14B8A6', 'plane', 90],
    ['Education', 'expense', '#6366F1', 'graduation-cap', 100],
    ['Subscriptions', 'expense', '#F59E0B', 'repeat', 110],
    ['EMI', 'expense', '#F59E0B', 'landmark', 120],
    ['Other', 'expense', '#94A3B8', 'circle-ellipsis', 130],
    ['Salary', 'income', '#10B981', 'banknote', 200],
    ['Freelance', 'income', '#22C55E', 'laptop', 210],
    ['Interest', 'income', '#84CC16', 'percent', 220],
    ['Gifts', 'income', '#EAB308', 'gift', 230],
    ['Other Income', 'income', '#94A3B8', 'circle-plus', 240],
  ]
  const slug = (name) => name.toLowerCase().replace(/[^a-z]+/g, '-')
  return c.map(([name, kind, color, icon, sortOrder]) => ({
    id: `cat-${slug(name)}`,
    name,
    kind,
    color,
    icon,
    sort_order: sortOrder,
  }))
}

export function buildSeedData(now = Date.now()) {
  const cats = Object.fromEntries(defaultCategories().map((c) => [c.id, c.id]))
  const cat = (name) => cats[`cat-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`]

  let txnSeq = 0
  const txn = (daysBack, type, categoryName, amount, desc, method, extra = {}) => ({
    id: `txn-${String(++txnSeq).padStart(3, '0')}`,
    type,
    category_id: cat(categoryName),
    ...(typeof amount === 'object' ? amount : inr(amount)),
    note_date: daysAgo(now, daysBack),
    description: desc,
    payment_method: method ?? 'UPI',
    source: 'manual',
    recurring_rule_id: null,
    ...extra,
  })

  const transactions = [
    // ---- July ----
    txn(54, 'income', 'Salary', 125000, 'Monthly salary — Nimbus Labs', 'NEFT'),
    txn(53, 'expense', 'Rent', 22000, 'Flat rent — July', 'Bank transfer'),
    txn(52, 'expense', 'Groceries', 3184, 'BigBasket weekly restock'),
    txn(51, 'expense', 'Food & Dining', 640, 'Filter coffee + vada pav'),
    txn(50, 'expense', 'Transport', 320, 'Uber to office'),
    txn(48, 'expense', 'Food & Dining', 1240, 'Team lunch — Toit'),
    txn(47, 'expense', 'Utilities', 1890, 'Electricity — BESCOM July'),
    txn(46, 'expense', 'Entertainment', 1500, 'Coldplay tickets pre-sale'),
    txn(44, 'expense', 'Shopping', 4299, 'Running shoes — Decathlon'),
    txn(43, 'expense', 'Groceries', 2870, 'DMart fortnightly'),
    txn(41, 'expense', 'Transport', 1450, 'Fastag recharge'),
    txn(40, 'expense', 'Health', 850, 'Pharmacy — vitamins'),
    txn(38, 'income', 'Freelance', 18000, 'Landing page for Kettle & Co'),
    txn(37, 'expense', 'Food & Dining', 899, 'Sushi night — Zomato Gold'),
    txn(36, 'expense', 'Subscriptions', usd(1499), 'Figma Professional (USD)', 'Card •• 4242'),
    txn(35, 'expense', 'Education', 2500, 'Frontend Masters renewal'),
    txn(34, 'expense', 'Travel', 6740, 'Blr->Pune bus + stay deposit'),
    txn(32, 'expense', 'Groceries', 1942, 'Zepto late-night top-up'),
    txn(31, 'expense', 'Food & Dining', 430, 'Chai + samosa week total'),
    txn(30, 'expense', 'Other', 999, 'Gift wrap + courier'),
    // ---- August ----
    txn(24, 'income', 'Salary', 125000, 'Monthly salary — Nimbus Labs', 'NEFT'),
    txn(23, 'expense', 'Rent', 22000, 'Flat rent — August', 'Bank transfer'),
    txn(22, 'expense', 'Groceries', 3610, 'Instamart monthly haul'),
    txn(21, 'expense', 'Transport', 275, 'Metro card top-up'),
    txn(20, 'expense', 'Food & Dining', 1120, 'Anniversary dinner — Olive Bar'),
    txn(18, 'expense', 'Utilities', 2045, 'Electricity — BESCOM August'),
    txn(17, 'expense', 'Entertainment', 499, 'Netflix premium (INR plan)'),
    txn(16, 'expense', 'Shopping', 6899, 'Mechanical keyboard — Keychron'),
    txn(15, 'expense', 'Health', 1500, 'Dental cleaning'),
    txn(13, 'expense', 'Subscriptions', usd(999), 'Notion Plus annual (USD)', 'Card •• 4242'),
    txn(12, 'expense', 'Groceries', 1233, 'Milk, eggs, sourdough'),
    txn(11, 'expense', 'Food & Dining', 720, 'Biryani takeaway'),
    txn(10, 'expense', 'Transport', 1180, 'Airport cab'),
    txn(9, 'expense', 'Subscriptions', usd(4200), 'AWS monthly bill (USD)', 'Card •• 4242'),
    txn(8, 'income', 'Interest', 412, 'FD interest payout'),
    txn(7, 'expense', 'Food & Dining', 350, 'Office cafeteria'),
    txn(5, 'expense', 'Travel', 8940, 'Goa weekend — flights'),
    txn(4, 'expense', 'Entertainment', 800, 'Bowling arcade'),
    txn(2, 'expense', 'Groceries', 2650, 'Sunday farmers market'),
    txn(1, 'expense', 'Food & Dining', 540, 'Ramen date'),
    txn(0, 'expense', 'Transport', 96, 'Auto to gym'),
  ]

  const ledgerEntries = [
    {
      id: 'led-001',
      type: 'lent',
      counterparty: 'Rahul Menon',
      ...principal(inr(4500)),
      settled_inr_minor: 200000,
      entry_date: daysAgo(now, 20),
      due_date: daysAhead(now, 10),
      notes: 'Concert tickets — he pays back in parts',
    },
    {
      id: 'led-002',
      type: 'borrow',
      counterparty: 'Priya Sharma',
      ...principal(inr(12000)),
      settled_inr_minor: 0,
      entry_date: daysAgo(now, 45),
      due_date: daysAhead(now, 15),
      notes: 'Covered her laptop repair',
    },
    {
      id: 'led-003',
      type: 'lent',
      counterparty: 'Amit Verma',
      ...principal(usd(8000)),
      settled_inr_minor: Math.round(8000 * FX_USD / 2),
      entry_date: daysAgo(now, 10),
      due_date: null,
      notes: 'Split Airbnb in Goa — paid in USD',
    },
  ]

  const emis = [
    {
      id: 'emi-001',
      name: 'Hyundai Creta car loan',
      lender: 'HDFC Bank',
      ...principal(inr(800000)),
      interest_rate_pa: 9.2,
      tenure_months: 60,
      emi_amount_minor: 1664000,
      emi_inr_amount_minor: 1664000,
      start_date: '2025-03-05',
      next_due_date: daysAhead(now, 12),
      active: true,
      notes: 'Auto-debit mandate active',
    },
    {
      id: 'emi-002',
      name: 'MacBook education loan',
      lender: 'Axis Bank',
      ...principal(inr(185000)),
      interest_rate_pa: 11.5,
      tenure_months: 24,
      emi_amount_minor: 868400,
      emi_inr_amount_minor: 868400,
      start_date: '2026-01-10',
      next_due_date: daysAhead(now, 17),
      active: true,
      notes: null,
    },
  ]

  const installment = (emiId, seq, daysBack, late = false) => ({
    id: `inst-${emiId}-${String(seq).padStart(2, '0')}`,
    emi_id: emiId,
    ...(() => {
      const m = inr(emiId === 'emi-001' ? 16640 : 8684)
      return { paid_minor: m.amount_minor, currency: m.currency, fx_rate_to_inr: m.fx_rate_to_inr, paid_inr_minor: m.inr_amount_minor }
    })(),
    paid_on: daysAgo(now, daysBack),
    late,
    notes: late ? 'Paid 2 days after due date' : null,
  })

  const emiInstallments = [
    installment('emi-001', 1, 172), installment('emi-001', 2, 142), installment('emi-001', 3, 111, true),
    installment('emi-001', 4, 81), installment('emi-001', 5, 51), installment('emi-001', 6, 20),
    installment('emi-002', 1, 178), installment('emi-002', 2, 148), installment('emi-002', 3, 117),
    installment('emi-002', 4, 87), installment('emi-002', 5, 56), installment('emi-002', 6, 26),
  ]

  const thisMonthStart = `${new Date(now).toISOString().slice(0, 7)}-01`
  const budgets = [
    { id: 'bud-001', category_id: cat('Food & Dining'), month: thisMonthStart, limit_inr_minor: 1500000, alert_threshold_pct: 80 },
    { id: 'bud-002', category_id: cat('Groceries'), month: thisMonthStart, limit_inr_minor: 1000000, alert_threshold_pct: 75 },
    { id: 'bud-003', category_id: cat('Shopping'), month: thisMonthStart, limit_inr_minor: 800000, alert_threshold_pct: 90 },
    { id: 'bud-004', category_id: cat('Transport'), month: thisMonthStart, limit_inr_minor: 500000, alert_threshold_pct: 80 },
  ]

  const recurringRules = [
    {
      id: 'rec-001',
      title: 'Flat rent',
      category_id: cat('Rent'),
      type: 'expense',
      ...inr(22000),
      frequency: 'monthly',
      interval_count: 1,
      next_run_date: daysAhead(now, 8),
      end_date: null,
      last_run_at: new Date(now - 23 * day).toISOString(),
      active: true,
    },
    {
      id: 'rec-002',
      title: 'Salary — Nimbus Labs',
      category_id: cat('Salary'),
      type: 'income',
      ...inr(125000),
      frequency: 'monthly',
      interval_count: 1,
      next_run_date: daysAhead(now, 8),
      end_date: null,
      last_run_at: new Date(now - 23 * day).toISOString(),
      active: true,
    },
  ]

  return {
    categories: defaultCategories(),
    transactions,
    ledgerEntries,
    emis,
    emiInstallments,
    budgets,
    recurringRules,
  }
}
