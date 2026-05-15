'use client'

import type { ReactNode } from 'react'
import type { $ZodType } from 'zod/v4/core'
import type { FormOfflineConfig } from '../../offline'
import type { FormPersistenceConfig } from '../form-persistence'
import type { RateLimitConfig } from '../security'

/**
 * Form API type returned by useAppForm
 * Contains Field, Subscribe and other components
 *
 * Note: Uses any because createFormHook adds
 * additional methods (Field, Subscribe, etc.) that are not part of
 * the base FormApi type from @tanstack/react-form
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppFormApi = any

/**
 * Base Zod schema type (Zod v4)
 */
export type ZodSchema = $ZodType

/**
 * Form validation modes
 */
export type ValidateOn = 'change' | 'blur' | 'submit' | 'mount'

/**
 * API доступное в onFieldChange callback.
 * Позволяет реактивно менять значения других полей при изменении текущего.
 */
export interface FieldChangeApi {
  /** Установить значение поля */
  setFieldValue: (name: string, value: unknown) => void
  /** Получить значение поля */
  getFieldValue: (name: string) => unknown
  /** Получить все текущие значения формы */
  getValues: () => Record<string, unknown>
}

/**
 * Маппинг поле → callback при изменении значения.
 *
 * @example
 * ```tsx
 * <Form
 *   onFieldChange={{
 *     name: (value, { setFieldValue }) => {
 *       setFieldValue('slug', transliterate(String(value)))
 *     },
 *   }}
 * >
 * ```
 */
export type OnFieldChangeMap = Record<string, (value: unknown, api: FieldChangeApi) => void>

/**
 * Middleware for processing form events
 *
 * @example
 * ```tsx
 * <Form
 *   middleware={{
 *     beforeSubmit: (data) => ({ ...data, timestamp: Date.now() }),
 *     afterSuccess: (data) => toaster.success({ title: 'Saved!' }),
 *     onError: (error) => toaster.error({ title: error.message }),
 *   }}
 * >
 * ```
 */
export interface FormMiddleware<TData = unknown> {
  /**
   * Called before form submission.
   * Can transform data or return undefined to cancel submit.
   */
  beforeSubmit?: (data: TData) => TData | undefined | Promise<TData | undefined>
  /**
   * Called after successful submission.
   */
  afterSuccess?: (data: TData) => void | Promise<void>
  /**
   * Called on submission error.
   */
  onError?: (error: Error) => void | Promise<void>
}

/**
 * API state available in form context
 */
export interface FormApiState {
  /** Form is in edit mode (has id) */
  isEditMode: boolean
  /** Data is loading */
  isLoading: boolean
  /** Mutation is in progress */
  isMutating: boolean
  /** Query error (TanStack Query error) */
  error: Error | null
  /** Mutation error (create/update) */
  mutationError: Error | null
}

/**
 * Offline state available in form context
 */
export interface FormOfflineState {
  /** Form is in offline mode */
  isOffline: boolean
  /** Number of pending actions in sync queue */
  pendingCount: number
  /** Sync queue is being processed */
  isProcessing: boolean
  /** Clear persistence data (called after successful sync) */
  clearPersistence?: () => void
}

/**
 * Declarative form context value
 */
export interface DeclarativeFormContextValue {
  form: AppFormApi
  /** Zod schema for extracting field metadata */
  schema?: ZodSchema
  /** Index for primitive arrays (tags: string[]) */
  primitiveArrayIndex?: number
  /** API state (only when using api prop) */
  apiState?: FormApiState
  /** Offline state (only when using offline prop) */
  offlineState?: FormOfflineState
  /** Globally disable all form fields */
  disabled?: boolean
  /** Global read-only mode for all fields */
  readOnly?: boolean
  /** Address suggestion provider (set via createForm or Form props) */
  addressProvider?: import('../form-fields/specialized/providers').AddressProvider
}

/**
 * Props for root Form component
 */
export interface FormProps<TData extends object> {
  /** Initial form values */
  initialValue: TData
  /** Callback on form submission */
  onSubmit: (data: TData) => void | Promise<void>
  /** Optional Zod schema for validation */
  schema?: ZodSchema
  /** Form content (Field, Group components) */
  children: ReactNode
}

/**
 * Extended FormProps with optional API integration
 */
