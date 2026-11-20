import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, AlertTriangle, X } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const push = useCallback(
    (type, message) => {
      const id = crypto.randomUUID()
      setToasts((t) => [...t.slice(-2), { id, type, message }])
      setTimeout(() => dismiss(id), type === 'error' ? 7000 : 4000)
    },
    [dismiss],
  )

  const api = { success: (m) => push('success', m), error: (m) => push('error', m) }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed inset-x-4 bottom-20 z-[60] flex flex-col items-center gap-2 md:inset-x-auto md:right-6 md:bottom-6 md:items-end" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className="toast-in panel flex w-full max-w-sm items-start gap-3 px-4 py-3"
          >
            {t.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-sage" aria-hidden />
            ) : (
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rust" aria-hidden />
            )}
            <p className="flex-1 text-sm">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-smoke hover:text-marble" aria-label="Fermer la notification">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
