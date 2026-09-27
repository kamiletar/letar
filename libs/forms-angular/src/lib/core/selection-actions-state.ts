import { DestroyRef, inject, type Signal, signal } from '@angular/core'
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

/** Сколько ждать подтверждения оптимистичного действия, мс (§16.7) — то же значение, что в React/Vue-версиях */
export const DEFAULT_SETTLE_TIMEOUT = 30_000

const PENDING_VALUE_PREFIX = '__letar_pending_'

const NO_DEPS: FieldDeps = {}

/** Опция, созданная полем: с `pending: true` она показана оптимистично и ещё не подтверждена сервером */
export interface SelectionCreatedOption extends CreatedOption {
  pending?: boolean
}

export interface CreateSelectionActionsStateOptions {
  /** Опции приложения (без созданных и без наложения правок) — по ним прюнится наложение и берётся baselineText */
  appOptions: () => readonly { value: string | number; label?: unknown; textValue?: string }[]
  /**
   * Текущее значение поля. Ожидающий выбор оптимистичного create живёт только в состоянии этой фабрики и
   * снимается, как только значение формы изменилось (выбор пользователя, `reset`, `patchValue`)
   */
  value?: () => string | number | null | undefined
  /** Реестр ожидания формы (framework-free `createPendingRegistry()`); без него отправку ничто не держит */
  registry?: PendingRegistry | null
  /** Отказ подтверждения: без обработчика фабрика выставляет встроенное сообщение (`settleFailure`) */
  onSettleError?: (info: SettleErrorInfo) => void
  /** Мс до признания оптимистичного действия неподтверждённым; по умолчанию 30 000 */
  settleTimeout?: number
  /** Значения родителей (`dependsOn`, §18); по умолчанию `() => {}` */
  deps?: () => FieldDeps
  /**
   * Ключ зависимостей (`serializeDeps`). Смена — другой родитель: созданные опции, наложение правок и
   * ожидающий выбор относились к списку прежнего родителя и сбрасываются (§18.6)
   */
  depsKey?: () => string
}

/** Что оптимистичный вызов показывает: подпись всегда, `value`/`data` — по обстоятельствам */
type OptimisticPreview = Parameters<SelectionActionContext['optimistic']>[0]

/** Результат обработчика приложения, который фабрика умеет применить */
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
   * Применяет непустой результат; не вызывается после `DestroyRef`. У оптимистичного действия
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
  readonly pending: Signal<boolean>
  /** Ручка выпадашки — компонент поля заполняет её через `setControl(...)` */
  setControl: (control: UIKitSelectControl | null) => void
  /**
   * Опции, созданные через `onCreate`; `pending` — ждут сервера. Не `Signal<T>` — вызов делает больше,
   * чем читает (прюнинг наложения, сброс на смену `depsKey`), см. примечание у `syncBeforeRead` в теле
   * фабрики; для шаблона поля разницы нет, вызывается тем же синтаксисом `state.createdOptions()`
   */
  readonly createdOptions: () => readonly SelectionCreatedOption[]
  addCreatedOption: (option: CreatedOption) => void
  /**
   * Временный value оптимистично созданной опции, которую компонент поля показывает выбранной, пока
   * форма хранит прежнее значение; `null` — ожидающего выбора нет
   */
  readonly pendingSelection: () => string | null
  /** Свой оптимистичный create в полёте: `pending`-опции приложения при этом скрыты */
  readonly hasOwnCreatePending: () => boolean
  /** Встроенное сообщение об отказе (`null` — нет); исчезает при следующем действии */
  readonly settleFailure: Signal<{ label: string } | null>
  /** Активное наложение правок (уже прюненное) */
  readonly overlay: () => readonly OptionOverlayEntry[]
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

/** Одно оптимистичное действие: от `optimistic()` до подтверждения, отказа, таймаута или уничтожения (`DestroyRef`) */
interface OptimisticSession {
  finished: boolean
  show: (preview: OptimisticPreview) => void
  resolve: (result: OptimisticResult | null) => void
  fail: (reason: SettleErrorReason, error?: unknown) => void
  cancel: () => void
}

