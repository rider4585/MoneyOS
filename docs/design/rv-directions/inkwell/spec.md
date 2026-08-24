# Direction 1 — INKWELL
### "The quiet ledger." Editorial minimalism for money.

Mood: calm · precise · trustworthy · timeless
References: Things 3 restraint, Stripe docs precision, Notion calm, classic double-entry ledgers, editorial print.

**One-line pitch:** Remove every decorative shadow; let typography, hairlines and one ink color carry the entire app. Money feels *kept*, not gamified.

---

## 1. Concept

The current UI's neumorphic dual-shadows and frosted glass fight the content. Inkwell inverts that: **flat paper surfaces + 1px hairlines + a single ink accent**. The hero amount is set in a serif display face (Fraunces) like a printed ledger line; everything else is quiet Inter. Color is rationed: deep green and vermilion appear only on money movement. Primary actions are ink-black buttons — no gradients anywhere.

## 2. Color tokens (light primary / dark secondary)

| Token | Light | Dark ("night ledger") | Usage |
|---|---|---|---|
| `--base` | `#F7F5F0` warm paper | `#131210` | app background |
| `--surface` | `#FFFFFF` | `#1B1A17` | cards, sheets |
| `--border` | `#E7E3D8` | `#2C2A24` | hairlines, input strokes |
| `--border-strong` | `#D8D3C4` | `#3A3830` | pressed/hover hairline |
| `--ink` | `#191817` | `#ECE8DF` cream | text, primary buttons |
| `--muted` | `#6E6A61` | `#99948A` | labels |
| `--faint` | `#A8A399` | `#6B675F` | captions, disabled |
| `--income` | `#1A7F5C` deep emerald ink | `#34B37E` | credit figures only |
| `--expense` | `#C2402A` vermilion | `#E5624A` | debit figures only |
| `--emi` | `#A16207` ochre | `#D9A03F` | EMI accents |
| `--brand` | `#191817` (= ink) | `#ECE8DF` (= cream) | primary actions are monochrome |

Rules: income/expense never tint backgrounds — they color *figures and 3px indicators only*. Brand gradient (`text-gradient-brand`, `bg-gradient-brand`) is retired. Focus rings are ink, 2px offset.

## 3. Typography

- Display/numerals: **Fraunces** (Google Fonts, opsz axis) 500–600 — hero balance, stat figures, page titles.
- UI/body: **Inter** 400–600 with `'tnum' 1, 'lnum' 1` on ALL amounts and tables.
- Scale: hero 30/36 Fraunces 600 · section label 12 Inter 600 caps tracking .08em muted · body 15 · caption 12.5 · list title 15/500, meta 13 muted.
- Amounts render as `+ ₹86,500.00` / `− ₹38,250` — sign always present in lists.

## 4. Surface & elevation

- Radius: cards 10px, inputs 10px, buttons 10px, chips full-round tags ok.
- Cards: `bg-surface` + 1px `--border`. NO shadow at rest.
- Floating layers only (dock, sheets, FAB): `0 12px 32px rgba(25,24,23,.10)` light / `0 16px 40px rgba(0,0,0,.5)` dark.
- Inputs: bordered boxes; focus = 2px ink outline offset 2px. `neu-inset` retired.
- Dividers: `hairline-t` stays but uses `--border`.

Utility mapping: `neu-card → card (flat bordered)`, `neu-raised-sm → none (use border-strong hover)`, `neu-inset/neu-well → field (bordered)`, `glass-panel → sheet (solid surface + float shadow)`.

## 5. Motion personality

Quiet mechanical: 160–220ms `cubic-bezier(.2,.7,.3,1)`. Fade + 4px rise on lists (40ms stagger). Presses dim to opacity .7 — **no scale bounce**. CountUp stays but eased-out gentle (no overshoot). Sheets slide 260ms. Reduced-motion honored globally as today.

## 6. Component mapping (src/components/ui)

| Component | New treatment |
|---|---|
| Button | Primary = ink fill, white text, r-10; Secondary = 1px border ghost; Danger = vermilion ghost. Press: opacity .7 |
| GlassCard → Card | flat surface + hairline |
| StatTile | label-caps row, Fraunces figure, delta as plain "+12% vs Jul" muted text |
| Amount | colored figure w/ fixed sign, tabular numerals |
| NeuInput / NeuSelect | Field: label above, bordered box, ink focus ring |
| CategoryChip | text tag + 6px category-hue dot (no fills) |
| ProgressBar | 3px track `--border`, ink fill; over-budget flips to vermilion |
| ProgressRing | 2px stroke ring, ink; % in Inter |
| SegmentedControl | underline tabs (2px ink underline slides), not pill |
| BottomSheet | solid surface, hairline handle, r-16 top |
| EmptyState | centered Fraunces sentence + hairline box illustration |
| SkeletonLoader | pulse of `--border` blocks, no shimmer sweep |
| CountUp | keep, easeOut 500ms, no spring |
| Pressable | opacity press |
| ThemeToggle | icon button, unchanged behavior |

Shell: BottomNavDock → white bar, top hairline, icon+label, active = ink + 3px dot under. FAB → 52px ink rounded-square (r-14), white plus, bottom-right, float shadow. SpendChart (recharts): 1.5px ink monotone line, dotted faint grid, no area fill, vermilion dot on max-spend day. DemoBanner: paper-yellow strip w/ hairline borders.

## 7. Screen highlights

- Dashboard: month selector as underline tab row; hero net amount Fraunces; In/Out as two-column hairline-separated stats; budget list rows with 3px bars; EMI due row with ochre dot.
- Expenses: dense table feel — date column groups with sticky caps headers, amounts right-aligned tabular.
- Add sheet: boxed fields, segmented entry-type as underline tabs.

## 8. PWA / brand

Icon: paper background, hairline border, Fraunces "M" ink monogram. Splash matches `--base`. No other brand assets change.

## 9. Risks & fit

- Serif numerals less conventional — mitigated: Inter carries all dense/list numerals.
- Restraint can read plain if human expects "wow" — this direction wins on longevity and trust.
- Least work of the three: mostly token + shadow removal, then font swap.

## 10. Token draft (drop-in for src/index.css)

```css
:root {
  --base:#F7F5F0; --surface:#FFFFFF;
  --border:#E7E3D8; --border-strong:#D8D3C4;
  --ink:#191817; --muted:#6E6A61; --faint:#A8A399;
  --income:#1A7F5C; --expense:#C2402A; --emi:#A16207;
  --brand:#191817; --brand-to:#191817;
  --float-shadow:0 12px 32px rgba(25,24,23,.10);
}
.dark {
  --base:#131210; --surface:#1B1A17;
  --border:#2C2A24; --border-strong:#3A3830;
  --ink:#ECE8DF; --muted:#99948A; --faint:#6B675F;
  --income:#34B37E; --expense:#E5624A; --emi:#D9A03F;
  --brand:#ECE8DF; --brand-to:#ECE8DF;
  --float-shadow:0 16px 40px rgba(0,0,0,.5);
}
```
