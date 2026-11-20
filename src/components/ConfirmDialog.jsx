import { useEffect, useRef } from 'react'
import { Spinner } from './ui'

/**
 * Boîte de confirmation accessible (élément <dialog> natif :
 * focus piégé, touche Échap, fond inerte).
 */
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Annuler',
  tone = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onCancel()
      }}
      className="m-auto w-[min(92vw,30rem)] rounded-[var(--radius-panel)] border border-line bg-panel p-0 text-marble shadow-2xl backdrop:bg-black/70"
      aria-labelledby="confirm-title"
    >
      <div className="p-6">
        <h2 id="confirm-title" className="text-2xl">
          {title}
        </h2>
        <div className="mt-3 text-smoke">{children}</div>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-line p-4 sm:flex-row sm:justify-end">
        <button className="btn btn-ghost" onClick={onCancel} disabled={busy} autoFocus>
          {cancelLabel}
        </button>
        <button className={`btn ${tone === 'danger' ? 'btn-danger-solid' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
          {busy && <Spinner className="size-4 text-current" />}
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
