import {
  type CreatedOption,
  type FieldDeps,
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
import { computed, onBeforeUnmount, type Ref, ref, watch } from 'vue'

/** Сколько ждать подтверждения оптимистичного действия, мс (§16.7) — то же значение, что в React-версии */
export const DEFAULT_SETTLE_TIMEOUT = 30_000

const PENDING_VALUE_PREFIX = '__letar_pending_'

const NO_DEPS: FieldDeps = {}

/** Опция, созданная полем: с `pending: true` она показана оптимистично и ещё не подтверждена сервером */
export interface SelectionCreatedOption extends CreatedOption {
  pending?: boolean
}

export interface UseSelectionActionsStateOptions {
  /**
   * Опции приложения (без созданных и без наложения правок) — геттер, а не голый массив: композабл
   * читает его внутри `watchEffect`/`computed`, реактивность приходит от того, что стоит за геттером
   * у вызывающего кода (обычно `computed`/`ref.value` поля).
   */
  appOptions: () => readonly { value: string | number; label?: unknown; textValue?: string }[]
  /**
   * Текущее значение поля. Ожидающий выбор оптимистичного create живёт только в состоянии этого
   * композабла и снимается, как только значение формы изменилось (выбор пользователя, `reset`, `setFieldValue`)
   */
  value?: () => string | number | null | undefined
  /** Реестр ожидания формы (framework-free `createPendingRegistry()`); без него отправку ничто не держит */
  registry?: PendingRegistry | null
  /** Отказ подтверждения: без обработчика композабл выставляет встроенное сообщение (`settleFailure`) */
  onSettleError?: (info: SettleErrorInfo) => void
  /** Мс до признания оптимистичного действия неподтверждённым; по умолчанию 30 000 */
  settleTimeout?: number
  /** Значения родителей (`dependsOn`, §18) — геттер; по умолчанию `() => {}` */
  deps?: () => FieldDeps
  /**
   * Ключ зависимостей (`serializeDeps`) — геттер. Смена — другой родитель: созданные опции, наложение
   * правок и ожидающий выбор относились к списку прежнего родителя и сбрасываются (§18.6)
   */
  depsKey?: () => string
}

/** Что оптимистичный вызов показывает: подпись всегда, `value`/`data` — по обстоятельствам */
type OptimisticPreview = Parameters<SelectionActionContext['optimistic']>[0]

/** Результат обработчика приложения, который композабл умеет применить */
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
  /** Вызывает обработчик приложения. Вызывается СИНХРОННО в обработчике события; `ctx` — второй аргумент `onCreate`/`onUpdate` */
  call: (ctx: SelectionActionContext) => Promise<TResult | null>
  /**
   * Применяет непустой результат; не вызывается, если композабл уже уничтожен (`onBeforeUnmount`). У
   * оптимистичного действия `selectionHeld` — ожидающий выбор дожил до подтверждения: значение формы
   * надо переключить на настоящее
   */
  apply: (result: TResult, info: { optimistic: boolean; selectionHeld: boolean }) => void
  /** Оптимистичный предпросмотр показан (Combobox подставляет подпись в поле ввода) */
  onOptimistic?: (preview: { label: string }) => void
  /** Отказ, пока ожидающий выбор ещё держится: вернуть UI (Combobox возвращает прежний текст ввода) */
  onRevert?: () => void
}

