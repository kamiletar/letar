'use client'

import { Box, Button, Combobox, Field, Portal, Spinner, Text, useFilter } from '@chakra-ui/react'
import { interpolate } from '@letar/forms-core/i18n'
import {
  applyOptionOverlay,
  CREATE_OPTION_VALUE,
  type CreateOptionHandler,
  createSearchMatcher,
  type DependentFieldProps,
  type FieldDeps,
  getOptionSearchText,
  getOptionText,
  isCreateOptionValue,
  isOptionEditable,
  type LoadOptionsFn,
  type LoadSelectedFn,
  mergeCreatedOptions,
  type SettleErrorInfo,
  shouldOfferCreate,
  type UpdateOptionHandler,
} from '@letar/forms-core/uikit'
import {
  SelectionActionsProvider,
  SelectionOptionProvider,
  useFormPendingRegistry,
  useNodeLabelWarning,
  usePromiseSearch,
  useSelectedLoader,
  useSelectionActionsState,
} from '@letar/forms-react'
import { useStore } from '@tanstack/react-form'
import { type ReactElement, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  BaseFieldProps,
  DescribedOptionFlag,
  EditableOptionFlag,
  FieldSize,
  GroupableOption,
  OptionRenderState,
} from '../../types'
import {
  type AsyncQueryFn,
  createField,
  FieldError,
  getOptionLabel,
  type GroupedOptionsResult,
  type ResolvedFieldProps,
  SelectionFieldLabel,
  useAsyncSearch,
  useGroupedOptions,
} from '../base'
import { DependentSelectNotes } from './dependent-select-notes'
import { useMinCharsHint } from './min-chars-hint'
import { useSelectionString } from './selection-field-strings'
import { SelectCreateButton, SelectEditButton } from './selection-slots'
import { type DependentSelectFieldState, useDependentSelectField } from './use-dependent-select-field'

/** Option of the field: groupable + the «cannot be edited» flag */
type ComboboxItem = GroupableOption & EditableOptionFlag & DescribedOptionFlag

/**
 * Props of Form.Field.Combobox that do not depend on where the options come from. `TDeps` — the shape of `deps`
 * (values of the parent fields from `dependsOn`, §18)
 */
export interface ComboboxFieldBaseProps<T = string, TData = unknown, TDeps extends FieldDeps = FieldDeps>
  extends BaseFieldProps, DependentFieldProps<TDeps>
{
  /**
   * String form of a data element — for filtering, typeahead and the input text after a pick.
   * Needed when `getLabel` returns a node (otherwise the option falls back to its value).
   */
  getTextValue?: (item: TData) => string

  /**
   * Second line of an option in the dropdown list (with `useQuery`; static `options` carry their own `description`).
   * Drawn under the label in the list only — not in the input after a pick. Not called for the «+ Add…» item.
   */
  getDescription?: (item: TData) => ReactNode

  /**
   * The local filter of static `options` also matches the string `description` (default `true`). `false` — the text
   * of the option only. With `useQuery` the server filters, the flag changes nothing.
   */
  searchInDescription?: boolean

  /**
   * Own content of an option in the dropdown. The skin keeps its item frame (highlight,
   * indicator). With `useQuery`, `option.data` is the loaded item; with static `options`, the
   * option's own `data`. Not called for the service «+ Add…» item. Unlike `Select`, there is no
   * `renderValue`: the input holds plain text.
   */
  renderOption?: (option: GroupableOption<T, TData>, state: OptionRenderState) => ReactNode

  /**
   * Label to show for `initialValue`/`defaultValues` when using `useQuery`.
   *
   * Static `options` resolve the initial label automatically. Async search cannot: the item
   * matching the current value may not be present in the current (empty, pre-search) result
   * page, so there is nothing to look the label up in on mount. Pass the label explicitly here
   * when editing an entity with a pre-selected value.
   *
   * @example
   * ```tsx
   * <Form.Field.Combobox
   *   name="userId"
   *   useQuery={(search) => useFindManyUser({ where: { name: { contains: search } } })}
   *   getLabel={(user) => user.name}
   *   getValue={(user) => user.id}
   *   initialLabel={initialValues.userName}
   * />
   * ```
   */
  initialLabel?: string

  /**
   * Get group key from data element
   * Optional, for grouping results
   */
  getGroup?: (item: TData) => string | undefined

  /**
   * Check if element is disabled
   */
  getDisabled?: (item: TData) => boolean

  /**
   * Debounce delay in milliseconds
   * @default 300
   */
  debounce?: number

  /**
   * Minimum characters to trigger search
   * @default 1
   */
  minChars?: number

  /**
   * Pre-fills the search input (and fires the initial `useQuery` search) on mount, without
   * the user typing anything — useful when context already hints at the query (e.g. a label
   * extracted from an imported document that should seed a catalog search).
   */
  initialSearchValue?: string

  /**
   * Show clear button
   * Auto-determined from schema if not specified
   */
  clearable?: boolean

  /**
   * Allow custom values not from the list
   * @default false
   */
  allowCustomValue?: boolean

  /**
   * Create a dictionary record without leaving the form. While the search text is non-empty and
   * matches no option exactly, the list ends with «+ Добавить "<text>"»; picking it calls
   * `onCreate(text)`. The app opens its own creation dialog (and calls its server action) and
   * returns `{ label, value }` — the option is added to the list and selected — or `null` if the
   * user cancelled (the value stays as it was, the search text is kept).
   *
   * Works with static `options` and with `useQuery`. The created option lives while the field is
   * mounted; once the app's own list contains the same value, the app's option wins (no duplicate).
   *
   * @example
   * ```tsx
   * <Form.Field.Combobox
   *   name="categoryId"
   *   options={categories}
   *   onCreate={async (name) => {
   *     const created = await openCategoryDialog({ name })
   *     return created ? { label: created.name, value: created.id } : null
   *   }}
   * />
   * ```
   */
  onCreate?: CreateOptionHandler<TData>

  /** Text of the create item: «+ <createLabel> "<search>"» (default: localized «Add» / «Добавить») */
  createLabel?: string

  /**
   * Show the service «+ Add "<search>"» item (default `true` when `onCreate` is set). `false` — no
   * item: put `<Form.Field.Combobox.CreateButton />` into `listFooter` or `renderEmpty`.
   */
  createItem?: boolean

  /**
   * Edit a dictionary record without leaving the form: a pencil at every item and at the selected
   * value (with `useQuery` — while the selected item is in the loaded page). The app opens its own
   * dialog and returns `{ label, value, data? }` or `null` on cancel. Same `value` = caption fix
   * (the form stays clean); another `value` = replaced record (the selected one follows it).
   * Shortcut: F2 in the input.
   */
  onUpdate?: UpdateOptionHandler<GroupableOption<T, TData> & EditableOptionFlag, TData>

  /**
   * The server did not confirm what `onCreate`/`onUpdate` showed optimistically (`ctx.optimistic(...)`): rejected,
   * `null` after `optimistic`, or no answer within `settleTimeout`. The field has already rolled the option back.
   * Without it the field shows its own message under itself (`role="status"`).
   */
  onSettleError?: (info: SettleErrorInfo<TData>) => void

  /** Milliseconds to wait for the server after `ctx.optimistic(...)` (default 30 000) */
  settleTimeout?: number

  /** With `useQuery`: `false` hides the pencil for this data element (system records) */
  getEditable?: (item: TData) => boolean

  /**
   * With `useQuery`: the data element is not confirmed by the server yet (optimistic update, for example
   * `!!row.$optimistic` of ZenStack) — shown dimmed with a spinner, cannot be selected or edited.
   */
  getPending?: (item: TData) => boolean

  /** Own footer of the list, after the items (e.g. `<Form.Field.Combobox.CreateButton />`) */
  listFooter?: ReactNode

  /**
   * Own content of the «nothing found» state (instead of `emptyMessage`). With `onCreate` the
   * «+ Add "<search>"» item still follows it.
   */
  renderEmpty?: (context: { search: string }) => ReactNode

  /**
   * Component size
   */
  size?: FieldSize

  /**
   * Visual variant
   */
  variant?: 'outline' | 'subtle' | 'flushed'

  /**
   * Message for empty result
   * @default "Nothing found"
   */
  emptyMessage?: string

  /**
   * Message on loading
   * @default "Loading..."
   */
  loadingMessage?: string
}

