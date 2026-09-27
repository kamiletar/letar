'use client'

import { interpolate } from '@letar/forms-core/i18n'
import {
  applyOptionOverlay,
  CREATE_OPTION_VALUE,
  type FieldDeps,
  filterSelectionOptions,
  getOptionSearchText,
  getOptionText,
  isCreateOptionValue,
  isOptionEditable,
  mergeCreatedOptions,
  type SettleErrorInfo,
  shouldOfferCreate,
} from '@letar/forms-core/uikit'
import {
  SelectionActionsProvider,
  SelectionOptionProvider,
  useDebounce,
  useFormPendingRegistry,
  useNodeLabelWarning,
  usePromiseSearch,
  useSelectedLoader,
  useSelectionActionsState,
} from '@letar/forms-react'
import { useStore } from '@tanstack/react-form'
import type { ReactElement } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { Combobox as ComboboxControl } from '../uikit/primitives/combobox'
import { SelectCreateButton, SelectEditButton } from './selection-slots'
import { type SelectionStrings, useSelectionStrings } from './selection-strings'
import type { ComboboxFieldProps, SelectOption } from './types'
import {
  type DependentFieldUi,
  dependentHelperText,
  DependentLiveRegion,
  useDependentFieldUi,
} from './use-dependent-field-ui'

interface NormalizedOption {
  label: React.ReactNode
  textValue?: string
  description?: React.ReactNode
  value: string
  disabled?: boolean
  pending?: boolean
  data?: unknown
}

interface ComboboxFieldState {
  /** Встроенные строки скина (i18n): подписи кнопок, загрузка, пустой результат, отказ действия */
  strings: SelectionStrings
  inputValue: string
  setInputValue: (value: string) => void
  /** Значение, чья подпись сейчас в инпуте; запись значения самим полем помечается тут, чтобы не считаться внешней */
  syncedValueRef: { current: string | undefined }
  /** Закрытие списка следом за выбором пункта создания не возвращает подпись выбранного (текст поиска остаётся) */
  skipRestoreTextRef: { current: boolean }
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
  /** Зависимое поле (`dependsOn`): значения родителей, блокировка, подсказка, объявление очистки */
  dependent: DependentFieldUi<FieldDeps>
}

/**
 * Form.Field.Combobox — shadcn-скин.
 *
 * Источники опций (ровно один): статичные `options` — фильтр на клиенте по подписи; `loadOptions`
 * (промис-путь: server action, `fetch`, SDK) — фильтрует сервер, поле дебаунсит строку, отменяет
 * прошлый запрос и показывает «Повторить» при ошибке. Нет `useQuery`, группировки и клавиатурной
 * навигации — не полный аналог Chakra-версии.
 *
 * Зависимость от других полей (`dependsOn`, §18): `deps` доходит в `loadOptions`/`loadSelected` (`ctx.deps`),
 * пока родители не готовы, поле заблокировано с подсказкой, смена родителя правкой очищает значение. примитив `Combobox` (Popover + список) сам ничего
 * не фильтрует — принимает уже готовые `options`.
 */
