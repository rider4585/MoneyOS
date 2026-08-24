# Direction 2 — PULSE
### "Money at full wattage." Dark-first premium fintech.

Mood: confident · electric · data-forward · premium night mode
References: Copilot Money, Revolut, Linear, Arc dark UI.

**One-line pitch:** A rich near-black canvas where numbers GLOW — oversized Space Grotesk balances, luminous mint/coral semantics, a floating glass dock and a gradient orb FAB. Feels like the cockpit of your money.

---

## 1. Concept

Pulse leans INTO an app-like, high-production feel: deep blue-charcoal surfaces with hairline white-alpha borders, one aurora glow behind the hero, gradient accents used sparingly but confidently. Data hierarchy is aggressive: 40px hero numerals, uppercase micro-labels, delta pills. It keeps the app's violet brand DNA but electrifies it (periwinkle→violet). Light theme is fully supported as a first-class secondary (cool gray), but dark is the default identity.

## 2. Color tokens (dark primary / light secondary)

| Token | Dark (default) | Light | Usage |
|---|---|---|---|
| `--base` | `#0A0D13` | `#EEF1F6` | app background |
| `--surface` | `#10141C` | `#FFFFFF` | cards |
| `--surface-raised` | `#161C26` | `#FFFFFF` | sheets, dock |
| `--border` | `rgba(255,255,255,.07)` | `#E3E8F0` | hairlines |
| `--border-strong` | `rgba(255,255,255,.14)` | `#CBD4E1` | hover/pressed |
| `--ink` | `#EDF1F7` | `#10141C` | text |
| `--muted` | `#8A94A6` | `#5C6779` | labels |
| `--faint` | `#55607080` → use `#556070` | `#9AA5B5` | captions |
| `--income` | `#3DDC97` mint | `#0FA36B` | credit + glow |
| `--expense` | `#FF6B81` coral | `#E4405F` | debit + glow |
| `--emi` | `#FFB454` amber | `#D98A1F` | EMI accents |
| `--brand` | `#6C8CFF` periwinkle | `#4F6BED` | primary actions |
| `--brand-to` | `#A78BFA` violet | `#7C5CE8` | gradient end |
| `--aurora` | radial brand @12% blur behind hero | same @10% | hero backdrop |

Rules: every semantic color has a paired glow (`color-mix(in srgb, var(--income) 35%, transparent)`) used ONLY on rings/fills/FAB — never on text. Over-budget states pulse once then rest at solid coral. Contrast: all body text ≥ AA on both themes; glows are decorative only (`aria-hidden`).

## 3. Typography

- Display/numerals: **Space Grotesk** 600–700 — hero balance 40px tracking −0.02em, stat figures 20px.
- UI/body: **Inter** 400–600.
- Micro-labels: 11px Inter 600 UPPERCASE +0.12em in muted — "MONEY IN", "BUDGETS", etc. This label system is a signature of the direction.
- All amounts tabular (`tnum`). Deltas as pills: `+12%` mint-on-mint-glow / `−8%` coral-on-coral-glow.

## 4. Surface & elevation

- Radius: cards 18px, inputs 14px, buttons 14px (pill for chips only).
- Card recipe: `background: var(--surface); border: 1px solid var(--border); box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 16px 40px rgba(0,0,0,.45)` (light theme: single soft shadow, no inset highlight).
- One aurora per screen max (behind Dashboard hero). No glass blur on content cards; blur reserved for dock + sheets (`backdrop-filter: blur(20px)`).
- Inputs: filled `#0D1119`, borderless at rest → 1px brand ring on focus.
- Utility mapping: `neu-card → panel`, `glass-panel → dock/sheet (blur 20)`, `neu-inset → field-filled`, `text-gradient-brand → stays (re-tuned to new hues)`, `bg-gradient-brand → primary button + FAB`.

## 5. Motion personality

Smooth electric: framer-motion springs `stiffness 320, damping 26`; press scale 0.97; CountUp ON by default on money figures (700ms); skeleton = shimmer sweep; nav active indicator is a sliding pill (`layoutId`); overdue EMI badge pulses gently (2 iterations, respects reduced-motion). Screen transitions: fade+scale .98→1, 240ms.

## 6. Component mapping (src/components/ui)

| Component | New treatment |
|---|---|
| Button | Primary = brand gradient + glow shadow; Secondary = surface + border; Danger = expense solid |
| GlassCard → Panel | raised surface, hairline, layered shadow |
| StatTile | figure + delta pill + optional sparkline slot |
| Amount | colored figures w/ lucide arrow glyphs |
| NeuInput/NeuSelect → Field | filled field, floating label, brand focus ring |
| CategoryChip | translucent tinted pill (18% color-mix bg, colored text, lucide icon) |
| ProgressBar | 6px rounded track, gradient fill w/ soft end-glow |
| ProgressRing | gradient stroke arc + % center, subtle drop-glow |
| SegmentedControl | dark track, sliding lighter thumb (spring) |
| BottomSheet | blurred glass sheet, drag handle, r-24 top |
| EmptyState | dashed-border panel, constellation SVG, one-liner copy |
| SkeletonLoader | shimmer sweep blocks |
| CountUp | default-on, easeOut 700ms |
| Pressable | scale .97 spring |
| ThemeToggle | unchanged behavior |

Shell: BottomNavDock → **floating detached dock** (inset-x 16px, bottom 12px, r-22, blur glass, border) with sliding active pill. FAB → 60px gradient orb overlapping dock's right edge, glow shadow, morphs to ✕ when sheet opens. SpendChart: 2px brand line with gradient area fill (brand 24%→0%), dotted horizontal gridlines faint, dark-glass tooltip. DemoBanner: slim brand-tinted strip above header.

## 7. Screen highlights

- Dashboard: aurora hero block (net balance + delta pills + mini sparkline row), then panels: Daily spend chart, Budgets (glow bars), Upcoming EMI card w/ countdown chip, Recent list with icon squircles.
- Expenses: search field filled style, filter chips tinted, sticky month total bar.
- Login: full-bleed aurora + centered logo mark — this is the marketing shot of the app.

## 8. PWA / brand

Icon: near-black rounded square, gradient orb + white "M" mark; maskable-safe. Splash = base + orb. Theme-color meta flips to `#0A0D13`.

## 9. Risks & fit

- Glow/gradient discipline required or it tips into kitsch — codified above (one aurora, glows on non-text only).
- OLED/battery friendly; dark-first may not suit bright-sunlight readers → complete light theme shipped simultaneously.
- Medium effort: token rebuild + every component restyle + recharts theming.

## 10. Token draft (drop-in for src/index.css)

```css
:root {
  --base:#EEF1F6; --surface:#FFFFFF; --surface-raised:#FFFFFF;
  --border:#E3E8F0; --border-strong:#CBD4E1;
  --ink:#10141C; --muted:#5C6779; --faint:#9AA5B5;
  --income:#0FA36B; --expense:#E4405F; --emi:#D98A1F;
  --brand:#4F6BED; --brand-to:#7C5CE8;
}
.dark {
  --base:#0A0D13; --surface:#10141C; --surface-raised:#161C26;
  --border:rgba(255,255,255,.07); --border-strong:rgba(255,255,255,.14);
  --ink:#EDF1F7; --muted:#8A94A6; --faint:#556070;
  --income:#3DDC97; --expense:#FF6B81; --emi:#FFB454;
  --brand:#6C8CFF; --brand-to:#A78BFA;
}
```
