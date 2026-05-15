'use client'

import { createFormHook, type FieldApi, type FormApi } from '@tanstack/react-form'
import { fieldContext, formContext } from './context'

/**
 * Base field components for forms
 * Can be extended in individual applications
 */
const fieldComponents = {}

/**
 * Base form components
 * Can be extended in individual applications
 */
const formComponents = {}

/**
 * Creates a form hook for a specific application
 *
 * useAppForm provides a preconfigured form hook with:
 * - Pre-configured field and form contexts
 * - Access to form.AppField and form.AppForm for custom components
 *
 * @example
 * ```tsx
 * import { useAppForm } from '@letar/forms'
 *
 * function MyForm() {
 *   const form = useAppForm({
 *     defaultValues: {
 *       email: '',
 *       name: '',
 *     },
 *     onSubmit: async ({ value }) => {
 *       await submitToServer(value)
 *     },
 *   })
 *
 *   return (
 *     <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
 *       <form.Field
 *         name="email"
 *         children={(field) => (
 *           <input
 *             value={field.state.value}
 *             onChange={(e) => field.handleChange(e.target.value)}
 *           />
 *         )}
 *       />
 *       <button type="submit">Submit</button>
 *     </form>
 *   )
 * }
 * ```
 */
export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents,
  formComponents,
})

// Re-export types for convenience
export type { FieldApi, FormApi }
