'use client'

import {
  type CreatedOption,
  getOptionText,
  type OptionOverlayEntry,
  type PendingRegistry,
  pruneOptionOverlay,
  type SelectionActionContext,
  type SelectionActionKind,
  type SettleErrorInfo,
  type SettleErrorReason,
  type UIKitSelectControl,
  type UpdatedOption,
  upsertOptionOverlay,
} from '@letar/forms-core/uikit'
import { useCallback, useEffect, useRef, useState } from 'react'

/** Сколько ждать подтверждения оптимистичного действия, мс (§16.7) */
export const DEFAULT_SETTLE_TIMEOUT = 30_000

const PENDING_VALUE_PREFIX = '__letar_pending_'

/** Опция, созданная полем: с `pending: true` она показана оптимистично и ещё не подтверждена сервером */
export interface SelectionCreatedOption extends CreatedOption {
  pending?: boolean
}

export interface UseSelectionActionsStateOptions {
  /** Опции приложения (без созданных и без наложения правок): по ним прюнится наложение и берётся baselineText */
  appOptions: readonly { value: string | number; label?: unknown; textValue?: string }[]
  /**
   * Текущее значение поля. Ожидающий выбор оптимистичного create живёт только в состоянии поля и снимается, как
   * только значение формы изменилось (выбор пользователя, `reset`, `setFieldValue`)
   */
  value?: string | number | null
  /** Реестр ожидания формы (`useFormPendingRegistry()`); без него оптимистичные действия не держат отправку */
  registry?: PendingRegistry | null
  /** Отказ подтверждения: без обработчика поле показывает встроенное сообщение (`settleFailure`) */
  onSettleError?: (info: SettleErrorInfo) => void
  /** Мс до признания оптимистичного действия неподтверждённым; по умолчанию 30 000 */
  settleTimeout?: number
}

/** Что оптимистичный вызов показывает: подпись всегда, `value`/`data` — по обстоятельствам */
type OptimisticPreview = Parameters<SelectionActionContext['optimistic']>[0]

/** Результат обработчика приложения, который поле умеет применить */
interface OptimisticResult {
  label: string
  value: string | number
  data?: unknown
}

export interface RunSelectionActionOptions<TResult> {
  /** `'option'` — из пункта списка (фокус возвращается на триггер до окна), `'value'` — у значения (фокус остаётся) */
  scope: 'option' | 'value'
  /** Вид действия — нужен оптимистичному режиму; по умолчанию `'create'` */
  kind?: SelectionActionKind
  /** Value правимой опции (`kind: 'edit'`) — к ней прикладывается ожидающее наложение */
  fromValue?: string
  /**
   * Вызывает обработчик приложения. Вызывается СИНХРОННО в обработчике события; `ctx` — второй аргумент
   * `onCreate`/`onUpdate`
   */
  call: (ctx: SelectionActionContext) => Promise<TResult | null>
  /**
   * Применяет непустой результат; не вызывается, если поле уже размонтировано. У оптимистичного действия
   * `selectionHeld` — ожидающий выбор дожил до подтверждения: значение формы надо переключить на настоящее
   */
  apply: (result: TResult, info: { optimistic: boolean; selectionHeld: boolean }) => void
  /** Оптимистичный предпросмотр показан (Combobox подставляет подпись в поле ввода) */
  onOptimistic?: (preview: { label: string }) => void
  /** Отказ, пока ожидающий выбор ещё держится: вернуть UI (Combobox возвращает прежний текст ввода) */
  onRevert?: () => void
}

