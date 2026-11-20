import { Scissors, Gift, Percent } from 'lucide-react'
import { DISCOUNT_POSITION, FREE_POSITION, describeProgress, progressLabel } from '../lib/loyalty'

/**
 * Carte de fidélité à tampons : 17 cases pour un cycle complet.
 *   Ligne 1 : 5 coupes payées + case « −10 DT »
 *   Ligne 2 : 10 coupes payées + case « Offerte »
 * `position` = coupes déjà faites dans le cycle (0..16).
 * `highlight` = numéro de case à animer (tampon tout juste posé).
 */
export default function LoyaltyCard({ position, cycleNumber, highlight = null, compactTitle = false }) {
  const progress = describeProgress(position)
  const rowOne = Array.from({ length: DISCOUNT_POSITION }, (_, i) => i + 1)
  const rowTwo = Array.from({ length: FREE_POSITION - DISCOUNT_POSITION }, (_, i) => i + 1 + DISCOUNT_POSITION)

  return (
    <section
      className="panel relative overflow-hidden p-5 sm:p-6"
      aria-label={`Carte de fidélité : ${position} coupe${position > 1 ? 's' : ''} sur ${FREE_POSITION} dans le cycle ${cycleNumber}`}
    >
      <div className="pointer-events-none absolute inset-2 rounded-[10px] border border-brass-deep/40" aria-hidden />
      <div className="relative flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={compactTitle ? 'text-xl' : 'text-2xl'}>Carte de fidélité</h2>
        <p className="text-sm text-smoke">Cycle {cycleNumber}</p>
      </div>
      <p className="relative mt-1 text-brass-bright">
        {position >= FREE_POSITION ? 'Cycle terminé : la carte repart à zéro' : progressLabel(position)}
      </p>

      <div className="relative mt-5 space-y-5">
        <StampRow
          label="Étape 1 : 5 coupes, puis 10 DT de remise"
          slots={rowOne}
          position={position}
          highlight={highlight}
          active={progress.stage === 1}
        />
        <StampRow
          label="Étape 2 : 10 coupes, puis une coupe offerte"
          slots={rowTwo}
          position={position}
          highlight={highlight}
          active={progress.stage === 2}
        />
      </div>
    </section>
  )
}

function StampRow({ label, slots, position, highlight, active }) {
  return (
    <div>
      <p className={`mb-2 text-sm ${active ? 'text-marble' : 'text-smoke'}`}>{label}</p>
      <ol className="flex flex-wrap gap-2">
        {slots.map((n) => (
          <Stamp key={n} n={n} filled={n <= position} next={n === position + 1} isNew={n === highlight} />
        ))}
      </ol>
    </div>
  )
}

function Stamp({ n, filled, next, isNew }) {
  const reward = n === DISCOUNT_POSITION ? 'discount' : n === FREE_POSITION ? 'free' : null
  const size = reward ? 'h-10 min-w-[4.25rem] rounded-full px-3' : 'size-10 rounded-full'
  let tone
  if (filled) tone = 'bg-brass text-ink border-brass'
  else if (next) tone = 'border-brass-bright text-brass-bright border-dashed bg-brass/5'
  else tone = 'border-line text-[#6f665a]'

  const srText = reward === 'discount' ? 'remise de 10 DT' : reward === 'free' ? 'coupe offerte' : `coupe ${n}`
  const state = filled ? 'faite' : next ? 'prochaine' : 'à venir'

  return (
    <li
      className={`flex items-center justify-center gap-1.5 border-2 text-sm font-semibold ${size} ${tone} ${isNew ? 'stamp-new' : ''}`}
    >
      <span className="sr-only">
        {srText}, {state}
      </span>
      {reward === 'discount' && (
        <>
          <Percent className="size-4" aria-hidden />
          <span aria-hidden>−10</span>
        </>
      )}
      {reward === 'free' && (
        <>
          <Gift className="size-4" aria-hidden />
          <span aria-hidden>Offerte</span>
        </>
      )}
      {!reward && (filled ? <Scissors className="size-4" aria-hidden /> : <span aria-hidden className="font-display text-base">{n}</span>)}
    </li>
  )
}

/** Version compacte pour les tableaux : barre segmentée de 17 traits. */
export function LoyaltyMeter({ position }) {
  return (
    <div className="flex items-center gap-[3px]" role="img" aria-label={`${position} sur ${FREE_POSITION} : ${progressLabel(position)}`}>
      {Array.from({ length: FREE_POSITION }, (_, i) => {
        const n = i + 1
        const reward = n === DISCOUNT_POSITION || n === FREE_POSITION
        const filled = n <= position
        return (
          <span
            key={n}
            className={`h-2.5 rounded-sm ${reward ? 'w-3' : 'w-1.5'} ${
              filled ? 'bg-brass' : reward ? 'border border-brass-deep bg-transparent' : 'bg-line'
            }`}
          />
        )
      })}
    </div>
  )
}
