'use client'

import type { AddressProvider } from '@letar/forms-core/address'
import type { $ZodType } from 'zod/v4/core'

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
  addressProvider?: AddressProvider
}
