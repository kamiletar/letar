'use client'

import { Box, Field, Input, List, Spinner, Text } from '@chakra-ui/react'
import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDeclarativeFormOptional } from '../../form-context'
import type { AddressFieldProps, AddressValue } from '../../types'
import { createField, FieldError, FieldLabel, useDebounce } from '../base'
import type { AddressProvider, AddressSuggestion } from './providers'
import { createDaDataProvider } from './providers'

/**
 * Resolve address provider from props, context, or token fallback.
 */
function useAddressProvider(propProvider?: AddressProvider, token?: string): AddressProvider | null {
  const formContext = useDeclarativeFormOptional()

  // Мемоизируем — иначе createDaDataProvider создаёт новый объект при каждом рендере,
  // что вызывает re-render loop через fetchSuggestions → useEffect → запросы к DaData
  const tokenProvider = useMemo(() => (token ? createDaDataProvider({ token }) : null), [token])

  if (propProvider) return propProvider
  if (formContext?.addressProvider) return formContext.addressProvider
  return tokenProvider
}

/**
 * State for address field
 */
interface AddressFieldState {
  inputValue: string
  setInputValue: (value: string) => void
  suggestions: AddressSuggestion[]
  setSuggestions: (suggestions: AddressSuggestion[]) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  highlightedIndex: number
  setHighlightedIndex: (index: number) => void
  containerRef: React.RefObject<HTMLDivElement | null>
  debouncedQuery: string
  fetchSuggestions: (query: string) => Promise<void>
  initializedRef: React.RefObject<boolean>
  justSelectedRef: React.RefObject<boolean>
}

/**
 * Form.Field.Address — address input with autocomplete suggestions.
 *
 * Supports pluggable address providers. DaData (Russia) is built-in;
 * pass any `AddressProvider` for other geocoding services.
 *
 * @example With provider (recommended)
 * ```tsx
 * const dadata = createDaDataProvider({ token: '...' })
 * <Form.Field.Address name="address" provider={dadata} />
 * ```
 *
 * @example With token (backward compatible, auto-creates DaData provider)
 * ```tsx
 * <Form.Field.Address name="address" token="dadata-token" />
 * ```
 *
 * @example Return only string value
 * ```tsx
 * <Form.Field.Address name="address" provider={dadata} valueOnly />
 * ```
 */
