import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Download, Search, UserPlus, Users } from 'lucide-react'
import { listAllClients, listClients } from '../lib/api'
import { useAsync, useDebounced } from '../lib/useAsync'
import { errorMessage, formatDate, formatPhone } from '../lib/format'
import { NEAR_REWARD_POSITIONS, progressLabel } from '../lib/loyalty'
import { downloadCsv, todayStamp } from '../lib/csv'
import { LoyaltyMeter } from '../components/LoyaltyCard'
import { EmptyBlock, ErrorBlock, LoadingBlock, PageHeader, Pagination, Spinner } from '../components/ui'
import { useToast } from '../context/ToastContext'

const PAGE_SIZE = 20

export default function Customers() {
  const navigate = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') || '')
  const filter = params.get('filtre') === 'proches' ? 'proches' : 'tous'
  const [page, setPage] = useState(0)
  const [exporting, setExporting] = useState(false)
  const term = useDebounced(search)

  useEffect(() => setPage(0), [term, filter])

  const { data, error, loading, reload } = useAsync(
    () => listClients({ search: term, nearReward: filter === 'proches' ? NEAR_REWARD_POSITIONS : null, page, pageSize: PAGE_SIZE }),
    [term, filter, page],
  )

  function setFilter(v) {
    const next = new URLSearchParams(params)
    if (v === 'proches') next.set('filtre', 'proches')
    else next.delete('filtre')
    setParams(next, { replace: true })
  }

  async function exportCsv() {
    setExporting(true)
    try {
      const rows = await listAllClients()
      downloadCsv(
        `clients-${todayStamp()}.csv`,
        ['Nom', 'Téléphone', 'Inscription', 'Coupes au total', 'Cycle', 'Progression (sur 17)', 'Prochaine étape', 'Notes'],
        rows.map((c) => [c.full_name, c.phone, formatDate(c.created_at), c.total_haircuts, c.cycle_number, c.cycle_position, progressLabel(c.cycle_position), c.notes || '']),
      )
      toast.success(`${rows.length} client${rows.length > 1 ? 's' : ''} exporté${rows.length > 1 ? 's' : ''}.`)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setExporting(false)
    }
  }

  const rows = data?.data ?? []

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Retrouvez un client par son nom ou son téléphone."
        actions={
          <>
            <button className="btn btn-ghost" onClick={exportCsv} disabled={exporting}>
              {exporting ? <Spinner className="size-4" /> : <Download className="size-4" aria-hidden />}
              Exporter en CSV
            </button>
            <Link to="/clients/nouveau" className="btn btn-primary">
              <UserPlus className="size-4" aria-hidden />
              Ajouter un client
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row" role="search">
        <div className="relative flex-1">
          <label htmlFor="client-search" className="sr-only">Rechercher un client</label>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-smoke" aria-hidden />
          <input
            id="client-search"
            className="input pl-11"
            placeholder="Nom ou téléphone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex rounded-[var(--radius-control)] border border-line p-1" role="group" aria-label="Filtrer les clients">
          {[
            ['tous', 'Tous'],
            ['proches', 'Bientôt récompensés'],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              aria-pressed={filter === v}
              className={`rounded-[8px] px-3.5 py-2 text-sm font-semibold ${filter === v ? 'bg-brass text-ink' : 'text-smoke hover:text-marble'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <section className="panel overflow-hidden">
        {loading && !data ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorBlock message={errorMessage(error)} onRetry={reload} />
        ) : rows.length === 0 ? (
          term || filter === 'proches' ? (
            <EmptyBlock icon={Search} title="Aucun client trouvé" text={term ? `Aucun résultat pour « ${term} ». Vérifiez l’orthographe ou le numéro.` : 'Aucun client n’est proche d’une récompense pour le moment.'} />
          ) : (
            <EmptyBlock icon={Users} title="Aucun client" text="Ajoutez votre premier client pour démarrer sa carte de fidélité." action={<Link to="/clients/nouveau" className="btn btn-primary">Ajouter un client</Link>} />
          )
        ) : (
          <>
            {/* Tableau (écrans larges) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Nom</th>
                    <th scope="col">Téléphone</th>
                    <th scope="col">Coupes</th>
                    <th scope="col">Fidélité</th>
                    <th scope="col">Inscrit le</th>
                  </tr>
                </thead>
                <tbody className={loading ? 'opacity-60' : ''}>
                  {rows.map((c) => (
                    <tr key={c.id} className="row-link" onClick={() => navigate(`/clients/${c.id}`)}>
                      <td>
                        <Link to={`/clients/${c.id}`} className="font-semibold hover:text-brass-bright" onClick={(e) => e.stopPropagation()}>
                          {c.full_name}
                        </Link>
                      </td>
                      <td className="tabular-nums text-smoke">{formatPhone(c.phone)}</td>
                      <td className="tabular-nums">{c.total_haircuts}</td>
                      <td>
                        <LoyaltyMeter position={c.cycle_position} />
                        <p className="mt-1 text-[0.8125rem] text-smoke">{progressLabel(c.cycle_position)}</p>
                      </td>
                      <td className="text-smoke">{formatDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Liste (mobile) */}
            <ul className="md:hidden">
              {rows.map((c) => (
                <li key={c.id} className="border-b border-line/60 last:border-0">
                  <Link to={`/clients/${c.id}`} className="block px-4 py-4 hover:bg-panel-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold">{c.full_name}</span>
                      <span className="text-sm text-smoke">{c.total_haircuts} coupe{c.total_haircuts > 1 ? 's' : ''}</span>
                    </div>
                    <p className="text-sm text-smoke tabular-nums">{formatPhone(c.phone)}</p>
                    <div className="mt-2">
                      <LoyaltyMeter position={c.cycle_position} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onPage={setPage} />
          </>
        )}
      </section>
    </div>
  )
}
