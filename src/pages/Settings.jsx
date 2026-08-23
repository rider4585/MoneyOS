import { Settings as SettingsIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import Placeholder from '../components/Placeholder.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'

export default function Settings() {
  return (
    <Placeholder
      icon={SettingsIcon}
      title="Settings"
      subtitle="Theme, category management and currency preferences."
    >
      <div className="neu-card mt-4 flex items-center justify-between rounded-3xl bg-surface p-5">
        <div>
          <p className="font-medium">Appearance</p>
          <p className="text-sm text-muted">Neumorphic light / dark slate</p>
        </div>
        <ThemeToggle />
      </div>

      <Link
        to="/design"
        className="neu-raised-sm mt-4 inline-flex items-center gap-2 rounded-2xl bg-surface px-5 py-3 text-sm font-semibold text-brand dark:text-violet-300"
      >
        Open the design-system gallery →
      </Link>
    </Placeholder>
  )
}
