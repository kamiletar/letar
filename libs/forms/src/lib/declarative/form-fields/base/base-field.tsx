'use client'

import { useFormGroup } from '../../../form-group'
import { useDeclarativeForm } from '../../form-context'
import { getZodConstraints, type ZodConstraints } from '../../schema-constraints'
import { getFieldMeta } from '../../schema-meta'
import type { FieldUIMeta } from '../../types'

/**
 * Hook to get full field path, form instance, UI meta, required status, and constraints for declarative fields
 *
 * Handles both regular fields and primitive array fields (without name)
 */
export function useDeclarativeField(name?: string): {
  form: ReturnType<typeof useDeclarativeForm>['form']
  fullPath: string
  name: string
  meta: FieldUIMeta | undefined
  /** Whether field is required (from Zod schema - not optional/nullable) */
  required: boolean
  /** Global disabled state from Form */
  formDisabled: boolean
  /** Global readOnly state from Form */
  formReadOnly: boolean
  /** Automatic constraints from Zod schema (min, max, minLength, maxLength etc.) */
  constraints: ZodConstraints
} {
  const { form, schema, primitiveArrayIndex, disabled, readOnly } = useDeclarativeForm()
  const parentGroup = useFormGroup()

  // Build full path
  let fullPath: string

  if (name) {
    // Regular field with name
    fullPath = parentGroup ? `${parentGroup.name}.${name}` : name
  } else if (parentGroup) {
    // Primitive array: FormGroup already includes the index in path (e.g., "tags.0")
    fullPath = parentGroup.name
  } else {
    throw new Error('Field must have a name prop or be inside Form.Group.List for primitive arrays')
  }

  // Extract UI metadata and required status from schema
  const schemaInfo = getFieldMeta(schema, fullPath)

  // Extract constraints from schema (min, max, minLength, maxLength, etc.)
  const constraints = getZodConstraints(schema, fullPath)

  return {
    form,
    fullPath,
    name: name ?? String(primitiveArrayIndex),
    meta: schemaInfo.ui,
    required: schemaInfo.required,
    formDisabled: disabled ?? false,
    formReadOnly: readOnly ?? false,
    constraints,
  }
}
