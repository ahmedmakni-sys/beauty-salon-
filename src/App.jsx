import { Navigate, Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured } from './lib/supabase'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import SetupRequired from './components/SetupRequired'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import CustomerNew from './pages/CustomerNew'
import CustomerEdit from './pages/CustomerEdit'
import CustomerDetails from './pages/CustomerDetails'
import RegisterVisit from './pages/RegisterVisit'
import Visits from './pages/Visits'
import Rewards from './pages/Rewards'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import ClientCard from './pages/ClientCard'

function LoginRoute() {
  const { session, loading } = useAuth()
  if (!loading && session) return <Navigate to="/" replace />
  return <Login />
}

export default function App() {
  if (!isSupabaseConfigured) return <SetupRequired />

  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/connexion" element={<LoginRoute />} />
          <Route path="/carte/:token" element={<ClientCard />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="clients" element={<Customers />} />
            <Route path="clients/nouveau" element={<CustomerNew />} />
            <Route path="clients/:id" element={<CustomerDetails />} />
            <Route path="clients/:id/modifier" element={<CustomerEdit />} />
            <Route path="visites/nouvelle" element={<RegisterVisit />} />
            <Route path="visites" element={<Visits />} />
            <Route path="recompenses" element={<Rewards />} />
            <Route path="parametres" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
