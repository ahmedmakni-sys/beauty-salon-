import { useEffect, useState } from 'react'
import { getSettings, updateSettings } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { errorMessage } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ErrorBlock, LoadingBlock, PageHeader, Spinner } from '../components/ui'

export default function Settings() {
  const { user } = useAuth()
  const toast = useToast()
  const { data, error, loading, reload } = useAsync(getSettings, [])
  const [values, setValues] = useState(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (data) setValues({ salon_name: data.salon_name ?? '', address: data.address ?? '', phone: data.phone ?? '', haircut_price: String(data.haircut_price ?? '') })
  }, [data])

  if (loading && !data) return <LoadingBlock />
  if (error) return <ErrorBlock message={errorMessage(error)} onRetry={reload} />
  if (!values) return null

  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const price = Number(values.haircut_price.replace(',', '.'))
    if (!values.salon_name.trim()) return setFormError('Le nom du salon est obligatoire.')
    if (!Number.isFinite(price) || price < 0) return setFormError('Le prix d’une coupe doit être un nombre positif, par exemple 15.')
    setFormError('')
    setBusy(true)
    try {
      await updateSettings({
        salon_name: values.salon_name.trim(),
        address: values.address.trim() || null,
        phone: values.phone.trim() || null,
        haircut_price: price,
      })
      toast.success('Paramètres enregistrés.')
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader title="Paramètres" description="Informations du salon et prix utilisé pour calculer chaque visite." />

      <form onSubmit={submit} noValidate className="panel space-y-6 p-6 sm:p-8">
        <h2 className="text-2xl">Salon</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="s-name" className="field-label">Nom du salon</label>
            <input id="s-name" className="input" value={values.salon_name} onChange={set('salon_name')} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="s-address" className="field-label">Adresse</label>
            <input id="s-address" className="input" value={values.address} onChange={set('address')} placeholder="Avenue Habib Bourguiba, Sfax" />
          </div>
          <div>
            <label htmlFor="s-phone" className="field-label">Téléphone du salon</label>
            <input id="s-phone" type="tel" className="input" value={values.phone} onChange={set('phone')} />
          </div>
          <div>
            <label htmlFor="s-price" className="field-label">Prix d’une coupe (DT)</label>
            <input id="s-price" inputMode="decimal" className="input" value={values.haircut_price} onChange={set('haircut_price')} aria-describedby="s-price-hint" />
            <p id="s-price-hint" className="field-hint">Appliqué aux prochaines visites. Les visites passées gardent leur prix.</p>
          </div>
        </div>
        {formError && <p className="text-sm text-rust" role="alert">{formError}</p>}
        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy && <Spinner className="size-4 text-current" />}
            Enregistrer les paramètres
          </button>
        </div>
      </form>

      <section className="panel p-6 sm:p-8">
        <h2 className="text-2xl">Règles de fidélité</h2>
        <ol className="mt-4 space-y-3 text-[0.9375rem]">
          <li><strong className="text-brass-bright">Coupes 1 à 5</strong> : payées au prix normal.</li>
          <li><strong className="text-brass-bright">6e coupe</strong> : 10 DT de remise.</li>
          <li><strong className="text-brass-bright">10 coupes suivantes</strong> : payées au prix normal.</li>
          <li><strong className="text-brass-bright">Coupe suivante</strong> (11e de la deuxième étape) : offerte. La carte repart ensuite à zéro.</li>
        </ol>
        <p className="mt-4 text-sm text-smoke">Ces règles sont appliquées par la base de données ; elles ne peuvent pas être contournées depuis l’interface.</p>
      </section>

      <section className="panel p-6 sm:p-8">
        <h2 className="text-2xl">Compte</h2>
        <p className="mt-3 text-smoke">Connecté en tant que <span className="text-marble">{user?.email}</span>.</p>
        <p className="mt-2 text-sm text-smoke">Pour changer le mot de passe : Supabase, rubrique Authentication puis Users.</p>
      </section>
    </div>
  )
}