const FieldComboboxBase = createField<ComboboxFieldProps, string, ComboboxFieldState>({
  displayName: 'FieldCombobox',
  useFieldState: (componentProps, resolved, { form, fullPath }): ComboboxFieldState => {
    const strings = useSelectionStrings()
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

    // Зависимость от других полей формы (§18): значения родителей, блокировка, автоочистка по правке родителя
    const dependent = useDependentFieldUi<FieldDeps>({
      fullPath,
      label: resolved.label,
      dependsOn: componentProps.dependsOn,
      depsReady: componentProps.depsReady,
      clearOnParentChange: componentProps.clearOnParentChange,
      disableWhenParentEmpty: componentProps.disableWhenParentEmpty,
      placeholderWhenDisabled: componentProps.placeholderWhenDisabled,
    })
    const promiseSearch = usePromiseSearch({
      loadOptions: componentProps.loadOptions,
      search: debouncedSearch,
      // Запрос уходит, когда родители готовы, список открывали и набран порог `minChars`
      enabled: dependent.ready && everOpened && inputValue.length >= minChars && debouncedSearch.length >= minChars,
      onLoadError: componentProps.onLoadError,
      deps: dependent.deps,
      depsKey: dependent.depsKey,
    })

    // Значение поля читаем до монтирования `<form.Field>` (см. `field-city.tsx`): нужно для `loadSelected` и подписи
    const fieldValue = useStore(form.store, () => form.getFieldValue(fullPath)) as string | undefined
    const valueKey = fieldValue ? String(fieldValue) : ''

    // Опции приложения без фильтра: статичные или записи `loadOptions`
    const sourceOptions = useMemo((): SelectOption[] => {
      if (componentProps.options) {
        return componentProps.options
      }
      const { getLabel, getValue, getTextValue, getDescription, getDisabled, getEditable, getPending } = componentProps
      if (!promiseSearch.data || !getLabel || !getValue) {
        return []
      }
      return (promiseSearch.data as unknown[]).map((item): SelectOption => ({
        label: getLabel(item),
        textValue: getTextValue?.(item),
        description: getDescription?.(item),
        data: item,
        value: getValue(item),
        disabled: getDisabled?.(item),
        editable: getEditable?.(item),
        pending: getPending?.(item),
      }))
    }, [componentProps, promiseSearch.data])

    // `loadSelected`: значение непустое, его нет в текущей выдаче и нет `initialLabel`
    const valueInResults = sourceOptions.some((opt) => String(opt.value) === valueKey)
    const selectedLoader = useSelectedLoader({
      loadSelected: componentProps.loadSelected,
      value: valueKey,
      enabled: !valueInResults && componentProps.initialLabel === undefined,
      onLoadError: componentProps.onLoadError,
      // Кэш записи — по `value` (идентификаторы уникальны между родителями), смена `depsKey` его не сбрасывает
      deps: dependent.deps,
    })
    const selectedSourceOption = useMemo((): SelectOption | undefined => {
      const item = selectedLoader.data
      const { getLabel, getValue, getTextValue, getDescription, getDisabled, getEditable, getPending } = componentProps
      if (item === undefined || item === null || !getLabel || !getValue) {
        return undefined
      }
      return {
        label: getLabel(item),
        textValue: getTextValue?.(item),
        description: getDescription?.(item),
        data: item,
        value: getValue(item),
        disabled: getDisabled?.(item),
        editable: getEditable?.(item),
        pending: getPending?.(item),
      }
    }, [componentProps, selectedLoader.data])

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

    // Правки лежат поверх опций приложения; опция приложения сильнее созданной с тем же значением
    const merged = useMemo(() => {
      // Пока свой оптимистичный create в полёте, `pending`-опции приложения скрыты: почти всегда это та же запись
      // (§16.7), иначе в списке две «Кровли»
      const shownApp = actions.hasOwnCreatePending ? sourceOptions.filter((opt) => !opt.pending) : sourceOptions
      return mergeCreatedOptions<SelectOption>(applyOptionOverlay(shownApp, overlay), createdOptions)
    }, [sourceOptions, overlay, createdOptions, actions.hasOwnCreatePending])

    // Запись из `loadSelected` — вне списка; правки (`onUpdate`) накладываются и на неё
    const selectedOption = useMemo((): SelectOption | undefined => {
      if (!selectedSourceOption || merged.some((opt) => String(opt.value) === String(selectedSourceOption.value))) {
        return undefined
      }
      return applyOptionOverlay([selectedSourceOption], overlay)[0]
    }, [selectedSourceOption, merged, overlay])

    // Подпись значения в инпуте: `initialLabel`, статичные опции или запись `loadSelected` — что найдётся первым.
    // Внешняя смена значения (восстановление черновика, `reset`, `setFieldValue`) тоже меняет подпись:
    // `syncedValueRef` хранит значение, чья подпись уже в инпуте, а собственные записи поля помечают его сами
    const syncedValueRef = useRef<string | undefined>(undefined)
    const skipRestoreTextRef = useRef(false)
    // Значение очищено сменой родителя: подпись прежнего значения в поле ввода стирается, а когда поле снова
    // получит значение — подпись выставится заново
    const clearedId = dependent.state.cleared?.id
    useEffect(() => {
      if (clearedId !== undefined) {
        syncedValueRef.current = undefined
        setInputValue('')
      }
    }, [clearedId])
    useEffect(() => {
      if (!valueKey) {
        syncedValueRef.current = undefined
        return
      }
      // Первичная инициализация не перебивает уже набранный текст; внешнюю смену значения — перебивает
      if (syncedValueRef.current === valueKey || (syncedValueRef.current === undefined && inputValue)) {
        return
      }
      let label: string | undefined
      if (componentProps.initialLabel !== undefined && syncedValueRef.current === undefined) {
        label = componentProps.initialLabel
      } else if (componentProps.options) {
        const found = componentProps.options.find((opt) => String(opt.value) === valueKey)
        label = found ? getOptionText(found) : undefined
      } else if (selectedOption && String(selectedOption.value) === valueKey) {
        label = getOptionText(selectedOption)
      }
      // Опции и запись могут прийти позже — синхронизация закрывается, только когда подпись найдена
      if (label !== undefined) {
        syncedValueRef.current = valueKey
        setInputValue(label)
      }
    }, [valueKey, inputValue, componentProps.initialLabel, componentProps.options, selectedOption])
    const normalized: NormalizedOption[] = useMemo(
      () =>
        merged.map((opt) => ({
          label: opt.label,
          textValue: opt.textValue,
          description: opt.description,
          data: opt.data,
          value: String(opt.value),
          // Опция в ожидании подтверждения не выбирается ни мышью, ни клавиатурой
          disabled: opt.disabled || opt.pending,
          pending: opt.pending,
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
      // Поиск идёт и по строковому описанию, пока не выключен `searchInDescription={false}`
      const getText = componentProps.searchInDescription === false ? getOptionText : getOptionSearchText
      if (inputValue.length < minChars) { return [] }
      // Промис-путь: выдачу уже отфильтровал сервер — локально фильтруем только созданные опции
      if (isPromise) {
        const created = new Set(createdOptions.map((opt) => String(opt.value)))
        const localMatches = new Set(
          filterSelectionOptions(normalized.filter((opt) => created.has(opt.value)), inputValue, getText),
        )
        return normalized.filter((opt) => !created.has(opt.value) || localMatches.has(opt))
      }
      // В поле подпись выбранного значения (не запрос) — список показываем целиком
      const selectedText = valueKey ? normalized.find((opt) => opt.value === valueKey) : undefined
      if (selectedText && inputValue === getOptionText(selectedText)) {
        return normalized
      }
      // Без регистра, ё ≡ е, с учётом раскладки («ghbdtn» находит «Привет»)
      return filterSelectionOptions(normalized, inputValue, getText)
    }, [normalized, inputValue, minChars, isPromise, createdOptions, valueKey, componentProps.searchInDescription])

    // Служебный пункт «+ Добавить "<поиск>"» — в конце списка; в форму не попадает
    const search = inputValue.trim()
    const createItemLabel = hasOnCreate && shouldOfferCreate(search, normalized.map((opt) => getOptionText(opt)))
      ? `+ ${componentProps.createLabel ?? strings.createVerb} "${search}"`
      : ''
    const filteredOptions = useMemo(
      () =>
        createItemLabel
          ? [...matchedOptions, { label: createItemLabel, value: CREATE_OPTION_VALUE }]
          : matchedOptions,
      [matchedOptions, createItemLabel],
    )

    return {
      strings,
      inputValue,
      setInputValue,
      syncedValueRef,
      skipRestoreTextRef,
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
      dependent,
    }
  },
  render: ({ field, fullPath, resolved, hasError, errorMessage, fieldState, componentProps }): ReactElement => {
    const formValue = (field.state.value as string) || undefined
    const { actions, dependent } = fieldState
    // Оптимистично созданная запись показана выбранной, пока форма хранит прежнее значение (§16.7)
    const currentValue = actions.pendingSelection ?? formValue
    const hasOnUpdate = !!componentProps.onUpdate
    // Родители не готовы — поле заблокировано (§18): нативный `disabled`, подсказка вместо placeholder
    const disabled = resolved.disabled || dependent.blocked
    const interactive = !disabled && !resolved.readOnly
    const { helperText: dependentHint, describedBy } = dependentHelperText(dependent, hasError)
    const wrapperResolved = disabled !== resolved.disabled || dependentHint
      ? { ...resolved, disabled, helperText: dependentHint ?? resolved.helperText }
      : resolved
    const search = fieldState.inputValue.trim()
    const resolvedClearable = componentProps.clearable ?? !resolved.required
    const createVerb = componentProps.createLabel ?? fieldState.strings.createVerb

    // Ошибки `onCreate`/`onUpdate` — забота приложения: всплывают как unhandled rejection, не глотаются
    const runCreate = () => {
      const onCreate = componentProps.onCreate
      if (!onCreate) {
        return
      }
      // Текст ввода до действия: отказ оптимистичного create возвращает поле в него
      const previousText = formValue ? getOptionText(fieldState.optionByValue.get(formValue) ?? { value: '' }) : ''
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

    const runEdit = (option: unknown, scope: 'option' | 'value') => {
      const onUpdate = componentProps.onUpdate
      const source = option as SelectOption
      if (!onUpdate) {
        return
      }
      const fromValue = String(source.value)
      // Выбрана ли запись СЕЙЧАС: значение читаем живым — за время оптимистичного ожидания оно могло измениться
      const isSelectedNow = () => {
        const live = field.form.getFieldValue(field.name) as string | undefined
        return !!live && String(live) === fromValue
      }
      actions.run({
        scope,
        kind: 'edit',
        fromValue,
        call: (ctx) => onUpdate(source, ctx),
        // Правят выбранное: поле ввода показывает новую подпись сразу, не дожидаясь сервера
        onOptimistic: (preview) => {
          if (isSelectedNow()) {
            fieldState.setInputValue(preview.label)
          }
        },
        apply: (result) => {
          actions.recordEdit(fromValue, result)
          if (componentProps.loadOptions) {
            fieldState.retryLoad()
          }
          fieldState.invalidateSelected(fromValue)
          // Замена записи (другой value): выбранное переезжает на новую. Тот же value — форма не dirty
          if (isSelectedNow()) {
            if (String(result.value) !== fromValue) {
              fieldState.syncedValueRef.current = String(result.value)
              field.handleChange(String(result.value))
            }
            fieldState.setInputValue(result.label)
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
        edit: fieldState.strings.edit,
        editAria: (text: string) => `${fieldState.strings.edit}: ${text}`,
        create: `+ ${createVerb}…`,
        createWithSearch: (text: string) => `+ ${createVerb} "${text}"`,
        hotkeyHint: fieldState.strings.hotkeyHint,
      },
    }

    const selectedSource = currentValue !== undefined ? fieldState.optionByValue.get(currentValue) : undefined
    const showValueEdit = hasOnUpdate && !!selectedSource && isOptionEditable(selectedSource, true)

    return (
      <FieldWrapper resolved={wrapperResolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <SelectionActionsProvider value={actionsValue}>
          <ComboboxControl
            value={currentValue}
            inputValue={fieldState.inputValue}
            onInputChange={fieldState.setInputValue}
            onValueChange={(value) => {
              if (isCreateOptionValue(value)) {
                // Закрытие списка следом за выбором служебного пункта не возвращает подпись: текст поиска остаётся
                fieldState.skipRestoreTextRef.current = true
                runCreate()
                return
              }
              fieldState.syncedValueRef.current = value || undefined
              field.handleChange(value || dependent.emptyValue)
              // Выбранная опция даёт подпись в поле ввода (очистка — пустую строку)
              const picked = value === undefined ? undefined : fieldState.optionByValue.get(value)
              fieldState.setInputValue(picked ? getOptionText(picked) : '')
            }}
            onOpenChange={(open) => {
              fieldState.markOpened(open)
              if (open) {
                return
              }
              if (fieldState.skipRestoreTextRef.current) {
                fieldState.skipRestoreTextRef.current = false
                return
              }
              // Список закрыт (клик мимо, Tab, Escape): в поле снова подпись выбранного, а не стёртый или недонабранный
              // текст — иначе поле выглядит пустым при живом значении. Очищает значение кнопка «Очистить».
              // Значения нет — недонабранный текст стирается
              // Значение читаем живым: выбор пункта и закрытие списка приходят в одном событии, до перерисовки
              const liveValue = field.form.getFieldValue(field.name) as string | null | undefined
              const source = liveValue ? fieldState.optionByValue.get(String(liveValue)) : undefined
              if (source) {
                fieldState.setInputValue(getOptionText(source))
              } else if (liveValue === null || liveValue === undefined || liveValue === '') {
                // Значения нет: недонабранный текст стирается — как в Chakra, поле не притворяется выбранным
                fieldState.syncedValueRef.current = undefined
                fieldState.setInputValue('')
              }
            }}
            clearable={resolvedClearable}
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
            onEditHotkey={hasOnUpdate && interactive
              ? (key, scope) => {
                const source = fieldState.optionByValue.get(key)
                if (source && isOptionEditable(source, true)) {
                  runEdit(source, scope)
                }
              }
              : undefined}
            editHotkeyHint={fieldState.strings.hotkeyHint}
            emptyContent={fieldState.loadError
              ? (
                <span className="flex items-center gap-2">
                  {fieldState.strings.loadError}
                  <button
                    type="button"
                    className="text-foreground underline underline-offset-2"
                    onClick={fieldState.retryLoad}
                  >
                    {fieldState.strings.retry}
                  </button>
                </span>
              )
              : componentProps.renderEmpty
              ? componentProps.renderEmpty({ search })
              : fieldState.strings.empty}
            controlRef={actions.controlRef}
            placeholder={(dependent.blocked ? dependent.blockedPlaceholder : undefined)
              ?? resolved.placeholder
              ?? fieldState.strings.searchPlaceholder}
            clearLabel={fieldState.strings.clear}
            loadingMessage={fieldState.strings.loading}
            disabled={disabled}
            data-field-name={fullPath}
            aria-describedby={describedBy}
          />
        </SelectionActionsProvider>
        <DependentLiveRegion ui={dependent} />
        {actions.settleFailure && (
          <p role="status" className="text-destructive mt-1 text-sm" data-settle-error="">
            {interpolate(fieldState.strings.settleError, { label: actions.settleFailure.label })}
          </p>
        )}
      </FieldWrapper>
    )
  },
})

/**
 * `createField` не generic — generic-сигнатура восстанавливается приведением: `TData` выводится
 * из `options` и попадает в `renderOption`; `TDeps` — тип `deps` зависимого поля.
 */
const FieldComboboxGeneric = FieldComboboxBase as unknown as <TData = unknown, TDeps extends FieldDeps = FieldDeps>(
  props: ComboboxFieldProps<TData, TDeps>,
) => ReactElement

/** Слоты `Form.Field.Combobox.EditButton` / `.CreateButton` — для своего `renderOption`/`listFooter`/`renderEmpty` */
export const FieldCombobox = Object.assign(FieldComboboxGeneric, {
  EditButton: SelectEditButton,
  CreateButton: SelectCreateButton,
})
