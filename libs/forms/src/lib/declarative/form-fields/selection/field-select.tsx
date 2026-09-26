'use client'

import { Box } from '@chakra-ui/react'
import {
  applyOptionOverlay,
  CREATE_OPTION_VALUE,
  type CreateOptionHandler,
  type DependentFieldProps,
  type FieldDeps,
  getOptionText,
  isCreateOptionValue,
  isOptionEditable,
  type LoadOptionsFn,
  mergeCreatedOptions,
  type OptionsSourceProps,
  type SelectSearchable,
  type SettleErrorInfo,
  shouldOfferCreate,
  type UIKitSelectSearch,
  type UpdateOptionHandler,
} from '@letar/forms-core/uikit'
import {
  SelectionActionsProvider,
  SelectionOptionProvider,
  useFormPendingRegistry,
  useNodeLabelWarning,
  useOptionsLoader,
  useSelectionActionsState,
  useSelectionSearch,
} from '@letar/forms-react'
import { useStore } from '@tanstack/react-form'
import type { ReactElement, ReactNode } from 'react'
import { useEffect, useMemo } from 'react'
import type { BaseFieldProps, FieldSize, OptionRenderState, SelectFieldOption } from '../../types'
import { chakraUIKit, createField, type ResolvedFieldProps, SelectionFieldLabel } from '../base'
import { DependentSelectNotes } from './dependent-select-notes'
import { useSelectionString } from './selection-field-strings'
import { SelectCreateButton, SelectEditButton } from './selection-slots'
import { type DependentSelectFieldState, useDependentSelectField } from './use-dependent-select-field'

/** Normalized option (value is always string for the UIKit Select contract) */
interface NormalizedOption {
  label: React.ReactNode
  textValue?: string
  value: string
  disabled?: boolean
  editable?: boolean
  pending?: boolean
  group?: string
  data?: unknown
}

/**
 * Props of Select that do not depend on where the options come from. `TDeps` — the shape of `deps` (values of the
 * parent fields from `dependsOn`, §18)
 */
