import { AnimatePresence, MotionConfig } from 'framer-motion'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import ThemeProvider from './theme/ThemeProvider.jsx'
import AppShell from './components/AppShell.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import ProtectedRoute from './context/ProtectedRoute.jsx'
import repository from './data/index.js'
import Dashboard from './pages/Dashboard.jsx'
import Expenses from './pages/Expenses.jsx'
import Ledger from './pages/Ledger.jsx'
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
                <Route path="settings" element={<Settings />} />
                <Route path="design" element={<DesignSystem />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </AnimatePresence>
        </AuthProvider>
      </ThemeProvider>
    </MotionConfig>
  )
}
