const TZ = 'Africa/Tunis'

const moneyFmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 })
export const formatDT = (n) => `${moneyFmt.format(Number(n) || 0)} DT`

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ })
const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TZ,
})
const longDayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })

export const formatDate = (d) => (d ? dateFmt.format(new Date(d)) : '')
export const formatDateTime = (d) => (d ? dateTimeFmt.format(new Date(d)) : '')
export const formatToday = () => {
  const s = longDayFmt.format(new Date())
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Même règle que public.normalize_phone() côté base. */
export function normalizePhone(input) {
  if (!input) return ''
  let v = String(input).trim().replace(/[^0-9+]/g, '')
  v = v.replace(/(?!^)\+/g, '')
  if (v.startsWith('00')) v = '+' + v.slice(2)
  if (/^\+216\d{8}$/.test(v)) v = v.slice(4)
  return v
}

export const isValidPhone = (v) => /^\+?\d{8,15}$/.test(normalizePhone(v))

/** "22345678" → "22 345 678" */
export function formatPhone(p) {
  if (!p) return ''
  if (/^\d{8}$/.test(p)) return `${p.slice(0, 2)} ${p.slice(2, 5)} ${p.slice(5)}`
  return p
}

/** Message d'erreur lisible à partir d'une erreur Supabase/PostgREST. */
export function errorMessage(error) {
  if (!error) return ''
  const code = error.code
  if (code === '23505') return 'Ce numéro de téléphone est déjà utilisé par un autre client.'
  if (code === '23514') return 'Une valeur saisie n’est pas valide. Vérifiez le nom et le téléphone.'
  if (code === '42501') return 'Accès refusé. Reconnectez-vous avec le compte administrateur.'
  if (code === 'P0002') return 'Client introuvable. Il a peut-être été supprimé.'
  if (error.message?.includes('Failed to fetch')) return 'Connexion impossible. Vérifiez votre accès internet puis réessayez.'
  if (error.message === 'Invalid login credentials') return 'E-mail ou mot de passe incorrect.'
  return error.message || 'Une erreur inattendue est survenue.'
}
