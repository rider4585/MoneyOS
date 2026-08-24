# MoneyOS

A personal-money PWA: expenses/spends, borrow & lent ledger, EMI tracker,
budgets, recurring transactions — INR-first with entry-time multi-currency
snapshots.

## Stack

Vite · React 19 (JavaScript only) · Tailwind CSS v4 · framer-motion ·
lucide-react · recharts · vite-plugin-pwa · Supabase (auth: Google only).

Design language: **neumorphism × glassmorphism** — raised/inset soft-shadow
surfaces on a `#E0E5EC` base, frosted-glass overlays (`blur(14px)`), dark slate
variant, Outfit display + Inter UI fonts, tabular numerals for amounts.
See `/design` in the running app for every token live.

## Quick start

```bash
npm install
cp .env.example .env   # then fill values; DEMO_MODE=1 needs none of them
npm run dev            # themed shell at http://localhost:5173
npm run build          # production build + PWA manifest/service worker
node scripts/smoke-demo-repo.mjs   # data-layer contract smoke (exit 0 = pass)
```

`VITE_DEMO_MODE=1` runs fully local (localStorage repository seeded with rich
sample data, login bypassed, "Demo Mode" banner visible). No keys required —
it's the fastest way to explore every screen.

### Supabase + Google sign-in (live mode)

1. Create a project at [supabase.com](https://supabase.com), then open
   **SQL Editor** and run the whole of `supabase/schema.sql`. It creates all 8
   tables, RLS policies (`auth.uid()`-scoped), `updated_at` triggers, indexes,
   and a signup trigger that provisions your profile + default categories on
   first sign-in.
2. In the Supabase dashboard go to **Authentication → Providers → Google**,
   enable it, and paste a Google OAuth Client ID/Secret from
   [console.cloud.google.com](https://console.cloud.google.com/apis/credentials)
   (authorize the Supabase redirect URI shown there).
3. Put your project values in `.env`:
   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-public-key>
   ```
4. Remove `VITE_DEMO_MODE` (or set it to `0`) and restart the dev server.
   Sign in with Google; your data is row-level-scoped to your account.

Installability: served over HTTPS (or localhost), the app offers
**Add to Home Screen / Install** — icons, manifest and service worker are wired
via `vite-plugin-pwa`.

## Dev guide: data layer & auth

- **Contract first** — every screen consumes only `src/data/repository.js`
  (the interface). Never import a concrete impl in a screen.
- **Selection** — `src/data/index.js` is the single factory:
  `VITE_DEMO_MODE=1` → `demoRepository.js` (localStorage), otherwise
  `supabaseRepository.js` (Postgres via Supabase). Both implement the exact
  same surface: transactions, ledger entries, EMIs + installments, budgets,
  recurring rules, categories, profile.
- **Schema parity** — `supabase/schema.sql` is the source of truth for tables
  and column names. The demo repository mirrors its FK behaviour too (e.g.
  deleting a category unlinks transactions/recurring rules and cascades that
  category's budgets).
- **Money conventions (binding)** — integer minor units (paise); non-INR rows
  snapshot `fx_rate_to_inr` at entry from `https://open.er-api.com/v6/latest/USD`
  (see `src/lib/fx.js`); all display/aggregation reads the `*_inr_minor`
  columns only.
- **Categories are repo-backed** — one shared reactive registry
  (`src/features/categories.js`) feeds expense chips, rows, budget pickers and
  recurring forms; renames keep ids stable so references survive.

## Structure

```
src/
  components/    app shell, glass tab dock, neumorphic FAB, ui primitives
  context/       auth provider + protected-route guard
  features/      shared category registry; money sheets; plan-lane widgets
  pages/         Dashboard, Expenses, Ledger, EMI, Budgets, Recurring,
                 Settings, Login, NotFound + /design token gallery
  data/          repository contract + demo/supabase impls + factory
  lib/           supabase client, money (minor-unit) helpers, fx fetcher
  theme/         light/dark theme provider
supabase/        schema.sql (run once) + setup README
scripts/         smoke harness + PWA icon generator
```

Status & phase timestamps: see `BUILD_TIMELINE.md`.