export interface SelectionActionsState {
  /** Идёт интерактивная фаза действия приложения (окно): оптимистичное ожидание сюда не входит */
  pending: boolean
  /** Ручка выпадашки — скин заполняет её через проп `controlRef` */
  controlRef: { current: UIKitSelectControl | null }
  /** Опции, созданные через `onCreate` (живут, пока поле смонтировано); `pending` — ждут сервера */
  createdOptions: SelectionCreatedOption[]
  addCreatedOption: (option: CreatedOption) => void
  /**
   * Временный value оптимистично созданной опции, которую поле показывает выбранной, пока форма хранит прежнее
   * значение; `null` — ожидающего выбора нет. Скин передаёт его в контрол вместо значения формы
   */
  pendingSelection: string | null
  /** Свой оптимистичный create в полёте: `pending`-опции приложения при этом скрыты (почти всегда это та же запись) */
  hasOwnCreatePending: boolean
  /** Встроенное сообщение об отказе (`null` — нет); исчезает при следующем действии в поле */
  settleFailure: { label: string } | null
  /** Активное наложение правок (после прюнинга) */
  overlay: readonly OptionOverlayEntry[]
  /**
   * Запомнить правку опции: запись в `createdOptions`, если опция создана этим полем и приложение её ещё не
   * отдало, иначе — наложение по `fromValue`.
   */
  recordEdit: (fromValue: string, result: UpdatedOption) => void
  /** Единый конвейер edit/create: один `pending` на поле, закрыть список, окно приложения, результат */
  run: <TResult extends OptimisticResult>(options: RunSelectionActionOptions<TResult>) => void
}

/** Ожидающий выбор: временный value и значение формы, при котором он показан */
interface HeldSelection {
  temp: string
  from: string
}

/** Одно оптимистичное действие: от `optimistic()` до подтверждения, отказа, таймаута или размонтирования */
interface OptimisticSession {
  finished: boolean
  show: (preview: OptimisticPreview) => void
  resolve: (result: OptimisticResult | null) => void
  fail: (reason: SettleErrorReason, error?: unknown) => void
  cancel: () => void
}

/**
 * Состояние действий поля выбора (`onCreate`/`onUpdate`) для `useFieldState`: `pending`, флаг монтирования, наложение
 * правок, созданные опции и конвейер `run`. Не зависит от UI-библиотеки.
 *
 * Конвейер: `pending` → закрыть список → (из пункта) вернуть фокус на триггер → обработчик приложения синхронно в том
 * же событии → результат (если поле ещё смонтировано) → `pending` снят. Отказ (`reject`) не глотается: всплывает как
 * unhandled rejection — та же политика, что была у `onCreate`.
 *
 * Оптимистичный режим (§16.7): обработчик зовёт `ctx.optimistic(preview)` — интерактивная фаза заканчивается
 * (`pending` снят), результат показан приглушённо, действие ждёт подтверждения в реестре формы. После этого отказ
 * (`null`, reject, таймаут) откатывает показанное и сообщает приложению — необработанного отказа нет.
 */