export interface SelectFieldBaseProps<TData = unknown, TDeps extends FieldDeps = FieldDeps>
  extends BaseFieldProps, DependentFieldProps<TDeps>
{
  /**
   * Own content of an option in the dropdown. The skin still draws its own item frame
   * (highlight, indicator), you only supply what is inside. `option.data` is typed from `options`.
   * Not called for the service «+ Add…» item.
   *
   * @example
   * ```tsx
   * <Form.Field.Select
   *   name="cityId"
   *   options={cities.map((c) => ({ value: c.id, label: c.name, data: c }))}
   *   renderOption={(o) => <span>{o.label} <small>{o.data?.region}</small></span>}
   * />
   * ```
   */
  renderOption?: (option: SelectFieldOption<TData>, state: OptionRenderState) => React.ReactNode
  /**
   * Own caption of the selected value in the trigger. It sits inside a `<button>` — phrasing
   * content only. Empty result (`null`/`''`) falls back to the option text; `placeholder` is
   * shown while nothing is selected.
   */
  renderValue?: (option: SelectFieldOption<TData>) => React.ReactNode
  /**
   * Get group key (optgroup) from an option — symmetric to `Form.Field.Combobox`'s `getGroup`.
   * Options without a group (or when the prop is omitted) render flat, ungrouped.
   *
   * @example
   * ```tsx
   * <Form.Field.Select
   *   name="category"
   *   options={categories}
   *   getGroup={(opt) => opt.parentLabel}
   * />
   * ```
   */
  getGroup?: (option: SelectFieldOption<TData>) => string | undefined
  /** Value type: 'string' (by default) or 'number' */
  valueType?: 'string' | 'number'
  /**
   * Create a dictionary record without leaving the form. Adds a «+ Добавить…» item at the end of
   * the list; picking it calls `onCreate('')`. The app opens its own creation dialog (and calls
   * its server action) and returns `{ label, value }` — the option is added to the list and
   * selected — or `null` if the user cancelled (the value stays as it was).
   *
   * The created option lives while the field is mounted; once the app's `options` contain the
   * same value (list revalidated), the app's option wins and there is no duplicate.
   *
   * @example
   * ```tsx
   * <Form.Field.Select
   *   name="categoryId"
   *   options={categories}
   *   onCreate={async () => {
   *     const created = await openCategoryDialog()
   *     return created ? { label: created.name, value: created.id } : null
   *   }}
   * />
   * ```
   */
  onCreate?: CreateOptionHandler<TData>
  /** Text of the create item after the «+ » sign (default: localized «Add…» / «Добавить…») */
  createLabel?: string
  /**
   * Show the service «+ Add…» item at the end of the list (default `true` when `onCreate` is set).
   * `false` — no item: put `<Form.Field.Select.CreateButton />` into `listFooter` or your own `renderOption`.
   */
  createItem?: boolean
  /**
   * Edit a dictionary record without leaving the form: a pencil appears at every item and at the
   * selected value. The app opens its own dialog (its server action) and returns
   * `{ label, value, data? }` — the option is updated in place — or `null` if the user cancelled.
   * Same `value` = caption fix (the form is not dirty); another `value` = the record was replaced
   * (copy-on-write) and, if it was selected, the new one becomes selected.
   * Shortcut: F2 (Fn+F2 on laptops) on the highlighted item or the selected value.
   */
  onUpdate?: UpdateOptionHandler<SelectFieldOption<TData>, TData>
  /**
   * The server did not confirm what `onCreate`/`onUpdate` showed optimistically (`ctx.optimistic(...)`): rejected,
   * `null` after `optimistic`, or no answer within `settleTimeout`. The field has already rolled the option back.
   * Without it the field shows its own message under itself (`role="status"`).
   */
  onSettleError?: (info: SettleErrorInfo<TData>) => void
  /** Milliseconds to wait for the server after `ctx.optimistic(...)` (default 30 000) */
  settleTimeout?: number
  /** Own footer of the list, after the items (e.g. `<Form.Field.Select.CreateButton />`) */
  listFooter?: ReactNode
  /**
   * Search field inside the open list. `'auto'` (default) — appears when there are more than 9 options
   * (from the 10th). `false` — off; `true` — always; an object — `'auto'` with own settings
   * (`threshold`, `placeholder`, `emptyMessage`, `filter`). Matches the text of the option
   * without case and diacritics, `ё` ≡ `е`, and also the query typed in the wrong keyboard layout
   * («ghbdtn» finds «Привет»). The selected value stays in the trigger while the list is filtered.
   * Long lists that come from the server by search text — use `Form.Field.Combobox` with `useQuery`.
   */
  searchable?: SelectSearchable<SelectFieldOption<TData>>
  /**
   * Own content of the «nothing found» state of the search (instead of the localized message). With `onCreate`
   * the «+ Add "…"» item goes under it; with `createItem={false}` put `<Form.Field.Select.CreateButton />` here.
   */
  renderEmpty?: (context: { search: string }) => ReactNode
  /** Show clear button (auto-determined: true if optional, false if required) */
  clearable?: boolean
  /** Size */
  size?: FieldSize
  /** Visual variant */
  variant?: 'outline' | 'subtle'
}

/** No other source may be passed next to the one in use — the type says so (`?: never`) */
interface NoLoadOptionsSource {
  loadOptions?: never
  onLoadError?: never
}
interface NoOptionsHookSource {
  useOptions?: never
}

/**
 * Exactly ONE source of options (§18.2 of the plan): static `options` (an array, or a function of `deps` for a
 * dependent field), the promise path `loadOptions` (server action, `fetch`) or the hook path `useOptions`.
 * Without any of them the options come from the schema meta.
 */