/** How an item of an async source becomes an option — required for `useQuery` and `loadOptions` */
interface ComboboxGetItem<T, TData> {
  /** Label of a data element */
  getLabel: (item: TData) => ReactNode
  /** Value of a data element */
  getValue: (item: TData) => T
}

/** No other source may be passed next to the one in use — the type says so (`?: never`) */
interface NoStaticOptions {
  options?: never
  loading?: never
}
interface NoHookSource {
  useQuery?: never
  useSelected?: never
}
interface NoPromiseSource {
  loadOptions?: never
  loadSelected?: never
  onLoadError?: never
}

/**
 * Exactly ONE source of options (§16.8 of the plan): static `options`, the hook path `useQuery`
 * (TanStack Query / ZenStack hooks) or the promise path `loadOptions` (server action, `fetch`, SDK).
 * `getLabel`/`getValue` are required for both async paths.
 */
export type ComboboxSource<T = string, TData = unknown, TDeps extends FieldDeps = FieldDeps> =
  | (
    & NoHookSource
    & NoPromiseSource
    & {
      /** Static options. `loading` — they are still being loaded (spinner, «Loading...» in the list) */
      options: (GroupableOption<T, TData> & EditableOptionFlag)[]
      loading?: boolean
      /** Not used with static options (the data of an option is its own `data`) */
      getLabel?: (item: TData) => ReactNode
      getValue?: (item: TData) => T
    }
  )
  | (
    & NoStaticOptions
    & NoPromiseSource
    & ComboboxGetItem<T, TData>
    & {
      /**
       * Hook path: async function that returns `{ data, isLoading, error }` like TanStack Query.
       * It is called on every render — pass `enabled`/`placeholderData` yourself or use
       * `fromSearchQuery` from `@letar/forms-query`.
       *
       * @example
       * ```tsx
       * useQuery={(search) => useFindManyUser({
       *   where: { name: { contains: search, mode: 'insensitive' } },
       *   take: 20,
       * })}
       * ```
       *
       * A dependent field (`dependsOn`, §18) gets the values of the parents as the second argument:
       * `useQuery={(search, deps) => useFindManyEmployee({ where: { companyId: deps.companyId, ... } })}`.
       * Make the query `enabled` only when the parents are filled (`fromSearchQuery` from `@letar/forms-query` does it).
       * While the parent changed and there is no real answer for it yet (`isPlaceholderData`), the field shows an
       * empty list with the loading state instead of the previous parent's options.
       */
      useQuery: AsyncQueryFn<TData, TDeps>
      /**
       * Loads the record of the CURRENT value by its id — a hook, called on every render with the
       * field value (an empty string when nothing is selected; make the query `enabled` only for a
       * non-empty value). Solves what `useQuery` cannot: the selected record may be absent from the
       * current search page, so there is nothing to take its label, `renderOption` data or
       * `onUpdate` argument from.
       *
       * The loaded record becomes the option of the selected value: the input shows its label
       * (`getLabel`/`getTextValue`), the pencil and F2 work on it and `onUpdate` receives its `data`.
       * It does not enter the dropdown list. `initialLabel`, when passed, wins for the initial text.
       *
       * @example
       * ```tsx
       * <Form.Field.Combobox
       *   name="categoryId"
       *   useQuery={(search) => useFindManyCategory({ where: { name: { contains: search } } })}
       *   useSelected={(id) => useFindUniqueCategory({ where: { id } }, { enabled: !!id })}
       *   getLabel={(c) => c.name}
       *   getValue={(c) => c.id}
       * />
       * ```
       */
      useSelected?: (value: string, deps: TDeps) => { data?: TData | null; isLoading?: boolean }
    }
  )
  | (
    & NoStaticOptions
    & NoHookSource
    & ComboboxGetItem<T, TData>
    & {
      /**
       * Promise path: records by the search string. The request starts after `debounce` once
       * `minChars` is reached (`minChars: 0` — with an empty string when the list is opened). A new
       * request cancels the previous one (`signal`), only the last result is applied, previous results
       * stay on screen with a spinner while the next request runs. On an error the list shows the
       * message and «Retry» — there are no automatic retries. After a confirmed `onCreate`/`onUpdate`
       * the current search is requested again. No cache — `useLoaderQuery` from
       * `@letar/forms-query` turns the same loader into a TanStack query with a key.
       *
       * @example
       * ```tsx
       * <Form.Field.Combobox
       *   name="userId"
       *   loadOptions={(search, { signal }) => searchUsers({ search }, signal)}
       *   getLabel={(u) => u.name}
       *   getValue={(u) => u.id}
       * />
       * ```
       */
      loadOptions: LoadOptionsFn<TData, TDeps>
      /**
       * Record of the current value when it is not among the loaded results and there is no
       * `initialLabel` (the pair of `useSelected` for the promise path). Kept per field instance,
       * dropped after `onUpdate` of that record.
       */
      loadSelected?: LoadSelectedFn<TData, TDeps>
      /** An error of `loadOptions`/`loadSelected` (a cancelled request is not an error) — for a log or a toast */
      onLoadError?: (error: unknown) => void
    }
  )