export interface FormPropsWithApi<TData extends object> {
  /** API configuration for automatic data loading and mutations */
  api?: FormApiConfig<TData>
  /** Initial form values (required without api, optional with api) */
  initialValue?: TData
  /** Callback on form submission (called after mutation if api is provided) */
  onSubmit?: (data: TData) => void | Promise<void>
  /** Optional Zod schema for validation */
  schema?: ZodSchema
  /**
   * Enable localStorage persistence for form data.
   * Shows a restore dialog for saved data on form load.
   */
  persistence?: FormPersistenceConfig
  /**
   * Enable offline support with automatic sync queue.
   * In offline mode, form data is saved to IndexedDB and synced when connection is restored.
   */
  offline?: FormOfflineConfig
  /**
   * Form validation mode.
   * - 'change' -- validate on every change (default)
   * - 'blur' -- validate on blur
   * - 'submit' -- validate only on submit
   * - 'mount' -- validate on mount
   * Can pass an array to combine modes: ['blur', 'submit']
   */
  validateOn?: ValidateOn | ValidateOn[]
  /**
   * Globally disable all form fields.
   * Useful for loading state or when editing is not allowed.
   */
  disabled?: boolean
  /**
   * Global read-only mode.
   * All fields will be in view mode without ability to edit.
   */
  readOnly?: boolean
  /**
   * Middleware for processing form events.
   * Allows transforming data before submission and reacting to success/error.
   */
  middleware?: FormMiddleware<TData>
  /**
   * Show JSON value inspector (Form.DebugValues).
   * - `true` -- dev only (hidden in production)
   * - `'force'` -- visible in production too
   */
  debug?: boolean | 'force'
  /**
   * Address suggestion provider for Form.Field.Address and Form.Field.City.
   * Can also be set globally via createForm({ addressProvider }).
   */
  addressProvider?: import('../form-fields/specialized/providers').AddressProvider
  /**
   * Реактивные побочные эффекты при изменении полей.
   * Ключ — имя поля, значение — callback с новым значением и form API.
   */
  onFieldChange?: OnFieldChangeMap
  /**
   * Включить honeypot-ловушку для ботов.
   * Рендерит скрытое поле — если бот его заполнит, submit будет заблокирован.
   */
  honeypot?: boolean
  /**
   * Клиентский rate limiting для защиты от спама.
   * Ограничивает количество submit за указанное окно времени.
   *
   * @example { maxSubmits: 3, windowMs: 60000 } // 3 попытки в минуту
   */
  rateLimit?: RateLimitConfig
  /** Form content */
  children: ReactNode
}

// ============================================================================
// API types (ZenStack integration)
// ============================================================================

/**
 * Generic type for ZenStack query hook (useFindUnique*)
 * Returns UseQueryResult with data of type TData
 *
 * Note: args is typed as any for compatibility with different ORMs
 * (Prisma, ZenStack), which generate different types for include
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UseQueryHook<TData = any, TInclude = any> = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: { where: { id: string }; include?: TInclude } | any,
  options?: { enabled?: boolean }
) => {
  data: TData | undefined
  isLoading: boolean
  error: Error | null
  isFetching?: boolean
  isSuccess?: boolean
  status?: string
  fetchStatus?: string
}

/**
 * Generic type for ZenStack create mutation hook (useCreate*)
 * Uses any for compatibility with different ORMs (Prisma, ZenStack)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UseCreateHook<TData = any> = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mutate: (args: { data: any }) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mutateAsync: (args: { data: any }) => Promise<TData | undefined>
  isPending: boolean
  error: Error | null
}

/**
 * Generic type for ZenStack update mutation hook (useUpdate*)
 * Uses any for compatibility with different ORMs (Prisma, ZenStack)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UseUpdateHook<TData = any> = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mutate: (args: { where: { id: string }; data: any }) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mutateAsync: (args: { where: { id: string }; data: any }) => Promise<TData | undefined>
  isPending: boolean
  error: Error | null
}

/**
 * API configuration for Form component
 * Includes automatic data loading and mutations via ZenStack hooks
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface FormApiConfig<TData = any, TInclude = any, TMutationData = any> {
  /** Record ID. Empty/undefined = create mode, filled = edit mode */
  id?: string
  /** Query configuration for loading existing data */
  query: {
    /** ZenStack useFindUnique* hook */
    hook: UseQueryHook<TData, TInclude>
    /** Prisma include object for relations */
    include?: TInclude
  }
  /** Mutation hooks for creating/updating */
  mutations: {
    /** ZenStack useCreate* hook */
    create: UseCreateHook<TData>
    /** ZenStack useUpdate* hook */
    update: UseUpdateHook<TData>
  }
  /**
   * Transform form data before sending to API.
   * Use for converting flat form data to Prisma-compatible format.
   */
  transformData?: (values: TData, mode: 'create' | 'update') => TMutationData
}

/**
 * Result of useFormApi hook
 */
export interface FormApiResult<TData> {
  /** Form is in edit mode (has id) */
  isEditMode: boolean
  /** Data is loading */
  isLoading: boolean
  /** Mutation is in progress */
  isMutating: boolean
  /** Loaded data (undefined in create mode or while loading) */
  data: TData | undefined
  /** Query error */
  error: Error | null
  /** Mutation error (create/update) */
  mutationError: Error | null
  /** Submit handler that calls the appropriate mutation */
  submit: (values: TData) => Promise<void>
}