export type SelectSource<TData = unknown, TDeps extends FieldDeps = FieldDeps> =
  | (
    & NoLoadOptionsSource
    & NoOptionsHookSource
    & {
      /**
       * Options for selection (string or number values). If not specified, taken from schema meta.
       * A function of `deps` filters an already loaded full list for a dependent field (category → subcategory);
       * it is not called while the parents are not ready.
       */
      options?: SelectFieldOption<TData>[] | ((deps: TDeps) => SelectFieldOption<TData>[])
      /**
       * The options are still being loaded (for example `isLoading` of the query that feeds `options`): spinner in
       * the field, the localized «Loading…» in the list and — while the selected value has no option yet — in the
       * trigger instead of the placeholder. `emptyContent` of the search is not shown while loading.
       */
      loading?: boolean
    }
  )
  | (
    & NoOptionsHookSource
    & {
      options?: never
      loading?: never
      /**
       * Promise path: the whole list at once (`search` is always `''`), one request per `deps` (after the parents
       * are ready). A new parent cancels the previous request (`signal`); the options of the previous parent are
       * hidden while the next request runs. Returns the options themselves.
       *
       * @example
       * ```tsx
       * <Form.Field.Select
       *   name="cityId"
       *   dependsOn="countryId"
       *   loadOptions={async (_search, { signal, deps }) => {
       *     const cities = await listCities({ countryId: deps.countryId }, signal)
       *     return cities.map((c) => ({ value: c.id, label: c.name }))
       *   }}
       * />
       * ```
       */
      loadOptions: LoadOptionsFn<SelectFieldOption<TData>, TDeps>
      /** An error of `loadOptions` (a cancelled request is not an error) — for a log or a toast */
      onLoadError?: (error: unknown) => void
    }
  )
  | (
    & NoLoadOptionsSource
    & {
      options?: never
      loading?: never
      /**
       * Hook path: a hook that returns `{ options, loading }` — the same shape as `useQueryOptions(...).fieldProps`
       * from `@letar/forms-query`. It is called on every render with `deps` of the parents.
       */
      useOptions: (deps: TDeps) => OptionsSourceProps<SelectFieldOption<TData>>
    }
  )

/**
 * Props for Select field: the common props and exactly one source of options
 */
export type SelectFieldProps<TData = unknown, TDeps extends FieldDeps = FieldDeps> =
  & SelectFieldBaseProps<TData, TDeps>
  & SelectSource<TData, TDeps>

/** State type for useFieldState */
interface SelectFieldState {
  /** The options are being loaded (`loading`, `loadOptions`, `useOptions`) */
  loading: boolean
  /** Dependent field (§18): `deps`, blocked state, hint, announcement */
  dependent: DependentSelectFieldState
  normalizedOptions: NormalizedOption[]
  resolvedClearable: boolean
  /** Actions (`onCreate`/`onUpdate`): pending, overlay of edits, created options, pipeline */
  actions: ReturnType<typeof useSelectionActionsState>
  /** Options in the app's own shape (with `data`) by string value — for the render functions */
  optionByValue: Map<string, SelectFieldOption>
  /** Search inside the list; `undefined` — the field has no search now */
  search: UIKitSelectSearch | undefined
  /** Options that passed the filter (real ones, without the service item) */
  matchedCount: number
  /** Own message of an empty search result (`searchable.emptyMessage` or the localized default) */
  emptyMessage: string
  /** Localized «Loading…» */
  loadingMessage: string
  /** Шаблон сообщения об отказе оптимистичного действия, `{label}` подставляется при показе */
  settleErrorTemplate: string
  /** Localized strings of the slots */
  strings: { edit: string; hotkeyHint: string; create: string; createVerb: string }
}

/**
 * Form.Field.Select - Styled Chakra Select dropdown
 *
 * Styled select component with customizable appearance,
 * animations and advanced features (search, clear, custom rendering).
 *
 * Default choice for all dropdowns, including mobile — `Form.Field.NativeSelect` is deprecated.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.Select
 *   name="framework"
 *   label="Framework"
 *   options={[
 *     { label: 'React', value: 'react' },
 *     { label: 'Vue', value: 'vue' },
 *     { label: 'Angular', value: 'angular', disabled: true },
 *   ]}
 *   clearable
 * />
 * ```
 *
 * Uses the `UIKit` contract (`@letar/forms-core/uikit`) instead of importing Chakra directly —
 * Фаза 7.1, Этап 4 proof that the seam covers a selection field with an options list and
 * a portal-rendered dropdown, the most structurally different of the three proof fields.
 */
