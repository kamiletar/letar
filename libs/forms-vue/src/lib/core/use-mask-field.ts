import { format, MaskController, type MaskOptions, unformat } from '@letar/forms-core/mask'
import { onBeforeUnmount, type Ref, ref, type VNodeRef, watch } from 'vue'

export type MaskFieldFormatMode = 'live' | 'blur' | 'off'

/** `string[]` — берётся вариант, под который сырое значение раскладывается лучше остальных. */
export type MaskFieldMask = string | string[] | ((raw: string) => string | null)

export interface UseMaskFieldOptions {
  mask: MaskFieldMask
  /** Геттер сырого значения поля (`() => field.state.value`) — не `Ref`, композабл сам следит за изменениями. */
  getValue: () => string
  onValueChange: (raw: string) => void
  formatMode?: MaskFieldFormatMode
  maskOptions?: MaskOptions
  onPasteMode?: 'normalize' | 'reject'
  onRejectedInput?: (rejected: string) => void
}

export interface UseMaskFieldResult {
  /** `true` в `'live'` — рендерить `<input ref={inputRef}>` БЕЗ `value`/`onInput` (см. модуль doc). */
  uncontrolled: boolean
  /** Отображаемое значение для контролируемых режимов (`'blur'`/`'off'`) — для `'live'` не используется. */
  displayValue: Ref<string>
  /** Функциональный ref для `<input>` — `h('input', { ref: inputRef, ... })`. Только для `'live'`. */
  inputRef: VNodeRef
  /** `onInput`-обработчик для контролируемых режимов. */
  onInput: (event: Event) => void
  onFocus: () => void
  onBlur: () => void
}

function resolveMask(mask: MaskFieldMask, raw: string, options: MaskOptions | undefined): string | null {
  if (typeof mask === 'function') {
    return mask(raw)
  }
  if (Array.isArray(mask)) {
    if (mask.length === 0) {
      return null
    }
    let best = mask[0]
    let bestScore = -1
    for (const candidate of mask) {
      const score = unformat(raw, candidate, options).length
      if (score > bestScore) {
        bestScore = score
        best = candidate
      }
    }
    return best
  }
  return mask
}

/**
 * Vue-composable движка масок (`@letar/forms-core/mask`) — аналог React `useMaskField`
 * (`libs/forms-react/src/lib/field/use-mask-field.ts`). **Обязательно вызывать один раз в
 * `setup()` поля**, не внутри render-замыкания: `setup()` выполняется один раз за инстанс
 * компонента, это даёт `inputRef` стабильную идентичность между ре-рендерами — без неё
 * `MaskController` пересоздавался бы на каждое изменение `field.state.value` (то есть на
 * каждое нажатие клавиши в `'live'`-режиме), теряя позицию каретки. В React ту же роль
 * стабильности играет `useCallback` с зависимостями.
 *
 * `'live'`-режим: `<input>` рендерится БЕЗ `value`/`onInput` (см. `uncontrolled`) — источник
 * истины DOM, `MaskController` пишет напрямую через `setRangeText`. Vue не трогает `.value`
 * при патче, если этого атрибута нет в данных vnode — тот же приём, что React `defaultValue`+`ref`.
 *
 * `'blur'`/`'off'`/резолвится в `null`-маску: обычный контролируемый `<input>` через
 * `displayValue`/`onInput`.
 */
export function useMaskField(options: UseMaskFieldOptions): UseMaskFieldResult {
  const {
    getValue,
    onValueChange,
    formatMode = 'live',
    maskOptions,
    onPasteMode = 'normalize',
    onRejectedInput,
  } = options

  const focused = ref(false)
  const displayValue = ref('')
  let controller: MaskController | null = null
  let lastEmittedRaw: string | null = null

  const resolvedMask = () => resolveMask(options.mask, getValue(), maskOptions)
  const initialMask = resolvedMask()
  const uncontrolled = formatMode === 'live' && initialMask !== null

  function refreshControlledDisplay() {
    const mask = resolvedMask()
    const value = getValue()
    if (formatMode === 'blur' && mask !== null && !focused.value) {
      displayValue.value = format(unformat(value, mask, maskOptions), mask, maskOptions)
      return
    }
    displayValue.value = value
  }

  refreshControlledDisplay()

  const inputRef: VNodeRef = (el) => {
    controller?.detach()
    controller = null

    const mask = resolvedMask()
    if (!el || mask === null || formatMode !== 'live') {
      return
    }

    const element = el as HTMLInputElement
    element.value = format(unformat(getValue(), mask, maskOptions), mask, maskOptions)

    controller = new MaskController(element, {
      mask,
      maskOptions,
      onPasteMode,
      onRejectedInput,
      onChange: (formatted) => {
        const raw = unformat(formatted, mask, maskOptions)
        lastEmittedRaw = raw
        onValueChange(raw)
      },
    })
    controller.attach()
    lastEmittedRaw = getValue()
  }

  // Внешние изменения значения (сброс формы, программный setFieldValue) — прокидываем в
  // MaskController напрямую, минуя onInput/onChange. Изменения, пришедшие из самого
  // контроллера, отфильтровываются через lastEmittedRaw (тот же приём, что в React-версии).
  watch(
    () => getValue(),
    (value) => {
      if (formatMode !== 'live' || !controller || lastEmittedRaw === value) {
        refreshControlledDisplay()
        return
      }
      controller.setValue(value)
      lastEmittedRaw = value
    },
  )

  onBeforeUnmount(() => {
    controller?.detach()
    controller = null
  })

  return {
    uncontrolled,
    displayValue,
    inputRef,
    onInput: (event: Event) => {
      const nativeValue = (event.target as HTMLInputElement).value
      const mask = resolvedMask()
      const value = getValue()
      const nextRaw = mask ? unformat(nativeValue, mask, maskOptions) : nativeValue
      const prevRawLength = mask ? unformat(value, mask, maskOptions).length : value.length
      if (nativeValue.length > value.length && nextRaw.length <= prevRawLength) {
        onRejectedInput?.(nativeValue)
      }
      onValueChange(nextRaw)
      refreshControlledDisplay()
    },
    onFocus: () => {
      focused.value = true
    },
    onBlur: () => {
      focused.value = false
      refreshControlledDisplay()
    },
  }
}
