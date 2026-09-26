'use client'

import {
  CREATE_OPTION_VALUE,
  type CreatedOption,
  getOptionText,
  isCreateOptionValue,
  mergeCreatedOptions,
  shouldOfferCreate,
} from '@letar/forms-core/uikit'
import { useNodeLabelWarning } from '@letar/forms-react'
import type { ReactElement } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { ComboboxFieldProps, SelectOption } from './types'

interface NormalizedOption {
  label: React.ReactNode
  textValue?: string
  value: string
  disabled?: boolean
  data?: unknown
}

interface ComboboxFieldState {
  inputValue: string
  setInputValue: (value: string) => void
  filteredOptions: NormalizedOption[]
  /** Опции в форме приложения (с `data`) по строковому значению — для `renderOption` */
  optionByValue: Map<string, SelectOption>
  /** Подпись служебного пункта «+ Добавить "<поиск>"» (пусто, если пункт сейчас не предлагается) */
  createItemLabel: string
  /** Добавляет опцию, возвращённую `onCreate`, в локальный список */
  addCreatedOption: (option: CreatedOption) => void
  /** `true`, пока `onCreate` не завершился (повторный выбор пункта игнорируется) */
  creatingRef: { current: boolean }
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
    // Опции, созданные через `onCreate`, живут локально, пока поле смонтировано
    const [createdOptions, setCreatedOptions] = useState<CreatedOption[]>([])
    const addCreatedOption = useCallback((option: CreatedOption) => {
      setCreatedOptions((prev) => [...prev, option])
    }, [])
    const creatingRef = useRef(false)
    const hasOnCreate = !!componentProps.onCreate

    // Опция приложения сильнее созданной с тем же значением — дубля после перезагрузки нет
    const merged = useMemo(
      () => mergeCreatedOptions<SelectOption>(componentProps.options, createdOptions),
      [componentProps.options, createdOptions],
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
      if (!inputValue) { return normalized }
      const needle = inputValue.toLowerCase()
      return normalized.filter((opt) => getOptionText(opt).toLowerCase().includes(needle))
    }, [normalized, inputValue, componentProps.minChars])

    // Служебный пункт «+ Добавить "<поиск>"» — в конце списка; в форму не попадает
    const search = inputValue.trim()
    const createItemLabel = hasOnCreate && shouldOfferCreate(search, normalized.map((opt) => getOptionText(opt)))
      ? `+ ${componentProps.createLabel ?? 'Добавить'} "${search}"`
      : ''
    const filteredOptions = useMemo(
      () =>
        createItemLabel
          ? [...matchedOptions, { label: createItemLabel, value: CREATE_OPTION_VALUE }]
          : matchedOptions,
      [matchedOptions, createItemLabel],
    )

    return { inputValue, setInputValue, filteredOptions, optionByValue, createItemLabel, addCreatedOption, creatingRef }
  },
  render: ({ field, fullPath, resolved, hasError, errorMessage, fieldState, componentProps }): ReactElement => {
    const currentValue = (field.state.value as string) || undefined

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <shadcnUIKit.Combobox
          value={currentValue}
          inputValue={fieldState.inputValue}
          onInputChange={fieldState.setInputValue}
          onValueChange={(value) => {
            if (isCreateOptionValue(value)) {
              // Ошибки `onCreate` — забота приложения: всплывают как unhandled rejection, не глотаются
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
            field.handleChange(value ?? '')
          }}
          options={fieldState.filteredOptions}
          renderOption={componentProps.renderOption
            ? (opt, state) => {
              // Служебный пункт создания через renderer приложения не проходит
              const source = fieldState.optionByValue.get(opt.value)
              return source ? componentProps.renderOption?.(source, state) : opt.label
            }
            : undefined}
          placeholder={resolved.placeholder ?? 'Поиск...'}
          disabled={resolved.disabled}
          data-field-name={fullPath}
        />
      </FieldWrapper>
    )
  },
})

/**
 * `createField` не generic — generic-сигнатура восстанавливается приведением: `TData` выводится
 * из `options` и попадает в `renderOption`.
 */
export const FieldCombobox = FieldComboboxBase as unknown as <TData = unknown>(
  props: ComboboxFieldProps<TData>,
) => ReactElement
