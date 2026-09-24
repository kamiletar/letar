/**
 * Тесты сравнения текстов вопроса «БД ↔ дамп» для режима `seed-questions.ts --sync-texts`.
 * Инвариант: синхронизация меняет только формулировки, баллы и структура вариантов неприкосновенны.
 */
import { describe, expect, it } from 'vitest'
import { diffQuestionTexts, planTextSync, type QuestionTexts } from '../../../../scripts/sync-texts-lib'

function q(overrides: Partial<QuestionTexts> = {}, options?: unknown[]): QuestionTexts {
  return {
    id: 'q1',
    scenario: 'Сценарий',
    scenarioEn: 'Сценарий',
    options: JSON.stringify(
      options ?? [
        { text: 'Да', textEn: 'Да', scoring: { PAR: 3, AVD: 1 } },
        { text: 'Нет', textEn: 'Нет', scoring: { SZD: 3 } },
      ],
    ),
    ...overrides,
  }
}

describe('diffQuestionTexts', () => {
  it('одинаковые записи — unchanged', () => {
    expect(diffQuestionTexts(q(), q()).kind).toBe('unchanged')
  })

  it('разный порядок ключей в JSON вариантов при тех же значениях — unchanged', () => {
    const reordered = q({}, [
      { scoring: { AVD: 1, PAR: 3 }, textEn: 'Да', text: 'Да' },
      { textEn: 'Нет', scoring: { SZD: 3 }, text: 'Нет' },
    ])
    expect(diffQuestionTexts(q(), reordered).kind).toBe('unchanged')
  })

  it('новый английский текст сценария и вариантов — update со списком полей', () => {
    const next = q({ scenarioEn: 'Scenario' }, [
      { text: 'Да', textEn: 'Yes', scoring: { PAR: 3, AVD: 1 } },
      { text: 'Нет', textEn: 'No', scoring: { SZD: 3 } },
    ])
    const diff = diffQuestionTexts(q(), next)
    expect(diff.kind).toBe('update')
    if (diff.kind !== 'update') { return }
    expect(diff.changedFields).toEqual(['scenarioEn', 'options[0].textEn', 'options[1].textEn'])
    expect(diff.data.scenarioEn).toBe('Scenario')
    expect(diff.data.options).toBe(next.options)
  })

  it('правка русской формулировки — тоже update (вердикт «Править» без баллов)', () => {
    const diff = diffQuestionTexts(q(), q({ scenario: 'Новый сценарий' }))
    expect(diff.kind).toBe('update')
  })

  it('изменение баллов — reject', () => {
    const next = q({}, [
      { text: 'Да', textEn: 'Yes', scoring: { PAR: 2, AVD: 1 } },
      { text: 'Нет', textEn: 'No', scoring: { SZD: 3 } },
    ])
    const diff = diffQuestionTexts(q(), next)
    expect(diff.kind).toBe('reject')
    if (diff.kind === 'reject') { expect(diff.reason).toMatch(/options\[0\]\.scoring/) }
  })

  it('новая шкала в баллах варианта — reject', () => {
    const next = q({}, [
      { text: 'Да', textEn: 'Да', scoring: { PAR: 3, AVD: 1, BOR: 1 } },
      { text: 'Нет', textEn: 'Нет', scoring: { SZD: 3 } },
    ])
    expect(diffQuestionTexts(q(), next).kind).toBe('reject')
  })

  it('переставленные варианты — reject (баллы привязаны к позиции)', () => {
    const swapped = q({}, [
      { text: 'Нет', textEn: 'Нет', scoring: { SZD: 3 } },
      { text: 'Да', textEn: 'Да', scoring: { PAR: 3, AVD: 1 } },
    ])
    expect(diffQuestionTexts(q(), swapped).kind).toBe('reject')
  })

  it('другое число вариантов — reject', () => {
    const shorter = q({}, [{ text: 'Да', textEn: 'Да', scoring: { PAR: 3, AVD: 1 } }])
    expect(diffQuestionTexts(q(), shorter).kind).toBe('reject')
  })

  it('незнакомое поле в варианте — reject', () => {
    const extra = q({}, [
      { text: 'Да', textEn: 'Да', scoring: { PAR: 3, AVD: 1 }, weight: 2 },
      { text: 'Нет', textEn: 'Нет', scoring: { SZD: 3 } },
    ])
    expect(diffQuestionTexts(q(), extra).kind).toBe('reject')
  })

  it('разные id — ошибка вызова', () => {
    expect(() => diffQuestionTexts(q(), q({ id: 'q2' }))).toThrow()
  })
})

describe('planTextSync', () => {
  it('раскладывает дамп на обновления, отказы и отсутствующие в БД', () => {
    const db = [q(), q({ id: 'q2' }), q({ id: 'q3' })]
    const dump = [
      q({ scenarioEn: 'Scenario' }),
      q({ id: 'q2' }),
      q({ id: 'q3' }, [
        { text: 'Да', textEn: 'Да', scoring: { PAR: 1 } },
        { text: 'Нет', textEn: 'Нет', scoring: { SZD: 3 } },
      ]),
      q({ id: 'q4' }),
    ]
    const plan = planTextSync(db, dump)
    expect(plan.updates.map((u) => u.id)).toEqual(['q1'])
    expect(plan.rejects.map((r) => r.id)).toEqual(['q3'])
    expect(plan.missingInDb).toEqual(['q4'])
    expect(plan.unchanged).toBe(1)
  })
})
