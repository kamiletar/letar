'use client'

import {
  CREATE_OPTION_VALUE,
  type CreatedOption,
  isCreateOptionValue,
  mergeCreatedOptions,
  shouldOfferCreate,
} from '@letar/forms-core/uikit'
import type { ReactElement } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { ComboboxFieldProps } from './types'

interface NormalizedOption {
  label: React.ReactNode
  value: string
  disabled?: boolean
}

interface ComboboxFieldState {
  inputValue: string
  setInputValue: (value: string) => void
  filteredOptions: NormalizedOption[]
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
export const FieldCombobox = createField<ComboboxFieldProps, string, ComboboxFieldState>({
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

    const normalized: NormalizedOption[] = useMemo(
      () =>
        // Опция приложения сильнее созданной с тем же значением — дубля после перезагрузки нет
        mergeCreatedOptions(componentProps.options, createdOptions).map((opt) => ({
          label: opt.label,
          value: String(opt.value),
          disabled: (opt as { disabled?: boolean }).disabled,
        })),
      [componentProps.options, createdOptions],
    )
    const matchedOptions = useMemo(() => {
      const minChars = componentProps.minChars ?? 0
      if (inputValue.length < minChars) { return [] }
      if (!inputValue) { return normalized }
      const needle = inputValue.toLowerCase()
      return normalized.filter((opt) => String(opt.label).toLowerCase().includes(needle))
    }, [normalized, inputValue, componentProps.minChars])

    // Служебный пункт «+ Добавить "<поиск>"» — в конце списка; в форму не попадает
    const search = inputValue.trim()
    const createItemLabel = hasOnCreate && shouldOfferCreate(search, normalized.map((opt) => String(opt.label)))
      ? `+ ${componentProps.createLabel ?? 'Добавить'} "${search}"`
      : ''
    const filteredOptions = useMemo(
      () =>
        createItemLabel
          ? [...matchedOptions, { label: createItemLabel, value: CREATE_OPTION_VALUE }]
          : matchedOptions,
      [matchedOptions, createItemLabel],
    )

    return { inputValue, setInputValue, filteredOptions, createItemLabel, addCreatedOption, creatingRef }
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
          placeholder={resolved.placeholder ?? 'Поиск...'}
          disabled={resolved.disabled}
          data-field-name={fullPath}
        />
      </FieldWrapper>
    )
  },
})
