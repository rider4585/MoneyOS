import { ArrowLeftRight } from 'lucide-react'
import Placeholder from '../components/Placeholder.jsx'

export default function Ledger() {
  return (
    <Placeholder
      icon={ArrowLeftRight}
      title="Borrow / Lent"
      subtitle="Counterparties, running balances, partial or full settlements."
    />
  )
}
