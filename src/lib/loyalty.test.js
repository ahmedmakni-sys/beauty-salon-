import { describe, it, expect } from 'vitest'
import { ruleForPosition, predictNextVisit, describeProgress, progressLabel, CYCLE_LENGTH } from './loyalty'

// Simule un client sur plusieurs cycles, comme le fait register_visit().
function simulate(visits, price = 15) {
  let pos = 0
  const out = []
  for (let i = 0; i < visits; i++) {
    const v = predictNextVisit(pos, price)
    out.push(v)
    pos = v.type === 'free' ? 0 : v.position
  }
  return { out, pos }
}

describe('programme de fidélité', () => {
  it('les 5 premières coupes sont payées, sans récompense', () => {
    const { out } = simulate(5)
    expect(out.every((v) => v.type === 'paid' && v.discount === 0)).toBe(true)
  })

  it('la 6e coupe a exactement 10 DT de remise', () => {
    const { out } = simulate(6)
    expect(out[5]).toMatchObject({ type: 'discount', discount: 10, toPay: 5 })
  })

  it('les 10 coupes suivantes sont payées', () => {
    const { out } = simulate(16)
    expect(out.slice(6, 16).every((v) => v.type === 'paid')).toBe(true)
  })

  it('la 11e coupe de la deuxième étape est offerte, une seule fois', () => {
    const { out, pos } = simulate(17)
    expect(out[16]).toMatchObject({ type: 'free', toPay: 0 })
    expect(out.filter((v) => v.type === 'free')).toHaveLength(1)
    expect(pos).toBe(0)
  })

  it('un nouveau cycle recommence correctement', () => {
    const { out } = simulate(CYCLE_LENGTH * 2)
    expect(out.filter((v) => v.type === 'discount')).toHaveLength(2)
    expect(out.filter((v) => v.type === 'free')).toHaveLength(2)
    expect(out[CYCLE_LENGTH + 5].type).toBe('discount')
  })

  it('la remise ne dépasse jamais le prix', () => {
    expect(predictNextVisit(5, 8)).toMatchObject({ discount: 8, toPay: 0 })
  })

  it('positions invalides', () => {
    expect(ruleForPosition(0)).toBeNull()
    expect(ruleForPosition(18)).toBeNull()
  })

  it('libellés de progression', () => {
    expect(progressLabel(0)).toBe('Encore 5 coupes avant la remise de 10 DT')
    expect(progressLabel(5)).toBe('Prochaine coupe : remise de 10 DT')
    expect(progressLabel(6)).toBe('Encore 10 coupes avant la coupe offerte')
    expect(progressLabel(15)).toBe('Encore 1 coupe avant la coupe offerte')
    expect(progressLabel(16)).toBe('Prochaine coupe offerte')
    expect(describeProgress(16)).toMatchObject({ stage: 2, rewardReady: true })
  })
})
