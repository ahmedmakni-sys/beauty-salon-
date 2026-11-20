import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gift } from 'lucide-react'
import { listRewards } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { errorMessage, formatDateTime, formatDT } from '../lib/format'
import { EmptyBlock, ErrorBlock, LoadingBlock, PageHeader, Pagination, RewardTypeBadge } from '../components/ui'

const PAGE_SIZE = 25
const FILTERS = [
  ['', 'Toutes'],
  ['discount_10', 'Remises de 10 DT'],
  ['free_haircut', 'Coupes offertes'],
]

export default function Rewards() {
  const [type, setType] = useState('')
  const [page, setPage] = useState(0)
  useEffect(() => setPage(0), [type])
  const { data, error, loading, reload } = useAsync(() => listRewards({ type: type || undefined, page, pageSize: PAGE_SIZE }), [type, page])
  const rows = data?.data ?? []

  return (
    <div>
      <PageHeader title="Récompenses" description="Chaque remise et chaque coupe offerte accordée, avec le client et la date." />

      <div className="mb-4 inline-flex rounded-[var(--radius-control)] border border-line p-1" role="group" aria-label="Filtrer par type">
        {FILTERS.map(([v, l]) => (
          <button
            key={v}
            onClick={() => setType(v)}
            aria-pressed={type === v}
            className={`rounded-[8px] px-3.5 py-2 text-sm font-semibold ${type === v ? 'bg-brass text-ink' : 'text-smoke hover:text-marble'}`}
          >
            {l}
          </button>
        ))}
      </div>

      <section className="panel overflow-hidden">
        {loading && !data ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorBlock message={errorMessage(error)} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyBlock icon={Gift} title="Aucune récompense accordée" text="La première remise arrive à la 6e coupe d’un client." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Client</th>
                    <th scope="col">Récompense</th>
                    <th scope="col">Cycle</th>
                    <th scope="col" className="text-right">Valeur</th>
                  </tr>
                </thead>
                <tbody className={loading ? 'opacity-60' : ''}>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap text-smoke">{formatDateTime(r.created_at)}</td>
                      <td>
                        <Link to={`/clients/${r.client_id}`} className="font-semibold hover:text-brass-bright">{r.clients?.full_name}</Link>
                      </td>
                      <td><RewardTypeBadge type={r.reward_type} /></td>
                      <td className="text-smoke">{r.cycle_number}</td>
                      <td className="text-right tabular-nums text-brass-bright">{formatDT(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onPage={setPage} />
          </>
        )}
      </section>
    </div>
  )
}
