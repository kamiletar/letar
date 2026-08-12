import { describe, expect, it } from 'vitest'
import { caretBoundary } from './caret'
import { format } from './parts'

describe('caretBoundary', () => {
  it('допускает все позиции, когда между input-символами не больше одного литерала подряд', () => {
    const mask = '999-999'
    const value = format('770123', mask) // "770-123"
    const boundary = caretBoundary(value, mask)

    expect(value).toBe('770-123')
    expect(boundary).toHaveLength(value.length + 1)
    // одиночный литерал '-' между двумя input-символами примыкает к обоим —
    // запрещённых позиций тут нет в принципе
    expect(boundary.every(Boolean)).toBe(true)
  })

  it('запрещает позицию строго между двумя литералами подряд', () => {
    // "+7 (" — между '(' и первой цифрой позиция допустима (рядом с input),
    // но между '+' и '7' (оба литералы) — недопустима
    const value = format('9', '+7 (999) 999-99-99') // "+7 (9"
    const boundary = caretBoundary(value, '+7 (999) 999-99-99')
    // индексы: 0:перед+ 1:после+/до7 2:после7/до-пробела 3:после пробела/до( 4:после(/до9 5:конец(после 9)
    expect(boundary[1]).toBe(false) // между '+' и '7' — оба литералы
    expect(boundary[4]).toBe(true) // перед input-символом '9' — допустимо
    expect(boundary[5]).toBe(true) // конец строки
  })

  it('переопределяется через options.caretBoundary', () => {
    const custom = () => [true, true]
    const boundary = caretBoundary('12', '99', { caretBoundary: custom })
    expect(boundary).toEqual([true, true])
  })
})
