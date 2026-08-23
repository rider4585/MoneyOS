import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import AddTransactionSheet from './AddTransactionSheet.jsx'

/**
 * AddTransactionProvider — app-wide handle to the add/edit-transaction sheet.
 * AppShell mounts the provider so the center FAB works on every screen; pages
 * use useAddTransaction() to open create (FAB parity) or edit (tap-to-edit).
 */

const AddTransactionContext = createContext(null)

export function AddTransactionProvider({ children }) {
  const [state, setState] = useState(null) // { prefill: txn|null }
  const savedCb = useRef(null)

  const openCreate = useCallback((onSaved) => {
    savedCb.current = typeof onSaved === 'function' ? onSaved : null
    setState({ prefill: null })
  }, [])

  const openEdit = useCallback((txn, onSaved) => {
    if (!txn) return
    savedCb.current = typeof onSaved === 'function' ? onSaved : null
    setState({ prefill: txn })
  }, [])

  const close = useCallback(() => setState(null), [])

  const handleSaved = useCallback(
    (saved, wasEdit) => {
      const cb = savedCb.current
      savedCb.current = null
      cb?.(saved, wasEdit)
      // Decoupled broadcast so open screens (e.g. the Expenses list) can
      // refresh even when the entry came from the global FAB.
      window.dispatchEvent(new CustomEvent('moneyos:transactions-changed'))
    },
    []
  )

  // Keep the last defined state while the sheet animates out so its fields
  // don't blank mid-exit.
  const lastDefined = useRef(null)
  if (state !== null) lastDefined.current = state

  const value = useMemo(() => ({ openCreate, openEdit }), [openCreate, openEdit])

  return (
    <AddTransactionContext.Provider value={value}>
      {children}
      <AddTransactionSheet
        open={state !== null}
        onClose={close}
        prefill={(state ?? lastDefined.current)?.prefill ?? null}
        onSaved={handleSaved}
      />
    </AddTransactionContext.Provider>
  )
}

export function useAddTransaction() {
  const ctx = useContext(AddTransactionContext)
  return ctx ?? { openCreate: () => {}, openEdit: () => {} }
}

export default AddTransactionProvider
