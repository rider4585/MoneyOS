# MoneyOS × Supabase

Everything needed to put MoneyOS on a real Supabase project. This folder is
**human-run setup** (hive card H1); the app works without it in demo mode
(`VITE_DEMO_MODE=1` uses localStorage).

## 1 · Run the schema (2 minutes)

1. Create a project at [supabase.com](https://supabase.com) (or open an existing one).
2. **SQL Editor → New query**, paste the entire contents of [`schema.sql`](./schema.sql), **Run**.
3. Verify: **Table Editor** shows 8 tables under `public`
   (`profiles, categories, transactions, ledger_entries, emis, emi_installments,
   budgets, recurring_transactions`) and every one says **RLS enabled**.

The script is idempotent — re-running it never duplicates tables, triggers or policies.

## 2 · Wire Google sign-in (5 minutes)

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) →
   **Create credentials → OAuth client ID → Web application**.
   - **Authorized JavaScript origins:** `https://<your-project-ref>.supabase.co`
   - **Authorized redirect URI:** `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. Copy the **Client ID** + **Client Secret** into Supabase:
   **Authentication → Providers → Google → Enable**, paste both, Save.
3. Supabase **Authentication → URL Configuration**: set Site URL to where the app
   runs in production (e.g. your deployed PWA URL) and add
   `http://localhost:5173` to Redirect URLs for local dev.

## 3 · Point the app at Supabase

```bash
cp .env.example .env        # then fill in:
# VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
# VITE_SUPABASE_ANON_KEY=<anon/public key from Project Settings → API>
# VITE_SUPABASE_URL / VITE_DEMO_MODE=0   ← switches from localStorage to Supabase
```

NEVER commit `.env`. The **anon key is safe to ship** — it's a public identifier;
all protection comes from RLS below. Never expose the `service_role` key anywhere
client-side.

## Data model at a glance

| Table                    | Purpose | Notes |
| ------------------------ | ------- | ----- |
| `profiles`               | One row per Google user | auto-created on signup by trigger |
| `categories`             | expense/income categories | 18 defaults auto-seeded per new user |
| `transactions`           | spends + income ledger | filterable by date/type/category |
| `ledger_entries`         | borrow / lent per counterparty | settlements accumulate; "open" = settled < principal |
| `emis`                   | loan master + monthly EMI | progress = Σ installments ÷ principal |
| `emi_installments`       | payment history per loan | |
| `budgets`                | monthly cap per category (INR) | unique per (user, category, month) |
| `recurring_transactions` | rules that mint transactions | generated rows tagged `source='recurring'` |

### Money conventions (mirrors `src/data/repository.js`)

- All amounts are **integer minor units (paise)** — never floats.
- Multi-currency rows snapshot fx **at entry time**:
  `{ amount_minor, currency, fx_rate_to_inr, inr_amount_minor }`.
  fx comes from `https://open.er-api.com/v6/latest/USD`, fetched once only when
  `currency ≠ 'INR'`; INR rows keep `fx_rate_to_inr = 1`.
- Display/aggregation is **always INR** → read only `*_inr_minor` columns.
- Ledger settlements (`settled_inr_minor`) accumulate in INR terms.

## Security posture

- **RLS on all 8 tables**, locked to `auth.uid()` — no user can read or write
  another user's rows even through the REST API directly.
- `profiles` INSERT happens via a `SECURITY DEFINER` signup trigger
  (`handle_new_user`); users can SELECT/UPDATE their own profile but there is no
  DELETE policy (profile dies with the auth user via cascade).
- Default categories are seeded **per user inside their own tenant** — no shared/global rows.

## Troubleshooting

- **"relation auth.users does not exist"** → you ran this outside Supabase (plain Postgres). Run it in the Supabase SQL Editor.
- **Policy errors on re-run** → shouldn't happen (script drops-then-recreates), but if you previously ran an older/different schema, drop the conflicting policy named in the error and re-run.
- **Signed up but no profile/categories** → check **Database → Logs → Postgres** for `handle_new_user` errors; the trigger runs as the signup event.
- **Google popup closes instantly** → redirect URI mismatch (step 2.1b) or provider keys not saved.
