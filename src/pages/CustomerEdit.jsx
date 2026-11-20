import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getClient, updateClient } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { errorMessage } from '../lib/format'
import { useToast } from '../context/ToastContext'
import ClientForm from '../components/ClientForm'
import { ErrorBlock, LoadingBlock, PageHeader } from '../components/ui'
import NotFound from './NotFound'

export default function CustomerEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data, error, loading, reload } = useAsync(() => getClient(id), [id])
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState('')

  if (loading && !data) return <LoadingBlock />
  if (error) return <ErrorBlock message={errorMessage(error)} onRetry={reload} />
  if (!data) return <NotFound />

  async function submit(values) {
    setBusy(true)
    setServerError('')
    try {
      await updateClient(id, values)
      toast.success('Modifications enregistrées.')
      navigate(`/clients/${id}`, { replace: true })
    } catch (e) {
      setServerError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Modifier le client" description="La progression de fidélité n’est pas modifiable ici : elle évolue uniquement avec les visites." />
      <ClientForm initial={data} submitLabel="Enregistrer les modifications" busy={busy} serverError={serverError} onSubmit={submit} onCancel={() => navigate(-1)} />
    </div>
  )
}
