import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Scissors, UserPlus, Gift, Percent, CheckCircle2, RotateCcw } from 'lucide-react'
import { findClientByPhone, getClient, getSettings, listClients, registerVisit } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { errorMessage, formatDT, formatPhone, isValidPhone, normalizePhone } from '../lib/format'
import { predictNextVisit } from '../lib/loyalty'
import { useToast } from '../context/ToastContext'
import LoyaltyCard from '../components/LoyaltyCard'
import ConfirmDialog from '../components/ConfirmDialog'
import { ErrorBlock, PageHeader, Spinner } from '../components/ui'

const OUTCOME = {
  paid: { title: 'Coupe enregistrée', icon: CheckCircle2, tone: 'text-marble' },
  discount: { title: 'Remise de 10 DT appliquée', icon: Percent, tone: 'text-brass-bright' },
  free: { title: 'Coupe offerte', icon: Gift, tone: 'text-sage' },
}

export default function RegisterVisit() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const settings = useAsync(getSettings, [])
  const price = settings.data?.haircut_price ?? 0

  const [phone, setPhone] = useState(params.get('tel') || '')
  const [phoneError, setPhoneError] = useState('')
  const [searching, setSearching] = useState(false)
  const [lookupError, setLookupError] = useState(null)
  const [client, setClient] = useState(null)
  const [notFound, setNotFound] = useState(null) // { phone, suggestions }
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)
  const inputRef = useRef(null)
  // Clé d'idempotence : la même pour toutes les tentatives d'une confirmation,
  // pour qu'un double clic ou une nouvelle tentative ne crée jamais deux visites.
  const keyRef = useRef(null)

  const reset = useCallback(() => {
    setClient(null)
    setNotFound(null)
    setResult(null)
    setLookupError(null)
    setPhone('')
    keyRef.current = null
    setParams({}, { replace: true })
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [setParams])

  const searchPhone = useCallback(async (raw) => {
    const value = normalizePhone(raw)
    setResult(null)
    setClient(null)
    setNotFound(null)
    setLookupError(null)
    keyRef.current = null
    if (!isValidPhone(value)) {
      setPhoneError('Saisissez un numéro valide, par exemple 22 345 678.')
      return
    }
    setPhoneError('')
    setSearching(true)
    try {
      const found = await findClientByPhone(value)
      if (found) setClient(found)
      else {
        const partial = await listClients({ search: value.slice(-6), pageSize: 4 })
        setNotFound({ phone: value, suggestions: partial.data })
      }
    } catch (e) {
      setLookupError(e)
    } finally {
      setSearching(false)
    }
  }, [])

  // Arrivée depuis le tableau de bord (?tel=) ou une fiche client (?client=)
  useEffect(() => {
    const id = params.get('client')
    const tel = params.get('tel')
    if (id) {
      setSearching(true)
      getClient(id)
        .then((c) => {
          if (c) {
            setClient(c)
            setPhone(formatPhone(c.phone))
          } else setLookupError({ message: 'Client introuvable. Il a peut-être été supprimé.' })
        })
        .catch(setLookupError)
        .finally(() => setSearching(false))
    } else if (tel) {
      searchPhone(tel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function openConfirm() {
    if (!keyRef.current) keyRef.current = crypto.randomUUID()
    setConfirming(true)
  }

  async function save() {
    if (saving || !client) return
    setSaving(true)
    try {
      const r = await registerVisit(client.id, keyRef.current)
      const before = client.cycle_position
      setResult({ ...r, before })
      setClient((c) => ({ ...c, cycle_position: r.new_cycle_position, cycle_number: r.new_cycle_number, total_haircuts: r.total_haircuts }))
      keyRef.current = null
      setConfirming(false)
      toast.success(r.duplicate ? 'Cette visite était déjà enregistrée.' : `Visite de ${client.full_name} enregistrée.`)
    } catch (e) {
      // La clé est conservée : réessayer ne créera pas de doublon.
      toast.error(`La visite n’a pas été enregistrée. ${errorMessage(e)}`)
      setConfirming(false)
    } finally {
      setSaving(false)
    }
  }

  const next = client ? predictNextVisit(client.cycle_position, price) : null
  const outcome = result ? OUTCOME[result.visit_type] : null

  return (
    <div className="max-w-4xl">
      <PageHeader title="Enregistrer une visite" description="Saisissez le téléphone du client, vérifiez sa carte, puis confirmez la coupe." />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          searchPhone(phone)
        }}
        noValidate
        className="panel flex flex-col gap-3 p-5 sm:flex-row sm:items-start"
        role="search"
      >
        <div className="flex-1">
          <label htmlFor="visit-phone" className="field-label">Téléphone du client</label>
          <input
            ref={inputRef}
            id="visit-phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            className="input text-lg tracking-wide"
            placeholder="22 345 678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={Boolean(phoneError)}
            aria-describedby={phoneError ? 'visit-phone-err' : undefined}
            autoFocus
          />
          {phoneError && <p id="visit-phone-err" className="field-error">{phoneError}</p>}
        </div>
        <button type="submit" className="btn btn-primary sm:mt-[1.65rem]" disabled={searching}>
          {searching ? <Spinner className="size-4 text-current" /> : <Search className="size-4" aria-hidden />}
          Rechercher
        </button>
      </form>

      <div className="mt-6 space-y-6" aria-live="polite">
        {lookupError && <div className="panel"><ErrorBlock message={errorMessage(lookupError)} onRetry={() => searchPhone(phone)} /></div>}

        {notFound && (
          <section className="panel p-6">
            <h2 className="text-2xl">Aucun client avec le {formatPhone(notFound.phone)}</h2>
            <p className="mt-2 text-smoke">Vérifiez le numéro, ou créez la fiche du client pour démarrer sa carte.</p>
            <Link to={`/clients/nouveau?tel=${encodeURIComponent(notFound.phone)}&retour=visite`} className="btn btn-primary mt-5">
              <UserPlus className="size-4" aria-hidden />
              Ajouter ce client
            </Link>
            {notFound.suggestions.length > 0 && (
              <div className="mt-6 border-t border-line pt-4">
                <p className="text-sm text-smoke">Numéros proches :</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {notFound.suggestions.map((s) => (
                    <li key={s.id}>
                      <button
                        className="btn btn-ghost min-h-10 text-sm"
                        onClick={() => {
                          setPhone(formatPhone(s.phone))
                          setNotFound(null)
                          setClient(s)
                        }}
                      >
                        {s.full_name}, {formatPhone(s.phone)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {client && result && outcome && (
          <section className="panel border-brass/50 p-6 sm:p-8" aria-labelledby="result-title">
            <div className="flex items-start gap-4">
              <outcome.icon className={`mt-1 size-8 shrink-0 ${outcome.tone}`} aria-hidden />
              <div>
                <h2 id="result-title" className={`text-3xl ${outcome.tone}`}>{outcome.title}</h2>
                <p className="mt-2 text-lg">
                  {client.full_name} paie <strong className="font-display text-2xl">{formatDT(result.amount_paid)}</strong>
                  {result.discount_amount > 0 && <span className="text-smoke"> au lieu de {formatDT(result.base_price)}</span>}
                </p>
                {result.visit_type === 'free' && <p className="mt-1 text-smoke">Le cycle est terminé : la carte repart à zéro pour un nouveau cycle.</p>}
              </div>
            </div>
            <div className="mt-6">
              <LoyaltyCard
                position={result.visit_type === 'free' ? 17 : result.new_cycle_position}
                cycleNumber={result.cycle_number}
                highlight={result.cycle_position}
                compactTitle
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={reset} autoFocus>
                <RotateCcw className="size-4" aria-hidden />
                Nouvelle visite
              </button>
              <Link to={`/clients/${client.id}`} className="btn btn-ghost">Voir la fiche du client</Link>
            </div>
          </section>
        )}

        {client && !result && next && (
          <>
            <section className="panel flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-3xl">
                  <Link to={`/clients/${client.id}`} className="hover:text-brass-bright">{client.full_name}</Link>
                </h2>
                <p className="mt-1 text-smoke">
                  {formatPhone(client.phone)}, {client.total_haircuts} coupe{client.total_haircuts > 1 ? 's' : ''} au total
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-sm text-smoke">Cette coupe ({next.position}e du cycle)</p>
                <p className={`font-display text-2xl ${next.type === 'free' ? 'text-sage' : next.type === 'discount' ? 'text-brass-bright' : ''}`}>
                  {next.type === 'free' ? 'Offerte' : next.type === 'discount' ? `${formatDT(next.toPay)} après remise` : formatDT(next.toPay)}
                </p>
              </div>
            </section>

            <LoyaltyCard position={client.cycle_position} cycleNumber={client.cycle_number} />

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button className="btn btn-ghost" onClick={reset}>Changer de client</button>
              <button className="btn btn-primary px-6 text-base" onClick={openConfirm} disabled={saving || settings.loading}>
                <Scissors className="size-4" aria-hidden />
                Enregistrer la coupe
              </button>
            </div>
          </>
        )}
      </div>

      {client && next && (
        <ConfirmDialog
          open={confirming}
          busy={saving}
          title="Confirmer la coupe ?"
          confirmLabel={next.type === 'free' ? 'Valider la coupe offerte' : next.type === 'discount' ? 'Valider avec la remise' : 'Enregistrer la coupe'}
          onConfirm={save}
          onCancel={() => setConfirming(false)}
        >
          <p>
            <strong className="text-marble">{client.full_name}</strong>, {formatPhone(client.phone)}
          </p>
          <p className="mt-2">
            {next.type === 'paid' && `Coupe payée : ${formatDT(next.toPay)}.`}
            {next.type === 'discount' && `6e coupe : remise de ${formatDT(next.discount)}. À payer : ${formatDT(next.toPay)}.`}
            {next.type === 'free' && 'Coupe offerte. La carte de fidélité sera remise à zéro après validation.'}
          </p>
          <p className="mt-2 text-sm">Le calcul final est vérifié par la base de données au moment de l’enregistrement.</p>
        </ConfirmDialog>
      )}
    </div>
  )
}
