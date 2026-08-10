'use client'

import type { AddressProvider, AddressSuggestion } from '@letar/forms-core/address'
import { createDaDataProvider } from '@letar/forms-core/address'
import { useDebounce, useDeclarativeFormOptional } from '@letar/forms-react'
import type { ReactElement } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { CityFieldProps } from './types'

/** Резолв провайдера: проп → контекст формы → token-фолбэк. Тот же приоритет, что у Chakra-версии. */
function useCityProvider(propProvider?: AddressProvider, token?: string): AddressProvider | null {
  const formContext = useDeclarativeFormOptional()
  const tokenProvider = useMemo(() => (token ? createDaDataProvider({ token }) : null), [token])

  if (propProvider) { return propProvider }
  if (formContext?.addressProvider) { return formContext.addressProvider }
  return tokenProvider
}

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
    const provider = useCityProvider(propProvider, token)

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

    if (!initializedRef.current && fieldValue && fieldValue !== inputValue) {
      initializedRef.current = true
      setInputValue(fieldValue)
    }

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
