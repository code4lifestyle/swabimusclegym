import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))

function RequireAdmin({ children }) {
  const { user, ready } = useAuth()
  if (!ready) return <div className="splash">Opening the desk…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAdmin>
            <Suspense fallback={<div className="splash">Opening the desk…</div>}>
              <DashboardPage />
            </Suspense>
          </RequireAdmin>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
