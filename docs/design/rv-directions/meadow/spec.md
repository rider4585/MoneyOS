# Direction 3 — MEADOW
### "Friendly money, zero jitters." Soft, warm, human.

Mood: optimistic · approachable · rounded · encouraging
References: Monzo, Headspace, Duolingo warmth (tempered), Cash App boldness softened.

**One-line pitch:** Airy sage-tinted light theme with big white rounded cards, pastel category chips and chunky springy progress — a money app that feels like a supportive friend, not a bank terminal.

---

## 1. Concept

Money anxiety is a design problem. Meadow answers with warmth: off-white green-tinted base, generous 22px radii, one soft diffuse shadow per card (never the dual-direction neumorphic pair), pastel-filled category pills, and playful-but-controlled spring motion. The brand hue moves to deep teal with a teal→green gradient reserved for primary actions and the FAB. Encouraging copy patterns ("You're 70% through your food budget — nice pace") replace neutral labels where space allows.

## 2. Color tokens (light primary / dark secondary)

| Token | Light (default) | Dark | Usage |
|---|---|---|---|
| `--base` | `#F4F7F2` sage air | `#101915` green-charcoal | app background |
| `--surface` | `#FFFFFF` | `#18231D` | cards, sheets |
| `--border` | `#E3EBE2` | `#26332B` | subtle strokes |
| `--ink` | `#17251C` green-black | `#E9F2EA` | text |
| `--muted` | `#5F6F64` | `#9DB0A2` | secondary text |
| `--faint` | `#93A397` | `#5F7266` | captions |
| `--income` | `#16A34A` | `#4ADE80` | credit |
| `--expense` | `#E5484D` | `#F87171` | debit |
| `--emi` | `#EE9D2B` honey | `#FBBF24` | EMI |
| `--brand` | `#0D9488` deep teal | `#2DD4BF` | primary actions |
| `--brand-to` | `#34D399` mint | `#4ADE80` | gradient end |

Category pastels (chips/tiles only): sage `#DCF0E1`, peach `#FFE8D9`, sky `#DBEDF5`, lilac `#EDE4F7`, butter `#FCF3CF` — each paired w/ darker same-hue text (`#1B7A4B`, `#C2541A`, `#23698C`, `#7A5BA8`, `#9C7A12`). Dark mode: same hues at 14% alpha over surface.

## 3. Typography

- Single family: **Plus Jakarta Sans** (Google Fonts) — 800 for hero numerals, 700 headings, 500/600 UI.
- Hero 32px/800 tracking −0.02em; section titles 17/700; body 15/400–500; caption 12.5 muted.
- Amounts tabular; friendly sign style: colored ▲/▼ or +/− with full en-IN grouping.

## 4. Surface & elevation

- Radius: cards 22px, buttons pill (999px), inputs 14px, sheets r-28 top corners.
- Card shadow (the ONLY shadow recipe): `0 6px 18px rgba(23,37,28,.08)`; hover raise to `.12`. Pressed cards flatten (shadow→none + bg tint).
- No gradients on surfaces except primary button/FAB (teal→mint). Glass blur retired entirely; dock is solid white with soft top shadow.
- Inputs: filled `#EFF4EE` borderless; focus = white bg + 2px brand ring.
- Utility mapping: `neu-card → soft-card`, `neu-inset → field-filled`, `glass-panel → sheet/dock (solid + soft shadow)`, gradients re-tuned.

## 5. Motion personality

Playful springs: framer-motion `stiffness 380, damping 22` (slight overshoot); press scale .94; list stagger 40ms; budget fill animates with springy draw; over-budget bar does ONE gentle shake then rests red; success actions pop a checkmark (scale .6→1.08→1); FAB rotates 45° into ✕ when sheet opens. Reduced-motion honored globally.

## 6. Component mapping (src/components/ui)

| Component | New treatment |
|---|---|
| Button | Primary = brand gradient pill w/ squish press; Secondary = white pill + border; Danger = expense tinted pill |
| GlassCard → SoftCard | white r-22 + single soft shadow |
| StatTile | pastel-tinted tile, icon in colored squircle, bold figure |
| Amount | bold figure, income green / ink for debits w/ small coral arrow |
| NeuInput/NeuSelect → Field | filled field + floating label, brand focus ring |
| CategoryChip | pastel-filled pill + lucide icon (signature element) |
| ProgressBar | chunky 10px rounded track `#E9F0E8`, springy fill; over = expense red |
| ProgressRing | thick 10px round-cap arc, rounded tips |
| SegmentedControl | white sliding thumb in `#E9F0E8` track, springy |
| BottomSheet | white sheet, big drag handle, r-28 top |
| EmptyState | blob-shape SVG illustration + warm two-line copy + CTA button |
| SkeletonLoader | soft pulse blocks (rounded-full ends) |
| CountUp | keep, slight overshoot easing |
| Pressable | scale .94 spring |
| ThemeToggle | unchanged |

Shell: BottomNavDock → white bar flush-bottom, active item = brand icon inside tinted squircle that pops on change; FAB → 62px teal→mint circle overlapping dock center-right, rotates to ✕. SpendChart: rounded-top bars (r-6) in brand-tint with today's bar solid brand; month total chip floats above chart. DemoBanner: butter-pastel strip with 🌱-style icon and rounded bottom.

## 7. Screen highlights

- Dashboard: greeting headline ("Good morning 👋" optional), hero net card w/ tiny sparkline, stat tiles as pastel pair, budgets as chunky bars w/ encouraging micro-copy under each, EMI card with amber squircle icon.
- Expenses: search as filled pill field, category filter row of pastel chips (horizontally scrollable), grouped list w/ day headers.
- Settings: rows as white cards w/ chevrons; theme picker as visual swatch cards.

## 8. PWA / brand

Icon: white rounded square, teal→mint blob shape behind bold "M". Splash = base + blob. Maskable icons regenerated at R3 if chosen.

## 9. Risks & fit

- Can read childish if pastels leak into data areas — rule above caps them to chips/tiles/icons.
- Rounded-heavy look needs consistent radius discipline (22/14/pill only).
- Medium-high effort: token rebuild, all components, plus copy tone pass (optional but high impact).

## 10. Token draft (drop-in for src/index.css)

```css
:root {
  --base:#F4F7F2; --surface:#FFFFFF;
  --border:#E3EBE2;
  --ink:#17251C; --muted:#5F6F64; --faint:#93A397;
  --income:#16A34A; --expense:#E5484D; --emi:#EE9D2B;
  --brand:#0D9488; --brand-to:#34D399;
  --soft-shadow:0 6px 18px rgba(23,37,28,.08);
}
.dark {
  --base:#101915; --surface:#18231D;
  --border:#26332B;
  --ink:#E9F2EA; --muted:#9DB0A2; --faint:#5F7266;
  --income:#4ADE80; --expense:#F87171; --emi:#FBBF24;
  --brand:#2DD4BF; --brand-to:#4ADE80;
  --soft-shadow:0 8px 22px rgba(0,0,0,.35);
}
```
