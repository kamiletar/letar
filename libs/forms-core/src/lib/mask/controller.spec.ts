import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MaskController } from './controller'

const DEPT_MASK = '999-999'
const PHONE_MASK = '+7 (999) 999-99-99'

/**
 * jsdom не симулирует реальный ввод (события не мутируют `.value` сами по себе) —
 * как и `@testing-library/user-event`, вручную выставляем `.value`/`selectionStart/End`
 * ДО диспатча события, чтобы смоделировать то, что сделал бы браузер.
 */
function fireNativeEdit(
  el: HTMLInputElement,
  opts: {
    inputType: string
    data?: string | null
    prevSelectionStart: number
    prevSelectionEnd: number
    nextValue: string
    nextCaret: number
  },
): void {
  el.setSelectionRange(opts.prevSelectionStart, opts.prevSelectionEnd)
  el.dispatchEvent(
    new InputEvent('beforeinput', {
      inputType: opts.inputType,
      data: opts.data ?? null,
      bubbles: true,
      cancelable: true,
    }),
  )
  el.value = opts.nextValue
  el.setSelectionRange(opts.nextCaret, opts.nextCaret)
  el.dispatchEvent(new InputEvent('input', { inputType: opts.inputType, data: opts.data ?? null, bubbles: true }))
}

function typeChar(el: HTMLInputElement, char: string): void {
  const caret = el.selectionStart ?? el.value.length
  fireNativeEdit(el, {
    inputType: 'insertText',
    data: char,
    prevSelectionStart: caret,
    prevSelectionEnd: caret,
    nextValue: el.value.slice(0, caret) + char + el.value.slice(caret),
    nextCaret: caret + 1,
  })
}

