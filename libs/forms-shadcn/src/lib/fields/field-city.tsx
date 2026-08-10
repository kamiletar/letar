'use client'

import type { AddressSuggestion } from '@letar/forms-core/address'
import { useDebounce } from '@letar/forms-react'
import type { ReactElement } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import { useResolvedAddressProvider } from '../utils/use-address-provider'
import type { CityFieldProps } from './types'

interface CityFieldState {
  inputValue: string
  setInputValue: (value: string) => void
  suggestions: AddressSuggestion[]
  isLoading: boolean
  initializedRef: React.RefObject<boolean>
}

/**
 * Form.Field.City — shadcn-скин.
 *
 * Тот же `AddressProvider`/`shadcnUIKit.Combobox`-паттерн, что и `FieldAddress`, но значение —
 * простая строка (имя города), не `AddressValue`, и `bounds` ограничивает подсказки уровнем
 * city/settlement. Beta-упрощения — те же, что у `FieldAddress` (без клавиатурной навигации
 * стрелками по списку, без визуального спиннера), плюс одна своя: Chakra-версия сохраняет
 * введённый вручную текст на `blur`, если пользователь набрал название и не кликнул подсказку —
 * `UIKitComboboxProps` не даёт колбэк `onBlur` (примитив общий с `FieldCombobox`/`FieldAddress`,
 * им это не требовалось), поэтому здесь значение поля обновляется только через выбор подсказки
 * или полное стирание текста.
 */
export const FieldCity = createField<CityFieldProps, string, CityFieldState>({
  displayName: 'FieldCity',

  useFieldState: (props): CityFieldState => {
    const { provider: propProvider, token, minChars = 2, debounceMs = 300 } = props
    const provider = useResolvedAddressProvider(propProvider, token)

    const [inputValue, setInputValue] = useState('')
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const initializedRef = useRef(false)
    const justSelectedRef = useRef(false)

    const debouncedQuery = useDebounce(inputValue, debounceMs)

    const fetchSuggestions = useCallback(
      async (query: string) => {
        if (query.length < minChars || !provider) {
          setSuggestions([])
          return
        }

        setIsLoading(true)
        try {
          const results = await provider.getSuggestions(query, { count: 7, bounds: { from: 'city', to: 'settlement' } })
          setSuggestions(results)
        } catch (error) {
          console.error('Error loading city suggestions:', error)
          setSuggestions([])
        } finally {
          setIsLoading(false)
        }
      },
      [provider, minChars],
    )

    useEffect(() => {
      if (justSelectedRef.current) {
        justSelectedRef.current = false
        return
      }
      if (debouncedQuery) {
        fetchSuggestions(debouncedQuery)
      } else {
        setSuggestions([])
      }
    }, [debouncedQuery, fetchSuggestions])

    return { inputValue, setInputValue, suggestions, isLoading, initializedRef }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, fieldState }): ReactElement => {
    const { inputValue, setInputValue, suggestions, isLoading, initializedRef } = fieldState
    const fieldValue = field.state.value as string | undefined

    // `render` вызывается внутри рендера `<form.Field>` — синхронный `setInputValue()` здесь
    // обновлял бы состояние `FieldCity` во время рендера чужого компонента (TanStack Form
    // ругался «Cannot update a component while rendering a different component»). Инициализация
    // `inputValue` из значения поля перенесена в эффект: он относится к тому же render-prop
    // вызову (React регистрирует хуки по месту вызова, а не по владельцу замыкания), но выполняется
    // после коммита — там setState уже безопасен.
    useEffect(() => {
      if (!initializedRef.current && fieldValue && fieldValue !== inputValue) {
        initializedRef.current = true
        setInputValue(fieldValue)
      }
    }, [fieldValue])

    const options = suggestions.map((s) => ({ label: s.label, value: s.value }))

    const handleValueChange = (value: string | undefined) => {
      const suggestion = suggestions.find((s) => s.value === value)
      if (!suggestion) { return }
      const cityName = (suggestion.data?.city as string) || (suggestion.data?.settlement as string) || suggestion.value
      setInputValue(cityName)
      field.handleChange(cityName)
    }

    const handleInputChange = (value: string) => {
      setInputValue(value)
      // Стёрли текст — сразу очищаем значение поля, как у Chakra-версии
      if (!value) { field.handleChange('') }
    }

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <shadcnUIKit.Combobox
          inputValue={inputValue}
          onInputChange={handleInputChange}
          onValueChange={handleValueChange}
          options={options}
          loading={isLoading}
          placeholder={resolved.placeholder ?? 'Введите город...'}
          disabled={resolved.disabled}
          data-field-name={fullPath}
        />
      </FieldWrapper>
    )
  },
})
