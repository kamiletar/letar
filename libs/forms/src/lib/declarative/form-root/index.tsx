'use client'

import type { ReactElement } from 'react'
import type { FormPropsWithApi } from '../types'
import type { FormComponent } from './form-compound-types'
import { FormSimple } from './form-simple'
import { FormWithApi } from './form-with-api'

// Re-export types for external use
export type {
  FormButtonComponents,
  FormComponent,
  FormFieldComponents,
  FormGroupComponent,
  FormGroupListComponent,
  FormStepsComponent,
  ListButtonComponents,
} from './form-compound-types'

// Re-export subcomponents
export { FormLoadingState } from './form-loading-state'
export { FormSimple, type FormSimpleProps } from './form-simple'
export { buildValidators } from './form-validators'
export { FormWithApi, type FormWithApiProps } from './form-with-api'
export { useFieldChangeListeners } from './use-field-change-listeners'
export { useFormFeatures, type UseFormFeaturesConfig, type UseFormFeaturesResult } from './use-form-features'

/**
 * Root component for declarative forms.
 *
 * Supports two modes:
 * 1. **Simple mode** — provide initialValue and onSubmit
 * 2. **API mode** — provide api for automatic ZenStack integration
 *
 * @example Simple mode
 * ```tsx
 * <Form initialValue={{ title: '', count: 0 }} onSubmit={handleSubmit}>
 *   <Form.Field.String name="title" label="Title" />
 *   <Form.Button.Submit>Save</Form.Button.Submit>
 * </Form>
 * ```
 *
 * @example API mode (ZenStack)
 * ```tsx
 * <Form
 *   api={{
 *     id: 'abc123', // empty = create, filled = edit
 *     query: { hook: useFindUniqueRecipe, include: { components: true } },
 *     mutations: { create: useCreateRecipe, update: useUpdateRecipe },
 *   }}
 *   schema={RecipeSchema}
 *   onSubmit={(data) => console.log('Saved:', data)}
 * >
 *   <Form.Field.String name="title" />
 *   <Form.Button.Submit />
 * </Form>
 * ```
 */
function FormRoot<TData extends object>({
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
}: FormPropsWithApi<TData>): ReactElement {
  // If api is provided — use FormWithApi, otherwise — simple form
  if (api) {
    return (
      <FormWithApi
        api={api}
        initialValue={initialValue}
        onSubmit={onSubmit}
        schema={schema}
        persistence={persistence}
        offline={offline}
        validateOn={validateOn}
        disabled={disabled}
        readOnly={readOnly}
        debug={debug}
        middleware={middleware}
        addressProvider={addressProvider}
        onFieldChange={onFieldChange}
        honeypot={honeypot}
        rateLimit={rateLimit}
      >
        {children}
      </FormWithApi>
    )
  }

  // Simple mode — initialValue is required
  if (!initialValue) {
    throw new Error('Form requires either api prop or initialValue prop')
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const noopSubmit = () => {}

  return (
    <FormSimple
      initialValue={initialValue}
      onSubmit={onSubmit ?? noopSubmit}
      schema={schema}
      persistence={persistence}
      offline={offline}
      validateOn={validateOn}
      disabled={disabled}
      readOnly={readOnly}
      debug={debug}
      middleware={middleware}
      addressProvider={addressProvider}
      onFieldChange={onFieldChange}
      honeypot={honeypot}
      rateLimit={rateLimit}
    >
      {children}
    </FormSimple>
  )
}

/**
 * Form as compound component.
 * Subcomponents (Field, Group, Button, Steps, etc.) are added in declarative/index.ts
 */
export const Form = FormRoot as unknown as FormComponent
