'use client'

import {
  applyOptionOverlay,
  CREATE_OPTION_VALUE,
  filterSelectionOptions,
  getOptionText,
  isCreateOptionValue,
  isOptionEditable,
  mergeCreatedOptions,
  shouldOfferCreate,
} from '@letar/forms-core/uikit'
import {
  SelectionActionsProvider,
  SelectionOptionProvider,
  useDebounce,
  useNodeLabelWarning,
  usePromiseSearch,
  useSelectedLoader,
  useSelectionActionsState,
} from '@letar/forms-react'
import { useStore } from '@tanstack/react-form'
import type { ReactElement } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import { SelectCreateButton, SelectEditButton } from './selection-slots'
import type { ComboboxFieldProps, SelectOption } from './types'

interface NormalizedOption {
  label: React.ReactNode
  textValue?: string
  value: string
  disabled?: boolean
  data?: unknown
}

const CREATE_VERB_DEFAULT = 'Добавить'

interface ComboboxFieldState {
  inputValue: string
  setInputValue: (value: string) => void
  filteredOptions: NormalizedOption[]
  /** Опции в форме приложения (с `data`) по строковому значению — для `renderOption` */
  optionByValue: Map<string, SelectOption>
  /** Подпись служебного пункта «+ Добавить "<поиск>"» (пусто, если пункт сейчас не предлагается) */
  createItemLabel: string
  /** Действия (`onCreate`/`onUpdate`): pending, наложение правок, созданные опции, конвейер */
  actions: ReturnType<typeof useSelectionActionsState>
  /** Идёт загрузка опций (`loading` статичных опций или запрос `loadOptions`) */
  isLoading: boolean
  /** Ошибка `loadOptions` для текущей строки поиска (`null` — нет) */
  loadError: unknown
  /** Повторить `loadOptions` с той же строкой (после ошибки, после `onCreate`/`onUpdate`) */
  retryLoad: () => void
  /** Сбросить закэшированную запись значения (`loadSelected`) — после `onUpdate` этой записи */
  invalidateSelected: (value: string) => void
  /** Список открыли — промис-путь стартует только после этого */
  markOpened: (open: boolean) => void
}

/**
 * Form.Field.Combobox — shadcn-скин.
 *
 * Источники опций (ровно один): статичные `options` — фильтр на клиенте по подписи; `loadOptions`
 * (промис-путь: server action, `fetch`, SDK) — фильтрует сервер, поле дебаунсит строку, отменяет
 * прошлый запрос и показывает «Повторить» при ошибке. Нет `useQuery`, группировки и клавиатурной
 * навигации — не полный аналог Chakra-версии. `shadcnUIKit.Combobox` (Popover + список) сам ничего
 * не фильтрует — принимает уже готовые `options`.
 */
