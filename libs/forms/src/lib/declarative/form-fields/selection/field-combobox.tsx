'use client'

import { Combobox, Field, Portal, Spinner, useFilter } from '@chakra-ui/react'
import {
  CREATE_OPTION_VALUE,
  type CreatedOption,
  type CreateOptionHandler,
  isCreateOptionValue,
  mergeCreatedOptions,
  shouldOfferCreate,
} from '@letar/forms-core/uikit'
import { useNodeLabelWarning } from '@letar/forms-react'
import { useStore } from '@tanstack/react-form'
import { type ReactElement, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BaseFieldProps, FieldSize, GroupableOption, OptionRenderState } from '../../types'
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

/**
 * Props for Form.Field.Combobox
 */
export interface ComboboxFieldProps<T = string, TData = unknown> extends BaseFieldProps {
  /**
   * Static options (mutually exclusive with useQuery)
   */
  options?: GroupableOption<T, TData>[]

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
  options: GroupableOption[]
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
  /** Добавляет опцию, возвращённую `onCreate`, в локальный список */
  addCreatedOption: (option: CreatedOption) => void
  /** `true`, пока `onCreate` не завершился (повторный выбор пункта игнорируется) */
  creatingRef: { current: boolean }
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

    // Опции, созданные через `onCreate`, живут локально, пока поле смонтировано
    const [createdOptions, setCreatedOptions] = useState<CreatedOption[]>([])
    const addCreatedOption = useCallback((option: CreatedOption) => {
      setCreatedOptions((prev) => [...prev, option])
    }, [])
    const creatingRef = useRef(false)
    const hasOnCreate = !!componentProps.onCreate
    const createVerb = useSelectionString('formSelection.createOption')

    // Build options from static or async source
    const baseOptions = useMemo((): GroupableOption[] => {
      // Опция приложения сильнее созданной с тем же значением — после перезагрузки справочника
      // дубля нет. Созданные опции фильтруются по тексту поиска так же, как остальные
      const withCreated = (list: GroupableOption[]): GroupableOption[] => {
        // Значения Combobox — строки: числовое значение из `onCreate` приводится к строке
        const visibleCreated = createdOptions
          .filter((opt) => !inputValue || contains(opt.label, inputValue))
          .map((opt): GroupableOption => ({ label: opt.label, value: String(opt.value), data: opt.data }))
        return mergeCreatedOptions(list, visibleCreated)
      }

      if (componentProps.options) {
        // Filtering static options by input value
        const filtered = inputValue
          ? componentProps.options.filter((opt) => contains(getOptionLabel(opt), inputValue))
          : componentProps.options
        return withCreated(filtered)
      }

      if (queryData && componentProps.getLabel && componentProps.getValue) {
        const getLabel = componentProps.getLabel
        const getTextValue = componentProps.getTextValue
        const getValue = componentProps.getValue
        const getGroup = componentProps.getGroup
        const getDisabled = componentProps.getDisabled
        return withCreated((queryData as unknown[]).map((item) => ({
          label: getLabel(item),
          textValue: getTextValue?.(item),
          data: item,
          value: getValue(item),
          group: getGroup?.(item),
          disabled: getDisabled?.(item),
        })))
      }

      return withCreated([])
    }, [
      componentProps.options,
      queryData,
      componentProps.getLabel,
      componentProps.getTextValue,
      componentProps.getValue,
      componentProps.getGroup,
      componentProps.getDisabled,
      inputValue,
      contains,
      createdOptions,
    ])

    // Служебный пункт «+ Добавить "<поиск>"» — в конце списка, вне групп. Значение перехватывается
    // в `onValueChange` и в форму не попадает
    const search = inputValue.trim()
    const createItemLabel = hasOnCreate && shouldOfferCreate(search, baseOptions.map((opt) => getOptionLabel(opt)))
      ? `+ ${componentProps.createLabel ?? createVerb} "${search}"`
      : ''
    const options = useMemo(
      (): GroupableOption[] =>
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
      addCreatedOption,
      creatingRef,
    }
  },
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const currentValue = field.state.value as string | undefined
    const minChars = componentProps.minChars ?? 1

    // Содержимое пункта: своё (`renderOption`) или label как есть (узел не сплющивается в строку).
    // Служебный пункт «+ Добавить…» через renderOption не проходит
    const renderItemContent = (opt: GroupableOption): ReactNode => {
      if (!componentProps.renderOption || isCreateOptionValue(String(opt.value))) {
        return opt.label
      }
      return componentProps.renderOption(opt, {
        selected: currentValue !== undefined && currentValue !== '' && String(currentValue) === String(opt.value),
        disabled: opt.disabled ?? false,
      })
    }

    return (
      <Field.Root invalid={hasError} required={resolved.required} disabled={resolved.disabled}>
        <Combobox.Root
          collection={fieldState.collection}
          size={componentProps.size ?? 'md'}
          variant={componentProps.variant ?? 'outline'}
          value={currentValue ? [currentValue] : []}
          inputValue={fieldState.inputValue}
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
              // Ошибки `onCreate` — забота приложения: всплывают как unhandled rejection
              // (GlitchTip), здесь не глотаются
              if (componentProps.onCreate && !fieldState.creatingRef.current) {
                fieldState.creatingRef.current = true
                void componentProps.onCreate(fieldState.inputValue.trim()).then((created) => {
                  if (created) {
                    fieldState.addCreatedOption(created)
                    field.handleChange(String(created.value))
                    fieldState.setInputValue(created.label)
                  }
                }).finally(() => {
                  fieldState.creatingRef.current = false
                })
              }
              return
            }
            field.handleChange(newValue ?? '')
          }}
          onInteractOutside={() => field.handleBlur()}
          disabled={resolved.disabled}
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
            <Combobox.Input placeholder={resolved.placeholder ?? fieldState.defaultPlaceholder} />
            <Combobox.IndicatorGroup>
              {fieldState.isLoading && <Spinner size="xs" />}
              {fieldState.resolvedClearable && <Combobox.ClearTrigger />}
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

                {/* Empty result */}
                {!fieldState.isLoading
                  && fieldState.options.length === 0
                  && fieldState.inputValue.length >= minChars && (
                  <Combobox.Empty>{componentProps.emptyMessage ?? fieldState.defaultEmptyMessage}</Combobox.Empty>
                )}

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
                      {groupOptions.map((opt) => (
                        <Combobox.Item item={opt} key={opt.value}>
                          <Combobox.ItemText>{renderItemContent(opt)}</Combobox.ItemText>
                          <Combobox.ItemIndicator />
                        </Combobox.Item>
                      ))}
                    </Combobox.ItemGroup>
                  ))
                  /* Flat options */
                  : fieldState.options.map((opt) => (
                    <Combobox.Item item={opt} key={opt.value}>
                      <Combobox.ItemText>{renderItemContent(opt)}</Combobox.ItemText>
                      <Combobox.ItemIndicator />
                    </Combobox.Item>
                  ))}
              </Combobox.Content>
            </Combobox.Positioner>
          </Portal>
        </Combobox.Root>

        <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </Field.Root>
    )
  },
})

/**
 * `createField` is not generic, so the generic signature is restored by a cast: `TData` is
 * inferred from `options`/`useQuery` and flows into `renderOption`/`getTextValue`/`getLabel`.
 */
export const FieldCombobox = FieldComboboxBase as unknown as <T = string, TData = unknown>(
  props: ComboboxFieldProps<T, TData>,
) => ReactElement