/**
 * Angular-эквивалент React `useSelectionActionsState`/Vue `useSelectionActionsState` — обычная фабрика
 * сигналов (не хук, не композабл: вызывается один раз из конструктора компонента поля, как
 * `createListboxPopup`, — внутри injection context, что требует `inject(DestroyRef)` ниже).
 *
 * Framework-free половина (`pruneOptionOverlay`/`upsertOptionOverlay`/`getOptionText`) — та же, что у
 * React и Vue версий, в `@letar/forms-core/uikit`; эта фабрика — только Angular-сигналы вокруг неё.
 *
 * Отличие от React-версии — в механике, не в поведении: входы — геттеры (`() => T`), читаемые в момент
 * вызова (`run()`, обработчики сессии), поэтому нет нужды в React-подобных `xxxRef`-зеркалах «текущего»
 * значения. Прюнинг наложения (React делал это через `setState` прямо в теле рендера, единственно
 * безопасный для React способ «подстройки состояния при смене пропсов») здесь — обычный `effect()`,
 * который не создаёт цикла по той же причине, что и в React/Vue: `pruneOptionOverlay` возвращает ТУ ЖЕ
 * ссылку, когда убирать нечего.
 */
export function createSelectionActionsState(
  options: CreateSelectionActionsStateOptions,
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

  const destroyRef = inject(DestroyRef)

  const pendingSignal = signal(false)
  const createdOptionsSignal = signal<SelectionCreatedOption[]>([])
  const overlaySignal = signal<OptionOverlayEntry[]>([])
  const heldSignal = signal<HeldSelection | null>(null)
  const settleFailureSignal = signal<{ label: string } | null>(null)

  let control: UIKitSelectControl | null = null
  let alive = true
  const sessions = new Set<OptimisticSession>()
  let tempCounter = 0
  let seenDepsKey = depsKey()

  const currentValue = (): string => {
    const raw = value()
    return raw === undefined || raw === null ? '' : String(raw)
  }

  // Сигналы Angular не имеют декларативного `computed()`, вычисляющего побочные эффекты (сброс/снятие
  // held) — только чистые проекции. Прюнинг и очистка на смену `depsKey` идут поэлементно, до чтения:
  // `syncBeforeRead()` вызывается в начале `run()` и `openPopup`-подобных точек входа компонентов поля.
  function syncBeforeRead(): void {
    const cv = currentValue()
    const held = heldSignal()
    if (held && held.from !== cv) {
      heldSignal.set(null)
    }
    const nextDepsKey = depsKey()
    if (nextDepsKey !== seenDepsKey) {
      seenDepsKey = nextDepsKey
      createdOptionsSignal.set([])
      overlaySignal.set([])
      heldSignal.set(null)
    }
    const pruned = pruneOptionOverlay(appOptions(), overlaySignal())
    if (pruned !== overlaySignal()) {
      overlaySignal.set(pruned as OptionOverlayEntry[])
    }
  }

  // ⚠️ Не `computed()`: Angular запрещает запись в сигналы внутри `computed` (NG0600), а `syncBeforeRead`
  // именно пишет (прюнинг наложения, сброс на смену `depsKey`, снятие `held`) — тот же манёвр, что делает
  // React через `setState` в теле рендера и Vue через `watch`/`watchEffect`, но Angular не даёт спрятать
  // побочный эффект внутри «чистого» примитива. Поэтому здесь обычные функции, вызываемые как сигналы
  // (`state.overlay()`), но не являющиеся `Signal<T>` официально: снаружи framework этого не видно.
  const pendingSelection = (): string | null => {
    syncBeforeRead()
    const held = heldSignal()
    return held && held.from === currentValue() ? held.temp : null
  }
  const overlay = (): readonly OptionOverlayEntry[] => {
    syncBeforeRead()
    return overlaySignal()
  }
  const createdOptions = (): readonly SelectionCreatedOption[] => {
    syncBeforeRead()
    return createdOptionsSignal()
  }
  const hasOwnCreatePending = (): boolean => createdOptions().some((opt) => opt.pending)

  const setControl = (next: UIKitSelectControl | null): void => {
    control = next
  }

  const addCreatedOption = (option: CreatedOption): void => {
    createdOptionsSignal.update((prev) => [...prev, option])
  }

  const recordEdit = (fromValue: string, result: UpdatedOption): void => {
    const appOption = appOptions().find((opt) => String(opt.value) === fromValue)
    const createdIndex = createdOptionsSignal().findIndex((opt) => String(opt.value) === fromValue)
    if (!appOption && createdIndex >= 0) {
      createdOptionsSignal.update((prev) =>
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
    overlaySignal.update((prev) => upsertOptionOverlay(prev, entry))
  }

  const run = <TResult extends OptimisticResult>(runOptions: RunSelectionActionOptions<TResult>): void => {
    syncBeforeRead()
    if (pendingSignal() || !alive) {
      return
    }
    pendingSignal.set(true)
    settleFailureSignal.set(null)
    // Снимок зависимостей на момент начала действия: окно создания получает страну, отказ — страну прежнего списка
    const startDeps = deps()
    const startDepsKey = depsKey()
    const apply: typeof runOptions.apply = (result, info) => {
      // Родитель сменился, пока действие шло: результат относится к списку прежнего родителя — не пишем
      if (depsKey() === startDepsKey) {
        runOptions.apply(result, info)
      }
    }
    control?.close()
    if (runOptions.scope === 'option') {
      control?.focusTrigger()
    }

    let released = false
    const release = () => {
      if (released) {
        return
      }
      released = true
      if (alive) {
        pendingSignal.set(false)
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
      const unregister = registry?.add(settled, { focus: () => control?.focusTrigger() })

      const removePreview = () => {
        if (kind === 'create' && temp) {
          const tempValue = temp
          createdOptionsSignal.update((prev) => prev.filter((opt) => String(opt.value) !== tempValue))
        }
        if (kind === 'edit') {
          overlaySignal.update((prev) => {
            const without = prev.filter((entry) => entry.fromValue !== fromValue)
            return previousEntry ? [...without, previousEntry] : without
          })
        }
      }
      const releaseHeld = () => {
        if (temp && heldSignal()?.temp === temp) {
          heldSignal.set(null)
        }
      }
      const selectionHeldNow = () => {
        const held = heldSignal()
        return !!temp && held?.temp === temp && held.from === currentValue()
      }

      const self: OptimisticSession = {
        finished: false,
        show: (preview) => {
          previewNow = preview
          if (kind === 'create') {
            if (!temp) {
              tempCounter += 1
              temp = `${PENDING_VALUE_PREFIX}${tempCounter}__`
              heldSignal.set({ temp, from: currentValue() })
              timer = setTimeout(() => self.fail('timeout'), settleTimeout)
            }
            const tempValue = temp
            const entry: SelectionCreatedOption = {
              label: preview.label,
              value: tempValue,
              data: preview.data,
              pending: true,
            }
            createdOptionsSignal.update((prev) =>
              prev.some((opt) => opt.value === tempValue)
                ? prev.map((opt) => (opt.value === tempValue ? entry : opt))
                : [...prev, entry]
            )
            runOptions.onOptimistic?.({ label: preview.label })
            return
          }
          if (!timer) {
            previousEntry = overlaySignal().find((entry) => entry.fromValue === fromValue)
            timer = setTimeout(() => self.fail('timeout'), settleTimeout)
          }
          const appOption = appOptions().find((opt) => String(opt.value) === fromValue)
          const createdOption = createdOptionsSignal().find((opt) => String(opt.value) === fromValue)
          overlaySignal.update((prev) =>
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
          if (alive) {
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
          if (alive) {
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
              settleFailureSignal.set({ label: previewNow.label })
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
        if (callDone || !alive || session?.finished) {
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
        } else if (alive && result) {
          apply(result, { optimistic: false, selectionHeld: false })
        }
      } catch (error) {
        if (!session) {
          // Отказ до `optimistic` не глотается: всплывает как unhandled rejection (политика React/Vue-версий)
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

  destroyRef.onDestroy(() => {
    alive = false
    // Уничтожение поля — «отменено», не отказ: запись реестра снимается, отправку не держит и не отменяет
    // `cancel()` сам удаляет себя из `sessions` — копируем набор заранее, чтобы не мутировать его во время обхода
    for (const session of Array.from(sessions)) {
      session.cancel()
    }
  })

  return {
    pending: pendingSignal.asReadonly(),
    setControl,
    createdOptions,
    addCreatedOption,
    pendingSelection,
    hasOwnCreatePending,
    settleFailure: settleFailureSignal.asReadonly(),
    overlay,
    recordEdit,
    run,
  }
}
