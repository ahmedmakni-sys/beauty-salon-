import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Users, Scissors, UserPlus } from 'lucide-react'
import { getDashboardStats, getSettings, listClients, listVisits } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { errorMessage, formatDateTime, formatDT, formatPhone, formatToday, formatDate } from '../lib/format'
import { NEAR_REWARD_POSITIONS, progressLabel } from '../lib/loyalty'
import { LoyaltyMeter } from '../components/LoyaltyCard'
import { EmptyBlock, ErrorBlock, LoadingBlock, VisitTypeBadge } from '../components/ui'

export default function Dashboard() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const settings = useAsync(getSettings, [])
  const stats = useAsync(getDashboardStats, [])
  const near = useAsync(() => listClients({ nearReward: NEAR_REWARD_POSITIONS, pageSize: 6 }), [])
  const visits = useAsync(() => listVisits({ pageSize: 6 }), [])
  const recent = useAsync(() => listClients({ pageSize: 5 }), [])

  function lookup(e) {
    e.preventDefault()
    navigate(`/visites/nouvelle${phone.trim() ? `?tel=${encodeURIComponent(phone.trim())}` : ''}`)
  }

  const s = stats.data
  const figures = [
    { label: 'Clients', value: s?.total_clients },
    { label: 'Coupes enregistrées', value: s?.total_visits },
    { label: 'Remises de 10 DT', value: s?.total_discounts, hint: s ? `${formatDT(s.discount_amount)} accordés` : null },
    { label: 'Coupes offertes', value: s?.total_free },
  ]

  return (
    <div className="space-y-8">
      {/* Accueil : photo du salon + recherche rapide */}
      <section className="salon-photo overflow-hidden rounded-[var(--radius-panel)] border border-line">
        <div className="px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-smoke">{formatToday()}</p>
          <h1 className="mt-2 max-w-[18ch] text-4xl sm:text-5xl">{settings.data?.salon_name || 'Beauty Salon'}</h1>
          {s && (
            <p className="mt-3 text-marble/85">
              {s.visits_today === 0 ? 'Aucune coupe enregistrée aujourd’hui.' : `${s.visits_today} coupe${s.visits_today > 1 ? 's' : ''} enregistrée${s.visits_today > 1 ? 's' : ''} aujourd’hui.`}
            </p>
          )}
          <form onSubmit={lookup} className="mt-8 flex max-w-lg flex-col gap-2 sm:flex-row" role="search">
            <label htmlFor="quick-phone" className="sr-only">Téléphone du client</label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-smoke" aria-hidden />
              <input
                id="quick-phone"
                type="tel"
                inputMode="tel"
                className="input bg-ink/85 pl-11"
                placeholder="Téléphone du client"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit">
              <Scissors className="size-4" aria-hidden />
              Enregistrer une visite
            </button>
          </form>
        </div>
      </section>

      {/* Chiffres clés */}
      <section className="panel" aria-label="Chiffres clés">
        {stats.error ? (
          <ErrorBlock message={errorMessage(stats.error)} onRetry={stats.reload} />
        ) : (
          <dl className="grid grid-cols-2 lg:grid-cols-4">
            {figures.map((f, i) => (
              <div key={f.label} className={`p-5 sm:p-6 ${i % 2 ? 'border-l border-line' : ''} ${i > 1 ? 'border-t border-line lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}>
                <dt className="text-sm text-smoke">{f.label}</dt>
                <dd className="mt-1 font-display text-4xl text-marble tabular-nums">{stats.loading && !s ? '–' : f.value}</dd>
                {f.hint && <dd className="mt-1 text-sm text-brass">{f.hint}</dd>}
              </div>
            ))}
          </dl>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Proches d'une récompense */}
        <section className="panel lg:col-span-2" aria-labelledby="near-title">
          <div className="flex items-baseline justify-between border-b border-line px-5 py-4">
            <h2 id="near-title" className="text-xl">Bientôt récompensés</h2>
            <Link to="/clients?filtre=proches" className="text-sm text-brass hover:text-brass-bright">Tout voir</Link>
          </div>
          {near.loading && !near.data ? (
            <LoadingBlock />
          ) : near.error ? (
            <ErrorBlock message={errorMessage(near.error)} onRetry={near.reload} />
          ) : near.data.data.length === 0 ? (
            <EmptyBlock title="Personne pour l’instant" text="Les clients à 1, 2 ou 3 coupes d’une récompense apparaîtront ici." />
          ) : (
            <ul>
              {near.data.data.map((c) => (
                <li key={c.id} className="border-b border-line/60 last:border-0">
                  <Link to={`/clients/${c.id}`} className="block px-5 py-3.5 hover:bg-panel-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold">{c.full_name}</span>
                      <span className="text-sm text-smoke tabular-nums">{formatPhone(c.phone)}</span>
                    </div>
                    <div className="mt-2 flex flex-col items-start gap-1.5">
                      <LoyaltyMeter position={c.cycle_position} />
                      <span className="text-sm text-brass-bright">{progressLabel(c.cycle_position)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Dernières visites */}
        <section className="panel lg:col-span-3" aria-labelledby="visits-title">
          <div className="flex items-baseline justify-between border-b border-line px-5 py-4">
            <h2 id="visits-title" className="text-xl">Dernières visites</h2>
            <Link to="/visites" className="text-sm text-brass hover:text-brass-bright">Historique complet</Link>
          </div>
          {visits.loading && !visits.data ? (
            <LoadingBlock />
          ) : visits.error ? (
            <ErrorBlock message={errorMessage(visits.error)} onRetry={visits.reload} />
          ) : visits.data.data.length === 0 ? (
            <EmptyBlock icon={Scissors} title="Aucune visite enregistrée" text="Saisissez le téléphone d’un client ci-dessus pour enregistrer sa première coupe." />
          ) : (
            <ul>
              {visits.data.data.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line/60 px-5 py-3.5 last:border-0">
                  <div className="min-w-0">
                    <Link to={`/clients/${v.client_id}`} className="font-semibold hover:text-brass-bright">{v.clients?.full_name}</Link>
                    <p className="text-sm text-smoke">{formatDateTime(v.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm tabular-nums">{formatDT(v.amount_paid)}</span>
                    <VisitTypeBadge type={v.visit_type} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Nouveaux clients */}
      <section className="panel" aria-labelledby="recent-title">
        <div className="flex items-baseline justify-between border-b border-line px-5 py-4">
          <h2 id="recent-title" className="text-xl">Nouveaux clients</h2>
          <Link to="/clients/nouveau" className="inline-flex items-center gap-1.5 text-sm text-brass hover:text-brass-bright">
            <UserPlus className="size-4" aria-hidden />
            Ajouter un client
          </Link>
        </div>
        {recent.loading && !recent.data ? (
          <LoadingBlock />
        ) : recent.error ? (
          <ErrorBlock message={errorMessage(recent.error)} onRetry={recent.reload} />
        ) : recent.data.data.length === 0 ? (
          <EmptyBlock icon={Users} title="Aucun client" text="Ajoutez votre premier client pour démarrer sa carte de fidélité." action={<Link to="/clients/nouveau" className="btn btn-primary">Ajouter un client</Link>} />
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-5">
            {recent.data.data.map((c) => (
              <li key={c.id} className="border-b border-line/60 sm:border-r last:border-0">
                <Link to={`/clients/${c.id}`} className="block px-5 py-4 hover:bg-panel-2">
                  <p className="truncate font-semibold">{c.full_name}</p>
                  <p className="text-sm text-smoke">Depuis le {formatDate(c.created_at)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
