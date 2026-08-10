import type { DeepKeys, DeepValue, FieldApi, FormApi } from '@tanstack/react-form'

/**
 * @deprecated Легаси-тип старого ChakraFormField-API. Для полей библиотеки используй
 * `BaseFieldProps` из `@letar/forms` (реэкспорт реального типа из `@letar/forms-react`).
 */
export interface LegacyFieldProps {
  /** Field label */
  label?: string
  /** Placeholder text */
  placeholder?: string
  /** Helper text shown below field */
  helperText?: string
  /** Whether field is required */
  required?: boolean
  /** Whether field is disabled */
  disabled?: boolean
  /** Whether field is read-only */
  readOnly?: boolean
}

/**
 * Re-export TanStack Form types for convenience
 */
export type { DeepKeys, DeepValue, FieldApi, FormApi }
