import { useState } from 'react'
import { isValidPhone, normalizePhone } from '../lib/format'
import { Spinner } from './ui'

export default function ClientForm({ initial = {}, submitLabel, busy, serverError, onSubmit, onCancel }) {
  const [values, setValues] = useState({
    full_name: initial.full_name ?? '',
    phone: initial.phone ?? '',
    notes: initial.notes ?? '',
  })
  const [errors, setErrors] = useState({})

  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }))

  function validate() {
    const e = {}
    const name = values.full_name.trim()
    if (name.length < 2) e.full_name = 'Saisissez le nom complet (2 caractères minimum).'
    else if (name.length > 120) e.full_name = 'Le nom ne doit pas dépasser 120 caractères.'
    if (!values.phone.trim()) e.phone = 'Le numéro de téléphone est obligatoire.'
    else if (!isValidPhone(values.phone)) e.phone = 'Numéro invalide. Exemple : 22 345 678 ou +216 22 345 678.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function submit(ev) {
    ev.preventDefault()
    if (busy || !validate()) return
    onSubmit({
      full_name: values.full_name.trim(),
      phone: normalizePhone(values.phone),
      notes: values.notes.trim() || null,
    })
  }

  return (
    <form onSubmit={submit} noValidate className="panel space-y-6 p-6 sm:p-8">
      <div>
        <label htmlFor="full_name" className="field-label">Nom complet</label>
        <input
          id="full_name"
          className="input"
          autoComplete="off"
          value={values.full_name}
          onChange={set('full_name')}
          aria-invalid={Boolean(errors.full_name)}
          aria-describedby={errors.full_name ? 'full_name-err' : undefined}
          autoFocus
        />
        {errors.full_name && <p id="full_name-err" className="field-error">{errors.full_name}</p>}
      </div>

      <div>
        <label htmlFor="phone" className="field-label">Téléphone</label>
        <input
          id="phone"
          className="input"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={values.phone}
          onChange={set('phone')}
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? 'phone-err' : 'phone-hint'}
        />
        {errors.phone ? (
          <p id="phone-err" className="field-error">{errors.phone}</p>
        ) : (
          <p id="phone-hint" className="field-hint">Sert à retrouver le client à chaque visite. Un numéro par client.</p>
        )}
      </div>

      <div>
        <label htmlFor="notes" className="field-label">
          Notes <span className="font-normal text-smoke">(facultatif)</span>
        </label>
        <textarea id="notes" rows={3} className="input" value={values.notes} onChange={set('notes')} placeholder="Coupe habituelle, préférences…" />
      </div>

      {serverError && <p className="rounded-[var(--radius-control)] border border-rust/40 bg-rust/10 px-4 py-3 text-sm text-rust" role="alert">{serverError}</p>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Annuler</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy && <Spinner className="size-4 text-current" />}
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
