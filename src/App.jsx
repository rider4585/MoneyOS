import { AnimatePresence, MotionConfig } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import ThemeProvider from './theme/ThemeProvider.jsx'
import AppShell from './components/AppShell.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import ProtectedRoute from './context/ProtectedRoute.jsx'
import { PwaInstallProvider } from './pwa/index.js'
import repository from './data/index.js'
import Dashboard from './pages/Dashboard.jsx'
import Expenses from './pages/Expenses.jsx'
import Ledger from './pages/Ledger.jsx'
import Commitments from './pages/Commitments.jsx'
import AddTransactionPage from './pages/AddTransactionPage.jsx'
import Budgets from './pages/Budgets.jsx'
import Settings from './pages/Settings.jsx'
import DesignSystem from './pages/DesignSystem.jsx'
import Login from './pages/Login.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  const location = useLocation()

  useEffect(() => {
    repository.init().catch((err) => console.error('[data-layer] init failed', err))
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <AuthProvider>
          <PwaInstallProvider>
            <AnimatePresence mode="wait" initial={false}>
              <Routes location={location} key={location.pathname}>
                <Route
                  path="/login"
                  element={<Login />}
                />
                <Route
                  element={
                    <ProtectedRoute>
                      <AppShell />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="expenses" element={<Expenses />} />
                  <Route path="ledger" element={<Ledger />} />
                  {/* legacy routes — EMI + Recurring now live in the Commitments hub */}
                  <Route path="emi" element={<Navigate to="/commitments" replace />} />
                  <Route
                    path="recurring"
                    element={<Navigate to="/commitments?tab=recurring" replace />}
                  />
                  <Route path="commitments" element={<Commitments />} />
                  <Route path="add" element={<AddTransactionPage />} />
                  <Route path="budgets" element={<Budgets />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="design" element={<DesignSystem />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </AnimatePresence>
          </PwaInstallProvider>
        </AuthProvider>
      </ThemeProvider>
    </MotionConfig>
  )
}
