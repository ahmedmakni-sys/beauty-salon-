// Règles du programme de fidélité.
// IMPORTANT : ce fichier sert uniquement à l'AFFICHAGE (aperçu, progression).
// Le calcul qui fait foi est fait dans PostgreSQL par register_visit().

export const STAGE_ONE_PAID = 5 // 5 coupes payées
export const DISCOUNT_POSITION = 6 // 6e coupe : remise
export const STAGE_TWO_PAID = 10 // 10 coupes payées après la remise
export const FREE_POSITION = 17 // 6 + 11 : coupe offerte
export const CYCLE_LENGTH = FREE_POSITION
export const DISCOUNT_AMOUNT = 10

/** Nature de la n-ième coupe du cycle (1..17). */
export function ruleForPosition(position) {
  if (!Number.isInteger(position) || position < 1 || position > CYCLE_LENGTH) return null
  if (position === DISCOUNT_POSITION) return 'discount'
  if (position === FREE_POSITION) return 'free'
  return 'paid'
}

/** Ce que sera la prochaine coupe d'un client, d'après sa position actuelle (0..16). */
export function predictNextVisit(cyclePosition, haircutPrice) {
  const position = cyclePosition + 1
  const type = ruleForPosition(position)
  const price = Number(haircutPrice) || 0
  let discount = 0
  if (type === 'discount') discount = Math.min(DISCOUNT_AMOUNT, price)
  if (type === 'free') discount = price
  return { position, type, price, discount, toPay: price - discount }
}

/** Progression lisible pour un client. */
export function describeProgress(cyclePosition) {
  const p = cyclePosition
  if (p < DISCOUNT_POSITION) {
    const paidDone = p
    return {
      stage: 1,
      done: paidDone,
      target: STAGE_ONE_PAID,
      nextReward: 'discount',
      remaining: Math.max(STAGE_ONE_PAID - paidDone, 0),
      rewardReady: p === STAGE_ONE_PAID,
    }
  }
  const paidDone = p - DISCOUNT_POSITION
  return {
    stage: 2,
    done: paidDone,
    target: STAGE_TWO_PAID,
    nextReward: 'free',
    remaining: Math.max(STAGE_TWO_PAID - paidDone, 0),
    rewardReady: p === FREE_POSITION - 1,
  }
}

/** Texte court : "Encore 2 coupes avant la remise de 10 DT". */
export function progressLabel(cyclePosition) {
  const d = describeProgress(cyclePosition)
  const reward = d.nextReward === 'discount' ? 'la remise de 10 DT' : 'la coupe offerte'
  if (d.rewardReady) {
    return d.nextReward === 'discount' ? 'Prochaine coupe : remise de 10 DT' : 'Prochaine coupe offerte'
  }
  return `Encore ${d.remaining} coupe${d.remaining > 1 ? 's' : ''} avant ${reward}`
}

/** Clients à qui il reste 1 ou 2 coupes avant une récompense, ou dont la récompense est due. */
export const NEAR_REWARD_POSITIONS = [3, 4, 5, 14, 15, 16]

export const VISIT_TYPE_LABELS = {
  paid: 'Coupe payée',
  discount: 'Remise 10 DT',
  free: 'Coupe offerte',
}

export const REWARD_TYPE_LABELS = {
  discount_10: 'Remise de 10 DT',
  free_haircut: 'Coupe offerte',
}
