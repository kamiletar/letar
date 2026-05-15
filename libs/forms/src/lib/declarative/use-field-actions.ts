'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { useFormGroup } from '../form-group'
import { useDeclarativeForm } from './form-context'

// Stable fallback for fieldMeta — prevents infinite loop in useSyncExternalStore.
// If creating a new object in getSnapshot each time, Object.is comparison returns false,
// and React will infinitely re-render the component.
const EMPTY_FIELD_META = Object.freeze({ errors: [], isTouched: false })

/**
 * Result type for useFieldActions hook
 */
export interface FieldActionsResult<TValue = unknown> {
  /** Current field value */
  value: TValue
  /** Set field value */
  onChange: (value: TValue) => void
  /** Set field error */
  setError: (error: string) => void
  /** Clear field error */
  clearError: () => void
  /** Trigger field validation */
  validate: () => Promise<void>
  /** Whether field is touched */
  isTouched: boolean
  /** Whether field has errors */
  hasError: boolean
  /** Current field errors (array) */
  errors: string[]
}

/**
 * Hook for imperative field actions.
 *
 * Useful for custom field actions like geolocation detection,
 * async value fetching, or programmatic field manipulation.
 *
 * @param fieldName - Field name (relative to current group context)
 * @returns Field actions object with value, onChange, setError, etc.
 *
 * @example Basic usage with geolocation
 * ```tsx
 * function CityField() {
 *   const { value, onChange, setError } = useFieldActions('city')
 *
 *   const handleDetect = async () => {
 *     const result = await detectLocation()
 *     if (result.error) {
 *       setError(result.error)
 *     } else {
 *       onChange(result.city)
 *     }
 *   }
 *
 *   return (
 *     <HStack>
 *       <Form.Field.String name="city" label="City" />
 *       <Button onClick={handleDetect}>
 *         <LuMapPin />
 *       </Button>
 *     </HStack>
 *   )
 * }
 * ```
 *
 * @example Async value fetching
 * ```tsx
 * function CompanyField() {
 *   const { onChange, setError } = useFieldActions('company')
 *   const [isLoading, setIsLoading] = useState(false)
 *
 *   const handleLookup = async (inn: string) => {
 *     setIsLoading(true)
 *     try {
 *       const company = await lookupByInn(inn)
 *       onChange(company.name)
 *     } catch (e) {
 *       setError('Company not found')
 *     } finally {
 *       setIsLoading(false)
 *     }
 *   }
 *
 *   return <Button onClick={() => handleLookup('1234567890')} loading={isLoading}>Lookup</Button>
 * }
 * ```
 */
export function useFieldActions<TValue = unknown>(fieldName: string): FieldActionsResult<TValue> {
  const { form } = useDeclarativeForm()
  const parentGroup = useFormGroup()

  // Build full field path
  const fullPath = parentGroup ? `${parentGroup.name}.${fieldName}` : fieldName

  // Get nested value from form state
  const getNestedValue = useCallback(
    (values: Record<string, unknown>): TValue => {
      const parts = fullPath.split('.')
      let result: unknown = values
      for (const part of parts) {
        if (result && typeof result === 'object') {
          result = (result as Record<string, unknown>)[part]
        } else {
          return undefined as TValue
        }
      }
      return result as TValue
    },
    [fullPath]
  )

  // Подписка на store — выносим useCallback ДО useSyncExternalStore
  // (React 19 запрещает вызов хуков inside аргументов других хуков)
  // TanStack Store v0.9+ returns { unsubscribe }, а не функцию
  const subscribe = useCallback(
    (callback: () => void) => {
      const subscription = form.store.subscribe(callback)
      if (typeof subscription === 'function') {
        return subscription
      }
      return () => subscription.unsubscribe()
    },
    [form]
  )

  const getValueSnapshot = useCallback(
    () => getNestedValue(form.state.values as Record<string, unknown>),
    [form, getNestedValue]
  )

  const getMetaSnapshot = useCallback(() => {
    const meta = form.store.state.fieldMeta[fullPath]
    return meta || EMPTY_FIELD_META
  }, [form, fullPath])

  // Subscribe to field value changes
  const value = useSyncExternalStore(subscribe, getValueSnapshot, getValueSnapshot)

  // Get field meta (errors, touched, etc.)
  const fieldMeta = useSyncExternalStore(subscribe, getMetaSnapshot, getMetaSnapshot)

  // Set field value
  const onChange = useCallback(
    (newValue: TValue) => {
      form.setFieldValue(fullPath, newValue)
    },
    [form, fullPath]
  )

  // Set field error
  const setError = useCallback(
    (error: string) => {
      form.setFieldMeta(fullPath, (prev: Record<string, unknown>) => ({
        ...prev,
        errors: [error],
      }))
    },
    [form, fullPath]
  )

  // Clear field error
  const clearError = useCallback(() => {
    form.setFieldMeta(fullPath, (prev: Record<string, unknown>) => ({
      ...prev,
      errors: [],
    }))
  }, [form, fullPath])

  // Trigger field validation
  const validate = useCallback(async () => {
    await form.validateField(fullPath, 'change')
  }, [form, fullPath])

  const errors = (fieldMeta.errors as string[]) || []

  return {
    value,
    onChange,
    setError,
    clearError,
    validate,
    isTouched: Boolean(fieldMeta.isTouched),
    hasError: errors.length > 0,
    errors,
  }
}