/**
 * Props for Form.Field.Combobox: the common props and exactly one source of options
 */
export type ComboboxFieldProps<T = string, TData = unknown, TDeps extends FieldDeps = FieldDeps> =
  & ComboboxFieldBaseProps<T, TData, TDeps>
  & ComboboxSource<T, TData, TDeps>

/** State type for useFieldState */
interface ComboboxFieldState extends GroupedOptionsResult {
  inputValue: string
  setInputValue: (value: string) => void
  /** Значение, чья подпись сейчас в инпуте; запись значения самим полем помечается тут, чтобы не считаться внешней */
  syncedValueRef: { current: string | undefined }
  isLoading: boolean
  /** Ошибка `loadOptions` для текущей строки поиска (`null` — нет) */
  loadError: unknown
  /** Повторить запрос `loadOptions` с той же строкой; для `onCreate`/`onUpdate` — перезапрос после подтверждения */
  retryLoad: () => void
  /** Сбросить закэшированную запись значения (`loadSelected`) — после `onUpdate` этой записи */
  invalidateSelected: (value: string) => void
  options: ComboboxItem[]
  resolvedClearable: boolean
  /** Локализованная подсказка «введите ещё символов» для пустого списка */
  minCharsHint: string
  /** Локализованный дефолт `placeholder`, когда его не задали ни проп, ни schema meta */
  defaultPlaceholder: string
  /** Локализованный дефолт `loadingMessage`, когда проп не задан */
  defaultLoadingMessage: string
  /** Локализованный дефолт `emptyMessage`, когда проп не задан */
  defaultEmptyMessage: string
  /** Локализованные «Не удалось загрузить» и «Повторить» для ошибки `loadOptions` */
  loadErrorStrings: { message: string; retry: string }
  /** Подпись служебного пункта «+ Добавить "<поиск>"» (пусто, если пункт сейчас не предлагается) */
  createItemLabel: string
  /** Шаблон сообщения об отказе оптимистичного действия, `{label}` подставляется при показе */
  settleErrorTemplate: string
  /** Зависимое поле (§18): `deps`, блокировка, подсказка, объявление очистки */
  dependent: DependentSelectFieldState
  /** Действия (`onCreate`/`onUpdate`): pending, наложение правок, созданные опции, конвейер */
  actions: ReturnType<typeof useSelectionActionsState>
  /** Все опции (с правками и созданными, без фильтра по тексту) по строковому значению */
  optionByValue: Map<string, ComboboxItem>
  /** Локализованные строки слотов */
  strings: { edit: string; hotkeyHint: string; createVerb: string }
  /** Управляемое открытие списка + ссылки для F2 и возврата фокуса */
  dropdown: {
    open: boolean
    setOpen: (open: boolean) => void
    inputRef: { current: HTMLInputElement | null }
    highlightedRef: { current: string | null }
  }
}

/**
 * Form.Field.Combobox - Async search select with debounce and grouping
 *
 * Supports both static options and async loading via TanStack Query hooks.
 *
 * @example Static options
 * ```tsx
 * <Form.Field.Combobox
 *   name="framework"
 *   label="Framework"
 *   options={[
 *     { label: 'React', value: 'react' },
 *     { label: 'Vue', value: 'vue', group: 'Frontend' },
 *   ]}
 * />
 * ```
 *
 * @example Async with ZenStack hooks
 * ```tsx
 * <Form.Field.Combobox
 *   name="userId"
 *   label="User"
 *   useQuery={(search) => useFindManyUser({
 *     where: { name: { contains: search, mode: 'insensitive' } },
 *     take: 20,
 *   })}
 *   getLabel={(user) => user.name}
 *   getValue={(user) => user.id}
 *   getGroup={(user) => user.role}
 *   debounce={300}
 *   minChars={2}
 * />
 * ```
 */
/** Предупреждение про два источника опций — один раз на процесс и только в dev/test (типы ловят это в TS, JS — нет) */
let multipleSourcesWarned = false

/** Сброс флага предупреждения — для тестов */
export function resetComboboxSourceWarning(): void {
  multipleSourcesWarned = false
}

function warnMultipleSources(props: { options?: unknown; useQuery?: unknown; loadOptions?: unknown }): void {
  const env = typeof process === 'undefined' ? undefined : process.env?.['NODE_ENV']
  if ((env !== 'development' && env !== 'test') || multipleSourcesWarned) {
    return
  }
  const used = [props.options, props.useQuery, props.loadOptions].filter((source) => source !== undefined).length
  if (used > 1) {
    multipleSourcesWarned = true
    console.warn(
      '[@letar/forms] Field.Combobox: передано больше одного источника опций (`options`, `useQuery`, `loadOptions`) — '
        + 'нужен ровно один (побеждает `options`).',
    )
  }
}

