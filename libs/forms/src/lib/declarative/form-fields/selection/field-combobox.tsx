'use client'

import { Box, Combobox, Field, Portal, Spinner, useFilter } from '@chakra-ui/react'
import {
  applyOptionOverlay,
  CREATE_OPTION_VALUE,
  type CreateOptionHandler,
  createSearchMatcher,
  getOptionText,
  isCreateOptionValue,
  isOptionEditable,
  mergeCreatedOptions,
  shouldOfferCreate,
  type UpdateOptionHandler,
} from '@letar/forms-core/uikit'
import {
  SelectionActionsProvider,
  SelectionOptionProvider,
  useNodeLabelWarning,
  useSelectionActionsState,
} from '@letar/forms-react'
import { useStore } from '@tanstack/react-form'
import { type ReactElement, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import type { BaseFieldProps, EditableOptionFlag, FieldSize, GroupableOption, OptionRenderState } from '../../types'
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
import { useMinCharsHint } from './min-chars-hint'
import { useSelectionString } from './selection-field-strings'
import { SelectCreateButton, SelectEditButton } from './selection-slots'

/** Option of the field: groupable + the «cannot be edited» flag */
type ComboboxItem = GroupableOption & EditableOptionFlag

/**
 * Props for Form.Field.Combobox
 */
export interface ComboboxFieldProps<T = string, TData = unknown> extends BaseFieldProps {
  /**
   * Static options (mutually exclusive with useQuery)
   */
  options?: (GroupableOption<T, TData> & EditableOptionFlag)[]

  /**
   * Async function for loading options
   * Should return { data, isLoading, error } similar to TanStack Query
   *
   * @example
   * ```tsx
   * useQuery={(search) => useFindManyUser({
   *   where: { name: { contains: search, mode: 'insensitive' } },
   *   take: 20,
   * })}
   * ```
   */
  useQuery?: AsyncQueryFn<TData>

  /**
   * Get label from data element
   * Required when using useQuery
   */
  getLabel?: (item: TData) => ReactNode

  /**
   * String form of a data element — for filtering, typeahead and the input text after a pick.
   * Needed when `getLabel` returns a node (otherwise the option falls back to its value).
   */
  getTextValue?: (item: TData) => string

  /**
   * Own content of an option in the dropdown. The skin keeps its item frame (highlight,
   * indicator). With `useQuery`, `option.data` is the loaded item; with static `options`, the
   * option's own `data`. Not called for the service «+ Add…» item. Unlike `Select`, there is no
   * `renderValue`: the input holds plain text.
   */
  renderOption?: (option: GroupableOption<T, TData>, state: OptionRenderState) => ReactNode

  /**
   * Get value from data element
   * Required when using useQuery
   */
  getValue?: (item: TData) => T

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

  /** With `useQuery`: `false` hides the pencil for this data element (system records) */
  getEditable?: (item: TData) => boolean

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

/** State type for useFieldState */
interface ComboboxFieldState extends GroupedOptionsResult {
  inputValue: string
  setInputValue: (value: string) => void
  isLoading: boolean
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
  /** Подпись служебного пункта «+ Добавить "<поиск>"» (пусто, если пункт сейчас не предлагается) */
  createItemLabel: string
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

    // Async search with debounce via shared hook
    const {
      inputValue,
      setInputValue,
      isLoading,
      data: queryData,
    } = useAsyncSearch({
      useQuery: componentProps.useQuery,
      debounce: componentProps.debounce ?? 300,
      minChars: componentProps.minChars ?? 1,
      initialValue: fieldValue ? undefined : componentProps.initialSearchValue,
    })

    // Инициализация `inputValue` из значения поля (сценарий `defaultValues` при редактировании).
    // `Combobox.Root` контролируем по `inputValue` отдельно от `value` (см. `render` ниже) —
    // `useAsyncSearch` стартует с пустой строкой независимо от того, что значение уже выбрано,
    // поэтому без явной синхронизации поле показывает пустой инпут при непустом значении.
    const initializedRef = useRef(false)
    useEffect(() => {
      if (initializedRef.current || !fieldValue || inputValue) {
        return
      }
      initializedRef.current = true

      if (componentProps.options) {
        const matchedOption = componentProps.options.find((opt) => String(opt.value) === String(fieldValue))
        if (matchedOption) {
          setInputValue(getOptionLabel(matchedOption))
        }
      } else if (componentProps.initialLabel !== undefined) {
        setInputValue(componentProps.initialLabel)
      }
    }, [fieldValue, inputValue, componentProps.options, componentProps.initialLabel, setInputValue])

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
        const getValue = componentProps.getValue
        const getGroup = componentProps.getGroup
        const getDisabled = componentProps.getDisabled
        const getEditable = componentProps.getEditable
        return (queryData as unknown[]).map((item) => ({
          label: getLabel(item),
          textValue: getTextValue?.(item),
          data: item,
          value: getValue(item),
          group: getGroup?.(item),
          disabled: getDisabled?.(item),
          editable: getEditable?.(item),
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

    const actions = useSelectionActionsState({ appOptions: sourceOptions })
    const { createdOptions, overlay } = actions

    // Ручка выпадашки для конвейера действий: закрыть список / вернуть фокус в инпут
    const [open, setOpen] = useState(false)
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
      const edited = applyOptionOverlay(sourceOptions, overlay).map((opt): ComboboxItem =>
        typeof opt.value === 'string' ? opt : { ...opt, value: String(opt.value) }
      )
      const created = createdOptions.map((opt): ComboboxItem => ({
        label: opt.label,
        value: String(opt.value),
        data: opt.data,
      }))
      // Опция приложения сильнее созданной с тем же значением — после перезагрузки справочника дубля нет
      return mergeCreatedOptions(edited, created)
    }, [sourceOptions, overlay, createdOptions])

    const optionByValue = useMemo(
      () => new Map<string, ComboboxItem>(allOptions.map((opt) => [String(opt.value), opt])),
      [allOptions],
    )

    // Фильтр по тексту: статичные опции фильтруем сами (правки уже наложены), `useQuery` — на сервере;
    // созданные опции фильтруются так же, как остальные
    const baseOptions = useMemo((): ComboboxItem[] => {
      const createdValues = new Set(createdOptions.map((opt) => String(opt.value)))
      // Запрос, набранный не в той раскладке, тоже находит («ghbdtn» → «Привет»)
      const matcher = createSearchMatcher(inputValue, contains)
      return allOptions.filter((opt) => {
        const isLocal = componentProps.options !== undefined || createdValues.has(String(opt.value))
        return !isLocal || !matcher || matcher(getOptionLabel(opt))
      })
    }, [allOptions, createdOptions, componentProps.options, inputValue, contains])

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

    return {
      inputValue,
      setInputValue,
      isLoading,
      options,
      collection,
      groups,
      resolvedClearable,
      minCharsHint,
      defaultPlaceholder,
      defaultLoadingMessage,
      defaultEmptyMessage,
      createItemLabel,
      actions,
      optionByValue,
      strings: { edit: editVerb, hotkeyHint, createVerb },
      dropdown: { open, setOpen, inputRef, highlightedRef },
    }
  },
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const currentValue = field.state.value as string | undefined
    const minChars = componentProps.minChars ?? 1
    const { actions, strings, dropdown } = fieldState
    const hasOnUpdate = !!componentProps.onUpdate
    const interactive = !resolved.disabled && !resolved.readOnly
    const search = fieldState.inputValue.trim()

    // Ошибки `onCreate`/`onUpdate` — забота приложения: всплывают как unhandled rejection
    // (GlitchTip), здесь не глотаются
    const runCreate = () => {
      const onCreate = componentProps.onCreate
      if (!onCreate) {
        return
      }
      actions.run({
        scope: 'option',
        call: () => onCreate(search),
        apply: (created) => {
          actions.addCreatedOption(created)
          field.handleChange(String(created.value))
          fieldState.setInputValue(created.label)
        },
      })
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
        call: () => onUpdate(source as Parameters<typeof onUpdate>[0]),
        apply: (result) => {
          actions.recordEdit(fromValue, result)
          // Правили выбранное: инпут показывает новую подпись, а замена записи переносит значение
          if (currentValue !== undefined && String(currentValue) === fromValue) {
            if (String(result.value) !== fromValue) {
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

    const renderItem = (opt: GroupableOption) => (
      <Combobox.Item item={opt} key={opt.value}>
        <Combobox.ItemText>{renderItemContent(opt)}</Combobox.ItemText>
        {renderItemActions(opt)}
        <Combobox.ItemIndicator />
      </Combobox.Item>
    )

    const selectedSource = currentValue ? fieldState.optionByValue.get(String(currentValue)) : undefined
    const showValueEdit = hasOnUpdate && !!selectedSource && isOptionEditable(selectedSource, true)

    // Пустой результат: сообщение (или своё `renderEmpty`) + пункт «+ Добавить "…"» под ним.
    // Служебный пункт делает список непустым, поэтому «пусто» считаем по опциям без него
    const realOptionsCount = fieldState.options.filter((opt) => !isCreateOptionValue(String(opt.value))).length
    const nothingFound = !fieldState.isLoading && realOptionsCount === 0 && fieldState.inputValue.length >= minChars
    const emptyContent = componentProps.renderEmpty
      ? componentProps.renderEmpty({ search })
      : (componentProps.emptyMessage ?? fieldState.defaultEmptyMessage)

    return (
      <Field.Root invalid={hasError} required={resolved.required} disabled={resolved.disabled}>
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
              field.handleChange(newValue ?? '')
            }}
            onInteractOutside={() => field.handleBlur()}
            disabled={resolved.disabled}
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
                placeholder={resolved.placeholder ?? fieldState.defaultPlaceholder}
                pe={showValueEdit ? '6.5rem' : undefined}
                aria-keyshortcuts={hasOnUpdate && interactive ? 'F2' : undefined}
                title={hasOnUpdate && interactive ? strings.hotkeyHint : undefined}
                onKeyDown={hasOnUpdate && interactive
                  ? (event) => {
                    if (event.key !== 'F2') {
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
                  }
                  : undefined}
              />
              <Combobox.IndicatorGroup>
                {fieldState.isLoading && <Spinner size="xs" />}
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

                  {/* Empty result: с пунктом создания — своим блоком, `Combobox.Empty` прячется при непустой коллекции */}
                  {nothingFound && fieldState.createItemLabel && (
                    <Box px={3} py={2} color="fg.muted" fontSize="sm">{emptyContent}</Box>
                  )}
                  {nothingFound && !fieldState.createItemLabel && <Combobox.Empty>{emptyContent}</Combobox.Empty>}

                  {/* Hint about minimum characters */}
                  {!fieldState.isLoading
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
