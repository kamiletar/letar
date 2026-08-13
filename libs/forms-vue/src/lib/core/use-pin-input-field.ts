export type PinInputCharType = 'numeric' | 'alphanumeric' | 'alphabetic'

export interface UsePinInputFieldOptions {
  count: number
  type?: PinInputCharType
  getValue: () => string
  onValueChange: (value: string) => void
  onComplete?: (value: string) => void
}

export interface UsePinInputFieldResult {
  setInputRef: (index: number) => (el: unknown) => void
  handleInput: (index: number) => (event: Event) => void
  handleKeydown: (index: number) => (event: KeyboardEvent) => void
  handlePaste: (index: number) => (event: ClipboardEvent) => void
}

const PATTERNS: Record<PinInputCharType, RegExp> = {
  numeric: /[0-9]/,
  alphanumeric: /[a-zA-Z0-9]/,
  alphabetic: /[a-zA-Z]/,
}

/** Раскладывает строковое значение поля по ячейкам, дополняя пустыми строками до `count`. */
export function splitPinChars(value: string, count: number): string[] {
  const arr = value.split('').slice(0, count)
  while (arr.length < count) {
    arr.push('')
  }
  return arr
}

/**
 * Composable для PIN/OTP-полей — общий для `FieldPinInput` и `FieldOTPInput`, обоих Vue-пакетов
 * (headless рендерит напрямую, `forms-vue-shadcn` переиспользует этот же composable через
 * `@letar/forms-vue/core`, стилизуя разметку сама — тот же принцип, что `useMaskField`/
 * `useCreditCardField`). Разметка (N ячеек `<input maxlength="1">`) — Vue-идиоматичная
 * реализация без Ark UI-подобного compound-компонента: клавиатурная навигация и paste-разбор
 * тут, стили и DOM — на стороне поля.
 *
 * ⚠️ Отображаемое значение поле обязано брать из `field.state.value` (реактивный объект
 * `withFieldValidation`), а не заново дергать `options.getValue()` в `computed` — `getValue`
 * здесь читает `form.getFieldValue`, который не является Vue-реактивным источником (как и в
 * `useMaskField`, где по этой же причине источник истины для `'live'`-режима — DOM, а не
 * computed). `getValue()` используется только внутри обработчиков, чтобы синхронно прочитать
 * актуальное значение в момент события — это не завязано на реактивность рендера.
 */
export function usePinInputField(options: UsePinInputFieldOptions): UsePinInputFieldResult {
  const { count, type = 'numeric', getValue, onValueChange, onComplete } = options
  const pattern = PATTERNS[type]
  const inputs: (HTMLInputElement | null)[] = []

  function commit(next: string[]) {
    const joined = next.join('')
    onValueChange(joined)
    if (joined.length === count && next.every((c) => c !== '')) {
      onComplete?.(joined)
    }
  }

  function setInputRef(index: number) {
    return (el: unknown) => {
      inputs[index] = (el as HTMLInputElement | null) ?? null
    }
  }

  function handleInput(index: number) {
    return (event: Event) => {
      const target = event.target as HTMLInputElement
      // Берём последний допустимый символ — покрывает и обычный ввод, и перезапись заполненной ячейки.
      const filtered = target.value.split('').filter((c) => pattern.test(c))
      const char = filtered.length > 0 ? filtered[filtered.length - 1] : ''
      const next = splitPinChars(getValue(), count)
      next[index] = char
      target.value = char
      commit(next)
      if (char && index < count - 1) {
        inputs[index + 1]?.focus()
      }
    }
  }

  function handleKeydown(index: number) {
    return (event: KeyboardEvent) => {
      if (event.key === 'Backspace') {
        const next = splitPinChars(getValue(), count)
        if (next[index]) {
          next[index] = ''
          commit(next)
          return
        }
        if (index > 0) {
          next[index - 1] = ''
          commit(next)
          inputs[index - 1]?.focus()
        }
        return
      }
      if (event.key === 'ArrowLeft' && index > 0) {
        inputs[index - 1]?.focus()
      }
      if (event.key === 'ArrowRight' && index < count - 1) {
        inputs[index + 1]?.focus()
      }
    }
  }

  function handlePaste(index: number) {
    return (event: ClipboardEvent) => {
      event.preventDefault()
      const pasted = event.clipboardData?.getData('text') ?? ''
      const filtered = pasted.split('').filter((c) => pattern.test(c))
      const next = splitPinChars(getValue(), count)
      for (let i = 0; i < filtered.length && index + i < count; i++) {
        next[index + i] = filtered[i]
      }
      commit(next)
      inputs[Math.min(index + filtered.length, count - 1)]?.focus()
    }
  }

  return { setInputRef, handleInput, handleKeydown, handlePaste }
}
