'use client'

import type { ReactNode } from 'react'
import { getLocalizedValue, useFormI18n, useLocalizedOptions } from '../../../i18n'
import { generateConstraintHint } from '../../constraint-hints'
import type { ZodConstraints } from '../../schema-constraints'
import type { BaseFieldProps, FieldOptionMeta, FieldTooltipMeta } from '../../types'
import { resolveAutoComplete } from './autocomplete-map'
import { useDeclarativeField } from './base-field'

/**
 * Resolves all field props considering schema and form-level settings
 *
 * Priority:
 * 1. Component props (highest)
 * 2. Zod schema meta (ui: { title, placeholder, description, tooltip })
 * 3. Automatically generated hint from constraints (if helperText not set)
 * 4. Form-level settings (disabled, readOnly)
 *
 * @example
 * ```tsx
 * function FieldString({ name, label, placeholder, helperText, required, disabled, readOnly, tooltip }: StringFieldProps) {
 *   const {
 *     form, fullPath,
 *     label: resolvedLabel,
 *     placeholder: resolvedPlaceholder,
 *     helperText: resolvedHelperText,
 *     required: resolvedRequired,
 *     disabled: resolvedDisabled,
 *     readOnly: resolvedReadOnly,
 *     tooltip: resolvedTooltip,
 *     constraints,
 *   } = useResolvedFieldProps(name, { label, placeholder, helperText, required, disabled, readOnly, tooltip })
 *   // ...
 * }
 * ```
 */
export function useResolvedFieldProps(
  name: string | undefined,
  props: BaseFieldProps
): {
  form: ReturnType<typeof useDeclarativeField>['form']
  fullPath: string
  label: ReactNode
  placeholder: string | undefined
  helperText: ReactNode
  tooltip: FieldTooltipMeta | undefined
  required: boolean | undefined
  disabled: boolean | undefined
  readOnly: boolean | undefined
  /** Automatic constraints from Zod schema (min, max, minLength, maxLength etc.) */
  constraints: ZodConstraints
  /** Options for select fields (from meta.options with i18n translations) */
  options: FieldOptionMeta[] | undefined
  /** HTML autocomplete атрибут (авто-определение по имени поля + meta override) */
  autocomplete: string | undefined
} {
  const {
    form,
    fullPath,
    meta,
    required: schemaRequired,
    formDisabled,
    formReadOnly,
    constraints,
  } = useDeclarativeField(name)

  // Get i18n context (can be null)
  const i18n = useFormI18n()
  const i18nKey = meta?.i18nKey

  // Resolve translated values
  // Priority: props > i18n translation > meta fallback
  const resolvedTitle = getLocalizedValue(i18n, i18nKey, 'title', meta?.title)
  const resolvedPlaceholder = getLocalizedValue(i18n, i18nKey, 'placeholder', meta?.placeholder)
  const resolvedDescription = getLocalizedValue(i18n, i18nKey, 'description', meta?.description)

  // Automatic hint from constraints (if helperText not explicitly set)
  // Priority: props.helperText > i18n description > meta.description > auto-generated hint
  const autoHint = generateConstraintHint(constraints, i18n?.locale ?? 'en')
  const helperText = props.helperText ?? resolvedDescription ?? autoHint

  // Localize options from meta (for select/enum fields)
  const localizedOptions = useLocalizedOptions(meta?.options)

  return {
    form,
    fullPath,
    // Props override i18n override schema meta
    label: props.label ?? resolvedTitle,
    placeholder: props.placeholder ?? resolvedPlaceholder,
    helperText,
    // Tooltip from props or schema meta
    tooltip: (props.tooltip ?? meta?.tooltip) as FieldTooltipMeta | undefined,
    // Required from schema or prop
    required: props.required ?? schemaRequired,
    // Form-level + local props (local wins)
    disabled: props.disabled ?? formDisabled,
    readOnly: props.readOnly ?? formReadOnly,
    // Constraints for additional component configuration
    constraints,
    // Options with i18n translations
    options: localizedOptions,
    // HTML autocomplete (авто-определение по имени + meta override)
    autocomplete: resolveAutoComplete(fullPath, meta?.autocomplete),
  }
}
