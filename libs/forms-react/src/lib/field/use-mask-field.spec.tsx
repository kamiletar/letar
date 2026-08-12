import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useMaskField, type UseMaskFieldOptions } from './use-mask-field'

const DEPT_MASK = '999-999'

/** Тонкая тестовая обёртка: держит raw-значение в состоянии, рендерит управляемый хуком `<input>`. */
function MaskFieldHarness(props: Partial<UseMaskFieldOptions> & { mask: UseMaskFieldOptions['mask'] }) {
  const [value, setValue] = useState(props.value ?? '')
  const { inputProps, onFocus, onBlur } = useMaskField({
    mask: props.mask,
    value,
    onValueChange: (raw) => {
      setValue(raw)
      props.onValueChange?.(raw)
    },
    formatMode: props.formatMode,
    onPasteMode: props.onPasteMode,
    onRejectedInput: props.onRejectedInput,
  })
  return <input aria-label="поле" {...inputProps} onFocus={onFocus} onBlur={onBlur} />
}

/** Обходит value-tracker React (иначе не различает наше присвоение `.value` и «настоящий» ввод). */
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set

function setNativeValue(el: HTMLInputElement, value: string): void {
  nativeInputValueSetter?.call(el, value)
}

/** jsdom не мутирует `.value` сам — воспроизводим то, что сделал бы браузер, как в controller.spec.ts. */
function fireNativeEdit(
  el: HTMLInputElement,
  opts: { inputType: string; data?: string | null; caret: number; nextValue: string; nextCaret: number },
): void {
  el.setSelectionRange(opts.caret, opts.caret)
  fireEvent(
    el,
    new InputEvent('beforeinput', {
      inputType: opts.inputType,
      data: opts.data ?? null,
      bubbles: true,
      cancelable: true,
    }),
  )
  setNativeValue(el, opts.nextValue)
  el.setSelectionRange(opts.nextCaret, opts.nextCaret)
  fireEvent(el, new InputEvent('input', { inputType: opts.inputType, data: opts.data ?? null, bubbles: true }))
}

function typeChar(el: HTMLInputElement, char: string): void {
  const caret = el.selectionStart ?? el.value.length
  fireNativeEdit(el, {
    inputType: 'insertText',
    data: char,
    caret,
    nextValue: el.value.slice(0, caret) + char + el.value.slice(caret),
    nextCaret: caret + 1,
  })
}

describe('useMaskField', () => {
  describe('live (дефолт)', () => {
    it('наружу отдаётся сырое значение, в DOM — отформатированное', () => {
      const onValueChange = vi.fn()
      render(<MaskFieldHarness mask={DEPT_MASK} onValueChange={onValueChange} />)
      const input = screen.getByLabelText('поле') as HTMLInputElement

      for (const char of '770123') {
        typeChar(input, char)
      }

      expect(input.value).toBe('770-123')
      expect(onValueChange).toHaveBeenLastCalledWith('770123')
    })

    it('внешнее изменение value (например form.reset) переформатирует DOM', () => {
      const { rerender } = render(<MaskFieldHarnessControlled mask={DEPT_MASK} value="" />)
      const input = screen.getByLabelText('поле') as HTMLInputElement
      expect(input.value).toBe('')

      rerender(<MaskFieldHarnessControlled mask={DEPT_MASK} value="900123" />)
      expect(input.value).toBe('900-123')
    })

    it('onRejectedInput пробрасывается из MaskController наружу', () => {
      const onRejectedInput = vi.fn()
      render(<MaskFieldHarness mask={DEPT_MASK} onRejectedInput={onRejectedInput} />)
      const input = screen.getByLabelText('поле') as HTMLInputElement

      typeChar(input, 'a') // не цифра — DEPT_MASK допускает только '9'

      expect(onRejectedInput).toHaveBeenCalledWith('a')
    })
  })

  describe('mask: null — маски для этого значения нет', () => {
    it('поле работает как свободный ввод, MaskController не подключается', () => {
      const onValueChange = vi.fn()
      render(<MaskFieldHarness mask={() => null} onValueChange={onValueChange} />)
      const input = screen.getByLabelText('поле') as HTMLInputElement

      typeChar(input, 'x')

      // Без движка — beforeinput/input не перехватываются контроллером, значение поля
      // управляется React напрямую (контролируемый инпут при resolvedMask === null).
      expect(input.value).toBe('x')
      expect(onValueChange).toHaveBeenLastCalledWith('x')
    })
  })

  describe('formatMode: "blur"', () => {
    it('во время фокуса значение сырое, при потере фокуса — форматируется', () => {
      render(<MaskFieldHarness mask={DEPT_MASK} formatMode="blur" value="770123" />)
      const input = screen.getByLabelText('поле') as HTMLInputElement

      expect(input.value).toBe('770-123') // изначально не в фокусе

      fireEvent.focus(input)
      expect(input.value).toBe('770123')

      fireEvent.blur(input)
      expect(input.value).toBe('770-123')
    })
  })

  describe('formatMode: "off"', () => {
    it('фильтрует символы вне алфавита маски, но не группирует литералами', () => {
      const onValueChange = vi.fn()
      render(<MaskFieldHarness mask={DEPT_MASK} formatMode="off" onValueChange={onValueChange} />)
      const input = screen.getByLabelText('поле') as HTMLInputElement

      fireNativeEdit(input, { inputType: 'insertText', data: '7', caret: 0, nextValue: '7', nextCaret: 1 })
      expect(onValueChange).toHaveBeenLastCalledWith('7')
      expect(input.value).toBe('7') // без дефиса — 'off' не группирует
    })
  })
})

/** Полностью управляемая снаружи версия — для проверки внешней синхронизации `value`. */
function MaskFieldHarnessControlled({ mask, value }: { mask: UseMaskFieldOptions['mask']; value: string }) {
  const { inputProps, onFocus, onBlur } = useMaskField({ mask, value, onValueChange: () => {} })
  return <input aria-label="поле" {...inputProps} onFocus={onFocus} onBlur={onBlur} />
}
