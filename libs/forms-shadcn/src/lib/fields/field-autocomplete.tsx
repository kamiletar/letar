'use client'

import type { ReactElement } from 'react'
import { useMemo, useState } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { AutocompleteFieldProps } from './types'

interface AutocompleteFieldState {
  inputValue: string
  setInputValue: (value: string) => void
  filteredSuggestions: string[]
}

/**
 * Form.Field.Autocomplete — shadcn-скин.
 *
 * Упрощённая версия `FieldCombobox`, которая всегда принимает произвольный текст (не только
 * значение из списка) — тот же принцип, что и у Chakra-версии (`allowCustomValue`). Beta:
 * только статичные `suggestions`, без `useQuery` (Chakra-версия поддерживает асинхронный поиск
 * через ZenStack hooks — здесь не портировано, тот же beta-статус, что у `FieldCombobox`).
 */
export const FieldAutocomplete = createField<AutocompleteFieldProps, string, AutocompleteFieldState>({
  displayName: 'FieldAutocomplete',

  useFieldState: (componentProps): AutocompleteFieldState => {
    const [inputValue, setInputValue] = useState('')
    const suggestions = componentProps.suggestions ?? []
    const minChars = componentProps.minChars ?? 1

    const filteredSuggestions = useMemo(() => {
      if (inputValue.length < minChars) { return [] }
      const needle = inputValue.toLowerCase()
      return suggestions.filter((s) => s.toLowerCase().includes(needle))
    }, [suggestions, inputValue, minChars])

    return { inputValue, setInputValue, filteredSuggestions }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, fieldState }): ReactElement => {
    const options = fieldState.filteredSuggestions.map((s) => ({ label: s, value: s }))

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <shadcnUIKit.Combobox
          inputValue={fieldState.inputValue}
          onInputChange={(value) => {
            fieldState.setInputValue(value)
            // allowCustomValue — значение поля обновляется на каждый ввод, не только при выборе
            field.handleChange(value)
          }}
          onValueChange={(value) => {
            fieldState.setInputValue(value ?? '')
            field.handleChange(value ?? '')
          }}
          options={options}
          placeholder={resolved.placeholder ?? 'Начните вводить...'}
          disabled={resolved.disabled}
          data-field-name={fullPath}
        />
      </FieldWrapper>
    )
  },
})
