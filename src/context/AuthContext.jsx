import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadRole = useCallback(async (s) => {
    if (!s) {
      setIsAdmin(false)
      return
    }
    const { data, error } = await supabase.from('profiles').select('role').eq('id', s.user.id).maybeSingle()
    setIsAdmin(!error && data?.role === 'admin')
  }, [])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadRole(data.session)
      if (active) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      // Différé pour ne pas appeler Supabase à l'intérieur du callback.
      setTimeout(() => loadRole(s).finally(() => setLoading(false)), 0)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadRole])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
