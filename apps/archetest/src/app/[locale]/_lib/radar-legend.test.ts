import { describe, expect, it } from 'vitest'
import { groupLegendPoints } from './radar-legend'

const point = (code: string, value: number, lowConfidence = false) => ({ code, value, lowConfidence })

describe('groupLegendPoints', () => {
  it('сортирует черты по баллу от большего к меньшему', () => {
    const { traits } = groupLegendPoints([point('PAR', 13), point('SZD', 41), point('KAN', 61), point('SAD', 0)])
    expect(traits.map((p) => p.code)).toEqual(['KAN', 'SZD', 'PAR', 'SAD'])
  })

  it('выносит BAR и DPR в «Состояния», тоже по убыванию', () => {
    const { traits, states } = groupLegendPoints([point('DPR', 36), point('PAR', 13), point('BAR', 46)])
    expect(states.map((p) => p.code)).toEqual(['BAR', 'DPR'])
    expect(traits.map((p) => p.code)).toEqual(['PAR'])
  })

  it('черты с малым числом ответов — отдельным списком, тоже по убыванию', () => {
    const { traits, uncertain } = groupLegendPoints([
      point('PAR', 90, true),
      point('SZD', 41),
      point('KAN', 61),
      point('SAD', 5, true),
      point('ASD', 50, true),
    ])
    expect(traits.map((p) => p.code)).toEqual(['KAN', 'SZD'])
    expect(uncertain.map((p) => p.code)).toEqual(['PAR', 'ASD', 'SAD'])
  })

  it('состояния остаются в своей группе, даже если по ним мало ответов', () => {
    const { uncertain, states } = groupLegendPoints([point('BAR', 70, true), point('PAR', 10, true)])
    expect(states.map((p) => p.code)).toEqual(['BAR'])
    expect(uncertain.map((p) => p.code)).toEqual(['PAR'])
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

  it('без состояний и неуверенных шкал возвращает пустые группы', () => {
    const { states, uncertain } = groupLegendPoints([point('PAR', 5)])
    expect(states).toEqual([])
    expect(uncertain).toEqual([])
  })

  it('точки без флага lowConfidence считаются надёжными', () => {
    const { traits, uncertain } = groupLegendPoints([{ code: 'PAR', value: 5 }])
    expect(traits).toHaveLength(1)
    expect(uncertain).toHaveLength(0)
  })
})
