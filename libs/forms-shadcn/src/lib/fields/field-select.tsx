'use client'

import {
  applyOptionOverlay,
  CREATE_OPTION_VALUE,
  type FieldDeps,
  getOptionText,
  isCreateOptionValue,
  isOptionEditable,
  mergeCreatedOptions,
  type SettleErrorInfo,
} from '@letar/forms-core/uikit'
import {
  SelectionActionsProvider,
  SelectionOptionProvider,
  useFormPendingRegistry,
  useNodeLabelWarning,
  usePromiseSearch,
  useSelectionActionsState,
} from '@letar/forms-react'
import { useStore } from '@tanstack/react-form'
import type { ReactElement } from 'react'
import { useEffect, useMemo } from 'react'
import { createField } from '../uikit/primitives'
import { Select as SelectControl } from '../uikit/primitives/select'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import { SelectCreateButton, SelectEditButton } from './selection-slots'
import type { SelectFieldProps, SelectOption } from './types'
import {
  type DependentFieldUi,
  dependentHelperText,
  DependentLiveRegion,
  useDependentFieldUi,
} from './use-dependent-field-ui'

/**
 * Radix Select трактует `''` как «ничего не выбрано» (показывает placeholder), поэтому опция
 * «Все категории» со значением `''` не могла отображаться выбранной. Внутри примитива такое
 * значение подменяется служебным токеном, наружу (в форму) всегда уходит настоящее `''`.
 */
const EMPTY_OPTION_TOKEN = '__letar_empty_option__'

/** Предупреждение про `searchable` — один раз на процесс и только в dev/test */
let searchWarned = false

function warnSearchUnsupported(): void {
  const env = process.env.NODE_ENV
  if ((env !== 'development' && env !== 'test') || searchWarned) {
    return
  }
  searchWarned = true
  console.warn(
    '[@letar/forms-shadcn] Field.Select: `searchable` пока не поддержан — в списке Radix Select нет поля поиска '
      + '(конфликт фокусной модели). Нужен поиск — используйте Field.Combobox.',
  )
}

/** Только для тестов: сбросить флаг «предупреждение уже было» */
export function resetSelectSearchWarning(): void {
  searchWarned = false
}

interface NormalizedOption {
  label: React.ReactNode
  textValue?: string
  value: string
  disabled?: boolean
  editable?: boolean
  pending?: boolean
  data?: unknown
}

interface SelectFieldState {
  normalizedOptions: NormalizedOption[]
  resolvedClearable: boolean
  /** В списке есть опция с пустым значением (`''`) */
  hasEmptyOption: boolean
  /** Опции в форме приложения (с `data`) по нормализованному значению — для render-функций */
  optionByValue: Map<string, SelectOption>
  /** Действия (`onCreate`/`onUpdate`): pending, наложение правок, созданные опции, конвейер */
  actions: ReturnType<typeof useSelectionActionsState>
  /** Подпись служебного пункта создания */
  createLabel: string
  /** Зависимое поле (`dependsOn`): значения родителей, блокировка, подсказка, объявление очистки */
  dependent: DependentFieldUi<FieldDeps>
  /** Опции ещё грузятся: свой `loading`, запрос `loadOptions` или хук `useOptions` */
  loading: boolean
}

