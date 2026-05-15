'use client'

import { HStack, VStack } from '@chakra-ui/react'
import type { ReactElement, ReactNode } from 'react'
import type { FormOfflineConfig } from '../offline'
import { FormAutoFields } from './form-auto-fields'
import { ButtonReset } from './form-buttons/button-reset'
import { ButtonSubmit } from './form-buttons/button-submit'
import type { FormPersistenceConfig } from './form-persistence'
import { FormSimple } from './form-root'
import type { FormMiddleware, ValidateOn } from './types'

/**
 * Props for Form.FromSchema
 */
export interface FormFromSchemaProps<TData extends object> {
  /**
   * Zod schema (required)
   * Used for validation and auto-generation of fields
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any
  /**
   * Initial values form
   */
  initialValue: TData
  /**
   * Submit handler form
   */
  onSubmit: (data: TData) => void | Promise<void>
  /**
   * Submit button text
   * @default 'Save'
   */
  submitLabel?: ReactNode
  /**
   * Show reset button
   * @default false
   */
  showReset?: boolean
  /**
   * Reset button text
   * @default 'Reset'
   */
  resetLabel?: ReactNode
  /**
   * Exclude fields from auto-generation
   * @example exclude={['id', 'createdAt', 'updatedAt']}
   */
  exclude?: string[]
  /**
   * Validation mode
   */
  validateOn?: ValidateOn | ValidateOn[]
  /**
   * Middleware for processing form events
   */
  middleware?: FormMiddleware<TData>
  /**
   * Globally disable all fields
   */
  disabled?: boolean
  /**
   * Global read-only mode
   */
  readOnly?: boolean
  /**
   * localStorage persistence configuration
   */
  persistence?: FormPersistenceConfig
  /**
   * Offline mode configuration
   */
  offline?: FormOfflineConfig
  /**
   * JSON value inspector: true = dev only, 'force' = also in production
   */
  debug?: boolean | 'force'
  /**
   * Additional content before buttons
   */
  beforeButtons?: ReactNode
  /**
   * Additional content after buttons
   */
  afterButtons?: ReactNode
  /**
   * Gap between fields
   * @default 4
   */
  gap?: number
}

/**
 * Form.FromSchema — fully automatic form generation from Zod schema
 *
 * Creates a form with automatically generated fields based on
 * Zod schema types and metadata.
 *
 * @example Basic usage
 * ```tsx
 * const UserSchema = z.object({
 *   firstName: z.string().meta({ ui: { title: 'Name' } }),
 *   lastName: z.string().meta({ ui: { title: 'Last Name' } }),
 *   email: z.string().email().meta({ ui: { title: 'Email' } }),
 *   bio: z.string().meta({ ui: { title: 'About', fieldType: 'textarea' } }),
 * })
 *
 * <Form.FromSchema
 *   schema={UserSchema}
 *   initialValue={{ firstName: '', lastName: '', email: '', bio: '' }}
 *   onSubmit={saveUser}
 *   submitLabel="Create User"
 * />
 * ```
 *
 * @example With field exclusion and reset button
 * ```tsx
 * <Form.FromSchema
 *   schema={UserSchema}
 *   initialValue={userData}
 *   onSubmit={updateUser}
 *   exclude={['id', 'createdAt']}
 *   showReset
 *   submitLabel="Update"
 *   resetLabel="Undo changes"
 * />
 * ```
 *
 * @example With middleware and validation
 * ```tsx
 * <Form.FromSchema
 *   schema={UserSchema}
 *   initialValue={data}
 *   onSubmit={save}
 *   validateOn="blur"
 *   middleware={{
 *     afterSuccess: () => toaster.success({ title: 'Saved!' }),
 *     onError: (e) => toaster.error({ title: e.message }),
 *   }}
 * />
 * ```
 */
export function FormFromSchema<TData extends object>({
  schema,
  initialValue,
  onSubmit,
  submitLabel = 'Save',
  showReset = false,
  resetLabel = 'Reset',
  exclude,
  validateOn,
  middleware,
  disabled,
  readOnly,
  debug,
  persistence,
  offline,
  beforeButtons,
  afterButtons,
  gap = 4,
}: FormFromSchemaProps<TData>): ReactElement {
  return (
    <FormSimple
      schema={schema}
      initialValue={initialValue}
      onSubmit={onSubmit}
      validateOn={validateOn}
      middleware={middleware}
      disabled={disabled}
      readOnly={readOnly}
      debug={debug}
      persistence={persistence}
      offline={offline}
    >
      <VStack align="stretch" gap={gap}>
        {/* Automatically generated fields */}
        <FormAutoFields exclude={exclude} />

        {/* Additional content before buttons */}
        {beforeButtons}

        {/* Buttons */}
        <HStack justify="flex-end" gap={2}>
          {showReset && <ButtonReset variant="outline">{resetLabel}</ButtonReset>}
          <ButtonSubmit>{submitLabel}</ButtonSubmit>
        </HStack>

        {/* Additional content after buttons */}
        {afterButtons}
      </VStack>
    </FormSimple>
  )
}

FormFromSchema.displayName = 'FormFromSchema'