const FieldComboboxBase = createField<ComboboxFieldProps, string, ComboboxFieldState>({
  displayName: 'FieldCombobox',
  useFieldState: (
    componentProps: Omit<ComboboxFieldProps, keyof BaseFieldProps>,
    resolved: ResolvedFieldProps,
    { form, fullPath },
  ): ComboboxFieldState => {
    // `useStore` (не render-prop `<form.Field>`) — даёт значение поля до монтирования
    // `<form.Field>`, как и в `field-city.tsx`/`field-address.tsx`. Читаем его ДО
    // `useAsyncSearch`, чтобы решить, нужно ли сеять `initialSearchValue` — у уже выбранного
    // значения приоритет: показывать вместо него текст затравки было бы неверно.
    const fieldValue = useStore(form.store, () => form.getFieldValue(fullPath)) as string | undefined

    // Зависимое поле (§18): родители, блокировка, очистка по правке родителя. Пустое значение — то же, что пишет
    // собственная кнопка очистки (`dependent.emptyValue`): `null` у nullable-схемы, иначе `''`
    const dependent = useDependentSelectField(componentProps as DependentFieldProps, {
      fullPath,
      label: resolved.label,
    })
    const parentsNotReady = dependent.active && !dependent.ready

    // Ввод и дебаунс — общие для обоих асинхронных путей; хук-путь (`useQuery`) — прямо здесь
    const {
      inputValue,
      setInputValue,
      isLoading: hookLoading,
      data: hookData,
      debouncedSearch,
      shouldQuery,
    } = useAsyncSearch({
      useQuery: componentProps.useQuery,
      deps: dependent.deps,
      // Ключ нужен только зависимому полю: по нему прежний `placeholderData` чужого родителя скрывается (§18.7)
      depsKey: dependent.active ? dependent.depsKey : undefined,
      debounce: componentProps.debounce ?? 300,
      minChars: componentProps.minChars ?? 1,
      initialValue: fieldValue ? undefined : componentProps.initialSearchValue,
    })

    useEffect(() => {
      warnMultipleSources(componentProps)
    }, [componentProps])

    // Ручка выпадашки для конвейера действий: закрыть список / вернуть фокус в инпут.
    // Промис-путь стартует, когда список хоть раз открывали — N полей на странице не шлют N запросов на монтировании
    const [open, setOpenState] = useState(false)
    const [everOpened, setEverOpened] = useState(false)
    const setOpen = useCallback((next: boolean) => {
      setOpenState(next)
      if (next) {
        setEverOpened(true)
      }
    }, [])

    // Промис-путь (`loadOptions`): запрос на дебаунсенную строку поиска, отмена, гонки, ошибка + повтор
    const promiseSearch = usePromiseSearch({
      loadOptions: componentProps.loadOptions,
      search: debouncedSearch,
      // Пока родители не готовы, запрос не уходит (региона нет — городов не просим)
      enabled: everOpened && shouldQuery && !parentsNotReady,
      onLoadError: componentProps.onLoadError,
      deps: dependent.deps,
      depsKey: dependent.depsKey,
    })
    // Хук-путь при неготовых родителях: результат хука (в том числе кэш прежнего родителя) не показываем
    const queryData = parentsNotReady ? undefined : componentProps.loadOptions ? promiseSearch.data : hookData
    const isLoading = !parentsNotReady && (hookLoading || promiseSearch.isLoading || !!componentProps.loading)

    // `loadSelected`: значение непустое, его нет в текущих результатах и нет `initialLabel`
    const valueKey = fieldValue ? String(fieldValue) : ''
    const valueInResults = !!queryData && !!componentProps.getValue
      && (queryData as unknown[]).some((item) => String(componentProps.getValue?.(item)) === valueKey)
    const promiseSelected = useSelectedLoader({
      loadSelected: componentProps.loadSelected,
      value: valueKey,
      enabled: !valueInResults && componentProps.initialLabel === undefined,
      onLoadError: componentProps.onLoadError,
      deps: dependent.deps,
    })

    // Запись текущего значения по id: хук `useSelected` (вызывается на каждом рендере, как `useQuery`) или `loadSelected`
    // `deps` вторым аргументом — только у зависимого поля: у обычного вызов остаётся прежним `useSelected(value)`
    const selectedResult = dependent.active
      ? componentProps.useSelected?.(valueKey, dependent.deps)
      : (componentProps.useSelected as ((value: string) => { data?: unknown; isLoading?: boolean }) | undefined)?.(
        valueKey,
      )
    const selectedItem = componentProps.useSelected ? selectedResult?.data : promiseSelected.data

    // Опция выбранного значения из `useSelected`: в список не попадает, только в `optionByValue` и подпись
    const selectedSourceOption = useMemo((): ComboboxItem | undefined => {
      if (selectedItem === undefined || selectedItem === null || !componentProps.getLabel || !componentProps.getValue) {
        return undefined
      }
      return {
        label: componentProps.getLabel(selectedItem),
        textValue: componentProps.getTextValue?.(selectedItem),
        data: selectedItem,
        value: String(componentProps.getValue(selectedItem)),
        disabled: componentProps.getDisabled?.(selectedItem),
        editable: componentProps.getEditable?.(selectedItem),
      }
    }, [
      selectedItem,
      componentProps.getLabel,
      componentProps.getTextValue,
      componentProps.getDescription,
      componentProps.getValue,
      componentProps.getDisabled,
      componentProps.getEditable,
      componentProps.getPending,
    ])

    // Инициализация `inputValue` из значения поля (сценарий `defaultValues` при редактировании).
    // `Combobox.Root` контролируем по `inputValue` отдельно от `value` (см. `render` ниже) —
    // `useAsyncSearch` стартует с пустой строкой независимо от того, что значение уже выбрано,
    // поэтому без явной синхронизации поле показывает пустой инпут при непустом значении.
    // `initialLabel` сильнее записи из `useSelected`, та приходит позже — ждём её
    // Внешняя смена значения (восстановление черновика, `reset(values)`, `setFieldValue`, `UrlSync`) тоже меняет подпись:
    // `syncedValueRef` хранит значение, чья подпись уже в инпуте, а собственные записи поля помечают его сами
    const syncedValueRef = useRef<string | undefined>(undefined)
    useEffect(() => {
      const current = fieldValue ? String(fieldValue) : undefined
      if (current === undefined) {
        syncedValueRef.current = undefined
        return
      }
      // Первичная инициализация не перебивает уже набранный текст; внешнюю смену значения — перебивает
      if (syncedValueRef.current === current || (syncedValueRef.current === undefined && inputValue)) {
        return
      }

      let label: string | undefined
      if (componentProps.options) {
        const matchedOption = componentProps.options.find((opt) => String(opt.value) === current)
        label = matchedOption ? getOptionLabel(matchedOption) : undefined
      } else if (componentProps.initialLabel !== undefined && syncedValueRef.current === undefined) {
        label = componentProps.initialLabel
      } else if (selectedSourceOption && selectedSourceOption.value === current) {
        label = getOptionLabel(selectedSourceOption)
      }
      // Опции и запись из `useSelected` могут прийти позже (загрузка справочника) — синхронизация
      // закрывается только когда подпись найдена
      if (label !== undefined) {
        syncedValueRef.current = current
        setInputValue(label)
      }
    }, [
      fieldValue,
      inputValue,
      componentProps.options,
      componentProps.initialLabel,
      selectedSourceOption,
      setInputValue,
    ])

    // Автоочистка значения (§18.3) убирает и текст в поле ввода: он был подписью очищенного значения
    const clearedId = dependent.cleared?.id
    useEffect(() => {
      if (clearedId !== undefined) {
        setInputValue('')
      }
    }, [clearedId, setInputValue])

    // Filter for static options
    const { contains } = useFilter({ sensitivity: 'base' })

    const hasOnCreate = !!componentProps.onCreate && componentProps.createItem !== false
    const createVerb = useSelectionString('formSelection.createOption')
    const editVerb = useSelectionString('formSelection.editOption')
    const hotkeyHint = useSelectionString('formSelection.editHotkeyHint')

    // Опции приложения без фильтра по тексту: статические или загруженные `useQuery`
    const sourceOptions = useMemo((): ComboboxItem[] => {
      if (componentProps.options) {
        return componentProps.options as ComboboxItem[]
      }
      if (queryData && componentProps.getLabel && componentProps.getValue) {
        const getLabel = componentProps.getLabel
        const getTextValue = componentProps.getTextValue
        const getDescription = componentProps.getDescription
        const getValue = componentProps.getValue
        const getGroup = componentProps.getGroup
        const getDisabled = componentProps.getDisabled
        const getEditable = componentProps.getEditable
        const getPending = componentProps.getPending
        return (queryData as unknown[]).map((item) => ({
          label: getLabel(item),
          textValue: getTextValue?.(item),
          description: getDescription?.(item),
          data: item,
          value: getValue(item),
          group: getGroup?.(item),
          disabled: getDisabled?.(item),
          editable: getEditable?.(item),
          pending: getPending?.(item),
        }))
      }
      return []
    }, [
      componentProps.options,
      queryData,
      componentProps.getLabel,
      componentProps.getTextValue,
      componentProps.getValue,
      componentProps.getGroup,
      componentProps.getDisabled,
      componentProps.getEditable,
    ])

    const pendingRegistry = useFormPendingRegistry()
    const actions = useSelectionActionsState({
      appOptions: sourceOptions,
      value: fieldValue,
      registry: pendingRegistry,
      onSettleError: componentProps.onSettleError as ((info: SettleErrorInfo) => void) | undefined,
      settleTimeout: componentProps.settleTimeout,
      deps: dependent.deps,
      depsKey: dependent.depsKey,
    })
    const { createdOptions, overlay } = actions
    const settleErrorTemplate = useSelectionString('formSelection.settleError')

    const inputRef = useRef<HTMLInputElement | null>(null)
    const highlightedRef = useRef<string | null>(null)
    const { controlRef } = actions
    useEffect(() => {
      controlRef.current = {
        close: () => setOpen(false),
        focusTrigger: () => inputRef.current?.focus(),
      }
      return () => {
        controlRef.current = null
      }
    }, [controlRef])

    // Все опции с правками и созданными — по ним ищется опция для карандаша у значения
    const allOptions = useMemo((): ComboboxItem[] => {
      // Значения Combobox — строки: числовое значение из `onCreate`/`onUpdate` приводится к строке
      // Пока свой оптимистичный create в полёте, `pending`-опции приложения скрыты: почти всегда это та же запись
      // (мутация ZenStack вставила её в кэш), иначе в списке две «Кровли» (§16.7)
      const shownApp = actions.hasOwnCreatePending ? sourceOptions.filter((opt) => !opt.pending) : sourceOptions
      const edited = applyOptionOverlay(shownApp, overlay).map((opt): ComboboxItem =>
        typeof opt.value === 'string' ? opt : { ...opt, value: String(opt.value) }
      )
      const created = createdOptions.map((opt): ComboboxItem => ({
        label: opt.label,
        value: String(opt.value),
        data: opt.data,
        pending: opt.pending,
      }))
      // Опция приложения сильнее созданной с тем же значением — после перезагрузки справочника дубля нет
      const merged = mergeCreatedOptions(edited, created)
      // Опция в ожидании подтверждения не выбирается ни мышью, ни клавиатурой: в коллекции zag она disabled
      return merged.map((opt): ComboboxItem => (opt.pending ? { ...opt, disabled: true } : opt))
    }, [sourceOptions, overlay, createdOptions, actions.hasOwnCreatePending])

    // Запись из `useSelected` — вне списка; правки (`onUpdate`) накладываются и на неё
    const selectedOption = useMemo((): ComboboxItem | undefined => {
      if (!selectedSourceOption || allOptions.some((opt) => String(opt.value) === selectedSourceOption.value)) {
        return undefined
      }
      const [edited] = applyOptionOverlay([selectedSourceOption], overlay)
      return edited && typeof edited.value !== 'string' ? { ...edited, value: String(edited.value) } : edited
    }, [selectedSourceOption, allOptions, overlay])

    const optionByValue = useMemo(() => {
      const map = new Map<string, ComboboxItem>(allOptions.map((opt) => [String(opt.value), opt]))
      if (selectedOption) {
        map.set(String(selectedOption.value), selectedOption)
      }
      return map
    }, [allOptions, selectedOption])

    // Фильтр по тексту: статичные опции фильтруем сами (правки уже наложены), `useQuery` — на сервере;
    // созданные опции фильтруются так же, как остальные
    const baseOptions = useMemo((): ComboboxItem[] => {
      const createdValues = new Set(createdOptions.map((opt) => String(opt.value)))
      // Запрос, набранный не в той раскладке, тоже находит («ghbdtn» → «Привет»)
      const matcher = createSearchMatcher(inputValue, contains)
      const getText = componentProps.searchInDescription === false ? getOptionLabel : getOptionSearchText
      return allOptions.filter((opt) => {
        const isLocal = componentProps.options !== undefined || createdValues.has(String(opt.value))
        return !isLocal || !matcher || matcher(getText(opt))
      })
    }, [allOptions, createdOptions, componentProps.options, inputValue, contains, componentProps.searchInDescription])

    // Служебный пункт «+ Добавить "<поиск>"» — в конце списка, вне групп. Значение перехватывается
    // в `onValueChange` и в форму не попадает
    const search = inputValue.trim()
    const createItemLabel = hasOnCreate && shouldOfferCreate(search, baseOptions.map((opt) => getOptionLabel(opt)))
      ? `+ ${componentProps.createLabel ?? createVerb} "${search}"`
      : ''
    const options = useMemo(
      (): ComboboxItem[] =>
        createItemLabel ? [...baseOptions, { label: createItemLabel, value: CREATE_OPTION_VALUE }] : baseOptions,
      [baseOptions, createItemLabel],
    )

    useNodeLabelWarning('Combobox', baseOptions)

    // Create collection with grouping via shared hook
    const { collection, groups } = useGroupedOptions(options)

    // Auto-determine clearable
    const resolvedClearable = componentProps.clearable ?? !resolved.required

    // Подсказка и дефолты статичных строк резолвятся здесь, а не в `render`: `render` — колбэк
    // внутри `form.Field`, хуки там небезопасны (см. JSDoc `useMinCharsHint`)
    const minCharsHint = useMinCharsHint(componentProps.minChars ?? 1)
    const defaultPlaceholder = useSelectionString('formSelection.combobox.placeholder')
    const defaultLoadingMessage = useSelectionString('formSelection.combobox.loadingMessage')
    const defaultEmptyMessage = useSelectionString('formSelection.combobox.emptyMessage')
    const loadErrorMessage = useSelectionString('formSelection.combobox.errorMessage')
    const loadRetry = useSelectionString('formSelection.combobox.retry')

    return {
      inputValue,
      setInputValue,
      syncedValueRef,
      dependent,
      isLoading,
      loadError: promiseSearch.error,
      retryLoad: promiseSearch.reload,
      invalidateSelected: promiseSelected.invalidate,
      options,
      collection,
      groups,
      resolvedClearable,
      minCharsHint,
      defaultPlaceholder,
      defaultLoadingMessage,
      defaultEmptyMessage,
      loadErrorStrings: { message: loadErrorMessage, retry: loadRetry },
      createItemLabel,
      actions,
      settleErrorTemplate,
      optionByValue,
      strings: { edit: editVerb, hotkeyHint, createVerb },
      dropdown: { open, setOpen, inputRef, highlightedRef },
    }
  },
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const formValue = field.state.value as string | undefined
    const minChars = componentProps.minChars ?? 1
    const { actions, strings, dropdown } = fieldState
    // Оптимистично созданная запись показана выбранной, пока форма хранит прежнее значение (§16.7)
    const currentValue = actions.pendingSelection ?? formValue
    const hasOnUpdate = !!componentProps.onUpdate
    // Зависимое поле без готовых родителей заблокировано (§18.10)
    const { dependent } = fieldState
    const disabled = resolved.disabled || dependent.blocked
    const interactive = !disabled && !resolved.readOnly
    const search = fieldState.inputValue.trim()

    // Ошибки `onCreate`/`onUpdate` — забота приложения: всплывают как unhandled rejection
    // (GlitchTip), здесь не глотаются
    const runCreate = () => {
      const onCreate = componentProps.onCreate
      if (!onCreate) {
        return
      }
      // Текст ввода до действия: отказ оптимистичного create возвращает поле в него
      const previousText = formValue
        ? getOptionText(fieldState.optionByValue.get(String(formValue)) ?? { value: '' })
        : ''
      actions.run({
        scope: 'option',
        kind: 'create',
        call: (ctx) => onCreate(search, ctx),
        onOptimistic: (preview) => fieldState.setInputValue(preview.label),
        onRevert: () => fieldState.setInputValue(previousText),
        apply: (created, info) => {
          actions.addCreatedOption(created)
          // Выбор пользователя, сделанный за время ожидания, подтверждение не перебивает
          if (info.optimistic && !info.selectionHeld) {
            return
          }
          fieldState.syncedValueRef.current = String(created.value)
          field.handleChange(String(created.value))
          fieldState.setInputValue(created.label)
          // Промис-путь: внешнего кэша, который обновил бы список, нет — запрашиваем текущий поиск заново
          if (componentProps.loadOptions) {
            fieldState.retryLoad()
          }
        },
      })
    }

    // Выбрана ли запись `from` СЕЙЧАС: значение читаем живым — за время оптимистичного ожидания оно могло измениться
    const isSelectedNow = (from: string): boolean => {
      const live = field.form.getFieldValue(field.name) as string | undefined
      return live !== undefined && live !== '' && String(live) === from
    }

    const runEdit = (option: unknown, scope: 'option' | 'value') => {
      const onUpdate = componentProps.onUpdate
      const source = option as ComboboxItem
      if (!onUpdate) {
        return
      }
      const fromValue = String(source.value)
      actions.run({
        scope,
        kind: 'edit',
        fromValue,
        call: (ctx) => onUpdate(source as Parameters<typeof onUpdate>[0], ctx),
        // Правят выбранное: инпут показывает новую подпись сразу, не дожидаясь сервера
        onOptimistic: (preview) => {
          if (isSelectedNow(fromValue)) {
            fieldState.setInputValue(preview.label)
          }
        },
        apply: (result) => {
          actions.recordEdit(fromValue, result)
          if (componentProps.loadOptions) {
            fieldState.retryLoad()
          }
          fieldState.invalidateSelected(fromValue)
          // Правили выбранное: инпут показывает новую подпись, а замена записи переносит значение.
          // Значение читаем живым: при оптимистичной правке за время ожидания оно могло измениться
          if (isSelectedNow(fromValue)) {
            if (String(result.value) !== fromValue) {
              fieldState.syncedValueRef.current = String(result.value)
              field.handleChange(String(result.value))
            }
            fieldState.setInputValue(result.label)
          }
        },
      })
    }

    const actionsValue = {
      pending: actions.pending,
      canCreate: !!componentProps.onCreate,
      hasOnUpdate,
      interactive,
      search,
      runCreate,
      runEdit,
      strings: {
        edit: strings.edit,
        editAria: (text: string) => `${strings.edit}: ${text}`,
        create: `+ ${componentProps.createLabel ?? strings.createVerb}…`,
        createWithSearch: (text: string) => `+ ${componentProps.createLabel ?? strings.createVerb} "${text}"`,
        hotkeyHint: strings.hotkeyHint,
      },
    }

    const optionContext = (opt: { value: unknown }, scope: 'option' | 'value') => {
      const source = fieldState.optionByValue.get(String(opt.value))
      return {
        option: source,
        text: source ? getOptionText(source) : '',
        editable: !!source && isOptionEditable(source, hasOnUpdate),
        scope,
      }
    }

    // Содержимое пункта: своё (`renderOption`) или label как есть (узел не сплющивается в строку).
    // Служебный пункт «+ Добавить…» через renderOption не проходит
    const renderItemContent = (opt: GroupableOption): ReactNode => {
      if (!componentProps.renderOption || isCreateOptionValue(String(opt.value))) {
        return opt.label
      }
      return (
        <SelectionOptionProvider value={optionContext(opt, 'option')}>
          {componentProps.renderOption(opt, {
            selected: currentValue !== undefined && currentValue !== '' && String(currentValue) === String(opt.value),
            disabled: opt.disabled ?? false,
            pending: opt.pending ?? false,
          })}
        </SelectionOptionProvider>
      )
    }

    // Карандаш по умолчанию — только без своего `renderOption` (там свои кнопки)
    const renderItemActions = (opt: GroupableOption): ReactNode =>
      hasOnUpdate && !componentProps.renderOption && !isCreateOptionValue(String(opt.value))
        ? (
          <SelectionOptionProvider value={optionContext(opt, 'option')}>
            <SelectEditButton />
          </SelectionOptionProvider>
        )
        : null

    // Вторая строка — сосед `ItemText`, не его ребёнок: в поле после выбора идёт `itemToString`, описания там нет.
    // Со своим `renderOption` пункт рисует приложение, `description` оно берёт из опции само
    const renderItemBody = (opt: GroupableOption & DescribedOptionFlag) => {
      const text = <Combobox.ItemText>{renderItemContent(opt)}</Combobox.ItemText>
      if (
        componentProps.renderOption || opt.description === undefined || opt.description === null
        || opt.description === '' || isCreateOptionValue(String(opt.value))
      ) {
        return text
      }
      return (
        <Box flex="1" minW="0" display="flex" flexDirection="column">
          {text}
          <Text data-part="item-description" textStyle="xs" color="fg.muted" fontWeight="normal">
            {opt.description}
          </Text>
        </Box>
      )
    }

    const renderItem = (opt: GroupableOption & DescribedOptionFlag) => (
      <Combobox.Item item={opt} key={opt.value} data-pending={opt.pending ? '' : undefined}>
        {renderItemBody(opt)}
        {opt.pending ? <Spinner size="xs" /> : renderItemActions(opt)}
        <Combobox.ItemIndicator />
      </Combobox.Item>
    )

    const selectedSource = currentValue ? fieldState.optionByValue.get(String(currentValue)) : undefined
    const showValueEdit = hasOnUpdate && !!selectedSource && isOptionEditable(selectedSource, true)

    // Пустой результат: сообщение (или своё `renderEmpty`) + пункт «+ Добавить "…"» под ним.
    // Служебный пункт делает список непустым, поэтому «пусто» считаем по опциям без него
    const realOptionsCount = fieldState.options.filter((opt) => !isCreateOptionValue(String(opt.value))).length
    const hasLoadError = fieldState.loadError !== null && fieldState.loadError !== undefined
    const nothingFound = !fieldState.isLoading && !hasLoadError && realOptionsCount === 0
      && fieldState.inputValue.length >= minChars
    const emptyContent = componentProps.renderEmpty
      ? componentProps.renderEmpty({ search })
      : (componentProps.emptyMessage ?? fieldState.defaultEmptyMessage)

    return (
      <Field.Root invalid={hasError} required={resolved.required} disabled={disabled}>
        <SelectionActionsProvider value={actionsValue}>
          <Combobox.Root
            collection={fieldState.collection}
            size={componentProps.size ?? 'md'}
            variant={componentProps.variant ?? 'outline'}
            value={currentValue ? [currentValue] : []}
            inputValue={fieldState.inputValue}
            open={dropdown.open}
            onOpenChange={(details) => dropdown.setOpen(details.open)}
            onHighlightChange={(details) => {
              dropdown.highlightedRef.current = details.highlightedValue
            }}
            onInputValueChange={(details) => {
              // Выбор служебного пункта подставил бы его подпись в инпут — текст поиска остаётся
              if (fieldState.createItemLabel && details.inputValue === fieldState.createItemLabel) {
                return
              }
              fieldState.setInputValue(details.inputValue)
            }}
            onValueChange={(details) => {
              const newValue = details.value[0] as string | undefined
              if (isCreateOptionValue(newValue)) {
                runCreate()
                return
              }
              fieldState.syncedValueRef.current = newValue || undefined
              field.handleChange(newValue || fieldState.dependent.emptyValue)
            }}
            onInteractOutside={() => field.handleBlur()}
            disabled={disabled}
            readOnly={resolved.readOnly}
            allowCustomValue={componentProps.allowCustomValue ?? false}
            openOnClick
            data-field-name={fullPath}
          >
            {resolved.label && (
              <Combobox.Label>
                <SelectionFieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />
              </Combobox.Label>
            )}

            <Combobox.Control>
              <Combobox.Input
                ref={dropdown.inputRef}
                placeholder={dependent.blockedPlaceholder ?? resolved.placeholder ?? fieldState.defaultPlaceholder}
                aria-describedby={dependent.hint ? dependent.hintId : undefined}
                pe={showValueEdit ? '6.5rem' : undefined}
                // Выбранное значение ждёт сервера (§16.7): подпись уже новая, спиннер рядом
                aria-busy={selectedSource?.pending ? true : undefined}
                aria-keyshortcuts={hasOnUpdate && interactive ? 'F2' : undefined}
                title={hasOnUpdate && interactive ? strings.hotkeyHint : undefined}
                onKeyDown={(event) => {
                  // Ошибка `loadOptions`: Enter в поле повторяет запрос (кнопка «Повторить» — в списке)
                  if (event.key === 'Enter' && hasLoadError && dropdown.open) {
                    event.preventDefault()
                    fieldState.retryLoad()
                    return
                  }
                  if (event.key !== 'F2' || !hasOnUpdate || !interactive) {
                    return
                  }
                  // Открытый список: подсвеченный пункт; закрытый — выбранное значение
                  const highlighted = dropdown.open ? dropdown.highlightedRef.current : null
                  const value = highlighted ?? (currentValue ? String(currentValue) : null)
                  const source = value ? fieldState.optionByValue.get(value) : undefined
                  if (source && isOptionEditable(source, true)) {
                    event.preventDefault()
                    runEdit(source, highlighted ? 'option' : 'value')
                  }
                }}
              />
              <Combobox.IndicatorGroup>
                {(fieldState.isLoading || selectedSource?.pending) && <Spinner size="xs" />}
                {fieldState.resolvedClearable && <Combobox.ClearTrigger />}
                {showValueEdit && (
                  // IndicatorGroup не принимает клики (pointer-events: none) — кнопке возвращаем их
                  <Box display="flex" alignItems="center" pointerEvents="auto">
                    <SelectionOptionProvider value={optionContext(selectedSource, 'value')}>
                      <SelectEditButton />
                    </SelectionOptionProvider>
                  </Box>
                )}
                <Combobox.Trigger />
              </Combobox.IndicatorGroup>
            </Combobox.Control>

            <Portal>
              <Combobox.Positioner>
                <Combobox.Content>
                  {/* Loading state */}
                  {fieldState.isLoading && fieldState.options.length === 0 && (
                    <Combobox.Empty>{componentProps.loadingMessage ?? fieldState.defaultLoadingMessage}</Combobox.Empty>
                  )}

                  {/* Ошибка `loadOptions`: сообщение и «Повторить» на месте пустого состояния */}
                  {hasLoadError && (
                    <Box px={3} py={2} display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                      <Box color="fg.error" fontSize="sm" role="alert">{fieldState.loadErrorStrings.message}</Box>
                      <Button size="xs" variant="outline" onClick={fieldState.retryLoad}>
                        {fieldState.loadErrorStrings.retry}
                      </Button>
                    </Box>
                  )}

                  {/* Empty result: с пунктом создания — своим блоком, `Combobox.Empty` прячется при непустой коллекции */}
                  {nothingFound && fieldState.createItemLabel && (
                    <Box px={3} py={2} color="fg.muted" fontSize="sm">{emptyContent}</Box>
                  )}
                  {nothingFound && !fieldState.createItemLabel && <Combobox.Empty>{emptyContent}</Combobox.Empty>}

                  {/* Hint about minimum characters */}
                  {!fieldState.isLoading
                    && !hasLoadError
                    && fieldState.options.length === 0
                    && fieldState.inputValue.length < minChars
                    && fieldState.inputValue.length > 0 && <Combobox.Empty>{fieldState.minCharsHint}</Combobox.Empty>}

                  {/* Grouped options */}
                  {fieldState.groups
                    ? Array.from(fieldState.groups.entries()).map(([groupName, groupOptions]) => (
                      <Combobox.ItemGroup key={groupName}>
                        {groupName && <Combobox.ItemGroupLabel>{groupName}</Combobox.ItemGroupLabel>}
                        {groupOptions.map(renderItem)}
                      </Combobox.ItemGroup>
                    ))
                    /* Flat options */
                    : fieldState.options.map(renderItem)}

                  {componentProps.listFooter && (
                    <Box position="sticky" bottom={0} bg="bg.panel" borderTopWidth="1px" mt={1} pt={1}>
                      {componentProps.listFooter}
                    </Box>
                  )}
                </Combobox.Content>
              </Combobox.Positioner>
            </Portal>
          </Combobox.Root>
        </SelectionActionsProvider>

        <DependentSelectNotes dependent={dependent} />
        {actions.settleFailure && (
          <Box role="status" mt={1} fontSize="sm" color="fg.error" data-settle-error="">
            {interpolate(fieldState.settleErrorTemplate, { label: actions.settleFailure.label })}
          </Box>
        )}
        <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </Field.Root>
    )
  },
})

/**
 * `createField` is not generic, so the generic signature is restored by a cast: `TData` is
 * inferred from `options`/`useQuery` and flows into `renderOption`/`getTextValue`/`getLabel`.
 */
const FieldComboboxGeneric = FieldComboboxBase as unknown as <T = string, TData = unknown>(
  props: ComboboxFieldProps<T, TData>,
) => ReactElement

/** Slots `Form.Field.Combobox.EditButton` / `.CreateButton` — for your own `renderOption`/`listFooter`/`renderEmpty` */
export const FieldCombobox = Object.assign(FieldComboboxGeneric, {
  EditButton: SelectEditButton,
  CreateButton: SelectCreateButton,
})
