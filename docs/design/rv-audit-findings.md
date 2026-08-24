# MoneyOS Revamp — Code-Level UI/UX Audit

_Auditor: worker-ux-auditor · 2026-08-24 · Scope: src/pages/**, src/components/** (incl. ui kit), src/features/**, src/App.jsx, src/index.css, index.html/vite.config tokens._
_Baseline: v0.1.0 @ 9c83056. Findings prioritized P0 (broken/trust-damaging) → P1 (major friction/a11y) → P2 (consistency/polish). Companion owner decisions: rv-questions.md._

---

## P0 — must fix before any revamp layering

### P0-1 · Budgets page crashes on render (missing import)
- **`src/pages/Budgets.jsx:267`** — `<Pressable>` is used for the delete control but **never imported** (imports at :1–18 lack it). First render of any budget row throws `ReferenceError` → white screen on a primary screen. Verified by repo-wide grep; every other consumer imports it.
- Same region shows merge scar tissue: `removeBudget` is declared **inside** the `budgetRows.map()` callback (**Budgets.jsx:231–243**) with broken indentation — works by accident, unreviewable. Lift it to component scope during the fix.

### P0-2 · FX preview lies forever on failure
- **`src/features/money/AddTransactionSheet.jsx:98–114, 205–216`** — on fetch error the catch sets `fxRate(null)` and the template then renders **“Fetching live rate…” indefinitely** (the ternary treats “no rate” as “loading”). Offline/API failure = permanent fake spinner text in a money-entry form.
- Fix: three states — loading / `1 USD ≈ ₹x` / “Rate unavailable — entry will be saved at today’s rate”.

### P0-3 · Currency symbol doesn’t follow the selected currency
- **`AddTransactionSheet.jsx:182`** — hardcodes `₹` beside the input while :192–203 lets the user pick USD/EUR/GBP/AED/SGD; **:189** `aria-label="Amount in rupees"` is wrong for every foreign entry. User types a USD amount against a ₹ glyph → wrong-order-of-magnitude entries are plausible and silent (display converts via snapshot, so feedback looks “fine”).
- Fix: symbol/label tracks `currency` (`$`, `€`, … or ISO code), label “Amount in {currency}”.

---

## P1 — major friction, a11y, and information-scent defects

### Contrast (light theme systematically under AA)
- **`src/index.css:21–22`** — `--muted #7d88a0` on `--base/--surface` ≈ **3.5:1** (needs 4.5:1); it carries subtitles, hints, list metadata app-wide. `--faint #a3adc2` ≈ **1.9:1** yet renders real content (dates, quick-link captions, chart ticks).
- **`Button.jsx:8–9`** — white on `--income #10b981` ≈ **2.2:1**, white on `--expense #f43f5e` ≈ **3.6:1** — both fail for their `sm` sizes.
- **`StatusBadge.jsx:17`**, **`Emi.jsx:135`** — 9–10px uppercase `text-faint` pills: double failure (size + contrast).

### Keyboard & SR gaps
- **`TxnRow.jsx:22–27`** — `Pressable as="div" role="button"` with **no `tabIndex`, no Enter/Space handler**: the whole transaction ledger (core loop) is unreachable by keyboard.
- **`BottomSheet.jsx:45–66`** & **`ConfirmSheet.jsx:31–39`** — declare `aria-modal` but never move focus in, trap it, or restore it; SR users stay on the page behind.
- **`Pressable.jsx`** adds no `focus-visible` ring; consumers mostly don’t either → invisible keyboard focus on chips, toggles, sheet close (**CategoryChip.jsx**, **ThemeToggle.jsx**, **BottomSheet.jsx:80–87**), and **`BottomNavDock.jsx:25–47`** NavLinks (hover color only).
- **`SegmentedControl.jsx:9–17`** — `role="tablist"/"tab"` with no `tabpanel`, no arrow-key navigation; semantics say “radio group”, so screen readers announce a broken tabs pattern.

### Reduced-motion holes
- **`CountUp.jsx:13–17`** — imperative `animate()` bypasses `MotionConfig reducedMotion="user"` (App.jsx:28): reduced-motion users still get 1.1 s of ticking numbers on every stat. Every sibling honors the preference (`ProgressBar.jsx:26`, `ProgressRing.jsx:19`, `BottomSheet.jsx:16`) — CountUp is the outlier.
- **`SpendChart.jsx:63–65`** — recharts bar animation not gated by `prefers-reduced-motion`.

### Information scent & IA
- **Budgets KPI mislabeled:** **`Budgets.jsx:209–211`** — headline reads “Total budgeted” but shows **total spent**; the limit is demoted to a sub-line. Wrong mental model on the screen whose job is limits.
- **Deep screens off the dock:** EMI/Budgets/Recurring exist only as dashboard quick links (**`BottomNavDock.jsx:4–11`**, **`Dashboard.jsx:132–136`**) — 2 taps + a scroll from anywhere else; Settings occupies a prime dock slot despite low frequency.
- **Transition tax + refetch flash:** `AnimatePresence mode="wait"` keyed remount (**`App.jsx:31–32`**, **`AppShell.jsx:32–38`**) serializes exit→enter (~0.5 s per nav) and every page refetches from scratch on mount (no cache/stale-while-revalidate) → skeleton flicker on every back-and-forth.
- **No forward-looking number:** Dashboard’s hero is retrospective (in/out/net, **Dashboard.jsx:180–217**); a daily-use money app never answers “what’s safe to spend today”.
- **Expenses filter wall:** search + type segment + chip row + sort segment stacked (**Expenses.jsx:135–160**) consume ~220 px before row one; the two adjacent SegmentedControls look identical (type vs sort) → mis-taps; no collapsed/active-filter state.

### Form UX (money entry)
- **`AddTransactionSheet.jsx:90–94`** — first category silently preselected; fast entries get miscategorized with zero signal. Consider explicit selection or last-used default surfaced visually.
- **`:185`** — amount sanitizer allows `1.2.3` → `parseFloat` yields 1.2 saved as ₹1.20 silently.
- **`:236–250`** — date+method `grid-cols-2` cramps native date pickers at 320 px; no quick-amount chips (+100/+500) on a keypad-first field.
- **No toast/snackbar layer exists** — async outcomes are silent; errors land as page-top `<p role=alert>` far from the thumb (e.g. **`Emi.jsx:64` → banner at :88–92**).

---

## P2 — consistency, polish, hygiene

1. **Header pattern split:** hand-rolled headers on Expenses (**:123**), Ledger (**:91**), Emi (**:76**) with `mb-4` vs shared `PageHeader` (`mb-5`) on Budgets/Recurring/Settings; Dashboard’s H1 is literally “This month” instead of the screen name (**Dashboard.jsx:178**) — no stable anchor while swiping.
2. **Micro-type sprawl:** ad-hoc `text-[9px]` (**Emi.jsx:135**), `[10px]` (**Ledger.jsx:192**, **StatusBadge.jsx:17**), `[11px]` (**DemoBanner.jsx:13**, **BottomNavDock.jsx:38**), `[13px]` (**Emi.jsx:142**) — sub-10 px text ships; no enforced scale.
3. **Spacing drift:** card padding `p-4` vs `p-5` vs `sm:p-5` (StatTile vs sections vs Ledger cards); vertical rhythm mt-3/4/5 chosen ad hoc per file.
4. **Formatting duplicated 4×:** local `formatRupees`/`fmtRupees`/`fmt` in **Expenses.jsx:43**, **Ledger.jsx:25**, **Emi.jsx:17**, **SettleSheet.jsx:61** ignore `lib/money.js:formatInr`; some force `maximumFractionDigits: 0`, others don’t → drifting money strings.
5. **Arrow semantics conflict:** Money-out = `ArrowUpRight` rose (**Dashboard.jsx:195**) but borrowed = `ArrowDownLeft` rose and lent = `ArrowUpRight` green (**Ledger.jsx:212–215**) — identical glyphs encode opposite flows on different screens.
6. **Raw machine dates:** **Ledger.jsx:32–35** renders `Overdue · 2026-08-20` / `Due 2026-08-30` while Dashboard/Recurring use humanized countdowns.
7. **Duplicate ThemeToggle:** `components/ThemeToggle.jsx` vs `components/ui/ThemeToggle.jsx` near-identical; DesignSystem imports the non-kit copy (**DesignSystem.jsx:6**).
8. **404 ships dev scaffolding:** **NotFound.jsx:5** → **Placeholder.jsx:34–38** prints “Coming in phase T3… data layer lands in T2” on every unknown URL.
9. **Dead CSS hook:** **Login.jsx:31** uses class `pressable` which exists nowhere in index.css (its own `active:scale` does the work).
10. **Error-state inconsistency:** plain red text, no retry, on Expenses (:162–166), Ledger (:127–131), Emi (:88–92) vs CloudOff+Retry EmptyState on Dashboard/Budgets/Recurring.
11. **Static theme-color:** manifest + meta pinned `#8B5CF6` (vite.config.js, index.html) — status-bar tint clashes in dark mode; `background_color` light-only.
12. **Render-blocking webfonts:** Google-hosted Inter/Outfit without preload/self-host (index.html:12–19) — offline-first PWA pays fallback flash on cold start; workbox preloads HTML/JS only.
13. **Tap targets below guidance:** CategoryChip ≈28 px tall (CategoryChip.jsx:17), dock labels ~40 px, h-8 icon buttons (Budgets/Settings rows) — under 44 px minimum.
14. **Colored-on-tint chips:** CategoryChip text uses raw palette hexes on 14 % tints (CategoryChip.jsx:20–23); Settings palette (Settings.jsx:25) unvetted — several combos land well under 3:1.
15. **DesignSystem page** exposed at `/design` in prod routes (App.jsx:51) with stale “phase T3” framing — gate or refresh it as the revamp source of truth.
16. **Dashboard fetches all transactions** just to slice five recent rows (Dashboard.jsx:52, 60) — fine on demo data, wasteful contract-wise; note for the revamp’s data-shape work.

---

## Cross-cutting themes for the revamp (summary)

| Theme | Evidence cluster |
|---|---|
| Trust bugs beat aesthetics | P0-1..3 — crash, lying loader, wrong currency glyph |
| One design language, not three | neu shadows + glass panels + brand glow coexist (index.css utilities, AppShell glow, GlassCard vs neu-card) |
| Semantic color is overexposed | every amount green/red (Amount default `colored`), arrows conflicting, badges amber |
| A11y was retrofitted, not systemic | contrast tokens, Pressable focus, CountUp motion, sheet focus mgmt |
| The kit isn’t enforced | 3 hand-rolled headers, 4 money formatters, 2 ThemeToggles, micro-type sprawl |
