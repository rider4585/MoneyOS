import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import TransactionForm from '../features/money/TransactionForm.jsx'

/**
 * AddTransactionPage — capture-first full-screen add flow. The route path is
 * /add and it is opened by the center FAB (and any "charge" affordance). It
 * reuses the shared TransactionForm (big centred amount, one-tap quick-amount
 * chips, prominent expense/income toggle) in variant="full"; the multi-currency
 * select, fx loading/ready/failed+retry states, category chips, date/note/
 * method and the repository contract are identical to the bottom-sheet flow.
 */
export default function AddTransactionPage() {
  const navigate = useNavigate()

  function handleSaved() {
    // After a successful save return to where the user came from (or home).
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  return (
    <section aria-label="Add transaction" className="mx-auto w-full max-w-md pb-10">
      <div className="mb-4 flex items-center justify-end">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Cancel"
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-border-strong hover:text-ink"
        >
          <X size={18} strokeWidth={1.9} />
        </button>
      </div>
      <TransactionForm onSaved={handleSaved} onClose={handleSaved} variant="full" />
    </section>
  )
}
