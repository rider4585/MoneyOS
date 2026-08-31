import { SegmentedControl } from '../components/ui/index.js'
import PageHeader from '../features/plan/PageHeader.jsx'
import Emi from './Emi.jsx'
import Recurring from './Recurring.jsx'
import { useSearchParams } from 'react-router-dom'

const TABS = [
  { value: 'emi', label: 'EMIs' },
  { value: 'recurring', label: 'Recurring' },
]

/**
 * Commitments — single hub for everything with a future date: loan EMIs and
 * recurring rules. Reuses the existing EMI and Recurring screens verbatim
 * under a tab switcher; deep links land on the right tab via ?tab=
 * (legacy /emi and /recurring routes redirect here).
 */
export default function Commitments() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const tab = TABS.some((t) => t.value === rawTab) ? rawTab : 'emi'

  function switchTab(next) {
    // Keep the tab in the URL so back/forward and shared links restore it.
    const params = new URLSearchParams(searchParams)
    if (next === 'emi') params.delete('tab')
    else params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  return (
    <section aria-label="Commitments">
      <PageHeader title="Commitments" subtitle="EMIs and recurring money, one place" />
      <SegmentedControl options={TABS} value={tab} onChange={switchTab} />
      <div className="mt-5">
        {tab === 'recurring' ? <Recurring /> : <Emi />}
      </div>
    </section>
  )
}
