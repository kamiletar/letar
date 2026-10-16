import { describe, expect, it } from 'vitest'
import { buildResultReport } from './result-report'

describe('Полный отчёт результатов', () => {
  it('включает все 27 шкал и отличает отсутствие ответов от честного нуля', () => {
    const rows = buildResultReport({ scores: { INA: 0, HYI: 70 }, relevantCounts: { INA: 3, HYI: 0 }, locale: 'ru' })
    expect(rows).toHaveLength(27)
    expect(rows.find((r) => r.code === 'INA')).toMatchObject({ score: 0, answered: 3 })
    expect(rows.find((r) => r.code === 'HYI')).toMatchObject({ score: null, answered: 0, practices: [] })
    expect(rows.find((r) => r.code === 'HON')?.score).toBeNull()
  })

  it('использует текущие переводы описаний и практик, без клинических ярлыков для пользователя', () => {
    const ru = buildResultReport({ scores: { INA: 67.5 }, locale: 'ru' }).find((r) => r.code === 'INA')!
    const en = buildResultReport({ scores: { INA: 67.5 }, locale: 'en', showClinical: true }).find((r) =>
      r.code === 'INA'
    )!
    expect(ru.score).toBe(67.5)
    expect(ru.description).not.toBe(en.description)
    expect(ru.practices).toHaveLength(2)
    expect(ru.clinical).toBeNull()
    expect(en.clinical).toBeTruthy()
    expect(ru.practices[0]).not.toBe(en.practices[0])
    expect(ru.answered).toBeNull()
  })

  it('не интерпретирует отсутствующий, нечисловой или выходящий за диапазон результат', () => {
    const rows = buildResultReport({ scores: { INA: NaN, HYI: Infinity, AAX: -1, AAV: 101 }, locale: 'en' })
    expect(rows.every((r) => r.score === null && r.practices.length === 0)).toBe(true)
  })

  it('без счётчика не принимает нулевую заглушку старого предпросмотра за результат', () => {
    const row = buildResultReport({ scores: { INA: 0 }, locale: 'ru' }).find((r) => r.code === 'INA')!
    expect(row.score).toBeNull()
    expect(row.practices).toHaveLength(0)
  })
})