describe('MaskController', () => {
  let input: HTMLInputElement
  let controller: MaskController

  beforeEach(() => {
    input = document.createElement('input')
    input.type = 'text'
    document.body.appendChild(input)
  })

  afterEach(() => {
    controller?.detach()
    input.remove()
  })

  it('посимвольный ввод форматирует значение и ставит каретку в конец на каждом шаге', () => {
    controller = new MaskController(input, { mask: DEPT_MASK })
    controller.attach()

    for (const char of '770123') {
      typeChar(input, char)
    }

    expect(input.value).toBe('770-123')
    expect(controller.getValue()).toBe('770-123')
    expect(input.selectionStart).toBe('770-123'.length)
  })

  it('Backspace без выделения снимает ближайший input-символ слева, перескакивая литерал', () => {
    controller = new MaskController(input, { mask: DEPT_MASK })
    controller.attach()
    for (const char of '770123') {
      typeChar(input, char)
    }
    // Каретка сразу после '-' (позиция 4 в "770-123")
    fireNativeEdit(input, {
      inputType: 'deleteContentBackward',
      prevSelectionStart: 4,
      prevSelectionEnd: 4,
      nextValue: '770123'.slice(0, 2) + '123'.slice(1), // имитация: браузер снял бы литерал сам
      nextCaret: 3,
    })

    expect(input.value).toBe('771-23')
    expect(controller.getValue()).toBe('771-23')
  })

  it('правка в середине: вставленный символ раздвигает раскладку, каретка встаёт сразу за ним', () => {
    controller = new MaskController(input, { mask: DEPT_MASK })
    controller.attach()
    for (const char of '770123') {
      typeChar(input, char)
    }
    expect(input.value).toBe('770-123')

    fireNativeEdit(input, {
      inputType: 'insertText',
      data: '9',
      prevSelectionStart: 1,
      prevSelectionEnd: 1,
      nextValue: `${input.value.slice(0, 1)}9${input.value.slice(1)}`,
      nextCaret: 2,
    })

    expect(input.value).toBe('797-012')
    expect(controller.getValue()).toBe('797-012')
    expect(input.selectionStart).toBe(2)
  })

  it('выделить всё и заменить: вся строка уходит одним изменением, каретка — в конце', () => {
    controller = new MaskController(input, { mask: DEPT_MASK })
    controller.attach()
    for (const char of '770123') {
      typeChar(input, char)
    }
    expect(input.value).toBe('770-123')

    fireNativeEdit(input, {
      inputType: 'insertFromPaste',
      data: '456789',
      prevSelectionStart: 0,
      prevSelectionEnd: input.value.length,
      nextValue: '456789',
      nextCaret: 6,
    })

    expect(input.value).toBe('456-789')
    expect(controller.getValue()).toBe('456-789')
    expect(input.selectionStart).toBe('456-789'.length)
  })

  it('Redo (Ctrl+Shift+Z) возвращает отменённое изменение', () => {
    controller = new MaskController(input, { mask: DEPT_MASK })
    controller.attach()
    typeChar(input, '7')
    typeChar(input, '7')
    expect(controller.getValue()).toBe('77')

    input.dispatchEvent(new InputEvent('beforeinput', { inputType: 'historyUndo', bubbles: true, cancelable: true }))
    expect(controller.getValue()).toBe('7')

    input.dispatchEvent(new InputEvent('beforeinput', { inputType: 'historyRedo', bubbles: true, cancelable: true }))
    expect(controller.getValue()).toBe('77')
  })

  it('вставка из буфера в пустое поле форматирует номер одним изменением', () => {
    controller = new MaskController(input, { mask: PHONE_MASK })
    controller.attach()

    fireNativeEdit(input, {
      inputType: 'insertFromPaste',
      data: '9001234567',
      prevSelectionStart: 0,
      prevSelectionEnd: 0,
      nextValue: '9001234567',
      nextCaret: 10,
    })

    expect(input.value).toBe('+7 (900) 123-45-67')
    expect(controller.getValue()).toBe('+7 (900) 123-45-67')
  })

  it('автозаполнение без beforeinput (inputType не задан) переформатирует значение целиком', () => {
    controller = new MaskController(input, { mask: PHONE_MASK, onChange: () => {} })
    controller.attach()

    input.value = '9001234567'
    // Автозаполнение в реальном браузере часто не шлёт beforeinput вовсе
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))

    expect(input.value).toBe('+7 (900) 123-45-67')
    expect(controller.getValue()).toBe('+7 (900) 123-45-67')
  })

  it('Ctrl+Z откатывает последнее изменение', () => {
    controller = new MaskController(input, { mask: DEPT_MASK })
    controller.attach()
    typeChar(input, '7')
    typeChar(input, '7')
    expect(controller.getValue()).toBe('77')

    input.dispatchEvent(new InputEvent('beforeinput', { inputType: 'historyUndo', bubbles: true, cancelable: true }))

    expect(controller.getValue()).toBe('7')
    expect(input.value).toBe('7')
  })

  it('composition (IME): маска применяется только на compositionend', () => {
    controller = new MaskController(input, { mask: DEPT_MASK })
    controller.attach()

    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    // Промежуточные input-события во время композиции игнорируются
    input.value = '7'
    input.dispatchEvent(
      new InputEvent('input', { inputType: 'insertCompositionText', isComposing: true, bubbles: true }),
    )
    expect(controller.getValue()).toBe('') // маска ещё не применена

    input.value = '770123'
    input.dispatchEvent(new CompositionEvent('compositionend', { data: '770123', bubbles: true }))

    expect(controller.getValue()).toBe('770-123')
    expect(input.value).toBe('770-123')
  })

  it('onRejectedInput: символ, не подходящий ни под один токен маски, объявляется отдельно', () => {
    const rejected: string[] = []
    controller = new MaskController(input, { mask: DEPT_MASK, onRejectedInput: (r) => rejected.push(r) })
    controller.attach()
    typeChar(input, '7')
    typeChar(input, 'a') // не цифра — DEPT_MASK состоит только из токена '9'

    expect(rejected).toEqual(['a'])
    expect(controller.getValue()).toBe('7') // отвергнутый символ не попал в значение
  })

  it('onRejectedInput не срабатывает для принятого символа', () => {
    const rejected: string[] = []
    controller = new MaskController(input, { mask: DEPT_MASK, onRejectedInput: (r) => rejected.push(r) })
    controller.attach()
    typeChar(input, '7')

    expect(rejected).toEqual([])
  })

  it('onPasteMode: "reject" полностью блокирует вставку из буфера', () => {
    controller = new MaskController(input, { mask: DEPT_MASK, onPasteMode: 'reject' })
    controller.attach()
    typeChar(input, '7')

    input.dispatchEvent(
      new InputEvent('beforeinput', { inputType: 'insertFromPaste', data: '770123', bubbles: true, cancelable: true }),
    )
    // beforeinput отменён — input-события с этим pendingEdit не последует, значение не меняется
    expect(controller.getValue()).toBe('7')
  })

  it('setValue: программная установка форматирует и не создаёт точку в истории пользователя', () => {
    controller = new MaskController(input, { mask: DEPT_MASK })
    controller.attach()
    typeChar(input, '7') // undo-стек: [{ value: '' }] — «до» этой правки

    controller.setValue('9001234567') // мимо undo-стека — это не правка пользователя
    expect(controller.getValue()).toBe('900-123')

    input.dispatchEvent(new InputEvent('beforeinput', { inputType: 'historyUndo', bubbles: true, cancelable: true }))
    // setValue не добавила свою точку — Ctrl+Z продолжает историю пользователя, как будто
    // setValue не было, и возвращает к состоянию ДО ввода '7' (пустая строка)
    expect(controller.getValue()).toBe('')
  })
})
