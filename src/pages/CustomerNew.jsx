import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createClient } from '../lib/api'
import { errorMessage } from '../lib/format'
import { useToast } from '../context/ToastContext'
import ClientForm from '../components/ClientForm'
import { PageHeader } from '../components/ui'

export default function CustomerNew() {
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState('')
  const returnTo = params.get('retour')

  async function submit(values) {
    setBusy(true)
    setServerError('')
    try {
      const client = await createClient(values)
      toast.success(`${client.full_name} a été ajouté.`)
      navigate(returnTo === 'visite' ? `/visites/nouvelle?client=${client.id}` : `/clients/${client.id}`, { replace: true })
    } catch (e) {
      setServerError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Ajouter un client" description="Sa carte de fidélité démarre à zéro." />
      <ClientForm
        initial={{ phone: params.get('tel') || '' }}
        submitLabel="Ajouter le client"
        busy={busy}
        serverError={serverError}
        onSubmit={submit}
        onCancel={() => navigate(-1)}
      />
    </div>
  )
}