const FieldComboboxBase = createField<ComboboxFieldProps, string, ComboboxFieldState>({
  displayName: 'FieldCombobox',
  useFieldState: (componentProps, _resolved, { form, fullPath }): ComboboxFieldState => {
    const [inputValue, setInputValue] = useState('')
    const hasOnCreate = !!componentProps.onCreate && componentProps.createItem !== false
    const isPromise = !!componentProps.loadOptions
    const minChars = componentProps.minChars ?? (isPromise ? 1 : 0)

    // Промис-путь стартует, когда список хоть раз открывали: N полей на странице не шлют N запросов на монтировании
    const [everOpened, setEverOpened] = useState(false)
    const markOpened = useCallback((open: boolean) => {
      if (open) {
        setEverOpened(true)
      }
    }, [])
    const debouncedSearch = useDebounce(inputValue, componentProps.debounce ?? 300)
    const promiseSearch = usePromiseSearch({
      loadOptions: componentProps.loadOptions,
      search: debouncedSearch,
      enabled: everOpened && inputValue.length >= minChars && debouncedSearch.length >= minChars,
      onLoadError: componentProps.onLoadError,
    })

    // Значение поля читаем до монтирования `<form.Field>` (см. `field-city.tsx`): нужно для `loadSelected` и подписи
    const fieldValue = useStore(form.store, () => form.getFieldValue(fullPath)) as string | undefined
    const valueKey = fieldValue ? String(fieldValue) : ''

    // Опции приложения без фильтра: статичные или записи `loadOptions`
    const sourceOptions = useMemo((): SelectOption[] => {
      if (componentProps.options) {
        return componentProps.options
      }
      const { getLabel, getValue, getTextValue, getDisabled, getEditable } = componentProps
      if (!promiseSearch.data || !getLabel || !getValue) {
        return []
      }
      return (promiseSearch.data as unknown[]).map((item): SelectOption => ({
        label: getLabel(item),
        textValue: getTextValue?.(item),
        data: item,
        value: getValue(item),
        disabled: getDisabled?.(item),
        editable: getEditable?.(item),
      }))
    }, [componentProps, promiseSearch.data])

    // `loadSelected`: значение непустое, его нет в текущей выдаче и нет `initialLabel`
    const valueInResults = sourceOptions.some((opt) => String(opt.value) === valueKey)
    const selectedLoader = useSelectedLoader({
      loadSelected: componentProps.loadSelected,
      value: valueKey,
      enabled: !valueInResults && componentProps.initialLabel === undefined,
      onLoadError: componentProps.onLoadError,
    })
    const selectedSourceOption = useMemo((): SelectOption | undefined => {
      const item = selectedLoader.data
      const { getLabel, getValue, getTextValue, getDisabled, getEditable } = componentProps
      if (item === undefined || item === null || !getLabel || !getValue) {
        return undefined
      }
      return {
        label: getLabel(item),
        textValue: getTextValue?.(item),
        data: item,
        value: getValue(item),
        disabled: getDisabled?.(item),
        editable: getEditable?.(item),
      }
    }, [componentProps, selectedLoader.data])

    const actions = useSelectionActionsState({ appOptions: sourceOptions })
    const { createdOptions, overlay } = actions

    // Правки лежат поверх опций приложения; опция приложения сильнее созданной с тем же значением
    const merged = useMemo(
      () => mergeCreatedOptions<SelectOption>(applyOptionOverlay(sourceOptions, overlay), createdOptions),
      [sourceOptions, overlay, createdOptions],
    )

    // Запись из `loadSelected` — вне списка; правки (`onUpdate`) накладываются и на неё
    const selectedOption = useMemo((): SelectOption | undefined => {
      if (!selectedSourceOption || merged.some((opt) => String(opt.value) === String(selectedSourceOption.value))) {
        return undefined
      }
      return applyOptionOverlay([selectedSourceOption], overlay)[0]
    }, [selectedSourceOption, merged, overlay])

    // Подпись значения в инпуте: `initialLabel`, статичные опции или запись `loadSelected` — что найдётся первым
    const initializedRef = useRef(false)
    useEffect(() => {
      if (initializedRef.current || !valueKey || inputValue) {
        return
      }
      let label: string | undefined
      if (componentProps.initialLabel !== undefined) {
        label = componentProps.initialLabel
      } else if (componentProps.options) {
        const found = componentProps.options.find((opt) => String(opt.value) === valueKey)
        label = found ? getOptionText(found) : undefined
      } else if (selectedOption && String(selectedOption.value) === valueKey) {
        label = getOptionText(selectedOption)
      }
      // Опции и запись могут прийти позже — инициализация закрывается, только когда подпись найдена
      if (label !== undefined) {
        initializedRef.current = true
        setInputValue(label)
      }
    }, [valueKey, inputValue, componentProps.initialLabel, componentProps.options, selectedOption])
    const normalized: NormalizedOption[] = useMemo(
      () =>
        merged.map((opt) => ({
          label: opt.label,
          textValue: opt.textValue,
          data: opt.data,
          value: String(opt.value),
          disabled: opt.disabled,
        })),
      [merged],
    )
    const optionByValue = useMemo(() => {
      const map = new Map<string, SelectOption>(merged.map((opt) => [String(opt.value), opt]))
      if (selectedOption) {
        map.set(String(selectedOption.value), selectedOption)
      }
      return map
    }, [merged, selectedOption])
    useNodeLabelWarning('Combobox', normalized)
    const matchedOptions = useMemo(() => {
      if (inputValue.length < minChars) { return [] }
      // Промис-путь: выдачу уже отфильтровал сервер — локально фильтруем только созданные опции
      if (isPromise) {
        const created = new Set(createdOptions.map((opt) => String(opt.value)))
        const localMatches = new Set(
          filterSelectionOptions(normalized.filter((opt) => created.has(opt.value)), inputValue, getOptionText),
        )
        return normalized.filter((opt) => !created.has(opt.value) || localMatches.has(opt))
      }
      // В поле подпись выбранного значения (не запрос) — список показываем целиком
      const selectedText = valueKey ? normalized.find((opt) => opt.value === valueKey) : undefined
      if (selectedText && inputValue === getOptionText(selectedText)) {
        return normalized
      }
      // Без регистра, ё ≡ е, с учётом раскладки («ghbdtn» находит «Привет»)
      return filterSelectionOptions(normalized, inputValue, getOptionText)
    }, [normalized, inputValue, minChars, isPromise, createdOptions, valueKey])

    // Служебный пункт «+ Добавить "<поиск>"» — в конце списка; в форму не попадает
    const search = inputValue.trim()
    const createItemLabel = hasOnCreate && shouldOfferCreate(search, normalized.map((opt) => getOptionText(opt)))
      ? `+ ${componentProps.createLabel ?? CREATE_VERB_DEFAULT} "${search}"`
      : ''
    const filteredOptions = useMemo(
      () =>
        createItemLabel
          ? [...matchedOptions, { label: createItemLabel, value: CREATE_OPTION_VALUE }]
          : matchedOptions,
      [matchedOptions, createItemLabel],
    )

    return {
      inputValue,
      setInputValue,
      // Ошибка прячет данные: на экране «Не удалось загрузить», а не выдача прошлого поиска
      filteredOptions: promiseSearch.error ? [] : filteredOptions,
      optionByValue,
      createItemLabel,
      actions,
      isLoading: !!componentProps.loading || promiseSearch.isLoading,
      loadError: promiseSearch.error,
      retryLoad: promiseSearch.reload,
      invalidateSelected: selectedLoader.invalidate,
      markOpened,
    }
  },
  render: ({ field, fullPath, resolved, hasError, errorMessage, fieldState, componentProps }): ReactElement => {
    const currentValue = (field.state.value as string) || undefined
    const { actions } = fieldState
    const hasOnUpdate = !!componentProps.onUpdate
    const interactive = !resolved.disabled && !resolved.readOnly
    const search = fieldState.inputValue.trim()
    const createVerb = componentProps.createLabel ?? CREATE_VERB_DEFAULT

    // Ошибки `onCreate`/`onUpdate` — забота приложения: всплывают как unhandled rejection, не глотаются
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
          // Промис-путь: внешнего кэша, который обновил бы список, нет — запрашиваем текущий поиск заново
          if (componentProps.loadOptions) {
            fieldState.retryLoad()
          }
        },
      })
    }

    const runEdit = (option: unknown, scope: 'option' | 'value') => {
      const onUpdate = componentProps.onUpdate
      const source = option as SelectOption
      if (!onUpdate) {
        return
      }
      const fromValue = String(source.value)
      actions.run({
        scope,
        call: () => onUpdate(source),
        apply: (result) => {
          actions.recordEdit(fromValue, result)
          if (componentProps.loadOptions) {
            fieldState.retryLoad()
          }
          fieldState.invalidateSelected(fromValue)
          // Замена записи (другой value): выбранное переезжает на новую. Тот же value — форма не dirty
          if (String(result.value) !== fromValue && currentValue === fromValue) {
            field.handleChange(String(result.value))
          }
        },
      })
    }

    const optionContext = (key: string, scope: 'option' | 'value') => {
      const source = fieldState.optionByValue.get(key)
      return {
        option: source,
        text: source ? getOptionText(source) : '',
        editable: !!source && isOptionEditable(source, hasOnUpdate),
        scope,
      }
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
        edit: 'Изменить',
        editAria: (text: string) => `Изменить: ${text}`,
        create: `+ ${createVerb}…`,
        createWithSearch: (text: string) => `+ ${createVerb} "${text}"`,
        hotkeyHint: 'F2 — изменить запись',
      },
    }

    const selectedSource = currentValue !== undefined ? fieldState.optionByValue.get(currentValue) : undefined
    const showValueEdit = hasOnUpdate && !!selectedSource && isOptionEditable(selectedSource, true)

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <SelectionActionsProvider value={actionsValue}>
          <shadcnUIKit.Combobox
            value={currentValue}
            inputValue={fieldState.inputValue}
            onInputChange={fieldState.setInputValue}
            onValueChange={(value) => {
              if (isCreateOptionValue(value)) {
                runCreate()
                return
              }
              field.handleChange(value ?? '')
              // Выбранная опция даёт подпись в поле ввода (очистка — пустую строку)
              const picked = value === undefined ? undefined : fieldState.optionByValue.get(value)
              fieldState.setInputValue(picked ? getOptionText(picked) : '')
            }}
            onOpenChange={fieldState.markOpened}
            loading={fieldState.isLoading}
            options={fieldState.filteredOptions}
            renderOption={componentProps.renderOption
              ? (opt, state) => {
                // Служебный пункт создания через renderer приложения не проходит
                const source = fieldState.optionByValue.get(opt.value)
                return source
                  ? (
                    <SelectionOptionProvider value={optionContext(opt.value, 'option')}>
                      {componentProps.renderOption?.(source, state)}
                    </SelectionOptionProvider>
                  )
                  : opt.label
              }
              : undefined}
            // Свой renderOption — свои кнопки (`Combobox.EditButton`); карандаш по умолчанию только без него
            renderOptionActions={hasOnUpdate && !componentProps.renderOption
              ? (opt) =>
                isCreateOptionValue(opt.value)
                  ? null
                  : (
                    <SelectionOptionProvider value={optionContext(opt.value, 'option')}>
                      <SelectEditButton />
                    </SelectionOptionProvider>
                  )
              : undefined}
            controlActions={showValueEdit && currentValue !== undefined
              ? (
                <SelectionOptionProvider value={optionContext(currentValue, 'value')}>
                  <SelectEditButton />
                </SelectionOptionProvider>
              )
              : undefined}
            listFooter={componentProps.listFooter}
            emptyContent={fieldState.loadError
              ? (
                <span className="flex items-center gap-2">
                  Не удалось загрузить
                  <button
                    type="button"
                    className="text-foreground underline underline-offset-2"
                    onClick={fieldState.retryLoad}
                  >
                    Повторить
                  </button>
                </span>
              )
              : componentProps.renderEmpty
              ? componentProps.renderEmpty({ search })
              : undefined}
            controlRef={actions.controlRef}
            placeholder={resolved.placeholder ?? 'Поиск...'}
            disabled={resolved.disabled}
            data-field-name={fullPath}
          />
        </SelectionActionsProvider>
      </FieldWrapper>
    )
  },
})

/**
 * `createField` не generic — generic-сигнатура восстанавливается приведением: `TData` выводится
 * из `options` и попадает в `renderOption`.
 */
const FieldComboboxGeneric = FieldComboboxBase as unknown as <TData = unknown>(
  props: ComboboxFieldProps<TData>,
) => ReactElement

/** Слоты `Form.Field.Combobox.EditButton` / `.CreateButton` — для своего `renderOption`/`listFooter`/`renderEmpty` */
export const FieldCombobox = Object.assign(FieldComboboxGeneric, {
  EditButton: SelectEditButton,
  CreateButton: SelectCreateButton,
})
