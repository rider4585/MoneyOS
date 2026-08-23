# MoneyOS

A personal-money PWA: expenses/spends, borrow & lent ledger, EMI tracker,
budgets, recurring transactions — INR-first with entry-time multi-currency
snapshots.

## Stack

Vite · React 19 (JavaScript only) · Tailwind CSS v4 · framer-motion ·
lucide-react · vite-plugin-pwa · Supabase (auth: Google only).

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
```

`VITE_DEMO_MODE=1` runs fully local (localStorage repository, login bypassed,
"Demo Mode" banner visible). Supabase mode needs `VITE_SUPABASE_URL` +
`VITE_SUPABASE_ANON_KEY`.

## Dev guide: data layer & auth (phase T2)

- **Contract first** — every screen consumes only `src/data/repository.js`
  (the interface). Never import a concrete impl in a screen.
- **Selection** — `src/data/index.js` is the single factory:
  `VITE_DEMO_MODE=1` → `demoRepository.js` (localStorage, seeded with rich
  sample data), otherwise `supabaseRepository.js` (Postgres via Supabase).
- **Schema** — `supabase/schema.sql` is the source of truth for tables and
  column names. Run it once in the Supabase SQL editor; it creates profiles +
  default categories automatically on first Google sign-in.
- **Auth** — Google-only OAuth (`src/context/AuthProvider.jsx`). Protected
  routes wrap the shell via `ProtectedRoute`; demo mode bypasses login.
- **Money conventions (binding)** — integer minor units (paise); non-INR rows
  snapshot `fx_rate_to_inr` at entry from `https://open.er-api.com/v6/latest/USD`
  (see `src/lib/fx.js`); all display/aggregation reads the `*_inr_minor`
  columns only.

## Structure

```
src/
  components/    app shell, glass tab dock, neumorphic FAB, ui primitives
  context/       auth provider + protected-route guard
  pages/         route placeholders + /design token gallery + login
  data/          repository contract + demo/supabase impls + factory
  lib/           supabase client, money (minor-unit) helpers, fx fetcher
  theme/         light/dark theme provider
scripts/         make-icons.mjs placeholder PWA icon generator
```

Money is stored in minor units (paise) as integers; fx rate snapshotted once at
entry time for non-INR transactions; display is always INR.

Status & phase timestamps: see `BUILD_TIMELINE.md`.
