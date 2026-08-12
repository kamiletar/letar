'use client'

import { format, MaskController, type MaskOptions, unformat } from '@letar/forms-core/mask'
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'

export type MaskFieldFormatMode = 'live' | 'blur' | 'off'

/** `string[]` — берётся вариант, под который сырое значение раскладывается лучше остальных. */
export type MaskFieldMask = string | string[] | ((raw: string) => string | null)

export interface UseMaskFieldOptions {
  mask: MaskFieldMask
  /** Сырое значение поля формы (без литералов маски) — источник истины для валидации. */
  value: string
  onValueChange: (raw: string) => void
  /** @default 'live' */
  formatMode?: MaskFieldFormatMode
  maskOptions?: MaskOptions
  /** @default 'normalize' */
  onPasteMode?: 'normalize' | 'reject'
  /** Отвергнутый символ/фрагмент — для `aria-live="polite"`-объявления в UI-слое. */
  onRejectedInput?: (rejected: string) => void
}

export interface UseMaskFieldResult {
  /** `null` — для текущего сырого значения маски нет, поле работает как свободный ввод. */
  resolvedMask: string | null
  /** Отображаемое (отформатированное по маске) значение — не то же самое, что `value`. */
  displayValue: string
  /**
   * Пропсы для `<input>`. В `formatMode: 'live'` элемент неконтролируемый (`defaultValue`,
   * без `onChange`) — DOM является источником истины, `MaskController` пишет в него напрямую
   * через `setRangeText`; управление им через React `value` конфликтует с посимвольной записью
   * контроллера (тот самый WebKit-баг, из-за которого `FieldPhone` в своё время отказался от
   * `use-mask-input`, см. `libs/forms-core/README.md`). В `'blur'`/`'off'` — обычный
   * контролируемый инпут.
   */
  inputProps:
    & { ref: (element: HTMLInputElement | null) => void }
    & (
      | { defaultValue: string; value?: undefined; onChange?: undefined }
      | { value: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void }
    )
  onFocus: () => void
  onBlur: () => void
}

/** По массиву масок выбирает ту, под которую сырое значение раскладывается лучше (больше принятых символов). */
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
 * React-биндинг движка масок (Фаза 8, Этап 3, MASK_ENGINE.md §6.6) — ядро само в DOM не
 * пишет, наружу отдаётся только сырое значение (`onValueChange`). UI-слой (Chakra/shadcn-поле)
 * отвечает за `formatDescription`, aria-live-объявление отвергнутого символа и т.д.
 *
 * Три режима форматирования — не варианты одной реализации, а разная степень нагрузки:
 * `'live'` держит DOM-контроллер с undo/IME/autofill (Этап 2), `'blur'`/`'off'` — упрощённый
 * контролируемый инпут без этой подсистемы (переформатирование только по краю фокуса или
 * только фильтрация символов соответственно) — их не требуется собирать через тот же движок,
 * раз в них нет самой проблемы «каретка прыгает на каждое нажатие», ради которой он писан.
 */
export function useMaskField(options: UseMaskFieldOptions): UseMaskFieldResult {
  const {
    value,
    onValueChange,
    formatMode = 'live',
    maskOptions,
    onPasteMode = 'normalize',
    onRejectedInput,
  } = options

  const resolvedMask = resolveMask(options.mask, value, maskOptions)
  const controllerRef = useRef<MaskController | null>(null)
  const lastEmittedRawRef = useRef<string | null>(null)
  const [focused, setFocused] = useState(false)
  const [liveDisplayValue, setLiveDisplayValue] = useState(() =>
    resolvedMask ? format(unformat(value, resolvedMask, maskOptions), resolvedMask, maskOptions) : value
  )

  const inputRef = useCallback(
    (element: HTMLInputElement | null) => {
      controllerRef.current?.detach()
      controllerRef.current = null
      if (!element || !resolvedMask || formatMode !== 'live') {
        return
      }
      const controller = new MaskController(element, {
        mask: resolvedMask,
        maskOptions,
        onPasteMode,
        onRejectedInput,
        onChange: (formatted) => {
          const raw = unformat(formatted, resolvedMask, maskOptions)
          lastEmittedRawRef.current = raw
          setLiveDisplayValue(formatted)
          onValueChange(raw)
        },
      })
      controller.attach()
      controllerRef.current = controller
      setLiveDisplayValue(controller.getValue())
    },
    // onValueChange/onRejectedInput намеренно в зависимостях: смена идентичности переустанавливает
    // контроллер (теряя undo-стек) — известное ограничение, см. PLAN.md Этап 3.
    [resolvedMask, formatMode, maskOptions, onPasteMode, onRejectedInput, onValueChange],
  )

  // Внешнее изменение сырого значения (сброс формы, программный setValue) — синхронизируем
  // DOM-контроллер. Пропускаем, если значение пришло от нас самих (echo через onValueChange).
  useEffect(() => {
    const controller = controllerRef.current
    if (!controller || !resolvedMask || formatMode !== 'live') {
      return
    }
    if (lastEmittedRawRef.current === value) {
      return
    }
    controller.setValue(value)
    setLiveDisplayValue(controller.getValue())
    lastEmittedRawRef.current = value
  }, [value, resolvedMask, formatMode])

  const handleControlledChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nativeValue = event.target.value
      const nextRaw = resolvedMask ? unformat(nativeValue, resolvedMask, maskOptions) : nativeValue
      const prevRawLength = resolvedMask ? unformat(value, resolvedMask, maskOptions).length : value.length
      if (nativeValue.length > value.length && nextRaw.length <= prevRawLength) {
        // Строка выросла (что-то напечатали), но число принятых символов — нет: типичный
        // случай единичного нажатия не по алфавиту маски. Без посимвольной локализации
        // (упрощение относительно live-режима, где это делает сам MaskController).
        onRejectedInput?.(nativeValue)
      }
      onValueChange(nextRaw)
    },
    [resolvedMask, maskOptions, value, onValueChange, onRejectedInput],
  )

  // Неконтролируемый DOM только пока реально работает MaskController. Без разрешённой
  // маски (resolvedMask === null) писать в DOM некому — тогда это обычный контролируемый
  // инпут-passthrough, как и в 'off'.
  if (formatMode === 'live' && resolvedMask !== null) {
    return {
      resolvedMask,
      displayValue: liveDisplayValue,
      inputProps: { ref: inputRef, defaultValue: liveDisplayValue },
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    }
  }

  if (formatMode === 'blur' && resolvedMask !== null) {
    const displayValue = focused ? value : format(unformat(value, resolvedMask, maskOptions), resolvedMask, maskOptions)
    return {
      resolvedMask,
      displayValue,
      inputProps: { ref: inputRef, value: displayValue, onChange: handleControlledChange },
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    }
  }

  // formatMode === 'off', либо маски для этого значения нет (resolvedMask === null) в любом
  // режиме — только нормализация (фильтрация по алфавиту токенов, если маска есть), без группировки
  return {
    resolvedMask,
    displayValue: value,
    inputProps: { ref: inputRef, value, onChange: handleControlledChange },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  }
}
