import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPlainTextController, type PlainTextController } from './plain-text-controller'

const controllers: PlainTextController[] = []
function make(text = '') {
  const element = document.createElement('div')
  document.body.append(element)
  const onChange = vi.fn()
  const onTransaction = vi.fn()
  const controller = createPlainTextController({ element, text, onChange, onTransaction })
  controllers.push(controller)
  return { controller, element, onChange, onTransaction }
}
afterEach(() => {
  controllers.splice(0).forEach((c) => c.destroy())
  document.body.innerHTML = ''
})

describe('plain-text controller', () => {
  it('сохраняет пробелы, строфы, переводы строк, emoji и литеральный HTML', () => {
    const text = '  Первая  строка\n\nВторая 🐈\n\n\n<b>не HTML</b>\n'
    const { controller, element } = make(text)
    expect(controller.getText()).toBe(text)
    expect(element.querySelector('b')).toBeNull()
    controller.setSelection(text.length)
    controller.insertText('—')
    expect(controller.getText()).toBe(text + '—')
    expect(controller.getSelection().from).toBe(text.length + 1)
  })
  it('замена выделения и повтор — один атомарный шаг с восстановлением selection', () => {
    const { controller, onTransaction } = make('Луна сияет')
    controller.setSelection(5, 10)
    controller.insertText('—')
    expect(controller.getText()).toBe('Луна —')
    expect(controller.canUndo()).toBe(true)
    controller.undo()
    expect(controller.getText()).toBe('Луна сияет')
    expect(controller.getSelection()).toMatchObject({ from: 5, to: 10, textSelected: 'сияет' })
    controller.redo()
    expect(controller.getText()).toBe('Луна —')
    expect(onTransaction.mock.lastCall?.[0].origin).toBe('redo')
  })
  it('новая правка после undo очищает redo, сохранение равного значения не очищает историю', () => {
    const { controller } = make('А')
    controller.setSelection(1)
    controller.insertText('Б')
    controller.replaceText('АБ')
    expect(controller.canUndo()).toBe(true)
    controller.undo()
    controller.insertText('В')
    expect(controller.canRedo()).toBe(false)
  })
  it('внешнее восстановление отменяется целиком, baseline начинает новую историю', () => {
    const { controller } = make('Исходный')
    controller.replaceText('Восстановленный\nтекст')
    controller.undo()
    expect(controller.getText()).toBe('Исходный')
    controller.replaceText('Локальный черновик', { baseline: true })
    expect(controller.getText()).toBe('Локальный черновик')
    expect(controller.canUndo()).toBe(false)
  })
  it('вставка из clipboard берёт только text/plain и не создаёт разметку', () => {
    const { controller, element } = make('')
    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', {
      value: { getData: (kind: string) => kind === 'text/plain' ? 'Строка\n\n<b>текст</b>' : '<img src=x>' },
    })
    element.querySelector('[contenteditable]')!.dispatchEvent(event)
    expect(controller.getText()).toBe('Строка\n\n<b>текст</b>')
    expect(element.querySelector('img')).toBeNull()
  })
  it('мобильный beforeinput Enter сохраняет пустые строки и не отправляет форму', () => {
    const { controller, element } = make('Начало')
    controller.setSelection(6)
    const target = element.querySelector('[contenteditable]')!
    for (let i = 0; i < 2; i++) {
      target.dispatchEvent(
        new InputEvent('beforeinput', { inputType: 'insertParagraph', bubbles: true, cancelable: true }),
      )
    }
    expect(controller.getText()).toBe('Начало\n\n')
  })
  it('отмена клавиатурой и native beforeinput идут через ту же историю', () => {
    const { controller, element } = make('Луна')
    controller.setSelection(4)
    controller.insertText('—')
    const target = element.querySelector('[contenteditable]')!
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }))
    expect(controller.getText()).toBe('Луна')
    target.dispatchEvent(new InputEvent('beforeinput', { inputType: 'historyRedo', bubbles: true, cancelable: true }))
    expect(controller.getText()).toBe('Луна—')
  })
  it('не публикует промежуточную composition в форму', async () => {
    const { controller, element, onChange } = make('')
    const target = element.querySelector('[contenteditable]')!
    target.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    element.querySelector('[data-plain-text]')!.textContent = 'あ'
    target.dispatchEvent(
      new InputEvent('input', { inputType: 'insertCompositionText', data: 'あ', bubbles: true, isComposing: true }),
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onChange).not.toHaveBeenCalled()
    expect(controller.insertText('—')).toBe(false)
    target.dispatchEvent(new CompositionEvent('compositionend', { data: 'あ', bubbles: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(controller.getText()).toBe('あ')
    expect(onChange).toHaveBeenLastCalledWith('あ')
  })
  it('переносит session между экземплярами без сериализации и сохраняет историю/курсор', () => {
    const first = make('Луна').controller
    first.setSelection(4)
    first.insertText('—')
    const session = first.captureSession()
    first.destroy()
    const { controller: second } = make('Луна—')
    expect(second.restoreSession(session)).toBe(true)
    expect(second.getSelection().from).toBe(5)
    second.undo()
    expect(second.getText()).toBe('Луна')
    second.redo()
    expect(second.getText()).toBe('Луна—')
    second.replaceText('Новое')
    second.undo()
    expect(second.getText()).toBe('Луна—')
    second.insertText('!')
    expect(second.getText()).toBe('Луна—!')
    expect(second.restoreSession({ state: {} })).toBe(false)
  })
  it('длинный текст не обрезается, вставка и undo сохраняют все символы', () => {
    const text = 'Строка\n'.repeat(14285) + 'Конец'
    const { controller } = make(text)
    controller.setSelection(50000)
    controller.insertText('—')
    expect(controller.getText()).toBe(text.slice(0, 50000) + '—' + text.slice(50000))
    controller.undo()
    expect(controller.getText()).toBe(text)
  })
})
