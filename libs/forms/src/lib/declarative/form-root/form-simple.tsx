'use client'

import { applyServerErrors, mapServerErrors } from '@letar/forms-core/server-errors'
import {
  useCreateDependentsRegistry,
  useCreatePendingRegistry,
  useFormPendingSubmit,
  warnSubmitBypassingPending,
} from '@letar/forms-react'
import { type ReactElement, type ReactNode, useEffect, useMemo, useRef } from 'react'
import { useAppForm } from '../../form-hook'
import { type FormOfflineConfig, OfflineSensitiveFieldsError } from '../../offline'
import { type DirtyGuardOptions, DirtyGuardScope } from '../dirty-guard'
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
import { usePostSubmitResetGuard } from './use-post-submit-reset-guard'
import { useServerErrorRetrySubmit } from './use-server-error-retry-submit'

/**
 * Props for FormSimple component
 */
export interface FormSimpleProps<TData extends object> {
  /** Initial form values */
  initialValue: TData
  /**
   * Form submit handler.
   * Optional — when omitted the form works as a state container (filters, settings panels).
   */
  onSubmit?: (data: TData) => void | Promise<void>
  /**
   * Ref for accessing the form instance from outside the <Form> tree.
   * Use with useFormRef() to call reset(), setFieldValue(), read state.isDirty, etc.
   */
  formRef?: import('react').RefObject<import('../types').AppFormApi | null>
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
  /** Автоматическая защита от потери данных (см. `FormPropsWithApi.dirtyGuard`), уже слитая с опцией `createForm` */
  dirtyGuard?: DirtyGuardOptions | null
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
  formRef,
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
  dirtyGuard,
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
      if (onSubmit) {
        await onSubmit(value)
      }
    },
  })

  // Реестр неподтверждённых оптимистичных действий полей (§16.7): отправка ждёт его пустоты
  const pendingRegistry = useCreatePendingRegistry()

  // Реестр зависимых полей (`dependsOn`, §18): очищает зависимое поле по правке родителя
  const dependents = useCreateDependentsRegistry()

  const serverSubmitError = useRef<unknown>(undefined)

  // Initialize form
  const form = useAppForm({
    defaultValues: initialValue,
    validators: buildValidators(schema, validateOn),
    // Form-level листенер зовётся на правку поля (`handleChange`/`setFieldValue`), но не на `reset`/`update()` —
    // гидратация зависимые поля не очищает (§18.3)
    listeners: {
      onChange: ({ fieldApi }) => dependents.handleFieldChange(fieldApi.name, fieldApi.state.value),
    },
    onSubmit: async ({ value }) => {
      warnSubmitBypassingPending(pendingRegistry)

      // Honeypot — блокировка ботов
      if (isBot()) {
        return
      }

      // Rate limiting — проверка лимита
      if (rateLimitState && !rateLimitState.recordAttempt()) {
        return
      }

      let dataToSubmit = value as TData

      try {
        // Преобразование данных тоже может завершиться ошибкой, которую нужно показать.
        if (middleware?.beforeSubmit) {
          const transformed = await middleware.beforeSubmit(dataToSubmit)
          if (transformed === undefined) {
            return
          }
          dataToSubmit = transformed
        }

        await features.handleSubmit(dataToSubmit)

        // Call afterSuccess middleware
        if (middleware?.afterSuccess) {
          await middleware.afterSuccess(dataToSubmit)
        }

        // Reset form with current values to clear dirty state
        commitPostSubmitReset(dataToSubmit)
      } catch (error) {
        // `useFormServerAction` мог уже применить свой fieldMap: сохраняем его сообщения.
        const hasServerErrors = form.state.errors.length > 0 || Object.keys(form.state.fieldMeta).some(
          (name) => !!form.getFieldMeta(name)?.errorMap.onServer,
        )
        if (!hasServerErrors) {
          applyServerErrors({
            setFieldMeta: (name, updater) => {
              form.setFieldMeta(name, (meta) => ({ ...meta, ...updater(meta) }))
            },
            // TanStack нормализует global error в строку, сохраняя типы схемных валидаторов.
            setErrorMap: ({ onSubmit }) => form.setErrorMap({ onSubmit: { form: onSubmit, fields: {} } }),
          }, mapServerErrors(error))
        }
        // Call onError middleware
        if (middleware?.onError) {
          await middleware.onError(error instanceof Error ? error : new Error(String(error)))
        }
        serverSubmitError.current = form.state.errorMap.onSubmit
        // Отказ от офлайн-очереди (чувствительные поля) уже доложен через `onError`/`offline.onSyncError`:
        // форма не сбрасывается и не считается отправленной, но это не сбой — не бросаем дальше
        if (error instanceof OfflineSensitiveFieldsError) {
          return
        }
        throw error
      }
    },
  })

  const pendingSubmit = useFormPendingSubmit(pendingRegistry, form)
  const submit = useServerErrorRetrySubmit(form, pendingSubmit, serverSubmitError)

  // Защита от отката поля к устаревшему initialValue после post-submit reset() —
  // см. use-post-submit-reset-guard.ts
  const { commitPostSubmitReset } = usePostSubmitResetGuard<TData>(form)

  // Подписка на изменения полей (onFieldChange)
  useFieldChangeListeners(form, onFieldChange)

  // Передаём инстанс формы во внешний ref (useFormRef)
  useEffect(() => {
    if (formRef) {
      formRef.current = form
    }
  }, [form, formRef])

  // Subscribe to changes for persistence
  useEffect(() => {
    return features.subscribeToFormChanges(form)
  }, [form, features])

  // Restore data from persistence
  useEffect(() => {
    if (
      !features.isPersistenceEnabled
      || !features.persistenceResult.shouldRestore
      || !features.persistenceResult.savedData
    ) {
      return
    }
    // Восстановление черновика пишет значения по одному: без подавления запись родителя очистила бы уже
    // восстановленного ребёнка, если он идёт в порядке ключей раньше
    dependents.suppress(() => features.restoreFormData(form))
  }, [
    form,
    features,
    dependents,
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
      pending: pendingRegistry,
      dependents,
      submit,
    }),
    [form, schema, features.offlineState, disabled, readOnly, addressProvider, pendingRegistry, dependents, submit],
  )

  return (
    <DeclarativeFormContext.Provider value={contextValue}>
      {/* Data restore dialog */}
      {features.isPersistenceEnabled && <features.persistenceResult.RestoreDialog />}
      <form
        method="post"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          // Отказ уже отображён в состоянии формы; DOM-событие не умеет ожидать Promise.
          void submit().catch(() => {})
        }}
      >
        {honeypot && <HoneypotField />}
        {rateLimitState?.isBlocked && (
          <div role="alert" style={{ color: 'var(--chakra-colors-fg-error, #e53e3e)', marginBottom: '1rem' }}>
            Too many attempts. Try again in {rateLimitState.secondsLeft}s.
          </div>
        )}
        <DirtyGuardScope config={dirtyGuard ?? null}>{children}</DirtyGuardScope>
        {debug && <FormDebugValues showInProduction={debug === 'force'} />}
      </form>
    </DeclarativeFormContext.Provider>
  )
}