export interface SelectionActionsState {
  /** Идёт интерактивная фаза действия приложения (окно): оптимистичное ожидание сюда не входит */
  pending: Ref<boolean>
  /** Ручка выпадашки — скин заполняет её через `controlRef.value = ...` */
  controlRef: Ref<UIKitSelectControl | null>
  /** Опции, созданные через `onCreate`; `pending` — ждут сервера */
  createdOptions: Ref<readonly SelectionCreatedOption[]>
  addCreatedOption: (option: CreatedOption) => void
  /**
   * Временный value оптимистично созданной опции, которую скин показывает выбранной, пока форма хранит
   * прежнее значение; `null` — ожидающего выбора нет
   */
  pendingSelection: Readonly<Ref<string | null>>
  /** Свой оптимистичный create в полёте: `pending`-опции приложения при этом скрыты */
  hasOwnCreatePending: Readonly<Ref<boolean>>
  /** Встроенное сообщение об отказе (`null` — нет); исчезает при следующем действии */
  settleFailure: Ref<{ label: string } | null>
  /** Активное наложение правок (уже прюненное) */
  overlay: Readonly<Ref<readonly OptionOverlayEntry[]>>
  /** Запомнить правку опции: запись в `createdOptions`, если опция создана этим полем, иначе — наложение по `fromValue` */
  recordEdit: (fromValue: string, result: UpdatedOption) => void
  /** Единый конвейер edit/create: один `pending`, закрыть список, окно приложения, результат */
  run: <TResult extends OptimisticResult>(options: RunSelectionActionOptions<TResult>) => void
}

/** Ожидающий выбор: временный value и значение формы, при котором он показан */
interface HeldSelection {
  temp: string
  from: string
}

/** Одно оптимистичное действие: от `optimistic()` до подтверждения, отказа, таймаута или уничтожения композабла */
interface OptimisticSession {
  finished: boolean
  show: (preview: OptimisticPreview) => void
  resolve: (result: OptimisticResult | null) => void
  fail: (reason: SettleErrorReason, error?: unknown) => void
  cancel: () => void
}

/**
 * Vue-эквивалент React `useSelectionActionsState`: состояние действий поля выбора (`onCreate`/`onUpdate`)
 * для будущих `Field.Select`/`Field.Combobox` (Этап 3–4) — `pending`, наложение правок, созданные опции
 * и конвейер `run`. Framework-free половина (`pruneOptionOverlay`/`upsertOptionOverlay`/`getOptionText`) —
 * в `@letar/forms-core/uikit`, этот композабл — только Vue-реактивность (`ref`/`watch`) вокруг неё.
 *
 * Отличие от React-версии не в поведении, а в механике: входы — геттеры (`() => T`), а не пропсы,
 * читаемые в замыкании рендера, поэтому нет нужды в `xxxRef`-зеркалах текущих значений (`appOptionsRef`,
 * `valueRef` и т.п. у React) — `run()`/обработчики сессии читают геттеры в момент вызова, значение всегда
 * свежее. По той же причине нет отдельного «применить прюнинг во время рендера» — в Vue это обычный
 * `watch` с немедленным запуском (`immediate: true`), который останавливается сам, когда `pruneOptionOverlay`
 * возвращает тот же массив (сравнение по ссылке).
 *
 * Конвейер `run`: `pending` → закрыть список (`controlRef.value?.close()`) → (из пункта) вернуть фокус на
 * триггер → обработчик приложения синхронно в том же событии → результат (если композабл ещё жив) →
 * `pending` снят. Отказ (`reject`) не глотается: всплывает как unhandled rejection — та же политика, что у
 * React `onCreate`.
 *
 * Оптимистичный режим (§16.7): обработчик зовёт `ctx.optimistic(preview)` — интерактивная фаза заканчивается
 * (`pending` снят), результат показан приглушённо, действие ждёт подтверждения в реестре формы. После этого
 * отказ (`null`, reject, таймаут) откатывает показанное и сообщает приложению.
 */
