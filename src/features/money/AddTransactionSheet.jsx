import { BottomSheet } from '../../components/ui/index.js'
import TransactionForm from './TransactionForm.jsx'

/**
 * AddTransactionSheet — bottom-sheet presentation of the shared
 * TransactionForm (create via FAB / inline buttons, edit via tap-to-edit).
 * The capture-first full-screen add flow lives in src/pages/AddTransactionPage
 * and reuses the very same form.
 */
export default function AddTransactionSheet({ open, onClose, prefill = null, onSaved }) {
  const editing = Boolean(prefill)
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={editing ? 'Edit transaction' : 'Add transaction'}
      subtitle={editing ? 'Update or remove this entry' : 'Every amount is stored in paise and shown in INR'}
      bodyClassName="space-y-4"
    >
      <TransactionForm prefill={prefill} onSaved={onSaved} onClose={onClose} variant="sheet" />
    </BottomSheet>
  )
}
