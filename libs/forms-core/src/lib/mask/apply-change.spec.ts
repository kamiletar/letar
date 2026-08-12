import { describe, expect, it } from 'vitest'
import { applyChange } from './apply-change'
import { format } from './parts'

const DEPT_MASK = '999-999' // код подразделения
const PHONE_MASK = '+7 (999) 999-99-99'

describe('applyChange', () => {
  it('посимвольный ввод в конец: каждый шаг наращивает значение и ставит каретку в конец', () => {
    let value = ''
    let caret = 0
    for (const digit of '770123') {
      const result = applyChange({
        previousValue: value,
        inputType: 'insert',
        addedValue: digit,
        changeStart: caret,
        changeEnd: caret,
        mask: DEPT_MASK,
      })
      value = result.value
      caret = result.selectionStart
    }
    expect(value).toBe(format('770123', DEPT_MASK))
    expect(caret).toBe(value.length)
  })

  it('вставка в середину: каретка встаёт сразу после вставленного символа, не в конец', () => {
    // "770-123" — вставляем '5' сразу после первой цифры (позиция 1)
    const result = applyChange({
      previousValue: '770-123',
      inputType: 'insert',
      addedValue: '5',
      changeStart: 1,
      changeEnd: 1,
      mask: DEPT_MASK,
    })
    expect(result.value).toBe('757-012')
    expect(result.selectionStart).toBe(2)
    expect(result.selectionEnd).toBe(2)
  })

  it('Backspace без выделения: удаляет ближайший input-символ слева, перескакивая литерал', () => {
    // Каретка сразу после '-' (позиция 4) — backspace должен снять '0', не сам '-'
    const result = applyChange({
      previousValue: '770-123',
      inputType: 'deleteBackward',
      addedValue: '',
      changeStart: 4,
      changeEnd: 4,
      mask: DEPT_MASK,
    })
    expect(result.value).toBe('771-23')
    // каретка — после последнего уцелевшего слева (второй '7', теперь на позиции 1)
    expect(result.selectionStart).toBe(2)
  })

  it('Delete без выделения: удаляет ближайший input-символ справа, перескакивая литерал', () => {
    // Каретка сразу перед '-' (позиция 3) — Delete должен снять '1' за литералом, не сам '-'
    const result = applyChange({
      previousValue: '770-123',
      inputType: 'deleteForward',
      addedValue: '',
      changeStart: 3,
      changeEnd: 3,
      mask: DEPT_MASK,
    })
    expect(result.value).toBe('770-23')
    // каретка — перед первым уцелевшим справа (перед литералом '-', раз '1' удалена)
    expect(result.selectionStart).toBe(3)
  })

  it('замена выделения: удаляет выбранный диапазон и вставляет новое значение одним изменением', () => {
    // Выделены средние 3 символа "0-1" (позиции 2..5) в "770-123", заменяем на "9"
    const result = applyChange({
      previousValue: '770-123',
      inputType: 'insert',
      addedValue: '9',
      changeStart: 2,
      changeEnd: 5,
      mask: DEPT_MASK,
    })
    // raw до: 770123. В выделенном диапазоне value[2..5) — два input-символа '0' и '1'
    // (литерал '-' не в raw) → raw становится 77 + 9(вставка) + 23 = 77923
    expect(result.value).toBe('779-23')
  })

  it('вставка без выделения в пустое поле — весь пасченный номер форматируется одним изменением', () => {
    const result = applyChange({
      previousValue: '',
      inputType: 'insert',
      addedValue: '9001234567',
      changeStart: 0,
      changeEnd: 0,
      mask: PHONE_MASK,
    })
    expect(result.value).toBe('+7 (900) 123-45-67')
    expect(result.selectionStart).toBe(result.value.length)
  })

  it('Backspace в самом начале (нечего удалять слева) — значение не меняется, каретка остаётся на месте', () => {
    const result = applyChange({
      previousValue: '770-123',
      inputType: 'deleteBackward',
      addedValue: '',
      changeStart: 0,
      changeEnd: 0,
      mask: DEPT_MASK,
    })
    expect(result.value).toBe('770-123')
    expect(result.selectionStart).toBe(0)
  })
})
