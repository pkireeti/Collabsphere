import { useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { Spinner } from './components/ui'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Explore from './pages/Explore'
import EventDetails from './pages/EventDetails'
import CreateEvent from './pages/CreateEvent'
import CheckIn from './pages/CheckIn'
import Admin from './pages/Admin'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'

function RequireAuth({ children, role }: { children: ReactNode; role?: 'admin' }) {
  const { user, loading } = useAuth()
  const loc = useLocation()

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="flex items-center gap-2.5 text-ink-soft">
          <Spinner className="h-5 w-5" />
          <span className="text-sm font-bold">Loading your workspace…</span>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  if (role === 'admin' && user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  const { pathname } = useLocation()

  // SPA navigation keeps the old scroll offset — snap back to the top
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/explore" element={<Explore />} />
      <Route path="/events/:id" element={<EventDetails />} />
      <Route path="/leaderboard" element={<Leaderboard />} />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/create"
        element={
          <RequireAuth>
            <CreateEvent />
          </RequireAuth>
        }
      />
      <Route
        path="/checkin"
        element={
          <RequireAuth>
            <CheckIn />
          </RequireAuth>
        }
      />
      <Route
        path="/events/:id/checkin"
        element={
          <RequireAuth>
            <CheckIn />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <Profile />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth role="admin">
            <Admin />
          </RequireAuth>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
