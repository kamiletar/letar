'use client'

import { type ReactElement, type ReactNode, useEffect, useMemo } from 'react'
import { useAppForm } from '../../form-hook'
import type { FormOfflineConfig } from '../../offline'
import { DeclarativeFormContext } from '../form-context'
import { FormDebugValues } from '../form-debug-values'
import type { FormPersistenceConfig } from '../form-persistence'
import { HoneypotField, useHoneypotCheck } from '../security/honeypot'
import type { RateLimitConfig } from '../security/rate-limiter'
import { useRateLimit } from '../security/rate-limiter'
import type { DeclarativeFormContextValue, FormMiddleware, OnFieldChangeMap, ValidateOn } from '../types'
import { buildValidators } from './form-validators'
import { useFieldChangeListeners } from './use-field-change-listeners'
import { useFormFeatures } from './use-form-features'

/**
 * Props for FormSimple component
 */
export interface FormSimpleProps<TData extends object> {
  /** Initial form values */
  initialValue: TData
  /** Form submit handler */
  onSubmit: (data: TData) => void | Promise<void>
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
 * Simple form without API integration.
 * Used when a form with local data is needed.
 *
 * @example
 * <FormSimple
 *   initialValue={{ name: '', email: '' }}
 *   onSubmit={handleSubmit}
 *   schema={UserSchema}
 * >
 *   <Form.Field.String name="name" label="Name" />
 *   <Form.Field.String name="email" label="Email" />
 *   <Form.Button.Submit>Save</Form.Button.Submit>
 * </FormSimple>
 */
export function FormSimple<TData extends object>({
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
}: FormSimpleProps<TData>): ReactElement {
  // Honeypot — проверка бота при submit
  const { isBot } = useHoneypotCheck(honeypot)

  // Rate limiting — ограничение попыток submit
  const rateLimitState = useRateLimit(rateLimit)

  // Use shared hook for persistence and offline
  const features = useFormFeatures<TData>({
    persistence,
    offline,
    onlineSubmit: async (value) => {
      await onSubmit(value)
    },
  })

  // Initialize form
  const form = useAppForm({
    defaultValues: initialValue,
    validators: buildValidators(schema, validateOn),
    onSubmit: async ({ value, formApi }) => {
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
        formApi.reset(dataToSubmit)
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

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<DeclarativeFormContextValue>(
    () => ({
      form,
      schema,
      offlineState: features.offlineState,
      disabled,
      readOnly,
      addressProvider,
    }),
    [form, schema, features.offlineState, disabled, readOnly, addressProvider]
  )

  return (
    <DeclarativeFormContext.Provider value={contextValue}>
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