export function useSelectionActionsState(
  options: UseSelectionActionsStateOptions,
): SelectionActionsState {
  const {
    appOptions,
    value = () => undefined,
    registry = null,
    onSettleError,
    settleTimeout = DEFAULT_SETTLE_TIMEOUT,
    deps = () => NO_DEPS,
    depsKey = () => '',
  } = options

  const pending = ref(false)
  const controlRef = ref<UIKitSelectControl | null>(null) as Ref<UIKitSelectControl | null>
  const createdOptions = ref<SelectionCreatedOption[]>([]) as Ref<SelectionCreatedOption[]>
  const overlayState = ref<OptionOverlayEntry[]>([]) as Ref<OptionOverlayEntry[]>
  const held = ref<HeldSelection | null>(null)
  const settleFailure = ref<{ label: string } | null>(null)

  let mounted = true
  const sessions = new Set<OptimisticSession>()
  let tempCounter = 0

  // Ожидающий выбор живёт, пока значение формы то, что было при показе; изменилось — снимаем (случаи 1–2 §16.7)
  const currentValue = computed(() => {
    const raw = value()
    return raw === undefined || raw === null ? '' : String(raw)
  })
  const pendingSelection = computed(
    () => (held.value && held.value.from === currentValue.value ? held.value.temp : null),
  )
  watch(currentValue, (next) => {
    if (held.value && held.value.from !== next) {
      held.value = null
    }
  })

  // Другой родитель — другой список: то, что накопилось для прежнего, сбрасываем (не на первом запуске)
  watch(depsKey, () => {
    createdOptions.value = []
    overlayState.value = []
    held.value = null
  })

  // Прюнинг наложения фиксируется в overlayState (не только вычисляется): иначе устаревшая запись
  // «воскресла» бы позже. `pruneOptionOverlay` возвращает ТУ ЖЕ ссылку, когда убирать нечего — цикл конечен
  watch(
    () => pruneOptionOverlay(appOptions(), overlayState.value),
    (pruned) => {
      if (pruned !== overlayState.value) {
        overlayState.value = pruned as OptionOverlayEntry[]
      }
    },
    { immediate: true },
  )

  const addCreatedOption = (option: CreatedOption): void => {
    createdOptions.value = [...createdOptions.value, option]
  }

  const recordEdit = (fromValue: string, result: UpdatedOption): void => {
    const appOption = appOptions().find((opt) => String(opt.value) === fromValue)
    const createdIndex = createdOptions.value.findIndex((opt) => String(opt.value) === fromValue)
    if (!appOption && createdIndex >= 0) {
      createdOptions.value = createdOptions.value.map((opt, index) =>
        index === createdIndex
          ? { label: result.label, value: result.value, data: 'data' in result ? result.data : opt.data }
          : opt
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
    overlayState.value = upsertOptionOverlay(overlayState.value, entry)
  }

  const run = <TResult extends OptimisticResult>(runOptions: RunSelectionActionOptions<TResult>): void => {
    if (pending.value || !mounted) {
      return
    }
    pending.value = true
    settleFailure.value = null
    // Снимок зависимостей на момент начала действия: окно создания получает страну, отказ — страну прежнего списка
    const startDeps = deps()
    const startDepsKey = depsKey()
    const apply: typeof runOptions.apply = (result, info) => {
      // Родитель сменился, пока действие шло: результат относится к списку прежнего родителя — не пишем
      if (depsKey() === startDepsKey) {
        runOptions.apply(result, info)
      }
    }
    controlRef.value?.close()
    if (runOptions.scope === 'option') {
      controlRef.value?.focusTrigger()
    }

    let released = false
    const release = () => {
      if (released) {
        return
      }
      released = true
      if (mounted) {
        pending.value = false
      }
    }

    const startSession = (): OptimisticSession => {
      const kind = runOptions.kind ?? 'create'
      const fromValue = runOptions.fromValue ?? ''
      let previewNow: OptimisticPreview = { label: '' }
      let temp: string | null = null
      let previousEntry: OptionOverlayEntry | undefined
      let timer: ReturnType<typeof setTimeout> | undefined
      let resolveSettled: (ok: boolean) => void = () => undefined
      const settled = new Promise<boolean>((resolve) => {
        resolveSettled = resolve
      })
      const unregister = registry?.add(settled, { focus: () => controlRef.value?.focusTrigger() })

      const removePreview = () => {
        if (kind === 'create' && temp) {
          const tempValue = temp
          createdOptions.value = createdOptions.value.filter((opt) => String(opt.value) !== tempValue)
        }
        if (kind === 'edit') {
          const without = overlayState.value.filter((entry) => entry.fromValue !== fromValue)
          overlayState.value = previousEntry ? [...without, previousEntry] : without
        }
      }
      const releaseHeld = () => {
        if (temp && held.value?.temp === temp) {
          held.value = null
        }
      }
      const selectionHeldNow = () => !!temp && held.value?.temp === temp && held.value.from === currentValue.value

      const self: OptimisticSession = {
        finished: false,
        show: (preview) => {
          previewNow = preview
          if (kind === 'create') {
            if (!temp) {
              tempCounter += 1
              temp = `${PENDING_VALUE_PREFIX}${tempCounter}__`
              held.value = { temp, from: currentValue.value }
              timer = setTimeout(() => self.fail('timeout'), settleTimeout)
            }
            const tempValue = temp
            const entry: SelectionCreatedOption = {
              label: preview.label,
              value: tempValue,
              data: preview.data,
              pending: true,
            }
            createdOptions.value = createdOptions.value.some((opt) => opt.value === tempValue)
              ? createdOptions.value.map((opt) => (opt.value === tempValue ? entry : opt))
              : [...createdOptions.value, entry]
            runOptions.onOptimistic?.({ label: preview.label })
            return
          }
          if (!timer) {
            previousEntry = overlayState.value.find((entry) => entry.fromValue === fromValue)
            timer = setTimeout(() => self.fail('timeout'), settleTimeout)
          }
          const appOption = appOptions().find((opt) => String(opt.value) === fromValue)
          const createdOption = createdOptions.value.find((opt) => String(opt.value) === fromValue)
          overlayState.value = upsertOptionOverlay(overlayState.value, {
            fromValue,
            label: preview.label,
            value: fromValue,
            data: preview.data,
            hasData: 'data' in preview,
            baselineText: appOption ? getOptionText(appOption) : (createdOption?.label ?? ''),
            pending: true,
          })
          runOptions.onOptimistic?.({ label: preview.label })
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
          sessions.delete(self)
          const selectionHeld = selectionHeldNow()
          removePreview()
          releaseHeld()
          if (mounted) {
            // Значение формы записывается ДО вердикта реестра: отправка в очереди стартует уже с настоящим value
            apply(result as never, { optimistic: true, selectionHeld })
          }
          resolveSettled(true)
        },
        fail: (reason, error) => {
          if (self.finished) {
            return
          }
          self.finished = true
          clearTimeout(timer)
          sessions.delete(self)
          const selectionHeld = selectionHeldNow()
          removePreview()
          releaseHeld()
          if (mounted) {
            if (selectionHeld) {
              runOptions.onRevert?.()
            }
            const info: SettleErrorInfo = {
              kind,
              deps: startDeps,
              preview: { label: previewNow.label, value: temp ?? fromValue, data: previewNow.data },
              reason,
              error,
            }
            if (onSettleError) {
              onSettleError(info)
            } else if (kind === 'edit' || selectionHeld) {
              // Выбор пользователя при create не пострадал — сообщать не о чем
              settleFailure.value = { label: previewNow.label }
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
          sessions.delete(self)
          unregister?.()
          resolveSettled(true)
        },
      }
      sessions.add(self)
      return self
    }

    let session: OptimisticSession | null = null
    // `optimistic` после завершения обработчика (забытый таймер, поздний колбэк) — мимо: подтверждать нечем
    let callDone = false
    const ctx: SelectionActionContext = {
      deps: startDeps,
      optimistic: (preview) => {
        if (callDone || !mounted || session?.finished) {
          return
        }
        if (!session) {
          session = startSession()
          release()
        }
        session.show(preview)
      },
    }

    const execute = async () => {
      try {
        const result = await runOptions.call(ctx)
        if (session) {
          session.resolve(result)
        } else if (mounted && result) {
          apply(result, { optimistic: false, selectionHeld: false })
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
  }

  onBeforeUnmount(() => {
    mounted = false
    // Уничтожение композабла — «отменено», не отказ: запись реестра снимается, отправку не держит и не отменяет
    // `cancel()` сам удаляет себя из `sessions` — копируем набор заранее, чтобы не мутировать его во время обхода
    for (const session of Array.from(sessions)) {
      session.cancel()
    }
  })

  const hasOwnCreatePending = computed(() => createdOptions.value.some((opt) => opt.pending))

  return {
    pending,
    controlRef,
    createdOptions,
    addCreatedOption,
    pendingSelection,
    hasOwnCreatePending,
    settleFailure,
    overlay: overlayState,
    recordEdit,
    run,
  }
}
