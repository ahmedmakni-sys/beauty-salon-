import { useParams } from 'react-router-dom'
import { CalendarClock, Crown, Award, Sparkles, MessageCircle, Smartphone, LinkIcon } from 'lucide-react'
import { getLoyaltyCard } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { formatDate, whatsappNumber } from '../lib/format'
import LoyaltyCard from '../components/LoyaltyCard'
import { ErrorBlock, LoadingBlock } from '../components/ui'

const DAY = 24 * 60 * 60 * 1000
const REMINDER_DAYS = 21

/** Statut selon le nombre de cycles terminés. */
function statusFor(completed) {
  if (completed >= 3) return { label: 'Membre or', icon: Crown, tone: 'border-brass text-brass-bright bg-brass/10' }
  if (completed >= 1) return { label: 'Habitué', icon: Award, tone: 'border-brass-deep text-brass' }
  return { label: 'Nouveau client', icon: Sparkles, tone: 'border-line text-smoke' }
}

export default function ClientCard() {
  const { token } = useParams()
  const { data, error, loading, reload } = useAsync(() => getLoyaltyCard(token), [token])

  return (
    <div className="min-h-dvh">
      <header className="salon-photo border-b border-line">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-5">
          <span className="flex size-10 items-center justify-center rounded-full border-2 border-brass font-display text-lg text-brass-bright">B</span>
          <span className="font-display text-xl">{data?.salon_name || 'Beauty Salon'}</span>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pt-6 pb-12">
        {loading && !data ? (
          <LoadingBlock label="Chargement de votre carte…" />
        ) : error ? (
          <div className="panel">
            <ErrorBlock message="Impossible de charger votre carte. Vérifiez votre connexion internet puis réessayez." onRetry={reload} />
          </div>
        ) : !data ? (
          <div className="panel flex flex-col items-center gap-3 px-6 py-12 text-center">
            <LinkIcon className="size-8 text-brass-deep" aria-hidden />
            <h1 className="text-2xl">Ce lien n’est plus valide</h1>
            <p className="max-w-[34ch] text-smoke">Demandez votre carte de fidélité au salon lors de votre prochaine visite.</p>
          </div>
        ) : (
          <Card data={data} />
        )}
      </main>
    </div>
  )
}

function Card({ data }) {
  const status = statusFor(data.completed_cycles)
  const StatusIcon = status.icon
  const days = data.last_visit_at ? Math.floor((Date.now() - new Date(data.last_visit_at).getTime()) / DAY) : null
  const salonWa = data.salon_phone ? whatsappNumber(data.salon_phone) : null
  const waText = encodeURIComponent(`Bonjour, je souhaite réserver une coupe. ${data.first_name}`)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-4xl">Bonjour {data.first_name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${status.tone}`}>
            <StatusIcon className="size-4" aria-hidden />
            {status.label}
          </span>
          <span className="text-sm text-smoke">
            {data.total_haircuts} coupe{data.total_haircuts > 1 ? 's' : ''} depuis le {formatDate(data.member_since)}
          </span>
        </div>
      </div>

      <LoyaltyCard position={data.cycle_position} cycleNumber={data.cycle_number} compactTitle />

      <section className="panel flex items-start gap-3 p-4">
        <CalendarClock className="mt-0.5 size-5 shrink-0 text-brass" aria-hidden />
        <p className="text-[0.9375rem] text-smoke">
          {days === null && 'Votre carte est prête. Le premier tampon arrive à votre prochaine coupe.'}
          {days !== null && days < 1 && 'Votre dernière coupe date d’aujourd’hui. À bientôt.'}
          {days !== null && days >= 1 && days < REMINDER_DAYS && `Votre dernière coupe date de ${days} jour${days > 1 ? 's' : ''}.`}
          {days !== null && days >= REMINDER_DAYS && (
            <>
              Votre dernière coupe date de <span className="text-marble">{days} jours</span>. Il est temps de repasser.
            </>
          )}
        </p>
      </section>

      {salonWa && (
        <a href={`https://wa.me/${salonWa}?text=${waText}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full text-base">
          <MessageCircle className="size-5" aria-hidden />
          Réserver sur WhatsApp
        </a>
      )}

      <details className="panel group p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-[0.9375rem] font-semibold">
          <Smartphone className="size-5 text-brass" aria-hidden />
          Garder ma carte sur mon téléphone
        </summary>
        <div className="mt-3 space-y-2 text-sm text-smoke">
          <p><span className="text-marble">Android :</span> menu ⋮ du navigateur, puis « Ajouter à l’écran d’accueil ».</p>
          <p><span className="text-marble">iPhone :</span> bouton Partager, puis « Sur l’écran d’accueil ».</p>
          <p>Votre carte s’ouvrira comme une application, toujours à jour.</p>
        </div>
      </details>

      <p className="text-center text-xs text-smoke">Cette carte est personnelle. Ne partagez pas ce lien.</p>
    </div>
  )
}
