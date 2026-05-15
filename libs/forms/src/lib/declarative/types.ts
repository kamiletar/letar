'use client'

/**
 * Re-export all types from modular structure for backward compatibility.
 *
 * Types are now organized in:
 * - types/meta-types.ts - FieldTooltipMeta, FieldUIMeta
 * - types/field-types.ts - BaseFieldProps, *FieldProps
 * - types/form-types.ts - FormProps, FormPropsWithApi, API types
 * - types/group-types.ts - FormGroupDeclarativeProps, etc.
 * - types/button-types.ts - SubmitButtonProps
 */
export * from './types/index'