/** Form.Field.Select — shadcn-скин. */
const FieldSelectBase = createField<SelectFieldProps, string | number, SelectFieldState>({
  displayName: 'FieldSelect',
  useFieldState: (componentProps, resolved, { form, fullPath }): SelectFieldState => {
    const showCreateItem = !!componentProps.onCreate && componentProps.createItem !== false
    const hasOnUpdate = !!componentProps.onUpdate
    const createLabel = componentProps.createLabel ?? 'Добавить…'

    // Зависимость от других полей формы (§18): значения родителей, блокировка, автоочистка по правке родителя.
    // Пустое значение при очистке — то же, что пишет собственная очистка поля (`dependent.emptyValue`)
    const dependent = useDependentFieldUi<FieldDeps>({
      fullPath,
      label: resolved.label,
      valueType: componentProps.valueType,
      dependsOn: componentProps.dependsOn,
      depsReady: componentProps.depsReady,
      clearOnParentChange: componentProps.clearOnParentChange,
      disableWhenParentEmpty: componentProps.disableWhenParentEmpty,
      placeholderWhenDisabled: componentProps.placeholderWhenDisabled,
    })

    // Источник `loadOptions`: разовая загрузка на каждый `depsKey`, только когда родители готовы (search всегда `''`).
    // Опции прежнего родителя не показываются (`usePromiseSearch` прячет ответ с другим `depsKey`)
    const promiseSearch = usePromiseSearch({
      loadOptions: componentProps.loadOptions,
      search: '',
      enabled: dependent.ready,
      onLoadError: componentProps.onLoadError,
      deps: dependent.deps,
      depsKey: dependent.depsKey,
    })
    // Источник `useOptions`: хук приложения на каждом рендере (источник между рендерами не меняется)
    const hookSource = componentProps.useOptions?.(dependent.deps)

    const appOptions = componentProps.options
    const promiseData = promiseSearch.data
    const hookOptions = hookSource?.options
    const sourceOptions = useMemo((): SelectOption[] => {
      if (componentProps.loadOptions) {
        const { getLabel, getValue, getTextValue, getDisabled, getEditable, getPending } = componentProps
        if (!promiseData || !getLabel || !getValue) {
          return []
        }
        return (promiseData as unknown[]).map((item): SelectOption => ({
          label: getLabel(item),
          textValue: getTextValue?.(item),
          data: item,
          value: getValue(item),
          disabled: getDisabled?.(item),
          editable: getEditable?.(item),
          pending: getPending?.(item),
        }))
      }
      if (hookOptions) {
        return hookOptions as SelectOption[]
      }
      if (typeof appOptions === 'function') {
        // Родители не готовы — функция не вызывается: она вправе рассчитывать на непустые `deps`
        return dependent.ready ? (appOptions as (deps: FieldDeps) => SelectOption[])(dependent.deps) : []
      }
      return (appOptions ?? resolved.options ?? []) as SelectOption[]
      // `componentProps` меняется на каждом рендере — зависим от того, что реально читаем
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appOptions, resolved.options, promiseData, hookOptions, dependent.depsKey, dependent.ready])
    const loading = !!componentProps.loading || promiseSearch.isLoading || !!hookSource?.loading

    // Значение нужно конвейеру действий: ожидающий выбор оптимистичного create снимается, когда оно изменилось
    const fieldValue = useStore(form.store, () => form.getFieldValue(fullPath)) as string | number | undefined
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

    const { normalizedOptions, optionByValue } = useMemo(() => {
      // Пока свой оптимистичный create в полёте, `pending`-опции приложения скрыты: почти всегда это та же запись,
      // иначе в списке две «Кровли» (§16.7)
      const shownApp = actions.hasOwnCreatePending ? sourceOptions.filter((opt) => !opt.pending) : sourceOptions
      // Правки лежат поверх опций приложения, пока оно не перезапросит список
      const edited = applyOptionOverlay(shownApp, overlay)
      // Опция приложения сильнее созданной с тем же значением — дубля после перезагрузки нет
      const merged = mergeCreatedOptions<SelectOption>(edited, createdOptions)
      const toKey = (opt: SelectOption) => (String(opt.value) === '' ? EMPTY_OPTION_TOKEN : String(opt.value))
      const normalized: NormalizedOption[] = merged.map((opt) => ({
        label: opt.label,
        textValue: opt.textValue,
        data: opt.data,
        value: toKey(opt),
        disabled: opt.disabled,
        pending: opt.pending,
        editable: isOptionEditable(opt, hasOnUpdate),
      }))
      // Служебный пункт: перехватывается в onValueChange, в форму не попадает
      const withCreate: NormalizedOption[] = showCreateItem
        ? [...normalized, { label: `+ ${createLabel}`, value: CREATE_OPTION_VALUE }]
        : normalized
      return {
        normalizedOptions: withCreate,
        optionByValue: new Map<string, SelectOption>(merged.map((opt) => [toKey(opt), opt])),
      }
    }, [sourceOptions, overlay, createdOptions, hasOnUpdate, showCreateItem, createLabel, actions.hasOwnCreatePending])

    const resolvedClearable = componentProps.clearable ?? !resolved.required

    const hasEmptyOption = normalizedOptions.some((opt) => opt.value === EMPTY_OPTION_TOKEN)

    useNodeLabelWarning('Select', normalizedOptions)

    // `'auto'`/`false`/`undefined` — тихо; `true` и объект просят поиск, которого в этом скине нет
    const searchRequested = componentProps.searchable === true || typeof componentProps.searchable === 'object'
    useEffect(() => {
      if (searchRequested) {
        warnSearchUnsupported()
      }
    }, [searchRequested])

    return {
      normalizedOptions,
      optionByValue,
      resolvedClearable,
      hasEmptyOption,
      actions,
      createLabel,
      dependent,
      loading,
    }
  },
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const currentValue = field.state.value
    const formRawValue = currentValue !== null && currentValue !== undefined ? String(currentValue) : undefined
    const { actions, dependent } = fieldState
    // Оптимистично созданная запись показана выбранной, пока форма хранит прежнее значение (§16.7)
    const rawValue = actions.pendingSelection ?? formRawValue
    // `''` при наличии опции с пустым значением — это выбранная опция, а не «пусто»
    const stringValue = rawValue === '' && fieldState.hasEmptyOption ? EMPTY_OPTION_TOKEN : rawValue
    const hasOnUpdate = !!componentProps.onUpdate
    // Родители не готовы — поле заблокировано (§18): нативный `disabled`, подсказка вместо placeholder
    const disabled = resolved.disabled || dependent.blocked
    const interactive = !disabled && !resolved.readOnly
    const { helperText: dependentHint, describedBy } = dependentHelperText(dependent, hasError)

    const applyValue = (raw: string | undefined) => {
      if (!raw) {
        field.handleChange(dependent.emptyValue)
      } else if (componentProps.valueType === 'number') {
        field.handleChange(Number(raw))
      } else {
        field.handleChange(raw)
      }
    }

    // Ошибки `onCreate`/`onUpdate` — забота приложения, всплывают как unhandled rejection
    const runCreate = () => {
      const onCreate = componentProps.onCreate
      if (!onCreate) {
        return
      }
      actions.run({
        scope: 'option',
        kind: 'create',
        call: (ctx) => onCreate('', ctx),
        apply: (created, info) => {
          actions.addCreatedOption(created)
          // Выбор пользователя, сделанный за время оптимистичного ожидания, подтверждение не перебивает
          if (!info.optimistic || info.selectionHeld) {
            applyValue(String(created.value))
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
        kind: 'edit',
        fromValue,
        call: (ctx) => onUpdate(source, ctx),
        apply: (result) => {
          actions.recordEdit(fromValue, result)
          // Замена записи (другой value): выбранное переезжает на новую. Тот же value — форма не dirty.
          // Значение читаем живым: при оптимистичной правке за время ожидания оно могло измениться
          const liveValue = field.form.getFieldValue(field.name)
          if (String(result.value) !== fromValue && liveValue !== undefined && String(liveValue) === fromValue) {
            applyValue(String(result.value))
          }
        },
      })
    }

    const optionContext = (key: string, scope: 'option' | 'value' | 'value-text') => {
      const source = fieldState.optionByValue.get(key)
      return {
        option: source,
        text: source ? getOptionText(source) : '',
        editable: !!source && isOptionEditable(source, hasOnUpdate),
        scope,
      }
    }

    const createText = `+ ${fieldState.createLabel}`
    const actionsValue = {
      pending: actions.pending,
      canCreate: !!componentProps.onCreate,
      hasOnUpdate,
      interactive,
      search: '',
      runCreate,
      runEdit,
      strings: {
        edit: 'Изменить',
        editAria: (text: string) => `Изменить: ${text}`,
        create: createText,
        createWithSearch: () => createText,
        hotkeyHint: 'F2 — изменить запись',
      },
    }

    const selectedSource = stringValue !== undefined ? fieldState.optionByValue.get(stringValue) : undefined

    return (
      <shadcnUIKit.FieldRoot invalid={hasError} required={resolved.required} disabled={disabled}>
        <SelectionActionsProvider value={actionsValue}>
          <SelectControl
            value={stringValue}
            onValueChange={(pickedValue) => {
              const newStringValue = pickedValue === EMPTY_OPTION_TOKEN ? '' : pickedValue
              if (isCreateOptionValue(newStringValue)) {
                // Служебный пункт: значение не применяется
                runCreate()
                return
              }
              applyValue(newStringValue)
            }}
            onBlur={field.handleBlur}
            options={fieldState.normalizedOptions}
            renderOption={componentProps.renderOption
              ? (opt, state) => {
                // Служебный пункт «+ Добавить…» через renderer приложения не проходит
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
            // Свой renderOption — свои кнопки (`Select.EditButton`); карандаш по умолчанию только без него
            renderOptionActions={hasOnUpdate && !componentProps.renderOption
              ? (opt) => (
                <SelectionOptionProvider value={optionContext(opt.value, 'option')}>
                  <SelectEditButton />
                </SelectionOptionProvider>
              )
              : undefined}
            renderValue={componentProps.renderValue
              ? (opt) => {
                const source = fieldState.optionByValue.get(opt.value)
                const custom = source ? componentProps.renderValue?.(source) : undefined
                // Пустой результат отдаём как есть — примитив откатится к тексту опции
                if (custom === undefined || custom === null || custom === false || custom === '') {
                  return custom
                }
                return (
                  <SelectionOptionProvider value={optionContext(opt.value, 'value-text')}>
                    {custom}
                  </SelectionOptionProvider>
                )
              }
              : undefined}
            controlActions={hasOnUpdate && selectedSource && stringValue !== undefined
              ? (
                <SelectionOptionProvider value={optionContext(stringValue, 'value')}>
                  <SelectEditButton />
                </SelectionOptionProvider>
              )
              : undefined}
            listFooter={componentProps.listFooter}
            loading={fieldState.loading}
            loadingMessage="Загрузка..."
            controlRef={actions.controlRef}
            onEditHotkey={hasOnUpdate && interactive
              ? (key, scope) => {
                const source = fieldState.optionByValue.get(key)
                if (source && isOptionEditable(source, true)) {
                  runEdit(source, scope)
                }
              }
              : undefined}
            editHotkeyHint="F2 — изменить запись"
            label={resolved.label}
            placeholder={dependent.blocked ? dependent.blockedPlaceholder : resolved.placeholder}
            disabled={disabled}
            readOnly={resolved.readOnly}
            clearable={fieldState.resolvedClearable}
            data-field-name={fullPath}
            aria-describedby={describedBy}
            // Значение зависимого поля вне загруженных опций (несогласованные данные) — показываем, не стираем
            showUnknownValue={dependent.active}
          />
        </SelectionActionsProvider>
        <DependentLiveRegion ui={dependent} />
        {actions.settleFailure && (
          <p role="status" className="text-destructive mt-1 text-sm" data-settle-error="">
            {`Не удалось сохранить «${actions.settleFailure.label}»`}
          </p>
        )}
        <shadcnUIKit.FieldError
          hasError={hasError}
          errorMessage={errorMessage}
          helperText={dependentHint ?? resolved.helperText}
        />
      </shadcnUIKit.FieldRoot>
    )
  },
})

/**
 * `createField` не generic — generic-сигнатура восстанавливается приведением: `TData` выводится
 * из `options` и попадает в `renderOption`/`renderValue`; `TDeps` — тип `deps` зависимого поля
 * (`<Form.Field.Select<City, { countryId: string }> dependsOn="countryId" …>` или из аннотации параметра загрузчика).
 */
const FieldSelectGeneric = FieldSelectBase as unknown as <TData = unknown, TDeps extends FieldDeps = FieldDeps>(
  props: SelectFieldProps<TData, TDeps>,
) => ReactElement

/** Слоты `Form.Field.Select.EditButton` / `.CreateButton` — для своего `renderOption`/`listFooter` */
export const FieldSelect = Object.assign(FieldSelectGeneric, {
  EditButton: SelectEditButton,
  CreateButton: SelectCreateButton,
})
