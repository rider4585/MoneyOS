# MoneyOS Revamp — Questions for the Product Owner

_Section: AUDITOR QUESTIONS. Each question blocks a real design fork; my recommendation is the auditor's default if you answer only "go"._

## AUDITOR QUESTIONS

**Q1. Keep the neumorphism × glassmorphism DNA, or fresh start?**
The owner dislikes the current UI wholesale, but the revamp can still inherit its depth cue. Current code runs *three* surface systems at once (neu dual-shadows, frosted glass panels, brand glow backdrop) which is the main source of visual noise.
→ **Recommendation:** keep ONE system — soft matte surfaces with a single subtle shadow (neu DNA flattened ~60 %), reserve glass exclusively for overlays (sheets/nav dock). Kill the radial brand glow.

**Q2. Should dark mode be the default face of the product?**
Neumorphism survives contrast checks far better on dark (`--muted` passes AA there and fails in light). ThemeProvider already follows OS preference (ThemeProvider.jsx:11).
→ **Recommendation:** design dark-first as the canonical look; treat light as the port.

**Q3. Density: airy showcase cards or compact data lists?**
Cards are p-5 everywhere today; lists pay for it — Expenses shows ~4 rows per viewport.
→ **Recommendation:** two densities by context — compact rows (py-2.5) for lists/ledger/history, airy p-5 reserved for dashboard summaries and empty states.

**Q4. What is the #1 job — fast expense capture or monitoring?**
Determines everything: if capture dominates, the FAB flow deserves a full-screen modal with big keypad; if monitoring, Dashboard leads and capture stays a sheet.
→ **Recommendation:** capture-first (personal finance apps live or die by entry friction); upgrade Add to a full-screen route with one-tap amount chips and no preselected category ambiguity.

**Q5. Bottom-nav composition — what earns a slot?**
Today: Home · Expenses · FAB · Ledger · Settings (BottomNavDock.jsx). EMI/Budgets/Recurring ride only on Dashboard quick links.
→ **Recommendation:** Home · Expenses · [+FAB] · Ledger · Budgets; move EMI+Recurring into a combined "Commitments" hub reachable from Home, demote Settings to a header gear.

**Q6. Money color semantics — rainbow or restrained?**
Every amount renders green/red by default (Amount `colored` default true), arrows conflict across screens, badges add amber.
→ **Recommendation:** amounts in ink by default; color reserved strictly for deltas/trends/status. Green = incoming, red = outgoing, amber = attention — nothing else gets color.

**Q7. Animation personality — playful springs or calm utility?**
Current: 500-stiffness tap scales everywhere, 1.1 s count-ups, staggered list entrances, serialized page transitions (~0.5 s per nav).
→ **Recommendation:** calm base (150–200 ms fades, parallel page swaps), spring motion budgeted for exactly three moments: FAB press, sheet entrance, count-up on the hero number only.

**Q8. Number formatting preferences — paise, lakh/crore compact, grouping?**
Four ad-hoc formatters currently disagree (audit P2-4).
→ **Recommendation:** en-IN grouping always; compact ₹1.2L / ₹3.4Cr on tiles and charts; exact decimals only inside sheets/details; never show paise outside detail views.

**Q9. Multi-currency: first-class control or tucked-away power feature?**
Currency select sits inside the amount well next to a hardcoded ₹ (P0-3) though display is INR-only.
→ **Recommendation:** INR by default with a subtle "+ foreign currency" affordance; snapshot badge stays on affected rows. Fix the glyph bug regardless of direction.

**Q10. Destructive-action pattern — inline "Sure?" or dialog?**
Both exist: 3-second inline Sure? (Budgets/Recurring/Settings) vs ConfirmSheet dialog (transaction delete).
→ **Recommendation:** keep both but codify: dialog for irreversible financial data (transactions, ledger entries), inline Sure? for low-stakes config (categories, budgets, rules).

**Q11. Empty-state voice — coach-flavored or plain-functional?**
Copy today editorializes ("keep spending honest", "Quiet so far").
→ **Recommendation:** plain functional + exactly one CTA per empty state; personality lives in illustration/icon, not prose.

**Q12. Is the violet→indigo gradient part of the brand we're keeping?**
It appears as gradient buttons, gradient text, chart bars, progress fills, glow backdrop.
→ **Recommendation:** keep violet as the single accent hue, drop the gradient pair and all gradient text/glow usage; let semantic green/red own more of the palette once Q6 lands.

---

_Answer format that unblocks fastest: "Q1: B-ish, Q2: yes, …" — anything unanswered ships as the recommendation above._
