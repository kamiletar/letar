'use client'

import type { ReactElement } from 'react'
import { useMemo, useState } from 'react'
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
    const normalized: NormalizedOption[] = useMemo(
      () =>
        componentProps.options.map((opt) => ({ label: opt.label, value: String(opt.value), disabled: opt.disabled })),
      [componentProps.options],
    )
    const filteredOptions = useMemo(() => {
      const minChars = componentProps.minChars ?? 0
      if (inputValue.length < minChars) { return [] }
      if (!inputValue) { return normalized }
      const needle = inputValue.toLowerCase()
      return normalized.filter((opt) => String(opt.label).toLowerCase().includes(needle))
    }, [normalized, inputValue, componentProps.minChars])

    return { inputValue, setInputValue, filteredOptions }
  },
  render: ({ field, fullPath, resolved, hasError, errorMessage, fieldState }): ReactElement => {
    const currentValue = (field.state.value as string) || undefined

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <shadcnUIKit.Combobox
          value={currentValue}
          inputValue={fieldState.inputValue}
          onInputChange={fieldState.setInputValue}
          onValueChange={(value) => field.handleChange(value ?? '')}
          options={fieldState.filteredOptions}
          placeholder={resolved.placeholder ?? 'Поиск...'}
          disabled={resolved.disabled}
          data-field-name={fullPath}
        />
      </FieldWrapper>
    )
  },
})
