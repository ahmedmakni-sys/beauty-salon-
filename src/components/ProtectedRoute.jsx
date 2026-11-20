import { Navigate, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { LoadingBlock } from './ui'

export default function ProtectedRoute({ children }) {
  const { session, isAdmin, loading, signOut, user } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingBlock label="Vérification de la session…" />
      </div>
    )
  }
  if (!session) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />

  if (!isAdmin) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="panel max-w-md p-8 text-center">
          <ShieldAlert className="mx-auto size-8 text-rust" aria-hidden />
          <h1 className="mt-4 text-2xl">Accès réservé à l’administrateur</h1>
          <p className="mt-3 text-smoke">
            Le compte {user?.email} est connecté mais n’a pas le rôle administrateur. Exécutez le script
            <code className="mx-1 text-brass-bright">supabase/create_admin.sql</code>
            pour ce compte, puis reconnectez-vous.
          </p>
          <button className="btn btn-ghost mt-6" onClick={signOut}>
            Se déconnecter
          </button>
        </div>
      </div>
    )
  }
  return children
}