const FieldSelectBase = createField<SelectFieldProps, string | number, SelectFieldState>({
  displayName: 'FieldSelect',
  useFieldState: (
    componentProps: Omit<SelectFieldProps, keyof BaseFieldProps>,
    resolved: ResolvedFieldProps,
    { form, fullPath },
  ): SelectFieldState => {
    const hasOnCreate = !!componentProps.onCreate
    const showCreateItem = hasOnCreate && componentProps.createItem !== false
    const defaultCreateVerb = useSelectionString('formSelection.createOption')
    const createLabel = componentProps.createLabel ?? `${defaultCreateVerb}…`
    const edit = useSelectionString('formSelection.editOption')
    const hotkeyHint = useSelectionString('formSelection.editHotkeyHint')

    // Зависимое поле (§18): родители, блокировка, очистка по правке родителя. Пустое значение — то же, что пишет
    // собственная кнопка очистки (`dependent.emptyValue`): `null` у nullable-схемы, иначе `''`/`0`
    const dependent = useDependentSelectField(componentProps as DependentFieldProps, {
      fullPath,
      label: resolved.label,
      valueType: componentProps.valueType,
    })

    // Источники, кроме статичных `options`: промис (`loadOptions`, один запрос на `deps`) и хук (`useOptions`)
    const loadOptionsProp = componentProps.loadOptions
    const loader = useOptionsLoader<SelectFieldOption>(
      (ctx) => loadOptionsProp ? loadOptionsProp('', ctx) : Promise.resolve([]),
      [dependent.depsKey, dependent.ready],
      // Прежние опции чужого родителя не показываем; пока родители не готовы, запрос не уходит
      { keepPrevious: false, fieldDeps: dependent.deps, enabled: !!loadOptionsProp && dependent.ready },
    )
    const onLoadError = componentProps.onLoadError
    useEffect(() => {
      if (loader.error !== null && loader.error !== undefined) {
        onLoadError?.(loader.error)
      }
    }, [loader.error, onLoadError])
    // Хук вызывается на каждом рендере, как `useQuery` у Combobox: наличие его не меняется за жизнь поля
    const hookSource = componentProps.useOptions?.(dependent.deps)

    // Options: props take priority, fallback to schema meta
    const optionsProp = componentProps.options
    const appOptions = useMemo((): SelectFieldOption[] => {
      // Родители не готовы — списка нет (функция не вызывается с пустыми `deps`)
      if (dependent.active && !dependent.ready) {
        return []
      }
      if (loadOptionsProp) {
        return loader.fieldProps.options
      }
      if (hookSource) {
        return hookSource.options
      }
      const own = typeof optionsProp === 'function' ? optionsProp(dependent.deps) : optionsProp
      return (own ?? resolved.options ?? []) as SelectFieldOption[]
    }, [
      dependent.active,
      dependent.ready,
      dependent.deps,
      loadOptionsProp,
      loader.fieldProps.options,
      hookSource,
      optionsProp,
      resolved.options,
    ])
    const loading = dependent.active && !dependent.ready
      ? false
      : !!(componentProps.loading || loader.fieldProps.loading || hookSource?.loading)
    // Значение нужно конвейеру действий: ожидающий выбор оптимистичного create снимается, когда оно изменилось
    const fieldValue = useStore(form.store, () => form.getFieldValue(fullPath)) as string | number | undefined
    const pendingRegistry = useFormPendingRegistry()
    const actions = useSelectionActionsState({
      appOptions,
      value: fieldValue,
      registry: pendingRegistry,
      onSettleError: componentProps.onSettleError as ((info: SettleErrorInfo) => void) | undefined,
      settleTimeout: componentProps.settleTimeout,
      deps: dependent.deps,
      depsKey: dependent.depsKey,
    })
    const { createdOptions, overlay } = actions
    const settleErrorTemplate = useSelectionString('formSelection.settleError')

    // Options after the created ones and the overlay of edits, before search and the service item
    const { merged, normalized, optionByValue } = useMemo(() => {
      const getGroup = componentProps.getGroup
      // Пока свой оптимистичный create в полёте, `pending`-опции приложения скрыты: почти всегда это та же запись
      // (мутация ZenStack вставила её в кэш), иначе в списке две «Кровли» (§16.7)
      const shownApp = actions.hasOwnCreatePending ? appOptions.filter((opt) => !opt.pending) : appOptions
      // Local edits lie over the app's options until it revalidates the list
      const edited = applyOptionOverlay(shownApp, overlay)
      // Created option loses to the app's own option with the same value (no duplicate after revalidation)
      const mergedOptions = mergeCreatedOptions<SelectFieldOption>(edited, createdOptions)
      const hasOnUpdate = !!componentProps.onUpdate
      // Normalize options — value always string for the UIKit contract
      const normalizedOptions: NormalizedOption[] = mergedOptions.map((opt) => ({
        label: opt.label,
        textValue: opt.textValue,
        data: opt.data,
        value: String(opt.value),
        disabled: opt.disabled,
        pending: opt.pending,
        editable: isOptionEditable(opt, hasOnUpdate),
        group: getGroup?.(opt),
      }))
      // The app's own shape by string value — what the render functions receive
      const byValue = new Map<string, SelectFieldOption>(mergedOptions.map((opt) => [String(opt.value), opt]))
      return { merged: mergedOptions, normalized: normalizedOptions, optionByValue: byValue }
    }, [
      appOptions,
      componentProps.getGroup,
      componentProps.onUpdate,
      overlay,
      createdOptions,
      actions.hasOwnCreatePending,
    ])

    // Search: threshold and the query live here (hooks are not allowed in `render`)
    const searchPlaceholder = useSelectionString('formSelection.search.placeholder')
    const searchAria = useSelectionString('formSelection.search.aria')
    const defaultEmptyMessage = useSelectionString('formSelection.combobox.emptyMessage')
    const loadingMessage = useSelectionString('formSelection.combobox.loadingMessage')
    const searchState = useSelectionSearch<SelectFieldOption>({
      searchable: componentProps.searchable as SelectSearchable<SelectFieldOption> | undefined,
      options: merged,
      getText: getOptionText,
      placeholder: searchPlaceholder,
      ariaLabel: searchAria,
    })
    const query = searchState.search ? searchState.query : ''

    // «+ Добавить…»: empty search — plain; a search text without an exact match — «+ Добавить "<текст>"»
    const trimmedQuery = query.trim()
    const offerCreate = showCreateItem
      && (trimmedQuery === '' || shouldOfferCreate(trimmedQuery, merged.map((opt) => getOptionText(opt))))
    const createVerb = componentProps.createLabel ?? defaultCreateVerb
    const createOptionLabel = trimmedQuery ? `+ ${createVerb} "${trimmedQuery}"` : `+ ${createLabel}`

    // The «+ Добавить…» item is service-only: intercepted in onValueChange, never reaches the form.
    // It comes AFTER the filter and is not filtered itself
    // Зависимое поле (§18.4): значения нет среди опций (несогласованные данные, родитель пуст) — показываем сырое
    // значение в триггере, а не стираем: очистка бывает только по правке родителя. Недоступный пункт — чтобы
    // контрол видел выбранное; пока опции грузятся, «Загрузка…» рисует сам контрол
    const rawValue = fieldValue === undefined || fieldValue === null || fieldValue === ''
      ? undefined
      : String(fieldValue)
    const orphanValue = dependent.active && !loading && rawValue !== undefined
        && !normalized.some((opt) => opt.value === rawValue)
      ? rawValue
      : undefined
    const optionsLoaded = dependent.ready && !loading
    useEffect(() => {
      const env = typeof process === 'undefined' ? undefined : process.env?.['NODE_ENV']
      if (orphanValue !== undefined && optionsLoaded && (env === 'development' || env === 'test')) {
        console.warn(
          `[@letar/forms] Field.Select «${fullPath}»: значения «${orphanValue}» нет среди опций при выбранных `
            + 'родителях — данные несогласованы; значение показано как есть и не стёрто.',
        )
      }
    }, [orphanValue, optionsLoaded, fullPath])
    const normalizedOptions = useMemo<NormalizedOption[]>(() => {
      const withOrphan = orphanValue === undefined
        ? normalized
        : [...normalized, { label: orphanValue, value: orphanValue, disabled: true }]
      return offerCreate ? [...withOrphan, { label: createOptionLabel, value: CREATE_OPTION_VALUE }] : withOrphan
    }, [normalized, orphanValue, offerCreate, createOptionLabel])

    // The skin gets the FULL list and the visible values; the service item is always visible
    const skinSearch = useMemo<UIKitSelectSearch | undefined>(
      () =>
        searchState.search
          ? {
            ...searchState.search,
            visibleValues: new Set([...searchState.search.visibleValues, CREATE_OPTION_VALUE]),
          }
          : undefined,
      [searchState.search],
    )

    // Auto-determine clearable: show clear button if field is optional
    const resolvedClearable = componentProps.clearable ?? !resolved.required

    useNodeLabelWarning('Select', normalizedOptions)

    return {
      loading,
      dependent,
      normalizedOptions,
      optionByValue,
      resolvedClearable,
      actions,
      search: skinSearch,
      matchedCount: searchState.filtered.length,
      emptyMessage: typeof componentProps.searchable === 'object' && componentProps.searchable.emptyMessage
        ? componentProps.searchable.emptyMessage
        : defaultEmptyMessage,
      loadingMessage,
      settleErrorTemplate,
      strings: { edit, hotkeyHint, create: `+ ${createLabel}`, createVerb },
    }
  },
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    // Convert current value to string for the UIKit contract
    const currentValue = field.state.value
    const formStringValue = currentValue !== null && currentValue !== undefined ? String(currentValue) : undefined

    const { actions, strings } = fieldState
    // Оптимистично созданная запись показана выбранной, пока форма хранит прежнее значение (§16.7)
    const stringValue = actions.pendingSelection ?? formStringValue
    // Text of the search field: goes to `onCreate` and to the «+ Add "…"» item
    const searchText = fieldState.search?.query ?? ''
    const hasOnUpdate = !!componentProps.onUpdate
    // Зависимое поле без готовых родителей заблокировано (§18.10): нативный `disabled` триггера
    const { dependent } = fieldState
    const disabled = resolved.disabled || dependent.blocked
    const interactive = !disabled && !resolved.readOnly

    const applyValue = (raw: string | undefined) => {
      // Convert back to needed type; очистка пишет пустое значение схемы (`null` у nullable)
      if (!raw) {
        field.handleChange(dependent.emptyValue)
      } else if (componentProps.valueType === 'number') {
        field.handleChange(Number(raw))
      } else {
        field.handleChange(raw)
      }
    }

    // Errors of `onCreate`/`onUpdate` are the app's business — they surface as unhandled
    // rejections (GlitchTip), not swallowed here
    const runCreate = () => {
      const onCreate = componentProps.onCreate
      if (!onCreate) {
        return
      }
      actions.run({
        scope: 'option',
        kind: 'create',
        call: (ctx) => onCreate(searchText.trim(), ctx),
        apply: (created, info) => {
          actions.addCreatedOption(created)
          // Оптимистичный create: выбор пользователя, сделанный за время ожидания, подтверждение не перебивает
          if (!info.optimistic || info.selectionHeld) {
            applyValue(String(created.value))
          }
        },
      })
    }

    const runEdit = (option: unknown, scope: 'option' | 'value') => {
      const onUpdate = componentProps.onUpdate
      const source = option as SelectFieldOption
      if (!onUpdate) {
        return
      }
      const fromValue = String(source.value)
      actions.run({
        scope,
        kind: 'edit',
        fromValue,
        call: (ctx) => onUpdate(source, ctx),
        apply: (result) => {
          actions.recordEdit(fromValue, result)
          // Replaced record (another value): the selected one follows it. Same value — form stays clean.
          // Значение читаем живым: при оптимистичной правке за время ожидания оно могло измениться
          const liveValue = field.form.getFieldValue(field.name)
          if (String(result.value) !== fromValue && liveValue !== undefined && String(liveValue) === fromValue) {
            applyValue(String(result.value))
          }
        },
      })
    }

    const actionsValue = {
      pending: actions.pending,
      canCreate: !!componentProps.onCreate,
      hasOnUpdate,
      interactive,
      search: searchText,
      runCreate,
      runEdit,
      strings: {
        edit: strings.edit,
        editAria: (text: string) => `${strings.edit}: ${text}`,
        create: strings.create,
        createWithSearch: (text: string) => `+ ${strings.createVerb} "${text}"`,
        hotkeyHint: strings.hotkeyHint,
      },
    }

    const optionContext = (opt: { value: string }, scope: 'option' | 'value' | 'value-text') => {
      const source = fieldState.optionByValue.get(opt.value)
      const editable = !!source && isOptionEditable(source, hasOnUpdate)
      return {
        option: source,
        text: source ? getOptionText(source) : '',
        editable,
        scope,
      }
    }

    const selectedSource = stringValue !== undefined ? fieldState.optionByValue.get(stringValue) : undefined

    return (
      <chakraUIKit.FieldRoot invalid={hasError} required={resolved.required} disabled={disabled}>
        <SelectionActionsProvider value={actionsValue}>
          <chakraUIKit.Select
            value={stringValue}
            onValueChange={(newStringValue) => {
              if (isCreateOptionValue(newStringValue)) {
                // Service item: value is not applied
                runCreate()
                return
              }
              applyValue(newStringValue)
            }}
            onBlur={field.handleBlur}
            options={fieldState.normalizedOptions.map((opt) => ({
              value: opt.value,
              label: opt.label,
              textValue: opt.textValue,
              disabled: opt.disabled,
              pending: opt.pending,
              group: opt.group,
              data: opt.data,
            }))}
            renderOption={componentProps.renderOption
              ? (opt, state) => {
                // Service item «+ Add…» is never passed through the app's renderer
                const source = fieldState.optionByValue.get(opt.value)
                return source
                  ? (
                    <SelectionOptionProvider value={optionContext(opt, 'option')}>
                      {componentProps.renderOption?.(source, state)}
                    </SelectionOptionProvider>
                  )
                  : opt.label
              }
              : undefined}
            // Own renderOption — own buttons (`Select.EditButton`); default pencil only without it
            renderOptionActions={hasOnUpdate && !componentProps.renderOption
              ? (opt) => (
                <SelectionOptionProvider value={optionContext(opt, 'option')}>
                  <SelectEditButton />
                </SelectionOptionProvider>
              )
              : undefined}
            renderValue={componentProps.renderValue
              ? (opt) => {
                const source = fieldState.optionByValue.get(opt.value)
                const custom = source ? componentProps.renderValue?.(source) : undefined
                // Пустой результат отдаём как есть — скин откатится к тексту опции
                if (custom === undefined || custom === null || custom === false || custom === '') {
                  return custom
                }
                return (
                  <SelectionOptionProvider value={optionContext(opt, 'value-text')}>{custom}</SelectionOptionProvider>
                )
              }
              : undefined}
            controlActions={hasOnUpdate && selectedSource && stringValue !== undefined
              ? (
                <SelectionOptionProvider value={optionContext({ value: stringValue }, 'value')}>
                  <SelectEditButton />
                </SelectionOptionProvider>
              )
              : undefined}
            listFooter={componentProps.listFooter}
            search={fieldState.search}
            loading={fieldState.loading}
            loadingMessage={fieldState.loadingMessage}
            emptyContent={fieldState.search && fieldState.matchedCount === 0 && !fieldState.loading
              ? (
                <Box px={3} py={2} color="fg.muted" fontSize="sm">
                  {componentProps.renderEmpty
                    ? componentProps.renderEmpty({ search: searchText })
                    : fieldState.emptyMessage}
                </Box>
              )
              : undefined}
            controlRef={actions.controlRef}
            onEditHotkey={hasOnUpdate && interactive
              ? (value, scope) => {
                const source = fieldState.optionByValue.get(value)
                if (source && isOptionEditable(source, true)) {
                  runEdit(source, scope)
                }
              }
              : undefined}
            editHotkeyHint={strings.hotkeyHint}
            label={resolved.label
              ? <SelectionFieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />
              : undefined}
            placeholder={dependent.blockedPlaceholder ?? resolved.placeholder}
            describedBy={dependent.hint ? dependent.hintId : undefined}
            disabled={disabled}
            readOnly={resolved.readOnly}
            clearable={fieldState.resolvedClearable}
            size={componentProps.size ?? 'md'}
            variant={componentProps.variant ?? 'outline'}
            data-field-name={fullPath}
          />
        </SelectionActionsProvider>
        <DependentSelectNotes dependent={dependent} />
        {actions.settleFailure && (
          <Box role="status" mt={1} fontSize="sm" color="fg.error" data-settle-error="">
            {fieldState.settleErrorTemplate.replace('{label}', actions.settleFailure.label)}
          </Box>
        )}
        <chakraUIKit.FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </chakraUIKit.FieldRoot>
    )
  },
})

/**
 * `createField` is not generic, so the generic signature is restored by a cast: `TData` is
 * inferred from `options` and flows into `renderOption`/`renderValue`/`getGroup`.
 */
const FieldSelectGeneric = FieldSelectBase as unknown as <TData = unknown>(
  props: SelectFieldProps<TData>,
) => ReactElement

/** Slots `Form.Field.Select.EditButton` / `.CreateButton` — for your own `renderOption`/`listFooter` */
export const FieldSelect = Object.assign(FieldSelectGeneric, {
  EditButton: SelectEditButton,
  CreateButton: SelectCreateButton,
})
