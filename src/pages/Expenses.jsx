import { ReceiptText } from 'lucide-react'
import Placeholder from '../components/Placeholder.jsx'

export default function Expenses() {
  return (
    <Placeholder
      icon={ReceiptText}
      title="Expenses"
      subtitle="List, filter and search every spend; quick add via the FAB."
    />
  )
}
