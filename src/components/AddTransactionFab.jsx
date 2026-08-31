import { Plus } from 'lucide-react'
import Pressable from './ui/Pressable.jsx'

/**
 * Add-transaction FAB — Pulse gradient orb (pulse §6): 60px, brand gradient,
 * glow shadow. Sits centred above the tab dock; opens the capture-first
 * full-screen add route.
 */
export default function AddTransactionFab({ onOpen }) {
  return (
    <Pressable
      type="button"
      onClick={onOpen}
      aria-label="Add transaction"
      className="bg-gradient-brand fixed bottom-7 left-1/2 z-50 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full text-white shadow-[0_12px_30px_-6px_var(--glow-brand)] transition-transform active:scale-[0.97]"
    >
      <Plus size={28} strokeWidth={2.4} />
    </Pressable>
  )
}
