import { Loader2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { VISIT_TYPE_LABELS, REWARD_TYPE_LABELS } from '../lib/loyalty'

export function PageHeader({ title, description, actions }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl text-marble sm:text-[2.5rem]">{title}</h1>
        {description && <p className="mt-2 max-w-[60ch] text-smoke">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

export function Spinner({ className = 'size-5' }) {
  return <Loader2 className={`animate-spin text-brass ${className}`} aria-hidden />
}

export function LoadingBlock({ label = 'Chargement…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-smoke" role="status">
      <Spinner />
      <span>{label}</span>
    </div>
  )
}

export function ErrorBlock({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-14 text-center" role="alert">
      <AlertTriangle className="size-7 text-rust" aria-hidden />
      <p className="max-w-[52ch]">{message}</p>
      {onRetry && (
        <button className="btn btn-ghost" onClick={onRetry}>
          Réessayer
        </button>
      )}
    </div>
  )
}

export function EmptyBlock({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      {Icon && <Icon className="size-8 text-brass-deep" aria-hidden />}
      <p className="font-display text-xl">{title}</p>
      {text && <p className="max-w-[46ch] text-smoke">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

const visitStyles = {
  paid: 'border-line text-smoke',
  discount: 'border-brass/60 text-brass-bright bg-brass/10',
  free: 'border-sage/60 text-sage bg-sage/10',
}

export function VisitTypeBadge({ type }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.8125rem] font-semibold ${visitStyles[type]}`}>
      {VISIT_TYPE_LABELS[type]}
    </span>
  )
}

export function RewardTypeBadge({ type }) {
  const t = type === 'discount_10' ? 'discount' : 'free'
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.8125rem] font-semibold ${visitStyles[t]}`}>
      {REWARD_TYPE_LABELS[type]}
    </span>
  )
}

export function Pagination({ page, pageSize, count, onPage }) {
  const pages = Math.max(1, Math.ceil((count || 0) / pageSize))
  if (pages <= 1) return null
  return (
    <nav className="flex items-center justify-between gap-4 border-t border-line px-4 py-3 text-sm text-smoke" aria-label="Pagination">
      <span>
        Page {page + 1} sur {pages}
      </span>
      <div className="flex gap-2">
        <button className="btn btn-ghost min-h-9 px-3" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="Page précédente">
          <ChevronLeft className="size-4" />
        </button>
        <button className="btn btn-ghost min-h-9 px-3" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)} aria-label="Page suivante">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  )
}