export const FieldAddress = createField<AddressFieldProps, AddressValue | string, AddressFieldState>({
  displayName: 'FieldAddress',

  useFieldState: (props) => {
    const { provider: propProvider, token, minChars = 3, debounceMs = 300, locations } = props
    const provider = useAddressProvider(propProvider, token)

    const [inputValue, setInputValue] = useState('')
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [highlightedIndex, setHighlightedIndex] = useState(-1)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const initializedRef = useRef(false)
    const abortControllerRef = useRef<AbortController | null>(null)
    // Флаг: пользователь только что выбрал подсказку — следующий debouncedQuery не должен открывать дропдаун
    const justSelectedRef = useRef(false)

    const debouncedQuery = useDebounce(inputValue, debounceMs)

    // Отмена in-flight запросов при unmount
    useEffect(() => {
      return () => {
        abortControllerRef.current?.abort()
      }
    }, [])

    // Загрузка подсказок от провайдера
    const fetchSuggestions = useCallback(
      async (query: string) => {
        if (query.length < minChars || !provider) {
          setSuggestions([])
          return
        }

        // Отменяем предыдущий запрос
        abortControllerRef.current?.abort()
        const controller = new AbortController()
        abortControllerRef.current = controller

        setIsLoading(true)
        try {
          const results = await provider.getSuggestions(query, {
            count: 10,
            filters: locations ? Object.assign({}, ...locations) : undefined,
          })
          // Игнорируем результат если запрос был отменён
          if (controller.signal.aborted) return
          setSuggestions(results)
          setIsOpen(true)
        } catch (error) {
          if (controller.signal.aborted) return
          console.error('Error loading address suggestions:', error)
          setSuggestions([])
        } finally {
          if (!controller.signal.aborted) {
            setIsLoading(false)
          }
        }
      },
      [provider, minChars, locations],
    )

    // Загрузка при изменении debounced запроса
    useEffect(() => {
      // После выбора подсказки пропускаем один запрос — иначе дропдаун снова открывается
      if (justSelectedRef.current) {
        justSelectedRef.current = false
        return
      }
      if (debouncedQuery) {
        fetchSuggestions(debouncedQuery)
      } else {
        abortControllerRef.current?.abort()
        setSuggestions([])
        setIsOpen(false)
      }
      // fetchSuggestions намеренно не в зависимостях — единственный триггер это debouncedQuery.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedQuery])

    // Close on click outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return {
      inputValue,
      setInputValue,
      suggestions,
      setSuggestions,
      isLoading,
      setIsLoading,
      isOpen,
      setIsOpen,
      highlightedIndex,
      setHighlightedIndex,
      containerRef,
      debouncedQuery,
      fetchSuggestions,
      initializedRef,
      justSelectedRef,
    }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const { valueOnly = false } = componentProps
    const {
      inputValue,
      setInputValue,
      suggestions,
      setSuggestions,
      isLoading,
      isOpen,
      setIsOpen,
      highlightedIndex,
      setHighlightedIndex,
      containerRef,
      initializedRef,
      justSelectedRef,
    } = fieldState

    const fieldValue = field.state.value as AddressValue | string | undefined

    // Initialize input value from field (only on first render)
    if (!initializedRef.current && fieldValue) {
      const displayValue = typeof fieldValue === 'string' ? fieldValue : fieldValue.value
      if (displayValue && displayValue !== inputValue) {
        setInputValue(displayValue)
      }
      initializedRef.current = true
    }

    // Handler for suggestion selection
    const handleSelect = (suggestion: AddressSuggestion) => {
      justSelectedRef.current = true
      setInputValue(suggestion.value)
      setIsOpen(false)
      setSuggestions([])

      if (valueOnly) {
        field.handleChange(suggestion.value)
      } else {
        const addressValue: AddressValue = {
          value: suggestion.value,
          data: suggestion.data,
        }
        field.handleChange(addressValue)
      }
    }

    // Keyboard navigation handler
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) {
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex(highlightedIndex < suggestions.length - 1 ? highlightedIndex + 1 : 0)
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex(highlightedIndex > 0 ? highlightedIndex - 1 : suggestions.length - 1)
          break
        case 'Enter':
          e.preventDefault()
          if (highlightedIndex >= 0) {
            handleSelect(suggestions[highlightedIndex])
          }
          break
        case 'Escape':
          setIsOpen(false)
          break
      }
    }

    return (
      <Field.Root
        invalid={hasError}
        required={resolved.required}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
      >
        <FieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />
        <Box ref={containerRef} position="relative" width="100%">
          <Input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              setHighlightedIndex(-1)
            }}
            onFocus={() => {
              if (suggestions.length > 0) {
                setIsOpen(true)
              }
            }}
            onBlur={field.handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={resolved.placeholder ?? 'Start typing address...'}
            data-field-name={fullPath}
          />
          {isLoading && (
            <Box position="absolute" right={3} top="50%" transform="translateY(-50%)">
              <Spinner size="sm" />
            </Box>
          )}
          {isOpen && suggestions.length > 0 && (
            <List.Root
              position="absolute"
              zIndex={10}
              width="100%"
              bg="bg.panel"
              borderWidth="1px"
              borderRadius="md"
              shadow="md"
              maxH="200px"
              overflowY="auto"
              mt={1}
            >
              {suggestions.map((suggestion, index) => (
                <List.Item
                  key={suggestion.value + index}
                  px={3}
                  py={2}
                  cursor="pointer"
                  bg={highlightedIndex === index ? 'bg.muted' : undefined}
                  _hover={{ bg: 'bg.muted' }}
                  onClick={() => handleSelect(suggestion)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <Text fontSize="sm">{suggestion.label}</Text>
                </List.Item>
              ))}
            </List.Root>
          )}
        </Box>
        <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </Field.Root>
    )
  },
})
