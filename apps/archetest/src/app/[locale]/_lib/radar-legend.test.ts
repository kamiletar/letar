import { describe, expect, it } from 'vitest'
import { groupLegendPoints } from './radar-legend'

const point = (code: string, value: number) => ({ code, value })

describe('groupLegendPoints', () => {
  it('сортирует черты по баллу от большего к меньшему', () => {
    const { traits } = groupLegendPoints([point('PAR', 13), point('SZD', 41), point('KAN', 61), point('SAD', 0)])
    expect(traits.map((p) => p.code)).toEqual(['KAN', 'SZD', 'PAR', 'SAD'])
  })

  it('выносит BAR и DPR в «Состояния», тоже по убыванию', () => {
    const { traits, states } = groupLegendPoints([
      point('DPR', 36),
      point('PAR', 13),
      point('BAR', 46),
    ])
    expect(states.map((p) => p.code)).toEqual(['BAR', 'DPR'])
    expect(traits.map((p) => p.code)).toEqual(['PAR'])
  })

  it('при равных баллах сохраняет исходный порядок шкал', () => {
    const { traits } = groupLegendPoints([point('HIS', 20), point('NAR', 20), point('DEP', 20), point('ANT', 30)])
    expect(traits.map((p) => p.code)).toEqual(['ANT', 'HIS', 'NAR', 'DEP'])
  })

  it('не мутирует исходный массив', () => {
    const input = [point('PAR', 1), point('SZD', 2)]
    groupLegendPoints(input)
    expect(input.map((p) => p.code)).toEqual(['PAR', 'SZD'])
  })

  it('без состояний возвращает пустую группу', () => {
    expect(groupLegendPoints([point('PAR', 5)]).states).toEqual([])
  })
})
