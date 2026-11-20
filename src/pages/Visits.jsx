import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, History, Search } from 'lucide-react'
import { listVisits } from '../lib/api'
import { useAsync, useDebounced } from '../lib/useAsync'
import { errorMessage, formatDateTime, formatDT, formatPhone } from '../lib/format'
import { VISIT_TYPE_LABELS } from '../lib/loyalty'
import { downloadCsv, todayStamp } from '../lib/csv'
import { useToast } from '../context/ToastContext'
import { EmptyBlock, ErrorBlock, LoadingBlock, PageHeader, Pagination, Spinner, VisitTypeBadge } from '../components/ui'

const PAGE_SIZE = 25

export default function Visits() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const [exporting, setExporting] = useState(false)
  const term = useDebounced(search)
  const filters = { search: term, type, from, to }

  useEffect(() => setPage(0), [term, type, from, to])

  const { data, error, loading, reload } = useAsync(() => listVisits({ ...filters, page, pageSize: PAGE_SIZE }), [term, type, from, to, page])

  async function exportCsv() {
    setExporting(true)
    try {
      const { data: rows } = await listVisits({ ...filters, all: true })
      downloadCsv(
        `visites-${todayStamp()}.csv`,
        ['Date', 'Client', 'Téléphone', 'Type', 'Prix (DT)', 'Remise (DT)', 'Payé (DT)', 'Cycle', 'Case'],
        rows.map((v) => [formatDateTime(v.created_at), v.clients?.full_name, v.clients?.phone, VISIT_TYPE_LABELS[v.visit_type], v.base_price, v.discount_amount, v.amount_paid, v.cycle_number, v.cycle_position]),
      )
      toast.success(`${rows.length} visite${rows.length > 1 ? 's' : ''} exportée${rows.length > 1 ? 's' : ''}.`)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setExporting(false)
    }
  }

  const hasFilters = term || type || from || to
  const rows = data?.data ?? []

  return (
    <div>
      <PageHeader
        title="Historique des visites"
        description="Toutes les coupes enregistrées, de la plus récente à la plus ancienne."
        actions={
          <button className="btn btn-ghost" onClick={exportCsv} disabled={exporting}>
            {exporting ? <Spinner className="size-4" /> : <Download className="size-4" aria-hidden />}
            Exporter en CSV
          </button>
        }
      />

      <div className="panel mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="relative">
          <label htmlFor="v-search" className="field-label">Client</label>
          <Search className="pointer-events-none absolute bottom-3.5 left-3.5 size-5 text-smoke" aria-hidden />
          <input id="v-search" className="input pl-11" placeholder="Nom du client" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <label htmlFor="v-type" className="field-label">Type</label>
          <select id="v-type" className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Tous les types</option>
            <option value="paid">Coupes payées</option>
            <option value="discount">Remises 10 DT</option>
            <option value="free">Coupes offertes</option>
          </select>
        </div>
        <div>
          <label htmlFor="v-from" className="field-label">Du</label>
          <input id="v-from" type="date" className="input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label htmlFor="v-to" className="field-label">Au</label>
          <input id="v-to" type="date" className="input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <section className="panel overflow-hidden">
        {loading && !data ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorBlock message={errorMessage(error)} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyBlock
            icon={History}
            title={hasFilters ? 'Aucune visite ne correspond' : 'Aucune visite enregistrée'}
            text={hasFilters ? 'Modifiez ou retirez des filtres.' : 'Les coupes apparaîtront ici dès la première visite enregistrée.'}
            action={!hasFilters && <Link to="/visites/nouvelle" className="btn btn-primary">Enregistrer une visite</Link>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Client</th>
                    <th scope="col">Type</th>
                    <th scope="col" className="text-right">Remise</th>
                    <th scope="col" className="text-right">Payé</th>
                  </tr>
                </thead>
                <tbody className={loading ? 'opacity-60' : ''}>
                  {rows.map((v) => (
                    <tr key={v.id}>
                      <td className="whitespace-nowrap text-smoke">{formatDateTime(v.created_at)}</td>
                      <td>
                        <Link to={`/clients/${v.client_id}`} className="font-semibold hover:text-brass-bright">{v.clients?.full_name}</Link>
                        <p className="text-[0.8125rem] text-smoke tabular-nums">{formatPhone(v.clients?.phone)}</p>
                      </td>
                      <td><VisitTypeBadge type={v.visit_type} /></td>
                      <td className="text-right tabular-nums text-brass">{v.discount_amount > 0 ? `−${formatDT(v.discount_amount)}` : ''}</td>
                      <td className="text-right font-semibold tabular-nums">{formatDT(v.amount_paid)}</td>
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
