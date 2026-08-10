'use client'

import type { AddressProvider, AddressSuggestion } from '@letar/forms-core/address'
import { createDaDataProvider } from '@letar/forms-core/address'
import { useDebounce, useDeclarativeFormOptional } from '@letar/forms-react'
import type { ReactElement } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { AddressFieldProps, AddressValue } from './types'

/** Резолв провайдера: проп → контекст формы → token-фолбэк. Тот же приоритет, что у Chakra-версии. */
function useAddressProvider(propProvider?: AddressProvider, token?: string): AddressProvider | null {
  const formContext = useDeclarativeFormOptional()
  const tokenProvider = useMemo(() => (token ? createDaDataProvider({ token }) : null), [token])

  if (propProvider) { return propProvider }
  if (formContext?.addressProvider) { return formContext.addressProvider }
  return tokenProvider
}

interface AddressFieldState {
  inputValue: string
  setInputValue: (value: string) => void
  suggestions: AddressSuggestion[]
  isLoading: boolean
  initializedRef: React.RefObject<boolean>
}

/**
 * Form.Field.Address — shadcn-скин.
 *
 * Переиспользует `shadcnUIKit.Combobox` (Popover + input) как UI — тот же примитив, что и
 * `FieldCombobox`, но с async-подгрузкой из `AddressProvider` вместо статичного списка
 * `options`. Beta-упрощение относительно Chakra-версии: нет клавиатурной навигации
 * стрелками/Escape по списку подсказок (Combobox-примитив UIKit её не поддерживает — только
 * клик и Enter/Escape самого Popover) и нет отображения спиннера внутри инпута — `loading`
 * прокинут в примитив как есть (текст "Загрузка..." вместо списка).
 */
export const FieldAddress = createField<AddressFieldProps, AddressValue | string, AddressFieldState>({
  displayName: 'FieldAddress',

  useFieldState: (props): AddressFieldState => {
    const { provider: propProvider, token, minChars = 3, debounceMs = 300, locations } = props
    const provider = useAddressProvider(propProvider, token)

    const [inputValue, setInputValue] = useState('')
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const initializedRef = useRef(false)
    const abortControllerRef = useRef<AbortController | null>(null)
    const justSelectedRef = useRef(false)

    const debouncedQuery = useDebounce(inputValue, debounceMs)

    useEffect(() => {
      return () => {
        abortControllerRef.current?.abort()
      }
    }, [])

    const fetchSuggestions = useCallback(
      async (query: string) => {
        if (query.length < minChars || !provider) {
          setSuggestions([])
          return
        }

        abortControllerRef.current?.abort()
        const controller = new AbortController()
        abortControllerRef.current = controller

        setIsLoading(true)
        try {
          const results = await provider.getSuggestions(query, {
            count: 10,
            filters: locations ? Object.assign({}, ...locations) : undefined,
          })
          if (controller.signal.aborted) { return }
          setSuggestions(results)
        } catch (error) {
          if (controller.signal.aborted) { return }
          console.error('Error loading address suggestions:', error)
          setSuggestions([])
        } finally {
          if (!controller.signal.aborted) { setIsLoading(false) }
        }
      },
      [provider, minChars, locations],
    )

    useEffect(() => {
      if (justSelectedRef.current) {
        justSelectedRef.current = false
        return
      }
      if (debouncedQuery) {
        fetchSuggestions(debouncedQuery)
      } else {
        abortControllerRef.current?.abort()
        setSuggestions([])
      }
      // fetchSuggestions стабилен по ссылке, пока не меняются provider/minChars/locations —
      // включение в deps не добавляет лишних срабатываний, зато не требует eslint-disable
      // (плагин react-hooks/exhaustive-deps не зарегистрирован в этом воркспейсе — см. тот же
      // паттерн в libs/forms/src/lib/utils/use-form-store-subscribe.ts, не чиню походя).
    }, [debouncedQuery, fetchSuggestions])

    return {
      inputValue,
      setInputValue: (value: string) => {
        setInputValue(value)
      },
      suggestions,
      isLoading,
      initializedRef,
    }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const { valueOnly = false } = componentProps
    const { inputValue, setInputValue, suggestions, isLoading, initializedRef } = fieldState

    const fieldValue = field.state.value as AddressValue | string | undefined

    if (!initializedRef.current && fieldValue) {
      const displayValue = typeof fieldValue === 'string' ? fieldValue : fieldValue.value
      if (displayValue && displayValue !== inputValue) {
        setInputValue(displayValue)
      }
      initializedRef.current = true
    }

    const options = suggestions.map((s) => ({ label: s.label, value: s.value }))

    const handleValueChange = (value: string | undefined) => {
      const suggestion = suggestions.find((s) => s.value === value)
      if (!suggestion) { return }

      setInputValue(suggestion.value)

      if (valueOnly) {
        field.handleChange(suggestion.value)
      } else {
        field.handleChange({ value: suggestion.value, data: suggestion.data })
      }
    }

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <shadcnUIKit.Combobox
          inputValue={inputValue}
          onInputChange={setInputValue}
          onValueChange={handleValueChange}
          options={options}
          loading={isLoading}
          placeholder={resolved.placeholder ?? 'Начните вводить адрес...'}
          disabled={resolved.disabled}
          data-field-name={fullPath}
        />
      </FieldWrapper>
    )
  },
})
