# R0 — UX Revamp: Three Art Directions
_art-director · 2026-08-24 · for human review via god_

The owner rejected v0.1.0's neumorphism × glassmorphism look wholesale. These three directions are **deliberately far apart** so the choice is a real fork, not a shade difference. All three keep the frozen stack (Vite+React JS+Tailwind v4+framer-motion+lucide+recharts), the repository contract, INR minor-unit semantics, mobile-first shell (bottom dock + FAB), and reduced-motion/a11y duties. Only the visual + motion system changes.

**How to review:** open each `preview.html` in a browser (self-contained; Google Fonts loads if online, falls back gracefully). Each shows 1–2 phone mockups of a realistic Dashboard plus a type/palette/controls/motion system sheet. Full specs in each folder's `spec.md`, incl. drop-in token drafts.

## The three directions

| | **Inkwell** | **Pulse** | **Meadow** |
|---|---|---|---|
| Feeling | calm ledger, print-like | premium night cockpit | friendly companion |
| Theme priority | light-first (warm paper) | **dark-first**, full light secondary | light-first, warm dark secondary |
| Signature | hairlines + serif (Fraunces) numerals, zero shadows | glow accents, Space Grotesk hero numerals, floating glass dock, gradient orb FAB | big radii (22px), pastel chips/tiles, chunky springy bars |
| Brand color | none — ink monochrome actions | periwinkle→violet gradient (keeps violet DNA) | deep teal→mint gradient |
| Motion | quiet fades, opacity press, no bounce | springs, count-up everywhere, sliding dock pill | bouncy springs, squish press, playful micro-copy |
| Fonts added | Fraunces + Inter (Inter kept) | Space Grotesk + Inter (kept) | Plus Jakarta Sans only |
| Risk | may feel plain to someone wanting "wow" | glow discipline required; dark-first preference needed | can read young if pastels leak into data |
| Effort | lowest | medium | medium-high |

Folders: [`inkwell/`](inkwell/) · [`pulse/`](pulse/) · [`meadow/`](meadow/)

## Art-director's lean

If the owner wants the app to feel like a serious modern product → **Pulse** (closest to what people picture when they say "fintech that looks expensive"; keeps violet brand continuity). If the complaint was more "cluttered/dated" than "not flashy" → **Inkwell** is the safest long-term bet and cheapest rebuild. A credible blend also exists: **Pulse surfaces + Inkwell restraint** (dark-first, but hairline flat cards instead of glows) — say the word and I'll spec it.

## Questions consolidated for the owner (answer once)

1. **Which direction** — Inkwell / Pulse / Meadow / blend? (previews are the fastest way to feel them)
2. **Daily-driver theme**: light-first, or dark-first?
3. What annoyed you most about v0.1.0 — the grey plastic look, the shadows, the colors, the density, or just overall vibe?
4. Any apps whose money UI you love/hate (Monzo, Copilot, Revolut, CRED, Walnut…)?
5. Personality check: should MoneyOS feel *calm & timeless*, *premium & electric*, or *warm & encouraging*?
6. Keep the violet brand identity, or open to rebranding the accent (ink / electric indigo / teal)?
7. Density: roomier screens with fewer items, or data-dense lists?
8. PWA icon refresh OK if the chosen direction changes brand assets?

Answers gate R1 (design-system rebuild). Until then no production code is touched.