export function useSelectionActionsState(
  { appOptions, value, registry, onSettleError, settleTimeout = DEFAULT_SETTLE_TIMEOUT }:
    UseSelectionActionsStateOptions,
): SelectionActionsState {
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)
  const mountedRef = useRef(true)
  const controlRef = useRef<UIKitSelectControl | null>(null)
  const [createdOptions, setCreatedOptions] = useState<SelectionCreatedOption[]>([])
  const [overlayState, setOverlayState] = useState<readonly OptionOverlayEntry[]>([])
  const [held, setHeld] = useState<HeldSelection | null>(null)
  const [settleFailure, setSettleFailure] = useState<{ label: string } | null>(null)

  // Ссылки на актуальное состояние — читает то, что вызвано позже рендера (`recordEdit`, подтверждение действия)
  const appOptionsRef = useRef(appOptions)
  const createdRef = useRef(createdOptions)
  const overlayRef = useRef(overlayState)
  const valueRef = useRef(value)
  const heldRef = useRef(held)
  const registryRef = useRef(registry)
  const onSettleErrorRef = useRef(onSettleError)
  const settleTimeoutRef = useRef(settleTimeout)
  const sessionsRef = useRef(new Set<OptimisticSession>())
  const tempCounterRef = useRef(0)
  useEffect(() => {
    appOptionsRef.current = appOptions
    createdRef.current = createdOptions
    overlayRef.current = overlayState
    valueRef.current = value
    heldRef.current = held
    registryRef.current = registry
    onSettleErrorRef.current = onSettleError
    settleTimeoutRef.current = settleTimeout
  })

  useEffect(() => {
    mountedRef.current = true
    const sessions = sessionsRef.current
    return () => {
      mountedRef.current = false
      // Размонтирование поля — «отменено», не отказ: запись реестра снимается, отправку не держит и не отменяет
      for (const session of [...sessions]) {
        session.cancel()
      }
    }
  }, [])

  // Ожидающий выбор живёт, пока значение формы то, что было при показе; изменилось — снимаем (случаи 1–2 §16.7)
  const currentValue = value === undefined || value === null ? '' : String(value)
  const pendingSelection = held && held.from === currentValue ? held.temp : null
  useEffect(() => {
    if (held && held.from !== currentValue) {
      heldRef.current = null
      setHeld(null)
    }
  }, [held, currentValue])

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

  const run = useCallback(<TResult extends OptimisticResult>(options: RunSelectionActionOptions<TResult>) => {
    if (pendingRef.current || !mountedRef.current) {
      return
    }
    pendingRef.current = true
    setPending(true)
    setSettleFailure(null)
    controlRef.current?.close()
    if (options.scope === 'option') {
      // Синхронно: результат не зависит от порядка `raf` списка и ловушки фокуса окна приложения
      controlRef.current?.focusTrigger()
    }

    let released = false
    const release = () => {
      if (released) {
        return
      }
      released = true
      pendingRef.current = false
      if (mountedRef.current) {
        setPending(false)
      }
    }

    const startSession = (): OptimisticSession => {
      const kind = options.kind ?? 'create'
      const fromValue = options.fromValue ?? ''
      let previewNow: OptimisticPreview = { label: '' }
      let temp: string | null = null
      let previousEntry: OptionOverlayEntry | undefined
      let timer: ReturnType<typeof setTimeout> | undefined
      let resolveSettled: (ok: boolean) => void = () => undefined
      const settled = new Promise<boolean>((resolve) => {
        resolveSettled = resolve
      })
      const unregister = registryRef.current?.add(settled, { focus: () => controlRef.current?.focusTrigger() })

      const removePreview = () => {
        if (kind === 'create' && temp) {
          const tempValue = temp
          setCreatedOptions((prev) => prev.filter((opt) => String(opt.value) !== tempValue))
        }
        if (kind === 'edit') {
          setOverlayState((prev) => {
            const without = prev.filter((entry) => entry.fromValue !== fromValue)
            return previousEntry ? [...without, previousEntry] : without
          })
        }
      }
      const releaseHeld = () => {
        if (temp && heldRef.current?.temp === temp) {
          heldRef.current = null
          setHeld(null)
        }
      }
      const selectionHeldNow = () =>
        !!temp && heldRef.current?.temp === temp && heldRef.current.from === String(valueRef.current ?? '')

      const self: OptimisticSession = {
        finished: false,
        show: (preview) => {
          previewNow = preview
          if (kind === 'create') {
            if (!temp) {
              tempCounterRef.current += 1
              temp = `${PENDING_VALUE_PREFIX}${tempCounterRef.current}__`
              const nextHeld = { temp, from: String(valueRef.current ?? '') }
              heldRef.current = nextHeld
              setHeld(nextHeld)
              timer = setTimeout(() => self.fail('timeout'), settleTimeoutRef.current)
            }
            const tempValue = temp
            const entry: SelectionCreatedOption = {
              label: preview.label,
              value: tempValue,
              data: preview.data,
              pending: true,
            }
            setCreatedOptions((prev) =>
              prev.some((opt) => opt.value === tempValue)
                ? prev.map((opt) => (opt.value === tempValue ? entry : opt))
                : [...prev, entry]
            )
            options.onOptimistic?.({ label: preview.label })
            return
          }
          if (!timer) {
            previousEntry = overlayRef.current.find((entry) => entry.fromValue === fromValue)
            timer = setTimeout(() => self.fail('timeout'), settleTimeoutRef.current)
          }
          const appOption = appOptionsRef.current.find((opt) => String(opt.value) === fromValue)
          const createdOption = createdRef.current.find((opt) => String(opt.value) === fromValue)
          setOverlayState((prev) =>
            upsertOptionOverlay(prev, {
              fromValue,
              label: preview.label,
              value: fromValue,
              data: preview.data,
              hasData: 'data' in preview,
              baselineText: appOption ? getOptionText(appOption) : (createdOption?.label ?? ''),
              pending: true,
            })
          )
          options.onOptimistic?.({ label: preview.label })
        },
        resolve: (result) => {
          if (self.finished) {
            return
          }
          if (!result) {
            self.fail('declined')
            return
          }
          self.finished = true
          clearTimeout(timer)
          sessionsRef.current.delete(self)
          const selectionHeld = selectionHeldNow()
          removePreview()
          releaseHeld()
          if (mountedRef.current) {
            // Значение формы записывается ДО вердикта реестра: отправка в очереди стартует уже с настоящим value
            options.apply(result as never, { optimistic: true, selectionHeld })
          }
          resolveSettled(true)
        },
        fail: (reason, error) => {
          if (self.finished) {
            return
          }
          self.finished = true
          clearTimeout(timer)
          sessionsRef.current.delete(self)
          const selectionHeld = selectionHeldNow()
          removePreview()
          releaseHeld()
          if (mountedRef.current) {
            if (selectionHeld) {
              options.onRevert?.()
            }
            const info: SettleErrorInfo = {
              kind,
              preview: { label: previewNow.label, value: temp ?? fromValue, data: previewNow.data },
              reason,
              error,
            }
            if (onSettleErrorRef.current) {
              onSettleErrorRef.current(info)
            } else if (kind === 'edit' || selectionHeld) {
              // Выбор пользователя при create не пострадал — сообщать не о чем
              setSettleFailure({ label: previewNow.label })
            }
          }
          resolveSettled(false)
        },
        cancel: () => {
          if (self.finished) {
            return
          }
          self.finished = true
          clearTimeout(timer)
          sessionsRef.current.delete(self)
          unregister?.()
          resolveSettled(true)
        },
      }
      sessionsRef.current.add(self)
      return self
    }

    let session: OptimisticSession | null = null
    // `optimistic` после завершения обработчика (забытый таймер, поздний колбэк) — мимо: подтверждать нечем
    let callDone = false
    const ctx: SelectionActionContext = {
      optimistic: (preview) => {
        if (callDone || !mountedRef.current || session?.finished) {
          return
        }
        if (!session) {
          session = startSession()
          // Интерактивная фаза кончилась: поле снова отвечает, пока сервер думает
          release()
        }
        session.show(preview)
      },
    }

    const execute = async () => {
      try {
        const result = await options.call(ctx)
        if (session) {
          session.resolve(result)
        } else if (mountedRef.current && result) {
          options.apply(result, { optimistic: false, selectionHeld: false })
        }
      } catch (error) {
        if (!session) {
          // Отказ до `optimistic` не глотается: всплывает как unhandled rejection (политика `onCreate`, §16.2)
          throw error
        }
        session.fail('rejected', error)
      } finally {
        callDone = true
        release()
      }
    }
    void execute()
  }, [])

  return {
    pending,
    controlRef,
    createdOptions,
    addCreatedOption,
    pendingSelection,
    hasOwnCreatePending: createdOptions.some((opt) => opt.pending),
    settleFailure,
    overlay,
    recordEdit,
    run,
  }
}
