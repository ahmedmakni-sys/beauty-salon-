import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Pencil, Phone, Scissors, Trash2, CalendarDays, StickyNote, Gift, QrCode } from 'lucide-react'
import { deleteClient, getClient, getSettings, listRewards, listVisits } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { errorMessage, formatDate, formatDateTime, formatDT, formatPhone } from '../lib/format'
import { useToast } from '../context/ToastContext'
import LoyaltyCard from '../components/LoyaltyCard'
import ConfirmDialog from '../components/ConfirmDialog'
import ShareCardDialog from '../components/ShareCardDialog'
import { EmptyBlock, ErrorBlock, LoadingBlock, Pagination, RewardTypeBadge, VisitTypeBadge } from '../components/ui'
import NotFound from './NotFound'

const PAGE_SIZE = 10

export default function CustomerDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const client = useAsync(() => getClient(id), [id])
  const [page, setPage] = useState(0)
  const visits = useAsync(() => listVisits({ clientId: id, page, pageSize: PAGE_SIZE }), [id, page])
  const rewards = useAsync(() => listRewards({ clientId: id, pageSize: 50 }), [id])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [token, setToken] = useState(null)
  const settings = useAsync(getSettings, [])

  if (client.loading && !client.data) return <LoadingBlock />
  if (client.error) return <ErrorBlock message={errorMessage(client.error)} onRetry={client.reload} />
  if (!client.data) return <NotFound />
  const c = { ...client.data, share_token: token || client.data.share_token }

  async function remove() {
    setDeleting(true)
    try {
      await deleteClient(c.id)
      toast.success(`${c.full_name} a été supprimé.`)
      navigate('/clients', { replace: true })
    } catch (e) {
      toast.error(errorMessage(e))
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link to="/clients" className="text-sm text-brass hover:text-brass-bright">Clients</Link>
          <h1 className="mt-1 text-4xl sm:text-5xl">{c.full_name}</h1>
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-smoke">
            <div className="flex items-center gap-2">
              <dt><Phone className="size-4" aria-label="Téléphone" /></dt>
              <dd className="tabular-nums text-marble">{formatPhone(c.phone)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt><CalendarDays className="size-4" aria-label="Inscription" /></dt>
              <dd>Client depuis le {formatDate(c.created_at)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt><Scissors className="size-4" aria-label="Total" /></dt>
              <dd>{c.total_haircuts} coupe{c.total_haircuts > 1 ? 's' : ''} au total</dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/visites/nouvelle?client=${c.id}`} className="btn btn-primary">
            <Scissors className="size-4" aria-hidden />
            Enregistrer une visite
          </Link>
          <button className="btn btn-ghost" onClick={() => setSharing(true)}>
            <QrCode className="size-4" aria-hidden />
            Carte du client
          </button>
          <Link to={`/clients/${c.id}/modifier`} className="btn btn-ghost">
            <Pencil className="size-4" aria-hidden />
            Modifier
          </Link>
          <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" aria-hidden />
            Supprimer
          </button>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <LoyaltyCard position={c.cycle_position} cycleNumber={c.cycle_number} />
          {c.notes && (
            <section className="panel p-5">
              <h2 className="flex items-center gap-2 text-lg">
                <StickyNote className="size-4 text-brass" aria-hidden />
                Notes
              </h2>
              <p className="mt-2 whitespace-pre-line text-smoke">{c.notes}</p>
            </section>
          )}
        </div>

        <section className="panel lg:col-span-2" aria-labelledby="rewards-title">
          <h2 id="rewards-title" className="border-b border-line px-5 py-4 text-xl">Récompenses obtenues</h2>
          {rewards.loading && !rewards.data ? (
            <LoadingBlock />
          ) : rewards.error ? (
            <ErrorBlock message={errorMessage(rewards.error)} onRetry={rewards.reload} />
          ) : rewards.data.data.length === 0 ? (
            <EmptyBlock icon={Gift} title="Pas encore de récompense" text="La première arrive à la 6e coupe : 10 DT de remise." />
          ) : (
            <ul>
              {rewards.data.data.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 border-b border-line/60 px-5 py-3.5 last:border-0">
                  <div>
                    <RewardTypeBadge type={r.reward_type} />
                    <p className="mt-1 text-sm text-smoke">{formatDateTime(r.created_at)}, cycle {r.cycle_number}</p>
                  </div>
                  <span className="tabular-nums text-brass-bright">{formatDT(r.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel overflow-hidden" aria-labelledby="history-title">
        <h2 id="history-title" className="border-b border-line px-5 py-4 text-xl">Historique des visites</h2>
        {visits.loading && !visits.data ? (
          <LoadingBlock />
        ) : visits.error ? (
          <ErrorBlock message={errorMessage(visits.error)} onRetry={visits.reload} />
        ) : visits.data.data.length === 0 ? (
          <EmptyBlock icon={Scissors} title="Aucune visite" text="Enregistrez sa première coupe pour poser le premier tampon." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Type</th>
                    <th scope="col">Case</th>
                    <th scope="col" className="text-right">Prix</th>
                    <th scope="col" className="text-right">Remise</th>
                    <th scope="col" className="text-right">Payé</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.data.data.map((v) => (
                    <tr key={v.id}>
                      <td className="whitespace-nowrap">{formatDateTime(v.created_at)}</td>
                      <td><VisitTypeBadge type={v.visit_type} /></td>
                      <td className="whitespace-nowrap text-smoke">{v.cycle_position} / 17, cycle {v.cycle_number}</td>
                      <td className="text-right tabular-nums text-smoke">{formatDT(v.base_price)}</td>
                      <td className="text-right tabular-nums text-brass">{v.discount_amount > 0 ? `−${formatDT(v.discount_amount)}` : ''}</td>
                      <td className="text-right font-semibold tabular-nums">{formatDT(v.amount_paid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} count={visits.data.count} onPage={setPage} />
          </>
        )}
      </section>

      <ShareCardDialog
        open={sharing}
        client={c}
        salonName={settings.data?.salon_name}
        onClose={() => setSharing(false)}
        onTokenChange={setToken}
      />

      <ConfirmDialog
        open={confirmDelete}
        tone="danger"
        busy={deleting}
        title={`Supprimer ${c.full_name} ?`}
        confirmLabel="Supprimer définitivement"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      >
        Ses {c.total_haircuts} visite{c.total_haircuts > 1 ? 's' : ''}, ses récompenses et sa carte de fidélité seront effacées. Cette action est irréversible.
      </ConfirmDialog>
    </div>
  )
}
