import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserPlus, Scissors, History, Gift, Settings, LogOut, Menu, X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import ConfirmDialog from './ConfirmDialog'

const NAV = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/visites/nouvelle', label: 'Enregistrer une visite', icon: Scissors },
  { to: '/clients', label: 'Clients', icon: Users, end: true },
  { to: '/clients/nouveau', label: 'Ajouter un client', icon: UserPlus },
  { to: '/visites', label: 'Historique des visites', icon: History, end: true },
  { to: '/recompenses', label: 'Récompenses', icon: Gift },
  { to: '/parametres', label: 'Paramètres', icon: Settings },
]

// Barre du bas sur mobile : les 4 actions les plus fréquentes.
const MOBILE_TABS = [NAV[0], NAV[1], NAV[2], NAV[4]]

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-full border-2 border-brass font-display text-lg text-brass-bright">
        B
      </span>
      <span className="leading-tight">
        <span className="block font-display text-xl">Beauty Salon</span>
        <span className="block text-xs text-smoke">Programme de fidélité</span>
      </span>
    </div>
  )
}

function NavItems({ onNavigate }) {
  return (
    <ul className="space-y-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-[0.9375rem] transition-colors ${
                isActive
                  ? 'bg-brass/12 font-semibold text-brass-bright shadow-[inset_2px_0_0_var(--color-brass)]'
                  : 'text-smoke hover:bg-panel-2 hover:text-marble'
              }`
            }
          >
            <Icon className="size-[1.125rem] shrink-0" aria-hidden />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const [drawer, setDrawer] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => setDrawer(false), [location.pathname])

  async function logout() {
    await signOut()
    navigate('/connexion', { replace: true })
  }

  const accountBlock = (
    <div className="border-t border-line pt-4">
      <p className="truncate px-3 text-sm text-smoke" title={user?.email}>
        {user?.email}
      </p>
      <button onClick={() => setConfirmLogout(true)} className="mt-2 flex w-full items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-smoke hover:bg-panel-2 hover:text-marble">
        <LogOut className="size-[1.125rem]" aria-hidden />
        Se déconnecter
      </button>
    </div>
  )

  return (
    <div className="min-h-dvh">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-md focus:bg-brass focus:px-3 focus:py-2 focus:text-ink">
        Aller au contenu
      </a>

      {/* Barre latérale (ordinateur) */}
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-line bg-panel/60 px-4 py-6 lg:flex">
        <div className="px-2">
          <Brand />
        </div>
        <nav className="mt-10 flex-1" aria-label="Navigation principale">
          <NavItems />
        </nav>
        {accountBlock}
      </aside>

      {/* En-tête (mobile et tablette) */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-ink/95 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <button className="btn btn-ghost min-h-10 px-3" onClick={() => setDrawer(true)} aria-label="Ouvrir le menu" aria-expanded={drawer}>
          <Menu className="size-5" />
        </button>
      </header>

      {/* Menu coulissant (mobile) */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-black/70" onClick={() => setDrawer(false)} aria-label="Fermer le menu" tabIndex={-1} />
          <div className="absolute inset-y-0 right-0 flex w-[min(86vw,20rem)] flex-col border-l border-line bg-panel px-4 py-5">
            <div className="flex justify-end">
              <button className="btn btn-ghost min-h-10 px-3" onClick={() => setDrawer(false)} aria-label="Fermer le menu" autoFocus>
                <X className="size-5" />
              </button>
            </div>
            <nav className="mt-4 flex-1" aria-label="Navigation principale">
              <NavItems onNavigate={() => setDrawer(false)} />
            </nav>
            {accountBlock}
          </div>
        </div>
      )}

      <main id="contenu" className="px-4 pt-6 pb-28 sm:px-6 lg:ml-72 lg:px-10 lg:pt-10 lg:pb-12">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Onglets du bas (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Raccourcis">
        {MOBILE_TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-1 py-2.5 text-[0.75rem] ${isActive ? 'text-brass-bright' : 'text-smoke'}`
            }
          >
            <Icon className="size-5" aria-hidden />
            <span className="text-center leading-tight">{label.replace('Enregistrer une visite', 'Visite').replace('Tableau de bord', 'Accueil').replace('Historique des visites', 'Historique')}</span>
          </NavLink>
        ))}
      </nav>

      <ConfirmDialog
        open={confirmLogout}
        title="Se déconnecter ?"
        confirmLabel="Se déconnecter"
        onConfirm={logout}
        onCancel={() => setConfirmLogout(false)}
      >
        Vous devrez saisir à nouveau votre e-mail et votre mot de passe.
      </ConfirmDialog>
    </div>
  )
}
