'use client'

import { type ReactElement, type ReactNode, useEffect } from 'react'
import { useAppForm } from '../../form-hook'
import type { FormOfflineConfig } from '../../offline'
import { DeclarativeFormContext } from '../form-context'
import { FormDebugValues } from '../form-debug-values'
import type { FormPersistenceConfig } from '../form-persistence'
import { HoneypotField, useHoneypotCheck } from '../security/honeypot'
import type { RateLimitConfig } from '../security/rate-limiter'
import { useRateLimit } from '../security/rate-limiter'
import type { DeclarativeFormContextValue, FormApiConfig, FormMiddleware, OnFieldChangeMap, ValidateOn } from '../types'
import { useFormApi } from '../use-form-api'
import { FormLoadingState } from './form-loading-state'
import { buildValidators } from './form-validators'
import { useFieldChangeListeners } from './use-field-change-listeners'
import { useFormFeatures } from './use-form-features'

/**
 * Props for FormWithApi component
 */
export interface FormWithApiProps<TData extends object> {
  /** API configuration (ZenStack) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api: FormApiConfig<TData, any>
  /** Initial values (fallback while data is loading) */
  initialValue?: TData
  /** Additional handler after successful submission */
  onSubmit?: (data: TData) => void | Promise<void>
  /** Zod schema for validation */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema?: any
  /** Persistence configuration (localStorage) */
  persistence?: FormPersistenceConfig
  /** Offline mode configuration */
  offline?: FormOfflineConfig
  /** Validation mode(s) */
  validateOn?: ValidateOn | ValidateOn[]
  /** Disable all form fields */
  disabled?: boolean
  /** Read-only mode for all fields */
  readOnly?: boolean
  /** JSON value inspector: true = dev only, 'force' = also in production */
  debug?: boolean | 'force'
  /** Middleware for form event handling */
  middleware?: FormMiddleware<TData>
  /** Address suggestion provider for Form.Field.Address and Form.Field.City */
  addressProvider?: import('../form-fields/specialized/providers').AddressProvider
  /** Реактивные побочные эффекты при изменении полей */
  onFieldChange?: OnFieldChangeMap
  /** Honeypot-ловушка для ботов */
  honeypot?: boolean
  /** Клиентский rate limiting */
  rateLimit?: RateLimitConfig
  /** Form content */
  children: ReactNode
}

/**
 * Form with ZenStack API integration.
 * Automatically loads data in edit mode,
 * uses create/update mutations for saving.
 *
 * @example
 * <FormWithApi
 *   api={{
 *     id: 'abc123', // empty = create, filled = edit
 *     query: { hook: useFindUniqueRecipe, include: { components: true } },
 *     mutations: { create: useCreateRecipe, update: useUpdateRecipe },
 *   }}
 *   schema={RecipeSchema}
 *   onSubmit={(data) => console.log('Saved:', data)}
 * >
 *   <Form.Field.String name="title" label="Title" />
 *   <Form.Button.Submit>Save</Form.Button.Submit>
 * </FormWithApi>
 */
export function FormWithApi<TData extends object>({
  api,
  initialValue,
  onSubmit,
  schema,
  persistence,
  offline,
  validateOn,
  disabled,
  readOnly,
  debug,
  middleware,
  addressProvider,
  onFieldChange,
  honeypot,
  rateLimit,
  children,
}: FormWithApiProps<TData>): ReactElement {
  // Honeypot — проверка бота при submit
  const { isBot } = useHoneypotCheck(honeypot)

  // Rate limiting — ограничение попыток submit
  const rateLimitState = useRateLimit(rateLimit)

  // Hook for API operations
  const formApi = useFormApi(api)

  // Use shared hook for persistence and offline
  const features = useFormFeatures<TData>({
    persistence,
    offline,
    onlineSubmit: async (value) => {
      // Call API mutation
      await formApi.submit(value)
      // Call user callback
      await onSubmit?.(value)
    },
  })

  // Determine initial values:
  // - Edit mode: use loaded data (or initialValue as fallback)
  // - Create mode: use initialValue (or empty object)
  const defaultValues = formApi.isEditMode
    ? (formApi.data ?? initialValue ?? ({} as TData))
    : (initialValue ?? ({} as TData))

  // Initialize form
  const form = useAppForm({
    defaultValues,
    validators: buildValidators(schema, validateOn),
    onSubmit: async ({ value, formApi: tanstackFormApi }) => {
      // Honeypot — блокировка ботов
      if (isBot()) return

      // Rate limiting — проверка лимита
      if (rateLimitState && !rateLimitState.recordAttempt()) return

      let dataToSubmit = value as TData

      // Apply beforeSubmit middleware
      if (middleware?.beforeSubmit) {
        const transformed = await middleware.beforeSubmit(dataToSubmit)
        if (transformed === undefined) {
          // Cancel submit
          return
        }
        dataToSubmit = transformed
      }

      try {
        await features.handleSubmit(dataToSubmit)

        // Call afterSuccess middleware
        if (middleware?.afterSuccess) {
          await middleware.afterSuccess(dataToSubmit)
        }

        // Reset form with current values to clear dirty state
        tanstackFormApi.reset(dataToSubmit)
      } catch (error) {
        // Call onError middleware
        if (middleware?.onError) {
          await middleware.onError(error instanceof Error ? error : new Error(String(error)))
        }
        throw error
      }
    },
  })

  // Подписка на изменения полей (onFieldChange)
  useFieldChangeListeners(form, onFieldChange)

  // Subscribe to changes for persistence
  useEffect(() => {
    return features.subscribeToFormChanges(form)
  }, [form, features])

  // Restore data from persistence
  useEffect(() => {
    if (
      !features.isPersistenceEnabled ||
      !features.persistenceResult.shouldRestore ||
      !features.persistenceResult.savedData
    ) {
      return
    }
    features.restoreFormData(form)
  }, [
    form,
    features,
    features.isPersistenceEnabled,
    features.persistenceResult.shouldRestore,
    features.persistenceResult.savedData,
  ])

  // Data loading flag (edit mode)
  const dataLoaded = formApi.isEditMode && formApi.data && !formApi.isLoading

  // Build context value
  const contextValue: DeclarativeFormContextValue = {
    form,
    schema,
    // Export API state for components that need it
    apiState: {
      isEditMode: formApi.isEditMode,
      isLoading: formApi.isLoading,
      isMutating: formApi.isMutating,
      error: formApi.error,
      mutationError: formApi.mutationError,
    },
    offlineState: features.offlineState,
    disabled,
    readOnly,
    addressProvider,
  }

  // Show loading state in edit mode
  if (formApi.isLoading) {
    return <FormLoadingState />
  }

  return (
    <DeclarativeFormContext.Provider value={contextValue} key={dataLoaded ? 'loaded' : 'initial'}>
      {/* Data restore dialog */}
      {features.isPersistenceEnabled && <features.persistenceResult.RestoreDialog />}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
      >
        {honeypot && <HoneypotField />}
        {rateLimitState?.isBlocked && (
          <div role="alert" style={{ color: 'var(--chakra-colors-fg-error, #e53e3e)', marginBottom: '1rem' }}>
            Too many attempts. Try again in {rateLimitState.secondsLeft}s.
          </div>
        )}
        {children}
        {debug && <FormDebugValues showInProduction={debug === 'force'} />}
      </form>
    </DeclarativeFormContext.Provider>
  )
}
