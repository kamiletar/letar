'use client'

import { Box, Field, Input, List, Spinner, Text } from '@chakra-ui/react'
import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react'
import { useDeclarativeFormOptional } from '../../form-context'
import type { CityFieldProps } from '../../types'
import { createField, FieldError, FieldLabel, useDebounce } from '../base'
import type { AddressProvider, AddressSuggestion } from './providers'
import { createDaDataProvider } from './providers'

/**
 * Resolve address provider from props, context, token, or env fallback.
 */
function useCityProvider(propProvider?: AddressProvider, token?: string): AddressProvider | null {
  const formContext = useDeclarativeFormOptional()

  // Priority: prop > createForm context > token > env
  if (propProvider) return propProvider
  if (formContext?.addressProvider) return formContext.addressProvider
  if (token) return createDaDataProvider({ token })

  // Backward compatible: try env variable
  const envKey = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_DADATA_API_KEY : ''
  if (envKey) return createDaDataProvider({ token: envKey })

  return null
}

/**
 * City field state
 */
interface CityFieldState {
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
}

/**
 * Form.Field.City — city selection with autocomplete suggestions.
 *
 * Supports pluggable address providers. DaData (Russia) is built-in;
 * pass any `AddressProvider` for other geocoding services.
 * Uses bounds to restrict suggestions to city/settlement level.
 *
 * @example With provider (recommended)
 * ```tsx
 * <Form.Field.City name="city" label="City" provider={dadata} />
 * ```
 *
 * @example With token (backward compatible)
 * ```tsx
 * <Form.Field.City name="city" token="your-token" />
 * ```
 *
 * @example Auto-detect from env (NEXT_PUBLIC_DADATA_API_KEY)
 * ```tsx
 * <Form.Field.City name="city" label="City" />
 * ```
 */
export const FieldCity = createField<CityFieldProps, string, CityFieldState>({
  displayName: 'FieldCity',

  useFieldState: (props) => {
    const { provider: propProvider, token, minChars = 2, debounceMs = 300 } = props
    const provider = useCityProvider(propProvider, token)

    const [inputValue, setInputValue] = useState('')
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [highlightedIndex, setHighlightedIndex] = useState(-1)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const debouncedQuery = useDebounce(inputValue, debounceMs)
    // Flag: just selected city, skip next fetch
    const justSelectedRef = useRef(false)
    // Flag: inputValue already initialized from field value
    const initializedRef = useRef(false)

    // Fetch city suggestions from provider
    const fetchSuggestions = useCallback(
      async (query: string) => {
        if (query.length < minChars || !provider) {
          setSuggestions([])
          return
        }

        setIsLoading(true)
        try {
          const results = await provider.getSuggestions(query, {
            count: 7,
            bounds: { from: 'city', to: 'settlement' },
          })
          setSuggestions(results)
          setIsOpen(results.length > 0)
        } catch (error) {
          console.error('Error loading city suggestions:', error)
          setSuggestions([])
        } finally {
          setIsLoading(false)
        }
      },
      [provider, minChars]
    )

    // Load on debounced query change
    useEffect(() => {
      if (justSelectedRef.current) {
        justSelectedRef.current = false
        return
      }

      if (debouncedQuery) {
        fetchSuggestions(debouncedQuery)
      } else {
        setSuggestions([])
        setIsOpen(false)
      }
    }, [debouncedQuery, fetchSuggestions])

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
      justSelectedRef,
      initializedRef,
    } as CityFieldState & { justSelectedRef: React.RefObject<boolean>; initializedRef: React.RefObject<boolean> }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, fieldState }): ReactElement => {
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
    } = fieldState
    const { justSelectedRef, initializedRef } = fieldState as CityFieldState & {
      justSelectedRef: React.RefObject<boolean>
      initializedRef: React.RefObject<boolean>
    }

    const fieldValue = field.state.value as string | undefined

    // Initialize input value from field (once, without useEffect)
    if (!initializedRef.current && fieldValue && fieldValue !== inputValue) {
      initializedRef.current = true
      setInputValue(fieldValue)
    }

    // Handler for city selection
    const handleSelect = (suggestion: AddressSuggestion) => {
      // Extract city name from provider data, fallback to suggestion value
      const cityName = (suggestion.data?.city as string) || (suggestion.data?.settlement as string) || suggestion.value
      justSelectedRef.current = true
      setInputValue(cityName)
      setIsOpen(false)
      setSuggestions([])
      field.handleChange(cityName)
    }

    // Keyboard navigation
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
              // If user erases text, update form value
              if (!e.target.value) {
                field.handleChange('')
              }
            }}
            onFocus={() => {
              if (suggestions.length > 0) {
                setIsOpen(true)
              }
            }}
            onBlur={() => {
              // If user typed without selecting from suggestions — save as is
              if (inputValue && inputValue !== (field.state.value as string)) {
                field.handleChange(inputValue)
              }
              field.handleBlur()
            }}
            onKeyDown={handleKeyDown}
            placeholder={resolved.placeholder ?? 'Enter city'}
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
              maxH="250px"
              overflowY="auto"
              mt={1}
              listStyle="none"
            >
              {suggestions.map((suggestion, index) => (
                <List.Item
                  key={`${suggestion.value}-${index}`}
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
