import { LayoutDashboard } from 'lucide-react'
import Placeholder from '../components/Placeholder.jsx'

export default function Dashboard() {
  return (
    <Placeholder
      icon={LayoutDashboard}
      title="Dashboard"
      subtitle="INR totals in/out/net, spend chart, budget bars and upcoming EMIs."
    />
  )
}
