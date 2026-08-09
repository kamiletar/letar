'use client'

import type { FieldTooltipMeta, ZodConstraints } from '@letar/forms-core/schema'
import type { ReactNode } from 'react'

/**
 * Resolved props after applying schema meta and form-level settings
 */
export interface ResolvedFieldProps {
  /** Label (from props or schema meta) */
  label: ReactNode
  /** Placeholder */
  placeholder: string | undefined
  /** Helper text below field (can be automatically generated from constraints) */
  helperText: ReactNode
  /** Tooltip with icon */
  tooltip: FieldTooltipMeta | undefined
  /** Required field (from props or schema) */
  required: boolean | undefined
  /** Field disabled (from props or form-level) */
  disabled: boolean | undefined
  /** Read only (from props or form-level) */
  readOnly: boolean | undefined
  /** Automatic constraints from Zod schema (min, max, minLength, maxLength etc.) */
  constraints: ZodConstraints
  /** Options for select fields (from meta.options with i18n translations) */
  options: Array<{ value: string | number; label: string; disabled?: boolean; i18nKey?: string }> | undefined
  /** HTML autocomplete атрибут (авто-определение по имени поля + meta override) */
  autocomplete: string | undefined
}
