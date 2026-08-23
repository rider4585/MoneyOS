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

`VITE_DEMO_MODE=1` runs fully local (localStorage repository, login bypassed).
Supabase mode needs `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

## Structure

```
src/
  components/    app shell, glass tab dock, neumorphic FAB, ui primitives
  pages/         route placeholders + /design token gallery
  data/          repository.js contract (impls land in phase T2)
  theme/         light/dark theme provider
scripts/         make-icons.mjs placeholder PWA icon generator
```

Money is stored in minor units (paise) as integers; fx rate snapshotted once at
entry time for non-INR transactions; display is always INR.

Status & phase timestamps: see `BUILD_TIMELINE.md`.
