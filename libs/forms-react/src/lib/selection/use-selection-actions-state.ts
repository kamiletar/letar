'use client'

import {
  type CreatedOption,
  getOptionText,
  type OptionOverlayEntry,
  pruneOptionOverlay,
  type UIKitSelectControl,
  type UpdatedOption,
  upsertOptionOverlay,
} from '@letar/forms-core/uikit'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseSelectionActionsStateOptions {
  /** Опции приложения (без созданных и без наложения правок): по ним прюнится наложение и берётся baselineText */
  appOptions: readonly { value: string | number; label?: unknown; textValue?: string }[]
}

export interface RunSelectionActionOptions<TResult> {
  /** `'option'` — из пункта списка (фокус возвращается на триггер до окна), `'value'` — у значения (фокус остаётся) */
  scope: 'option' | 'value'
  /** Вызывает обработчик приложения. Вызывается СИНХРОННО в обработчике события */
  call: () => Promise<TResult | null>
  /** Применяет непустой результат; не вызывается, если поле уже размонтировано */
  apply: (result: TResult) => void
}

export interface SelectionActionsState {
  /** Идёт действие приложения */
  pending: boolean
  /** Ручка выпадашки — скин заполняет её через проп `controlRef` */
  controlRef: { current: UIKitSelectControl | null }
  /** Опции, созданные через `onCreate` (живут, пока поле смонтировано) */
  createdOptions: CreatedOption[]
  addCreatedOption: (option: CreatedOption) => void
  /** Активное наложение правок (после прюнинга) */
  overlay: readonly OptionOverlayEntry[]
  /**
   * Запомнить правку опции: запись в `createdOptions`, если опция создана этим полем и приложение её ещё не
   * отдало, иначе — наложение по `fromValue`.
   */
  recordEdit: (fromValue: string, result: UpdatedOption) => void
  /** Единый конвейер edit/create: один `pending` на поле, закрыть список, окно приложения, результат */
  run: <TResult>(options: RunSelectionActionOptions<TResult>) => void
}

/**
 * Состояние действий поля выбора (`onCreate`/`onUpdate`) для `useFieldState`: `pending`, флаг монтирования, наложение
 * правок, созданные опции и конвейер `run`. Не зависит от UI-библиотеки.
 *
 * Конвейер: `pending` → закрыть список → (из пункта) вернуть фокус на триггер → обработчик приложения синхронно в том
 * же событии → результат (если поле ещё смонтировано) → `pending` снят. Отказ (`reject`) не глотается: всплывает как
 * unhandled rejection — та же политика, что была у `onCreate`.
 */
export function useSelectionActionsState({ appOptions }: UseSelectionActionsStateOptions): SelectionActionsState {
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)
  const mountedRef = useRef(true)
  const controlRef = useRef<UIKitSelectControl | null>(null)
  const [createdOptions, setCreatedOptions] = useState<CreatedOption[]>([])
  const [overlayState, setOverlayState] = useState<readonly OptionOverlayEntry[]>([])

  // Ссылки на актуальное состояние — читает `recordEdit`, вызванный позже рендера
  const appOptionsRef = useRef(appOptions)
  const createdRef = useRef(createdOptions)
  useEffect(() => {
    appOptionsRef.current = appOptions
    createdRef.current = createdOptions
  })

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Прюнинг фиксируем в state, а не только выводим: иначе устаревшая запись «воскресла» бы позже.
  // setState во время рендера того же компонента — допустимая «подстройка state при смене пропсов»;
  // цикл конечен, потому что `pruneOptionOverlay` возвращает тот же массив, когда убирать нечего
  const overlay = pruneOptionOverlay(appOptions, overlayState)
  if (overlay !== overlayState) {
    setOverlayState(overlay)
  }

  const addCreatedOption = useCallback((option: CreatedOption) => {
    setCreatedOptions((prev) => [...prev, option])
  }, [])

  const recordEdit = useCallback((fromValue: string, result: UpdatedOption) => {
    const appOption = appOptionsRef.current.find((opt) => String(opt.value) === fromValue)
    const createdIndex = createdRef.current.findIndex((opt) => String(opt.value) === fromValue)
    if (!appOption && createdIndex >= 0) {
      setCreatedOptions((prev) =>
        prev.map((opt, index) =>
          index === createdIndex
            ? { label: result.label, value: result.value, data: 'data' in result ? result.data : opt.data }
            : opt
        )
      )
      return
    }
    const entry: OptionOverlayEntry = {
      fromValue,
      label: result.label,
      value: result.value,
      data: result.data,
      hasData: 'data' in result,
      baselineText: appOption ? getOptionText(appOption) : '',
    }
    setOverlayState((prev) => upsertOptionOverlay(prev, entry))
  }, [])

  const run = useCallback(<TResult>({ scope, call, apply }: RunSelectionActionOptions<TResult>) => {
    if (pendingRef.current || !mountedRef.current) {
      return
    }
    pendingRef.current = true
    setPending(true)
    controlRef.current?.close()
    if (scope === 'option') {
      // Синхронно: результат не зависит от порядка `raf` списка и ловушки фокуса окна приложения
      controlRef.current?.focusTrigger()
    }
    void call()
      .then((result) => {
        if (mountedRef.current && result) {
          apply(result)
        }
      })
      .finally(() => {
        pendingRef.current = false
        if (mountedRef.current) {
          setPending(false)
        }
      })
  }, [])

  return { pending, controlRef, createdOptions, addCreatedOption, overlay, recordEdit, run }
}
