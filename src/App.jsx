import { AnimatePresence, MotionConfig } from 'framer-motion'
import { Route, Routes, useLocation } from 'react-router-dom'
import ThemeProvider from './theme/ThemeProvider.jsx'
import AppShell from './components/AppShell.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Expenses from './pages/Expenses.jsx'
import Ledger from './pages/Ledger.jsx'
import Settings from './pages/Settings.jsx'
import DesignSystem from './pages/DesignSystem.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  const location = useLocation()

  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route element={<AppShell />}>
              <Route index element={<Dashboard />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="ledger" element={<Ledger />} />
              <Route path="settings" element={<Settings />} />
              <Route path="design" element={<DesignSystem />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AnimatePresence>
      </ThemeProvider>
    </MotionConfig>
  )
}
