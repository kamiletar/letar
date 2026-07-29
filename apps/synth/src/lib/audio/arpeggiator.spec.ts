import { describe, expect, it } from 'vitest'
import { buildArpOrder } from './arpeggiator'

describe('buildArpOrder', () => {
  it('пустой аккорд → пустой порядок', () => {
    expect(buildArpOrder([], 'up', 1)).toEqual([])
  })

  it('up: сортирует по возрастанию, растягивает на N октав', () => {
    expect(buildArpOrder([60, 55, 64], 'up', 1)).toEqual([55, 60, 64])
    expect(buildArpOrder([60, 64], 'up', 2)).toEqual([60, 64, 72, 76])
  })

  it('down: тот же набор, в обратном порядке', () => {
    expect(buildArpOrder([60, 55, 64], 'down', 1)).toEqual([64, 60, 55])
  })

  it('up-down: вверх, потом вниз без повтора крайних нот', () => {
    expect(buildArpOrder([60, 64, 67], 'up-down', 1)).toEqual([60, 64, 67, 64])
  })

  it('дедупликация зажатых нот — забота вызывающего кода (Arpeggiator.noteHeld), buildArpOrder только сортирует', () => {
    expect(buildArpOrder([60, 60, 64], 'up', 1)).toEqual([60, 60, 64])
  })
})
