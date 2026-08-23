import { Plus } from 'lucide-react'
import Pressable from './ui/Pressable.jsx'

/**
 * Add-transaction FAB — neumorphic raised circle floating above the tab dock.
 * Opens the placeholder glass sheet until the data layer lands (T2).
 */
export default function AddTransactionFab({ onOpen }) {
  return (
    <Pressable
      type="button"
      onClick={onOpen}
      aria-label="Add transaction"
      className="neu-card fixed bottom-7 left-1/2 z-50 grid h-16 w-16 -translate-x-1/2 place-items-center rounded-full bg-surface text-brand dark:text-violet-300"
    >
      <Plus size={30} strokeWidth={2.4} />
    </Pressable>
  )
}
