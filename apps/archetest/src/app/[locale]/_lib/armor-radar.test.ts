import { describe, expect, it } from 'vitest'
import { ARMOR_RADAR_THRESHOLD, computeArmorRadar } from './armor-radar'

describe('computeArmorRadar', () => {
  it('высокая броня + высокий радар → «Громоотвод»', () => {
    const idx = computeArmorRadar(80, 75)
    expect(idx.quadrant).toBe('lightning-rod')
    expect(idx.label).toBe('Громоотвод')
    expect(idx.labelEn).toBe('Lightning Rod')
    expect(idx.physical).toBe(80)
    expect(idx.affective).toBe(75)
  })

  it('высокая броня + низкий радар → «Крепость»', () => {
    expect(computeArmorRadar(80, 20).quadrant).toBe('fortress')
  })

  it('низкая броня + высокий радар → «Оголённый нерв»', () => {
    expect(computeArmorRadar(20, 80).quadrant).toBe('bare-nerve')
  })

  it('низкая броня + низкий радар → «Ровный фон»', () => {
    expect(computeArmorRadar(10, 15).quadrant).toBe('even')
  })

  it('порог включающий: ровно 50 по обеим осям → «Громоотвод»', () => {
    expect(computeArmorRadar(ARMOR_RADAR_THRESHOLD, ARMOR_RADAR_THRESHOLD).quadrant).toBe('lightning-rod')
    // чуть ниже порога по одной оси уводит из lightning-rod
    expect(computeArmorRadar(49.9, 50).quadrant).toBe('bare-nerve')
    expect(computeArmorRadar(50, 49.9).quadrant).toBe('fortress')
  })

  it('кастомный порог учитывается', () => {
    expect(computeArmorRadar(65, 65, 70).quadrant).toBe('even')
    expect(computeArmorRadar(75, 75, 70).quadrant).toBe('lightning-rod')
  })

  it('каждый квадрант заполнен на обоих языках', () => {
    for (
      const [p, a] of [
        [80, 80],
        [80, 20],
        [20, 80],
        [10, 10],
      ]
    ) {
      const idx = computeArmorRadar(p, a)
      for (
        const field of [
          idx.label,
          idx.labelEn,
          idx.description,
          idx.descriptionEn,
          idx.attention,
          idx.attentionEn,
        ]
      ) {
        expect(field, `квадрант ${idx.quadrant}`).toBeTruthy()
      }
    }
  })
})
