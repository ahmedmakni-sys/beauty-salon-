import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes('votre-projet') && !anonKey.includes('votre-cle'),
)

// Clé "anon" publique uniquement. La sécurité repose sur les règles RLS
// et les fonctions SQL, pas sur le secret de cette clé.
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null
