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
  useNodeLabelWarning,
  useSelectionActionsState,
} from '@letar/forms-react'
import type { ReactElement } from 'react'
import { useMemo, useState } from 'react'
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
}

/**
 * Form.Field.Combobox — shadcn-скин.
 *
 * Beta-упрощение (см. `ComboboxFieldProps`): только статичные `options`, фильтрация по
 * вхождению подстроки в `label` — не полный аналог Chakra-версии (`useQuery`, debounce,
 * группировка). `shadcnUIKit.Combobox` (Popover + список) сам ничего не фильтрует — принимает
 * уже отфильтрованные `options`, фильтрация — обязанность поля, не примитива.
 */
const FieldComboboxBase = createField<ComboboxFieldProps, string, ComboboxFieldState>({
  displayName: 'FieldCombobox',
  useFieldState: (componentProps): ComboboxFieldState => {
    const [inputValue, setInputValue] = useState('')
    const hasOnCreate = !!componentProps.onCreate && componentProps.createItem !== false
    const actions = useSelectionActionsState({ appOptions: componentProps.options })
    const { createdOptions, overlay } = actions

    // Правки лежат поверх опций приложения; опция приложения сильнее созданной с тем же значением
    const merged = useMemo(
      () => mergeCreatedOptions<SelectOption>(applyOptionOverlay(componentProps.options, overlay), createdOptions),
      [componentProps.options, overlay, createdOptions],
    )
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
    const optionByValue = useMemo(
      () => new Map<string, SelectOption>(merged.map((opt) => [String(opt.value), opt])),
      [merged],
    )
    useNodeLabelWarning('Combobox', normalized)
    const matchedOptions = useMemo(() => {
      const minChars = componentProps.minChars ?? 0
      if (inputValue.length < minChars) { return [] }
      // Без регистра, ё ≡ е, с учётом раскладки («ghbdtn» находит «Привет»)
      return filterSelectionOptions(normalized, inputValue, getOptionText)
    }, [normalized, inputValue, componentProps.minChars])

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

    return { inputValue, setInputValue, filteredOptions, optionByValue, createItemLabel, actions }
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
            }}
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
            emptyContent={componentProps.renderEmpty ? componentProps.renderEmpty({ search }) : undefined}
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
