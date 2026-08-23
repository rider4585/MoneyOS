import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, CalendarClock, Palette } from 'lucide-react'
import Placeholder from '../components/Placeholder.jsx'
import Pressable from '../components/ui/Pressable.jsx'
import CountUp from '../components/ui/CountUp.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'

const accents = [
  { name: 'income', label: 'Income · emerald', cls: 'bg-income' },
  { name: 'expense', label: 'Expense · rose', cls: 'bg-expense' },
  { name: 'emi', label: 'EMI · amber', cls: 'bg-emi' },
  { name: 'brand', label: 'Brand · violet', cls: 'bg-brand' },
]

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}
const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } },
}

function Section({ title, children }) {
  return (
    <motion.section variants={rise} className="space-y-3">
      <h2 className="font-display text-xs font-bold tracking-[0.18em] text-faint uppercase">
        {title}
      </h2>
      {children}
    </motion.section>
  )
}

/** Gallery proving every design token from board.md §Design language. */
export default function DesignSystem() {
  return (
    <Placeholder
      icon={Palette}
      title="Design tokens"
      subtitle="Live proof of every token in the neumorphism × glassmorphism layer."
    >
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
        <Section title="Typography — Outfit display / Inter UI">
          <div className="neu-card space-y-2 rounded-3xl bg-surface p-5">
            <p className="font-display text-xl font-bold">Outfit — headings &amp; display</p>
            <p className="text-sm text-muted">
              Inter — body copy, labels and controls at every size.
            </p>
            <p className="text-lg font-semibold">
              <CountUp value={1234567} format={(n) => `₹${n.toLocaleString('en-IN')}`} />
              <span className="ml-2 text-xs font-normal text-faint">
                tabular numerals + count-up
              </span>
            </p>
          </div>
        </Section>

        <Section title="Accents">
          <div className="grid grid-cols-2 gap-3">
            {accents.map((a) => (
              <div key={a.name} className={`neu-raised-sm rounded-2xl ${a.cls} p-4`}>
                <p className="text-sm font-semibold text-white drop-shadow">{a.label}</p>
                <p className="mt-1 text-[11px] font-medium text-white/80 uppercase">{a.name}</p>
              </div>
            ))}
          </div>
          <div className="bg-gradient-brand neu-card grid h-16 place-items-center rounded-3xl">
            <p className="font-display font-semibold text-white">brand gradient violet → indigo</p>
          </div>
        </Section>

        <Section title="Neumorphism — raised / inset / well">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="neu-card rounded-3xl bg-surface p-5">
              <p className="font-semibold">neu-card</p>
              <p className="mt-1 text-sm text-muted">8px/16px dual shadow on base.</p>
            </div>
            <Pressable className="neu-raised-sm rounded-3xl bg-surface p-5 text-left">
              <p className="font-semibold">neu-raised-sm + tap me</p>
              <p className="mt-1 text-sm text-muted">Spring scale micro-feedback.</p>
            </Pressable>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-muted">neu-inset input</span>
            <input
              type="text"
              placeholder="Amount in ₹…"
              className="neu-inset w-full rounded-2xl bg-base px-4 py-3 text-sm outline-none placeholder:text-faint focus:ring-2 focus:ring-brand/50"
            />
          </label>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm text-muted">
              <span>Budget · Food</span>
              <span className="tabular-nums">₹6,400 / ₹8,000</span>
            </div>
            <div className="neu-well h-4 overflow-hidden rounded-full bg-base">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '80%' }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-brand"
              />
            </div>
          </div>
        </Section>

        <Section title="Glassmorphism — frosted overlay">
          <div
            aria-hidden
            className="relative h-32 overflow-hidden rounded-3xl"
            style={{
              background:
                'linear-gradient(120deg, var(--income), var(--emi) 45%, var(--expense) 80%)',
            }}
          >
            <motion.span
              animate={{ x: [-20, 40, -20] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-6 left-8 h-16 w-16 rounded-full bg-white/40 blur-md"
            />
            <div className="glass-panel absolute inset-x-6 top-1/2 flex -translate-y-1/2 items-center justify-between rounded-2xl px-4 py-3">
              <p className="text-sm font-semibold">glass-panel · blur(14px)</p>
              <CalendarClock size={18} className="opacity-70" />
            </div>
          </div>
        </Section>

        <Section title="Motion & theme">
          <div className="neu-card space-y-4 rounded-3xl bg-surface p-5">
            <ul className="space-y-1.5 text-sm text-muted">
              <li className="flex items-center gap-2">
                <ArrowUpRight size={15} className="text-income" /> spring press on every control
              </li>
              <li className="flex items-center gap-2">
                <ArrowDownLeft size={15} className="text-expense" /> staggered list entrances
              </li>
              <li>count-up amounts · screen transitions · prefers-reduced-motion honoured</li>
            </ul>
            <div className="hairline-t flex items-center justify-between pt-4">
              <p className="text-sm font-medium">Dark variant</p>
              <ThemeToggle />
            </div>
          </div>
        </Section>
      </motion.div>
    </Placeholder>
  )
}
